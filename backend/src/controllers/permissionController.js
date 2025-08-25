import { permissionService } from '../services/permissionService.js';
import { auditService } from '../services/auditService.js';
import { AccessError } from '../middlewares/errorHandler.js';

// GET /permissions/company/:companyId
export async function getCompanyUserPermissions(req, res, next) {
  try {
    const { companyId } = req.params;
    const currentUserId = req.session.userId;
    const connectionType = req.session.connectionType;

    // Check if current user has access to view permissions
    const currentUserPermission = await permissionService.checkUserPermission(currentUserId, companyId, connectionType, 'admin');

    if (!currentUserPermission.hasAccess) {
      throw new AccessError('Insufficient permissions to view company user permissions');
    }

    const permissions = await permissionService.getCompanyUserPermissions(companyId);
    res.json(permissions);
  } catch (error) {
    next(error);
  }
}

// POST /permissions/user/:userId
export async function updateUserPermissions(req, res, next) {
  try {
    const { userId } = req.params;
    const { companyId, permissions } = req.body;
    const currentUserId = req.session.userId;

    // Check if current user can modify permissions
    const currentUserPermission = await permissionService.checkUserPermission(
      currentUserId, 
      companyId, 
      'qbo', 
      'admin'
    );

    if (!currentUserPermission.hasAccess) {
      throw new AccessError('Insufficient permissions to modify user permissions');
    }

    const updatedPermissions = await permissionService.grantUserPermission(
      userId, 
      companyId, 
      permissions
    );

    // Log the permission change
    await auditService.logApiCall({
      userId: currentUserId,
      companyId,
      apiEndpoint: 'update_user_permissions',
      connectionType: 'qbo',
      requestMethod: 'POST',
      responseStatus: 200,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json(updatedPermissions);
  } catch (error) {
    next(error);
  }
}

// DELETE /permissions/user/:userId
export async function revokeUserPermissions(req, res, next) {
  try {
    const { userId } = req.params;
    const { companyId } = req.body;
    const currentUserId = req.session.userId;

    // Check if current user can revoke permissions
    const currentUserPermission = await permissionService.checkUserPermission(
      currentUserId, 
      companyId, 
      'qbo', 
      'admin'
    );

    if (!currentUserPermission.hasAccess) {
      throw new AccessError('Insufficient permissions to revoke user permissions');
    }

    const revokedPermissions = await permissionService.revokeUserPermission(
      userId, 
      companyId
    );

    // Log the permission revocation
    await auditService.logApiCall({
      userId: currentUserId,
      companyId,
      apiEndpoint: 'revoke_user_permissions',
      connectionType: 'qbo',
      requestMethod: 'DELETE',
      responseStatus: 200,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'User permissions revoked successfully', revokedPermissions });
  } catch (error) {
    next(error);
  }
}

// GET /permissions/audit/:companyId
export async function getCompanyAuditLogs(req, res, next) {
  try {
    const { companyId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    const currentUserId = req.session.userId;

    // Check if current user has access to view audit logs
    const currentUserPermission = await permissionService.checkUserPermission(
      currentUserId, 
      companyId, 
      'qbo', 
      'admin'
    );

    if (!currentUserPermission.hasAccess) {
      throw new AccessError('Insufficient permissions to view audit logs');
    }

    const auditLogs = await auditService.getCompanyAuditLogs(
      companyId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json(auditLogs);
  } catch (error) {
    next(error);
  }
}

// GET /permissions/health/:companyId
export async function getConnectionHealth(req, res, next) {
  try {
    const { companyId } = req.params;
    const currentUserId = req.session.userId;

    // Check if current user has access to view connection health
    const currentUserPermission = await permissionService.checkUserPermission(
      currentUserId, 
      companyId, 
      'qbo', 
      'read'
    );

    if (!currentUserPermission.hasAccess) {
      throw new AccessError('Insufficient permissions to view connection health');
    }

    const health = await auditService.getConnectionHealth(companyId);
    res.json(health);
  } catch (error) {
    next(error);
  }
}

// GET /permissions/user-audit/:userId
export async function getUserAuditLogs(req, res, next) {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const currentUserId = req.session.userId;

    // Users can only view their own audit logs or admins can view any
    if (currentUserId !== userId) {
      // Check if current user is admin for the company
      const currentUser = await permissionService.checkUserPermission(
        currentUserId, 
        req.session.companyId, 
        'qbo', 
        'admin'
      );

      if (!currentUser.isAdmin) {
        throw new AccessError('Insufficient permissions to view other user audit logs');
      }
    }

    const auditLogs = await auditService.getUserAuditLogs(
      userId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json(auditLogs);
  } catch (error) {
    next(error);
  }
}
