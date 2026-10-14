import hashlib
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from pwdlib import PasswordHash

from app.db import get_db
from app.models import User

JWT_SECRET = os.environ["JWT_SECRET"]
if JWT_SECRET in ("", "change-me-to-a-long-random-string"):
    raise RuntimeError("ตั้ง JWT_SECRET ใน .env เป็นข้อความสุ่มยาว ๆ ก่อน (ห้ามใช้ค่าตัวอย่าง)")
JWT_EXPIRE_MINUTES = int(os.environ["JWT_EXPIRE_MINUTES"])

password_hash = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)


def create_token(user_id: int) -> str:
    """สร้าง token ของผู้ใช้คนนี้ หมดอายุตามเวลาที่ตั้งใน .env"""
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    return jwt.encode({"user_id": user_id, "exp": expire}, JWT_SECRET, algorithm="HS256")


RESET_MINUTES = 30


def _password_fingerprint(user: User) -> str:
    """ลายนิ้วมือของรหัสปัจจุบัน เปลี่ยนรหัสแล้วค่านี้เปลี่ยน ลิงก์รีเซ็ตเก่าจึงใช้ซ้ำไม่ได้"""
    return hashlib.sha256(user.password_hash.encode()).hexdigest()[:16]


def create_reset_token(user: User) -> str:
    """token ในลิงก์ตั้งรหัสใหม่ ใช้ได้ครั้งเดียวภายใน 30 นาที ใช้แทน token ล็อกอินไม่ได้ (ไม่มี user_id)"""
    expire = datetime.now(timezone.utc) + timedelta(minutes=RESET_MINUTES)
    payload = {"reset": user.id, "pw": _password_fingerprint(user), "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def reset_token_user(db, token: str) -> User | None:
    """หาเจ้าของลิงก์รีเซ็ต token เสีย หมดอายุ ใช้ไปแล้ว หรือบัญชีถูกปิด ได้ None"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = db.get(User, payload["reset"])
    except (jwt.PyJWTError, KeyError):
        return None
    if user is None or not user.is_active or payload.get("pw") != _password_fingerprint(user):
        return None
    return user


def current_user(token=Depends(bearer), db=Depends(get_db)) -> User:
    """อ่าน token จากคำขอแล้วหาว่าใครเรียก ไม่มี token หรือบัญชีถูกปิดตอบ 401"""
    user = None
    if token:
        try:
            payload = jwt.decode(token.credentials, JWT_SECRET, algorithms=["HS256"])
            user = db.get(User, payload["user_id"])
        except (jwt.PyJWTError, KeyError):
            pass  # token เสีย หมดอายุ หรือไม่มี user_id ปล่อย user เป็น None ไปตอบ 401 ข้างล่างที่เดียว
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="กรุณาเข้าสู่ระบบ")
    return user


def require_role(*roles):
    """สร้างด่านเช็คบทบาท เช่น require_role("admin") ให้ผ่านเฉพาะเจ้าของอู่ ไม่ผ่านตอบ 403"""

    def dep(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "ไม่มีสิทธิ์ทำรายการนี้")
        return user

    return dep

admin = require_role("admin")
staff = require_role("admin", "employee")