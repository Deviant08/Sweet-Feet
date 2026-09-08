import { Schema, model, SchemaTypes } from "mongoose";

export interface FeedbackProps {
  user?: Schema.Types.ObjectId;
  retailer?: Schema.Types.ObjectId;
  name?: string;
  email?: string;
  category?: string;
  rating?: number;
  message: string;
  submittedAt?: Date;
}

const feedbackSchema = new Schema<FeedbackProps>(
  {
    user: { type: SchemaTypes.ObjectId, ref: "User" },
    retailer: { type: SchemaTypes.ObjectId, ref: "Retailer" },
    name: String,
    email: String,
    category: String,
    rating: { type: Number, min: 1, max: 5 },
    message: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const Feedback = model<FeedbackProps>("Feedback", feedbackSchema);
export default Feedback;
