import { Request, Response, NextFunction } from "express";
import Product from "../models/product.model";
import { AppError } from "../middlewares/handleAppError.middleware";
import { RetailerStatus } from "../interface/retailer.interface";

// Public: list active products from approved retailers
export const getAllProducts = async (req: Request, res: Response) => {
  const filter: any = { isActive: true };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.gender) filter.gender = req.query.gender;
  if (req.query.search) {
    filter.name = { $regex: String(req.query.search), $options: "i" };
  }

  const products = await Product.find(filter).sort({ createdAt: -1 });
  // Only show products whose retailer is approved
  const filtered = products.filter(
    (p: any) => p.retailer && p.retailer.status === RetailerStatus.approved
  );

  res.status(200).json({ status: "Success", results: filtered.length, data: filtered });
};

export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  const product = await Product.findById(req.params.id);
  if (!product || !product.isActive) return next(new AppError("Product not found", 404));
  res.status(200).json({ status: "Success", data: product });
};

// Retailer: own products
export const getMyProducts = async (req: Request, res: Response) => {
  const products = await Product.find({ retailer: req.retailer!.id }).sort({ createdAt: -1 });
  res.status(200).json({ status: "Success", results: products.length, data: products });
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { name, category, gender, price, oldPrice, color, badge, badgeLabel, img, sizes } = req.body;
  if (!name || !price || !img || !sizes) {
    return next(new AppError("name, price, img and sizes are required", 400));
  }
  const sizeArr = Array.isArray(sizes) ? sizes.map(Number) : String(sizes).split(",").map(Number);
  const product = await Product.create({
    retailer: req.retailer!.id,
    name,
    category,
    gender,
    price,
    oldPrice,
    color,
    badge,
    badgeLabel,
    img,
    sizes: sizeArr,
  });
  res.status(201).json({ status: "Success", data: product });
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  const product = await Product.findOne({ _id: req.params.id, retailer: req.retailer!.id });
  if (!product) return next(new AppError("Product not found or you do not own it", 404));

  const fields = ["name", "category", "gender", "price", "oldPrice", "color", "badge", "badgeLabel", "img", "isActive"];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) (product as any)[f] = req.body[f];
  });
  if (req.body.sizes) {
    product.sizes = Array.isArray(req.body.sizes)
      ? req.body.sizes.map(Number)
      : String(req.body.sizes).split(",").map(Number);
  }
  await product.save();
  res.status(200).json({ status: "Success", data: product });
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  const product = await Product.findOne({ _id: req.params.id, retailer: req.retailer!.id });
  if (!product) return next(new AppError("Product not found or you do not own it", 404));
  product.isActive = false;
  await product.save();
  res.status(200).json({ status: "Success", message: "Product removed from listing" });
};
