import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, Outlet } from "react-router-dom";
import "./index.css";
import { queryClient } from "./api";
import { AuthProvider, useAuth } from "./auth";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AppLayout from "./components/AppLayout";
import SettingsPage from "./pages/settings/SettingsPage";
import UserFormPage from "./pages/users/UserFormPage";
import UserListPage from "./pages/users/UserListPage";
import ProductDetailPage from "./pages/products/ProductDetailPage";
import ProductFormPage from "./pages/products/ProductFormPage";
import ProductListPage from "./pages/products/ProductListPage";
import GoodsReceiptDetailPage from "./pages/goods-receipts/GoodsReceiptDetailPage";
import GoodsReceiptFormPage from "./pages/goods-receipts/GoodsReceiptFormPage";
import GoodsReceiptListPage from "./pages/goods-receipts/GoodsReceiptListPage";
import PurchaseOrderDetailPage from "./pages/purchase-orders/PurchaseOrderDetailPage";
import PurchaseOrderFormPage from "./pages/purchase-orders/PurchaseOrderFormPage";
import PurchaseOrderListPage from "./pages/purchase-orders/PurchaseOrderListPage";
import PurchaseOrderPrintPage from "./pages/purchase-orders/PurchaseOrderPrintPage";

const ADMIN = ["admin"];
const STAFF = ["admin", "employee"];

// ด่านกันหน้า: ระหว่างเช็คว่าใครล็อกอินยังไม่โชว์อะไร, ยังไม่ล็อกอินพาไปหน้าเข้าสู่ระบบ, บทบาทไม่ตรงพากลับหน้าแรก
function Guard({ roles, children }) {
  const { user } = useAuth();
  if (user === undefined) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/print/po/:id"
            element={
              <Guard roles={ADMIN}>
                <PurchaseOrderPrintPage />
              </Guard>
            }
          />
          <Route
            element={
              <Guard>
                <AppLayout />
              </Guard>
            }
          >
            <Route index element={<Navigate to="/stock" replace />} />
            <Route path="stock" element={<ProductListPage />}>
              <Route
                path="new"
                element={
                  <Guard roles={STAFF}>
                    <ProductFormPage />
                  </Guard>
                }
              />
            </Route>
            <Route path="stock/:id" element={<ProductDetailPage />} />
            <Route
              element={
                <Guard roles={ADMIN}>
                  <Outlet />
                </Guard>
              }
            >
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/users" element={<UserListPage />}>
                <Route path="new" element={<UserFormPage />} />
                <Route path=":id" element={<UserFormPage />} />
              </Route>
            </Route>
            <Route
              element={
                <Guard roles={STAFF}>
                  <Outlet />
                </Guard>
              }
            >
              <Route path="purchase-orders" element={<PurchaseOrderListPage />}>
                <Route
                  path="new"
                  element={
                    <Guard roles={ADMIN}>
                      <PurchaseOrderFormPage />
                    </Guard>
                  }
                />
              </Route>
              <Route path="purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
              <Route path="goods-receipts" element={<GoodsReceiptListPage />}>
                <Route path="new" element={<GoodsReceiptFormPage />} />
              </Route>
              <Route path="goods-receipts/:id" element={<GoodsReceiptDetailPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>,
);
