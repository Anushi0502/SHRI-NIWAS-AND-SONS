import { useEffect, useState } from "react";
import { BarChart, Bar, CartesianGrid, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, PieChart, Pie, Cell } from "recharts";
import { resources } from "../api/resources";
import { useCompany } from "../context/CompanyContext";
import { formatMoney, formatDate } from "../utils/format";
import StatCard from "../components/StatCard";
import ChartPanel from "../components/ChartPanel";
import DataTable from "../components/DataTable";
import PageHeader from "../components/PageHeader";

const PIE_COLORS = ["#16a67c", "#0f172a", "#7c3aed", "#f59e0b", "#0ea5e9"];

export default function DashboardPage() {
  const { activeCompany } = useCompany();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!activeCompany) {
        setDashboard(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await resources.dashboard();
        if (mounted) setDashboard(data);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [activeCompany?.id]);

  if (!activeCompany) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-soft">Select an active company to view the dashboard.</div>;
  }

  if (loading || !dashboard) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-soft">Loading dashboard...</div>;
  }

  const pieData = [
    { name: "Sales", value: dashboard.totalSalesPaisa / 100 },
    { name: "Purchases", value: dashboard.totalPurchasesPaisa / 100 },
    { name: "Sales Tax", value: dashboard.gstPayablePaisa / 100 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={activeCompany ? `Active company: ${activeCompany.name}` : "Select a company to begin."}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Sales" value={formatMoney(dashboard.totalSalesPaisa)} tone="accent" />
        <StatCard label="Total Purchases" value={formatMoney(dashboard.totalPurchasesPaisa)} />
        <StatCard label="Cash Balance" value={formatMoney(dashboard.cashBalancePaisa)} />
        <StatCard label="Bank Balance" value={formatMoney(dashboard.bankBalancePaisa)} />
        <StatCard label="Receivables" value={formatMoney(dashboard.receivablesPaisa)} />
        <StatCard label="Payables" value={formatMoney(dashboard.payablesPaisa)} />
        <StatCard label="Sales Tax Due" value={formatMoney(dashboard.gstPayablePaisa)} tone="warning" />
        <StatCard label="Net Profit" value={formatMoney(dashboard.netProfitPaisa)} tone={dashboard.netProfitPaisa >= 0 ? "accent" : "danger"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <ChartPanel title="Monthly Sales vs Purchase" subtitle="Current financial year">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboard.monthlySalesPurchases}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip formatter={(value) => formatMoney(Number(value) * 100)} />
                <Legend />
                <Line type="monotone" dataKey="salesPaisa" name="Sales" stroke="#16a67c" strokeWidth={3} />
                <Line type="monotone" dataKey="purchasePaisa" name="Purchases" stroke="#0f172a" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel title="Tax and Activity Mix" subtitle="Recent business composition">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={96} paddingAngle={4}>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatMoney(Number(value) * 100)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Low Stock Items" subtitle="Needs replenishment">
          <DataTable
            columns={[
              { key: "name", label: "Item" },
              { key: "sku", label: "SKU" },
              { key: "currentQty", label: "Current Qty" },
              { key: "lowStockLevelQty", label: "Reorder Level" },
            ]}
            rows={dashboard.lowStockItems.slice(0, 6)}
            emptyText="No low stock items."
          />
        </ChartPanel>

        <ChartPanel title="Recent Vouchers" subtitle="Latest posted entries">
          <DataTable
            columns={[
              { key: "voucherDate", label: "Date", type: "date" },
              { key: "voucherNo", label: "No" },
              { key: "voucherType", label: "Type" },
              { key: "totalDebitPaisa", label: "Debit", type: "money" },
              { key: "totalCreditPaisa", label: "Credit", type: "money" },
            ]}
            rows={dashboard.recentVouchers}
            emptyText="No recent vouchers."
          />
        </ChartPanel>
      </div>
    </div>
  );
}
