import jwt from "jsonwebtoken";
import "dotenv/config";
import { Types } from "mongoose";
import { Request, Response, NextFunction } from "express";
import User from "../models/user.model";
import Retailer from "../models/retailer.model";
import { AppError } from "./handleAppError.middleware";
import { UserRole } from "../interface/user.interface";
import { RetailerStatus } from "../interface/retailer.interface";

const { JWT_SECRET, NODE_ENV } = process.env;

export const signJwt = (id: Types.ObjectId | string, type: "user" | "retailer" = "user") =>
  jwt.sign({ id, type }, JWT_SECRET as string, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

export const createSendToken = (
  payload: any,
  statusCode: number,
  res: Response,
  type: "user" | "retailer" = "user"
) => {
  const token = signJwt(payload.id || payload._id, type);
  res.cookie("jwt", token, {
    httpOnly: NODE_ENV === "production",
    secure: NODE_ENV === "production",
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    sameSite: NODE_ENV === "production" ? "none" : "lax",
  });
  return res.status(statusCode).json({ status: "Success", token, data: payload });
};

const extractToken = (req: Request): string | undefined => {
  if (req.headers.authorization?.startsWith("Bearer")) {
    return req.headers.authorization.split(" ")[1];
  }
  if (req.cookies?.jwt) return req.cookies.jwt;
  return undefined;
};

export const protect = async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) return next(new AppError("You are not logged in. Please provide a token.", 401));

  const decoded = jwt.verify(token, JWT_SECRET as string) as jwt.JwtPayload;
  if (decoded.type === "retailer") {
    const retailer = await Retailer.findById(decoded.id);
    if (!retailer) return next(new AppError("Retailer no longer exists", 401));
    if (retailer.changedPasswordAfter(decoded.iat ?? 0)) {
      return next(new AppError("Password recently changed. Please log in again.", 401));
    }
    req.retailer = {
      id: retailer._id,
      email: retailer.email,
      businessName: retailer.businessName,
      status: retailer.status,
    };
    req.user = {
      id: retailer._id,
      email: retailer.email,
      role: "retailer",
      businessName: retailer.businessName,
    };
  } else {
    const user = await User.findById(decoded.id);
    if (!user) return next(new AppError("User no longer exists", 401));
    if (user.changedPasswordAfter(decoded.iat ?? 0)) {
      return next(new AppError("Password recently changed. Please log in again.", 401));
    }
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };
  }
  next();
};

export const protectRetailer = async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) return next(new AppError("Retailer login required", 401));

  const decoded = jwt.verify(token, JWT_SECRET as string) as jwt.JwtPayload;
  if (decoded.type !== "retailer") {
    return next(new AppError("Retailer access only", 403));
  }

  const retailer = await Retailer.findById(decoded.id);
  if (!retailer) return next(new AppError("Retailer no longer exists", 401));
  if (retailer.status !== RetailerStatus.approved) {
    return next(new AppError("Your retailer account is not approved yet", 403));
  }

  req.retailer = {
    id: retailer._id,
    email: retailer.email,
    businessName: retailer.businessName,
    status: retailer.status,
  };
  next();
};

export const restrictTo =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }
    next();
  };
