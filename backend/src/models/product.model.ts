import slugify from "slugify";
import { Schema, model, Model, SchemaTypes } from "mongoose";
import { ProductProps } from "../interface/product.interface";

export type ProductModel = Model<ProductProps>;

const productSchema = new Schema<ProductProps, ProductModel>(
  {
    retailer: {
      type: SchemaTypes.ObjectId,
      ref: "Retailer",
      required: [true, "Product must belong to a retailer"],
    },
    name: {
      type: String,
      trim: true,
      required: [true, "Product name is required"],
    },
    slug: String,
    category: { type: String, trim: true },
    gender: {
      type: String,
      enum: ["men", "women", "unisex", "kids"],
      default: "unisex",
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    oldPrice: { type: Number },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    color: { type: String, trim: true },
    badge: { type: String, trim: true },
    badgeLabel: { type: String, trim: true },
    img: {
      type: String,
      required: [true, "Product image is required"],
    },
    sizes: {
      type: [Number],
      required: [true, "At least one size is required"],
    },
    isActive: { type: Boolean, default: true },
  },
  { versionKey: false, timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, replacement: "-" });
  }
  next();
});

productSchema.pre(/^find/, function (next) {
  (this as any).populate({
    path: "retailer",
    select: "businessName location logo phone status",
  });
  next();
});

const Product = model<ProductProps, ProductModel>("Product", productSchema);
export default Product;
