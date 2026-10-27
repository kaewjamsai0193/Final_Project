import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useOutletContext } from "react-router-dom";
import { api, formatMoney, formatQty, plainNumber, vatOf } from "../../api";
import Field from "../../components/Field";
import Modal from "../../components/Modal";

// ฟอร์มรับของตามใบสั่งซื้อ เลือกใบแล้วของที่ยังค้างรับเติมให้เอง แก้จำนวนที่มาจริงกับกรอกยอดก่อน VAT
// (ซื้อด่วนแบบไม่มีใบสั่งซื้อ ทำจากปุ่มในใบงาน เฟส 5)
export default function GoodsReceiptFormPage() {
  const navigate = useNavigate();
  const { close } = useOutletContext();
  const queryClient = useQueryClient();
  const [poId, setPoId] = useState("");
  const openPos = useQuery({
    queryKey: ["purchase-orders", { status: "open" }],
    queryFn: () => api("/purchase-orders?status=open"),
  });
  const po = useQuery({ queryKey: ["purchase-orders", poId], enabled: !!poId });
  const { data: shop } = useQuery({ queryKey: ["settings"] });

  const { register, handleSubmit, control, watch } = useForm({ defaultValues: { items: [] } });
  const { fields, remove, replace } = useFieldArray({ control, name: "items" });
  const items = watch("items");

  // เลือกใบสั่งซื้อแล้ว เติมของที่ยังค้างรับให้ จำนวนตั้งเท่ายอดค้าง (ปกติของมาครบ กรอกแค่ยอดเงิน)
  useEffect(() => {
    if (!po.data) return;
    replace(
      po.data.items
        .filter((i) => Number(i.qty_remaining) > 0)
        .map((i) => ({
          product_id: i.product_id,
          label: `${i.product_code} — ${i.product_name} (${i.unit})`,
          remaining: i.qty_remaining,
          qty: plainNumber(i.qty_remaining),
          cost_total: "",
        })),
    );
  }, [po.data, replace]);

  // ตัวเลขนี้แค่โชว์ระหว่างกรอก backend คิดใหม่เองตอนบันทึก
  const unitCost = (it) => (Number(it.qty) > 0 ? Number(it.cost_total || 0) / Number(it.qty) : 0);
  const subtotal = items.reduce((sum, it) => sum + Number(it.cost_total || 0), 0);
  const vat = vatOf(subtotal, shop?.vat_rate ?? 0);

  const save = useMutation({
    mutationFn: (form) =>
      api("/goods-receipts", {
        method: "POST",
        body: {
          po_id: Number(poId),
          items: form.items.map((it) => ({ product_id: it.product_id, qty: it.qty, cost_total: it.cost_total })),
        },
      }),
    onSuccess: (gr) => {
      // รับของแล้ว ให้หน้ารับของ ใบสั่งซื้อ และสต็อกโหลดใหม่
      for (const group of ["goods-receipts", "purchase-orders", "products"]) {
        queryClient.invalidateQueries({ queryKey: [group] });
      }
      navigate(`/goods-receipts/${gr.id}`);
    },
  });

  return (
    <Modal
      title="บันทึกรับของ"
      onClose={close}
      onSubmit={handleSubmit((form) => save.mutate(form))}
      footer={
        <>
          {save.error && (
            <p role="alert" className="field-error mb-2">
              {save.error.message}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="mr-auto text-sm">
              <div className="text-muted">ยอดจ่ายรวม VAT</div>
              <div className="num text-lg font-bold">{formatMoney(subtotal + vat)}</div>
              <div className="num text-xs text-muted">
                ก่อน VAT {formatMoney(subtotal)} + VAT {formatMoney(vat)}
              </div>
            </div>
            <button className="btn btn-primary" disabled={save.isPending || fields.length === 0}>
              {save.isPending ? "กำลังบันทึก…" : "บันทึกรับของ"}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">
            บันทึกแล้วแก้ไม่ได้ รับเกินให้แจ้งของเสีย/สูญหาย รับขาดให้รับเพิ่มอีกใบ
          </p>
        </>
      }
    >
      <label className="block">
        <span className="label">ใบสั่งซื้อที่เปิดอยู่</span>
        <select className="input" required value={poId} onChange={(e) => setPoId(e.target.value)}>
          <option value="">— เลือกใบสั่งซื้อ —</option>
          {openPos.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_number} — {p.supplier_name}
            </option>
          ))}
        </select>
      </label>

      <section className="space-y-3">
        <h3 className="font-semibold">รายการที่รับ</h3>
        {!poId && <p className="text-muted">เลือกใบสั่งซื้อก่อน</p>}
        {po.data && fields.length === 0 && <p className="text-muted">ใบสั่งซื้อนี้ไม่มียอดค้างรับ</p>}
        {fields.map((field, i) => (
          <div key={field.id} className="space-y-3 rounded-lg border border-line p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold">{field.label}</div>
                <div className="text-sm text-muted">ค้างรับ {formatQty(field.remaining)}</div>
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  aria-label={`ลบรายการที่ ${i + 1}`}
                  className="btn btn-ghost btn-icon text-muted hover:text-danger"
                  onClick={() => remove(i)}
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="จำนวน"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                max={field.remaining}
                required
                {...register(`items.${i}.qty`)}
              />
              <Field
                label="ยอดก่อน VAT (บาท)"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                {...register(`items.${i}.cost_total`)}
              />
            </div>
            <div className="flex justify-between rounded-lg bg-surface px-3 py-2 text-sm">
              <span className="text-muted">ต้นทุน/หน่วย (ก่อน VAT)</span>
              <span className="num font-semibold">{formatMoney(unitCost(items[i]))}</span>
            </div>
          </div>
        ))}
      </section>
    </Modal>
  );
}
