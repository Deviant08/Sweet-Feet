import validator from "validator";
import { Request, Response, NextFunction } from "express";
import User from "../models/user.model";
import Retailer from "../models/retailer.model";
import { AppError } from "../middlewares/handleAppError.middleware";
import { createSendToken } from "../middlewares/auth.middleware";
import { UserRole } from "../interface/user.interface";

// Customer signup
export const signUp = async (req: Request, res: Response, next: NextFunction) => {
  const { fullName, email, phone, password, passwordConfirm } = req.body;
  if (!fullName || !email || !password) {
    return next(new AppError("fullName, email and password are required", 400));
  }
  const user = await User.create({
    fullName,
    email,
    phone,
    password,
    passwordConfirm: passwordConfirm || password,
    role: UserRole.customer,
  });
  createSendToken(
    {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    201,
    res,
    "user"
  );
};

// Customer login
export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  if (!email || !password || !validator.isEmail(email)) {
    return next(new AppError("Please provide a valid email and password", 400));
  }
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePasswords(password, user.password))) {
    return next(new AppError("Invalid login credentials", 401));
  }
  createSendToken(
    {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    200,
    res,
    "user"
  );
};

// Retailer signup
export const retailerSignUp = async (req: Request, res: Response, next: NextFunction) => {
  const { businessName, email, phone, location, bio, password, passwordConfirm } = req.body;
  if (!businessName || !email || !password) {
    return next(new AppError("businessName, email and password are required", 400));
  }
  const retailer = await Retailer.create({
    businessName,
    email,
    phone,
    location,
    bio,
    password,
    passwordConfirm: passwordConfirm || password,
  });
  createSendToken(
    {
      id: retailer._id,
      businessName: retailer.businessName,
      email: retailer.email,
      phone: retailer.phone,
      location: retailer.location,
      status: retailer.status,
    },
    201,
    res,
    "retailer"
  );
};

// Retailer login
export const retailerLogin = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  if (!email || !password || !validator.isEmail(email)) {
    return next(new AppError("Please provide a valid email and password", 400));
  }
  const retailer = await Retailer.findOne({ email }).select("+password");
  if (!retailer || !(await retailer.comparePasswords(password, retailer.password))) {
    return next(new AppError("Invalid login credentials", 401));
  }
  createSendToken(
    {
      id: retailer._id,
      businessName: retailer.businessName,
      email: retailer.email,
      phone: retailer.phone,
      location: retailer.location,
      status: retailer.status,
    },
    200,
    res,
    "retailer"
  );
};

export const logout = async (_req: Request, res: Response) => {
  res.cookie("jwt", "null", { httpOnly: true, expires: new Date(Date.now() + 1000) });
  res.status(200).json({ status: "Logged out successfully" });
};

export const me = async (req: Request, res: Response) => {
  res.status(200).json({ status: "Success", data: req.user || req.retailer });
};
