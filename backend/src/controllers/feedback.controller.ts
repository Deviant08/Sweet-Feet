import { Request, Response, NextFunction } from "express";
import Feedback from "../models/feedback.model";
import { AppError } from "../middlewares/handleAppError.middleware";

export const submitFeedback = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, category, rating, message, retailerId } = req.body;
  if (!message) return next(new AppError("Message is required", 400));

  const feedback = await Feedback.create({
    user: req.user?.id,
    retailer: retailerId,
    name: name || req.user?.fullName,
    email: email || req.user?.email,
    category,
    rating,
    message,
  });

  res.status(201).json({ status: "Success", data: feedback });
};

export const getFeedback = async (_req: Request, res: Response) => {
  const list = await Feedback.find().sort({ submittedAt: -1 }).limit(100);
  res.status(200).json({ status: "Success", results: list.length, data: list });
};
