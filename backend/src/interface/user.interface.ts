export enum UserRole {
  customer = "customer",
  admin = "admin",
}

export interface UserProps {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  passwordConfirm?: string;
  role: UserRole;
  active: boolean;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetTokenExpires?: Date;
}

export interface UserMethods {
  comparePasswords(entered: string, encrypted: string): Promise<boolean>;
  changedPasswordAfter(jwtTimestamp: number): boolean;
  createPasswordResetToken(): string;
}
