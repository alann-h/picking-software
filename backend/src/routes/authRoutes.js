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
import { validate, loginRules, registerRules, updateUserRules, userIdRules } from '../validators/authValidator.js';

const router = new Router();

router.get('/uri', asyncHandler(authUri));
router.get('/callback', asyncHandler(callback));
router.post('/login', loginRules(), validate , asyncHandler(login));

router.use(isAuthenticated);

router.post('/register', isAdmin, registerRules(), validate, asyncHandler(register));
router.delete('/delete/:userId', isSelfOrAdmin, userIdRules(), validate, asyncHandler(deleteUser));
router.put('/update/:userId', isSelfOrAdmin, updateUserRules(), validate, asyncHandler(updateUser));
router.get('/users', isAdmin, asyncHandler(getAllUsers));
router.delete('/disconnect', asyncHandler(disconnect));

export default router;
