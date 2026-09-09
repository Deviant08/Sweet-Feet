import hpp from "hpp";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import xss from "xss-clean";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import express, { Application } from "express";
import mongoSanitize from "express-mongo-sanitize";
import { AppError } from "./middlewares/handleAppError.middleware";
import { globalErrorHandler } from "./controllers/handleAppError.controller";

import authRouter from "./routes/auth.route";
import productRouter from "./routes/product.route";
import orderRouter from "./routes/order.route";
import retailerRouter from "./routes/retailer.route";
import messageRouter from "./routes/message.route";
import feedbackRouter from "./routes/feedback.route";

const app: Application = express();

const origins = (process.env.CORS_ORIGINS || "http://localhost:3000").split(",").map((s) => s.trim());

app.use(
  cors({
    origin: origins,
    credentials: true,
  })
);
app.options("*", cors());

app.use(helmet());
app.use(morgan("dev"));

// Global API rate limit
const limiter = rateLimit({
  max: 200,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, try again later",
});
app.use("/api", limiter);

// Stricter limit on auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  max: 20,
  windowMs: 15 * 60 * 1000,
  message: "Too many login attempts, try again later",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/v1/auth", authLimiter);

// Paystack webhook needs raw body for signature verification.
// Mount a raw parser only on that path before the global JSON parser.
app.use(
  "/api/v1/orders/webhook",
  express.raw({ type: "application/json" }),
  (req, _res, next) => {
    // Keep a copy of the raw buffer for HMAC; also parse JSON for convenience.
    (req as any).rawBody = req.body;
    try {
      if (Buffer.isBuffer(req.body)) {
        req.body = JSON.parse(req.body.toString("utf8"));
      }
    } catch {
      // leave as-is; controller will reject
    }
    next();
  }
);

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());
app.use(compression());

app.get("/", (_req, res) =>
  res.status(200).json({ message: "Welcome to Sweet Feet API", version: "1.1" })
);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/retailers", retailerRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/feedback", feedbackRouter);

app.all("*", (req, _res, next) =>
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404))
);

app.use(globalErrorHandler);

export default app;
