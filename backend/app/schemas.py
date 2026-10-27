from pydantic import BaseModel, ConfigDict, Field

# อังกฤษ ตัวเลข สัญลักษณ์บนแป้น ไม่มีภาษาไทยและเว้นวรรค ใช้กับรหัสผ่าน รหัสสินค้า
ASCII = r"^[!-~]+$"


class In(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)


class Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class ReasonIn(In):
    reason: str = Field(min_length=1)

def serialize_for_role(user, admin_schema, schema, obj):
    """เลือกแบบข้อมูลตามบทบาท เจ้าของอู่ได้แบบมีตัวเลขเงิน คนอื่นได้แบบไม่มี"""
    return (admin_schema if user.role == "admin" else schema).model_validate(obj)