import { Router } from "express";
import { authRoutes } from "./authRoutes.js";
import { userRoutes } from "./userRoutes.js";
import { companyRoutes } from "./companyRoutes.js";
import { accountGroupRoutes } from "./accountGroupRoutes.js";
import { gstRoutes } from "./gstRoutes.js";
import { ledgerRoutes } from "./ledgerRoutes.js";
import { inventoryRoutes } from "./inventoryRoutes.js";
import { voucherRoutes } from "./voucherRoutes.js";
import { invoiceRoutes } from "./invoiceRoutes.js";
import { dashboardRoutes } from "./dashboardRoutes.js";
import { reportRoutes } from "./reportRoutes.js";
import { backupRoutes } from "./backupRoutes.js";

export const router = Router();

router.get("/health", (req, res) => {
  res.json({ ok: true, scope: "api" });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/companies", companyRoutes);
router.use("/account-groups", accountGroupRoutes);
router.use("/gst", gstRoutes);
router.use("/ledgers", ledgerRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/vouchers", voucherRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/reports", reportRoutes);
router.use("/backup", backupRoutes);
