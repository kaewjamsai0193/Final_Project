"""นำสินค้าจากไฟล์ CSV (หัวคอลัมน์ code,name,unit,sale_price,min_stock) เข้าระบบ รหัสที่มีอยู่แล้วข้ามไป
docker compose exec api python -m app.import_products /tmp/products.csv"""

import csv
import sys

from sqlalchemy import select

from app.db import SessionLocal
from app.models import Product
from app.stock.schemas import ProductIn


def main(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        products = [ProductIn(**row) for row in csv.DictReader(f)]  # ตรวจครบทุกแถวก่อน ผิดแถวเดียวไม่นำเข้าเลย
    with SessionLocal() as db:
        have = set(db.scalars(select(Product.code)))
        new = [Product(**p.model_dump()) for p in products if p.code not in have]
        db.add_all(new)
        db.commit()
    print(f"นำเข้า {len(new)} รายการ ข้าม {len(products) - len(new)} รายการที่มีรหัสอยู่แล้ว")


if __name__ == "__main__":
    main(sys.argv[1])
