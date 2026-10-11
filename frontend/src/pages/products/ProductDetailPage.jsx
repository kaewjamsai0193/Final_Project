import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { api, docNo, formatDate, formatMoney, formatQty } from "../../api";
import { useAuth } from "../../auth";
import DetailLayout from "../../components/DetailLayout";
import Field from "../../components/Field";
import ProductFormDialog from "../../components/ProductFormDialog";
import ReasonDialog from "../../components/ReasonDialog";
import StatusBadge, { productStatus } from "../../components/StatusBadge";

const MOVE_LABEL = { opening: "ตั้งต้น", receive: "รับของ", waste: "ของเสีย/สูญหาย" };

// หน้าสินค้า คงเหลือ สมุดสต็อก และปุ่มแก้สินค้า แจ้งของเสีย ลงสต็อกตั้งต้น
export default function ProductDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const isStaff = user.role !== "mechanic";
  const product = useQuery({ queryKey: ["products", id] });
  const moves = useQuery({ queryKey: ["products", id, "movements"] });
  const [dialog, setDialog] = useState(null); // ป๊อปอัพที่เปิดอยู่ null, "edit", "opening" หรือ "waste"
  const closeDialog = () => setDialog(null);

  const p = product.data;
  if (!p) return <DetailLayout back="/stock" backLabel="สต็อก" title={product.error?.message || "กำลังโหลด…"} />;

  return (
    <DetailLayout
      back="/stock"
      backLabel="สต็อก"
      title={p.name}
      subtitle={p.code}
      badge={<StatusBadge status={productStatus(p)} />}
      action={
        isAdmin && (
          <button type="button" className="btn btn-secondary" onClick={() => setDialog("opening")}>
            <Plus size={20} />
            สต็อกตั้งต้น
          </button>
        )
      }
      footer={
        isStaff && (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary flex-1"
              disabled={Number(p.qty_on_hand) <= 0}
              onClick={() => setDialog("waste")}
            >
              <Minus size={20} />
              ของเสีย/สูญหาย
            </button>
            <button type="button" className="btn btn-primary flex-1" onClick={() => setDialog("edit")}>
              <Pencil size={20} />
              แก้สินค้า
            </button>
          </div>
        )
      }
    >
      <div>
        <div className="text-sm text-muted">คงเหลือ</div>
        <div className="num text-4xl font-bold">
          {formatQty(p.qty_on_hand)} <span className="text-lg font-medium text-muted">{p.unit}</span>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <Fact label="ราคาขาย" value={formatMoney(p.sale_price)} />
        <Fact label="ขั้นต่ำ" value={Number(p.min_stock) > 0 ? formatQty(p.min_stock) : "-"} />
        {isAdmin && <Fact label="ต้นทุนเฉลี่ย" value={formatMoney(p.avg_cost)} />}
      </dl>

      <h2 className="font-semibold">สมุดสต็อก</h2>
      <MovementList moves={moves} />

      {dialog === "edit" && <ProductFormDialog initial={p} onClose={closeDialog} onSaved={closeDialog} />}
      {dialog === "opening" && <OpeningDialog productId={p.id} onClose={closeDialog} />}
      {dialog === "waste" && <WasteDialog product={p} onClose={closeDialog} />}
    </DetailLayout>
  );
}

// กล่องข้อมูลสั้น หัวข้อกับค่า
function Fact({ label, value }) {
  return (
    <div className="rounded-lg bg-surface p-2">
      <dt className="text-muted">{label}</dt>
      <dd className="num font-semibold">{value}</dd>
    </div>
  );
}

// สมุดสต็อก รายการล่าสุดขึ้นก่อน ของออกเป็นตัวเลขสีแดง
function MovementList({ moves }) {
  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {moves.error && (
        <li role="alert" className="field-error p-4">
          {moves.error.message}
        </li>
      )}
      {moves.data?.length === 0 && <li className="p-4 text-muted">ยังไม่มีของเข้าออก</li>}
      {moves.data?.map((m) => {
        const qty = Number(m.qty);
        return (
          <li key={m.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0 text-sm">
              <div className="font-semibold">{MOVE_LABEL[m.movement_type]}</div>
              <div className="text-muted">
                {[formatDate(m.created_at), m.created_by_name, m.receipt_id && docNo("LOT", m.receipt_id)]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              {m.reason && <div className="text-muted">{m.reason}</div>}
            </div>
            <span className={`num font-bold ${qty < 0 ? "text-danger" : ""}`}>
              {qty > 0 ? "+" : ""}
              {formatQty(m.qty)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ส่งคำสั่งปรับสต็อก สำเร็จแล้วให้ข้อมูลสินค้าทุกหน้าโหลดใหม่แล้วปิดป๊อปอัพ
function useAdjustStock(path, onDone) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => api(path, { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onDone();
    },
  });
}

// ป๊อปอัพแจ้งของเสียหรือของหาย ใส่จำนวนกับเหตุผล
function WasteDialog({ product, onClose }) {
  const { register, handleSubmit } = useForm({ defaultValues: { qty: "", reason: "" } });
  const waste = useAdjustStock("/stock/waste", onClose);
  return (
    <ReasonDialog
      title="ของเสีย/สูญหาย"
      onClose={onClose}
      register={register}
      mutation={waste}
      onSubmit={handleSubmit((form) => waste.mutate({ ...form, product_id: product.id }))}
    >
      <Field
        label={`จำนวน (เหลือ ${formatQty(product.qty_on_hand)} ${product.unit})`}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0.01"
        max={product.qty_on_hand}
        required
        {...register("qty")}
      />
    </ReasonDialog>
  );
}

// ป๊อปอัพลงสต็อกตั้งต้น (เจ้าของอู่) ใช้ตอนเริ่มระบบ ของเข้าปกติมาจากใบรับของ
function OpeningDialog({ productId, onClose }) {
  const { register, handleSubmit } = useForm({ defaultValues: { qty: "", unit_cost: "", reason: "" } });
  const opening = useAdjustStock("/stock/opening", onClose);
  return (
    <ReasonDialog
      title="สต็อกตั้งต้น"
      onClose={onClose}
      register={register}
      mutation={opening}
      onSubmit={handleSubmit((form) => opening.mutate({ ...form, product_id: productId }))}
    >
      <Field label="จำนวน" type="number" inputMode="decimal" step="0.01" min="0.01" required {...register("qty")} />
      <Field
        label="ต้นทุนต่อหน่วย"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        required
        {...register("unit_cost")}
      />
    </ReasonDialog>
  );
}
