import { query } from '../helpers.js';

/**
 * Log security events for audit and monitoring
 */
export async function logSecurityEvent(eventData) {
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
      ipAddress,
      userAgent,
      timestamp,
      JSON.stringify(metadata)
    ]);
  } catch (error) {
    console.error('Failed to log security event:', error);
    throw error;
  }
}

/**
 * Increment failed login attempts for an account
 */
export async function incrementFailedAttempts(email, ipAddress = null, userAgent = null) {
  try {
    const result = await query(`
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
      
      // Log the failed attempt with proper context
      await logSecurityEvent({
        email,
        event: 'LOGIN_FAILED',
        ipAddress: ipAddress,
        userAgent: userAgent,
        timestamp: new Date(),
        metadata: {
          failedAttempts: failed_attempts,
          lockedUntil: locked_until,
          isLocked: locked_until > new Date(),
          reason: 'Invalid credentials'
        }
      });

      return { failed_attempts, locked_until };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to increment failed attempts:', error);
    throw error;
  }
}

/**
 * Check if account is locked
 */
export async function isAccountLocked(email) {
  try {
    const result = await query(`
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
      
      // Auto-unlock if lockout period has expired
      if (is_locked && locked_until <= new Date()) {
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
  } catch (error) {
    console.error('Failed to check account lock status:', error);
    throw error;
  }
}

/**
 * Reset failed attempts after successful login
 */
export async function resetFailedAttempts(email) {
  try {
    await query(`
      UPDATE users 
      SET 
        failed_attempts = 0,
        locked_until = NULL,
        last_failed_attempt = NULL
      WHERE normalised_email = $1
    `, [email]);
  } catch (error) {
    console.error('Failed to reset failed attempts:', error);
    throw error;
  }
}

/**
 * Get security statistics for monitoring
 */
export async function getSecurityStats() {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_type = 'LOGIN_SUCCESS' THEN 1 END) as successful_logins,
        COUNT(CASE WHEN event_type = 'LOGIN_FAILED' THEN 1 END) as failed_logins,
        COUNT(CASE WHEN timestamp > NOW() - INTERVAL '24 hours' THEN 1 END) as events_last_24h
      FROM security_events
    `);

    const recentEvents = await query(`
      SELECT 
        event_type,
        ip_address,
        timestamp,
        metadata
      FROM security_events 
      WHERE timestamp > NOW() - INTERVAL '1 hour'
      ORDER BY timestamp DESC
      LIMIT 50
    `);

    return {
      summary: stats[0],
      recentEvents: recentEvents.rows
    };
  } catch (error) {
    console.error('Failed to get security stats:', error);
    throw error;
  }
}
