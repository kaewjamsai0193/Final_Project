import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { api, formatMoney, formatQty } from "../../api";
import Field from "../../components/Field";
import FormPage from "../../components/FormPage";
import ProductSearch from "../../components/ProductSearch";
import { productStatus } from "../../components/StatusBadge";

const EMPTY_PO = { supplier_name: "", supplier_phone: "", supplier_address: "", note: "", items: [] };

// หน้าสร้างใบสั่งซื้อ (เจ้าของอู่) กรอกร้าน แล้วเพิ่มสินค้าเป็นบรรทัด ๆ
export default function PurchaseOrderFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: products } = useQuery({ queryKey: ["products"] });
  const { register, handleSubmit, control, watch } = useForm({ defaultValues: EMPTY_PO });
  const { fields, append, remove } = useFieldArray({ control, name: "items" }); // แต่ละบรรทัดมี product, qty, unit_price
  const items = watch("items");
  // ตัวเลขนี้แค่โชว์ระหว่างกรอก backend คิดยอดจริงเองตอนบันทึก
  const total = items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.unit_price || 0), 0);

  const picked = (p) => items.some((it) => it.product.id === p.id);
  const add = (p) => picked(p) || append({ product: p, qty: "", unit_price: "" });
  // ของที่ถึงจุดเตือนแต่ยังไม่อยู่ในใบ กดทีเดียวเพิ่มให้หมด
  const lowStock = products?.filter((p) => productStatus(p) === "low" && !picked(p)) ?? [];

  const save = useMutation({
    mutationFn: ({ items, ...head }) =>
      api("/purchase-orders", {
        method: "POST",
        body: {
          ...head,
          items: items.map((it) => ({ product_id: it.product.id, qty: it.qty, unit_price: it.unit_price || null })),
        },
      }),
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      navigate(`/purchase-orders/${po.id}`);
    },
  });

  return (
    <FormPage
      back="/purchase-orders"
      backLabel="สั่งซื้อ"
      title="สร้างใบสั่งซื้อ"
      onSubmit={handleSubmit((form) => save.mutate(form))}
      error={save.error}
      bar={
        <>
          <div className="mr-auto">
            <div className="text-sm text-muted">{fields.length} รายการ · ยอดรวม</div>
            <div className="num text-lg font-bold">{formatMoney(total)}</div>
          </div>
          <button className="btn btn-primary" disabled={save.isPending || fields.length === 0}>
            {save.isPending ? "กำลังบันทึก…" : "บันทึกใบสั่งซื้อ"}
          </button>
        </>
      }
    >
      <Field label="สั่งจากร้าน" required {...register("supplier_name")} />
      <details>
        <summary className="cursor-pointer text-accent-ink">+ เบอร์โทร ที่อยู่ หมายเหตุ (ไม่บังคับ)</summary>
        <div className="mt-2 space-y-3">
          <Field
            label="เบอร์โทรร้าน"
            type="tel"
            inputMode="tel"
            pattern="[0-9+\- ]*"
            title="ใส่ได้เฉพาะตัวเลข"
            {...register("supplier_phone")}
          />
          <Field label="ที่อยู่ร้าน" {...register("supplier_address")} />
          <Field label="หมายเหตุ" {...register("note")} />
        </div>
      </details>

      <ol className="card divide-y divide-line py-0">
        {fields.length === 0 && <li className="py-4 text-muted">ยังไม่มีรายการ ค้นสินค้าด้านล่างเพื่อเพิ่ม</li>}
        {fields.map((field, i) => (
          <li key={field.id} className="space-y-2 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">
                  {i + 1}. {field.product.name}
                </div>
                <div className="text-sm text-muted">
                  {field.product.code} · เหลือ {formatQty(field.product.qty_on_hand)} {field.product.unit}
                </div>
              </div>
              <button
                type="button"
                className="text-sm whitespace-nowrap text-danger underline"
                onClick={() => remove(i)}
              >
                ลบ
              </button>
            </div>
            <div className="grid grid-cols-[7rem_8rem] gap-3">
              <label>
                <span className="block text-sm text-muted">จำนวน ({field.product.unit})</span>
                <input
                  className="input num text-right"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  {...register(`items.${i}.qty`)}
                />
              </label>
              <label>
                <span className="block text-sm text-muted">ราคา/หน่วย</span>
                <input
                  className="input num text-right"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  {...register(`items.${i}.unit_price`)}
                />
              </label>
            </div>
          </li>
        ))}
      </ol>

      <div className="card space-y-2">
        <div className="font-semibold">เพิ่มสินค้า</div>
        <ProductSearch onPick={add} isPicked={picked} />
        {lowStock.length > 0 && (
          <button
            type="button"
            className="btn btn-secondary w-full text-warn-ink"
            onClick={() => lowStock.forEach(add)}
          >
            <AlertTriangle size={20} />
            เพิ่มของที่ถึงจุดเตือนทั้งหมด ({lowStock.length})
          </button>
        )}
      </div>
    </FormPage>
  );
}
