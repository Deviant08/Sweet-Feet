export enum RetailerStatus {
  pending = "pending",
  approved = "approved",
  suspended = "suspended",
}

export interface RetailerProps {
  businessName: string;
  email: string;
  phone?: string;
  location?: string;
  logo?: string;
  bio?: string;
  password: string;
  passwordConfirm?: string;
  status: RetailerStatus;
  commission: number;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetTokenExpires?: Date;
}

export interface RetailerMethods {
  comparePasswords(entered: string, encrypted: string): Promise<boolean>;
  changedPasswordAfter(jwtTimestamp: number): boolean;
  createPasswordResetToken(): string;
}
