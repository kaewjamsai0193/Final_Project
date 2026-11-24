import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// แสดงรายการ จอแคบเป็นการ์ด จอกว้างเป็นตาราง กดทั้งการ์ดหรือทั้งแถวเพื่อเปิดดู
// card = หน้าตาการ์ดหนึ่งใบ, columns = คอลัมน์ของตาราง, to = ลิงก์ของแต่ละรายการ
// แบ่งหน้าละ PAGE_SIZE รายการ ไม่ต้องเลื่อนยาวไม่สิ้นสุด
const PAGE_SIZE = 20;

export default function DataTable({ items, columns, card, to, empty = "ไม่มีข้อมูล" }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [items?.length]); // ค้นหาหรือเปลี่ยนแท็บแล้วกลับไปหน้าแรก
  if (!items) return <p className="text-muted">กำลังโหลด…</p>;
  if (items.length === 0)
    return <p className="rounded-xl border border-dashed border-line py-10 text-center text-muted">{empty}</p>;

  const pages = Math.ceil(items.length / PAGE_SIZE);
  const current = Math.min(page, pages - 1);
  const shown = items.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const goTo = (n) => {
    setPage(n);
    window.scrollTo(0, 0);
  };

  // ดูความกว้างของกล่องนี้ (ไม่ใช่ทั้งจอ) แคบกว่า 48rem เป็นการ์ด กว้างกว่านั้นเป็นตาราง
  return (
    <div className="@container">
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white @3xl:hidden">
        {shown.map((item) => (
          <li key={item.id}>
            <Link to={to(item)} className="flex items-center gap-3 px-4 py-3 hover:bg-surface active:bg-accent-soft">
              <div className="min-w-0 flex-1">{card(item)}</div>
              <ChevronRight size={20} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white @3xl:block">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.label} className={c.align === "right" ? "text-right" : ""}>
                  {c.label}
                </th>
              ))}
              <th aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {shown.map((item) => (
              <tr key={item.id} onClick={() => navigate(to(item))} className="cursor-pointer hover:bg-surface">
                {columns.map((c) => (
                  <td key={c.label} className={c.align === "right" ? "num text-right whitespace-nowrap" : ""}>
                    {c.render(item)}
                  </td>
                ))}
                <td>
                  {/* ลิงก์จริงไว้ให้คนใช้คีย์บอร์ดกับโปรแกรมอ่านจอ */}
                  <Link to={to(item)} aria-label="ดูรายละเอียด" className="grid place-items-center text-muted">
                    <ChevronRight size={20} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label="เปลี่ยนหน้า" className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={current === 0}
            onClick={() => goTo(current - 1)}
          >
            <ChevronLeft size={20} />
            ก่อนหน้า
          </button>
          <span className="text-center text-sm text-muted">
            หน้า {current + 1} / {pages}
            <br />
            ทั้งหมด {items.length} รายการ
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={current === pages - 1}
            onClick={() => goTo(current + 1)}
          >
            ถัดไป
            <ChevronRight size={20} />
          </button>
        </nav>
      )}
    </div>
  );
}
