from decimal import ROUND_HALF_UP, Decimal


def round_money(x) -> Decimal:
    """ปัดเป็นทศนิยม 2 ตำแหน่ง แบบปัดครึ่งขึ้นที่คนไทยคุ้น"""
    return Decimal(x).quantize(Decimal("0.01"), ROUND_HALF_UP)


def format_qty(d) -> str:
    """แสดงจำนวนแบบไม่มีศูนย์ท้าย เช่น 2.50 เป็น 2.5 ใช้ในข้อความแจ้งเตือน"""
    return f"{Decimal(d).normalize():f}"


def line_total(qty, unit_price) -> Decimal:
    """จำนวนคูณราคาต่อหน่วย แล้วปัดเป็นเงิน"""
    return round_money(Decimal(qty) * Decimal(unit_price))


def unit_cost(cost_total, qty) -> Decimal:
    """ต้นทุนต่อชิ้น เอายอดที่จ่ายหารจำนวน ปัดเป็นสตางค์"""
    return round_money(Decimal(cost_total) / Decimal(qty))


def vat_of(amount, rate) -> Decimal:
    """VAT ที่บวกเพิ่มบนยอดก่อน VAT เช่น 100 อัตรา 7 ได้ 7.00"""
    return round_money(Decimal(amount) * Decimal(rate) / 100)
