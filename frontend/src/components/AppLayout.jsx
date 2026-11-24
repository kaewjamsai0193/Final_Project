import { ClipboardList, LogOut, Menu, Package, Settings, Truck, Wrench } from "lucide-react";
import { useRef } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ROLE_NAME, useAuth } from "../auth";

// เมนูหลัก staffOnly = ช่างไม่เห็น
const MENU = [
  { to: "/stock", label: "สต็อก", icon: Package },
  { to: "/purchase-orders", label: "สั่งซื้อ", icon: ClipboardList, staffOnly: true },
  { to: "/goods-receipts", label: "รับของ", icon: Truck, staffOnly: true },
];

// class ของลิงก์เมนู เปลี่ยนสีเมื่อเป็นหน้าปัจจุบัน
const linkClass = ({ isActive }) =>
  `flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 transition-colors duration-150 ${
    isActive ? "bg-accent-soft font-bold text-accent-ink" : "text-ink hover:bg-surface"
  }`;

// ปุ่มในแถบเมนูล่าง (มือถือ/แท็บเล็ต) ไอคอนอยู่บน คำอยู่ล่าง
const tabClass = ({ isActive }) =>
  `flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-sm transition-colors duration-150 ${
    isActive ? "bg-accent-soft font-bold text-accent-ink" : "text-ink hover:bg-surface"
  }`;

// เมนูที่คนนี้มีสิทธิ์เห็น ช่างไม่เห็นเมนูสั่งซื้อกับรับของ
const menuFor = (user) => MENU.filter((m) => !(m.staffOnly && user.role === "mechanic"));

// showMenu=false ใช้ในเมนูเพิ่มเติมบนมือถือ เพราะเมนูหลักอยู่ที่แถบล่างแล้ว
function SidebarContent({ user, logout, showMenu = true }) {
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-3 text-lg font-semibold">
        <Wrench size={22} className="text-accent" />
        อู่ซ่อมรถ
      </div>
      {showMenu && (
        <div className="flex-1 space-y-1">
          {menuFor(user).map((m) => (
            <NavLink key={m.to} to={m.to} className={linkClass}>
              <m.icon />
              <span>{m.label}</span>
            </NavLink>
          ))}
        </div>
      )}
      <div className={`space-y-1 pt-2 ${showMenu ? "border-t border-line" : ""}`}>
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
    <div className="min-h-dvh lg:flex">
      {/* คอม: แถบข้างอยู่กับที่ */}
      <nav
        aria-label="เมนูหลัก"
        className="sticky top-0 hidden h-dvh w-60 flex-none flex-col border-r border-line p-3 print:hidden lg:flex"
      >
        <SidebarContent user={user} logout={logout} />
      </nav>

      {/* มือถือ/แท็บเล็ต: ชื่อร้านด้านบน */}
      <header className="sticky top-0 z-20 flex min-h-12 items-center gap-2 border-b border-line bg-white px-4 font-bold print:hidden lg:hidden">
        <Wrench size={22} className="text-accent" />
        อู่ซ่อมรถ
      </header>

      {/* มือถือ/แท็บเล็ต: แถบเมนูล่าง เห็นตลอด ไม่ต้องหาปุ่ม ☰ */}
      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white pb-[env(safe-area-inset-bottom)] print:hidden lg:hidden"
      >
        {menuFor(user).map((m) => (
          <NavLink key={m.to} to={m.to} className={tabClass}>
            <m.icon size={22} />
            {m.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => {
            drawer.current.showModal();
            drawer.current.focus();
          }}
          className={tabClass({ isActive: false })}
        >
          <Menu size={22} />
          เพิ่มเติม
        </button>
      </nav>
      {/* เมนูเพิ่มเติม (ตั้งค่า ออกจากระบบ) คลิกที่ไหนก็ปิด ใช้ <dialog> เลยได้ปุ่ม Esc และพื้นหลังทึบมาเอง */}
      <dialog
        ref={drawer}
        tabIndex={-1}
        aria-label="เมนูเพิ่มเติม"
        onClick={() => drawer.current.close()}
        className="m-0 h-dvh max-h-none w-72 outline-none max-w-[85vw] flex-col bg-white p-3 backdrop:bg-black/40 open:flex lg:hidden"
      >
        <SidebarContent user={user} logout={logout} showMenu={false} />
      </dialog>

      {/* เว้นที่ล่างให้แถบเมนู 3.5rem + ขอบจอ */}
      <main className="min-w-0 flex-1 p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-6 print:p-0">
        <Outlet />
      </main>
    </div>
  );
}
