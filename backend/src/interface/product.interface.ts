import { Types } from "mongoose";

export interface ProductProps {
  retailer: Types.ObjectId;
  name: string;
  slug?: string;
  category?: string;
  gender?: string;
  price: number;
  oldPrice?: number;
  rating: number;
  ratingCount: number;
  color?: string;
  badge?: string;
  badgeLabel?: string;
  img: string;
  sizes: number[];
  isActive: boolean;
  createdAt?: Date;
}
