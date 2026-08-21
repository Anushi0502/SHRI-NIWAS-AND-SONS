import { Building2, ChevronDown, LogOut, Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import BrandMark from "./BrandMark";

export default function Topbar({ onOpenMenu }) {
  const { user, logout } = useAuth();
  const { companies, activeCompanyId, activateCompany } = useCompany();

  return (
    <header className="app-topbar sticky top-0 z-20 border-b backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onOpenMenu} aria-label="Open navigation" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <BrandMark compact className="lg:hidden" />
          <div className="hidden min-w-0 sm:block">
            <div className="text-[10px] font-bold uppercase tracking-[0.23em] text-accent-700">{user?.role || "USER"} workspace</div>
            <div className="truncate text-sm text-slate-500">Practical finance operations for American small businesses</div>
          </div>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm sm:flex-none">
            <Building2 className="h-4 w-4 shrink-0 text-accent-700" />
            <select
              value={activeCompanyId || ""}
              onChange={(event) => activateCompany(Number(event.target.value))}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 outline-none focus:shadow-none sm:max-w-[230px]"
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
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </label>

          <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {user?.name?.slice(0, 2)?.toUpperCase() || "SA"}
            </div>
            <div>
              <div className="font-medium text-slate-900">{user?.name}</div>
              <div className="text-xs text-slate-500">{user?.email}</div>
            </div>
            <button type="button" onClick={logout} aria-label="Sign out" className="ml-2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <button type="button" onClick={logout} aria-label="Sign out" className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500 shadow-sm hover:text-slate-900 sm:hidden">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
