import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, formatDate, formatMoney } from "../../api";
import { useAuth } from "../../auth";
import DataTable from "../../components/DataTable";
import ListLayout from "../../components/ListLayout";
import SearchBar from "../../components/SearchBar";
import StatusBadge, { poStatus } from "../../components/StatusBadge";

const FILTERS = [
  ["open", "เปิดอยู่"],
  ["closed", "ปิดแล้ว"],
  ["all", "ทั้งหมด"],
];

// หน้ารายการใบสั่งซื้อ กรองตามสถานะ ค้นเลขที่หรือร้านได้ ราคาเห็นเฉพาะเจ้าของอู่
export default function PurchaseOrderListPage() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [status, setStatus] = useState("open");
  const [q, setQ] = useState("");
  const { data, error } = useQuery({
    queryKey: ["purchase-orders", { status }],
    queryFn: () => api(status === "all" ? "/purchase-orders" : `/purchase-orders?status=${status}`),
  });
  const text = q.trim().toLowerCase();
  const items = data?.filter(
    (po) => !text || po.display_number.toLowerCase().includes(text) || po.supplier_name.toLowerCase().includes(text),
  );

  return (
    <ListLayout
      title="ใบสั่งซื้อ"
      basePath="/purchase-orders"
      action={isAdmin && { label: "สร้างใบสั่งซื้อ", to: "/purchase-orders/new" }}
      toolbar={
        <SearchBar
          q={q}
          setQ={setQ}
          placeholder="ค้นเลขที่หรือร้าน"
          filters={FILTERS}
          filter={status}
          setFilter={setStatus}
        />
      }
    >
      {error && (
        <p role="alert" className="field-error">
          {error.message}
        </p>
      )}
      <DataTable
        items={items}
        actions={(po) => (
          <Link to={`/purchase-orders/${po.id}`} className="btn btn-secondary">
            ดู
          </Link>
        )}
        empty="ไม่มีใบสั่งซื้อ"
        card={(po) => (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">{po.display_number}</span>
              <StatusBadge status={poStatus(po)} />
            </div>
            <div className="truncate">{po.supplier_name}</div>
            <div className="mt-1 flex justify-between gap-2 text-sm text-muted">
              <span>
                {formatDate(po.created_at)} · {po.items.length} รายการ
              </span>
              {isAdmin && <span className="num font-semibold text-ink">{formatMoney(po.estimated_total)}</span>}
            </div>
          </>
        )}
        columns={[
          { label: "เลขที่", render: (po) => po.display_number },
          { label: "ร้าน", render: (po) => po.supplier_name },
          { label: "วันที่", render: (po) => formatDate(po.created_at) },
          { label: "สถานะ", render: (po) => <StatusBadge status={poStatus(po)} /> },
          { label: "รายการ", align: "right", render: (po) => po.items.length },
          ...(isAdmin
            ? [{ label: "ยอดประมาณการ", align: "right", render: (po) => formatMoney(po.estimated_total) }]
            : []),
        ]}
      />
    </ListLayout>
  );
}