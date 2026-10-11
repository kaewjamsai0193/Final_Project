from app.models import Setting


def update_settings(db, data) -> Setting:
    """บันทึกค่าตั้งของอู่ทุกช่อง (มีแถวเดียว id=1)"""
    row = db.get(Setting, 1)
    for key, value in data.model_dump().items():
        setattr(row, key, value)
    db.commit()
    return row