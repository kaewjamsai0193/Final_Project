import os

from fastapi import HTTPException
from sqlalchemy import MetaData, create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

engine = create_engine(os.environ["DATABASE_URL"])
SessionLocal = sessionmaker(engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(column_0_label)s",
            "uq": "uq_%(table_name)s_%(column_0_N_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )


def get_db():
    """เปิดการเชื่อมต่อฐานข้อมูลให้หนึ่งคำขอ ใช้เสร็จปิดให้เอง"""
    with SessionLocal() as db:
        yield db


def get_or_404(db, model, id, label):
    """หาแถวตาม id ไม่เจอตอบ 404 ว่า "ไม่พบ" ตามด้วยชื่อที่ส่งมา"""
    obj = db.get(model, id)
    if obj is None:
        raise HTTPException(404, f"ไม่พบ{label}")
    return obj


# เลขล็อก เป็นเลขอะไรก็ได้
SHOP_LOCK = 71001


def lock_shop(db):
    """ให้คำสั่งที่แก้สต็อกทำทีละคน กันสองคนกดพร้อมกันแล้วตัวเลขเพี้ยน"""
    db.execute(text("select pg_advisory_xact_lock(:k)"), {"k": SHOP_LOCK})
