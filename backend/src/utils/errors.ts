/**
 * Centralized application error type with HTTP status and optional details.
 * Throw these anywhere; the global error handler renders them consistently.
 */
export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): HttpError {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = "Authentication required"): HttpError {
    return new HttpError(401, message);
  }

  static forbidden(message = "You do not have permission to perform this action"): HttpError {
    return new HttpError(403, message);
  }

  static notFound(message = "Resource not found"): HttpError {
    return new HttpError(404, message);
  }

  static conflict(message: string): HttpError {
    return new HttpError(409, message);
  }

  static payloadTooLarge(message = "Payload too large"): HttpError {
    return new HttpError(413, message);
  }

  static tooManyRequests(message = "Too many requests, please try again later"): HttpError {
    return new HttpError(429, message);
  }

  static serviceUnavailable(message: string): HttpError {
    return new HttpError(503, message);
  }

  static badGateway(message: string): HttpError {
    return new HttpError(502, message);
  }
}
