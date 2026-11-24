import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

// หน้าฟอร์มเอกสาร (สร้างใบสั่งซื้อ บันทึกรับของ) ปุ่มกลับ หัวข้อ เนื้อหา
// แถบยอดรวมกับปุ่มบันทึกติดล่างจอ ไม่ต้องเลื่อนหา
export default function FormPage({ back, backLabel, title, onSubmit, error, bar, children }) {
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-4">
      <Link to={back} className="btn btn-secondary">
        <ArrowLeft size={18} />
        กลับ {backLabel}
      </Link>
      <h1 className="text-xl font-bold">{title}</h1>
      {children}
      {/* ติดล่างจอ อยู่เหนือแถบเมนูบนมือถือ (สูง 3.5rem) */}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-line bg-white px-4 py-3 md:-mx-6 md:px-6 lg:bottom-0">
        {error && (
          <p role="alert" className="field-error mb-2 whitespace-pre-line">
            {error.message}
          </p>
        )}
        <div className="flex items-center gap-3">{bar}</div>
      </div>
    </form>
  );
}
