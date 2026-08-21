import { asyncHandler } from "../utils/asyncHandler.js";
import { getGstSetting, updateGstSetting } from "../services/gstService.js";

export const getGstSettingController = asyncHandler(async (req, res) => {
  const gstSetting = await getGstSetting(req.companyId);
  res.json({ gstSetting });
});

export const updateGstSettingController = asyncHandler(async (req, res) => {
  const gstSetting = await updateGstSetting(req.companyId, req.validated, req.user);
  res.json({ gstSetting });
});
