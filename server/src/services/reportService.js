import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { toDate, formatDate } from "../utils/dates.js";
import { lowStockItems, stockSummary } from "./inventoryService.js";

function categoryName(group) {
  return String(group?.reportCategory || "").toUpperCase();
}

function isIncomeCategory(group) {
  return ["INCOME", "DIRECT_INCOME", "INDIRECT_INCOME", "SALES_ACCOUNTS"].includes(categoryName(group));
}

function isExpenseCategory(group) {
  return ["EXPENSE", "DIRECT_EXPENSES", "INDIRECT_EXPENSES", "PURCHASE_ACCOUNTS"].includes(categoryName(group));
}

function isAssetCategory(group) {
  return ["ASSETS", "CASH_IN_HAND", "BANK_ACCOUNTS", "FIXED_ASSETS", "CURRENT_ASSETS", "STOCK_IN_HAND", "SUNDRY_DEBTORS"].includes(categoryName(group));
}

function isLiabilityCategory(group) {
  return ["LIABILITIES", "CURRENT_LIABILITIES", "SUNDRY_CREDITORS", "DUTIES_AND_TAXES"].includes(categoryName(group));
}

function isCapitalCategory(group) {
  return ["CAPITAL"].includes(categoryName(group));
}

function openingSigned(ledger) {
  const amount = Number(ledger.openingBalancePaisa || 0);
  return ledger.openingBalanceType === "Cr" ? -amount : amount;
}

async function loadLedgers(companyId) {
  return prisma.ledger.findMany({
    where: { companyId, isActive: true },
    include: { accountGroup: true },
    orderBy: { name: "asc" },
  });
}

async function balanceForLedgerBefore(ledgerId, startDate) {
  const row = await prisma.voucherEntry.aggregate({
    _sum: { debitPaisa: true, creditPaisa: true },
    where: {
      ledgerId,
      voucher: {
        isDeleted: false,
        voucherDate: { lt: toDate(startDate) },
      },
    },
  });
  return Number(row._sum.debitPaisa || 0) - Number(row._sum.creditPaisa || 0);
}

async function balanceForLedgerAsOf(ledgerId, asOn) {
  const row = await prisma.voucherEntry.aggregate({
    _sum: { debitPaisa: true, creditPaisa: true },
    where: {
      ledgerId,
      voucher: {
        isDeleted: false,
        voucherDate: { lte: toDate(asOn) },
      },
    },
  });
  return Number(row._sum.debitPaisa || 0) - Number(row._sum.creditPaisa || 0);
}

async function ledgerRowsBetween(ledgerId, startDate, endDate) {
  return prisma.voucherEntry.findMany({
    where: {
      ledgerId,
      voucher: {
        isDeleted: false,
        voucherDate: { gte: toDate(startDate), lte: toDate(endDate) },
      },
    },
    include: { voucher: true, ledger: true },
    orderBy: [{ voucher: { voucherDate: "asc" } }, { voucher: { id: "asc" } }, { sortOrder: "asc" }],
  });
}

async function ledgerRowsBefore(ledgerId, startDate) {
  return prisma.voucherEntry.findMany({
    where: {
      ledgerId,
      voucher: {
        isDeleted: false,
        voucherDate: { lt: toDate(startDate) },
      },
    },
    include: { voucher: true, ledger: true },
    orderBy: [{ voucher: { voucherDate: "asc" } }, { voucher: { id: "asc" } }, { sortOrder: "asc" }],
  });
}

async function buildLedgerStatement(companyId, ledgerId, startDate, endDate) {
  const ledger = await prisma.ledger.findFirst({
    where: { id: ledgerId, companyId, isActive: true },
    include: { accountGroup: true },
  });
  if (!ledger) throw new AppError("Ledger not found", 404);

  const openingBalancePaisa = openingSigned(ledger) + (await balanceForLedgerBefore(ledgerId, startDate));
  const entries = await ledgerRowsBetween(ledgerId, startDate, endDate);
  let running = openingBalancePaisa;

  const rows = entries.map((entry) => {
    running += Number(entry.debitPaisa || 0) - Number(entry.creditPaisa || 0);
    return {
      voucherDate: formatDate(entry.voucher.voucherDate),
      voucherNo: entry.voucher.voucherNo,
      voucherType: entry.voucher.voucherType,
      narration: entry.voucher.narration,
      debitPaisa: Number(entry.debitPaisa || 0),
      creditPaisa: Number(entry.creditPaisa || 0),
      runningBalancePaisa: running,
    };
  });

  return {
    ledger,
    openingBalancePaisa,
    closingBalancePaisa: running,
    rows,
  };
}

export async function dayBook(companyId, filters = {}) {
  const vouchers = await prisma.voucher.findMany({
    where: {
      companyId,
      isDeleted: false,
      ...(filters.startDate && filters.endDate
        ? { voucherDate: { gte: toDate(filters.startDate), lte: toDate(filters.endDate) } }
        : {}),
      ...(filters.voucherType ? { voucherType: filters.voucherType } : {}),
    },
    include: { entries: { include: { ledger: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: [{ voucherDate: "asc" }, { id: "asc" }],
  });

  return vouchers.map((voucher) => ({
    id: voucher.id,
    voucherDate: formatDate(voucher.voucherDate),
    voucherNo: voucher.voucherNo,
    voucherType: voucher.voucherType,
    narration: voucher.narration,
    totalDebitPaisa: voucher.totalDebitPaisa,
    totalCreditPaisa: voucher.totalCreditPaisa,
    entries: voucher.entries,
  }));
}

export async function ledgerReport(companyId, ledgerId, startDate, endDate) {
  return buildLedgerStatement(companyId, ledgerId, startDate, endDate);
}

export async function trialBalance(companyId, asOn) {
  const ledgers = await loadLedgers(companyId);
  const rows = [];
  let debitTotal = 0;
  let creditTotal = 0;

  for (const ledger of ledgers) {
    const balance = openingSigned(ledger) + (await balanceForLedgerAsOf(ledger.id, asOn));
    const debitPaisa = balance > 0 ? balance : 0;
    const creditPaisa = balance < 0 ? Math.abs(balance) : 0;
    debitTotal += debitPaisa;
    creditTotal += creditPaisa;

    rows.push({
      ledgerId: ledger.id,
      ledgerName: ledger.name,
      groupName: ledger.accountGroup.name,
      balancePaisa: balance,
      debitPaisa,
      creditPaisa,
    });
  }

  rows.sort((a, b) => a.ledgerName.localeCompare(b.ledgerName));

  return {
    rows,
    totals: { debitPaisa: debitTotal, creditPaisa: creditTotal },
  };
}

export async function profitAndLoss(companyId, startDate, endDate) {
  const ledgers = await loadLedgers(companyId);
  let incomePaisa = 0;
  let expensePaisa = 0;
  const rows = [];

  for (const ledger of ledgers) {
    const rowsForLedger = await ledgerRowsBetween(ledger.id, startDate, endDate);
    const movement = rowsForLedger.reduce((sum, entry) => sum + Number(entry.debitPaisa || 0) - Number(entry.creditPaisa || 0), 0);
    const group = ledger.accountGroup;
    if (isIncomeCategory(group)) {
      const amount = Math.max(0, -movement);
      incomePaisa += amount;
      rows.push({ ledgerName: ledger.name, category: "INCOME", amountPaisa: amount });
    } else if (isExpenseCategory(group)) {
      const amount = Math.max(0, movement);
      expensePaisa += amount;
      rows.push({ ledgerName: ledger.name, category: "EXPENSE", amountPaisa: amount });
    }
  }

  return {
    rows,
    totals: {
      incomePaisa,
      expensePaisa,
      netProfitPaisa: incomePaisa - expensePaisa,
    },
  };
}

export async function balanceSheet(companyId, asOn) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new AppError("Company not found", 404);
  const ledgers = await loadLedgers(companyId);
  const assets = [];
  const liabilities = [];
  const capitals = [];
  let assetsPaisa = 0;
  let liabilitiesPaisa = 0;
  let capitalPaisa = 0;

  for (const ledger of ledgers) {
    const balance = openingSigned(ledger) + (await balanceForLedgerAsOf(ledger.id, asOn));
    const group = ledger.accountGroup;
    if (isAssetCategory(group)) {
      const amount = Math.max(0, balance);
      assetsPaisa += amount;
      assets.push({ ledgerName: ledger.name, amountPaisa: amount });
    } else if (isLiabilityCategory(group)) {
      const amount = Math.max(0, -balance);
      liabilitiesPaisa += amount;
      liabilities.push({ ledgerName: ledger.name, amountPaisa: amount });
    } else if (isCapitalCategory(group)) {
      const amount = Math.max(0, -balance);
      capitalPaisa += amount;
      capitals.push({ ledgerName: ledger.name, amountPaisa: amount });
    }
  }

  const pnl = await profitAndLoss(companyId, formatDate(company.financialYearStart), asOn);
  const netProfitPaisa = pnl.totals.netProfitPaisa;

  return {
    rows: {
      assets,
      liabilities,
      capital: capitals,
    },
    totals: {
      assetsPaisa,
      liabilitiesPlusCapitalPaisa: liabilitiesPaisa + capitalPaisa + netProfitPaisa,
      netProfitPaisa,
    },
  };
}

async function combinedGroupReport(companyId, groupName, startDate, endDate) {
  const ledgers = await prisma.ledger.findMany({
    where: {
      companyId,
      isActive: true,
      accountGroup: { name: groupName },
    },
    include: { accountGroup: true },
  });

  const rows = [];
  let totalPaisa = 0;
  for (const ledger of ledgers) {
    const statement = await buildLedgerStatement(companyId, ledger.id, startDate, endDate);
    rows.push(...statement.rows.map((row) => ({ ...row, ledgerName: ledger.name })));
    totalPaisa += statement.closingBalancePaisa;
  }
  return { rows, totalPaisa };
}

export async function cashBook(companyId, startDate, endDate) {
  return combinedGroupReport(companyId, "Cash-in-Hand", startDate, endDate);
}

export async function bankBook(companyId, startDate, endDate) {
  return combinedGroupReport(companyId, "Bank Accounts", startDate, endDate);
}

export async function receivables(companyId, asOn) {
  const ledgers = await prisma.ledger.findMany({
    where: { companyId, isActive: true, accountGroup: { name: "Sundry Debtors" } },
    include: { accountGroup: true },
  });
  const rows = [];
  let totalPaisa = 0;
  for (const ledger of ledgers) {
    const balance = openingSigned(ledger) + (await balanceForLedgerAsOf(ledger.id, asOn));
    const amount = Math.max(0, balance);
    if (amount > 0) {
      totalPaisa += amount;
      rows.push({ ledgerId: ledger.id, ledgerName: ledger.name, amountPaisa: amount, state: ledger.state, gstin: ledger.gstin });
    }
  }
  return { rows, totalPaisa };
}

export async function payables(companyId, asOn) {
  const ledgers = await prisma.ledger.findMany({
    where: { companyId, isActive: true, accountGroup: { name: "Sundry Creditors" } },
    include: { accountGroup: true },
  });
  const rows = [];
  let totalPaisa = 0;
  for (const ledger of ledgers) {
    const balance = openingSigned(ledger) + (await balanceForLedgerAsOf(ledger.id, asOn));
    const amount = Math.max(0, -balance);
    if (amount > 0) {
      totalPaisa += amount;
      rows.push({ ledgerId: ledger.id, ledgerName: ledger.name, amountPaisa: amount, state: ledger.state, gstin: ledger.gstin });
    }
  }
  return { rows, totalPaisa };
}

export async function salesRegister(companyId, startDate, endDate) {
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      isDeleted: false,
      invoiceDate: { gte: toDate(startDate), lte: toDate(endDate) },
      invoiceType: { in: ["SALES", "SALES_RETURN"] },
    },
    include: { partyLedger: true, items: true },
    orderBy: [{ invoiceDate: "asc" }, { id: "asc" }],
  });
  return invoices;
}

export async function purchaseRegister(companyId, startDate, endDate) {
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      isDeleted: false,
      invoiceDate: { gte: toDate(startDate), lte: toDate(endDate) },
      invoiceType: { in: ["PURCHASE", "PURCHASE_RETURN"] },
    },
    include: { partyLedger: true, items: true },
    orderBy: [{ invoiceDate: "asc" }, { id: "asc" }],
  });
  return invoices;
}

export async function customerStatement(companyId, ledgerId, startDate, endDate) {
  return buildLedgerStatement(companyId, ledgerId, startDate, endDate);
}

export async function supplierStatement(companyId, ledgerId, startDate, endDate) {
  return buildLedgerStatement(companyId, ledgerId, startDate, endDate);
}

export async function outstandingReceivables(companyId, asOn) {
  return receivables(companyId, asOn);
}

export async function outstandingPayables(companyId, asOn) {
  return payables(companyId, asOn);
}

export async function gstSummary(companyId, startDate, endDate) {
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      isDeleted: false,
      invoiceDate: { gte: toDate(startDate), lte: toDate(endDate) },
    },
    include: { partyLedger: true, items: true },
    orderBy: [{ invoiceDate: "asc" }, { id: "asc" }],
  });

  const sales = invoices.filter((invoice) => invoice.invoiceType === "SALES");
  const salesReturns = invoices.filter((invoice) => invoice.invoiceType === "SALES_RETURN");
  const purchases = invoices.filter((invoice) => invoice.invoiceType === "PURCHASE");
  const purchaseReturns = invoices.filter((invoice) => invoice.invoiceType === "PURCHASE_RETURN");

  const outputTaxPaisa =
    sales.reduce((sum, invoice) => sum + invoice.cgstPaisa + invoice.sgstPaisa + invoice.igstPaisa + invoice.cessPaisa, 0) -
    salesReturns.reduce((sum, invoice) => sum + invoice.cgstPaisa + invoice.sgstPaisa + invoice.igstPaisa + invoice.cessPaisa, 0);
  const inputTaxPaisa =
    purchases.reduce((sum, invoice) => sum + invoice.cgstPaisa + invoice.sgstPaisa + invoice.igstPaisa + invoice.cessPaisa, 0) -
    purchaseReturns.reduce((sum, invoice) => sum + invoice.cgstPaisa + invoice.sgstPaisa + invoice.igstPaisa + invoice.cessPaisa, 0);

  const hsnMap = new Map();
  for (const invoice of invoices) {
    for (const item of invoice.items) {
      const key = item.hsnSacCode || "NA";
      const current = hsnMap.get(key) || {
        hsnSacCode: key,
        taxablePaisa: 0,
        cgstPaisa: 0,
        sgstPaisa: 0,
        igstPaisa: 0,
        cessPaisa: 0,
        quantity: 0,
      };
      current.taxablePaisa += item.taxableValuePaisa;
      current.cgstPaisa += item.cgstPaisa;
      current.sgstPaisa += item.sgstPaisa;
      current.igstPaisa += item.igstPaisa;
      current.cessPaisa += item.cessPaisa;
      current.quantity += Number(item.quantity || 0);
      hsnMap.set(key, current);
    }
  }

  return {
    gstr3b: {
      outputTaxPaisa,
      inputTaxPaisa,
      netTaxPayablePaisa: outputTaxPaisa - inputTaxPaisa,
    },
    salesInvoices: sales,
    salesReturns,
    purchaseInvoices: purchases,
    purchaseReturns,
    hsnSummary: [...hsnMap.values()],
    b2bSales: sales.filter((invoice) => invoice.partyLedger?.gstin),
    b2cSales: sales.filter((invoice) => !invoice.partyLedger?.gstin),
    nilRatedSupply: invoices.filter((invoice) => invoice.grandTotalPaisa > 0 && invoice.taxablePaisa > 0 && invoice.cgstPaisa + invoice.sgstPaisa + invoice.igstPaisa + invoice.cessPaisa === 0),
    exemptSupply: invoices.filter((invoice) => invoice.taxablePaisa === 0),
    reverseCharge: purchases.filter((invoice) => invoice.isReverseCharge),
  };
}

export async function dashboardMetrics(companyId) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new AppError("Company not found", 404);

  const startDate = formatDate(company.financialYearStart);
  const endDate = formatDate(company.financialYearEnd);
  const [sales, purchases, receivableSummary, payableSummary, pnl, lowStock, recentVouchers, stock] = await Promise.all([
    prisma.invoice.aggregate({
      where: { companyId, isDeleted: false, invoiceType: "SALES", invoiceDate: { gte: company.financialYearStart, lte: company.financialYearEnd } },
      _sum: { grandTotalPaisa: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId, isDeleted: false, invoiceType: "PURCHASE", invoiceDate: { gte: company.financialYearStart, lte: company.financialYearEnd } },
      _sum: { grandTotalPaisa: true },
    }),
    outstandingReceivables(companyId, endDate),
    outstandingPayables(companyId, endDate),
    profitAndLoss(companyId, startDate, endDate),
    lowStockItems(companyId),
    prisma.voucher.findMany({
      where: { companyId, isDeleted: false },
      orderBy: [{ voucherDate: "desc" }, { id: "desc" }],
      take: 10,
    }),
    stockSummary(companyId),
  ]);

  const cashBookSummary = await cashBook(companyId, startDate, endDate);
  const bankBookSummary = await bankBook(companyId, startDate, endDate);
  const gst = await gstSummary(companyId, startDate, endDate);

  const monthMap = new Map();
  const monthGroups = await prisma.invoice.findMany({
    where: { companyId, isDeleted: false, invoiceDate: { gte: company.financialYearStart, lte: company.financialYearEnd } },
    orderBy: { invoiceDate: "asc" },
  });
  for (const invoice of monthGroups) {
    const key = formatDate(invoice.invoiceDate).slice(0, 7);
    const bucket = monthMap.get(key) || { month: key, salesPaisa: 0, purchasePaisa: 0 };
    if (invoice.invoiceType === "SALES") bucket.salesPaisa += invoice.grandTotalPaisa;
    if (invoice.invoiceType === "PURCHASE") bucket.purchasePaisa += invoice.grandTotalPaisa;
    monthMap.set(key, bucket);
  }

  return {
    totalSalesPaisa: Number(sales._sum.grandTotalPaisa || 0),
    totalPurchasesPaisa: Number(purchases._sum.grandTotalPaisa || 0),
    cashBalancePaisa: cashBookSummary.totalPaisa,
    bankBalancePaisa: bankBookSummary.totalPaisa,
    receivablesPaisa: receivableSummary.totalPaisa,
    payablesPaisa: payableSummary.totalPaisa,
    gstPayablePaisa: gst.gstr3b.netTaxPayablePaisa,
    gstInputCreditPaisa: gst.gstr3b.inputTaxPaisa,
    netProfitPaisa: pnl.totals.netProfitPaisa,
    lowStockItems: lowStock,
    recentVouchers,
    stockSummary: stock,
    monthlySalesPurchases: [...monthMap.values()],
    gst,
  };
}
