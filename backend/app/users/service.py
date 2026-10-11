import os

from fastapi import HTTPException
from sqlalchemy import select

from app.auth import password_hash
from app.db import SessionLocal, get_or_404
from app.models import User


def ensure_admin():
    """ถ้ายังไม่มีเจ้าของอู่ในระบบ สร้างจากชื่อและรหัสใน .env ค่าว่างหรือรหัสสั้นกว่า 6 ตัวไม่ยอมเริ่มระบบ"""
    with SessionLocal() as db:
        admin_user = db.scalar(select(User).where(User.role == "admin"))
        if admin_user is None:
            username, password = os.environ["ADMIN_USERNAME"].strip(), os.environ["ADMIN_PASSWORD"]
            if not username or len(password) < 6:
                raise RuntimeError("ตั้ง ADMIN_USERNAME และ ADMIN_PASSWORD (อย่างน้อย 6 ตัว) ใน .env ก่อนเริ่มระบบ")
            db.add(
                User(username=username, full_name="ผู้ดูแลระบบ", role="admin", password_hash=password_hash.hash(password))
            )
            db.commit()


def create_user(db, data) -> User:
    """เพิ่มผู้ใช้ ชื่อผู้ใช้ห้ามซ้ำ รหัสผ่านเก็บแบบเข้ารหัส"""
    if db.scalar(select(User.id).where(User.username == data.username)):
        raise HTTPException(409, "ชื่อผู้ใช้นี้มีแล้ว")
    user = User(
        username=data.username,
        full_name=data.full_name,
        role=data.role,
        password_hash=password_hash.hash(data.password),
    )
    db.add(user)
    db.commit()
    return user


def update_user(db, user_id: int, data, actor: User) -> User:
    """แก้เฉพาะช่องที่ส่งมา กันไม่ให้เจ้าของอู่ปิดหรือลดสิทธิ์บัญชีตัวเอง"""
    user = get_or_404(db, User, user_id, "ผู้ใช้")
    is_self = user.id == actor.id
    disabling = data.is_active is False
    demoting = data.role is not None and data.role != "admin"
    if is_self and (disabling or demoting):
        raise HTTPException(409, "ปิดหรือลดสิทธิ์บัญชีตัวเองไม่ได้")
    for key, value in data.model_dump(exclude_none=True, exclude={"password"}).items():
        setattr(user, key, value)
    if data.password:
        user.password_hash = password_hash.hash(data.password)
    db.commit()
    return user