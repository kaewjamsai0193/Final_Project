import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

// โครงหน้ารายการ หัวเรื่อง ปุ่มเพิ่ม (ลิงก์ไปหน้าใหม่ หรือกดเปิดป๊อปอัพ) ช่องค้นหา ข้อความผิดพลาด แล้วตามด้วยรายการ
export default function ListLayout({ title, action, toolbar, error, children }) {
  const label = (
    <>
      <Plus size={20} />
      {action?.label}
    </>
  );
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="page-title mr-auto">{title}</h1>
        {action?.to && (
          <Link to={action.to} className="btn btn-primary">
            {label}
          </Link>
        )}
        {action?.onClick && (
          <button type="button" className="btn btn-primary" onClick={action.onClick}>
            {label}
          </button>
        )}
      </div>
      {toolbar}
      {error && (
        <p role="alert" className="field-error">
          {error.message}
        </p>
      )}
      {children}
    </section>
  );
}
