import { ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";

export default function Topbar() {
  const { user, logout } = useAuth();
  const { companies, activeCompanyId, activateCompany } = useCompany();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-700">
            {user?.role || "USER"}
          </div>
          <div className="text-sm text-slate-500">Secure multi-company accounting workspace</div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <span className="text-slate-500">Company</span>
            <select
              value={activeCompanyId || ""}
              onChange={(event) => activateCompany(Number(event.target.value))}
              className="bg-transparent outline-none"
            >
              <option value="" disabled>
                Select
              </option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </label>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {user?.name?.slice(0, 2)?.toUpperCase() || "SA"}
            </div>
            <div>
              <div className="font-medium text-slate-900">{user?.name}</div>
              <div className="text-xs text-slate-500">{user?.email}</div>
            </div>
            <button type="button" onClick={logout} className="ml-2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
