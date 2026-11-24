import { useQuery } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatMoney, formatQty } from "../../api";
import { useAuth } from "../../auth";
import ListLayout from "../../components/ListLayout";
import DataTable from "../../components/DataTable";
import ImportOpeningDialog from "../../components/ImportOpeningDialog";
import ProductFormDialog from "../../components/ProductFormDialog";
import StatusBadge, { productStatus } from "../../components/StatusBadge";
import SearchBar from "../../components/SearchBar";

const EMPTY_PRODUCT = { code: "", name: "", unit: "", sale_price: "", min_stock: "0", is_active: true };
const FILTERS = [
  ["active", "ใช้งานอยู่"],
  ["low", "ถึงจุดเตือน"],
  ["inactive", "เลิกใช้"],
];

// หน้ารายการสินค้า ค้นหาและกรองในหน้าเลย กดเพิ่มสินค้าจะเปิดป๊อปอัพ บันทึกแล้วไปหน้าสินค้าตัวใหม่
export default function ProductListPage() {
  const { user } = useAuth();
  const { data, error } = useQuery({ queryKey: ["products"] });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("active");
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(null); // ป๊อปอัพที่เปิดอยู่ null, "add" หรือ "import"
  const closeDialog = () => setDialog(null);
  const text = q.trim().toLowerCase();
  // แท็บใช้งานอยู่ดูว่าเปิดใช้ไหม แท็บอื่นดูตามป้ายสถานะ
  const matchesFilter = (p) => (filter === "active" ? p.is_active : productStatus(p) === filter);
  const matchesText = (p) => !text || p.code.toLowerCase().includes(text) || p.name.toLowerCase().includes(text);
  const items = data?.filter((p) => matchesFilter(p) && matchesText(p));

  return (
    <ListLayout
      title="สต็อก"
      error={error}
      action={user.role !== "mechanic" && { label: "เพิ่มสินค้า", onClick: () => setDialog("add") }}
      toolbar={
        <>
          {user.role === "admin" && (
            <button type="button" className="btn btn-secondary" onClick={() => setDialog("import")}>
              <Upload size={20} />
              นำเข้าสต็อกตั้งต้น (Excel)
            </button>
          )}
          <SearchBar
            q={q}
            setQ={setQ}
            placeholder="ค้นรหัสหรือชื่อสินค้า"
            filters={FILTERS}
            filter={filter}
            setFilter={setFilter}
          />
        </>
      }
    >
      <DataTable
        items={items}
        to={(p) => `/stock/${p.id}`}
        empty="ไม่พบสินค้า"
        card={(p) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold break-words">{p.name}</div>
              <div className="text-sm text-muted">{p.code}</div>
              <StatusBadge status={productStatus(p)} />
            </div>
            <div className="num text-lg font-bold whitespace-nowrap">
              {formatQty(p.qty_on_hand)} <span className="text-sm font-normal text-muted">{p.unit}</span>
            </div>
          </div>
        )}
        columns={[
          { label: "รหัส", render: (p) => p.code },
          { label: "ชื่อ", render: (p) => p.name },
          { label: "ราคาขาย", align: "right", render: (p) => formatMoney(p.sale_price) },
          { label: "คงเหลือ", align: "right", render: (p) => `${formatQty(p.qty_on_hand)} ${p.unit}` },
          { label: "สถานะ", render: (p) => <StatusBadge status={productStatus(p)} /> },
        ]}
      />
      {dialog === "add" && (
        <ProductFormDialog initial={EMPTY_PRODUCT} onClose={closeDialog} onSaved={(p) => navigate(`/stock/${p.id}`)} />
      )}
      {dialog === "import" && <ImportOpeningDialog products={data} onClose={closeDialog} />}
    </ListLayout>
  );
}
