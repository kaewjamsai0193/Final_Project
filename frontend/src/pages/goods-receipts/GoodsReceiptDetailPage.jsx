import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { formatDate, formatMoney, formatQty } from "../../api";
import { useAuth } from "../../auth";
import DetailLayout from "../../components/DetailLayout";
import { InfoList, ProductCell, Section, SimpleTable, StatGrid } from "../../components/DetailParts";

// หน้าใบรับของ ดูได้อย่างเดียวเพราะบันทึกแล้วแก้ไม่ได้ ต้นทุนเห็นเฉพาะเจ้าของอู่
export default function GoodsReceiptDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const { data: gr, error } = useQuery({ queryKey: ["goods-receipts", id] });

  if (!gr) {
    return <DetailLayout back="/goods-receipts" backLabel="รับของ" title={error?.message || "กำลังโหลด…"} />;
  }

  // เศษสตางค์ของล็อต บวกเข้าชิ้นแรกที่ตัดออก (Adjust First) ไม่มีเศษไม่ต้องโชว์
  const unitCost = (it) =>
    Number(it.adj_first) === 0
      ? formatMoney(it.unit_cost)
      : `${formatMoney(it.unit_cost)} (ชิ้นแรก ${Number(it.adj_first) > 0 ? "+" : ""}${formatMoney(it.adj_first)})`;

  return (
    <DetailLayout back="/goods-receipts" backLabel="รับของ" title={gr.display_number} subtitle={gr.supplier_name}>
      <StatGrid
        stats={[
          ["รับทั้งหมด", `${gr.items.length} รายการ`],
          ...(isAdmin ? [["ต้นทุนรวม", formatMoney(gr.cost_total)]] : []),
        ]}
      />

      <Section title="รายการที่รับ">
        <SimpleTable
          rows={gr.items}
          columns={[
            { label: "สินค้า", render: (it) => <ProductCell name={it.product_name} code={it.product_code} /> },
            { label: "จำนวน", right: true, render: (it) => `${formatQty(it.qty)} ${it.unit}` },
            ...(isAdmin
              ? [
                  { label: "ทุน/หน่วย", right: true, render: unitCost },
                  { label: "รวม", right: true, render: (it) => formatMoney(it.cost_total) },
                ]
              : []),
          ]}
        />
      </Section>

      <Section title="ข้อมูลใบรับของ">
        <InfoList
          rows={[
            [
              "อ้างใบสั่งซื้อ",
              gr.po_id ? (
                <Link to={`/purchase-orders/${gr.po_id}`} className="text-accent underline">
                  {gr.po_number}
                </Link>
              ) : (
                "ไม่มี (ซื้อด่วน)"
              ),
            ],
            ["ผู้บันทึก", gr.created_by_name],
            ["วันที่", formatDate(gr.created_at)],
          ]}
        />
      </Section>
    </DetailLayout>
  );
}
