import os

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select

from app.auth import create_reset_token, create_token, current_user, password_hash, reset_token_user
from app.db import get_db
from app.models import User
from app.users.schemas import ForgotIn, LoginIn, LoginOut, ResetIn, UserOut
from app.users.service import send_reset_email


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginOut)
def login(data: LoginIn, db=Depends(get_db)):
    """เข้าสู่ระบบ รหัสถูกได้ token กลับไป ผิดหรือบัญชีถูกปิดตอบข้อความเดียวกัน"""
    user = db.scalar(select(User).where(User.username == data.username))
    if user is None or not user.is_active or not password_hash.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")
    return {"access_token": create_token(user.id), "user": user}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    """ข้อมูลของคนที่ล็อกอินอยู่ หน้าจอถามตอนเปิดเว็บ"""
    return user


# ponytail: ยังไม่จำกัดจำนวนครั้ง (เหมือน /login) ถ้าเปิดให้เข้าจากนอกร้านค่อยเพิ่ม rate limit
@router.post("/forgot", status_code=204)
def forgot(data: ForgotIn, tasks: BackgroundTasks, db=Depends(get_db)):
    """ขอลิงก์ตั้งรหัสใหม่ทางอีเมล ตอบเหมือนกันทุกกรณี ไม่บอกว่ามีชื่อผู้ใช้นี้หรือมีอีเมลไหม
    ส่งเมลเบื้องหลัง เวลาตอบจึงไม่ฟ้องว่าส่งจริงหรือเปล่า ลิงก์ใช้ APP_URL จาก .env ไม่เชื่อ Host ที่ส่งมา"""
    user = db.scalar(select(User).where(User.username == data.username))
    if user and user.is_active and user.email:
        app_url = os.environ.get("APP_URL", "http://localhost:5173").rstrip("/")
        tasks.add_task(send_reset_email, user.email, f"{app_url}/reset-password?token={create_reset_token(user)}")


@router.post("/reset", status_code=204)
def reset(data: ResetIn, db=Depends(get_db)):
    """ตั้งรหัสใหม่จากลิงก์ในอีเมล ตั้งแล้วลิงก์เดิมใช้ไม่ได้อีก"""
    user = reset_token_user(db, data.token)
    if user is None:
        raise HTTPException(400, "ลิงก์หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่")
    user.password_hash = password_hash.hash(data.password)
    db.commit()
