import { NavLink } from "react-router-dom";
import {
  BookOpenText,
  Boxes,
  Building2,
  Database,
  FileBarChart,
  LayoutDashboard,
  Landmark,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BrandMark from "./BrandMark";

export const navSections = [
  { label: "Workspace", items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Masters",
    items: [
      { to: "/companies", label: "Companies", icon: Building2 },
      { to: "/ledgers", label: "Ledgers", icon: BookOpenText },
      { to: "/inventory", label: "Inventory", icon: Boxes },
      { to: "/gst", label: "Tax Settings", icon: ShieldCheck },
    ],
  },
  {
    label: "Transactions",
    items: [
      { to: "/vouchers", label: "Vouchers", icon: Landmark },
      { to: "/invoices", label: "Invoices", icon: ReceiptText },
      { to: "/reports", label: "Reports", icon: FileBarChart },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/users", label: "Users", icon: Users },
      { to: "/backup", label: "Backup", icon: Database },
      { to: "/settings", label: "Settings", icon: Settings2 },
    ],
  },
];

function NavItems({ onNavigate }) {
  const { hasRole } = useAuth();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-5">
      {navSections.map((section) => (
        <div key={section.label} className="mb-6">
          <div className="px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{section.label}</div>
          <div className="mt-2 space-y-1">
            {section.items
              .filter((item) => (item.to !== "/users" && item.to !== "/backup") || hasRole("ADMIN"))
              .map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={onNavigate}
                    className={({ isActive }) => `sidebar-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${isActive ? "sidebar-nav-link--active bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
                  >
                    <Icon className="h-[17px] w-[17px]" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarContent({ onClose }) {
  return (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <BrandMark inverse />
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
          Local workspace ready
        </div>
      </div>
      <NavItems onNavigate={onClose} />
      <div className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-slate-500">Clear books. Practical decisions. Built for the GCS team.</div>
    </>
  );
}

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  return (
    <>
      <aside className="hidden w-[276px] shrink-0 flex-col bg-[#132a2b] text-slate-100 lg:flex">
        <SidebarContent />
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-[#102526]/55 lg:hidden" onClick={onClose}>
          <aside className="flex h-full w-[min(86vw,340px)] flex-col bg-[#132a2b] text-slate-100 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <BrandMark inverse compact />
              <button type="button" onClick={onClose} aria-label="Close navigation" className="rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent onClose={onClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
