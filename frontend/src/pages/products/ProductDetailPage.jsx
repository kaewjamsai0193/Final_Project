import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { api, docNo, formatDate, formatMoney, formatQty } from "../../api";
import { useAuth } from "../../auth";
import DetailLayout from "../../components/DetailLayout";
import { ProductCell, Section, SimpleTable, StatGrid, Tabs } from "../../components/DetailParts";
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
  const lots = useQuery({ queryKey: ["products", id, "lots"], enabled: isAdmin });
  const [dialog, setDialog] = useState(null); // ป๊อปอัพที่เปิดอยู่ null, "edit", "opening" หรือ "waste"
  const closeDialog = () => setDialog(null);

  const p = product.data;
  if (!p) return <DetailLayout back="/stock" backLabel="สต็อก" title={product.error?.message || "กำลังโหลด…"} />;

  const low = productStatus(p) === "low";
  const movesTab = ["ประวัติเข้า-ออก", <MovesTable key="moves" moves={moves} />];
  const lotsTab = ["ล็อตคงเหลือ", <LotsTable key="lots" lots={lots} />];

  return (
    <DetailLayout
      back="/stock"
      backLabel="สต็อก"
      title={p.name}
      subtitle={`รหัส ${p.code}`}
      badge={<StatusBadge status={productStatus(p)} />}
      actions={
        isStaff && (
          <>
            <button type="button" className="btn btn-primary" onClick={() => setDialog("edit")}>
              <Pencil size={20} />
              แก้ไขสินค้า
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={Number(p.qty_on_hand) <= 0}
              onClick={() => setDialog("waste")}
            >
              <Minus size={20} />
              แจ้งของเสีย/สูญหาย
            </button>
            {isAdmin && (
              <button type="button" className="btn btn-secondary" onClick={() => setDialog("opening")}>
                <Plus size={20} />
                ลงสต็อกตั้งต้น
              </button>
            )}
          </>
        )
      }
    >
      <StatGrid
        stats={[
          ["คงเหลือ", `${formatQty(p.qty_on_hand)} ${p.unit}`, low],
          ["ราคาขาย", formatMoney(p.sale_price)],
          ["จำนวนขั้นต่ำ", Number(p.min_stock) > 0 ? `${formatQty(p.min_stock)} ${p.unit}` : "-"],
        ]}
      />

      {/* ล็อตเห็นเฉพาะเจ้าของอู่ */}
      {isAdmin ? <Tabs tabs={[movesTab, lotsTab]} /> : <Section title="ประวัติเข้า-ออก">{movesTab[1]}</Section>}

      {dialog === "edit" && <ProductFormDialog initial={p} onClose={closeDialog} onSaved={closeDialog} />}
      {dialog === "opening" && <OpeningDialog productId={p.id} onClose={closeDialog} />}
      {dialog === "waste" && <WasteDialog product={p} onClose={closeDialog} />}
    </DetailLayout>
  );
}

// ประวัติของเข้าออก ล่าสุดขึ้นก่อน ของออกเป็นตัวเลขสีแดง
function MovesTable({ moves }) {
  return (
    <SimpleTable
      rows={moves.data}
      error={moves.error}
      empty="ยังไม่มีของเข้าออก"
      columns={[
        { label: "วันที่", render: (m) => formatDate(m.created_at) },
        {
          label: "รายการ",
          render: (m) => (
            <ProductCell
              name={MOVE_LABEL[m.movement_type]}
              code={m.receipt_id && docNo("LOT", m.receipt_id)}
              note={m.reason || m.created_by_name}
            />
          ),
        },
        {
          label: "จำนวน",
          right: true,
          render: (m) => (
            <span className={Number(m.qty) < 0 ? "font-bold text-danger" : "font-bold"}>
              {Number(m.qty) > 0 ? "+" : ""}
              {formatQty(m.qty)}
            </span>
          ),
        },
      ]}
    />
  );
}

// ล็อตที่ยังมีของ เก่าสุดอยู่บน ของออกตัดจากล็อตบนสุดก่อน (FIFO)
function LotsTable({ lots }) {
  return (
    <SimpleTable
      rows={lots.data}
      error={lots.error}
      empty="ไม่มีของในคลัง"
      columns={[
        { label: "ล็อต", render: (l) => (l.receipt_id ? docNo("LOT", l.receipt_id) : MOVE_LABEL[l.movement_type]) },
        { label: "วันที่", render: (l) => formatDate(l.created_at) },
        { label: "ทุน/หน่วย", right: true, render: (l) => formatMoney(l.unit_cost) },
        { label: "เหลือ", right: true, render: (l) => `${formatQty(l.qty_left)} / ${formatQty(l.qty)}` },
      ]}
    />
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
        label="ต้นทุนต่อหน่วย (ก่อน VAT)"
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
