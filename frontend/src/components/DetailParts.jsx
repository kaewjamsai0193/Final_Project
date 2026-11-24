import { useState } from "react";

// ชิ้นส่วนที่หน้ารายละเอียด (สินค้า ใบสั่งซื้อ ใบรับของ) ใช้ร่วมกัน ให้ทุกหน้าหน้าตาเหมือนกัน
// ลำดับในหน้า: ตัวเลขสำคัญบนสุด → ข้อมูลอื่น → รายการยาว ๆ (แสดงทีละ 10 กดดูเพิ่มเอง)

// ตัวเลขสำคัญเป็นกล่องใหญ่ เห็นทันทีที่เปิดหน้า stats = [[หัวข้อ, ค่า, เตือน?]]
export function StatGrid({ stats }) {
  return (
    <dl className="grid gap-2" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
      {stats.map(([label, value, warn]) => (
        <div
          key={label}
          className={`min-w-0 rounded-xl border p-2.5 sm:p-3 ${warn ? "border-warn-ink/30 bg-warn-soft" : "border-line"}`}
        >
          <dt className="text-sm text-muted">{label}</dt>
          <dd className={`num text-lg font-bold break-words sm:text-xl ${warn ? "text-warn-ink" : ""}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// แท็บ เปิดดูทีละส่วน รายการยาวส่วนหนึ่งจะไม่ดันอีกส่วนลงไป tabs = [[ชื่อ, เนื้อหา]]
export function Tabs({ tabs }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-3">
      <div role="tablist" className="tabs">
        {tabs.map(([label], i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={open === i}
            onClick={() => setOpen(i)}
            className="tab"
          >
            {label}
          </button>
        ))}
      </div>
      <div key={open} role="tabpanel">
        {tabs[open][1]}
      </div>
    </div>
  );
}

// กล่องข้อมูล หัวข้อซ้าย ค่าขวา rows = [[หัวข้อ, ค่า, ตัวหนาใหญ่?]] ค่าว่างไม่โชว์แถวนั้น
export function InfoList({ rows }) {
  return (
    <dl className="card divide-y divide-line py-0">
      {rows
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([label, value, strong]) => (
          <div key={label} className="flex items-start justify-between gap-4 py-3">
            <dt className="text-muted">{label}</dt>
            <dd className={`num text-right break-words ${strong ? "text-lg font-bold" : "font-semibold"}`}>{value}</dd>
          </div>
        ))}
    </dl>
  );
}

// หัวข้อส่วน กับคำอธิบายสั้น ๆ ถ้ามี
export function Section({ title, hint, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      {children}
    </section>
  );
}

// ตารางธรรมดา columns = [{ label, render(row), right }] rows ยังไม่มา = กำลังโหลด
// แสดงทีละ SHOW_STEP แถว กด "แสดงเพิ่ม" ถึงจะยาวขึ้น
const SHOW_STEP = 10;

export function SimpleTable({ columns, rows, error, empty = "ไม่มีรายการ" }) {
  const [shown, setShown] = useState(SHOW_STEP);
  if (error)
    return (
      <p role="alert" className="field-error">
        {error.message}
      </p>
    );
  if (!rows) return <p className="text-muted">กำลังโหลด…</p>;
  if (rows.length === 0) return <p className="card text-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.label} className={c.right ? "text-right" : ""}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, shown).map((row, i) => (
            <tr key={row.id ?? row.product_id ?? i}>
              {columns.map((c) => (
                <td key={c.label} className={c.right ? "num text-right whitespace-nowrap" : ""}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > shown && (
        <button
          type="button"
          className="btn btn-ghost w-full border-t border-line text-accent-ink"
          onClick={() => setShown(shown + SHOW_STEP)}
        >
          แสดงเพิ่ม (เหลืออีก {rows.length - shown} รายการ)
        </button>
      )}
    </div>
  );
}

// ชื่อสินค้า กับรหัสตัวเล็กข้างล่าง ใช้ในช่องแรกของตาราง
export function ProductCell({ name, code, note }) {
  return (
    <>
      <div className="font-medium">{name}</div>
      <div className="text-sm text-muted">{[code, note].filter(Boolean).join(" · ")}</div>
    </>
  );
}
