import express from 'express';
import { isAuthenticated, isAdmin } from '../middlewares/authMiddleware.js';
import {
  getCompanyUserPermissions,
  updateUserPermissions,
  revokeUserPermissions,
  getCompanyAuditLogs,
  getConnectionHealth,
  getUserAuditLogs
} from '../controllers/permissionController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

router.get('/company/:companyId', isAdmin, getCompanyUserPermissions);
router.post('/user/:userId', isAdmin, updateUserPermissions);
router.delete('/user/:userId', isAdmin, revokeUserPermissions);

router.get('/audit/:companyId', isAdmin, getCompanyAuditLogs);
router.get('/health/:companyId', isAdmin, getConnectionHealth);
router.get('/user-audit/:userId', isAdmin, getUserAuditLogs);

export default router;
