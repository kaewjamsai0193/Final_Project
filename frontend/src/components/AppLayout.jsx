import { ClipboardList, LogOut, Menu, Package, Settings, Truck, Wrench } from "lucide-react";
import { useRef } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ROLE_NAME, useAuth } from "../auth";

// เมนูหลัก group ต้องตรงกับชื่อใน GROUPS
const GROUPS = ["คลังสินค้า"];
const MENU = [
  { to: "/stock", label: "สต็อก", icon: Package, group: "คลังสินค้า" },
  { to: "/purchase-orders", label: "สั่งซื้อ", icon: ClipboardList, group: "คลังสินค้า", staffOnly: true },
  { to: "/goods-receipts", label: "รับของ", icon: Truck, group: "คลังสินค้า", staffOnly: true },
];

// class ของลิงก์เมนู เปลี่ยนสีเมื่อเป็นหน้าปัจจุบัน
const linkClass = ({ isActive }) =>
  `flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150 ${
    isActive ? "bg-accent-soft font-semibold text-accent-ink" : "text-muted hover:bg-surface hover:text-ink"
  }`;

function SidebarContent({ user, logout }) {
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-3 text-lg font-semibold">
        <Wrench size={22} className="text-accent" />
        อู่ซ่อมรถ
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto">
        {GROUPS.map((group) => (
          <div key={group} className="space-y-1">
            <div className="px-3 pb-1 text-xs text-muted">{group}</div>
            {MENU.filter((m) => m.group === group && !(m.staffOnly && user.role === "mechanic")).map((m) => (
              <NavLink key={m.to} to={m.to} className={linkClass}>
                <m.icon />
                <span>{m.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </div>
      <div className="space-y-1 border-t border-line pt-2">
        {user.role === "admin" && (
          <NavLink to="/settings" className={linkClass}>
            <Settings />
            <span>ตั้งค่า</span>
          </NavLink>
        )}
        <div className="px-3 py-2 text-sm">
          <div className="truncate font-semibold">{user.full_name}</div>
          <div className="text-muted">{ROLE_NAME[user.role]}</div>
        </div>
        <button type="button" onClick={logout} className={linkClass({ isActive: false })}>
          <LogOut />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </>
  );
}

// โครงหน้าหลังล็อกอิน เมนูข้างบนจอใหญ่ หรือเมนูเลื่อนบนมือถือ กับพื้นที่แสดงหน้า
export default function AppLayout() {
  const { user, logout } = useAuth();
  const drawer = useRef(null);
  return (
    <div className="min-h-dvh md:flex">
      {/* จอใหญ่: แถบข้างอยู่กับที่ */}
      <nav
        aria-label="เมนูหลัก"
        className="sticky top-0 hidden h-dvh w-60 flex-none flex-col border-r border-line p-3 print:hidden md:flex"
      >
        <SidebarContent user={user} logout={logout} />
      </nav>

      {/* มือถือ: แถบบนกับเมนูเลื่อน ใช้ <dialog> เลยได้ปุ่ม Esc และพื้นหลังทึบมาเอง */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-white px-2 py-2 print:hidden md:hidden">
        <button
          type="button"
          aria-label="เปิดเมนู"
          onClick={() => drawer.current.showModal()}
          className="grid size-11 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
        >
          <Menu />
        </button>
        <span className="font-semibold">อู่ซ่อมรถ</span>
      </header>
      {/* คลิกที่ไหนก็ปิด ทั้งพื้นหลังและเมนูที่เพิ่งกด */}
      <dialog
        ref={drawer}
        aria-label="เมนูหลัก"
        onClick={() => drawer.current.close()}
        className="m-0 h-dvh max-h-none w-64 max-w-[80vw] flex-col bg-white p-3 backdrop:bg-black/40 open:flex md:hidden"
      >
        <SidebarContent user={user} logout={logout} />
      </dialog>

      <main className="min-w-0 flex-1 p-4 md:p-6 print:p-0">
        <Outlet />
      </main>
    </div>
  );
}
