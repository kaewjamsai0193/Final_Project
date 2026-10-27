from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas import ASCII, In, Out


class ProductIn(In):
    code: str = Field(min_length=1, max_length=50, pattern=ASCII)
    name: str = Field(min_length=1, max_length=200)
    unit: str = Field(min_length=1, max_length=20)
    sale_price: Decimal = Field(ge=0, decimal_places=2)  # ก่อน VAT
    min_stock: Decimal = Field(default=Decimal(0), ge=0, decimal_places=2)
    is_active: bool = True


class ProductOut(ProductIn, Out):
    id: int
    qty_on_hand: Decimal


class LotOut(Out):
    id: int
    receipt_id: int | None
    movement_type: str
    created_at: datetime
    qty: Decimal
    qty_left: Decimal
    cost_total: Decimal


class MovementOut(BaseModel):
    id: int
    receipt_id: int | None
    qty: Decimal
    movement_type: str
    reason: str | None
    created_by_name: str
    created_at: datetime


class WasteIn(In):
    product_id: int
    qty: Decimal = Field(gt=0, decimal_places=2)
    reason: str = Field(min_length=1)


class OpeningIn(In):
    product_id: int
    qty: Decimal = Field(gt=0, decimal_places=2)
    unit_cost: Decimal = Field(ge=0, decimal_places=2)
    reason: str = Field(min_length=1)
