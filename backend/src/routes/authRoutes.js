// src/routes/authRoutes.js
import { Router } from 'express';
import asyncHandler from '../middlewares/asyncHandler.js';
import {
  authUri,
  callback,
  login,
  register,
  deleteUser,
  updateUser,
  getAllUsers,
  disconnect
} from '../controllers/authController.js';
import { isAuthenticated, isSelfOrAdmin, isAdmin } from '../middlewares/authMiddleware.js';
import { validate, loginRules, registerRules, updateUserRules, userIdRules } from '../authValidator.js';

const router = new Router();

router.get('/uri', asyncHandler(authUri));
router.get('/callback', asyncHandler(callback));
router.post('/login',loginRules(), validate ,asyncHandler(login));
router.post('/register', isAuthenticated, isAdmin, registerRules, validate, asyncHandler(register));
router.delete('/delete/:userId', isAuthenticated, isSelfOrAdmin, userIdRules, validate, asyncHandler(deleteUser));
router.put('/update/:userId', isAuthenticated, isSelfOrAdmin, updateUserRules, validate, asyncHandler(updateUser));
router.get('/users', isAuthenticated, isAdmin, asyncHandler(getAllUsers));
router.delete('/disconnect', isAuthenticated, asyncHandler(disconnect));

export default router;
