import { asyncHandler } from "../utils/asyncHandler.js";
import { createUser, deleteUser, listUsers, updateUser } from "../services/userService.js";

export const listUsersController = asyncHandler(async (req, res) => {
  const users = await listUsers();
  res.json({ users });
});

export const createUserController = asyncHandler(async (req, res) => {
  const user = await createUser(req.validated, req.user);
  res.status(201).json({ user });
});

export const updateUserController = asyncHandler(async (req, res) => {
  const user = await updateUser(Number(req.params.id), req.validated, req.user);
  res.json({ user });
});

export const deleteUserController = asyncHandler(async (req, res) => {
  const user = await deleteUser(Number(req.params.id), req.user);
  res.json({ user });
});
