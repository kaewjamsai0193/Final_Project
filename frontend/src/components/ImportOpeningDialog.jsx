import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";
import { api } from "../api";
import Modal from "./Modal";

// หัวคอลัมน์ภาษาไทยในไฟล์ Excel กับชื่อที่ backend ใช้
const COLUMNS = [
  ["code", "รหัส"],
  ["name", "ชื่อสินค้า"],
  ["unit", "หน่วย"],
  ["qty", "จำนวน"],
  ["unit_cost", "ต้นทุนต่อหน่วย (ก่อน VAT)"],
  ["reason", "หมายเหตุ"],
];

// เทมเพลต Excel มีสินค้าที่ใช้งานอยู่ครบทุกตัว กรอกแค่จำนวนกับต้นทุน แถวที่เว้นจำนวนไว้จะข้ามไป
// โหลด SheetJS ตอนกดเท่านั้น หน้าอื่นไม่ต้องโหลดไลบรารีนี้
async function downloadTemplate(products) {
  const XLSX = await import("xlsx");
  const rows = products.filter((p) => p.is_active).map((p) => [p.code, p.name, p.unit]);
  const sheet = XLSX.utils.aoa_to_sheet([COLUMNS.map(([, th]) => th), ...rows]);
  sheet["!cols"] = [{ wch: 16 }, { wch: 45 }, { wch: 8 }, { wch: 10 }, { wch: 22 }, { wch: 20 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "สต็อกตั้งต้น");
  XLSX.writeFile(book, "เทมเพลตสต็อกตั้งต้น.xlsx");
}

// อ่านแผ่นแรกของไฟล์ Excel คืนแถวข้อมูล (ไม่รวมหัวตาราง) เป็น {code, qty, ...} ตามลำดับคอลัมน์ในเทมเพลต
async function readExcel(file) {
  const XLSX = await import("xlsx");
  const book = XLSX.read(await file.arrayBuffer());
  const sheet = book.Sheets[book.SheetNames[0]];
  const [, ...rows] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: true });
  return rows.map((row) => Object.fromEntries(COLUMNS.map(([key], i) => [key, row[i]])));
}

// ป๊อปอัพนำเข้าสต็อกตั้งต้น 1. โหลดเทมเพลต 2. กรอก 3. เลือกไฟล์แล้วนำเข้า
export default function ImportOpeningDialog({ products, onClose }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const upload = useMutation({
    mutationFn: async () => api("/stock/opening/import", { method: "POST", body: { rows: await readExcel(file) } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  return (
    <Modal
      title="นำเข้าสต็อกตั้งต้น"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {upload.isSuccess ? "ปิด" : "ยกเลิก"}
          </button>
          {!upload.isSuccess && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!file || upload.isPending}
              onClick={() => upload.mutate()}
            >
              {upload.isPending ? "กำลังนำเข้า…" : "นำเข้า"}
            </button>
          )}
        </div>
      }
    >
      <ol className="list-decimal space-y-3 pl-5">
        <li>
          <p>โหลดเทมเพลต มีรายชื่อสินค้าทุกตัวอยู่แล้ว</p>
          {products && (
            <button type="button" className="btn btn-secondary mt-2" onClick={() => downloadTemplate(products)}>
              <Download size={20} />
              โหลดเทมเพลต Excel
            </button>
          )}
        </li>
        <li>
          กรอกช่อง <b>จำนวน</b> และ <b>ต้นทุนต่อหน่วย</b> เฉพาะสินค้าที่มีของ ตัวที่ไม่มีของเว้นว่างไว้
          ช่องหมายเหตุไม่ต้องกรอกก็ได้
        </li>
        <li>
          <label className="block">
            <span className="label">เลือกไฟล์ Excel ที่กรอกแล้ว</span>
            <input
              type="file"
              accept=".xlsx"
              className="input py-2"
              onChange={(e) => {
                setFile(e.target.files[0] ?? null);
                upload.reset();
              }}
            />
          </label>
        </li>
      </ol>
      {upload.isSuccess && (
        <p role="status" className="rounded-lg bg-ok-soft p-3 font-semibold text-ok-ink">
          นำเข้าแล้ว {upload.data.imported} รายการ
        </p>
      )}
      {upload.error && (
        <p role="alert" className="field-error rounded-lg bg-danger-soft p-3 whitespace-pre-line">
          ไม่ได้นำเข้าเลย กรุณาแก้ไฟล์แล้วลองใหม่{"\n"}
          {upload.error.message}
        </p>
      )}
    </Modal>
  );
}
