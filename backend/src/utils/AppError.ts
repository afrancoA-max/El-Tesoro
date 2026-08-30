export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }

  static notFound(code: string, message: string): AppError {
    return new AppError(404, code, message);
  }

  static badRequest(code: string, message: string): AppError {
    return new AppError(400, code, message);
  }

  static unauthorized(code: string, message: string): AppError {
    return new AppError(401, code, message);
  }

  static forbidden(code: string, message: string): AppError {
    return new AppError(403, code, message);
  }

  static conflict(code: string, message: string): AppError {
    return new AppError(409, code, message);
  }
}
