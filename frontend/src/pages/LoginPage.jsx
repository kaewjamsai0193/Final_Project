import { useMutation } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import { useForm } from "react-hook-form";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth";
import Field from "../components/Field";

// หน้าเข้าสู่ระบบ ถ้าล็อกอินอยู่แล้วพากลับหน้าแรก
export default function LoginPage() {
  const { user, login } = useAuth();
  const { register, handleSubmit } = useForm({ defaultValues: { username: "", password: "" } });
  // ส่งชื่อผู้ใช้กับรหัสไปเข้าสู่ระบบ ผิดก็โชว์ข้อความ
  const signIn = useMutation({ mutationFn: ({ username, password }) => login(username, password) });
  if (user) return <Navigate to="/" replace />;

  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-accent text-white">
            <Wrench size={30} />
          </div>
          <h1 className="text-2xl font-semibold">อู่ซ่อมรถ</h1>
          <p className="text-muted">เข้าสู่ระบบเพื่อเริ่มงาน</p>
        </div>
        <form onSubmit={handleSubmit((form) => signIn.mutate(form))} className="card space-y-4 p-6">
          <Field label="ชื่อผู้ใช้" autoComplete="username" autoCapitalize="none" required {...register("username")} />
          <Field
            label="รหัสผ่าน"
            type="password"
            autoComplete="current-password"
            required
            {...register("password")}
          />
          {signIn.error && (
            <p role="alert" className="field-error">
              {signIn.error.message}
            </p>
          )}
          <button className="btn btn-primary w-full" disabled={signIn.isPending}>
            {signIn.isPending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </main>
  );
}