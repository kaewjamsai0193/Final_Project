import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer, XCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { api, formatDate, formatMoney, formatQty } from "../../api";
import { useAuth } from "../../auth";
import DetailLayout from "../../components/DetailLayout";
import { InfoList, ProductCell, Section, SimpleTable, StatGrid } from "../../components/DetailParts";
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

  const pending = po.items.filter((it) => Number(it.qty_remaining) > 0);
  // ของที่ยังค้างรับขึ้นก่อน ของที่รับครบแล้วไปอยู่ท้าย
  const items = [...pending, ...po.items.filter((it) => Number(it.qty_remaining) <= 0)];

  return (
    <DetailLayout
      back="/purchase-orders"
      backLabel="สั่งซื้อ"
      title={po.display_number}
      subtitle={po.supplier_name}
      badge={<StatusBadge status={poStatus(po)} />}
      actions={
        isAdmin && (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => window.open(`/print/po/${po.id}`, "_blank", "noreferrer")}
            >
              <Printer size={20} />
              บันทึกรูปใบสั่งซื้อ
            </button>
            {po.status === "open" && (
              <button type="button" className="btn btn-secondary text-danger" onClick={() => setClosing(true)}>
                <XCircle size={20} />
                ปิดใบสั่งซื้อ
              </button>
            )}
          </>
        )
      }
    >
      <StatGrid
        stats={[
          ["สั่งทั้งหมด", `${po.items.length} รายการ`],
          ["ยังค้างรับ", `${pending.length} รายการ`, po.status === "open" && pending.length > 0],
          ...(isAdmin ? [["ยอดรวม", formatMoney(po.estimated_total)]] : []),
        ]}
      />

      <Section title="รายการสินค้า" hint={pending.length > 0 ? "ของที่ยังค้างรับอยู่ด้านบน" : undefined}>
        <SimpleTable
          rows={items}
          columns={[
            {
              label: "สินค้า",
              render: (it) => (
                <ProductCell
                  name={it.product_name}
                  code={it.product_code}
                  note={isAdmin && it.unit_price != null && `ราคาประมาณ ${formatMoney(it.unit_price)}`}
                />
              ),
            },
            { label: "สั่ง", right: true, render: (it) => `${formatQty(it.qty)} ${it.unit}` },
            { label: "รับแล้ว", right: true, render: (it) => formatQty(it.qty_received) },
            { label: "ค้าง", right: true, render: (it) => <b>{formatQty(it.qty_remaining)}</b> },
          ]}
        />
      </Section>

      <Section title="ข้อมูลใบสั่งซื้อ">
        <InfoList
          rows={[
            ["เบอร์โทรร้าน", po.supplier_phone],
            ["ที่อยู่ร้าน", po.supplier_address],
            ["หมายเหตุ", po.note],
            ["ผู้ออก", po.created_by_name],
            ["วันที่", formatDate(po.created_at)],
            ["เหตุผลที่ปิด", po.close_reason],
          ]}
        />
      </Section>

      {closing && <ClosePoDialog poId={po.id} onClose={() => setClosing(false)} />}
    </DetailLayout>
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
