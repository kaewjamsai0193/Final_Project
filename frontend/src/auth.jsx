import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, queryClient, setToken, removeToken } from "./api";

const AuthContext = createContext(null);

export const ROLE_NAME = { admin: "เจ้าของอู่", employee: "พนักงาน", mechanic: "ช่าง" };

// จำว่าใครล็อกอินอยู่ให้ทุกหน้าใช้ ตอนเปิดเว็บถาม backend ด้วย token ที่มี
// user: undefined = ยังถามไม่เสร็จ, null = ยังไม่ล็อกอิน
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    api("/auth/me")
      .then((user) => setUser(user))
      .catch(() => setUser(null));
  }, []);

  // เข้าสู่ระบบ เก็บ token แล้วจำว่าใครล็อกอิน
  const login = async (username, password) => {
    const response = await api("/auth/login", { method: "POST", body: { username, password } });
    setToken(response.access_token);
    setUser(response.user);
  };

  // ออกจากระบบ ล้างข้อมูลที่โหลดไว้ทั้งหมด กันคนถัดไปเห็นของค้าง เช่นต้นทุนที่เจ้าของอู่เห็นคนเดียว
  const logout = () => {
    removeToken();
    queryClient.clear();
    setUser(null);
  };
  return <AuthContext.Provider value={{ user, setUser, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);