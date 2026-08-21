import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CompaniesPage from "./pages/CompaniesPage";
import LedgersPage from "./pages/LedgersPage";
import VouchersPage from "./pages/VouchersPage";
import InvoicesPage from "./pages/InvoicesPage";
import InventoryPage from "./pages/InventoryPage";
import GstPage from "./pages/GstPage";
import ReportsPage from "./pages/ReportsPage";
import UsersPage from "./pages/UsersPage";
import BackupPage from "./pages/BackupPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="ledgers" element={<LedgersPage />} />
        <Route path="vouchers" element={<VouchersPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="gst" element={<GstPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="backup" element={<BackupPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
