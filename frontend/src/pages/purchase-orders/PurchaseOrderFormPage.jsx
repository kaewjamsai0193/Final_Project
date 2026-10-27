import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useOutletContext } from "react-router-dom";
import { api, formatMoney } from "../../api";
import Field from "../../components/Field";
import Modal from "../../components/Modal";
import ProductSearch from "../../components/ProductSearch";

const EMPTY_PO = {
  supplier_name: "",
  supplier_phone: "",
  supplier_address: "",
  note: "",
  items: [],
};

// ฟอร์มสร้างใบสั่งซื้อ (เจ้าของอู่) ข้อมูลร้านกับรายการสินค้า บันทึกแล้วไปหน้าใบใหม่
export default function PurchaseOrderFormPage() {
  const { close } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { register, handleSubmit, control, watch } = useForm({ defaultValues: EMPTY_PO });
  const { fields, append, remove } = useFieldArray({ control, name: "items" }); // แต่ละแถวมี product, qty, unit_price
  const items = watch("items");
  // ตัวเลขนี้แค่โชว์ระหว่างกรอก backend คิดยอดจริงเองตอนบันทึก
  const estimate = items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.unit_price || 0), 0);

  // แตะสินค้าที่มีในรายการแล้ว ไม่เพิ่มซ้ำ
  const addProduct = (p) => {
    if (!items.some((it) => it.product.id === p.id)) append({ product: p, qty: "", unit_price: "" });
  };

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
    <Modal
      title="สร้างใบสั่งซื้อ"
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
              <div className="text-muted">ยอดประมาณการ (ก่อน VAT)</div>
              <div className="num text-lg font-bold">{formatMoney(estimate)}</div>
            </div>
            <button className="btn btn-primary" disabled={save.isPending || fields.length === 0}>
              {save.isPending ? "กำลังบันทึก…" : "บันทึกใบสั่งซื้อ"}
            </button>
          </div>
        </>
      }
    >
      <Field label="ชื่อร้าน" required {...register("supplier_name")} />
      <details className="rounded-lg border border-line px-3">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium">
          ข้อมูลร้านเพิ่มเติม (ไม่บังคับ)
        </summary>
        <div className="space-y-3 pb-3">
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

      <section className="space-y-2">
        <h3 className="font-semibold">รายการ</h3>
        {fields.length > 0 && (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {fields.map((field, i) => (
              <li key={field.id} className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 font-medium">
                    {field.product.name} <span className="text-sm text-muted">{field.product.code}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`ลบ ${field.product.name}`}
                    className="btn btn-ghost btn-icon text-muted hover:text-danger"
                    onClick={() => remove(i)}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label={`จำนวน (${field.product.unit})`}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    required
                    {...register(`items.${i}.qty`)}
                  />
                  <Field
                    label="ราคา/หน่วย (ก่อน VAT)"
                    hint="ไม่บังคับ"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    {...register(`items.${i}.unit_price`)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <ProductSearch onPick={addProduct} />
      </section>
    </Modal>
  );
}
