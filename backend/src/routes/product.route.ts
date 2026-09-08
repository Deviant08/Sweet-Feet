import { Router } from "express";
import { catchAsync } from "../middlewares/catchAsyncError.middleware";
import { protectRetailer } from "../middlewares/auth.middleware";
import {
  getAllProducts,
  getProduct,
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";

const productRouter = Router();

productRouter.get("/", catchAsync(getAllProducts));
productRouter.get("/mine", protectRetailer, catchAsync(getMyProducts));
productRouter.get("/:id", catchAsync(getProduct));
productRouter.post("/", protectRetailer, catchAsync(createProduct));
productRouter.patch("/:id", protectRetailer, catchAsync(updateProduct));
productRouter.delete("/:id", protectRetailer, catchAsync(deleteProduct));

export default productRouter;
