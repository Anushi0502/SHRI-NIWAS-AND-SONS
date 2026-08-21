import { asyncHandler } from "../utils/asyncHandler.js";
import { createAccountGroup, deleteAccountGroup, listAccountGroups, updateAccountGroup } from "../services/accountGroupService.js";

export const listAccountGroupsController = asyncHandler(async (req, res) => {
  const groups = await listAccountGroups(req.companyId);
  res.json({ groups });
});

export const createAccountGroupController = asyncHandler(async (req, res) => {
  const group = await createAccountGroup(req.companyId, req.validated, req.user);
  res.status(201).json({ group });
});

export const updateAccountGroupController = asyncHandler(async (req, res) => {
  const group = await updateAccountGroup(req.companyId, Number(req.params.id), req.validated, req.user);
  res.json({ group });
});

export const deleteAccountGroupController = asyncHandler(async (req, res) => {
  await deleteAccountGroup(req.companyId, Number(req.params.id), req.user);
  res.json({ ok: true });
});
