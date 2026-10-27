from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas import In


class POItemIn(In):
    product_id: int
    qty: Decimal = Field(gt=0, decimal_places=2)
    unit_price: Decimal | None = Field(default=None, ge=0, decimal_places=2)


class POIn(In):
    supplier_name: str = Field(min_length=1, max_length=200)
    supplier_phone: str | None = Field(default=None, max_length=20, pattern=r"^[0-9+ -]*$")
    supplier_address: str | None = None
    note: str | None = None
    items: list[POItemIn] = Field(min_length=1)


class POItemOut(BaseModel):
    product_id: int
    product_code: str
    product_name: str
    unit: str
    qty: Decimal
    qty_received: Decimal
    qty_remaining: Decimal


class POItemPricedOut(POItemOut):
    unit_price: Decimal | None


class POOut(BaseModel):
    id: int
    display_number: str
    supplier_name: str
    supplier_phone: str | None
    supplier_address: str | None
    note: str | None
    status: str
    receive_state: str | None
    close_reason: str | None
    closed_at: datetime | None
    created_at: datetime
    created_by_name: str
    items: list[POItemOut]


class POPricedOut(POOut):
    items: list[POItemPricedOut]
    estimated_total: Decimal
    vat_rate: Decimal
    estimated_vat: Decimal


class GRItemIn(In):
    product_id: int
    qty: Decimal = Field(gt=0, decimal_places=2)
    cost_total: Decimal = Field(ge=0, decimal_places=2)  # ยอดก่อน VAT


class GRIn(In):
    po_id: int | None = None
    supplier_name: str | None = None
    items: list[GRItemIn] = Field(min_length=1)


class GRItemOut(BaseModel):
    product_id: int
    product_code: str
    product_name: str
    unit: str
    qty: Decimal


class GRItemAdminOut(GRItemOut):
    unit_cost: Decimal
    cost_total: Decimal


class GROut(BaseModel):
    id: int
    display_number: str
    po_id: int | None
    po_number: str | None
    supplier_name: str
    created_at: datetime
    created_by_name: str
    items: list[GRItemOut]


class GRAdminOut(GROut):
    items: list[GRItemAdminOut]
    cost_total: Decimal
    vat_rate: Decimal
    vat: Decimal
