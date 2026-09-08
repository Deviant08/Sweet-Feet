import { Router } from "express";
import { catchAsync } from "../middlewares/catchAsyncError.middleware";
import { protect } from "../middlewares/auth.middleware";
import { submitFeedback, getFeedback } from "../controllers/feedback.controller";

const feedbackRouter = Router();

feedbackRouter.post("/", catchAsync(submitFeedback));
feedbackRouter.get("/", protect, catchAsync(getFeedback));

export default feedbackRouter;
