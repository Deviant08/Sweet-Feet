import { Request, Response, NextFunction } from "express";
import { AppError } from "../middlewares/handleAppError.middleware";

const sendErrorDev = (err: any, res: Response) => {
  res.status(err.statusCode || 500).json({
    status: err.status || "Error",
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

const sendErrorProd = (err: any, res: Response) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({ status: err.status, message: err.message });
  } else {
    console.error("ERROR 💥", err);
    res.status(500).json({ status: "Error", message: "Something went wrong" });
  }
};

export const globalErrorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "Error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else {
    let error = { ...err, message: err.message };

    if (err.name === "CastError") {
      error = new AppError(`Invalid ${err.path}: ${err.value}`, 400);
    }
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || "field";
      error = new AppError(`Duplicate value for ${field}`, 400);
    }
    if (err.name === "ValidationError") {
      const msgs = Object.values(err.errors || {}).map((e: any) => e.message);
      error = new AppError(msgs.join(". "), 400);
    }
    if (err.name === "JsonWebTokenError") {
      error = new AppError("Invalid token. Please log in again.", 401);
    }
    if (err.name === "TokenExpiredError") {
      error = new AppError("Token expired. Please log in again.", 401);
    }

    sendErrorProd(error, res);
  }
};
