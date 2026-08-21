import { asyncHandler } from "../utils/asyncHandler.js";
import { authConstants, login, logout, refreshSession, getSessionUser, setActiveCompany } from "../services/authService.js";
import { env } from "../config/env.js";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

export const loginController = asyncHandler(async (req, res) => {
  const result = await login({ ...req.validated, req });
  res.cookie(authConstants.REFRESH_COOKIE_NAME, result.refreshToken, {
    ...cookieOptions(),
    maxAge: 1000 * 60 * 60 * 24 * env.REFRESH_TOKEN_TTL_DAYS,
  });
  res.json({ user: result.user, accessToken: result.accessToken });
});

export const refreshController = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.[authConstants.REFRESH_COOKIE_NAME];
  const result = await refreshSession({ rawRefreshToken, req });
  res.cookie(authConstants.REFRESH_COOKIE_NAME, result.refreshToken, {
    ...cookieOptions(),
    maxAge: 1000 * 60 * 60 * 24 * env.REFRESH_TOKEN_TTL_DAYS,
  });
  res.json({ user: result.user, accessToken: result.accessToken });
});

export const logoutController = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.[authConstants.REFRESH_COOKIE_NAME];
  await logout({ rawRefreshToken, req });
  res.clearCookie(authConstants.REFRESH_COOKIE_NAME, cookieOptions());
  res.json({ ok: true });
});

export const meController = asyncHandler(async (req, res) => {
  const user = await getSessionUser(req.user.id);
  res.json({ user });
});

export const setActiveCompanyController = asyncHandler(async (req, res) => {
  const user = await setActiveCompany(req.user.id, req.validated.companyId);
  res.json({ user });
});
