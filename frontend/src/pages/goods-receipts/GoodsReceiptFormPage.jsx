import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { api, formatDate, formatMoney, formatQty, plainNumber } from "../../api";
import FormPage from "../../components/FormPage";

// หน้าบันทึกรับของ เลือกใบสั่งซื้อ ของที่ค้างรับเติมเป็นบรรทัดให้เอง (จำนวนเท่ายอดค้าง) กรอกแค่ยอดเงิน
export default function GoodsReceiptFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [poId, setPoId] = useState(null);
  const openPos = useQuery({
    queryKey: ["purchase-orders", { status: "open" }],
    queryFn: () => api("/purchase-orders?status=open"),
  });
  const po = openPos.data?.find((p) => p.id === poId);

  const { register, handleSubmit, control, watch } = useForm({ defaultValues: { items: [] } });
  const { fields, replace } = useFieldArray({ control, name: "items" });
  const items = watch("items");

  // เลือกใบแล้ว เติมของที่ยังค้างรับ จำนวนตั้งเท่ายอดค้าง (ปกติของมาครบ กรอกแค่ยอดเงิน)
  useEffect(() => {
    replace(
      (po?.items ?? [])
        .filter((i) => Number(i.qty_remaining) > 0)
        .map((i) => ({
          product_id: i.product_id,
          name: i.product_name,
          code: i.product_code,
          unit: i.unit,
          remaining: i.qty_remaining,
          qty: plainNumber(i.qty_remaining),
          cost_total: "",
        })),
    );
  }, [po, replace]);

  // ตัวเลขนี้แค่โชว์ระหว่างกรอก backend คิดใหม่เองตอนบันทึก
  const total = items.reduce((sum, it) => sum + Number(it.cost_total || 0), 0);

  const save = useMutation({
    mutationFn: (form) =>
      api("/goods-receipts", {
        method: "POST",
        body: {
          po_id: poId,
          items: form.items
            .filter((it) => Number(it.qty) > 0) // ใส่ 0 = ไม่มา ไม่ต้องส่ง
            .map((it) => ({ product_id: it.product_id, qty: it.qty, cost_total: it.cost_total || "0" })),
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
    <FormPage
      back="/goods-receipts"
      backLabel="รับของ"
      title="บันทึกรับของ"
      onSubmit={handleSubmit((form) => save.mutate(form))}
      error={save.error}
      bar={
        <>
          <div className="mr-auto">
            <div className="text-sm text-muted">{fields.length} รายการ · ต้นทุนรวม</div>
            <div className="num text-lg font-bold">{formatMoney(total)}</div>
          </div>
          <button className="btn btn-primary" disabled={save.isPending || fields.length === 0}>
            {save.isPending ? "กำลังบันทึก…" : "บันทึกรับของ"}
          </button>
        </>
      }
    >
      <div className="space-y-2">
        <h2 className="font-semibold">1. เลือกใบสั่งซื้อที่ของมาส่ง</h2>
        {openPos.error && <p className="field-error">{openPos.error.message}</p>}
        {openPos.data?.length === 0 && <p className="text-muted">ไม่มีใบสั่งซื้อที่รอรับของ</p>}
        <div role="radiogroup" aria-label="ใบสั่งซื้อ" className="grid gap-2 sm:grid-cols-2">
          {openPos.data?.map((p) => {
            const pending = p.items.filter((i) => Number(i.qty_remaining) > 0).length;
            const selected = p.id === poId;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPoId(p.id)}
                className={`rounded-lg border-2 p-3 text-left ${
                  selected ? "border-accent bg-accent-soft" : "border-line bg-white hover:bg-surface"
                }`}
              >
                <div className="font-bold">
                  {p.display_number} · {p.supplier_name}
                </div>
                <div className="text-sm text-muted">
                  {formatDate(p.created_at)} · ค้างรับ {pending} รายการ
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {po && (
        <>
          <h2 className="font-semibold">2. ใส่จำนวนที่มาจริง และยอดเงินตามบิล</h2>
          <p className="text-sm text-muted">
            จำนวนกรอกให้เท่ายอดค้างแล้ว มาไม่ครบแก้เป็นจำนวนที่มาจริง ไม่มาเลยใส่ 0 แล้วกรอกยอดเงิน (ก่อน VAT) ตามบิล
          </p>
          <ol className="card divide-y divide-line py-0">
            {fields.map((field, i) => (
              <li key={field.id} className="space-y-2 py-3">
                <div>
                  <div className="font-medium">
                    {i + 1}. {field.name}
                  </div>
                  <div className="text-sm text-muted">
                    {field.code} · ค้างรับ {formatQty(field.remaining)} {field.unit}
                  </div>
                </div>
                <div className="grid grid-cols-[7rem_8rem] gap-3">
                  <label>
                    <span className="block text-sm text-muted">มาจริง ({field.unit})</span>
                    <input
                      className="input num text-right"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      max={field.remaining}
                      required
                      {...register(`items.${i}.qty`)}
                    />
                  </label>
                  <label>
                    <span className="block text-sm text-muted">ยอดเงิน (บาท)</span>
                    <input
                      className="input num text-right"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      required={Number(items[i]?.qty) > 0}
                      {...register(`items.${i}.cost_total`)}
                    />
                  </label>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted">บันทึกแล้วแก้ไม่ได้ ของที่ยังไม่มารับเพิ่มได้อีกใบภายหลัง</p>
        </>
      )}
    </FormPage>
  );
}
