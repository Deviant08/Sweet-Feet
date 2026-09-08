import { Request, Response, NextFunction } from "express";
import Message from "../models/message.model";
import { AppError } from "../middlewares/handleAppError.middleware";

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  const { retailerId, customerId, productId, orderId, message } = req.body;
  if (!message) return next(new AppError("Message text is required", 400));

  let senderType: "customer" | "retailer";
  let customer: string;
  let retailer: string;

  if (req.retailer) {
    senderType = "retailer";
    retailer = String(req.retailer.id);
    customer = customerId;
    if (!customer) return next(new AppError("customerId required when retailer sends", 400));
  } else if (req.user) {
    senderType = "customer";
    customer = String(req.user.id);
    retailer = retailerId;
    if (!retailer) return next(new AppError("retailerId required when customer sends", 400));
  } else {
    return next(new AppError("Authentication required", 401));
  }

  const msg = await Message.create({
    customer,
    retailer,
    product: productId,
    order: orderId,
    senderType,
    message,
  });

  res.status(201).json({ status: "Success", data: msg });
};

export const getConversation = async (req: Request, res: Response, next: NextFunction) => {
  const { retailerId, customerId } = req.query;
  let filter: any = {};

  if (req.retailer) {
    filter.retailer = req.retailer.id;
    if (customerId) filter.customer = customerId;
  } else if (req.user) {
    filter.customer = req.user.id;
    if (retailerId) filter.retailer = retailerId;
  } else {
    return next(new AppError("Authentication required", 401));
  }

  const messages = await Message.find(filter).sort({ createdAt: 1 }).limit(200);
  res.status(200).json({ status: "Success", results: messages.length, data: messages });
};

export const markRead = async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (Array.isArray(ids) && ids.length) {
    await Message.updateMany({ _id: { $in: ids } }, { isRead: true });
  }
  res.status(200).json({ status: "Success" });
};
