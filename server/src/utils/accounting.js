import { AppError } from "./appError.js";

const VOUCHER_PREFIX = {
  PAYMENT: "PAY",
  RECEIPT: "REC",
  CONTRA: "CON",
  JOURNAL: "JV",
  SALES: "SAL",
  PURCHASE: "PUR",
  DEBIT_NOTE: "DN",
  CREDIT_NOTE: "CN",
  SALES_RETURN: "SR",
  PURCHASE_RETURN: "PR",
};

export function validateVoucherRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new AppError("At least two voucher rows are required", 400);
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const row of rows) {
    const debit = Number(row.debitPaisa || 0);
    const credit = Number(row.creditPaisa || 0);

    if (debit < 0 || credit < 0) {
      throw new AppError("Voucher amounts must be positive", 400);
    }

    if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
      throw new AppError("Each voucher row must contain either a debit or a credit amount", 400);
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  if (totalDebit !== totalCredit) {
    throw new AppError("Voucher debit and credit totals do not match", 400);
  }

  return { totalDebit, totalCredit };
}

export async function nextVoucherNumber(tx, companyId, voucherType) {
  const prefix = VOUCHER_PREFIX[voucherType] || voucherType.slice(0, 3).toUpperCase();
  const count = await tx.voucher.count({
    where: { companyId, voucherType },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}
