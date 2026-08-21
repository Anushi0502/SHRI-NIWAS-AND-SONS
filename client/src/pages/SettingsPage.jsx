import { useAuth } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import PageHeader from "../components/PageHeader";
import { brand } from "../brand";

export default function SettingsPage() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Session, company, and GCS workspace details." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="surface-card rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-slate-950">Current User</h3>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <div>Name: {user?.name}</div>
            <div>Email: {user?.email}</div>
            <div>Role: {user?.role}</div>
          </div>
        </div>
        <div className="surface-card rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-slate-950">Active Company</h3>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <div>Name: {activeCompany?.name || "None selected"}</div>
            <div>State: {activeCompany?.state || "-"}</div>
            <div>Tax ID: {activeCompany?.gstin || "-"}</div>
          </div>
        </div>
        <div className="surface-card rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-slate-950">GCS Workspace</h3>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <div>{brand.legalName}</div>
            <div>{brand.tagline}</div>
            <a className="font-semibold text-accent-700 hover:text-accent-900" href={brand.websiteUrl} target="_blank" rel="noreferrer">Visit gcsrvllc.com</a>
            <div className="pt-2 text-xs text-slate-500">{brand.headOffice}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
