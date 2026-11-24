from decimal import Decimal as D
from types import SimpleNamespace

from app.stock.service import parse_opening_rows

PRODUCTS = {"A-1": SimpleNamespace(id=1), "B-2": SimpleNamespace(id=2)}


def test_reads_filled_rows_and_skips_blank_qty():
    rows = [{"code": "A-1", "qty": 3, "unit_cost": 100.5, "reason": ""}, {"code": "B-2", "qty": "", "unit_cost": ""}]
    items, errors = parse_opening_rows(rows, PRODUCTS)
    assert errors == []
    assert [(p.id, d.qty, d.unit_cost, d.reason) for p, d in items] == [(1, D("3"), D("100.5"), "นำเข้าสต็อกตั้งต้น")]


def test_reports_every_bad_row_with_excel_row_number():
    rows = [
        {"code": "X-9", "qty": 1, "unit_cost": 10},
        {"code": "A-1", "qty": 0, "unit_cost": 10},
        {"code": "B-2", "qty": 1, "unit_cost": 10.555},
    ]
    items, errors = parse_opening_rows(rows, PRODUCTS)
    assert items == [] and len(errors) == 3
    assert errors[0].startswith("แถว 2: ไม่พบรหัสสินค้า X-9") and errors[2].startswith("แถว 4:")
