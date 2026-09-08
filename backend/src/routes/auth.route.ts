import { Router } from "express";
import { catchAsync } from "../middlewares/catchAsyncError.middleware";
import { protect } from "../middlewares/auth.middleware";
import {
  signUp,
  login,
  retailerSignUp,
  retailerLogin,
  logout,
  me,
} from "../controllers/auth.controller";

const authRouter = Router();

authRouter.post("/register", catchAsync(signUp));
authRouter.post("/login", catchAsync(login));
authRouter.post("/retailer/register", catchAsync(retailerSignUp));
authRouter.post("/retailer/login", catchAsync(retailerLogin));
authRouter.post("/logout", catchAsync(logout));
authRouter.get("/me", protect, catchAsync(me));

export default authRouter;
