import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

// โครงหน้ารายละเอียด ปุ่มย้อนกลับ ชื่อ คำอธิบายใต้ชื่อ ป้ายสถานะ ปุ่มคำสั่ง (อยู่บนสุด ไม่ต้องเลื่อนหา) แล้วตามด้วยเนื้อหา
export default function DetailLayout({ back, backLabel, title, subtitle, badge, actions, children }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <Link to={back} className="btn btn-secondary mb-3">
          <ArrowLeft size={18} />
          กลับ {backLabel}
        </Link>
        <h1 className="page-title break-words">{title}</h1>
        {subtitle && <div className="text-muted">{subtitle}</div>}
        {badge && <div className="mt-2">{badge}</div>}
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
