import pytest
from pydantic import ValidationError

from app.purchasing.schemas import POIn
from app.settings.schemas import SettingsIn
from app.stock.schemas import ProductIn
from app.users.schemas import ForgotIn, ResetIn


def product(code):
    return ProductIn(code=code, name="กรองน้ำมันเครื่อง", unit="ชิ้น", sale_price="180")


def settings(tax_id):
    return SettingsIn(shop_name="อู่", shop_address="", shop_tax_id=tax_id, vat_rate="7")


def po(phone):
    return POIn(supplier_name="ร้าน", supplier_phone=phone, items=[{"product_id": 1, "qty": "1"}])


@pytest.mark.parametrize(
    "make",
    [
        lambda: ResetIn(token="t", password="รหัสผ่าน1"),
        lambda: ResetIn(token="t", password="abc 123"),
        lambda: ForgotIn(email="สมชาย@gmail.com"),
        lambda: product("กข-001"),
        lambda: settings("๑๒๓๔"),
        lambda: po("โทร 081"),
    ],
)
def test_thai_rejected(make):
    with pytest.raises(ValidationError):
        make()


def test_ascii_accepted():
    ResetIn(token="t", password="Abc!23")
    ForgotIn(email="owner@gmail.com")
    product("90915-YZZD2")
    settings("0-1055-12345-67-8")
    settings("")
    po("081 234 5678")
    po(None)
