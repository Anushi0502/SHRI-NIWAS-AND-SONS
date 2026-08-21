import { useAuth } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import PageHeader from "../components/PageHeader";

export default function SettingsPage() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Session and workspace details." />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-950">Current User</h3>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <div>Name: {user?.name}</div>
            <div>Email: {user?.email}</div>
            <div>Role: {user?.role}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-950">Active Company</h3>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <div>Name: {activeCompany?.name || "None selected"}</div>
            <div>State: {activeCompany?.state || "-"}</div>
            <div>GSTIN: {activeCompany?.gstin || "-"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
