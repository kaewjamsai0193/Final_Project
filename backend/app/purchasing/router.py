from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.auth import admin, current_user, staff
from app.db import get_db, get_or_404
from app.models import GoodsReceipt, PurchaseOrder
from app.purchasing import service
from app.purchasing.schemas import GRAdminOut, GRIn, GROut, POIn, POOut, POPricedOut
from app.schemas import ReasonIn, serialize_for_role

router = APIRouter(prefix="/api", tags=["purchasing"])


def po_out(db, user, po):
    """ส่งใบสั่งซื้อกลับไป ราคาเห็นเฉพาะเจ้าของอู่"""
    return serialize_for_role(user, POPricedOut, POOut, service.po_view(db, po))


def gr_out(user, gr):
    """ส่งใบรับของกลับไป ต้นทุนเห็นเฉพาะเจ้าของอู่"""
    return serialize_for_role(user, GRAdminOut, GROut, service.gr_view(gr))


@router.get("/purchase-orders", response_model=None)
def list_pos(status: str | None = None, db=Depends(get_db), user=Depends(staff)):
    """ใบสั่งซื้อล่าสุด 200 ใบ กรองตามสถานะได้"""
    stmt = select(PurchaseOrder).order_by(PurchaseOrder.id.desc()).limit(200)
    if status:
        stmt = stmt.where(PurchaseOrder.status == status)
    return [po_out(db, user, po) for po in db.scalars(stmt)]


@router.post("/purchase-orders", response_model=None, status_code=201)
def create_po(data: POIn, db=Depends(get_db), user=Depends(admin)):
    """เจ้าของอู่ออกใบสั่งซื้อ"""
    return po_out(db, user, service.create_po(db, data, user))


@router.get("/purchase-orders/{po_id}", response_model=None)
def get_po(po_id: int, db=Depends(get_db), user=Depends(staff)):
    """ดูใบสั่งซื้อหนึ่งใบ พร้อมยอดที่รับแล้ว"""
    return po_out(db, user, get_or_404(db, PurchaseOrder, po_id, "ใบสั่งซื้อ"))


@router.post("/purchase-orders/{po_id}/close", response_model=None)
def close_po(po_id: int, data: ReasonIn, db=Depends(get_db), user=Depends(admin)):
    """เจ้าของอู่ปิดใบสั่งซื้อก่อนรับครบ ต้องใส่เหตุผล"""
    return po_out(db, user, service.close_po(db, po_id, data.reason, user))


@router.get("/goods-receipts", response_model=None)
def list_receipts(db=Depends(get_db), user=Depends(staff)):
    """ใบรับของล่าสุด 200 ใบ"""
    stmt = select(GoodsReceipt).order_by(GoodsReceipt.id.desc()).limit(200)
    return [gr_out(user, gr) for gr in db.scalars(stmt)]


@router.post("/goods-receipts", response_model=None, status_code=201)
def create_receipt(data: GRIn, db=Depends(get_db), user=Depends(current_user)):
    """บันทึกรับของ ทุกบทบาททำได้ เพราะช่างต้องซื้อด่วนจากใบงานได้ (เฟส 5)"""
    return gr_out(user, service.create_goods_receipt(db, data, user))


@router.get("/goods-receipts/{gr_id}", response_model=None)
def get_receipt(gr_id: int, db=Depends(get_db), user=Depends(staff)):
    """ดูใบรับของหนึ่งใบ"""
    return gr_out(user, get_or_404(db, GoodsReceipt, gr_id, "ใบรับของ"))