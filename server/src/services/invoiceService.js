import PDFDocument from "pdfkit";
import fs from "node:fs";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { toDate, formatDate } from "../utils/dates.js";
import { calculateGstBreakup, isSameState } from "./gstService.js";
import { createVoucherInternal } from "./voucherService.js";
import { recordStockMovement } from "./inventoryService.js";
import { writeAuditLog } from "../middleware/audit.js";

const SALES_LIKE = new Set(["SALES", "SALES_RETURN"]);
const PURCHASE_LIKE = new Set(["PURCHASE", "PURCHASE_RETURN"]);

function invoiceDirection(invoiceType) {
  switch (invoiceType) {
    case "SALES":
      return {
        partySide: "DEBIT",
        salesSide: "CREDIT",
        taxSide: "CREDIT",
        stockMovementType: "SALES_OUTWARD",
        stockQtySign: -1,
        stockAmountSign: -1,
      };
    case "SALES_RETURN":
      return {
        partySide: "CREDIT",
        salesSide: "DEBIT",
        taxSide: "DEBIT",
        stockMovementType: "ADJUSTMENT",
        stockQtySign: 1,
        stockAmountSign: 1,
      };
    case "PURCHASE":
      return {
        partySide: "CREDIT",
        salesSide: "DEBIT",
        taxSide: "DEBIT",
        stockMovementType: "PURCHASE_INWARD",
        stockQtySign: 1,
        stockAmountSign: 1,
      };
    case "PURCHASE_RETURN":
      return {
        partySide: "DEBIT",
        salesSide: "CREDIT",
        taxSide: "CREDIT",
        stockMovementType: "ADJUSTMENT",
        stockQtySign: -1,
        stockAmountSign: -1,
      };
    default:
      throw new AppError("Unsupported invoice type", 400);
  }
}

function isTaxableInvoiceType(invoiceType) {
  return SALES_LIKE.has(invoiceType) || PURCHASE_LIKE.has(invoiceType);
}

async function nextInvoiceNumber(tx, companyId, prefix, nextInvoiceNumberValue) {
  return `${prefix}-${String(nextInvoiceNumberValue).padStart(4, "0")}`;
}

async function buildInvoiceLines(tx, companyId, companyState, partyState, gstSetting, invoiceType, items) {
  const results = [];
  let subtotalPaisa = 0;
  let discountPaisa = 0;
  let taxablePaisa = 0;
  let cgstPaisa = 0;
  let sgstPaisa = 0;
  let igstPaisa = 0;
  let cessPaisa = 0;
  const sameState = isSameState(companyState, partyState || companyState);

  for (const [index, line] of items.entries()) {
    const item = line.itemId
      ? await tx.item.findFirst({
          where: { id: line.itemId, companyId },
          include: { hsnSac: true },
        })
      : null;
    if (line.itemId && !item) {
      throw new AppError(`Item not found for invoice line ${index + 1}`, 404);
    }

    const quantity = Number(line.quantity);
    if (quantity <= 0) {
      throw new AppError("Invoice quantities must be positive", 400);
    }

    const unitPricePaisa = Number(line.unitPricePaisa ?? item?.salesRatePaisa ?? item?.purchaseRatePaisa ?? 0);
    const lineSubtotal = Math.round(quantity * unitPricePaisa);
    const discountPercent = Number(line.discountPercent ?? 0);
    const lineDiscount = line.discountPaisa !== undefined
      ? Number(line.discountPaisa)
      : Math.round((lineSubtotal * discountPercent) / 100);
    const lineTaxable = Math.max(lineSubtotal - lineDiscount, 0);
    const gstRate = Number(line.gstRate ?? item?.hsnSac?.gstRate ?? 0);
    const lineCessRate = Number(line.cessRate ?? item?.hsnSac?.cessRate ?? 0);
    const gstEnabled = gstSetting.enabled && gstSetting.registrationType === "REGULAR" && isTaxableInvoiceType(invoiceType);
    const taxBreakup = calculateGstBreakup({
      taxableValuePaisa: lineTaxable,
      gstRate,
      cessRate: lineCessRate,
      isSameStateSupply: sameState,
      gstEnabled,
    });

    subtotalPaisa += lineSubtotal;
    discountPaisa += lineDiscount;
    taxablePaisa += lineTaxable;
    cgstPaisa += taxBreakup.cgstPaisa;
    sgstPaisa += taxBreakup.sgstPaisa;
    igstPaisa += taxBreakup.igstPaisa;
    cessPaisa += taxBreakup.cessPaisa;

    results.push({
      sortOrder: index,
      itemId: item?.id || null,
      itemName: line.itemName || item?.name || "",
      hsnSacCode: line.hsnSacCode || item?.hsnSac?.code || "",
      quantity,
      unitPricePaisa,
      discountPercent,
      discountPaisa: lineDiscount,
      taxableValuePaisa: lineTaxable,
      cgstRate: taxBreakup.cgstPaisa ? gstRate / 2 : 0,
      sgstRate: taxBreakup.sgstPaisa ? gstRate / 2 : 0,
      igstRate: taxBreakup.igstPaisa ? gstRate : 0,
      cessRate: lineCessRate,
      cgstPaisa: taxBreakup.cgstPaisa,
      sgstPaisa: taxBreakup.sgstPaisa,
      igstPaisa: taxBreakup.igstPaisa,
      cessPaisa: taxBreakup.cessPaisa,
      totalPaisa: lineTaxable + taxBreakup.totalTaxPaisa,
    });
  }

  const grandTotalPaisa = taxablePaisa + cgstPaisa + sgstPaisa + igstPaisa + cessPaisa;

  return {
    lines: results,
    subtotalPaisa,
    discountPaisa,
    taxablePaisa,
    cgstPaisa,
    sgstPaisa,
    igstPaisa,
    cessPaisa,
    roundOffPaisa: 0,
    grandTotalPaisa,
    sameState,
  };
}

async function createInvoiceTx(tx, companyId, data, actor, existingInvoiceId = null) {
  const company = await tx.company.findFirst({ where: { id: companyId } });
  if (!company || !company.isActive) {
    throw new AppError("Company not found", 404);
  }

  const partyLedger = await tx.ledger.findFirst({
    where: { id: data.partyLedgerId, companyId, isActive: true },
  });
  if (!partyLedger) {
    throw new AppError("Party ledger not found", 404);
  }

  const gstSetting = await tx.gstSetting.findUnique({ where: { companyId } });
  if (!gstSetting) {
    throw new AppError("GST setting not found", 404);
  }
  const direction = invoiceDirection(data.invoiceType);
  const invoiceLines = await buildInvoiceLines(tx, companyId, company.state, partyLedger.state, gstSetting, data.invoiceType, data.items);

  let invoiceNo = data.invoiceNo;
  let usedAutoNumber = false;
  if (!invoiceNo) {
    invoiceNo = await nextInvoiceNumber(tx, companyId, gstSetting.invoicePrefix, gstSetting.nextInvoiceNumber);
    usedAutoNumber = true;
  }

  const invoiceDate = toDate(data.invoiceDate);
  const placeOfSupply = data.placeOfSupply || (direction.partySide === "DEBIT" ? partyLedger.state || company.state : company.state);
  const grandTotalPaisa = invoiceLines.grandTotalPaisa;
  const taxablePaisa = invoiceLines.taxablePaisa;
  const totals = {
    subtotalPaisa: invoiceLines.subtotalPaisa,
    discountPaisa: invoiceLines.discountPaisa,
    taxablePaisa,
    cgstPaisa: invoiceLines.cgstPaisa,
    sgstPaisa: invoiceLines.sgstPaisa,
    igstPaisa: invoiceLines.igstPaisa,
    cessPaisa: invoiceLines.cessPaisa,
    roundOffPaisa: invoiceLines.roundOffPaisa,
    grandTotalPaisa,
  };

  if (existingInvoiceId) {
    const existingInvoice = await tx.invoice.findFirst({
      where: { id: existingInvoiceId, companyId },
      include: { items: true, voucher: true, stockMovements: true },
    });
    if (!existingInvoice) throw new AppError("Invoice not found", 404);

    await tx.stockMovement.updateMany({
      where: { invoiceId: existingInvoiceId },
      data: { isDeleted: true },
    });
    if (existingInvoice.voucherId) {
      await tx.voucher.update({
        where: { id: existingInvoice.voucherId },
        data: { isDeleted: true },
      });
      await tx.voucherEntry.deleteMany({ where: { voucherId: existingInvoice.voucherId } });
    }
    await tx.invoiceItem.deleteMany({ where: { invoiceId: existingInvoiceId } });

    const updatedInvoice = await tx.invoice.update({
      where: { id: existingInvoiceId },
      data: {
        invoiceNo,
        invoiceDate,
        invoiceType: data.invoiceType,
        gstInvoiceType: data.gstInvoiceType || "TAX_INVOICE",
        partyLedgerId: data.partyLedgerId,
        placeOfSupply,
        isReverseCharge: data.isReverseCharge ?? false,
        subtotalPaisa: totals.subtotalPaisa,
        discountPaisa: totals.discountPaisa,
        taxablePaisa: totals.taxablePaisa,
        cgstPaisa: totals.cgstPaisa,
        sgstPaisa: totals.sgstPaisa,
        igstPaisa: totals.igstPaisa,
        cessPaisa: totals.cessPaisa,
        roundOffPaisa: totals.roundOffPaisa,
        grandTotalPaisa: totals.grandTotalPaisa,
        notes: data.notes || "",
        voucherId: null,
        isDeleted: false,
      },
    });

    const createdItems = [];
    for (const line of invoiceLines.lines) {
      createdItems.push(
        await tx.invoiceItem.create({
          data: {
            invoiceId: updatedInvoice.id,
            itemId: line.itemId,
            sortOrder: line.sortOrder,
            itemName: line.itemName,
            hsnSacCode: line.hsnSacCode,
            quantity: line.quantity,
            unitPricePaisa: line.unitPricePaisa,
            discountPercent: line.discountPercent,
            discountPaisa: line.discountPaisa,
            taxableValuePaisa: line.taxableValuePaisa,
            cgstRate: line.cgstRate,
            sgstRate: line.sgstRate,
            igstRate: line.igstRate,
            cessRate: line.cessRate,
            cgstPaisa: line.cgstPaisa,
            sgstPaisa: line.sgstPaisa,
            igstPaisa: line.igstPaisa,
            cessPaisa: line.cessPaisa,
            totalPaisa: line.totalPaisa,
          },
        }),
      );
    }

    const voucherRows = buildVoucherRows({
      invoiceType: data.invoiceType,
      partyLedgerId: data.partyLedgerId,
      totals,
      ledgerIds: await resolvePostingLedgers(tx, companyId),
    });
    const voucher = await createVoucherInternal(tx, companyId, {
      voucherType: invoiceVoucherType(data.invoiceType),
      voucherDate,
      voucherNo,
      narration: data.notes || `Invoice ${invoiceNo}`,
      sourceType: "invoice",
      sourceId: updatedInvoice.id,
      entries: voucherRows,
    }, actor);

    await tx.invoice.update({
      where: { id: updatedInvoice.id },
      data: { voucherId: voucher.id },
    });

    for (const line of invoiceLines.lines) {
      await recordStockMovement(tx, companyId, {
        itemId: line.itemId,
        voucherId: voucher.id,
        invoiceId: updatedInvoice.id,
        movementType: direction.stockMovementType,
        movementDate: invoiceDate,
        quantity: line.quantity * direction.stockQtySign,
        ratePaisa: line.unitPricePaisa,
        amountPaisa: line.taxableValuePaisa * direction.stockAmountSign,
        notes: data.notes || "",
      });
    }

    if (usedAutoNumber) {
      await tx.gstSetting.update({
        where: { companyId },
        data: { nextInvoiceNumber: gstSetting.nextInvoiceNumber + 1 },
      });
    }

    return tx.invoice.findUnique({
      where: { id: updatedInvoice.id },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        partyLedger: true,
        voucher: { include: { entries: { include: { ledger: true } } } },
        stockMovements: true,
      },
    });
  }

  const invoice = await tx.invoice.create({
    data: {
      companyId,
      invoiceNo,
      invoiceDate,
      invoiceType: data.invoiceType,
      gstInvoiceType: data.gstInvoiceType || "TAX_INVOICE",
      partyLedgerId: data.partyLedgerId,
      placeOfSupply,
      isReverseCharge: data.isReverseCharge ?? false,
      subtotalPaisa: totals.subtotalPaisa,
      discountPaisa: totals.discountPaisa,
      taxablePaisa: totals.taxablePaisa,
      cgstPaisa: totals.cgstPaisa,
      sgstPaisa: totals.sgstPaisa,
      igstPaisa: totals.igstPaisa,
      cessPaisa: totals.cessPaisa,
      roundOffPaisa: totals.roundOffPaisa,
      grandTotalPaisa: totals.grandTotalPaisa,
      notes: data.notes || "",
      createdById: actor?.id || null,
    },
  });

  for (const line of invoiceLines.lines) {
    await tx.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        itemId: line.itemId,
        sortOrder: line.sortOrder,
        itemName: line.itemName,
        hsnSacCode: line.hsnSacCode,
        quantity: line.quantity,
        unitPricePaisa: line.unitPricePaisa,
        discountPercent: line.discountPercent,
        discountPaisa: line.discountPaisa,
        taxableValuePaisa: line.taxableValuePaisa,
        cgstRate: line.cgstRate,
        sgstRate: line.sgstRate,
        igstRate: line.igstRate,
        cessRate: line.cessRate,
        cgstPaisa: line.cgstPaisa,
        sgstPaisa: line.sgstPaisa,
        igstPaisa: line.igstPaisa,
        cessPaisa: line.cessPaisa,
        totalPaisa: line.totalPaisa,
      },
    });
  }

  const voucher = await createVoucherInternal(tx, companyId, {
    voucherType: invoiceVoucherType(data.invoiceType),
    voucherDate,
    voucherNo,
    narration: data.notes || `Invoice ${invoiceNo}`,
    sourceType: "invoice",
    sourceId: invoice.id,
    entries: buildVoucherRows({
      invoiceType: data.invoiceType,
      partyLedgerId: data.partyLedgerId,
      totals,
      ledgerIds: await resolvePostingLedgers(tx, companyId),
    }),
  }, actor);

  await tx.invoice.update({
    where: { id: invoice.id },
    data: { voucherId: voucher.id },
  });

  for (const line of invoiceLines.lines) {
    await recordStockMovement(tx, companyId, {
      itemId: line.itemId,
      voucherId: voucher.id,
      invoiceId: invoice.id,
      movementType: direction.stockMovementType,
      movementDate: invoiceDate,
      quantity: line.quantity * direction.stockQtySign,
      ratePaisa: line.unitPricePaisa,
      amountPaisa: line.taxableValuePaisa * direction.stockAmountSign,
      notes: data.notes || "",
    });
  }

  if (usedAutoNumber) {
    await tx.gstSetting.update({
      where: { companyId },
      data: { nextInvoiceNumber: gstSetting.nextInvoiceNumber + 1 },
    });
  }

  const created = await tx.invoice.findUnique({
    where: { id: invoice.id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      partyLedger: true,
      voucher: { include: { entries: { include: { ledger: true } } } },
      stockMovements: true,
    },
  });

  return created;
}

async function resolvePostingLedgers(tx, companyId) {
  const [salesLedger, purchaseLedger, inputCgst, inputSgst, inputIgst, inputCess, outputCgst, outputSgst, outputIgst, outputCess] =
    await Promise.all([
      tx.ledger.findFirst({ where: { companyId, name: "Sales", isActive: true } }),
      tx.ledger.findFirst({ where: { companyId, name: "Purchase", isActive: true } }),
      tx.ledger.findFirst({ where: { companyId, name: "Input CGST", isActive: true } }),
      tx.ledger.findFirst({ where: { companyId, name: "Input SGST", isActive: true } }),
      tx.ledger.findFirst({ where: { companyId, name: "Input IGST", isActive: true } }),
      tx.ledger.findFirst({ where: { companyId, name: "Input Cess", isActive: true } }),
      tx.ledger.findFirst({ where: { companyId, name: "Output CGST", isActive: true } }),
      tx.ledger.findFirst({ where: { companyId, name: "Output SGST", isActive: true } }),
      tx.ledger.findFirst({ where: { companyId, name: "Output IGST", isActive: true } }),
      tx.ledger.findFirst({ where: { companyId, name: "Output Cess", isActive: true } }),
    ]);

  return { salesLedger, purchaseLedger, inputCgst, inputSgst, inputIgst, inputCess, outputCgst, outputSgst, outputIgst, outputCess };
}

function invoiceVoucherType(invoiceType) {
  if (invoiceType === "SALES") return "SALES";
  if (invoiceType === "SALES_RETURN") return "SALES_RETURN";
  if (invoiceType === "PURCHASE") return "PURCHASE";
  if (invoiceType === "PURCHASE_RETURN") return "PURCHASE_RETURN";
  return "JOURNAL";
}

function buildVoucherRows({ invoiceType, partyLedgerId, totals, ledgerIds }) {
  const rows = [];
  const salesLike = invoiceType === "SALES" || invoiceType === "SALES_RETURN";
  const purchaseLike = invoiceType === "PURCHASE" || invoiceType === "PURCHASE_RETURN";
  const partyDebit = invoiceType === "SALES" || invoiceType === "PURCHASE_RETURN";
  const partyCredit = invoiceType === "SALES_RETURN" || invoiceType === "PURCHASE";

  if (salesLike) {
    if (partyDebit) {
      rows.push({ ledgerId: partyLedgerId, debitPaisa: totals.grandTotalPaisa, creditPaisa: 0, narration: "Party debit" });
      rows.push({ ledgerId: ledgerIds.outputCgst?.id, debitPaisa: 0, creditPaisa: totals.cgstPaisa, narration: "Output CGST" });
      rows.push({ ledgerId: ledgerIds.outputSgst?.id, debitPaisa: 0, creditPaisa: totals.sgstPaisa, narration: "Output SGST" });
      rows.push({ ledgerId: ledgerIds.outputIgst?.id, debitPaisa: 0, creditPaisa: totals.igstPaisa, narration: "Output IGST" });
      rows.push({ ledgerId: ledgerIds.outputCess?.id, debitPaisa: 0, creditPaisa: totals.cessPaisa, narration: "Output Cess" });
      rows.push({ ledgerId: ledgerIds.salesLedger?.id, debitPaisa: 0, creditPaisa: totals.taxablePaisa, narration: "Sales" });
    } else {
      rows.push({ ledgerId: partyLedgerId, debitPaisa: 0, creditPaisa: totals.grandTotalPaisa, narration: "Party credit" });
      rows.push({ ledgerId: ledgerIds.outputCgst?.id, debitPaisa: totals.cgstPaisa, creditPaisa: 0, narration: "Sales return CGST" });
      rows.push({ ledgerId: ledgerIds.outputSgst?.id, debitPaisa: totals.sgstPaisa, creditPaisa: 0, narration: "Sales return SGST" });
      rows.push({ ledgerId: ledgerIds.outputIgst?.id, debitPaisa: totals.igstPaisa, creditPaisa: 0, narration: "Sales return IGST" });
      rows.push({ ledgerId: ledgerIds.outputCess?.id, debitPaisa: totals.cessPaisa, creditPaisa: 0, narration: "Sales return Cess" });
      rows.push({ ledgerId: ledgerIds.salesLedger?.id, debitPaisa: totals.taxablePaisa, creditPaisa: 0, narration: "Sales return" });
    }
  } else if (purchaseLike) {
    if (partyCredit) {
      rows.push({ ledgerId: ledgerIds.purchaseLedger?.id, debitPaisa: totals.taxablePaisa, creditPaisa: 0, narration: "Purchase" });
      rows.push({ ledgerId: ledgerIds.inputCgst?.id, debitPaisa: totals.cgstPaisa, creditPaisa: 0, narration: "Input CGST" });
      rows.push({ ledgerId: ledgerIds.inputSgst?.id, debitPaisa: totals.sgstPaisa, creditPaisa: 0, narration: "Input SGST" });
      rows.push({ ledgerId: ledgerIds.inputIgst?.id, debitPaisa: totals.igstPaisa, creditPaisa: 0, narration: "Input IGST" });
      rows.push({ ledgerId: ledgerIds.inputCess?.id, debitPaisa: totals.cessPaisa, creditPaisa: 0, narration: "Input Cess" });
      rows.push({ ledgerId: partyLedgerId, debitPaisa: 0, creditPaisa: totals.grandTotalPaisa, narration: "Supplier credit" });
    } else {
      rows.push({ ledgerId: ledgerIds.purchaseLedger?.id, debitPaisa: 0, creditPaisa: totals.taxablePaisa, narration: "Purchase return" });
      rows.push({ ledgerId: ledgerIds.inputCgst?.id, debitPaisa: 0, creditPaisa: totals.cgstPaisa, narration: "Input CGST reverse" });
      rows.push({ ledgerId: ledgerIds.inputSgst?.id, debitPaisa: 0, creditPaisa: totals.sgstPaisa, narration: "Input SGST reverse" });
      rows.push({ ledgerId: ledgerIds.inputIgst?.id, debitPaisa: 0, creditPaisa: totals.igstPaisa, narration: "Input IGST reverse" });
      rows.push({ ledgerId: ledgerIds.inputCess?.id, debitPaisa: 0, creditPaisa: totals.cessPaisa, narration: "Input Cess reverse" });
      rows.push({ ledgerId: partyLedgerId, debitPaisa: totals.grandTotalPaisa, creditPaisa: 0, narration: "Supplier debit" });
    }
  }

  return rows.filter((row) => row.ledgerId);
}

export async function createInvoice(companyId, data, actor) {
  return prisma.$transaction((tx) => createInvoiceTx(tx, companyId, data, actor));
}

export async function updateInvoice(companyId, invoiceId, data, actor) {
  return prisma.$transaction((tx) => createInvoiceTx(tx, companyId, data, actor, invoiceId));
}

export async function listInvoices(companyId, filters = {}) {
  return prisma.invoice.findMany({
    where: {
      companyId,
      isDeleted: false,
      ...(filters.invoiceType ? { invoiceType: filters.invoiceType } : {}),
      ...(filters.startDate && filters.endDate
        ? { invoiceDate: { gte: toDate(filters.startDate), lte: toDate(filters.endDate) } }
        : {}),
    },
    include: {
      partyLedger: true,
      items: { orderBy: { sortOrder: "asc" } },
      voucher: true,
    },
    orderBy: [{ invoiceDate: "desc" }, { id: "desc" }],
  });
}

export async function getInvoice(companyId, invoiceId) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId, isDeleted: false },
    include: {
      partyLedger: true,
      items: { orderBy: { sortOrder: "asc" } },
      voucher: { include: { entries: { include: { ledger: true } } } },
      stockMovements: true,
    },
  });
  if (!invoice) throw new AppError("Invoice not found", 404);
  return invoice;
}

export async function deleteInvoice(companyId, invoiceId, actor) {
  const existing = await getInvoice(companyId, invoiceId);
  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.updateMany({
      where: { invoiceId },
      data: { isDeleted: true },
    });
    await tx.invoiceItem.deleteMany({ where: { invoiceId } });
    if (existing.voucherId) {
      await tx.voucher.update({
        where: { id: existing.voucherId },
        data: { isDeleted: true },
      });
      await tx.voucherEntry.deleteMany({ where: { voucherId: existing.voucherId } });
    }
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { isDeleted: true, voucherId: null },
    });
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "DELETE",
    entityType: "Invoice",
    entityId: invoiceId,
    before: existing,
    after: { isDeleted: true },
  });
}

export async function generateInvoicePdf(companyId, invoiceId, outputPath) {
  const invoice = await getInvoice(companyId, invoiceId);
  const doc = new PDFDocument({ size: "A4", margin: 28 });
  const stream = doc.pipe(fs.createWriteStream(outputPath));
  const company = await prisma.company.findUnique({ where: { id: companyId } });

  doc.fontSize(20).text(company.name, { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(10).text(company.address, { align: "center" });
  doc.text(`GSTIN: ${company.gstin || "-"}`, { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text(`Invoice ${invoice.invoiceNo}`);
  doc.fontSize(10).text(`Date: ${formatDate(invoice.invoiceDate)}`);
  doc.text(`Party: ${invoice.partyLedger.name}`);
  doc.text(`Type: ${invoice.invoiceType}`);
  doc.moveDown();

  const tableTop = doc.y;
  const colWidths = [180, 60, 60, 60, 60];
  const headers = ["Item", "Qty", "Rate", "Tax", "Total"];
  let x = 28;
  headers.forEach((header, index) => {
    doc.fontSize(10).text(header, x, tableTop, { width: colWidths[index], bold: true });
    x += colWidths[index];
  });
  doc.moveDown();

  let y = tableTop + 18;
  invoice.items.forEach((item) => {
    const row = [
      item.itemName,
      String(item.quantity),
      (item.unitPricePaisa / 100).toFixed(2),
      ((item.cgstPaisa + item.sgstPaisa + item.igstPaisa + item.cessPaisa) / 100).toFixed(2),
      (item.totalPaisa / 100).toFixed(2),
    ];
    x = 28;
    row.forEach((value, index) => {
      doc.fontSize(9).text(value, x, y, { width: colWidths[index] });
      x += colWidths[index];
    });
    y += 16;
  });

  y += 8;
  const totals = [
    ["Subtotal", invoice.subtotalPaisa],
    ["Discount", invoice.discountPaisa],
    ["Taxable", invoice.taxablePaisa],
    ["CGST", invoice.cgstPaisa],
    ["SGST", invoice.sgstPaisa],
    ["IGST", invoice.igstPaisa],
    ["Cess", invoice.cessPaisa],
    ["Round Off", invoice.roundOffPaisa],
    ["Grand Total", invoice.grandTotalPaisa],
  ];
  totals.forEach(([label, value]) => {
    doc.text(`${label}: ${(value / 100).toFixed(2)}`, 28, y);
    y += 14;
  });

  doc.end();
  await new Promise((resolve) => stream.on("finish", resolve));
}
