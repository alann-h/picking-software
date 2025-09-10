import { query } from '../helpers.js';
import {
    LogSecurityEventData,
    IncrementFailedAttemptsResult,
    AccountLockoutStatus,
    SecurityStats
} from '../types/security.js';

export async function logSecurityEvent(eventData: LogSecurityEventData): Promise<void> {
  const {
    userId,
    email,
    event,
    ipAddress,
    userAgent,
    timestamp,
    metadata = {}
  } = eventData;

  try {
    await query(`
      INSERT INTO security_events (
        user_id, 
        email, 
        event_type, 
        ip_address, 
        user_agent, 
        timestamp, 
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      userId || null,
      email || null,
      event,
      ipAddress || null,
      userAgent || null,
      timestamp,
      JSON.stringify(metadata)
    ]);
  } catch (error: any) {
    console.error('Failed to log security event:', error);
    throw error;
  }
}

export async function incrementFailedAttempts(email: string, ipAddress: string | null = null, userAgent: string | null = null): Promise<IncrementFailedAttemptsResult | null> {
  try {
    const result: IncrementFailedAttemptsResult[] = await query(`
      UPDATE users 
      SET 
        failed_attempts = COALESCE(failed_attempts, 0) + 1,
        last_failed_attempt = NOW(),
        locked_until = CASE 
          WHEN COALESCE(failed_attempts, 0) + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
          ELSE locked_until 
        END
      WHERE normalised_email = $1
      RETURNING failed_attempts, locked_until
    `, [email]);

    if (result.length > 0) {
      const { failed_attempts, locked_until } = result[0];
      
      await logSecurityEvent({
        email,
        event: 'login_failure',
        ipAddress: ipAddress,
        userAgent: userAgent,
        timestamp: new Date(),
        metadata: {
          failedAttempts: failed_attempts,
          lockedUntil: locked_until,
          isLocked: locked_until ? locked_until > new Date() : false,
          reason: 'Invalid credentials'
        }
      });

      return { failed_attempts, locked_until };
    }
    
    return null;
  } catch (error: any) {
    console.error('Failed to increment failed attempts:', error);
    throw error;
  }
}

export async function isAccountLocked(email: string): Promise<AccountLockoutStatus> {
  try {
    const result: { failed_attempts: number, locked_until: Date | null, is_locked: boolean }[] = await query(`
      SELECT 
        failed_attempts,
        locked_until,
        CASE 
          WHEN locked_until > NOW() THEN true
          ELSE false
        END as is_locked
      FROM users 
      WHERE normalised_email = $1
    `, [email]);

    if (result.length > 0) {
      const { failed_attempts, locked_until, is_locked } = result[0];
      
      if (is_locked && locked_until && locked_until <= new Date()) {
        await query(`
          UPDATE users 
          SET locked_until = NULL 
          WHERE normalised_email = $1
        `, [email]);
        
        return { isLocked: false, failedAttempts: failed_attempts };
      }
      
      return { 
        isLocked: is_locked, 
        failedAttempts: failed_attempts,
        lockedUntil: locked_until,
        remainingAttempts: Math.max(0, 5 - failed_attempts)
      };
    }
    
    return { isLocked: false, failedAttempts: 0, remainingAttempts: 5 };
  } catch (error: any) {
    console.error('Failed to check account lock status:', error);
    throw error;
  }
}

export async function resetFailedAttempts(email: string): Promise<void> {
  try {
    await query(`
      UPDATE users 
      SET 
        failed_attempts = 0,
        locked_until = NULL,
        last_failed_attempt = NULL
      WHERE normalised_email = $1
    `, [email]);
  } catch (error: any) {
    console.error('Failed to reset failed attempts:', error);
    throw error;
  }
}

export async function getSecurityStats(): Promise<SecurityStats> {
  try {
    const statsResult: SecurityStats['summary'][] = await query(`
      SELECT 
        COUNT(*)::text as total_events,
        COUNT(CASE WHEN event_type = 'login_success' THEN 1 END)::text as successful_logins,
        COUNT(CASE WHEN event_type = 'login_failure' THEN 1 END)::text as failed_logins,
        COUNT(CASE WHEN timestamp > NOW() - INTERVAL '24 hours' THEN 1 END)::text as events_last_24h
      FROM security_events
    `, []);

    const recentEventsResult: SecurityStats['recentEvents'] = await query(`
      SELECT 
        event_type,
        ip_address,
        timestamp,
        metadata
      FROM security_events 
      WHERE timestamp > NOW() - INTERVAL '1 hour'
      ORDER BY timestamp DESC
      LIMIT 50
    `, []);

    return {
      summary: statsResult[0],
      recentEvents: recentEventsResult
    };
  } catch (error: any) {
    console.error('Failed to get security stats:', error);
    throw error;
  }
}
