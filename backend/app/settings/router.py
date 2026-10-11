from fastapi import APIRouter, Depends

from app.auth import admin, current_user
from app.db import get_db
from app.models import Setting
from app.settings import service
from app.settings.schemas import SettingsIn, SettingsOut

router = APIRouter(prefix="/api", tags=["settings"])


@router.get("/settings", response_model=SettingsOut)
def get_settings(db=Depends(get_db), _=Depends(current_user)):
    """ค่าตั้งของอู่ ทุกคนที่ล็อกอินอ่านได้"""
    return db.get(Setting, 1)


@router.put("/settings", response_model=SettingsOut)
def update_settings(data: SettingsIn, db=Depends(get_db), _=Depends(admin)):
    """เจ้าของอู่แก้ค่าตั้งของอู่"""
    return service.update_settings(db, data)