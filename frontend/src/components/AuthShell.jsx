import { Wrench } from "lucide-react";

// กรอบหน้าก่อนล็อกอิน โลโก้อยู่บน การ์ดอยู่ล่าง ใช้ร่วมกับหน้าลืมรหัสผ่าน
export default function AuthShell({ subtitle, children }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-accent text-white">
            <Wrench size={30} />
          </div>
          <h1 className="text-2xl font-semibold">อู่ซ่อมรถ</h1>
          <p className="text-muted">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
