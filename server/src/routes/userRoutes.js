import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import { createUserController, deleteUserController, listUsersController, updateUserController } from "../controllers/userController.js";
import { userCreateSchema, userUpdateSchema } from "../validators/userValidators.js";

export const userRoutes = Router();

userRoutes.use(authenticate, requireRole("ADMIN"));
userRoutes.get("/", listUsersController);
userRoutes.post("/", validate(userCreateSchema), createUserController);
userRoutes.put("/:id", validate(userUpdateSchema), updateUserController);
userRoutes.delete("/:id", deleteUserController);
