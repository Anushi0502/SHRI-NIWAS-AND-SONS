import { asyncHandler } from "../utils/asyncHandler.js";
import { createLedger, deleteLedger, getLedger, listLedgers, updateLedger } from "../services/ledgerService.js";

export const listLedgersController = asyncHandler(async (req, res) => {
  const ledgers = await listLedgers(req.companyId, String(req.query.search || ""));
  res.json({ ledgers });
});

export const getLedgerController = asyncHandler(async (req, res) => {
  const ledger = await getLedger(req.companyId, Number(req.params.id));
  res.json({ ledger });
});

export const createLedgerController = asyncHandler(async (req, res) => {
  const ledger = await createLedger(req.companyId, req.validated, req.user);
  res.status(201).json({ ledger });
});

export const updateLedgerController = asyncHandler(async (req, res) => {
  const ledger = await updateLedger(req.companyId, Number(req.params.id), req.validated, req.user);
  res.json({ ledger });
});

export const deleteLedgerController = asyncHandler(async (req, res) => {
  const ledger = await deleteLedger(req.companyId, Number(req.params.id), req.user);
  res.json({ ledger });
});
