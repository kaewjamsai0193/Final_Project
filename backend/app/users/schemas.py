from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.schemas import In, Out

Role = Literal["admin", "employee", "mechanic"]
# ไม่มีอีเมลส่ง null มา ตัวกรองละเอียดให้ช่อง type="email" ของเบราว์เซอร์ทำ
Email = Annotated[str, Field(max_length=200, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")]


class UserOut(Out):
    id: int
    username: str
    full_name: str
    email: str | None
    role: Role
    is_active: bool


class LoginIn(In):
    username: str
    password: str


class LoginOut(BaseModel):
    access_token: str
    user: UserOut


class UserCreate(In):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_.-]+$")
    full_name: str = Field(min_length=1, max_length=100)
    email: Email | None = None
    role: Role
    password: str = Field(min_length=6)


class UserUpdate(In):
    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: Email | None = None
    role: Role | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=6)


class ForgotIn(In):
    email: Email


class ResetIn(In):
    token: str
    password: str = Field(min_length=6)
