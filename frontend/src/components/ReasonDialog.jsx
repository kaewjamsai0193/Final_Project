import Modal from "./Modal";

// ป๊อปอัพยืนยันที่ต้องใส่เหตุผล ฟอร์มกับคำสั่งบันทึกส่งมาจากหน้าที่เรียก
export default function ReasonDialog({ title, onClose, onSubmit, register, mutation, danger = false, children }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      onSubmit={onSubmit}
      footer={
        <>
          {mutation.error && (
            <p role="alert" className="field-error mb-2">
              {mutation.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              ยกเลิก
            </button>
            <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} disabled={mutation.isPending}>
              {mutation.isPending ? "กำลังบันทึก…" : "ยืนยัน"}
            </button>
          </div>
        </>
      }
    >
      {children}
      <label className="block">
        <span className="label">เหตุผล</span>
        <textarea className="input" rows={3} required {...register("reason")} />
      </label>
    </Modal>
  );
}