import { prisma } from '../lib/prisma.js';
import { AccessError } from '../middlewares/errorHandler.js';
import { 
    AccessLevel,
    UserPermission,
    CheckPermissionResult,
    GrantPermissionArgs,
    CompanyUserPermission
} from '../types/permissions.js';

class PermissionService {
  /**
   * Check if a user has permission to perform operations at a specific access level
   */
  async checkUserPermission(userId: string, companyId: string, requiredLevel: AccessLevel = 'read'): Promise<CheckPermissionResult> {
    try {
      // First check if user has explicit permissions
      const userPermission = await prisma.userPermission.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
        include: {
          user: {
            select: { isAdmin: true },
          },
        },
      });

      if (userPermission) {
        // User has explicit permissions
        const accessLevels: Record<AccessLevel, number> = { 'read': 1, 'write': 2, 'admin': 3 };
        const requiredLevelNum = accessLevels[requiredLevel] || 1;
        const userLevelNum = accessLevels[userPermission.accessLevel] || 1;

        return {
          hasAccess: userLevelNum >= requiredLevelNum,
          level: userPermission.accessLevel,
          isAdmin: userPermission.user.isAdmin,
        };
      }

      // No explicit permissions, check if user is admin for this company
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          isAdmin: true,
          companyId: true,
        },
      });

      if (user && user.companyId === companyId && user.isAdmin) {
        return { hasAccess: true, level: 'admin', isAdmin: true };
      }

      return { hasAccess: false, level: 'none', isAdmin: false };
    } catch (error: unknown) {
      console.error('Error checking user permission:', error);
      throw new AccessError('Failed to verify user permissions');
    }
  }

  /**
   * Grant permissions to a user for a company
   */
  async grantUserPermission(userId: string, companyId: string, permissions: GrantPermissionArgs): Promise<UserPermission> {
    try {
      const {
        accessLevel = 'read'
      } = permissions;

      const userPermission = await prisma.userPermission.upsert({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
        update: {
          accessLevel,
        },
        create: {
          userId,
          companyId,
          accessLevel,
        },
      });

      // Sync is_admin flag on User table based on access level
      // If access level is 'admin', set is_admin to true, otherwise false
      await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          isAdmin: accessLevel === 'admin',
        },
      });

      return {
        id: userPermission.id,
        user_id: userPermission.userId,
        company_id: userPermission.companyId,
        access_level: userPermission.accessLevel,
        created_at: userPermission.createdAt,
        updated_at: userPermission.updatedAt,
      };
    } catch (error: unknown) {
      console.error('Error granting user permission:', error);
      throw new AccessError('Failed to grant user permissions');
    }
  }

  /**
   * Revoke all permissions for a user in a company
   */
  async revokeUserPermission(userId: string, companyId: string): Promise<UserPermission> {
    try {
      const userPermission = await prisma.userPermission.delete({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
      });

      return {
        id: userPermission.id,
        user_id: userPermission.userId,
        company_id: userPermission.companyId,
        access_level: userPermission.accessLevel,
        created_at: userPermission.createdAt,
        updated_at: userPermission.updatedAt,
      };
    } catch (error: unknown) {
      if (error instanceof Object && 'code' in error && error.code === 'P2025') {
        // Prisma error for record not found
        throw new AccessError('User permission not found');
      }
      console.error('Error revoking user permission:', error);
      throw new AccessError('Failed to revoke user permissions');
    }
  }

  /**
   * Get all users and their permissions for a company
   */
  async getCompanyUserPermissions(companyId: string): Promise<CompanyUserPermission[]> {
    try {
      const users = await prisma.user.findMany({
        where: { companyId },
        include: {
          userPermissions: {
            where: { companyId },
            select: {
              accessLevel: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return users.map(user => {
        const permission = user.userPermissions[0]; // Should be at most one permission per company
        return {
          id: user.id,
          display_email: user.displayEmail,
          given_name: user.givenName,
          family_name: user.familyName,
          is_admin: user.isAdmin,
          access_level: permission?.accessLevel || null,
          permission_created_at: permission?.createdAt || null,
        };
      });
    } catch (error: unknown) {
      console.error('Error getting company user permissions:', error);
      throw new AccessError('Failed to retrieve user permissions');
    }
  }

  /**
   * Set default permissions for a new user in a company
   */
  async setDefaultPermissions(userId: string, companyId: string, isAdmin: boolean = false): Promise<UserPermission> {
    try {
      const defaultPermissions: GrantPermissionArgs = {
        accessLevel: isAdmin ? 'admin' : 'read'
      };

      return await this.grantUserPermission(userId, companyId, defaultPermissions);
    } catch (error: unknown) {
      console.error('Error setting default permissions:', error);
      throw new AccessError('Failed to set default permissions');
    }
  }
}

export const permissionService = new PermissionService();
export default permissionService;
