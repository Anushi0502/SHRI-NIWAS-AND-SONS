import { asyncHandler } from "../utils/asyncHandler.js";
import { dashboardMetrics } from "../services/reportService.js";

export const dashboardController = asyncHandler(async (req, res) => {
  const dashboard = await dashboardMetrics(req.companyId);
  res.json({ dashboard });
});
