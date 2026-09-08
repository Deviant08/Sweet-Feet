import { Router } from "express";
import { catchAsync } from "../middlewares/catchAsyncError.middleware";
import { protect, protectRetailer } from "../middlewares/auth.middleware";
import {
  createOrder,
  verifyPayment,
  getMyOrders,
  getRetailerOrders,
  updateItemStatus,
  getOrder,
} from "../controllers/order.controller";

const orderRouter = Router();

orderRouter.post("/", protect, catchAsync(createOrder));
orderRouter.post("/verify", catchAsync(verifyPayment));
orderRouter.get("/mine", protect, catchAsync(getMyOrders));
orderRouter.get("/retailer", protectRetailer, catchAsync(getRetailerOrders));
orderRouter.patch("/item-status", protectRetailer, catchAsync(updateItemStatus));
orderRouter.get("/:id", protect, catchAsync(getOrder));

export default orderRouter;
