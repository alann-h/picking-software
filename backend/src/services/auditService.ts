import { prisma } from '../lib/prisma.js';

interface LogApiCallData {
  userId: string;
  companyId: string;
  apiEndpoint: string;
  connectionType: string;
  requestMethod?: string;
  responseStatus: number;
  errorMessage?: string | null;
  ipAddress: string;
  userAgent: string;
}

type ConnectionStatus = 'healthy' | 'expired' | 'revoked' | 'warning';

interface ConnectionHealth {
    id: string;
    company_id: string;
    connection_type: string;
    status: ConnectionStatus;
    last_check: Date;
    last_successful_call: Date | null;
    failure_count: number;
    last_error_message: string | null;
    next_check_due: Date;
    created_at: Date;
    updated_at: Date;
}

interface ApiAuditLog {
    id: string;
    user_id: string | null;
    company_id: string;
    api_endpoint: string;
    connection_type: string;
    request_method: string;
    response_status: number;
    error_message: string | null;
    ip_address: string;
    user_agent: string;
    timestamp: Date;
}

interface CompanyAuditLog extends ApiAuditLog {
    display_email: string | null;
    given_name: string | null;
    family_name: string | null;
}

class AuditService {
  /**
   * Log an API call for auditing purposes
   */
  async logApiCall(auditData: LogApiCallData): Promise<{ id: string } | undefined> {
    try {
      const {
        userId = null,
        companyId,
        apiEndpoint,
        connectionType,
        requestMethod = 'GET',
        responseStatus,
        errorMessage = null,
        ipAddress,
        userAgent
      } = auditData;

      const createData: any = {
        companyId,
        apiEndpoint,
        connectionType: connectionType as any,
        requestMethod,
        responseStatus,
        errorMessage,
        ipAddress,
        userAgent,
      };
      
      if (userId) {
        createData.userId = userId;
      }

      const result = await prisma.apiAuditLog.create({
        data: createData,
        select: { id: true },
      });

      return result;
    } catch (error) {
      console.error('Error logging API call:', error);
      // Don't throw error as this is not critical to the main flow
    }
  }

  /**
   * Update connection health status
   */
  async updateConnectionHealth(companyId: string, connectionType: string, status: ConnectionStatus, errorMessage: string | null = null): Promise<ConnectionHealth | undefined> {
    try {
      const now = new Date();
      let nextCheckDue = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour default

      // Adjust check frequency based on status
      if (status === 'expired' || status === 'revoked') {
        nextCheckDue = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
      } else if (status === 'warning') {
        nextCheckDue = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
      }

      const result = await prisma.connectionHealth.upsert({
        where: {
          companyId_connectionType: {
            companyId,
            connectionType: connectionType as any,
          },
        },
        create: {
          companyId,
          connectionType: connectionType as any,
          status,
          lastCheck: now,
          lastSuccessfulCall: status === 'healthy' ? now : null,
          failureCount: status === 'healthy' ? 0 : 1,
          lastErrorMessage: errorMessage,
          nextCheckDue,
        },
        update: {
          status,
          lastCheck: now,
          lastSuccessfulCall: status === 'healthy' ? now : undefined,
          failureCount: status === 'healthy' ? 0 : { increment: 1 },
          lastErrorMessage: errorMessage,
          nextCheckDue,
        },
      });

      return {
        id: result.id,
        company_id: result.companyId,
        connection_type: result.connectionType,
        status: result.status as ConnectionStatus,
        last_check: result.lastCheck,
        last_successful_call: result.lastSuccessfulCall,
        failure_count: result.failureCount,
        last_error_message: result.lastErrorMessage,
        next_check_due: result.nextCheckDue,
        created_at: result.createdAt,
        updated_at: result.updatedAt,
      };
    } catch (error) {
      console.error('Error updating connection health:', error);
    }
  }

  /**
   * Get connection health for a company
   */
  async getConnectionHealth(companyId: string): Promise<ConnectionHealth[]> {
    try {
      const results = await prisma.connectionHealth.findMany({
        where: { companyId },
        orderBy: { connectionType: 'asc' },
      });

      return results.map(result => ({
        id: result.id,
        company_id: result.companyId,
        connection_type: result.connectionType,
        status: result.status as ConnectionStatus,
        last_check: result.lastCheck,
        last_successful_call: result.lastSuccessfulCall,
        failure_count: result.failureCount,
        last_error_message: result.lastErrorMessage,
        next_check_due: result.nextCheckDue,
        created_at: result.createdAt,
        updated_at: result.updatedAt,
      }));
    } catch (error) {
      console.error('Error getting connection health:', error);
      return [];
    }
  }

  /**
   * Get API audit logs for a company
   */
  async getCompanyAuditLogs(companyId: string, limit = 100, offset = 0): Promise<CompanyAuditLog[]> {
    try {
      const results = await prisma.apiAuditLog.findMany({
        where: { companyId },
        include: {
          user: {
            select: {
              displayEmail: true,
              givenName: true,
              familyName: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });

      return results.map(result => ({
        id: result.id,
        user_id: result.userId,
        company_id: result.companyId,
        api_endpoint: result.apiEndpoint,
        connection_type: result.connectionType,
        request_method: result.requestMethod,
        response_status: result.responseStatus!,
        error_message: result.errorMessage,
        ip_address: result.ipAddress!,
        user_agent: result.userAgent!,
        timestamp: result.timestamp,
        display_email: result.user?.displayEmail || null,
        given_name: result.user?.givenName || null,
        family_name: result.user?.familyName || null,
      }));
    } catch (error) {
      console.error('Error getting company audit logs:', error);
      return [];
    }
  }

  /**
   * Get user-specific audit logs
   */
  async getUserAuditLogs(userId: string, limit = 50, offset = 0): Promise<ApiAuditLog[]> {
    try {
      const results = await prisma.apiAuditLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });

      return results.map(result => ({
        id: result.id,
        user_id: result.userId,
        company_id: result.companyId,
        api_endpoint: result.apiEndpoint,
        connection_type: result.connectionType,
        request_method: result.requestMethod,
        response_status: result.responseStatus!,
        error_message: result.errorMessage,
        ip_address: result.ipAddress!,
        user_agent: result.userAgent!,
        timestamp: result.timestamp,
      }));
    } catch (error) {
      console.error('Error getting user audit logs:', error);
      return [];
    }
  }

  /**
   * Get failed API calls for monitoring
   */
  async getFailedApiCalls(companyId: string, hours = 24): Promise<CompanyAuditLog[]> {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const results = await prisma.apiAuditLog.findMany({
        where: {
          companyId,
          responseStatus: { gte: 400 },
          timestamp: { gte: cutoffTime },
        },
        include: {
          user: {
            select: {
              displayEmail: true,
              givenName: true,
              familyName: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      return results.map(result => ({
        id: result.id,
        user_id: result.userId,
        company_id: result.companyId,
        api_endpoint: result.apiEndpoint,
        connection_type: result.connectionType,
        request_method: result.requestMethod,
        response_status: result.responseStatus!,
        error_message: result.errorMessage,
        ip_address: result.ipAddress!,
        user_agent: result.userAgent!,
        timestamp: result.timestamp,
        display_email: result.user?.displayEmail || null,
        given_name: result.user?.givenName || null,
        family_name: result.user?.familyName || null,
      }));
    } catch (error) {
      console.error('Error getting failed API calls:', error);
      return [];
    }
  }

  /**
   * Clean up old audit logs (keep last 90 days)
   */
  async cleanupOldAuditLogs(): Promise<any> {
    try {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
      
      const result = await prisma.apiAuditLog.deleteMany({
        where: {
          timestamp: { lt: cutoffDate },
        },
      });

      return result;
    } catch (error) {
      console.error('Error cleaning up old audit logs:', error);
    }
  }
}

export const auditService = new AuditService();
export default auditService;
