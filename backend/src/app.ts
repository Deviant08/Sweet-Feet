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

const limiter = rateLimit({
  max: 200,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, try again later",
});
app.use("/api", limiter);

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());
app.use(compression());

app.get("/", (_req, res) =>
  res.status(200).json({ message: "Welcome to Sweet Feet API", version: "1.0" })
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
