import { Types } from "mongoose";

export enum OrderStatus {
  pending = "pending",
  paid = "paid",
  failed = "failed",
}

export enum ItemStatus {
  placed = "placed",
  confirmed = "confirmed",
  packed = "packed",
  dispatched = "dispatched",
  delivered = "delivered",
  cancelled = "cancelled",
}

export interface OrderItemProps {
  retailer: Types.ObjectId;
  product?: Types.ObjectId;
  productName: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  status: ItemStatus;
}

export interface OrderProps {
  user?: Types.ObjectId;
  items: OrderItemProps[];
  total: number;
  paystackRef?: string;
  status: OrderStatus;
  orderedAt?: Date;
}
