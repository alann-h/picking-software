import { permissionService } from '../services/permissionService.js';
import { auditService } from '../services/auditService.js';
import { AccessError } from '../middlewares/errorHandler.js';
import { Request, Response, NextFunction } from 'express';

// GET /permissions/company/:companyId
export async function getCompanyUserPermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.params;
    const currentUserId = req.session.userId;
    const connectionType = req.session.connectionType;

    if (!currentUserId || !connectionType) {
      throw new AccessError('User session not found or connection type is missing.');
    }

    // Check if current user has access to view permissions
    const currentUserPermission = await permissionService.checkUserPermission(currentUserId, companyId, 'admin');

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
export async function updateUserPermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    console.log('Updating user permissions:', userId);
    const { companyId, permissions } = req.body;
    const currentUserId = req.session.userId;

    if (!currentUserId) {
      throw new AccessError('User session not found.');
    }

    if (typeof companyId !== 'string') {
      throw new AccessError('Company ID is required.');
    }

    // Check if current user can modify permissions (admin level required)
    const currentUserPermission = await permissionService.checkUserPermission(
      currentUserId,
      companyId,
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
      ipAddress: req.ip || 'N/A',
      userAgent: req.headers['user-agent'] || 'N/A'
    });

    res.json(updatedPermissions);
  } catch (error) {
    next(error);
  }
}

// DELETE /permissions/user/:userId
export async function revokeUserPermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const { companyId } = req.body;
    const currentUserId = req.session.userId;

    if (!currentUserId) {
      throw new AccessError('User session not found.');
    }

    if (typeof companyId !== 'string') {
      throw new AccessError('Company ID is required.');
    }

    // Check if current user can revoke permissions
    const currentUserPermission = await permissionService.checkUserPermission(
      currentUserId,
      companyId,
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
      ipAddress: req.ip || 'N/A',
      userAgent: req.headers['user-agent'] || 'N/A'
    });

    res.json({ message: 'User permissions revoked successfully', revokedPermissions });
  } catch (error) {
    next(error);
  }
}

// GET /permissions/audit/:companyId
export async function getCompanyAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.params;
    const { limit = '100', offset = '0' } = req.query as { limit?: string, offset?: string };
    const currentUserId = req.session.userId;

    if (!currentUserId) {
      throw new AccessError('User session not found.');
    }

    // Check if current user has access to view audit logs
    const currentUserPermission = await permissionService.checkUserPermission(
      currentUserId,
      companyId,
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
export async function getConnectionHealth(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.params;
    const currentUserId = req.session.userId;

    if (!currentUserId) {
      throw new AccessError('User session not found.');
    }

    // Check if current user has access to view connection health
    const currentUserPermission = await permissionService.checkUserPermission(
      currentUserId,
      companyId,
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
export async function getUserAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const { limit = '50', offset = '0' } = req.query as { limit?: string, offset?: string };
    const currentUserId = req.session.userId;
    const companyId = req.session.companyId;

    if (!currentUserId || !companyId) {
      throw new AccessError('User session not found or company ID is missing.');
    }

    // Users can only view their own audit logs or admins can view any
    if (currentUserId !== userId) {
      // Check if current user is admin for the company
      const currentUser = await permissionService.checkUserPermission(
        currentUserId,
        companyId,
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
