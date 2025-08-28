import { query } from '../helpers.js';
import { AccessError } from '../middlewares/errorHandler.js';

class PermissionService {
  /**
   * Check if a user has permission to perform operations at a specific access level
   */
  async checkUserPermission(userId, companyId, requiredLevel = 'read') {
    try {
      const result = await query(`
        SELECT up.*, u.is_admin 
        FROM user_permissions up
        JOIN users u ON up.user_id = u.id
        WHERE up.user_id = $1 AND up.company_id = $2
      `, [userId, companyId]);

      if (result.length === 0) {
        // Check if user is admin for this company
        const adminCheck = await query(`
          SELECT is_admin FROM users 
          WHERE id = $1 AND company_id = $2
        `, [userId, companyId]);

        if (adminCheck.length > 0 && adminCheck[0].is_admin) {
          return { hasAccess: true, level: 'admin', isAdmin: true };
        }
        return { hasAccess: false, level: 'none', isAdmin: false };
      }

      const permission = result[0];
      
      // Check access level
      const accessLevels = { 'read': 1, 'write': 2, 'admin': 3 };
      const requiredLevelNum = accessLevels[requiredLevel] || 1;
      const userLevelNum = accessLevels[permission.access_level] || 1;

      return {
        hasAccess: userLevelNum >= requiredLevelNum,
        level: permission.access_level,
        isAdmin: permission.is_admin
      };
    } catch (error) {
      console.error('Error checking user permission:', error);
      throw new AccessError('Failed to verify user permissions');
    }
  }

  /**
   * Grant permissions to a user for a company
   */
  async grantUserPermission(userId, companyId, permissions) {
    try {
      const {
        accessLevel = 'read'
      } = permissions;

      const result = await query(`
        INSERT INTO user_permissions 
        (user_id, company_id, access_level)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, company_id) 
        DO UPDATE SET
          access_level = EXCLUDED.access_level,
          updated_at = NOW()
        RETURNING *
      `, [userId, companyId, accessLevel]);

      return result[0];
    } catch (error) {
      console.error('Error granting user permission:', error);
      throw new AccessError('Failed to grant user permissions');
    }
  }

  /**
   * Revoke all permissions for a user in a company
   */
  async revokeUserPermission(userId, companyId) {
    try {
      const result = await query(`
        DELETE FROM user_permissions 
        WHERE user_id = $1 AND company_id = $2
        RETURNING *
      `, [userId, companyId]);

      return result[0];
    } catch (error) {
      console.error('Error revoking user permission:', error);
      throw new AccessError('Failed to revoke user permissions');
    }
  }

  /**
   * Get all users and their permissions for a company
   */
  async getCompanyUserPermissions(companyId) {
    try {
      const result = await query(`
        SELECT 
          u.id, u.display_email, u.given_name, u.family_name, u.is_admin,
          up.access_level,
          up.created_at as permission_created_at
        FROM users u
        LEFT JOIN user_permissions up ON u.id = up.user_id AND up.company_id = $1
        WHERE u.company_id = $1
        ORDER BY u.created_at
      `, [companyId]);
      return result;
    } catch (error) {
      console.error('Error getting company user permissions:', error);
      throw new AccessError('Failed to retrieve user permissions');
    }
  }

  /**
   * Set default permissions for a new user in a company
   */
  async setDefaultPermissions(userId, companyId, isAdmin = false) {
    try {
      const defaultPermissions = {
        accessLevel: isAdmin ? 'admin' : 'read'
      };

      return await this.grantUserPermission(userId, companyId, defaultPermissions);
    } catch (error) {
      console.error('Error setting default permissions:', error);
      throw new AccessError('Failed to set default permissions');
    }
  }
}

export const permissionService = new PermissionService();
export default permissionService;
