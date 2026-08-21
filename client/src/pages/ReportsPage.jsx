import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ChartPanel from "../components/ChartPanel";
import DataTable from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { resources } from "../api/resources";
import { useCompany } from "../context/CompanyContext";
import { downloadBlob } from "../utils/download";
import { formatDateInput, formatMoney } from "../utils/format";

const reportCatalog = [
  { value: "day-book", label: "Day Book", mode: "range", description: "Voucher activity for a date range." },
  { value: "ledger-report", label: "Ledger Report", mode: "ledger-range", description: "Single ledger statement." },
  { value: "trial-balance", label: "Trial Balance", mode: "asOn", description: "Ledger balances as of a date." },
  { value: "profit-loss", label: "Profit & Loss", mode: "range", description: "Income and expense view." },
  { value: "balance-sheet", label: "Balance Sheet", mode: "asOn", description: "Assets, liabilities, and capital." },
  { value: "cash-book", label: "Cash Book", mode: "range", description: "Cash ledger movements." },
  { value: "bank-book", label: "Bank Book", mode: "range", description: "Bank ledger movements." },
  { value: "sales-register", label: "Sales Register", mode: "range", description: "Sales invoice register." },
  { value: "purchase-register", label: "Purchase Register", mode: "range", description: "Purchase invoice register." },
  { value: "receivables", label: "Outstanding Receivables", mode: "asOn", description: "Customer dues as of a date." },
  { value: "payables", label: "Outstanding Payables", mode: "asOn", description: "Supplier dues as of a date." },
  { value: "customer-statement", label: "Customer Statement", mode: "ledger-range", description: "Ledger statement for a customer." },
  { value: "supplier-statement", label: "Supplier Statement", mode: "ledger-range", description: "Ledger statement for a supplier." },
  { value: "gst-summary", label: "Sales Tax Summary", mode: "range", description: "Aggregate sales tax inputs and outputs." },
  { value: "gstr1", label: "Sales Tax Register", mode: "range", description: "Sales-oriented tax summary." },
  { value: "gstr3b", label: "Tax Payment Snapshot", mode: "range", description: "Summary for tax payment planning." },
  { value: "hsn-summary", label: "Tax Code Summary", mode: "range", description: "Taxable turnover by product tax code." },
  { value: "b2b-sales", label: "B2B Sales", mode: "range", description: "Business-to-business invoices." },
  { value: "b2c-sales", label: "B2C Sales", mode: "range", description: "Business-to-consumer invoices." },
  { value: "nil-rated", label: "Nil-rated Supply", mode: "range", description: "Zero-tax sales." },
  { value: "exempt", label: "Exempt Supply", mode: "range", description: "Exempt turnover." },
  { value: "reverse-charge", label: "Reverse Charge", mode: "range", description: "Purchase invoices with reverse charge." },
];

function currencySummary(value) {
  return formatMoney(Number(value || 0));
}

function invoiceRows(invoices) {
  return (Array.isArray(invoices) ? invoices : []).map((invoice) => ({
    invoiceDate: invoice.invoiceDate,
    invoiceNo: invoice.invoiceNo,
    party: invoice.partyLedger?.name || "",
    taxablePaisa: invoice.taxablePaisa,
    taxPaisa: invoice.cgstPaisa + invoice.sgstPaisa + invoice.igstPaisa + invoice.cessPaisa,
    grandTotalPaisa: invoice.grandTotalPaisa,
    invoiceType: invoice.invoiceType,
  }));
}

function reportParams(meta, filters) {
  if (meta.mode === "ledger-range") {
    return {
      ledgerId: Number(filters.ledgerId),
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
  }

  if (meta.mode === "asOn") {
    return { asOn: filters.asOn };
  }

  return {
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
}

export default function ReportsPage() {
  const { activeCompany } = useCompany();
  const [selectedReport, setSelectedReport] = useState("day-book");
  const [reportData, setReportData] = useState(null);
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtersReady, setFiltersReady] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    asOn: "",
    ledgerId: "",
  });

  const selectedMeta = useMemo(
    () => reportCatalog.find((entry) => entry.value === selectedReport) || reportCatalog[0],
    [selectedReport],
  );

  useEffect(() => {
    if (!activeCompany) {
      setFiltersReady(false);
      return;
    }
    const startDate = formatDateInput(activeCompany.financialYearStart);
    const endDate = formatDateInput(activeCompany.financialYearEnd);
    setFilters((current) => ({
      ...current,
      startDate,
      endDate,
      asOn: endDate,
    }));
    setFiltersReady(true);
  }, [activeCompany?.id]);

  useEffect(() => {
    let mounted = true;
    async function loadLedgers() {
      if (!activeCompany) {
        setLedgers([]);
        return;
      }
      try {
        const data = await resources.ledgers.list();
        if (mounted) {
          setLedgers(data);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to load ledgers for reports");
      }
    }
    loadLedgers();
    return () => {
      mounted = false;
    };
  }, [activeCompany?.id]);

  useEffect(() => {
    if (!activeCompany) {
      setReportData(null);
      return;
    }
    if (!filtersReady) return;
    if (selectedMeta.mode === "ledger-range" && !filters.ledgerId) return;
    void runReport();
  }, [selectedReport, activeCompany?.id, filtersReady, filters.ledgerId]);

  useEffect(() => {
    if (selectedMeta.mode !== "ledger-range" || filters.ledgerId || !ledgers.length) return;
    setFilters((current) => ({ ...current, ledgerId: String(ledgers[0].id) }));
  }, [selectedMeta.mode, ledgers, filters.ledgerId]);

  async function runReport() {
    if (!activeCompany) return;
    if (selectedMeta.mode === "ledger-range" && !filters.ledgerId) {
      toast.error("Select a ledger first");
      return;
    }

    setLoading(true);
    try {
      const data = await resources.reports.get(selectedReport, reportParams(selectedMeta, filters));
      setReportData(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load report");
    } finally {
      setLoading(false);
    }
  }

  async function exportReport(format) {
    try {
      const response = await resources.reports.export(selectedReport, format, reportParams(selectedMeta, filters));
      await downloadBlob(response, `${selectedReport}.${format === "excel" ? "xlsx" : "pdf"}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to export report");
    }
  }

  function renderTables() {
    if (!reportData) return null;

    if (selectedReport === "day-book") {
      return (
        <DataTable
          columns={[
            { key: "voucherDate", label: "Date" },
            { key: "voucherNo", label: "No" },
            { key: "voucherType", label: "Type" },
            { key: "narration", label: "Narration" },
            { key: "totalDebitPaisa", label: "Debit", type: "money" },
            { key: "totalCreditPaisa", label: "Credit", type: "money" },
          ]}
          rows={Array.isArray(reportData) ? reportData : reportData.rows || []}
          emptyText="No voucher rows."
        />
      );
    }

    if (["ledger-report", "customer-statement", "supplier-statement", "cash-book", "bank-book"].includes(selectedReport)) {
      return (
        <DataTable
          columns={[
            { key: "voucherDate", label: "Date" },
            { key: "voucherNo", label: "No" },
            { key: "voucherType", label: "Type" },
            { key: "narration", label: "Narration" },
            { key: "debitPaisa", label: "Debit", type: "money" },
            { key: "creditPaisa", label: "Credit", type: "money" },
            { key: "runningBalancePaisa", label: "Running Balance", type: "money" },
          ]}
          rows={reportData.rows || []}
          emptyText="No statement rows."
        />
      );
    }

    if (selectedReport === "trial-balance") {
      return (
        <DataTable
          columns={[
            { key: "ledgerName", label: "Ledger" },
            { key: "groupName", label: "Group" },
            { key: "balancePaisa", label: "Balance", type: "money" },
            { key: "debitPaisa", label: "Debit", type: "money" },
            { key: "creditPaisa", label: "Credit", type: "money" },
          ]}
          rows={reportData.rows || []}
          emptyText="No trial balance rows."
        />
      );
    }

    if (selectedReport === "profit-loss") {
      return (
        <DataTable
          columns={[
            { key: "ledgerName", label: "Ledger" },
            { key: "category", label: "Category" },
            { key: "amountPaisa", label: "Amount", type: "money" },
          ]}
          rows={reportData.rows || []}
          emptyText="No profit and loss rows."
        />
      );
    }

    if (selectedReport === "balance-sheet") {
      const rows = [
        ...(reportData.rows?.assets || []).map((row) => ({ ...row, section: "Assets" })),
        ...(reportData.rows?.liabilities || []).map((row) => ({ ...row, section: "Liabilities" })),
        ...(reportData.rows?.capital || []).map((row) => ({ ...row, section: "Capital" })),
      ];

      return (
        <DataTable
          columns={[
            { key: "section", label: "Section" },
            { key: "ledgerName", label: "Ledger" },
            { key: "amountPaisa", label: "Amount", type: "money" },
          ]}
          rows={rows}
          emptyText="No balance sheet rows."
        />
      );
    }

    if (["sales-register", "purchase-register", "b2b-sales", "b2c-sales", "nil-rated", "exempt", "reverse-charge"].includes(selectedReport)) {
      return (
        <DataTable
          columns={[
            { key: "invoiceDate", label: "Date" },
            { key: "invoiceNo", label: "Invoice No" },
            { key: "party", label: "Party" },
            { key: "taxablePaisa", label: "Taxable", type: "money" },
            { key: "taxPaisa", label: "Tax", type: "money" },
            { key: "grandTotalPaisa", label: "Grand Total", type: "money" },
          ]}
          rows={invoiceRows(reportData || [])}
          emptyText="No invoice rows."
        />
      );
    }

    if (["receivables", "payables"].includes(selectedReport)) {
      return (
        <DataTable
          columns={[
            { key: "ledgerName", label: "Ledger" },
            { key: "state", label: "State" },
            { key: "gstin", label: "Tax ID" },
            { key: "amountPaisa", label: "Amount", type: "money" },
          ]}
          rows={reportData.rows || []}
          emptyText="No outstanding balances."
        />
      );
    }

    if (selectedReport === "gstr3b") {
      return null;
    }

    if (selectedReport === "hsn-summary") {
      return (
        <DataTable
          columns={[
            { key: "hsnSacCode", label: "Tax Code" },
            { key: "quantity", label: "Qty" },
            { key: "taxablePaisa", label: "Taxable", type: "money" },
            { key: "cgstPaisa", label: "State Tax", type: "money" },
            { key: "sgstPaisa", label: "Local Tax", type: "money" },
            { key: "igstPaisa", label: "Other Tax", type: "money" },
            { key: "cessPaisa", label: "Additional Tax", type: "money" },
          ]}
          rows={Array.isArray(reportData) ? reportData : reportData.rows || []}
          emptyText="No tax code rows."
        />
      );
    }

    if (selectedReport === "gst-summary" || selectedReport === "gstr1") {
      return (
        <div className="space-y-6">
          <ChartPanel title="Sales Invoices" subtitle="B2B and B2C sales invoices in the selected period">
            <DataTable
              columns={[
                { key: "invoiceDate", label: "Date" },
                { key: "invoiceNo", label: "Invoice No" },
                { key: "party", label: "Party" },
                { key: "taxablePaisa", label: "Taxable", type: "money" },
                { key: "taxPaisa", label: "Tax", type: "money" },
                { key: "grandTotalPaisa", label: "Grand Total", type: "money" },
              ]}
              rows={invoiceRows(reportData.salesInvoices || [])}
              emptyText="No sales invoices."
            />
          </ChartPanel>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartPanel title="Purchase Invoices" subtitle="Purchase-side tax documents">
              <DataTable
                columns={[
                  { key: "invoiceDate", label: "Date" },
                  { key: "invoiceNo", label: "Invoice No" },
                  { key: "party", label: "Party" },
                  { key: "taxablePaisa", label: "Taxable", type: "money" },
                  { key: "taxPaisa", label: "Tax", type: "money" },
                  { key: "grandTotalPaisa", label: "Grand Total", type: "money" },
                ]}
                rows={invoiceRows(reportData.purchaseInvoices || [])}
                emptyText="No purchase invoices."
              />
            </ChartPanel>

            <ChartPanel title="Tax Code Summary" subtitle="Taxable turnover by product tax code">
              <DataTable
                columns={[
                  { key: "hsnSacCode", label: "Tax Code" },
                  { key: "quantity", label: "Qty" },
                  { key: "taxablePaisa", label: "Taxable", type: "money" },
                  { key: "cgstPaisa", label: "State Tax", type: "money" },
                  { key: "sgstPaisa", label: "Local Tax", type: "money" },
                  { key: "igstPaisa", label: "Other Tax", type: "money" },
                  { key: "cessPaisa", label: "Additional Tax", type: "money" },
                ]}
                rows={reportData.hsnSummary || []}
                emptyText="No tax code summary rows."
              />
            </ChartPanel>
          </div>
        </div>
      );
    }

    return null;
  }

  function renderSummaryCards() {
    if (!reportData) return null;

    if (selectedReport === "ledger-report" || selectedReport === "customer-statement" || selectedReport === "supplier-statement") {
      return (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Opening Balance" value={currencySummary(reportData.openingBalancePaisa)} />
          <StatCard label="Closing Balance" value={currencySummary(reportData.closingBalancePaisa)} tone="accent" />
          <StatCard label="Rows" value={String(reportData.rows?.length || 0)} />
        </div>
      );
    }

    if (selectedReport === "trial-balance") {
      return (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Debit Total" value={currencySummary(reportData.totals?.debitPaisa)} />
          <StatCard label="Credit Total" value={currencySummary(reportData.totals?.creditPaisa)} />
          <StatCard label="Difference" value={currencySummary((reportData.totals?.debitPaisa || 0) - (reportData.totals?.creditPaisa || 0))} />
        </div>
      );
    }

    if (selectedReport === "profit-loss") {
      return (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Income" value={currencySummary(reportData.totals?.incomePaisa)} tone="accent" />
          <StatCard label="Expense" value={currencySummary(reportData.totals?.expensePaisa)} />
          <StatCard label="Net Profit" value={currencySummary(reportData.totals?.netProfitPaisa)} tone="accent" />
        </div>
      );
    }

    if (selectedReport === "balance-sheet") {
      return (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Assets" value={currencySummary(reportData.totals?.assetsPaisa)} tone="accent" />
          <StatCard label="Liabilities + Capital" value={currencySummary(reportData.totals?.liabilitiesPlusCapitalPaisa)} />
          <StatCard label="Net Profit" value={currencySummary(reportData.totals?.netProfitPaisa)} tone="accent" />
        </div>
      );
    }

    if (selectedReport === "cash-book" || selectedReport === "bank-book") {
      return <StatCard label="Running Total" value={currencySummary(reportData.totalPaisa)} tone="accent" />;
    }

    if (selectedReport === "receivables" || selectedReport === "payables") {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard label="Total Outstanding" value={currencySummary(reportData.totalPaisa)} tone="warning" />
          <StatCard label="Rows" value={String(reportData.rows?.length || 0)} />
        </div>
      );
    }

    if (selectedReport === "gstr3b") {
      return (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Output Tax" value={currencySummary(reportData.outputTaxPaisa)} tone="warning" />
          <StatCard label="Input Tax" value={currencySummary(reportData.inputTaxPaisa)} tone="accent" />
          <StatCard label="Net Tax Payable" value={currencySummary(reportData.netTaxPayablePaisa)} tone="warning" />
        </div>
      );
    }

    if (selectedReport === "gst-summary" || selectedReport === "gstr1") {
      return (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Output Tax" value={currencySummary(reportData.gstr3b?.outputTaxPaisa)} tone="warning" />
          <StatCard label="Input Tax" value={currencySummary(reportData.gstr3b?.inputTaxPaisa)} tone="accent" />
          <StatCard label="Net Tax Payable" value={currencySummary(reportData.gstr3b?.netTaxPayablePaisa)} tone="warning" />
          <StatCard label="Sales Invoices" value={String(reportData.salesInvoices?.length || 0)} />
        </div>
      );
    }

    if (selectedReport === "hsn-summary") {
      return <StatCard label="Tax Code Rows" value={String(reportData.length || 0)} />;
    }

    if (["sales-register", "purchase-register", "b2b-sales", "b2c-sales", "nil-rated", "exempt", "reverse-charge"].includes(selectedReport)) {
      return <StatCard label="Rows" value={String(reportData.length || 0)} />;
    }

    return null;
  }

  if (!activeCompany) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-soft">
        Select an active company to run reports.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle={selectedMeta.description}
        actions={[
          <button
            key="run"
            type="button"
            onClick={runReport}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          >
            Run Report
          </button>,
          <button
            key="pdf"
            type="button"
            onClick={() => exportReport("pdf")}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Export PDF
          </button>,
          <button
            key="excel"
            type="button"
            onClick={() => exportReport("excel")}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Export Excel
          </button>,
        ]}
      />

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft xl:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Report</span>
          <select
            value={selectedReport}
            onChange={(event) => setSelectedReport(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {reportCatalog.map((report) => (
              <option key={report.value} value={report.value}>
                {report.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Start Date</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
            disabled={selectedMeta.mode === "asOn"}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">End / As On</span>
          <input
            type="date"
            value={selectedMeta.mode === "asOn" ? filters.asOn : filters.endDate}
            onChange={(event) =>
              setFilters((current) =>
                selectedMeta.mode === "asOn"
                  ? { ...current, asOn: event.target.value }
                  : { ...current, endDate: event.target.value },
              )
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>

        {selectedMeta.mode === "ledger-range" ? (
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Ledger</span>
            <select
              value={filters.ledgerId}
              onChange={(event) => setFilters((current) => ({ ...current, ledgerId: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select ledger</option>
              {ledgers.map((ledger) => (
                <option key={ledger.id} value={ledger.id}>
                  {ledger.name} {ledger.accountGroup ? `(${ledger.accountGroup.name})` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex items-end">
          <button
            type="button"
            onClick={runReport}
            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            {loading ? "Loading..." : "Apply"}
          </button>
        </div>
      </div>

      {reportData ? renderSummaryCards() : null}
      {reportData ? renderTables() : <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-soft">Run a report to see results.</div>}

      {selectedReport === "gst-summary" || selectedReport === "gstr1" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <ChartPanel title="Sales Returns" subtitle="Returned sales impact">
            <DataTable
              columns={[
                { key: "invoiceDate", label: "Date" },
                { key: "invoiceNo", label: "Invoice No" },
                { key: "party", label: "Party" },
                { key: "taxablePaisa", label: "Taxable", type: "money" },
                { key: "taxPaisa", label: "Tax", type: "money" },
                { key: "grandTotalPaisa", label: "Grand Total", type: "money" },
              ]}
              rows={invoiceRows(reportData.salesReturns || [])}
              emptyText="No sales returns."
            />
          </ChartPanel>

          <ChartPanel title="Special Tax Categories" subtitle="Business, consumer, zero-rated, exempt, and reverse-charge slices">
            <div className="space-y-3 text-sm text-slate-600">
              <div>B2B sales: {reportData.b2bSales?.length || 0}</div>
              <div>B2C sales: {reportData.b2cSales?.length || 0}</div>
              <div>Nil-rated: {reportData.nilRatedSupply?.length || 0}</div>
              <div>Exempt: {reportData.exemptSupply?.length || 0}</div>
              <div>Reverse charge purchases: {reportData.reverseCharge?.length || 0}</div>
            </div>
          </ChartPanel>
        </div>
      ) : null}
    </div>
  );
}
