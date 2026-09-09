import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import validator from "validator";
import moment from "moment";
import { Schema, model, Model, Query } from "mongoose";
import { UserProps, UserMethods, UserRole } from "../interface/user.interface";

const { SALT_ROUNDS } = process.env;

export type UserModel = Model<UserProps, {}, UserMethods>;

const userSchema = new Schema<UserProps, UserModel, UserMethods>(
  {
    fullName: {
      type: String,
      trim: true,
      required: [true, "Please enter your full name"],
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      required: [true, "Please enter your email"],
      validate: [validator.isEmail, "Please enter a valid email"],
    },
    phone: { type: String, trim: true },
    password: {
      type: String,
      minlength: 6,
      required: [true, "Please provide a password"],
      select: false,
    },
    passwordConfirm: {
      type: String,
      minlength: 6,
      required: [true, "Please confirm your password"],
      validate: {
        validator: function (this: UserProps, el: string) {
          return el === this.password;
        },
        message: "Passwords do not match",
      },
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.customer,
    },
    active: { type: Boolean, default: true, select: false },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetTokenExpires: Date,
  },
  { versionKey: false, timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, Number(SALT_ROUNDS || 12));
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = moment().subtract(10, "seconds").toDate();
  next();
});

userSchema.pre<Query<UserProps, UserModel>>(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.comparePasswords = async function (entered: string, encrypted: string) {
  return bcrypt.compare(entered, encrypted);
};

userSchema.methods.changedPasswordAfter = function (jwtTimestamp: number) {
  if (this.passwordChangedAt) {
    const changed = this.passwordChangedAt.getTime() / 1000;
    return jwtTimestamp < changed;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // 32 bytes → 64 hex chars (was 3 bytes / easily brute-forced)
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.passwordResetTokenExpires = moment().add(10, "minutes").toDate();
  return resetToken;
};

const User = model<UserProps, UserModel>("User", userSchema);
export default User;
