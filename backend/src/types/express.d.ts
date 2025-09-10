import 'express-session';

declare global {
  namespace Express {
    interface Request {
      rawBody?: string;
    }
  }
}

declare module 'express-session' {
  // eslint-disable-next-line no-unused-vars
  export interface SessionData {
    userId?: string;
    companyId?: string;
    isAdmin?: boolean;
    name?: string;
    email?: string;
    connectionType?: 'qbo' | 'xero';
    loginTime?: string;
    userAgent?: string;
    ipAddress?: string;
    csrfSessionEnsured?: boolean;
  }
}
