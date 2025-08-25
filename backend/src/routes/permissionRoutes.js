import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
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
router.use(authMiddleware);

// Company user permissions
router.get('/company/:companyId', getCompanyUserPermissions);
router.post('/user/:userId', updateUserPermissions);
router.delete('/user/:userId', revokeUserPermissions);

// Audit and monitoring
router.get('/audit/:companyId', getCompanyAuditLogs);
router.get('/health/:companyId', getConnectionHealth);
router.get('/user-audit/:userId', getUserAuditLogs);

export default router;
