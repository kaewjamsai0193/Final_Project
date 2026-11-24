from decimal import Decimal

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select

from app.db import get_or_404, lock_shop
from app.models import LotAllocation, Product, StockMovement
from app.money import format_qty, round_money, unit_cost
from app.stock.schemas import OpeningIn


def products_by_id(db, ids, label) -> dict[int, Product]:
    """ดึงสินค้าตาม id ที่ส่งมา เจอสินค้าซ้ำหรือหาไม่เจอตอบ 422"""
    if len(set(ids)) != len(ids):
        raise HTTPException(422, f"สินค้าใน{label}ซ้ำกัน")
    found = {p.id: p for p in db.scalars(select(Product).where(Product.id.in_(ids)))}
    if len(found) != len(ids):
        raise HTTPException(422, "ไม่พบสินค้าบางรายการ")
    return found


def save_product(db, product_id, data) -> Product:
    """เพิ่มหรือแก้สินค้า รหัสห้ามซ้ำ และห้ามเปลี่ยนหน่วยถ้าเคยมีของเข้าคลังแล้ว"""
    lock_shop(db)  # กันของเข้าคลังครั้งแรกแทรกเข้ามาระหว่างเช็คหน่วยกับบันทึก
    product = get_or_404(db, Product, product_id, "สินค้า") if product_id else Product()  # เช็คว่าแก้หรือเพิ่มสินค้า
    code_owner = db.scalar(select(Product.id).where(Product.code == data.code))  # เช็ครหัสสินค้าว่าซ้ำมั้ย
    if code_owner is not None and code_owner != product_id:
        raise HTTPException(409, "รหัสสินค้านี้มีแล้ว")
    unit_changed = product_id is not None and data.unit != product.unit
    if unit_changed and db.scalar(select(StockMovement.id).where(StockMovement.product_id == product_id).limit(1)):
        raise HTTPException(409, "เปลี่ยนหน่วยไม่ได้ เพราะสินค้านี้มีของเข้าคลังแล้ว")
    for key, value in data.model_dump().items():
        setattr(product, key, value)
    db.add(product)
    db.commit()
    return product


def stock_in(db, product, qty, cost_total, **fields) -> None:
    """ของเข้าคลังเป็นล็อตใหม่ จดสมุดพร้อมจำนวนที่เหลือในล็อตไว้ให้ของออกตัดตามลำดับ"""
    db.add(StockMovement(product_id=product.id, qty=qty, qty_left=qty, cost_total=cost_total, **fields))


def adj_first(lot) -> Decimal:
    """เศษสตางค์ของล็อต = ยอดซื้อ - (ต้นทุนต่อชิ้น x จำนวน) เช่น 100/3 ได้ 33.33 เศษ +0.01, 200/3 ได้ 66.67 เศษ -0.01"""
    return lot.cost_total - unit_cost(lot.cost_total, lot.qty) * lot.qty


def take_from_lots(lots, qty) -> list[tuple]:
    """ตัดของจากล็อตเก่าไปใหม่ (FIFO) คืน [(ล็อต, จำนวนที่ตัด, ต้นทุนที่ตัด)]
    แบบ Adjust First: ต้นทุนที่ตัด = จำนวน x ต้นทุนต่อชิ้น (2 ตำแหน่ง)
    ครั้งแรกที่ล็อตถูกตัด บวกเศษสตางค์ของล็อตเข้าไปด้วย เช่น 100/3 ได้ 33.34, 33.33, 33.33"""
    taken = []
    for lot in lots:
        if qty <= 0:
            break
        used = min(qty, lot.qty_left)
        cost = round_money(used * unit_cost(lot.cost_total, lot.qty))
        if lot.qty_left == lot.qty:  # ล็อตนี้ยังไม่เคยถูกตัด = ชิ้นแรก
            cost += adj_first(lot)
        lot.qty_left -= used
        taken.append((lot, used, cost))
        qty -= used
    return taken


def stock_out(db, product, qty, **fields) -> Decimal:
    """ของออกจากคลัง ตัดจากล็อตเก่าสุดก่อน จดสมุดพร้อมว่าตัดล็อตไหนไปเท่าไหร่ คืนต้นทุนของที่ตัด
    ผู้เรียกต้อง lock_shop ก่อน"""
    lots = lots_of(db, product.id)
    on_hand = sum(lot.qty_left for lot in lots)
    if qty > on_hand:
        raise HTTPException(409, f"เกินจำนวนที่มี (เหลือ {format_qty(on_hand)})")
    taken = take_from_lots(lots, qty)
    move = StockMovement(product_id=product.id, qty=-qty, cost_total=sum(cost for _, _, cost in taken), **fields)
    move.allocations = [LotAllocation(lot=lot, qty=used, cost_total=cost) for lot, used, cost in taken]
    db.add(move)
    return move.cost_total


def lots_of(db, product_id) -> list[StockMovement]:
    """ล็อตที่ยังมีของเหลือ เก่าสุดขึ้นก่อน"""
    stmt = (
        select(StockMovement)
        .where(StockMovement.product_id == product_id, StockMovement.qty_left > 0)
        .order_by(StockMovement.id)
    )
    return list(db.scalars(stmt))


def stock_opening(db, product, data, user) -> None:
    """ลงล็อตสต็อกตั้งต้นหนึ่งรายการ ต้นทุนรวม = จำนวน x ต้นทุนต่อหน่วย"""
    cost_total = round_money(data.qty * data.unit_cost)
    stock_in(db, product, data.qty, cost_total, movement_type="opening", reason=data.reason, created_by=user.id)


def add_opening(db, data, user) -> Product:
    """ลงสต็อกตั้งต้น ใช้ตอนเริ่มใช้ระบบ ของเข้าปกติมาจากใบรับของ"""
    lock_shop(db)
    product = get_or_404(db, Product, data.product_id, "สินค้า")
    stock_opening(db, product, data, user)
    db.commit()
    db.refresh(product)  # คงเหลือคิดจากล็อต ต้องโหลดใหม่หลังเพิ่มล็อต
    return product


def waste(db, data, user) -> None:
    """แจ้งของเสียหรือของหาย ตัดของจากล็อตเก่าสุดก่อน แล้วจดลงสมุดสต็อก"""
    lock_shop(db)
    product = get_or_404(db, Product, data.product_id, "สินค้า")
    stock_out(db, product, data.qty, movement_type="waste", reason=data.reason, created_by=user.id)
    db.commit()


def cell(row, key) -> str:
    """ค่าในช่องเป็นข้อความ ช่องว่างได้ "" (เลข 0 ยังเป็น "0")"""
    value = row.get(key)
    return "" if value is None else str(value).strip()


def parse_opening_rows(rows, products) -> tuple[list, list[str]]:
    """ตรวจแถวสต็อกตั้งต้นจากไฟล์ Excel products = {รหัส: สินค้า}
    คืน ([(สินค้า, OpeningIn)], [ข้อความผิดพลาด]) แถวที่ไม่กรอกจำนวนข้ามไป"""
    items, errors = [], []
    for n, row in enumerate(rows, start=2):  # แถว 1 ของ Excel คือหัวตาราง
        code, qty = cell(row, "code"), cell(row, "qty")
        if not qty:
            continue
        product = products.get(code)
        if not product:
            errors.append(f"แถว {n}: ไม่พบรหัสสินค้า {code or '(ว่าง)'} ต้องเพิ่มสินค้าก่อน")
            continue
        try:
            reason = cell(row, "reason") or "นำเข้าสต็อกตั้งต้น"
            data = OpeningIn(product_id=product.id, qty=qty, unit_cost=cell(row, "unit_cost"), reason=reason)
        except ValidationError:
            errors.append(f"แถว {n}: จำนวนหรือต้นทุนไม่ถูกต้อง (ต้องเป็นตัวเลข จำนวนมากกว่า 0 ทศนิยมไม่เกิน 2 ตำแหน่ง)")
            continue
        items.append((product, data))
    return items, errors


def import_opening(db, rows, user) -> int:
    """นำเข้าสต็อกตั้งต้นจากไฟล์ Excel ตรวจทุกแถวก่อน ผิดแถวเดียวไม่บันทึกเลย คืนจำนวนแถวที่นำเข้า"""
    lock_shop(db)
    products = {p.code: p for p in db.scalars(select(Product))}
    items, errors = parse_opening_rows(rows, products)
    if errors:
        raise HTTPException(422, "\n".join(errors[:20]) + ("\n…" if len(errors) > 20 else ""))
    if not items:
        raise HTTPException(422, "ไม่มีแถวที่กรอกจำนวน")
    for product, data in items:
        stock_opening(db, product, data, user)
    db.commit()
    return len(items)
