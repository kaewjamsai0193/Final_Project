import os
import smtplib
from email.message import EmailMessage

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
            email = os.environ.get("ADMIN_EMAIL", "").strip()
            if not username or len(password) < 6 or not email:
                raise RuntimeError(
                    "ตั้ง ADMIN_USERNAME, ADMIN_PASSWORD (อย่างน้อย 6 ตัว) และ ADMIN_EMAIL ใน .env ก่อนเริ่มระบบ"
                )
            db.add(
                User(
                    username=username,
                    full_name="ผู้ดูแลระบบ",
                    email=email,
                    role="admin",
                    password_hash=password_hash.hash(password),
                )
            )
            db.commit()


ADMIN_NEEDS_EMAIL = "เจ้าของอู่ต้องมีอีเมล ไว้รีเซ็ตรหัสผ่านตอนลืม"


def create_user(db, data) -> User:
    """เพิ่มผู้ใช้ ชื่อผู้ใช้ห้ามซ้ำ รหัสผ่านเก็บแบบเข้ารหัส"""
    if db.scalar(select(User.id).where(User.username == data.username)):
        raise HTTPException(409, "ชื่อผู้ใช้นี้มีแล้ว")
    if data.role == "admin" and not data.email:
        raise HTTPException(409, ADMIN_NEEDS_EMAIL)
    user = User(
        username=data.username,
        full_name=data.full_name,
        email=data.email,
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
    for key, value in data.model_dump(exclude_none=True, exclude={"password", "email"}).items():
        setattr(user, key, value)
    if "email" in data.model_fields_set:  # ส่ง null มาคือลบอีเมลออก
        user.email = data.email
    if user.role == "admin" and not user.email:
        raise HTTPException(409, ADMIN_NEEDS_EMAIL)
    if data.password:
        user.password_hash = password_hash.hash(data.password)
    db.commit()
    return user


def send_reset_email(to: str, username: str, link: str):
    """ส่งลิงก์ตั้งรหัสใหม่ทางอีเมล ยังไม่ตั้ง SMTP_HOST ใน .env พิมพ์ลิงก์ลง log ของ api แทน (ไว้ทดสอบ)"""
    if not os.environ.get("SMTP_HOST"):
        print(f"[ยังไม่ตั้ง SMTP] ลิงก์ตั้งรหัสใหม่ของ {username} ({to}): {link}", flush=True)
        return
    msg = EmailMessage()
    msg["Subject"] = "ตั้งรหัสผ่านใหม่ - อู่ซ่อมรถ"
    msg["From"] = os.environ["SMTP_USER"]
    msg["To"] = to
    msg.set_content(
        f"ชื่อผู้ใช้: {username}\nกดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ ใช้ได้ครั้งเดียวภายใน 30 นาที\n{link}\n\nถ้าไม่ได้ขอ ไม่ต้องทำอะไร"
    )
    with smtplib.SMTP(os.environ["SMTP_HOST"], int(os.environ.get("SMTP_PORT", "587"))) as smtp:
        smtp.starttls()
        smtp.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
        smtp.send_message(msg)
