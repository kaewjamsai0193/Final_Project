from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, select

from app.db import get_or_404, lock_shop
from app.models import GoodsReceipt, PurchaseOrder, PurchaseOrderItem, Setting, StockMovement
from app.money import format_qty, line_total, unit_cost, vat_of
from app.stock.service import products_by_id, stock_in


def received_by_product(db, po_id) -> dict[int, Decimal]:
    """ใบสั่งซื้อนี้รับของมาแล้วเท่าไหร่ แยกตามสินค้า"""
    rows = db.execute(
        select(StockMovement.product_id, func.sum(StockMovement.qty))
        .join(GoodsReceipt, GoodsReceipt.id == StockMovement.receipt_id)
        .where(GoodsReceipt.po_id == po_id)
        .group_by(StockMovement.product_id)
    )
    return dict(rows.all())


def _close(po, reason, user):
    """ปิดใบสั่งซื้อ จดเหตุผล คนปิด และเวลาไว้พร้อมกัน"""
    po.status, po.close_reason = "closed", reason
    po.closed_by, po.closed_at = user.id, datetime.now(timezone.utc)


def create_po(db, data, user) -> PurchaseOrder:
    """สร้างใบสั่งซื้อพร้อมรายการสินค้า ยังไม่แตะสต็อก"""
    products_by_id(db, [i.product_id for i in data.items], "ใบสั่งซื้อ")
    po = PurchaseOrder(**data.model_dump(exclude={"items"}), status="open", created_by=user.id)
    po.items = [PurchaseOrderItem(**i.model_dump()) for i in data.items]
    db.add(po)
    db.commit()
    return po


def close_po(db, po_id, reason, user) -> PurchaseOrder:
    """ปิดใบสั่งซื้อก่อนรับครบ เช่นร้านไม่มีของแล้ว ต้องมีเหตุผล"""
    lock_shop(db)  # กันปิดใบตอนที่มีคนกำลังรับของตามใบนี้อยู่
    po = get_or_404(db, PurchaseOrder, po_id, "ใบสั่งซื้อ")
    if po.status != "open":
        raise HTTPException(409, "ใบสั่งซื้อนี้ปิดแล้ว")
    _close(po, reason, user)
    db.commit()
    return po


def create_goods_receipt(db, data, user) -> GoodsReceipt:
    """บันทึกรับของ เช็คว่าไม่รับเกินที่สั่ง เอาของเข้าคลังทีละสินค้า ถ้ารับครบแล้วปิดใบสั่งซื้อให้เอง"""
    lock_shop(db)
    products = products_by_id(db, [i.product_id for i in data.items], "ใบรับของ")
    supplier_name = data.supplier_name or None
    po = None
    ordered = {}  # จำนวนที่สั่งของแต่ละสินค้า (มีเฉพาะตอนอ้างใบสั่งซื้อ)

    # 1. อ้างใบสั่งซื้อ: เช็คทุกรายการก่อนว่าไม่เกินยอดค้าง ยังไม่บันทึกอะไร
    if data.po_id:
        po = get_or_404(db, PurchaseOrder, data.po_id, "ใบสั่งซื้อ")
        if po.status != "open":
            raise HTTPException(409, "ใบสั่งซื้อนี้ปิดแล้ว รับของไม่ได้")
        ordered = {i.product_id: i.qty for i in po.items}
        got = received_by_product(db, po.id)
        for item in data.items:
            name = products[item.product_id].name
            if item.product_id not in ordered:
                raise HTTPException(409, f"{name} ไม่อยู่ในใบสั่งซื้อ")
            remaining = ordered[item.product_id] - got.get(item.product_id, 0)
            if item.qty > remaining:
                raise HTTPException(409, f"รับเกินยอดค้างรับของ {name} (ค้าง {format_qty(remaining)})")
        supplier_name = supplier_name or po.supplier_name

    # 2. ซื้อด่วน (ไม่อ้างใบสั่งซื้อ) ต้องกรอกชื่อร้าน
    if not supplier_name:
        raise HTTPException(422, "กรุณากรอกชื่อร้าน")

    # 3. สร้างใบรับของ แล้วเอาของเข้าคลังเป็นล็อตใหม่ทีละสินค้า ต้นทุนคือยอดก่อน VAT
    vat_rate = db.get(Setting, 1).vat_rate
    gr = GoodsReceipt(po_id=data.po_id, supplier_name=supplier_name, vat_rate=vat_rate, created_by=user.id)
    db.add(gr)
    db.flush()
    for item in data.items:
        stock_in(
            db,
            products[item.product_id],
            item.qty,
            item.cost_total,
            receipt_id=gr.id,
            movement_type="receive",
            created_by=user.id,
        )

    # 4. รับครบทุกรายการแล้ว ปิดใบสั่งซื้อให้เอง
    if po:
        db.flush()
        got = received_by_product(db, po.id)
        if all(got.get(pid, 0) >= qty for pid, qty in ordered.items()):
            _close(po, None, user)
    db.commit()
    return gr


def po_view(db, po) -> dict:
    """รวมข้อมูลใบสั่งซื้อที่หน้าจอต้องใช้ ชื่อสินค้า ยอดรับ ยอดค้าง ยอดประมาณการ"""
    # ดึงยอดรับทีละใบ ถ้ารายการใบสั่งซื้อยาวจนช้า ค่อยรวมเป็นคำสั่งเดียว
    got = received_by_product(db, po.id)
    items = [
        {
            "product_id": i.product_id,
            "product_code": i.product.code,
            "product_name": i.product.name,
            "unit": i.product.unit,
            "qty": i.qty,
            "unit_price": i.unit_price,
            "qty_received": got.get(i.product_id, Decimal(0)),
            "qty_remaining": i.qty - got.get(i.product_id, 0),
        }
        for i in po.items
    ]
    estimated_total = sum(
        (line_total(i["qty"], i["unit_price"]) for i in items if i["unit_price"] is not None), Decimal(0)
    )
    vat_rate = db.get(Setting, 1).vat_rate  # ใบสั่งซื้อเป็นแค่ยอดประมาณ ใช้อัตราปัจจุบัน
    receive_state = None  # ปิดแล้วไม่ต้องบอกสถานะรับของ
    if po.status == "open":
        receive_state = "partial" if got else "waiting"
    return {
        "id": po.id,
        "display_number": f"PO-{po.id:05d}",
        "supplier_name": po.supplier_name,
        "supplier_phone": po.supplier_phone,
        "supplier_address": po.supplier_address,
        "note": po.note,
        "status": po.status,
        "receive_state": receive_state,
        "close_reason": po.close_reason,
        "closed_at": po.closed_at,
        "created_at": po.created_at,
        "created_by_name": po.creator.full_name,
        "items": items,
        "estimated_total": estimated_total,
        "vat_rate": vat_rate,
        "estimated_vat": vat_of(estimated_total, vat_rate),
    }


def gr_view(gr) -> dict:
    """รวมข้อมูลใบรับของที่หน้าจอต้องใช้ ชื่อสินค้า จำนวน ต้นทุน VAT"""
    items = [
        {
            "product_id": m.product_id,
            "product_code": m.product.code,
            "product_name": m.product.name,
            "unit": m.product.unit,
            "qty": m.qty,
            "unit_cost": unit_cost(m.cost_total, m.qty),
            "cost_total": m.cost_total,
        }
        for m in gr.items
    ]
    cost_total = sum((i["cost_total"] for i in items), Decimal(0))
    return {
        "id": gr.id,
        "display_number": f"LOT-{gr.id:05d}",
        "po_id": gr.po_id,
        "po_number": f"PO-{gr.po_id:05d}" if gr.po_id else None,
        "supplier_name": gr.supplier_name,
        "created_at": gr.created_at,
        "created_by_name": gr.creator.full_name,
        "items": items,
        "cost_total": cost_total,
        "vat_rate": gr.vat_rate,
        "vat": vat_of(cost_total, gr.vat_rate),
    }
