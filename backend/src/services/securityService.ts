import { prisma } from '../lib/prisma.js';
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
    await prisma.securityEvent.create({
      data: {
        userId: userId || null,
        email: email || null,
        eventType: event,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        timestamp: timestamp,
        metadata: metadata,
      },
    });
  } catch (error: any) {
    console.error('Failed to log security event:', error);
    throw error;
  }
}

export async function incrementFailedAttempts(email: string, ipAddress: string | null = null, userAgent: string | null = null): Promise<IncrementFailedAttemptsResult | null> {
  try {
    // First, get the current user data
    const user = await prisma.user.findUnique({
      where: { normalisedEmail: email },
      select: { failedAttempts: true, lockedUntil: true },
    });

    if (!user) {
      return null;
    }

    const currentFailedAttempts = user.failedAttempts || 0;
    const newFailedAttempts = currentFailedAttempts + 1;
    
    // Calculate lockout time if needed
    const shouldLock = newFailedAttempts >= 5;
    const lockoutTime = shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : user.lockedUntil;

    const updatedUser = await prisma.user.update({
      where: { normalisedEmail: email },
      data: {
        failedAttempts: newFailedAttempts,
        lastFailedAttempt: new Date(),
        lockedUntil: lockoutTime,
      },
      select: {
        failedAttempts: true,
        lockedUntil: true,
      },
    });

    await logSecurityEvent({
      email,
      event: 'login_failure',
      ipAddress: ipAddress,
      userAgent: userAgent,
      timestamp: new Date(),
      metadata: {
        failedAttempts: updatedUser.failedAttempts,
        lockedUntil: updatedUser.lockedUntil,
        isLocked: updatedUser.lockedUntil ? updatedUser.lockedUntil > new Date() : false,
        reason: 'Invalid credentials'
      }
    });

    return {
      failed_attempts: updatedUser.failedAttempts,
      locked_until: updatedUser.lockedUntil,
    };
  } catch (error: any) {
    console.error('Failed to increment failed attempts:', error);
    throw error;
  }
}

export async function isAccountLocked(email: string): Promise<AccountLockoutStatus> {
  try {
    const user = await prisma.user.findUnique({
      where: { normalisedEmail: email },
      select: {
        failedAttempts: true,
        lockedUntil: true,
      },
    });

    if (user) {
      const { failedAttempts, lockedUntil } = user;
      const now = new Date();
      const isLocked = lockedUntil ? lockedUntil > now : false;
      
      // If account was locked but lockout time has expired, unlock it
      if (lockedUntil && lockedUntil <= now) {
        await prisma.user.update({
          where: { normalisedEmail: email },
          data: { lockedUntil: null },
        });
        
        return { isLocked: false, failedAttempts: failedAttempts };
      }
      
      return { 
        isLocked: isLocked, 
        failedAttempts: failedAttempts,
        lockedUntil: lockedUntil,
        remainingAttempts: Math.max(0, 5 - failedAttempts)
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
    await prisma.user.update({
      where: { normalisedEmail: email },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastFailedAttempt: null,
      },
    });
  } catch (error: any) {
    console.error('Failed to reset failed attempts:', error);
    throw error;
  }
}

export async function getSecurityStats(): Promise<SecurityStats> {
  try {
    // Get summary statistics
    const [totalEvents, successfulLogins, failedLogins, eventsLast24h] = await Promise.all([
      prisma.securityEvent.count(),
      prisma.securityEvent.count({ where: { eventType: 'login_success' } }),
      prisma.securityEvent.count({ where: { eventType: 'login_failure' } }),
      prisma.securityEvent.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          },
        },
      }),
    ]);

    // Get recent events (last hour)
    const recentEvents = await prisma.securityEvent.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      },
      select: {
        eventType: true,
        ipAddress: true,
        timestamp: true,
        metadata: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    return {
      summary: {
        total_events: totalEvents.toString(),
        successful_logins: successfulLogins.toString(),
        failed_logins: failedLogins.toString(),
        events_last_24h: eventsLast24h.toString(),
      },
      recentEvents: recentEvents.map(event => ({
        event_type: event.eventType,
        ip_address: event.ipAddress,
        timestamp: event.timestamp,
        metadata: event.metadata as Record<string, any> | null,
      })),
    };
  } catch (error: any) {
    console.error('Failed to get security stats:', error);
    throw error;
  }
}
