from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.users import auth_router as auth
from app.users.service import ensure_admin
from app.settings import router as settings
from app.users import router as users
from app.stock import router as stock
from app.purchasing import router as purchasing

@asynccontextmanager
async def lifespan(_app):
    """ตอนเปิดเซิร์ฟเวอร์ สร้างบัญชีเจ้าของอู่จาก .env ถ้ายังไม่มี"""
    ensure_admin()
    yield


app = FastAPI(title="ระบบจัดการอู่ซ่อมรถ", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(settings.router)
app.include_router(stock.router)
app.include_router(purchasing.router)

@app.exception_handler(IntegrityError)
def handle_integrity_error(_request, _exc):
    """ข้อมูลผิดกฎของฐานข้อมูล (เช่นรหัสซ้ำ) ตอบ 409 เป็นข้อความไทย"""
    return JSONResponse(status_code=409, content={"detail": "ข้อมูลขัดกับกฎของระบบ"})


@app.get("/api/health")
def health():
    """เช็คว่าเซิร์ฟเวอร์ยังทำงานอยู่"""
    return {"ok": True}
