import { useNavigate, useOutletContext } from "react-router-dom";
import ProductFormDialog from "../../components/ProductFormDialog";

const EMPTY_PRODUCT = { code: "", name: "", unit: "", sale_price: "", min_stock: "0", is_active: true };

// ป๊อปอัพเพิ่มสินค้า เปิดทับหน้ารายการ บันทึกแล้วไปหน้าสินค้าตัวใหม่
export default function ProductFormPage() {
  const { close } = useOutletContext();
  const navigate = useNavigate();
  return <ProductFormDialog initial={EMPTY_PRODUCT} onClose={close} onSaved={(p) => navigate(`/stock/${p.id}`)} />;
}