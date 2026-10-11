const STATUS = {
  active: ["ใช้งาน", "ok"],
  disabled: ["ปิดใช้งาน", "neutral"],
  quick: ["ซื้อด่วน", "neutral"],
  low: ["ถึงจุดเตือน", "warn"],
  inactive: ["เลิกใช้", "neutral"],
  waiting: ["รอของ", "info"],
  partial: ["รับบางส่วน", "warn"],
  closed: ["ปิดแล้ว", "neutral"],
};

// ป้ายใบสั่งซื้อ ยังเปิดอยู่โชว์ว่ารอของหรือรับบางส่วน ปิดแล้วโชว์ว่าปิดแล้ว
export const poStatus = (po) => (po.status === "open" ? po.receive_state : po.status);

// ป้ายสินค้า เลิกใช้แล้ว หรือของเหลือถึงจุดเตือน ปกติไม่มีป้าย
export function productStatus(p) {
  if (!p.is_active) return "inactive";
  const hasMinimum = Number(p.min_stock) > 0;
  if (hasMinimum && Number(p.qty_on_hand) <= Number(p.min_stock)) return "low";
  return null;
}

// ป้ายสีสั้น ๆ ตามสถานะ ไม่มีสถานะก็ไม่โชว์อะไร
export default function StatusBadge({ status }) {
  if (!status) return null;
  const [text, tone] = STATUS[status];
  return <span className={`badge badge-${tone}`}>{text}</span>;
}


// ป้ายที่มาของใบรับของ มีใบสั่งซื้อโชว์เลขใบ ไม่มีโชว์ซื้อด่วน
export const SourceBadge = ({ gr }) =>
  gr.po_id ? <span className="badge badge-info">{gr.po_number}</span> : <StatusBadge status="quick" />;