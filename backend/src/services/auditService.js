import { query } from '../helpers.js';

class AuditService {
  /**
   * Log an API call for auditing purposes
   */
  async logApiCall(auditData) {
    try {
      const {
        userId,
        companyId,
        apiEndpoint,
        connectionType,
        requestMethod = 'GET',
        responseStatus,
        errorMessage,
        ipAddress,
        userAgent
      } = auditData;

      const result = await query(`
        INSERT INTO api_audit_log 
        (user_id, company_id, api_endpoint, connection_type, request_method, response_status, error_message, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [userId, companyId, apiEndpoint, connectionType, requestMethod, responseStatus, errorMessage, ipAddress, userAgent]);

      return result[0];
    } catch (error) {
      console.error('Error logging API call:', error);
      // Don't throw error as this is not critical to the main flow
    }
  }

  /**
   * Update connection health status
   */
  async updateConnectionHealth(companyId, connectionType, status, errorMessage = null) {
    try {
      const now = new Date();
      let nextCheckDue = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour default

      // Adjust check frequency based on status
      if (status === 'expired' || status === 'revoked') {
        nextCheckDue = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
      } else if (status === 'warning') {
        nextCheckDue = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
      }

      const result = await query(`
        INSERT INTO connection_health 
        (company_id, connection_type, status, last_check, last_successful_call, failure_count, last_error_message, next_check_due)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (company_id, connection_type) 
        DO UPDATE SET
          status = EXCLUDED.status,
          last_check = EXCLUDED.last_check,
          last_successful_call = CASE 
            WHEN EXCLUDED.status = 'healthy' THEN EXCLUDED.last_check 
            ELSE connection_health.last_successful_call 
          END,
          failure_count = CASE 
            WHEN EXCLUDED.status IN ('expired', 'revoked', 'warning') 
            THEN connection_health.failure_count + 1 
            ELSE 0 
          END,
          last_error_message = EXCLUDED.last_error_message,
          next_check_due = EXCLUDED.next_check_due,
          updated_at = NOW()
        RETURNING *
      `, [
        companyId, 
        connectionType, 
        status, 
        now,
        status === 'healthy' ? now : null,
        status === 'healthy' ? 0 : 1,
        errorMessage,
        nextCheckDue
      ]);

      return result[0];
    } catch (error) {
      console.error('Error updating connection health:', error);
    }
  }

  /**
   * Get connection health for a company
   */
  async getConnectionHealth(companyId) {
    try {
      const result = await query(`
        SELECT * FROM connection_health 
        WHERE company_id = $1 
        ORDER BY connection_type
      `, [companyId]);

      return result;
    } catch (error) {
      console.error('Error getting connection health:', error);
      return [];
    }
  }

  /**
   * Get API audit logs for a company
   */
  async getCompanyAuditLogs(companyId, limit = 100, offset = 0) {
    try {
      const result = await query(`
        SELECT 
          al.*,
          u.display_email,
          u.given_name,
          u.family_name
        FROM api_audit_log al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.company_id = $1
        ORDER BY al.timestamp DESC
        LIMIT $2 OFFSET $3
      `, [companyId, limit, offset]);

      return result;
    } catch (error) {
      console.error('Error getting company audit logs:', error);
      return [];
    }
  }

  /**
   * Get user-specific audit logs
   */
  async getUserAuditLogs(userId, limit = 50, offset = 0) {
    try {
      const result = await query(`
        SELECT * FROM api_audit_log 
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return result;
    } catch (error) {
      console.error('Error getting user audit logs:', error);
      return [];
    }
  }

  /**
   * Get failed API calls for monitoring
   */
  async getFailedApiCalls(companyId, hours = 24) {
    try {
      const result = await query(`
        SELECT 
          al.*,
          u.display_email,
          u.given_name,
          u.family_name
        FROM api_audit_log al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.company_id = $1 
          AND al.response_status >= 400
          AND al.timestamp >= NOW() - INTERVAL '${hours} hours'
        ORDER BY al.timestamp DESC
      `, [companyId]);

      return result;
    } catch (error) {
      console.error('Error getting failed API calls:', error);
      return [];
    }
  }

  /**
   * Clean up old audit logs (keep last 90 days)
   */
  async cleanupOldAuditLogs() {
    try {
      const result = await query(`
        DELETE FROM api_audit_log 
        WHERE timestamp < NOW() - INTERVAL '90 days'
      `);

      return result;
    } catch (error) {
      console.error('Error cleaning up old audit logs:', error);
    }
  }
}

export const auditService = new AuditService();
export default auditService;
