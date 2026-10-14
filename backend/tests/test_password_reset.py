from datetime import datetime, timedelta, timezone

import jwt

from app.auth import JWT_SECRET, create_reset_token, create_token, reset_token_user
from app.models import User


class FakeDB:
    """แทนฐานข้อมูล คืนผู้ใช้คนเดียวที่ส่งมา"""

    def __init__(self, user):
        self.user = user

    def get(self, _model, id):
        return self.user if id == self.user.id else None


def test_reset_token():
    user = User(id=7, password_hash="hash-เดิม", is_active=True)
    db = FakeDB(user)
    token = create_reset_token(user)

    assert reset_token_user(db, token) is user
    assert reset_token_user(db, create_token(user.id)) is None  # token ล็อกอินใช้รีเซ็ตไม่ได้
    assert reset_token_user(db, token + "x") is None  # ถูกแก้
    expired = jwt.encode({"reset": 7, "pw": "x", "exp": datetime.now(timezone.utc) - timedelta(seconds=1)}, JWT_SECRET)
    assert reset_token_user(db, expired) is None

    user.is_active = False
    assert reset_token_user(db, token) is None  # บัญชีถูกปิด
    user.is_active = True

    user.password_hash = "hash-ใหม่"  # ตั้งรหัสใหม่แล้ว ลิงก์เดิมใช้ซ้ำไม่ได้
    assert reset_token_user(db, token) is None
