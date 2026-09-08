import { Types } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: Types.ObjectId | string;
        email: string;
        role: string;
        fullName?: string;
        businessName?: string;
        [key: string]: any;
      };
      retailer?: {
        id: Types.ObjectId | string;
        email: string;
        businessName: string;
        status: string;
        [key: string]: any;
      };
    }
  }
}

export {};
