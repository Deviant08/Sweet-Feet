import { Router } from "express";
import { catchAsync } from "../middlewares/catchAsyncError.middleware";
import { protect, protectRetailer } from "../middlewares/auth.middleware";
import {
  createOrder,
  verifyPayment,
  paystackWebhook,
  getMyOrders,
  getRetailerOrders,
  updateItemStatus,
  getOrder,
} from "../controllers/order.controller";

const orderRouter = Router();

// Webhook must stay public (Paystack calls it). Signature is verified inside the controller.
orderRouter.post("/webhook", catchAsync(paystackWebhook));

orderRouter.post("/", protect, catchAsync(createOrder));
orderRouter.post("/verify", protect, catchAsync(verifyPayment)); // now requires auth + ownership
orderRouter.get("/mine", protect, catchAsync(getMyOrders));
orderRouter.get("/retailer", protectRetailer, catchAsync(getRetailerOrders));
orderRouter.patch("/item-status", protectRetailer, catchAsync(updateItemStatus));
orderRouter.get("/:id", protect, catchAsync(getOrder));

export default orderRouter;
