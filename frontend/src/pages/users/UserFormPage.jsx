import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useOutletContext, useParams } from "react-router-dom";
import { api } from "../../api";
import { ROLE_NAME, useAuth } from "../../auth";
import Field from "../../components/Field";
import Modal from "../../components/Modal";

const EMPTY = { username: "", full_name: "", email: "", role: "employee", password: "" };

// ป๊อปอัพเพิ่มหรือแก้ผู้ใช้ มี id ใน URL คือแก้
export default function UserFormPage() {
  const { id } = useParams();
  const { close } = useOutletContext();
  const { data: users } = useQuery({ queryKey: ["users"] });
  const current = id && users?.find((u) => String(u.id) === id);
  if (id && !current) return <Modal title={users ? "ไม่พบผู้ใช้" : "กำลังโหลด…"} onClose={close} />;
  return (
    <UserForm
      key={id ?? "new"}
      initial={current ? { ...current, email: current.email ?? "", password: "" } : EMPTY}
      close={close}
    />
  );
}

// ฟอร์มผู้ใช้ ตอนแก้ช่องรหัสผ่านซ่อนไว้จนกดเปลี่ยน
function UserForm({ initial, close }) {
  const isEdit = !!initial.id;
  const [changingPassword, setChangingPassword] = useState(false);
  const { user: me, setUser } = useAuth();
  const queryClient = useQueryClient();
  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: ["users"] });
  const { register, handleSubmit, watch } = useForm({ defaultValues: initial });
  const isAdmin = watch("role") === "admin";

  const save = useMutation({
    mutationFn: (form) =>
      isEdit
        ? api(`/users/${initial.id}`, {
            method: "PATCH",
            body: {
              full_name: form.full_name,
              email: form.email || null,
              role: form.role,
              is_active: form.is_active,
              password: form.password || null,
            },
          })
        : api("/users", { method: "POST", body: { ...form, email: form.email || null } }),
    onSuccess: (saved) => {
      if (saved.id === me.id) setUser(saved); // แก้บัญชีตัวเอง ชื่อในแถบข้างจะเปลี่ยนตาม
      refreshUsers();
      close();
    },
  });

  return (
    <Modal
      title={isEdit ? `แก้ไข ${initial.username}` : "เพิ่มผู้ใช้"}
      onClose={close}
      onSubmit={handleSubmit((form) => save.mutate(form))}
      footer={
        <>
          {save.error && (
            <p role="alert" className="field-error mb-2">
              {save.error.message}
            </p>
          )}
          <button className="btn btn-primary w-full" disabled={save.isPending}>
            บันทึก
          </button>
        </>
      }
    >
      <Field
        label="ชื่อผู้ใช้ (อังกฤษ/ตัวเลข)"
        required
        disabled={isEdit}
        autoCapitalize="none"
        autoComplete="off"
        {...register("username")}
      />
      <Field label="ชื่อ-นามสกุล" required {...register("full_name")} />
      <label className="block">
        <span className="label">บทบาท</span>
        <select className="input" {...register("role")}>
          {Object.entries(ROLE_NAME).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <Field
        label="อีเมล"
        hint={
          isAdmin
            ? "เจ้าของอู่ต้องมี ไว้รีเซ็ตรหัสผ่านตอนลืม"
            : "ไว้รีเซ็ตรหัสผ่านเองตอนลืม ไม่มีเว้นว่างได้ เจ้าของอู่รีเซ็ตให้แทน"
        }
        type="email"
        required={isAdmin}
        autoCapitalize="none"
        autoComplete="off"
        {...register("email")}
      />
      {isEdit && !changingPassword && (
        <button type="button" className="btn btn-secondary" onClick={() => setChangingPassword(true)}>
          เปลี่ยนรหัสผ่าน
        </button>
      )}

      {(!isEdit || changingPassword) && (
        <Field
          label={isEdit ? "รหัสผ่านใหม่" : "รหัสผ่าน"}
          hint="อย่างน้อย 6 ตัว"
          type="password"
          minLength={6}
          required
          autoComplete="new-password"
          {...register("password")}
        />
      )}

      {isEdit && initial.id !== me.id && (
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-line p-3">
          <span>
            เปิดใช้งานบัญชี
            <span className="field-hint mt-0">ปิดแล้วเข้าสู่ระบบไม่ได้</span>
          </span>
          <input type="checkbox" role="switch" className="switch" {...register("is_active")} />
        </label>
      )}
    </Modal>
  );
}
