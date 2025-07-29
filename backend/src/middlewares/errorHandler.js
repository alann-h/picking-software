export class HttpError extends Error {
  constructor (message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class InputError extends HttpError {
  constructor (message) {
    super(message, 400); // Bad Request
  }
}

export class NotFoundError extends HttpError {
  constructor (message) {
    super(message, 404); // Not Found
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

export default (err, req, res, _next) => {
  console.error(err);
  res
    .status(err.statusCode || 500)
    .json({ error: err.message || 'Internal Server Error' });
};
