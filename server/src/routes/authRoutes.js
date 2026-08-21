import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { loginController, logoutController, meController, refreshController, setActiveCompanyController } from "../controllers/authController.js";
import { activeCompanySchema, loginSchema } from "../validators/authValidators.js";

export const authRoutes = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

authRoutes.post("/login", loginLimiter, validate(loginSchema), loginController);
authRoutes.post("/refresh", loginLimiter, refreshController);
authRoutes.post("/logout", logoutController);
authRoutes.get("/me", authenticate, meController);
authRoutes.put("/me/active-company", authenticate, validate(activeCompanySchema), setActiveCompanyController);
