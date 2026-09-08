import { Schema, model, SchemaTypes } from "mongoose";

export interface MessageProps {
  customer: Schema.Types.ObjectId;
  retailer: Schema.Types.ObjectId;
  product?: Schema.Types.ObjectId;
  order?: Schema.Types.ObjectId;
  senderType: "customer" | "retailer";
  message: string;
  isRead: boolean;
  createdAt?: Date;
}

const messageSchema = new Schema<MessageProps>(
  {
    customer: { type: SchemaTypes.ObjectId, ref: "User", required: true },
    retailer: { type: SchemaTypes.ObjectId, ref: "Retailer", required: true },
    product: { type: SchemaTypes.ObjectId, ref: "Product" },
    order: { type: SchemaTypes.ObjectId, ref: "Order" },
    senderType: { type: String, enum: ["customer", "retailer"], required: true },
    message: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false },
  },
  { versionKey: false, timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ customer: 1, retailer: 1, createdAt: -1 });

const Message = model<MessageProps>("Message", messageSchema);
export default Message;
