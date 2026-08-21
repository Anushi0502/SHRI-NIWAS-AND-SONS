import { PrismaClient, UserRole, VoucherType, InvoiceType, MovementType, RegistrationType } from "@prisma/client";
import bcrypt from "bcrypt";
import dayjs from "dayjs";

const prisma = new PrismaClient();

const defaultGroups = [
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

function currentFinancialYear() {
  const now = dayjs();
  const start = now.month() >= 3 ? now.month(3).date(1).startOf("day") : now.subtract(1, "year").month(3).date(1).startOf("day");
  const end = start.add(1, "year").subtract(1, "day");
  return { start: start.toDate(), end: end.toDate(), label: `${start.format("YYYY-MM-DD")} to ${end.format("YYYY-MM-DD")}` };
}

async function main() {
  const passwordHash = await bcrypt.hash("Admin@12345", 12);
  const accountantHash = await bcrypt.hash("Accountant@12345", 12);
  const viewerHash = await bcrypt.hash("Viewer@12345", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@shreenivas.local" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@shreenivas.local",
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "accountant@shreenivas.local" },
    update: {},
    create: {
      name: "Ledger Accountant",
      email: "accountant@shreenivas.local",
      passwordHash: accountantHash,
      role: UserRole.ACCOUNTANT,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "viewer@shreenivas.local" },
    update: {},
    create: {
      name: "Report Viewer",
      email: "viewer@shreenivas.local",
      passwordHash: viewerHash,
      role: UserRole.VIEWER,
      isActive: true,
    },
  });

  const fy = currentFinancialYear();
  const company = await prisma.company.upsert({
    where: { name: "Global Creative Services" },
    update: {},
    create: {
      name: "Global Creative Services",
      address: "14 Market Road, Pune, Maharashtra",
      phone: "+91-99999-00001",
      email: "accounts@shreenivas.local",
      gstin: "27AAFPS1234F1Z5",
      pan: "AAFPS1234F",
      state: "Maharashtra",
      financialYearStart: fy.start,
      financialYearEnd: fy.end,
      currency: "INR",
      activeUsers: {
        connect: { id: admin.id },
      },
    },
  });

  await prisma.user.update({
    where: { id: admin.id },
    data: { activeCompanyId: company.id },
  });

  await prisma.financialYear.upsert({
    where: {
      companyId_startDate_endDate: {
        companyId: company.id,
        startDate: fy.start,
        endDate: fy.end,
      },
    },
    update: { isCurrent: true, label: fy.label },
    create: {
      companyId: company.id,
      label: fy.label,
      startDate: fy.start,
      endDate: fy.end,
      isCurrent: true,
    },
  });

  for (const [name, parentName, reportCategory] of defaultGroups) {
    await prisma.accountGroup.upsert({
      where: {
        companyId_name: { companyId: company.id, name },
      },
      update: {},
      create: {
        companyId: company.id,
        name,
        parentName,
        reportCategory,
        isSystem: true,
      },
    });
  }

  const groupByName = Object.fromEntries(
    (await prisma.accountGroup.findMany({ where: { companyId: company.id } })).map((group) => [group.name, group]),
  );

  const gstSettings = await prisma.gstSetting.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      enabled: true,
      gstin: company.gstin,
      registrationType: RegistrationType.REGULAR,
      companyState: company.state,
      invoicePrefix: "SA",
      nextInvoiceNumber: 1001,
      placeOfSupplyLogic: "STATE_BASED",
    },
  });

  const ledgers = [
    { name: "Cash", group: "Cash-in-Hand", opening: 25000, type: "Dr", ledgerType: "CASH", isParty: false, state: company.state },
    { name: "HDFC Bank", group: "Bank Accounts", opening: 150000, type: "Dr", ledgerType: "BANK", isParty: false, state: company.state },
    { name: "ABC Traders", group: "Sundry Debtors", opening: 0, type: "Dr", ledgerType: "PARTY", isParty: true, state: company.state, phone: "+91-88888-11111", email: "abc.traders@example.com", gstin: "27ABCDE1234F1Z2" },
    { name: "Prime Suppliers", group: "Sundry Creditors", opening: 0, type: "Cr", ledgerType: "PARTY", isParty: true, state: company.state, phone: "+91-77777-22222", email: "prime.suppliers@example.com", gstin: "27PQRST1234G1Z7" },
    { name: "Sales", group: "Sales Accounts", opening: 0, type: "Cr", ledgerType: "SYSTEM", isParty: false, state: company.state },
    { name: "Purchase", group: "Purchase Accounts", opening: 0, type: "Dr", ledgerType: "SYSTEM", isParty: false, state: company.state },
    { name: "Capital", group: "Capital", opening: 200000, type: "Cr", ledgerType: "CAPITAL", isParty: false, state: company.state },
    { name: "Output CGST", group: "Duties & Taxes", opening: 0, type: "Cr", ledgerType: "GST_OUTPUT", isParty: false, state: company.state },
    { name: "Output SGST", group: "Duties & Taxes", opening: 0, type: "Cr", ledgerType: "GST_OUTPUT", isParty: false, state: company.state },
    { name: "Output IGST", group: "Duties & Taxes", opening: 0, type: "Cr", ledgerType: "GST_OUTPUT", isParty: false, state: company.state },
    { name: "Output Cess", group: "Duties & Taxes", opening: 0, type: "Cr", ledgerType: "GST_OUTPUT", isParty: false, state: company.state },
    { name: "Input CGST", group: "Duties & Taxes", opening: 0, type: "Dr", ledgerType: "GST_INPUT", isParty: false, state: company.state },
    { name: "Input SGST", group: "Duties & Taxes", opening: 0, type: "Dr", ledgerType: "GST_INPUT", isParty: false, state: company.state },
    { name: "Input IGST", group: "Duties & Taxes", opening: 0, type: "Dr", ledgerType: "GST_INPUT", isParty: false, state: company.state },
    { name: "Input Cess", group: "Duties & Taxes", opening: 0, type: "Dr", ledgerType: "GST_INPUT", isParty: false, state: company.state },
  ];

  const ledgerMap = {};
  for (const ledger of ledgers) {
    const created = await prisma.ledger.upsert({
      where: { companyId_name: { companyId: company.id, name: ledger.name } },
      update: {},
      create: {
        companyId: company.id,
        accountGroupId: groupByName[ledger.group].id,
        name: ledger.name,
        openingBalancePaisa: ledger.opening,
        openingBalanceType: ledger.type,
        ledgerType: ledger.ledgerType,
        isParty: ledger.isParty,
        state: ledger.state,
        gstin: ledger.gstin || "",
        phone: ledger.phone || "",
        email: ledger.email || "",
      },
    });
    ledgerMap[ledger.name] = created;
  }

  const stockGroup = await prisma.stockGroup.upsert({
    where: { companyId_name: { companyId: company.id, name: "Finished Goods" } },
    update: {},
    create: {
      companyId: company.id,
      name: "Finished Goods",
      parentName: "Stock-in-Hand",
      isSystem: true,
    },
  });

  const unitNos = await prisma.unit.upsert({
    where: { companyId_name: { companyId: company.id, name: "Numbers" } },
    update: {},
    create: {
      companyId: company.id,
      name: "Numbers",
      symbol: "Nos",
      decimalPlaces: 0,
      isSystem: true,
    },
  });

  const hsnPaper = await prisma.hsnSac.upsert({
    where: { companyId_code: { companyId: company.id, code: "4802" } },
    update: {},
    create: {
      companyId: company.id,
      code: "4802",
      description: "Paper and paperboard",
      itemType: "GOODS",
      gstRate: 18,
      cessRate: 0,
      applicableFrom: fy.start,
    },
  });

  const hsnInk = await prisma.hsnSac.upsert({
    where: { companyId_code: { companyId: company.id, code: "3215" } },
    update: {},
    create: {
      companyId: company.id,
      code: "3215",
      description: "Ink for printing",
      itemType: "GOODS",
      gstRate: 18,
      cessRate: 0,
      applicableFrom: fy.start,
    },
  });

  const itemPaper = await prisma.item.upsert({
    where: { companyId_sku: { companyId: company.id, sku: "PAPER-A4" } },
    update: {},
    create: {
      companyId: company.id,
      stockGroupId: stockGroup.id,
      unitId: unitNos.id,
      hsnSacId: hsnPaper.id,
      name: "Premium A4 Paper Pack",
      sku: "PAPER-A4",
      barcode: "890000000001",
      openingStockQty: 100,
      openingStockValuePaisa: 25000,
      lowStockLevelQty: 20,
      purchaseRatePaisa: 250,
      salesRatePaisa: 325,
      isGoods: true,
    },
  });

  const itemInk = await prisma.item.upsert({
    where: { companyId_sku: { companyId: company.id, sku: "INK-240" } },
    update: {},
    create: {
      companyId: company.id,
      stockGroupId: stockGroup.id,
      unitId: unitNos.id,
      hsnSacId: hsnInk.id,
      name: "Ink Cartridge 240ml",
      sku: "INK-240",
      barcode: "890000000002",
      openingStockQty: 40,
      openingStockValuePaisa: 32000,
      lowStockLevelQty: 10,
      purchaseRatePaisa: 800,
      salesRatePaisa: 1050,
      isGoods: true,
    },
  });

  const saleDate = dayjs(fy.start).add(20, "day").toDate();
  const purchaseDate = dayjs(fy.start).add(10, "day").toDate();
  const receiptDate = dayjs(fy.start).add(30, "day").toDate();
  const paymentDate = dayjs(fy.start).add(35, "day").toDate();

  const salesVoucher = await prisma.voucher.create({
    data: {
      companyId: company.id,
      voucherNo: "SA-1001",
      voucherType: VoucherType.SALES,
      voucherDate: saleDate,
      narration: "Seed sales invoice",
      totalDebitPaisa: 11800,
      totalCreditPaisa: 11800,
      createdById: admin.id,
      sourceType: "invoice",
      sourceId: 1,
      entries: {
        create: [
          { ledgerId: ledgerMap["ABC Traders"].id, sortOrder: 0, debitPaisa: 11800, creditPaisa: 0, narration: "Customer debit" },
          { ledgerId: ledgerMap["Sales"].id, sortOrder: 1, debitPaisa: 0, creditPaisa: 10000, narration: "Sales credit" },
          { ledgerId: ledgerMap["Output CGST"].id, sortOrder: 2, debitPaisa: 0, creditPaisa: 900, narration: "CGST" },
          { ledgerId: ledgerMap["Output SGST"].id, sortOrder: 3, debitPaisa: 0, creditPaisa: 900, narration: "SGST" },
        ],
      },
    },
  });

  const purchaseVoucher = await prisma.voucher.create({
    data: {
      companyId: company.id,
      voucherNo: "PU-1001",
      voucherType: VoucherType.PURCHASE,
      voucherDate: purchaseDate,
      narration: "Seed purchase invoice",
      totalDebitPaisa: 5900,
      totalCreditPaisa: 5900,
      createdById: admin.id,
      sourceType: "invoice",
      sourceId: 2,
      entries: {
        create: [
          { ledgerId: ledgerMap["Purchase"].id, sortOrder: 0, debitPaisa: 5000, creditPaisa: 0, narration: "Purchase debit" },
          { ledgerId: ledgerMap["Input CGST"].id, sortOrder: 1, debitPaisa: 450, creditPaisa: 0, narration: "Input CGST" },
          { ledgerId: ledgerMap["Input SGST"].id, sortOrder: 2, debitPaisa: 450, creditPaisa: 0, narration: "Input SGST" },
          { ledgerId: ledgerMap["Prime Suppliers"].id, sortOrder: 3, debitPaisa: 0, creditPaisa: 5900, narration: "Supplier credit" },
        ],
      },
    },
  });

  const receiptVoucher = await prisma.voucher.create({
    data: {
      companyId: company.id,
      voucherNo: "RC-1001",
      voucherType: VoucherType.RECEIPT,
      voucherDate: receiptDate,
      narration: "Customer receipt",
      totalDebitPaisa: 11800,
      totalCreditPaisa: 11800,
      createdById: admin.id,
      entries: {
        create: [
          { ledgerId: ledgerMap["Cash"].id, sortOrder: 0, debitPaisa: 11800, creditPaisa: 0, narration: "Cash received" },
          { ledgerId: ledgerMap["ABC Traders"].id, sortOrder: 1, debitPaisa: 0, creditPaisa: 11800, narration: "Against sale" },
        ],
      },
    },
  });

  const paymentVoucher = await prisma.voucher.create({
    data: {
      companyId: company.id,
      voucherNo: "PY-1001",
      voucherType: VoucherType.PAYMENT,
      voucherDate: paymentDate,
      narration: "Supplier payment",
      totalDebitPaisa: 5900,
      totalCreditPaisa: 5900,
      createdById: admin.id,
      entries: {
        create: [
          { ledgerId: ledgerMap["Prime Suppliers"].id, sortOrder: 0, debitPaisa: 5900, creditPaisa: 0, narration: "Supplier settlement" },
          { ledgerId: ledgerMap["HDFC Bank"].id, sortOrder: 1, debitPaisa: 0, creditPaisa: 5900, narration: "Bank payment" },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      companyId: company.id,
      invoiceNo: "SA-1001",
      invoiceDate: saleDate,
      invoiceType: InvoiceType.SALES,
      partyLedgerId: ledgerMap["ABC Traders"].id,
      placeOfSupply: company.state,
      gstInvoiceType: "TAX_INVOICE",
      subtotalPaisa: 10000,
      discountPaisa: 0,
      taxablePaisa: 10000,
      cgstPaisa: 900,
      sgstPaisa: 900,
      igstPaisa: 0,
      cessPaisa: 0,
      roundOffPaisa: 0,
      grandTotalPaisa: 11800,
      voucherId: salesVoucher.id,
      createdById: admin.id,
      items: {
        create: [
          {
            itemId: itemPaper.id,
            sortOrder: 0,
            itemName: itemPaper.name,
            hsnSacCode: hsnPaper.code,
            quantity: 20,
            unitPricePaisa: 500,
            discountPercent: 0,
            discountPaisa: 0,
            taxableValuePaisa: 10000,
            cgstRate: 9,
            sgstRate: 9,
            igstRate: 0,
            cessRate: 0,
            cgstPaisa: 900,
            sgstPaisa: 900,
            igstPaisa: 0,
            cessPaisa: 0,
            totalPaisa: 11800,
          },
        ],
      },
      stockMovements: {
        create: [
          {
            companyId: company.id,
            itemId: itemPaper.id,
            movementType: MovementType.SALES_OUTWARD,
            movementDate: saleDate,
            quantity: -20,
            ratePaisa: 500,
            amountPaisa: -10000,
            runningQty: 80,
            runningValuePaisa: 20000,
            notes: "Seed sales issue",
          },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      companyId: company.id,
      invoiceNo: "PU-1001",
      invoiceDate: purchaseDate,
      invoiceType: InvoiceType.PURCHASE,
      partyLedgerId: ledgerMap["Prime Suppliers"].id,
      placeOfSupply: company.state,
      gstInvoiceType: "TAX_INVOICE",
      subtotalPaisa: 5000,
      discountPaisa: 0,
      taxablePaisa: 5000,
      cgstPaisa: 450,
      sgstPaisa: 450,
      igstPaisa: 0,
      cessPaisa: 0,
      roundOffPaisa: 0,
      grandTotalPaisa: 5900,
      voucherId: purchaseVoucher.id,
      createdById: admin.id,
      items: {
        create: [
          {
            itemId: itemInk.id,
            sortOrder: 0,
            itemName: itemInk.name,
            hsnSacCode: hsnInk.code,
            quantity: 5,
            unitPricePaisa: 1000,
            discountPercent: 0,
            discountPaisa: 0,
            taxableValuePaisa: 5000,
            cgstRate: 9,
            sgstRate: 9,
            igstRate: 0,
            cessRate: 0,
            cgstPaisa: 450,
            sgstPaisa: 450,
            igstPaisa: 0,
            cessPaisa: 0,
            totalPaisa: 5900,
          },
        ],
      },
      stockMovements: {
        create: [
          {
            companyId: company.id,
            itemId: itemInk.id,
            movementType: MovementType.PURCHASE_INWARD,
            movementDate: purchaseDate,
            quantity: 5,
            ratePaisa: 1000,
            amountPaisa: 5000,
            runningQty: 45,
            runningValuePaisa: 37000,
            notes: "Seed purchase receipt",
          },
        ],
      },
    },
  });

  await prisma.setting.upsert({
    where: { scopeType_scopeId_key: { scopeType: "GLOBAL", scopeId: "GLOBAL", key: "app_name" } },
    update: { value: "Shreenivas Accounts" },
    create: {
      scopeType: "GLOBAL",
      scopeId: "GLOBAL",
      key: "app_name",
      value: "Global Creative Services",
    },
  });

  console.log("Seeded Global Creative Services demo data");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
