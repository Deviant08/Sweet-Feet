export class AppError extends Error {
  public readonly status: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "Failed" : "Error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
