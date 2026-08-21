import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { writeAuditLog } from "../middleware/audit.js";

export async function getGstSetting(companyId) {
  const setting = await prisma.gstSetting.findUnique({ where: { companyId } });
  if (!setting) throw new AppError("GST setting not found", 404);
  return setting;
}

export async function updateGstSetting(companyId, data, actor) {
  const existing = await prisma.gstSetting.findUnique({ where: { companyId } });
  const gstSetting = await prisma.gstSetting.upsert({
    where: { companyId },
    update: {
      enabled: data.enabled ?? existing?.enabled ?? true,
      gstin: data.gstin ?? existing?.gstin ?? "",
      registrationType: data.registrationType ?? existing?.registrationType ?? "REGULAR",
      companyState: data.companyState ?? existing?.companyState ?? "",
      invoicePrefix: data.invoicePrefix ?? existing?.invoicePrefix ?? "INV",
      nextInvoiceNumber: data.nextInvoiceNumber ?? existing?.nextInvoiceNumber ?? 1,
      placeOfSupplyLogic: data.placeOfSupplyLogic ?? existing?.placeOfSupplyLogic ?? "STATE_BASED",
      reverseChargeEnabled: data.reverseChargeEnabled ?? existing?.reverseChargeEnabled ?? false,
    },
    create: {
      companyId,
      enabled: data.enabled ?? true,
      gstin: data.gstin ?? "",
      registrationType: data.registrationType ?? "REGULAR",
      companyState: data.companyState ?? "",
      invoicePrefix: data.invoicePrefix ?? "INV",
      nextInvoiceNumber: data.nextInvoiceNumber ?? 1,
      placeOfSupplyLogic: data.placeOfSupplyLogic ?? "STATE_BASED",
      reverseChargeEnabled: data.reverseChargeEnabled ?? false,
    },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: existing ? "UPDATE" : "CREATE",
    entityType: "GstSetting",
    entityId: gstSetting.id,
    before: existing,
    after: gstSetting,
  });

  return gstSetting;
}

export function isSameState(companyState, partyState) {
  return String(companyState || "").trim().toLowerCase() === String(partyState || "").trim().toLowerCase();
}

export function calculateGstBreakup({ taxableValuePaisa, gstRate = 0, cessRate = 0, isSameStateSupply = true, gstEnabled = true }) {
  if (!gstEnabled) {
    return { cgstPaisa: 0, sgstPaisa: 0, igstPaisa: 0, cessPaisa: 0, totalTaxPaisa: 0 };
  }

  const rate = Number(gstRate || 0);
  const cess = Number(cessRate || 0);
  const taxable = Number(taxableValuePaisa || 0);
  const halfRate = rate / 2;

  const cgstPaisa = isSameStateSupply ? Math.round((taxable * halfRate) / 100) : 0;
  const sgstPaisa = isSameStateSupply ? Math.round((taxable * halfRate) / 100) : 0;
  const igstPaisa = isSameStateSupply ? 0 : Math.round((taxable * rate) / 100);
  const cessPaisa = Math.round((taxable * cess) / 100);
  const totalTaxPaisa = cgstPaisa + sgstPaisa + igstPaisa + cessPaisa;

  return { cgstPaisa, sgstPaisa, igstPaisa, cessPaisa, totalTaxPaisa };
}
