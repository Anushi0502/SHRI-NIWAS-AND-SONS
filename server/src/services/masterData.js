export const DEFAULT_ACCOUNT_GROUPS = [
  ["Assets", null, "ASSETS"],
  ["Liabilities", null, "LIABILITIES"],
  ["Capital", null, "CAPITAL"],
  ["Income", null, "INCOME"],
  ["Expense", null, "EXPENSE"],
  ["Sundry Debtors", "Assets", "SUNDRY_DEBTORS"],
  ["Sundry Creditors", "Liabilities", "SUNDRY_CREDITORS"],
  ["Cash-in-Hand", "Assets", "CASH_IN_HAND"],
  ["Bank Accounts", "Assets", "BANK_ACCOUNTS"],
  ["Sales Accounts", "Income", "SALES_ACCOUNTS"],
  ["Purchase Accounts", "Expense", "PURCHASE_ACCOUNTS"],
  ["Duties & Taxes", "Liabilities", "DUTIES_AND_TAXES"],
  ["Direct Income", "Income", "DIRECT_INCOME"],
  ["Indirect Income", "Income", "INDIRECT_INCOME"],
  ["Direct Expenses", "Expense", "DIRECT_EXPENSES"],
  ["Indirect Expenses", "Expense", "INDIRECT_EXPENSES"],
  ["Fixed Assets", "Assets", "FIXED_ASSETS"],
  ["Current Assets", "Assets", "CURRENT_ASSETS"],
  ["Current Liabilities", "Liabilities", "CURRENT_LIABILITIES"],
  ["Stock-in-Hand", "Assets", "STOCK_IN_HAND"],
];

export const DEFAULT_GST_LEDGERS = [
  { name: "Input CGST", openingBalanceType: "Dr", ledgerType: "GST_INPUT" },
  { name: "Input SGST", openingBalanceType: "Dr", ledgerType: "GST_INPUT" },
  { name: "Input IGST", openingBalanceType: "Dr", ledgerType: "GST_INPUT" },
  { name: "Input Cess", openingBalanceType: "Dr", ledgerType: "GST_INPUT" },
  { name: "Output CGST", openingBalanceType: "Cr", ledgerType: "GST_OUTPUT" },
  { name: "Output SGST", openingBalanceType: "Cr", ledgerType: "GST_OUTPUT" },
  { name: "Output IGST", openingBalanceType: "Cr", ledgerType: "GST_OUTPUT" },
  { name: "Output Cess", openingBalanceType: "Cr", ledgerType: "GST_OUTPUT" },
];

export const DEFAULT_STOCK_GROUPS = [
  ["Stock-in-Hand", null],
  ["Finished Goods", "Stock-in-Hand"],
  ["Raw Materials", "Stock-in-Hand"],
];

export const DEFAULT_UNITS = [
  ["Numbers", "Nos", 0],
  ["Kilogram", "Kg", 3],
  ["Litre", "Ltr", 3],
  ["Box", "Box", 0],
];

export async function seedDefaultMasters(tx, company, options = {}) {
  const companyId = company.id;

  for (const [name, parentName, reportCategory] of DEFAULT_ACCOUNT_GROUPS) {
    await tx.accountGroup.upsert({
      where: { companyId_name: { companyId, name } },
      update: {},
      create: {
        companyId,
        name,
        parentName,
        reportCategory,
        isSystem: true,
      },
    });
  }

  for (const [name, parentName] of DEFAULT_STOCK_GROUPS) {
    await tx.stockGroup.upsert({
      where: { companyId_name: { companyId, name } },
      update: {},
      create: {
        companyId,
        name,
        parentName,
        isSystem: true,
      },
    });
  }

  for (const [name, symbol, decimalPlaces] of DEFAULT_UNITS) {
    await tx.unit.upsert({
      where: { companyId_name: { companyId, name } },
      update: {},
      create: {
        companyId,
        name,
        symbol,
        decimalPlaces,
        isSystem: true,
      },
    });
  }

  const groups = await tx.accountGroup.findMany({ where: { companyId } });
  const groupMap = Object.fromEntries(groups.map((group) => [group.name, group]));

  for (const gstLedger of DEFAULT_GST_LEDGERS) {
    await tx.ledger.upsert({
      where: { companyId_name: { companyId, name: gstLedger.name } },
      update: {},
      create: {
        companyId,
        accountGroupId: groupMap["Duties & Taxes"].id,
        name: gstLedger.name,
        openingBalancePaisa: 0,
        openingBalanceType: gstLedger.openingBalanceType,
        ledgerType: gstLedger.ledgerType,
        state: options.companyState || company.state || "",
        isParty: false,
      },
    });
  }

  return {
    groupMap,
  };
}
