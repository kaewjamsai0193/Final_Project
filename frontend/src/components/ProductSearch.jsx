import { useQuery } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { formatQty } from "../api";
import SearchBar from "./SearchBar";

// ช่องค้นสินค้า พิมพ์แล้วถึงโชว์ผล (ไม่ดันรายการที่เลือกไว้ลงไป) แตะเพื่อเพิ่ม isPicked บอกว่าตัวไหนเลือกไปแล้ว
export default function ProductSearch({ onPick, isPicked }) {
  const { data: products } = useQuery({ queryKey: ["products"] });
  const [q, setQ] = useState("");
  const text = q.trim().toLowerCase();
  const found = products
    ?.filter((p) => p.is_active && (p.code.toLowerCase().includes(text) || p.name.toLowerCase().includes(text)))
    .slice(0, 20);

  return (
    <div className="space-y-2">
      <SearchBar q={q} setQ={setQ} placeholder="ค้นชื่อหรือรหัสสินค้า" />
      {!text ? (
        <p className="text-sm text-muted">พิมพ์ชื่อหรือรหัสเพื่อค้นหา แล้วกด "เพิ่ม"</p>
      ) : !found ? (
        <p className="text-sm text-muted">กำลังโหลด…</p>
      ) : found.length === 0 ? (
        <p className="text-sm text-muted">ไม่พบสินค้า</p>
      ) : (
        <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-lg border border-line">
          {found.map((p) => {
            const out = Number(p.qty_on_hand) <= 0;
            const picked = isPicked(p);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={picked}
                  onClick={() => {
                    onPick(p);
                    setQ("");
                  }}
                  className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface disabled:cursor-default disabled:hover:bg-white"
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block font-medium ${out ? "text-muted" : ""}`}>{p.name}</span>
                    <span className="block text-sm text-muted">
                      {p.code} ·{" "}
                      {out ? <span className="text-danger">หมด</span> : `เหลือ ${formatQty(p.qty_on_hand)} ${p.unit}`}
                    </span>
                  </span>
                  {picked ? (
                    <span className="flex items-center gap-1 text-sm text-ok-ink">
                      <Check size={18} />
                      เลือกแล้ว
                    </span>
                  ) : (
                    <span className="btn btn-secondary pointer-events-none min-h-10 px-3 text-accent-ink">
                      <Plus size={18} />
                      เพิ่ม
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
