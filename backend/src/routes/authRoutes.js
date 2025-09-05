// src/routes/authRoutes.js
import { Router } from 'express';
import asyncHandler from '../middlewares/asyncHandler.js';
import {
  qboAuthUri,
  xeroAuthUri,
  callback,
  login,
  register,
  deleteUser,
  updateUser,
  getAllUsers,
  disconnect,
  logout,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import { isAuthenticated, isSelfOrAdmin, isAdmin } from '../middlewares/authMiddleware.js';
import { validate, loginRules, registerRules, updateUserRules, userIdRules, forgotPasswordRules, resetPasswordRules } from '../validators/authValidator.js';

const router = new Router();

router.get('/qbo-uri', asyncHandler(qboAuthUri));
router.get('/xero-uri', asyncHandler(xeroAuthUri));
router.get('/qbo-callback', asyncHandler(callback));
router.get('/xero-callback', asyncHandler(callback));
router.post('/login', loginRules(), validate , asyncHandler(login));
router.post('/logout', asyncHandler(logout));
router.post('/forgot-password', forgotPasswordRules(), validate, asyncHandler(forgotPassword));
router.post('/reset-password', resetPasswordRules(), validate, asyncHandler(resetPassword));

router.use(isAuthenticated);

router.post('/register', isAdmin, registerRules(), validate, asyncHandler(register));
router.delete('/delete/:userId', isSelfOrAdmin, userIdRules(), validate, asyncHandler(deleteUser));
router.put('/update/:userId', isSelfOrAdmin, updateUserRules(), validate, asyncHandler(updateUser));
router.get('/users', isAdmin, asyncHandler(getAllUsers));
router.delete('/disconnect', asyncHandler(disconnect));

export default router;
