import path from "node:path";
import fs from "node:fs/promises";
import { asyncHandler } from "../utils/asyncHandler.js";
import { reportExportParamsSchema, reportParamsSchema } from "../validators/reportValidators.js";
import {
  bankBook,
  balanceSheet,
  cashBook,
  customerStatement,
  dayBook,
  gstSummary,
  outstandingPayables,
  outstandingReceivables,
  purchaseRegister,
  profitAndLoss,
  salesRegister,
  supplierStatement,
  trialBalance,
  ledgerReport,
} from "../services/reportService.js";
import { exportTableToExcel, exportTableToPdf } from "../services/exportService.js";
import { getReportDefinition } from "../reports/reportBuilders.js";
import { AppError } from "../utils/appError.js";

function parseDateRange(query) {
  const startDate = query.startDate || query.asOn || query.endDate;
  const endDate = query.endDate || query.asOn || query.startDate;
  if (!startDate || !endDate) {
    throw new AppError("Date range is required", 400);
  }
  return { startDate, endDate };
}

async function resolveReport(reportName, companyId, query) {
  switch (reportName) {
    case "day-book":
      return dayBook(companyId, query);
    case "ledger-report":
      return ledgerReport(companyId, Number(query.ledgerId), query.startDate, query.endDate);
    case "trial-balance":
      return trialBalance(companyId, query.asOn || query.endDate || query.startDate);
    case "profit-loss":
      return profitAndLoss(companyId, query.startDate, query.endDate);
    case "balance-sheet":
      return balanceSheet(companyId, query.asOn || query.endDate || query.startDate);
    case "cash-book":
      return cashBook(companyId, query.startDate, query.endDate);
    case "bank-book":
      return bankBook(companyId, query.startDate, query.endDate);
    case "sales-register":
      return salesRegister(companyId, query.startDate, query.endDate);
    case "purchase-register":
      return purchaseRegister(companyId, query.startDate, query.endDate);
    case "receivables":
      return outstandingReceivables(companyId, query.asOn || query.endDate || query.startDate);
    case "payables":
      return outstandingPayables(companyId, query.asOn || query.endDate || query.startDate);
    case "customer-statement":
      return customerStatement(companyId, Number(query.ledgerId), query.startDate, query.endDate);
    case "supplier-statement":
      return supplierStatement(companyId, Number(query.ledgerId), query.startDate, query.endDate);
    case "gst-summary":
      return gstSummary(companyId, query.startDate, query.endDate);
    case "gstr1":
      return gstSummary(companyId, query.startDate, query.endDate);
    case "gstr3b":
      return (await gstSummary(companyId, query.startDate, query.endDate)).gstr3b;
    case "hsn-summary":
      return (await gstSummary(companyId, query.startDate, query.endDate)).hsnSummary;
    case "b2b-sales":
      return (await gstSummary(companyId, query.startDate, query.endDate)).b2bSales;
    case "b2c-sales":
      return (await gstSummary(companyId, query.startDate, query.endDate)).b2cSales;
    case "nil-rated":
      return (await gstSummary(companyId, query.startDate, query.endDate)).nilRatedSupply;
    case "exempt":
      return (await gstSummary(companyId, query.startDate, query.endDate)).exemptSupply;
    case "reverse-charge":
      return (await gstSummary(companyId, query.startDate, query.endDate)).reverseCharge;
    default:
      throw new AppError(`Unsupported report: ${reportName}`, 404);
  }
}

export const getReportController = asyncHandler(async (req, res) => {
  const reportName = req.params.reportName;
  const data = await resolveReport(reportName, req.companyId, req.validated);
  res.json({ reportName, data });
});

export const exportReportController = asyncHandler(async (req, res) => {
  const reportName = req.params.reportName;
  const format = req.params.format;
  const data = await resolveReport(reportName, req.companyId, req.validated);
  const definition = getReportDefinition(reportName, data);
  const exportsDir = path.resolve(process.cwd(), "exports");
  await fs.mkdir(exportsDir, { recursive: true });
  const filePath = path.join(exportsDir, `${reportName}-${Date.now()}.${format === "pdf" ? "pdf" : "xlsx"}`);

  if (format === "pdf") {
    await exportTableToPdf(filePath, definition.title, definition.headers, definition.rows);
    res.download(filePath, path.basename(filePath));
    return;
  }

  await exportTableToExcel(filePath, definition.title, definition.headers, definition.rows);
  res.download(filePath, path.basename(filePath));
});
