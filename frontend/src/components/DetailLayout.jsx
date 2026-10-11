import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

// โครงหน้ารายละเอียด ลิงก์ย้อนกลับ หัวเรื่อง ปุ่มคำสั่ง (menu เรียงเป็นปุ่มใต้หัวเรื่อง) เนื้อหา และแถบปุ่มล่าง (มือถือติดขอบล่างจอ)
export default function DetailLayout({ back, backLabel, title, subtitle, badge, action, menu = [], footer, children }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <Link
          to={back}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft size={18} />
          {backLabel}
        </Link>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="page-title break-words">{title}</h1>
            {subtitle && <div className="text-sm text-muted">{subtitle}</div>}
          </div>
          {badge && <div className="pt-1">{badge}</div>}
          {action}
        </div>
        {menu.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {menu.map((m) => (
              <button
                key={m.label}
                type="button"
                onClick={m.onClick}
                className={`btn btn-secondary ${m.danger ? "text-danger" : ""}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </header>
      {children}
      {footer && (
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:mx-0 md:border-0 md:px-0">
          {footer}
        </div>
      )}
    </div>
  );
}