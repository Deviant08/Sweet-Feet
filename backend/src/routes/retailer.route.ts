import { Router } from "express";
import { catchAsync } from "../middlewares/catchAsyncError.middleware";
import { protect, protectRetailer, restrictTo } from "../middlewares/auth.middleware";
import {
  getApprovedRetailers,
  getRetailer,
  updateMyProfile,
  setRetailerStatus,
} from "../controllers/retailer.controller";

const retailerRouter = Router();

retailerRouter.get("/", catchAsync(getApprovedRetailers));
retailerRouter.get("/:id", catchAsync(getRetailer));
retailerRouter.patch("/me", protectRetailer, catchAsync(updateMyProfile));
retailerRouter.patch("/:id/status", protect, restrictTo("admin"), catchAsync(setRetailerStatus));

export default retailerRouter;
