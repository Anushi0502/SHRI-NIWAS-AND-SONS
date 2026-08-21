function money(value) {
  return (Number(value || 0) / 100).toFixed(2);
}

function voucherRows(vouchers) {
  return vouchers.map((voucher) => [
    voucher.voucherDate,
    voucher.voucherNo,
    voucher.voucherType,
    voucher.narration,
    money(voucher.totalDebitPaisa),
    money(voucher.totalCreditPaisa),
  ]);
}

function ledgerRows(statement) {
  return statement.rows.map((row) => [
    row.voucherDate,
    row.voucherNo,
    row.voucherType,
    row.narration,
    money(row.debitPaisa),
    money(row.creditPaisa),
    money(row.runningBalancePaisa),
  ]);
}

function trialBalanceRows(report) {
  return report.rows.map((row) => [
    row.ledgerName,
    row.groupName,
    money(row.debitPaisa),
    money(row.creditPaisa),
  ]);
}

function profitLossRows(report) {
  return report.rows.map((row) => [row.ledgerName, row.category, money(row.amountPaisa)]);
}

function balanceSheetRows(report) {
  const rows = [];
  for (const section of ["assets", "liabilities", "capital"]) {
    for (const row of report.rows[section]) {
      rows.push([section.toUpperCase(), row.ledgerName, money(row.amountPaisa)]);
    }
  }
  return rows;
}

function statementRows(report) {
  return report.rows.map((row) => [row.ledgerName, row.state || "", row.gstin || "", money(row.amountPaisa)]);
}

function salesPurchaseRows(invoices) {
  return invoices.map((invoice) => [
    invoice.invoiceDate,
    invoice.invoiceNo,
    invoice.partyLedger?.name || "",
    money(invoice.subtotalPaisa),
    money(invoice.cgstPaisa + invoice.sgstPaisa + invoice.igstPaisa + invoice.cessPaisa),
    money(invoice.grandTotalPaisa),
  ]);
}

function gstHsnRows(report) {
  return report.hsnSummary.map((row) => [
    row.hsnSacCode,
    row.quantity,
    money(row.taxablePaisa),
    money(row.cgstPaisa),
    money(row.sgstPaisa),
    money(row.igstPaisa),
    money(row.cessPaisa),
  ]);
}

function gstMetricRows(report) {
  return [
    ["Output Tax", money(report.gstr3b.outputTaxPaisa)],
    ["Input Tax", money(report.gstr3b.inputTaxPaisa)],
    ["Net Tax Payable", money(report.gstr3b.netTaxPayablePaisa)],
  ];
}

export function getReportDefinition(reportName, data) {
  switch (reportName) {
    case "day-book":
      return {
        title: "Day Book",
        headers: ["Date", "Voucher No", "Type", "Narration", "Debit", "Credit"],
        rows: voucherRows(data),
      };
    case "ledger-report":
      return {
        title: "Ledger Report",
        headers: ["Date", "Voucher No", "Type", "Narration", "Debit", "Credit", "Running Balance"],
        rows: ledgerRows(data),
      };
    case "trial-balance":
      return {
        title: "Trial Balance",
        headers: ["Ledger", "Group", "Debit", "Credit"],
        rows: trialBalanceRows(data),
      };
    case "profit-loss":
      return {
        title: "Profit and Loss",
        headers: ["Ledger", "Category", "Amount"],
        rows: profitLossRows(data),
      };
    case "balance-sheet":
      return {
        title: "Balance Sheet",
        headers: ["Section", "Ledger", "Amount"],
        rows: balanceSheetRows(data),
      };
    case "cash-book":
    case "bank-book":
      return {
        title: reportName === "cash-book" ? "Cash Book" : "Bank Book",
        headers: ["Date", "Voucher No", "Type", "Narration", "Debit", "Credit", "Running Balance"],
        rows: ledgerRows(data),
      };
    case "sales-register":
    case "purchase-register":
      return {
        title: reportName === "sales-register" ? "Sales Register" : "Purchase Register",
        headers: ["Date", "Invoice No", "Party", "Taxable", "Tax", "Grand Total"],
        rows: salesPurchaseRows(data),
      };
    case "receivables":
    case "payables":
      return {
        title: reportName === "receivables" ? "Outstanding Receivables" : "Outstanding Payables",
        headers: ["Ledger", "State", "GSTIN", "Amount"],
        rows: statementRows(data),
      };
    case "gst-summary":
      return {
        title: "GST Summary",
        headers: ["Metric", "Amount"],
        rows: gstMetricRows(data),
      };
    case "gstr1":
      return {
        title: "GSTR-1 Style Report",
        headers: ["Date", "Invoice No", "Party", "Taxable", "Tax", "Grand Total"],
        rows: salesPurchaseRows(data.salesInvoices || []),
      };
    case "gstr3b":
      return {
        title: "GSTR-3B Summary",
        headers: ["Metric", "Amount"],
        rows: gstMetricRows({ gstr3b: data }),
      };
    case "hsn-summary":
      return {
        title: "HSN/SAC Summary",
        headers: ["HSN/SAC", "Qty", "Taxable", "CGST", "SGST", "IGST", "Cess"],
        rows: gstHsnRows(data),
      };
    case "b2b-sales":
      return {
        title: "B2B Sales Report",
        headers: ["Date", "Invoice No", "Party", "Taxable", "Tax", "Grand Total"],
        rows: salesPurchaseRows(data),
      };
    case "b2c-sales":
      return {
        title: "B2C Sales Report",
        headers: ["Date", "Invoice No", "Party", "Taxable", "Tax", "Grand Total"],
        rows: salesPurchaseRows(data),
      };
    case "nil-rated":
      return {
        title: "Nil-rated Supply Report",
        headers: ["Date", "Invoice No", "Party", "Taxable", "Tax", "Grand Total"],
        rows: salesPurchaseRows(data),
      };
    case "exempt":
      return {
        title: "Exempt Supply Report",
        headers: ["Date", "Invoice No", "Party", "Taxable", "Tax", "Grand Total"],
        rows: salesPurchaseRows(data),
      };
    case "reverse-charge":
      return {
        title: "Reverse Charge Report",
        headers: ["Date", "Invoice No", "Party", "Taxable", "Tax", "Grand Total"],
        rows: salesPurchaseRows(data),
      };
    default:
      throw new Error(`Unsupported report export: ${reportName}`);
  }
}
