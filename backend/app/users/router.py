from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.auth import admin
from app.db import get_db
from app.models import User
from app.users import service
from app.users.schemas import UserCreate, UserOut, UserUpdate


router = APIRouter(prefix="/api", tags=["users"])


@router.get("/users", response_model=list[UserOut])
def list_users(db=Depends(get_db), _=Depends(admin)):
    """รายชื่อผู้ใช้ทั้งหมด (เฉพาะเจ้าของอู่)"""
    return db.scalars(select(User).order_by(User.id)).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(data: UserCreate, db=Depends(get_db), _=Depends(admin)):
    """เจ้าของอู่เพิ่มผู้ใช้ใหม่"""
    return service.create_user(db, data)


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, db=Depends(get_db), actor=Depends(admin)):
    """เจ้าของอู่แก้ชื่อ บทบาท สถานะ หรือรหัสผ่านของผู้ใช้"""
    return service.update_user(db, user_id, data, actor)