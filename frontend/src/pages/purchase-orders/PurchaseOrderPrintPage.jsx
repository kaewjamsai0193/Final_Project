import { useQuery } from "@tanstack/react-query";
import { toPng } from "html-to-image";
import { ImageDown } from "lucide-react";
import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { formatDate, formatMoney, formatQty } from "../../api";

// หน้าใบสั่งซื้อขนาด A4 (เจ้าของอู่) บันทึกเป็นรูปได้ แถบปุ่มด้านบนไม่ติดไปในรูปหรือตอนกด Ctrl+P
export default function PurchaseOrderPrintPage() {
  const { id } = useParams();
  const { data: po, error } = useQuery({ queryKey: ["purchase-orders", id] });
  const { data: shop } = useQuery({ queryKey: ["settings"] });
  const docRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  // เปิดจากในเว็บก็ย้อนกลับ เปิดเป็นแท็บใหม่ก็ปิดแท็บ
  const closePage = () => (history.length > 1 ? history.back() : window.close());

  // ถ่ายใบเป็น PNG จอมือถือแคบก็บังคับกว้าง 210mm ชั่วครู่ ให้รูปออกมาเป็น A4 เหมือนกันทุกเครื่อง
  async function saveImage() {
    const node = docRef.current;
    setSaving(true);
    setSaveError(null);
    node.style.width = "210mm";
    node.style.maxWidth = "none";
    try {
      const link = document.createElement("a");
      link.href = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: "#fff",
        style: { margin: "0", boxShadow: "none" },
      });
      link.download = `${po.display_number}.png`;
      link.click();
    } catch (e) {
      setSaveError(`บันทึกรูปไม่สำเร็จ ${e.message ?? ""}`);
    } finally {
      node.style.width = node.style.maxWidth = "";
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-surface print:bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-end gap-2 border-b border-line bg-white p-2 print:hidden">
        {saveError && (
          <p role="alert" className="field-error mr-auto">
            {saveError}
          </p>
        )}
        <button type="button" className="btn btn-secondary" onClick={closePage}>
          ปิด
        </button>
        <button type="button" className="btn btn-primary" onClick={saveImage} disabled={!po || saving}>
          <ImageDown size={20} />
          {saving ? "กำลังบันทึก…" : "บันทึกรูปภาพ"}
        </button>
      </div>
      {/* สูงเท่าแผ่น A4 ให้ช่องเซ็นลงไปอยู่ล่างสุด ตอนพิมพ์ 272mm = 297 - ขอบ @page 12mm×2 เผื่อ 1mm กันล้นหน้าสอง */}
      <article
        ref={docRef}
        className="mx-auto my-4 flex min-h-[297mm] max-w-[210mm] flex-col bg-white p-6 text-sm shadow-sm md:p-10 print:m-0 print:min-h-[272mm] print:max-w-none print:p-0 print:shadow-none"
      >
        {error ? (
          <p role="alert" className="field-error">
            {error.message}
          </p>
        ) : !po ? (
          <p className="text-muted">กำลังโหลด…</p>
        ) : (
          <PoDocument po={po} shop={shop} />
        )}
      </article>
    </div>
  );
}

// เนื้อใบสั่งซื้อ หัวอู่ ผู้ขาย ตารางรายการ หมายเหตุ และช่องเซ็น
function PoDocument({ po, shop }) {
  const hasPrice = (it) => it.unit_price != null;
  const supplierLines = [po.supplier_name, po.supplier_address, po.supplier_phone && `โทร ${po.supplier_phone}`].filter(
    Boolean,
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex flex-wrap justify-between gap-4 border-b-2 border-ink pb-4">
        <div className="min-w-0">
          <div className="text-lg font-bold">{shop?.shop_name || "ชื่ออู่ (ตั้งค่าได้ในหน้าตั้งค่า)"}</div>
          {shop?.shop_address && <div className="whitespace-pre-line">{shop.shop_address}</div>}
          {shop?.shop_tax_id && <div>เลขประจำตัวผู้เสียภาษี {shop.shop_tax_id}</div>}
        </div>
        <div className="text-right">
          <div className="text-xl font-bold">ใบสั่งซื้อ</div>
          <div>เลขที่ {po.display_number}</div>
          <div>วันที่ {formatDate(po.created_at)}</div>
        </div>
      </header>

      <div>
        <div className="font-semibold">ผู้ขาย</div>
        {supplierLines.map((line, i) => (
          <div key={i} className="whitespace-pre-line">
            {line}
          </div>
        ))}
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-y border-ink text-left">
            <th className="px-2 py-1.5">ลำดับ</th>
            <th className="px-2 py-1.5">รหัส</th>
            <th className="px-2 py-1.5">รายการ</th>
            <th className="px-2 py-1.5 text-right">จำนวน</th>
            <th className="px-2 py-1.5">หน่วย</th>
            <th className="px-2 py-1.5 text-right">ราคา/หน่วย</th>
            <th className="px-2 py-1.5 text-right">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {po.items.map((it, i) => (
            <tr key={it.product_id} className="border-b border-line">
              <td className="px-2 py-1.5">{i + 1}</td>
              <td className="px-2 py-1.5">{it.product_code}</td>
              <td className="px-2 py-1.5">{it.product_name}</td>
              <td className="num px-2 py-1.5 text-right">{formatQty(it.qty)}</td>
              <td className="px-2 py-1.5">{it.unit}</td>
              <td className="num px-2 py-1.5 text-right">{hasPrice(it) ? formatMoney(it.unit_price) : "-"}</td>
              <td className="num px-2 py-1.5 text-right">
                {hasPrice(it) ? formatMoney(Number(it.qty) * Number(it.unit_price)) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-ink text-base font-bold">
            <td colSpan={6} className="px-2 py-1 text-right">
              ยอดประมาณการ
            </td>
            <td className="num px-2 py-1 text-right">{formatMoney(po.estimated_total)}</td>
          </tr>
        </tfoot>
      </table>

      {po.note && (
        <div>
          <div className="font-semibold">หมายเหตุ</div>
          <div className="whitespace-pre-line">{po.note}</div>
        </div>
      )}

      <div className="mt-auto grid grid-cols-2 gap-8 pt-12 break-inside-avoid">
        {["ผู้สั่งซื้อ", "ผู้อนุมัติ"].map((label) => (
          <div key={label} className="text-center">
            <div className="border-b border-ink pb-8" />
            <div className="pt-1">{label}</div>
            <div className="text-muted">วันที่ ........../........../..........</div>
          </div>
        ))}
      </div>
    </div>
  );
}
