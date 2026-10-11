import { Plus } from "lucide-react";
import { Link, useNavigate, useOutlet } from "react-router-dom";

// โครงหน้ารายการ หัวเรื่อง ปุ่มเพิ่ม ช่องค้นหา และที่วางฟอร์มป๊อปอัพ (หน้าลูก)
export default function ListLayout({ title, basePath, action, toolbar, children }) {
  const navigate = useNavigate();
  const outlet = useOutlet({ close: () => navigate(basePath) });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="page-title mr-auto">{title}</h1>
        {action && (
          <Link to={action.to} className="btn btn-primary">
            <Plus size={20} />
            {action.label}
          </Link>
        )}
      </div>
      {toolbar}
      {children}
      {outlet}
    </section>
  );
}