import { Request, Response, NextFunction } from "express";
import Retailer from "../models/retailer.model";
import { AppError } from "../middlewares/handleAppError.middleware";
import { RetailerStatus } from "../interface/retailer.interface";

export const getApprovedRetailers = async (_req: Request, res: Response) => {
  const retailers = await Retailer.find({ status: RetailerStatus.approved }).select(
    "-password -passwordResetToken -passwordResetTokenExpires"
  );
  res.status(200).json({ status: "Success", results: retailers.length, data: retailers });
};

export const getRetailer = async (req: Request, res: Response, next: NextFunction) => {
  const retailer = await Retailer.findById(req.params.id).select(
    "-password -passwordResetToken -passwordResetTokenExpires"
  );
  if (!retailer) return next(new AppError("Retailer not found", 404));
  res.status(200).json({ status: "Success", data: retailer });
};

export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  const allowed = ["businessName", "phone", "location", "logo", "bio"];
  const updates: any = {};
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });
  const retailer = await Retailer.findByIdAndUpdate(req.retailer!.id, updates, {
    new: true,
    runValidators: true,
  }).select("-password");
  if (!retailer) return next(new AppError("Retailer not found", 404));
  res.status(200).json({ status: "Success", data: retailer });
};

// Admin: approve / suspend
export const setRetailerStatus = async (req: Request, res: Response, next: NextFunction) => {
  const { status } = req.body;
  if (!Object.values(RetailerStatus).includes(status)) {
    return next(new AppError("Invalid status", 400));
  }
  const retailer = await Retailer.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).select("-password");
  if (!retailer) return next(new AppError("Retailer not found", 404));
  res.status(200).json({ status: "Success", data: retailer });
};
