import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  BookOpenText,
  Landmark,
  PackageSearch,
  ReceiptText,
  FileBarChart,
  ShieldCheck,
  Boxes,
  Users,
  Settings2,
  Database,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const navSections = [
  {
    label: "Workspace",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Masters",
    items: [
      { to: "/companies", label: "Companies", icon: Building2 },
      { to: "/ledgers", label: "Ledgers", icon: BookOpenText },
      { to: "/inventory", label: "Inventory", icon: Boxes },
      { to: "/gst", label: "GST Settings", icon: ShieldCheck },
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

export default function Sidebar() {
  const { hasRole } = useAuth();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-800/80 bg-[#0b1220] text-slate-100 lg:flex lg:flex-col">
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-accent-400 to-emerald-300 shadow-lg shadow-accent-500/20" />
          <div>
            <div className="text-sm font-medium text-slate-400">Global Creative Services</div>
            <div className="text-lg font-semibold">Business Ledger Suite</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        {navSections.map((section) => (
          <div key={section.label} className="mb-6">
            <div className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {section.label}
            </div>
            <div className="mt-2 space-y-1">
              {section.items
                .filter((item) => {
                  if (item.to === "/users" || item.to === "/backup") {
                    return hasRole("ADMIN");
                  }
                  return true;
                })
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                          isActive
                            ? "bg-white/10 text-white"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`
                      }
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-6 py-4 text-xs text-slate-500">
        Original accounting workflow, not a Tally clone.
      </div>
    </aside>
  );
}
