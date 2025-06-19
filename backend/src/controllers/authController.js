// src/controllers/authController.js
import * as authService from '../services/authService.js';
import { saveCompanyInfo, removeQuickBooksData } from '../services/companyService.js';
import { encryptToken } from '../helpers.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

// GET /auth/uri
export async function authUri(req, res, next) {
  try {
    const uri = await authService.getAuthUri();
    res.redirect(uri);
  } catch (err) {
    next(err);
  }
}

// GET /auth/callback
export async function callback(req, res, next) {
  try {
    const token = await authService.handleCallback(req.url);
    const companyInfo = await saveCompanyInfo(token);
    const user = await authService.saveUserQbButton(token, companyInfo.companyid);

    req.session.token = encryptToken(token);
    req.session.companyId = companyInfo.companyid;
    req.session.isAdmin = true;
    req.session.userId = user.id;

    req.session.save(err => {
      if (err) return next(err);
      const redirectUri =
        process.env.NODE_ENV === 'production'
          ? 'https://smartpicker.au/oauth/callback'
          : 'http://localhost:3000/oauth/callback';
      res.redirect(redirectUri);
    });
  } catch (err) {
    next(err);
  }
}

// POST /auth/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await authService.login(email, password);

    req.session.token = encryptToken(user.token);
    req.session.isAdmin = user.is_admin;
    req.session.userId = user.id;
    req.session.companyId = user.companyid;

    res.json(user);
  } catch (err) {
    next(err);
  }
}

// POST /auth/register
export async function register(req, res, next) {
  try {
    const { email, password, isAdmin, givenName, familyName } = req.body;
    const companyId = req.session.companyId;
    const newUser = await authService.register(
      email,
      password,
      isAdmin,
      givenName,
      familyName,
      companyId
    );
    res.json(newUser);
  } catch (err) {
    next(err);
  }
}

// DELETE /auth/delete/:userId
export async function deleteUser(req, res, next) {
  try {
    const { userId } = req.params;
    const sessionId = req.session.userId === userId ? req.session.id : null;
    const deleted = await authService.deleteUser(userId, sessionId);

    if (sessionId) {
      req.session.destroy(err => {
        if (err) return next(err);
        res.clearCookie('connect.sid');
        res.json(deleted);
      });
    } else {
      res.json(deleted);
    }
  } catch (err) {
    next(err);
  }
}

// PUT /auth/update/:userId
export async function updateUser(req, res, next) {
  try {
    const { userId } = req.params;
    const updated = await authService.updateUser(userId, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// GET /auth/users
export async function getAllUsers(req, res, next) {
  try {
    const users = await authService.getAllUsers(req.session.companyId);
    res.json(users);
  } catch (err) {
    next(err);
  }
}

// DELETE /auth/disconnect
export async function disconnect(req, res, next) {
  try {
    await authService.revokeQuickBooksToken(req.decryptedToken);
    await removeQuickBooksData(req.session.companyId);

    req.session.destroy(err => {
      if (err) return next(err);
      res.clearCookie('connect.sid');
      res.json({ message: 'Successfully disconnected from QuickBooks' });
    });
  } catch (err) {
    next(err);
  }
}
