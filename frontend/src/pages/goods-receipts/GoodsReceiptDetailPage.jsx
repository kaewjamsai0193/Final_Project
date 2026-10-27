import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { formatDate, formatMoney, formatQty } from "../../api";
import { useAuth } from "../../auth";
import DetailLayout from "../../components/DetailLayout";
import { SourceBadge } from "../../components/StatusBadge";

// หน้าใบรับของ ดูได้อย่างเดียวเพราะบันทึกแล้วแก้ไม่ได้ ต้นทุนเห็นเฉพาะเจ้าของอู่
export default function GoodsReceiptDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const { data: gr, error } = useQuery({ queryKey: ["goods-receipts", id] });

  if (!gr) {
    return <DetailLayout back="/goods-receipts" backLabel="รับของ" title={error?.message || "กำลังโหลด…"} />;
  }

  return (
    <DetailLayout
      back="/goods-receipts"
      backLabel="รับของ"
      title={gr.display_number}
      subtitle={gr.supplier_name}
      badge={<SourceBadge gr={gr} />}
      footer={
        gr.po_id && (
          <Link to={`/purchase-orders/${gr.po_id}`} className="btn btn-secondary w-full">
            <ClipboardList size={20} />
            ดูใบสั่งซื้อ {gr.po_number}
          </Link>
        )
      }
    >
      <p className="text-sm text-muted">
        ผู้บันทึก {gr.created_by_name} · {formatDate(gr.created_at)}
      </p>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {gr.items.map((it) => (
          <li key={it.product_id} className="px-4 py-3">
            <div className="flex justify-between gap-2">
              <span className="font-semibold">{it.product_name}</span>
              <span className="num font-semibold">
                {formatQty(it.qty)} {it.unit}
              </span>
            </div>
            <div className="text-sm text-muted">{it.product_code}</div>
            {isAdmin && (
              <div className="num text-sm">
                ต้นทุน/หน่วย {formatMoney(it.unit_cost)} · รวม {formatMoney(it.cost_total)}
              </div>
            )}
          </li>
        ))}
      </ul>
      {isAdmin && (
        <dl className="space-y-1 rounded-lg bg-surface p-3">
          <Row label="ต้นทุนรวม (ก่อน VAT)" value={gr.cost_total} />
          <Row label={`VAT ${Number(gr.vat_rate)}%`} value={gr.vat} />
          <Row label="ยอดจ่ายรวม VAT" value={Number(gr.cost_total) + Number(gr.vat)} bold />
        </dl>
      )}
    </DetailLayout>
  );
}

// หนึ่งบรรทัดในกล่องสรุปยอด
function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : "text-sm"}`}>
      <dt>{label}</dt>
      <dd className="num">{formatMoney(value)}</dd>
    </div>
  );
}
