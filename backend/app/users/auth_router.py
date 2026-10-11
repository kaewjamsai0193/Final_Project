from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.auth import create_token, current_user, password_hash
from app.db import get_db
from app.models import User
from app.users.schemas import LoginIn, LoginOut, UserOut


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