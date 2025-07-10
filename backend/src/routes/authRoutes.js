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

const router = new Router();

router.get('/uri', asyncHandler(authUri));
router.get('/callback', asyncHandler(callback));
router.post('/login', asyncHandler(login));
router.post('/register', isAuthenticated, isAdmin, asyncHandler(register));
router.delete('/delete/:userId', isAuthenticated, isSelfOrAdmin, asyncHandler(deleteUser));
router.put('/update/:userId', isAuthenticated, isSelfOrAdmin, asyncHandler(updateUser));
router.get('/users', isAuthenticated, isAdmin, asyncHandler(getAllUsers));
router.delete('/disconnect', isAuthenticated, asyncHandler(disconnect));

export default router;
