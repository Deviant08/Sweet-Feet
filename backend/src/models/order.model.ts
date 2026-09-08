import { Schema, model, SchemaTypes } from "mongoose";
import { OrderProps, OrderStatus, ItemStatus } from "../interface/order.interface";

const orderItemSchema = new Schema(
  {
    retailer: { type: SchemaTypes.ObjectId, ref: "Retailer", required: true },
    product: { type: SchemaTypes.ObjectId, ref: "Product" },
    productName: { type: String, required: true },
    size: String,
    quantity: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(ItemStatus),
      default: ItemStatus.placed,
    },
  },
  { _id: true }
);

const orderSchema = new Schema<OrderProps>(
  {
    user: { type: SchemaTypes.ObjectId, ref: "User" },
    items: { type: [orderItemSchema], required: true },
    total: { type: Number, required: true },
    paystackRef: { type: String },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.pending,
    },
    orderedAt: { type: Date, default: Date.now },
  },
  { versionKey: false, timestamps: true }
);

orderSchema.pre(/^find/, function (next) {
  (this as any)
    .populate({ path: "user", select: "fullName email phone" })
    .populate({ path: "items.retailer", select: "businessName email phone location" })
    .populate({ path: "items.product", select: "name img price slug" });
  next();
});

const Order = model<OrderProps>("Order", orderSchema);
export default Order;
