import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { api, formatDate, formatMoney, formatQty } from "../../api";
import { useAuth } from "../../auth";
import DetailLayout from "../../components/DetailLayout";
import ReasonDialog from "../../components/ReasonDialog";
import StatusBadge, { poStatus } from "../../components/StatusBadge";

// หน้าใบสั่งซื้อ ดูว่าแต่ละรายการรับมาแล้วเท่าไหร่ เจ้าของอู่มีเมนูพิมพ์กับปิดใบ
export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const { data: po, error } = useQuery({ queryKey: ["purchase-orders", id] });
  const [closing, setClosing] = useState(false);

  if (!po) {
    return <DetailLayout back="/purchase-orders" backLabel="สั่งซื้อ" title={error?.message || "กำลังโหลด…"} />;
  }

  const info = [
    ["เบอร์โทร", po.supplier_phone],
    ["ที่อยู่", po.supplier_address],
    ["หมายเหตุ", po.note],
    ["ผู้ออก", `${po.created_by_name} · ${formatDate(po.created_at)}`],
    ["เหตุผลที่ปิด", po.close_reason],
  ];
  const menu = [];
  if (isAdmin) {
    menu.push({
      label: "บันทึกรูปใบสั่งซื้อ",
      onClick: () => window.open(`/print/po/${po.id}`, "_blank", "noreferrer"),
    });
  }
  if (isAdmin && po.status === "open") {
    menu.push({ label: "ปิดใบสั่งซื้อ", danger: true, onClick: () => setClosing(true) });
  }

  return (
    <DetailLayout
      back="/purchase-orders"
      backLabel="สั่งซื้อ"
      title={po.display_number}
      subtitle={po.supplier_name}
      badge={<StatusBadge status={poStatus(po)} />}
      menu={menu}
    >
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        {info
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
      </dl>

      <ul className="divide-y divide-line rounded-xl border border-line">
        {po.items.map((it) => (
          <PoItem key={it.product_id} item={it} showPrice={isAdmin} />
        ))}
      </ul>
      {isAdmin && (
        <dl className="space-y-1 px-1">
          <div className="flex justify-between text-sm">
            <dt>ยอดประมาณการ (ก่อน VAT)</dt>
            <dd className="num">{formatMoney(po.estimated_total)}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt>VAT {Number(po.vat_rate)}%</dt>
            <dd className="num">{formatMoney(po.estimated_vat)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>รวม VAT</dt>
            <dd className="num">{formatMoney(Number(po.estimated_total) + Number(po.estimated_vat))}</dd>
          </div>
        </dl>
      )}

      {closing && <ClosePoDialog poId={po.id} onClose={() => setClosing(false)} />}
    </DetailLayout>
  );
}

// หนึ่งรายการในใบสั่งซื้อ รับแล้ว ค้าง และแถบความคืบหน้า ราคาเห็นเฉพาะเจ้าของอู่
function PoItem({ item, showPrice }) {
  const percent = Math.min(100, (Number(item.qty_received) / Number(item.qty)) * 100);
  return (
    <li className="px-4 py-3">
      <div className="flex justify-between gap-2">
        <span className="font-semibold">{item.product_name}</span>
        <span className="text-sm text-muted">{item.product_code}</span>
      </div>
      <div className="num mt-1 text-sm">
        รับแล้ว {formatQty(item.qty_received)} / {formatQty(item.qty)} {item.unit} · ค้าง{" "}
        <b>{formatQty(item.qty_remaining)}</b>
      </div>
      <div
        role="progressbar"
        aria-label={`รับแล้ว ${item.product_name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
      >
        <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
      {showPrice && item.unit_price != null && (
        <div className="num mt-1 text-sm text-muted">
          ราคาประมาณการ {formatMoney(item.unit_price)} · รวม {formatMoney(Number(item.qty) * Number(item.unit_price))}
        </div>
      )}
    </li>
  );
}

// ป๊อปอัพปิดใบสั่งซื้อก่อนรับครบ ต้องใส่เหตุผล
function ClosePoDialog({ poId, onClose }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit } = useForm({ defaultValues: { reason: "" } });
  const closePo = useMutation({
    mutationFn: (form) => api(`/purchase-orders/${poId}/close`, { method: "POST", body: form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      onClose();
    },
  });
  return (
    <ReasonDialog
      title="ปิดใบสั่งซื้อ"
      danger
      onClose={onClose}
      register={register}
      mutation={closePo}
      onSubmit={handleSubmit((form) => closePo.mutate(form))}
    >
      <p className="text-sm text-muted">ของที่ยังค้างรับจะไม่รับเข้ามาแล้ว ปิดแล้วเปิดใหม่ไม่ได้</p>
    </ReasonDialog>
  );
}
