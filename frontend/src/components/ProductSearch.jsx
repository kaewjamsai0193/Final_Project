import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatQty } from "../api";
import SearchBar from "./SearchBar";


// ช่องค้นสินค้าจากรายการที่หน้าสต็อกโหลดไว้แล้ว แตะสินค้าเพื่อเลือก
export default function ProductSearch({ onPick }) {
  const { data: products } = useQuery({ queryKey: ["products"] });
  const [q, setQ] = useState("");
  const text = q.trim().toLowerCase();
  const found = products
    ?.filter(
      (p) => p.is_active && (!text || p.code.toLowerCase().includes(text) || p.name.toLowerCase().includes(text)),
    )
    .slice(0, 20);

  return (
    <div className="space-y-2">
      <SearchBar q={q} setQ={setQ} placeholder="ค้นชื่อหรือรหัสสินค้า" />
      {!found ? (
        <p className="text-sm text-muted">กำลังโหลด…</p>
      ) : found.length === 0 ? (
        <p className="text-sm text-muted">ไม่พบสินค้า</p>
      ) : (
        <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-lg border border-line">
          {found.map((p) => {
            const out = Number(p.qty_on_hand) <= 0;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(p);
                    setQ("");
                  }}
                  className="flex min-h-12 w-full items-center px-3 py-2 text-left hover:bg-surface"
                >
                  <span className="min-w-0">
                    <span className={`block truncate font-medium ${out ? "text-muted" : ""}`}>{p.name}</span>
                    <span className="block text-sm text-muted">
                      {p.code} ·{" "}
                      {out ? <span className="text-danger">หมด</span> : `เหลือ ${formatQty(p.qty_on_hand)} ${p.unit}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}