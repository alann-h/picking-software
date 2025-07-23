export class HttpError extends Error {
  constructor (message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class AuthenticationError extends HttpError {
  constructor (message) {
    super(message, 401); // Unauthorised
  }
}

export class AccessError extends HttpError {
  constructor (message) {
    super(message, 403); // Forbidden
  }
}
