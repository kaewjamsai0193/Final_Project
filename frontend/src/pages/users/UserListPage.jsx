import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ROLE_NAME } from "../../auth";
import ListLayout from "../../components/ListLayout";
import DataTable from "../../components/DataTable";
import SettingsTabs from "../../components/SettingsTabs";
import StatusBadge from "../../components/StatusBadge";
import UserFormPage from "./UserFormPage";

// ใช้งานอยู่หรือถูกปิด
const userStatus = (u) => (u.is_active ? "active" : "disabled");

// หน้ารายชื่อผู้ใช้ในแท็บตั้งค่า (เฉพาะเจ้าของอู่) URL มี id (หรือ new) = เปิดป๊อปอัพแก้ผู้ใช้คนนั้นทับ
export default function UserListPage() {
  const { data, error } = useQuery({ queryKey: ["users"] });
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl">
      <ListLayout title="ตั้งค่าและผู้ใช้" toolbar={<SettingsTabs />} error={error}>
        {/* ปุ่มเพิ่มอยู่ในแท็บผู้ใช้ ไม่ขึ้นไปแถวหัวที่เป็นของทั้งสองแท็บ */}
        <div className="flex justify-end">
          <Link to="/settings/users/new" className="btn btn-primary">
            <Plus size={20} />
            เพิ่มผู้ใช้
          </Link>
        </div>
        <DataTable
          items={data}
          to={(u) => `/settings/users/${u.id}`}
          empty="ยังไม่มีผู้ใช้"
          card={(u) => (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold">{u.full_name}</div>
                <div className="text-sm text-muted">
                  {u.username} · {ROLE_NAME[u.role]}
                </div>
              </div>
              <StatusBadge status={userStatus(u)} />
            </div>
          )}
          columns={[
            { label: "ชื่อผู้ใช้", render: (u) => u.username },
            { label: "ชื่อ", render: (u) => u.full_name },
            { label: "บทบาท", render: (u) => ROLE_NAME[u.role] },
            { label: "สถานะ", render: (u) => <StatusBadge status={userStatus(u)} /> },
          ]}
        />
        {id && <UserFormPage id={id} users={data} close={() => navigate("/settings/users")} />}
      </ListLayout>
    </div>
  );
}
