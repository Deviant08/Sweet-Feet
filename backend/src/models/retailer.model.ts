import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import validator from "validator";
import moment from "moment";
import { Schema, model, Model } from "mongoose";
import { RetailerProps, RetailerMethods, RetailerStatus } from "../interface/retailer.interface";

const { SALT_ROUNDS } = process.env;

export type RetailerModel = Model<RetailerProps, {}, RetailerMethods>;

const retailerSchema = new Schema<RetailerProps, RetailerModel, RetailerMethods>(
  {
    businessName: {
      type: String,
      trim: true,
      required: [true, "Business name is required"],
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      required: [true, "Email is required"],
      validate: [validator.isEmail, "Please enter a valid email"],
    },
    phone: { type: String, trim: true },
    location: { type: String, trim: true },
    logo: { type: String },
    bio: { type: String },
    password: {
      type: String,
      minlength: 6,
      required: [true, "Password is required"],
      select: false,
    },
    passwordConfirm: {
      type: String,
      minlength: 6,
      required: [true, "Please confirm your password"],
      validate: {
        validator: function (this: RetailerProps, el: string) {
          return el === this.password;
        },
        message: "Passwords do not match",
      },
    },
    status: {
      type: String,
      enum: Object.values(RetailerStatus),
      default: RetailerStatus.pending,
    },
    commission: { type: Number, default: 5 },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetTokenExpires: Date,
  },
  { versionKey: false, timestamps: true }
);

retailerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, Number(SALT_ROUNDS || 12));
  this.passwordConfirm = undefined;
  next();
});

retailerSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = moment().subtract(10, "seconds").toDate();
  next();
});

retailerSchema.methods.comparePasswords = async function (entered: string, encrypted: string) {
  return bcrypt.compare(entered, encrypted);
};

retailerSchema.methods.changedPasswordAfter = function (jwtTimestamp: number) {
  if (this.passwordChangedAt) {
    return jwtTimestamp < this.passwordChangedAt.getTime() / 1000;
  }
  return false;
};

retailerSchema.methods.createPasswordResetToken = function () {
  // 32 bytes → 64 hex chars (was 3 bytes / easily brute-forced)
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.passwordResetTokenExpires = moment().add(10, "minutes").toDate();
  return resetToken;
};

const Retailer = model<RetailerProps, RetailerModel>("Retailer", retailerSchema);
export default Retailer;
