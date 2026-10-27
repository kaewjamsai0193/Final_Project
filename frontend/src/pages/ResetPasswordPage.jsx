import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { api, ASCII_ONLY } from "../api";
import AuthShell from "../components/AuthShell";
import Field from "../components/Field";

// ลืมรหัสผ่าน: ไม่มี token ใน URL ให้กรอกอีเมลขอลิงก์, มี token (กดลิงก์มาจากอีเมล) ให้ตั้งรหัสใหม่
export default function ResetPasswordPage() {
  const token = useSearchParams()[0].get("token");
  const { register, handleSubmit } = useForm({ defaultValues: { email: "", password: "" } });
  const submit = useMutation({
    mutationFn: (form) =>
      token
        ? api("/auth/reset", { method: "POST", body: { token, password: form.password } })
        : api("/auth/forgot", { method: "POST", body: { email: form.email } }),
  });
  const backToLogin = (
    <Link to="/login" className="btn btn-ghost w-full">
      กลับไปหน้าเข้าสู่ระบบ
    </Link>
  );

  if (submit.isSuccess)
    return (
      <AuthShell subtitle={token ? "ตั้งรหัสผ่านใหม่แล้ว" : "ลืมรหัสผ่าน"}>
        <div className="card space-y-4 p-6">
          <p role="status">
            {token
              ? "เข้าสู่ระบบด้วยรหัสใหม่ได้เลย"
              : "ถ้าอีเมลนี้อยู่ในระบบ จะได้ลิงก์ตั้งรหัสใหม่ทางอีเมล ใช้ได้ภายใน 30 นาที ถ้าไม่มีอีเมลหรือไม่ได้รับ ให้ติดต่อเจ้าของอู่"}
          </p>
          {backToLogin}
        </div>
      </AuthShell>
    );

  return (
    <AuthShell subtitle={token ? "ตั้งรหัสผ่านใหม่" : "ลืมรหัสผ่าน"}>
      <form onSubmit={handleSubmit((form) => submit.mutate(form))} className="card space-y-4 p-6">
        {token ? (
          <Field
            label="รหัสผ่านใหม่"
            hint="อย่างน้อย 6 ตัว ใช้อังกฤษ ตัวเลข หรือสัญลักษณ์"
            type="password"
            minLength={6}
            {...ASCII_ONLY}
            required
            autoComplete="new-password"
            {...register("password")}
          />
        ) : (
          <Field label="อีเมล" type="email" autoComplete="email" autoCapitalize="none" required {...register("email")} />
        )}
        {submit.error && (
          <p role="alert" className="field-error">
            {submit.error.message}
          </p>
        )}
        <button className="btn btn-primary w-full" disabled={submit.isPending}>
          {token ? "บันทึกรหัสใหม่" : "ส่งลิงก์ทางอีเมล"}
        </button>
        {backToLogin}
      </form>
    </AuthShell>
  );
}
