import { Router } from "express";
import { catchAsync } from "../middlewares/catchAsyncError.middleware";
import { protect } from "../middlewares/auth.middleware";
import { sendMessage, getConversation, markRead } from "../controllers/message.controller";

const messageRouter = Router();

messageRouter.use(protect);
messageRouter.post("/", catchAsync(sendMessage));
messageRouter.get("/", catchAsync(getConversation));
messageRouter.patch("/read", catchAsync(markRead));

export default messageRouter;
