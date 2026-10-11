from fastapi import HTTPException
from sqlalchemy import select

from app.db import get_or_404, lock_shop
from app.models import Product, StockMovement
from app.money import format_qty, round_money


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
    product = get_or_404(db, Product, product_id, "สินค้า") if product_id else Product() # เช็คว่าแก้หรือเพิ่มสินค้า
    code_owner = db.scalar(select(Product.id).where(Product.code == data.code)) # เช็ครหัสสินค้าว่าซ้ำมั้ย
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


def add_stock(product, qty, cost_total):
    """ของเข้าคลัง บวกจำนวน แล้วคิดต้นทุนเฉลี่ยใหม่จากมูลค่าเดิมรวมกับมูลค่าที่เพิ่งเข้ามา"""
    value = product.qty_on_hand * product.avg_cost + cost_total
    product.qty_on_hand += qty
    product.avg_cost = round_money(value / product.qty_on_hand)


def add_opening(db, data, user) -> Product:
    """ลงสต็อกตั้งต้น ใช้ตอนเริ่มใช้ระบบ ของเข้าปกติมาจากใบรับของ"""
    lock_shop(db)
    product = get_or_404(db, Product, data.product_id, "สินค้า")
    cost_total = round_money(data.qty * data.unit_cost)
    add_stock(product, data.qty, cost_total)
    db.add(
        StockMovement(
            product_id=product.id,
            qty=data.qty,
            cost_total=cost_total,
            movement_type="opening",
            reason=data.reason,
            created_by=user.id,
        )
    )
    db.commit()
    return product


def waste(db, data, user) -> None:
    """แจ้งของเสียหรือของหาย ตัดจำนวนออกจากคงเหลือ แล้วจดลงสมุดสต็อก"""
    lock_shop(db)
    product = get_or_404(db, Product, data.product_id, "สินค้า")
    if data.qty > product.qty_on_hand:
        raise HTTPException(409, f"เกินจำนวนที่มี (เหลือ {format_qty(product.qty_on_hand)})")
    product.qty_on_hand -= data.qty
    db.add(
        StockMovement(
            product_id=product.id,
            qty=-data.qty,
            cost_total=round_money(data.qty * product.avg_cost),
            movement_type="waste",
            reason=data.reason,
            created_by=user.id,
        )
    )
    db.commit()