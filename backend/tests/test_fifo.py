from decimal import Decimal as D
from types import SimpleNamespace

from app.money import vat_of
from app.stock.service import take_from_lots


def lot(qty, cost_total):
    return SimpleNamespace(qty=D(qty), qty_left=D(qty), cost_total=D(cost_total))


def cost(taken):
    return sum(c for _, _, c in taken)


def test_take_oldest_lot_first():
    old, new = lot("2", "160"), lot("3", "360")  # ชิ้นละ 80 กับ 120
    taken = take_from_lots([old, new], D("3"))
    assert taken == [(old, 2, 160), (new, 1, 120)]  # ล็อต จำนวนที่ตัด ต้นทุนที่ตัด
    assert cost(taken) == 280 and (old.qty_left, new.qty_left) == (0, 2)
    assert cost(take_from_lots([new], D("2"))) == 240


def test_lot_cost_adds_up_exactly():
    odd = lot("3", "100")  # ชิ้นละ 33.333…
    costs = [cost(take_from_lots([odd], D("1"))) for _ in range(3)]
    assert costs == [D("33.33"), D("33.34"), D("33.33")] and sum(costs) == 100


def test_vat_added_on_top():
    assert vat_of("100", "7") == D("7.00")
    assert vat_of("33.33", "7") == D("2.33")
