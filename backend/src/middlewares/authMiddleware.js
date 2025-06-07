import { decryptToken } from '../helpers.js';

export const isAuthenticated = (req, res, next) => {
  if (!req.session.token) {
    return res.status(401).json({ error: 'Please log in.' });
  }
  next();
};

export const decryptSessionToken = (req, res, next) => {
  if (req.session.token) {
    try {
      req.decryptedToken = decryptToken(req.session.token);
    } catch {
      return res.status(400).json({ error: 'Invalid session token' });
    }
  }
  next();
};
