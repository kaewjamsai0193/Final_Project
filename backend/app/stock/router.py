from fastapi import APIRouter, Depends, Response
from sqlalchemy import select

from app.auth import admin, current_user, staff
from app.db import get_db, get_or_404
from app.models import Product, StockMovement, User
from app.schemas import serialize_for_role
from app.stock import service
from app.stock.schemas import MovementOut, OpeningIn, ProductAdminOut, ProductIn, ProductOut, WasteIn

router = APIRouter(prefix="/api", tags=["stock"])


def product_out(user, product):
    """ส่งสินค้ากลับไป ต้นทุนเฉลี่ยเห็นเฉพาะเจ้าของอู่"""
    return serialize_for_role(user, ProductAdminOut, ProductOut, product)


@router.get("/products", response_model=None)
def list_products(db=Depends(get_db), user=Depends(current_user)):
    """สินค้าทุกตัวพร้อมคงเหลือ เรียงตามรหัส หน้าจอค้นเอง"""
    return [product_out(user, p) for p in db.scalars(select(Product).order_by(Product.code))]



@router.get("/products/{product_id}", response_model=None)
def get_product(product_id: int, db=Depends(get_db), user=Depends(current_user)):
    """สินค้าหนึ่งตัวพร้อมคงเหลือ"""
    return product_out(user, get_or_404(db, Product, product_id, "สินค้า"))


@router.post("/products", response_model=None, status_code=201)
def create_product(data: ProductIn, db=Depends(get_db), user=Depends(staff)):
    """เพิ่มสินค้า (ช่างทำไม่ได้)"""
    return product_out(user, service.save_product(db, None, data))


@router.put("/products/{product_id}", response_model=None)
def update_product(product_id: int, data: ProductIn, db=Depends(get_db), user=Depends(staff)):
    """แก้สินค้า (ช่างทำไม่ได้)"""
    return product_out(user, service.save_product(db, product_id, data))


@router.get("/products/{product_id}/movements", response_model=list[MovementOut])
def list_product_movements(product_id: int, db=Depends(get_db), _=Depends(current_user)):
    """สมุดสต็อกของสินค้านี้ 500 รายการล่าสุด พร้อมชื่อคนทำ"""
    rows = db.execute(
        select(StockMovement, User.full_name)
        .join(User, User.id == StockMovement.created_by)
        .where(StockMovement.product_id == product_id)
        .order_by(StockMovement.id.desc())
        .limit(10)
    ).all()
    return [
        MovementOut(
            id=m.id,
            receipt_id=m.receipt_id,
            qty=m.qty,
            movement_type=m.movement_type,
            reason=m.reason,
            created_by_name=name,
            created_at=m.created_at,
        )
        for m, name in rows
    ]


@router.post("/stock/waste", status_code=204)
def waste(data: WasteIn, db=Depends(get_db), user=Depends(staff)):
    """แจ้งของเสียหรือของหาย (ช่างทำไม่ได้)"""
    service.waste(db, data, user)
    return Response(status_code=204)


@router.post("/stock/opening", response_model=ProductAdminOut, status_code=201)
def add_opening(data: OpeningIn, db=Depends(get_db), user=Depends(admin)):
    """เจ้าของอู่ลงสต็อกตั้งต้น"""
    return service.add_opening(db, data, user)