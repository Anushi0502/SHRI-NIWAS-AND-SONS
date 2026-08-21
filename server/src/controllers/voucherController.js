import { asyncHandler } from "../utils/asyncHandler.js";
import { createVoucher, deleteVoucher, getVoucher, listVouchers, updateVoucher } from "../services/voucherService.js";

export const listVouchersController = asyncHandler(async (req, res) => {
  const vouchers = await listVouchers(req.companyId, req.validated || {});
  res.json({ vouchers });
});

export const getVoucherController = asyncHandler(async (req, res) => {
  const voucher = await getVoucher(req.companyId, Number(req.params.id));
  res.json({ voucher });
});

export const createVoucherController = asyncHandler(async (req, res) => {
  const voucher = await createVoucher(req.companyId, req.validated, req.user);
  res.status(201).json({ voucher });
});

export const updateVoucherController = asyncHandler(async (req, res) => {
  const voucher = await updateVoucher(req.companyId, Number(req.params.id), req.validated, req.user);
  res.json({ voucher });
});

export const deleteVoucherController = asyncHandler(async (req, res) => {
  const voucher = await deleteVoucher(req.companyId, Number(req.params.id), req.user);
  res.json({ voucher });
});
