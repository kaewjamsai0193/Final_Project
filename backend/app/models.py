from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

MONEY = Numeric(12, 2)
QTY = Numeric(12, 2)
RATE = Numeric(5, 2)
TS = DateTime(timezone=True)


def created():
    """คอลัมน์ created_at ที่ฐานข้อมูลใส่เวลาตอนสร้างให้เอง"""
    return mapped_column(TS, server_default=func.now())


def fk(target, **kw):
    """คอลัมน์ที่อ้างไปตารางอื่น พร้อมทำ index ให้ค้นเร็ว"""
    return mapped_column(ForeignKey(target, **kw), index=True)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    full_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str | None] = mapped_column(String(200))  # ว่างได้ คนไม่มีอีเมลให้เจ้าของอู่รีเซ็ตรหัสให้
    role: Mapped[str] = mapped_column(String(10))
    is_active: Mapped[bool] = mapped_column(default=True, server_default=text("true"))
    __table_args__ = (CheckConstraint("role in ('admin','employee','mechanic')", name="role"),)


class Setting(Base):
    __tablename__ = "settings"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    shop_name: Mapped[str] = mapped_column(String(200), server_default="")
    shop_address: Mapped[str] = mapped_column(Text, server_default="")
    shop_tax_id: Mapped[str] = mapped_column(String(20), server_default="")
    vat_rate: Mapped[Decimal] = mapped_column(RATE, server_default="7")
    __table_args__ = (
        CheckConstraint("id = 1", name="single_row"),
        CheckConstraint("vat_rate >= 0", name="vat_rate"),
    )


class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    unit: Mapped[str] = mapped_column(String(20))
    sale_price: Mapped[Decimal] = mapped_column(MONEY)
    min_stock: Mapped[Decimal] = mapped_column(QTY, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(default=True, server_default=text("true"))
    qty_on_hand: Mapped[Decimal] = mapped_column(QTY, default=0, server_default="0")
    avg_cost: Mapped[Decimal] = mapped_column(MONEY, default=0, server_default="0")
    __table_args__ = (
        CheckConstraint("sale_price >= 0", name="sale_price"),
        CheckConstraint("min_stock >= 0", name="min_stock"),
        CheckConstraint("qty_on_hand >= 0", name="qty_on_hand"),
        CheckConstraint("avg_cost >= 0", name="avg_cost"),
    )


class StockMovement(Base):
    __tablename__ = "stock_movements"
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = fk("products.id")
    qty: Mapped[Decimal] = mapped_column(QTY)
    cost_total: Mapped[Decimal] = mapped_column(MONEY)
    movement_type: Mapped[str] = mapped_column(String(10))
    reason: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[int] = fk("users.id")
    created_at: Mapped[datetime] = created()
    product: Mapped["Product"] = relationship()
    receipt_id: Mapped[int | None] = fk("goods_receipts.id")
    __table_args__ = (
        CheckConstraint("movement_type in ('opening','receive','waste','issue','return')", name="type"),
        CheckConstraint(
            "(movement_type in ('waste','issue') and qty < 0)"
            " or (movement_type in ('opening','receive','return') and qty > 0)",
            name="direction",
        ),
        CheckConstraint("cost_total >= 0", name="cost"),
        CheckConstraint("movement_type <> 'waste' or reason is not null", name="waste_reason"),
        UniqueConstraint("receipt_id", "product_id"),
    )


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    supplier_name: Mapped[str] = mapped_column(String(200))
    supplier_phone: Mapped[str | None] = mapped_column(String(20))
    supplier_address: Mapped[str | None] = mapped_column(Text)
    note: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(10))
    close_reason: Mapped[str | None] = mapped_column(Text)
    closed_by: Mapped[int | None] = fk("users.id")
    closed_at: Mapped[datetime | None] = mapped_column(TS)
    created_by: Mapped[int] = fk("users.id")
    created_at: Mapped[datetime] = created()
    items: Mapped[list["PurchaseOrderItem"]] = relationship(order_by="PurchaseOrderItem.id")
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])
    __table_args__ = (
        CheckConstraint("status in ('open','closed')", name="status"),
        CheckConstraint("(closed_at is null) = (status = 'open')", name="closed_at"),
        CheckConstraint("(closed_by is null) = (closed_at is null)", name="closed_by"),
    )


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    po_id: Mapped[int] = fk("purchase_orders.id")
    product_id: Mapped[int] = fk("products.id")
    qty: Mapped[Decimal] = mapped_column(QTY)
    unit_price: Mapped[Decimal | None] = mapped_column(MONEY)
    product: Mapped["Product"] = relationship()
    __table_args__ = (
        UniqueConstraint("po_id", "product_id"),
        CheckConstraint("qty > 0", name="qty"),
        CheckConstraint("unit_price is null or unit_price >= 0", name="unit_price"),
    )


class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"
    id: Mapped[int] = mapped_column(primary_key=True)
    po_id: Mapped[int | None] = fk("purchase_orders.id")
    supplier_name: Mapped[str] = mapped_column(String(200))
    created_by: Mapped[int] = fk("users.id")
    created_at: Mapped[datetime] = created()
    items: Mapped[list["StockMovement"]] = relationship(order_by="StockMovement.id")
    creator: Mapped["User"] = relationship()