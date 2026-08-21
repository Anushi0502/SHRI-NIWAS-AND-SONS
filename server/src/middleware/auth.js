import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { verifyAccessToken } from "../utils/tokens.js";

export async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return next(new AppError("Authentication required", 401));
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { activeCompany: true },
    });

    if (!user || !user.isActive) {
      return next(new AppError("Authentication required", 401));
    }

    req.user = user;
    req.auth = decoded;
    return next();
  } catch (error) {
    return next(new AppError("Invalid or expired access token", 401));
  }
}
