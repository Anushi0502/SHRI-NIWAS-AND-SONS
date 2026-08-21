import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { router } from "./routes/index.js";

export const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: `${env.MAX_UPLOAD_MB}mb` }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "global-creative-services-api" });
});

app.use("/api", router);
app.use(notFound);
app.use(errorHandler);
