export type SecurityEventType = 
    | 'login_success' 
    | 'login_failure' 
    | 'logout' 
    | 'password_reset_request' 
    | 'password_reset_success' 
    | 'user_lockout';

export interface LogSecurityEventData {
    userId?: string | null;
    email?: string | null;
    event: SecurityEventType;
    ipAddress?: string | null;
    userAgent?: string | null;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface IncrementFailedAttemptsResult {
    failed_attempts: number;
    locked_until: Date | null;
}

export interface AccountLockoutStatus {
    isLocked: boolean;
    failedAttempts: number;
    lockedUntil?: Date | null;
    remainingAttempts?: number;
}

export interface SecurityStatsSummary {
    total_events: string;
    successful_logins: string;
    failed_logins: string;
    events_last_24h: string;
}

export interface RecentSecurityEvent {
    event_type: SecurityEventType;
    ip_address: string | null;
    timestamp: Date;
    metadata: Record<string, any> | null;
}

export interface SecurityStats {
    summary: SecurityStatsSummary;
    recentEvents: RecentSecurityEvent[];
}
