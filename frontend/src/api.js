import { QueryClient } from "@tanstack/react-query";

// token เก็บไว้ในเบราว์เซอร์ ปิดเว็บแล้วเปิดใหม่ยังล็อกอินอยู่
export const getToken = () => localStorage.getItem("token");
export const setToken = (token) => localStorage.setItem("token", token);
export const removeToken = () => localStorage.removeItem("token");

// แปลงข้อผิดพลาดของช่องกรอกหนึ่งช่องจาก backend เป็นภาษาไทย
function validationMessage({ type, ctx = {} }) {
  const messages = {
    missing: "กรอกข้อมูลไม่ครบ",
    greater_than: `ต้องมากกว่า ${ctx.gt}`,
    greater_than_equal: `ต้องไม่น้อยกว่า ${ctx.ge}`,
    less_than_equal: `ต้องไม่เกิน ${ctx.le}`,
    string_too_short: "ข้อความสั้นเกินไป",
    string_too_long: "ข้อความยาวเกินไป",
  };
  return messages[type] ?? "รูปแบบข้อมูลไม่ถูกต้อง";
}

// รวมข้อผิดพลาดจาก backend เป็นข้อความเดียวไว้โชว์
function toErrorMessage(data) {
  const d = data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return "ข้อมูลไม่ถูกต้อง: " + [...new Set(d.map(validationMessage))].join(", ");
  return "เกิดข้อผิดพลาด กรุณาลองใหม่";
}

// เรียก backend พร้อมแนบ token ถ้า token หมดอายุพากลับหน้าเข้าสู่ระบบ
export async function api(path, { method = "GET", body } = {}) {
  const token = getToken();
  const response = await fetch(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    throw new Error("ติดต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่");
  });
  if (response.status === 401 && path !== "/auth/login") {
    removeToken();
    location.assign("/login");
  }
  if (!response.ok) throw new Error(toErrorMessage(await response.json().catch(() => null)));
  return response.status === 204 ? null : response.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // เอา queryKey มาต่อเป็น URL ให้เอง เช่น ["products", 5, "movements"] คือ GET /api/products/5/movements
      queryFn: ({ queryKey }) => api("/" + queryKey.join("/")),
      retry: false, // backend ตอบ 404 หรือ 403 ลองซ้ำก็ได้ผลเดิม
    },
  },
});

// ตัวเลขจาก backend เช่น "100.00" ให้ช่องกรอกโชว์แค่ 100 (formatMoney ใส่จุลภาคให้ ซึ่งเอาไปพิมพ์ต่อในช่องไม่ได้)
export const plainNumber = (v) => (v === null || v === undefined || v === "" ? "" : String(Number(v)));

// เงิน 2 ตำแหน่งมีจุลภาค เช่น 1,234.50
export const formatMoney = (v) =>
  Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// VAT ที่บวกบนยอดก่อน VAT ปัดเป็นสตางค์ ใช้โชว์ระหว่างกรอก ยอดจริง backend คิดเอง
export const vatOf = (amount, rate) => Math.round(Number(amount) * Number(rate)) / 100;

// จำนวนแบบไม่มีศูนย์ท้าย เช่น 1.5
export const formatQty = (v) => Number(v).toLocaleString("th-TH", { maximumFractionDigits: 2 });

// วันที่แบบไทย ตามเวลาไทย ปีเป็น ค.ศ.
export const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString("th-TH-u-ca-gregory", { timeZone: "Asia/Bangkok", dateStyle: "medium" }) : "-";

// เลขเอกสารแบบเดียวกับ backend เช่น docNo("LOT", 12) ได้ LOT-00012
export const docNo = (prefix, id) => `${prefix}-${String(id).padStart(5, "0")}`;
