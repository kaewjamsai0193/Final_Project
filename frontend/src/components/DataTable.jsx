// แสดงรายการ จอแคบเป็นการ์ด จอกว้างเป็นตาราง
// card = หน้าตาการ์ดหนึ่งใบ, columns = คอลัมน์ของตาราง, actions = ปุ่มท้ายแถว
export default function DataTable({ items, columns, card, actions, empty = "ไม่มีข้อมูล" }) {
  if (!items) return <p className="text-muted">กำลังโหลด…</p>;
  if (items.length === 0)
    return <p className="rounded-xl border border-dashed border-line py-10 text-center text-muted">{empty}</p>;

  // ดูความกว้างของกล่องนี้ (ไม่ใช่ทั้งจอ) แคบกว่า 48rem เป็นการ์ด กว้างกว่านั้นเป็นตาราง
  return (
    <div className="@container">
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white @3xl:hidden">
        {items.map((item) => (
          <li key={item.id} className="px-4 py-3">
            {card(item)}
            <div className="mt-3 flex gap-2">{actions(item)}</div>
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
              <th className="text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                {columns.map((c) => (
                  <td key={c.label} className={c.align === "right" ? "num text-right" : ""}>
                    {c.render(item)}
                  </td>
                ))}
                <td>
                  <div className="flex justify-end gap-2">{actions(item)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}