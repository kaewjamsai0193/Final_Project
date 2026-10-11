import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDate, formatMoney } from "../../api";
import { useAuth } from "../../auth";
import DataTable from "../../components/DataTable";
import ListLayout from "../../components/ListLayout";
import SearchBar from "../../components/SearchBar";
import { SourceBadge } from "../../components/StatusBadge";

// หน้ารายการใบรับของ (เจ้าของอู่กับพนักงาน) ค้นเลขที่หรือร้านได้ ต้นทุนเห็นเฉพาะเจ้าของอู่
export default function GoodsReceiptListPage() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const { data, error } = useQuery({ queryKey: ["goods-receipts"] });
  const [q, setQ] = useState("");
  const text = q.trim().toLowerCase();
  const items = data?.filter(
    (gr) => !text || gr.display_number.toLowerCase().includes(text) || gr.supplier_name.toLowerCase().includes(text),
  );

  return (
    <ListLayout
      title="รับของ"
      basePath="/goods-receipts"
      action={{ label: "บันทึกรับของ", to: "/goods-receipts/new" }}
      toolbar={<SearchBar q={q} setQ={setQ} placeholder="ค้นเลขที่หรือร้าน" />}
    >
      {error && (
        <p role="alert" className="field-error">
          {error.message}
        </p>
      )}
      <DataTable
        items={items}
        actions={(gr) => (
          <Link to={`/goods-receipts/${gr.id}`} className="btn btn-secondary">
            ดู
          </Link>
        )}
        empty="ยังไม่มีใบรับของ"
        card={(gr) => (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">{gr.display_number}</span>
              <SourceBadge gr={gr} />
            </div>
            <div className="truncate">{gr.supplier_name}</div>
            <div className="mt-1 flex justify-between gap-2 text-sm text-muted">
              <span>
                {formatDate(gr.created_at)} · {gr.created_by_name}
              </span>
              {isAdmin && <span className="num font-semibold text-ink">{formatMoney(gr.cost_total)}</span>}
            </div>
          </>
        )}
        columns={[
          { label: "เลขที่", render: (gr) => gr.display_number },
          { label: "วันที่", render: (gr) => formatDate(gr.created_at) },
          { label: "ร้าน", render: (gr) => gr.supplier_name },
          { label: "อ้าง PO", render: (gr) => <SourceBadge gr={gr} /> },
          { label: "ผู้บันทึก", render: (gr) => gr.created_by_name },
          ...(isAdmin ? [{ label: "ต้นทุนรวม", align: "right", render: (gr) => formatMoney(gr.cost_total) }] : []),
        ]}
      />
    </ListLayout>
  );
}