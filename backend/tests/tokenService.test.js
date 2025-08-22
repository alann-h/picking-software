// Set environment variables before importing
process.env.VITE_APP_ENV = 'development';
process.env.REDIRECT_URI_DEV = 'http://localhost:3000/callback';
process.env.CLIENT_ID_DEV = 'test_qbo_client_id';
process.env.CLIENT_SECRET_DEV = 'test_qbo_client_secret';
process.env.XERO_CLIENT_ID = 'test_xero_client_id';
process.env.XERO_CLIENT_SECRET = 'test_xero_client_secret';

// Mock the helpers module
jest.mock('../src/helpers.js', () => ({
  query: jest.fn(),
  encryptToken: jest.fn().mockReturnValue('encrypted_token'),
  decryptToken: jest.fn().mockReturnValue({
    access_token: 'test_access_token',
    refresh_token: 'test_refresh_token',
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    access_token_expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  })
}));

// Mock the error handler
jest.mock('../src/middlewares/errorHandler.js', () => ({
  AccessError: jest.fn().mockImplementation((message) => new Error(message)),
  AuthenticationError: jest.fn().mockImplementation((message) => new Error(message))
}));

// Mock the auth system
jest.mock('../src/services/authSystem.js', () => ({
  authSystem: {
    refreshQBOToken: jest.fn().mockResolvedValue({
      access_token: 'new_qbo_token',
      refresh_token: 'new_qbo_refresh',
      access_token_expires_at: 1234567899
    }),
    refreshXeroToken: jest.fn().mockResolvedValue({
      access_token: 'new_xero_token',
      refresh_token: 'new_xero_refresh',
      expires_at: 1234567899
    }),
    getQBOUserInfo: jest.fn().mockResolvedValue({ email: 'test@qbo.com' }),
    getXeroUserInfo: jest.fn().mockResolvedValue({ email: 'test@xero.com' }),
    revokeQBOToken: jest.fn().mockResolvedValue(),
    revokeXeroToken: jest.fn().mockResolvedValue(),
    getQBOBaseURL: jest.fn().mockReturnValue('https://sandbox.qbo.intuit.com'),
    getXeroBaseURL: jest.fn().mockReturnValue('https://api.xero.com'),
    getQBORealmId: jest.fn().mockReturnValue('test_realm'),
    getXeroRealmId: jest.fn().mockReturnValue('test_tenant'),
    initializeQBO: jest.fn().mockReturnValue({ setToken: jest.fn() }),
    initializeXero: jest.fn().mockReturnValue({ setTokenSet: jest.fn() })
  }
}));

// Import after setting up mocks
import { tokenService } from '../src/services/tokenService.js';
import { query, encryptToken, decryptToken } from '../src/helpers.js';
import { authSystem } from '../src/services/authSystem.js';

describe('TokenService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with connection handlers', () => {
      expect(tokenService.connectionHandlers.has('qbo')).toBe(true);
      expect(tokenService.connectionHandlers.has('xero')).toBe(true);
      expect(tokenService.getSupportedConnectionTypes()).toEqual(['qbo', 'xero']);
    });
  });

  describe('QBO token management', () => {
    it('should get valid QBO token', async () => {
      query.mockResolvedValue([{
        qb_token: 'encrypted_access_token',
        qb_refresh_token: 'encrypted_refresh_token',
        qb_token_expires_at: new Date(Date.now() + 3600000), // 1 hour from now
        qb_realm_id: 'test_realm'
      }]);

      // Mock decryptToken to return different values for access and refresh tokens
      decryptToken
        .mockReturnValueOnce('test_access_token')  // For access token
        .mockReturnValueOnce('test_refresh_token'); // For refresh token

      const token = await tokenService.getValidToken('test_company_id', 'qbo');
      expect(token.access_token).toBe('test_access_token');
      expect(token.refresh_token).toBe('test_refresh_token');
    });

    it('should refresh QBO token when expired', async () => {
      query.mockResolvedValue([{
        qb_token: 'encrypted_access_token',
        qb_refresh_token: 'encrypted_refresh_token',
        qb_token_expires_at: new Date(Date.now() - 3600000), // 1 hour ago (expired)
        qb_realm_id: 'test_realm'
      }]);

      // Mock decryptToken to return different values for access and refresh tokens
      decryptToken
        .mockReturnValueOnce('expired_token')      // For access token
        .mockReturnValueOnce('test_refresh');     // For refresh token

      const token = await tokenService.getValidToken('test_company_id', 'qbo');
      expect(authSystem.refreshQBOToken).toHaveBeenCalled();
      expect(token.access_token).toBe('new_qbo_token');
    });

    it('should handle QBO reauth required', async () => {
      query.mockResolvedValue([]);

      await expect(tokenService.getValidToken('test_company_id', 'qbo'))
        .rejects.toThrow('QBO_REAUTH_REQUIRED');
    });
  });

  describe('Xero token management', () => {
    it('should get valid Xero token', async () => {
      query.mockResolvedValue([{
        xero_token: 'encrypted_access_token',
        xero_refresh_token: 'encrypted_refresh_token',
        xero_token_expires_at: new Date(Date.now() + 3600000), // 1 hour from now
        xero_tenant_id: 'test_tenant'
      }]);

      // Mock decryptToken to return different values for access and refresh tokens
      decryptToken
        .mockReturnValueOnce('new_xero_token')      // For access token
        .mockReturnValueOnce('new_xero_refresh');   // For refresh token

      const token = await tokenService.getValidToken('test_company_id', 'xero');
      expect(token.access_token).toBe('new_xero_token');
      expect(token.refresh_token).toBe('new_xero_refresh');
    });

    it('should refresh Xero token when expired', async () => {
      query.mockResolvedValue([{
        xero_token: 'encrypted_access_token',
        xero_refresh_token: 'encrypted_refresh_token',
        xero_token_expires_at: new Date(Date.now() - 3600000), // 1 hour ago (expired)
        xero_tenant_id: 'test_tenant'
      }]);

      // Mock decryptToken to return different values for access and refresh tokens
      decryptToken
        .mockReturnValueOnce('expired_token')      // For access token
        .mockReturnValueOnce('test_refresh');     // For refresh token

      const token = await tokenService.getValidToken('test_company_id', 'xero');
      expect(authSystem.refreshXeroToken).toHaveBeenCalled();
      expect(token.access_token).toBe('new_xero_token');
    });

    it('should handle Xero reauth required', async () => {
      query.mockResolvedValue([]);

      await expect(tokenService.getValidToken('test_company_id', 'xero'))
        .rejects.toThrow('XERO_REAUTH_REQUIRED');
    });
  });

  describe('OAuth client management', () => {
    it('should get QBO OAuth client', async () => {
      query.mockResolvedValue([{
        qb_token: 'encrypted_access_token',
        qb_refresh_token: 'encrypted_refresh_token',
        qb_token_expires_at: new Date(Date.now() + 3600000), // 1 hour from now
        qb_realm_id: 'test_realm'
      }]);

      // Mock decryptToken to return different values for access and refresh tokens
      decryptToken
        .mockReturnValueOnce('test_access_token')  // For access token
        .mockReturnValueOnce('test_refresh_token'); // For refresh token

      const client = await tokenService.getOAuthClient('test_company_id', 'qbo');
      expect(client).toBeDefined();
      expect(authSystem.initializeQBO).toHaveBeenCalled();
    });

    it('should get Xero OAuth client', async () => {
      query.mockResolvedValue([{
        xero_token: 'encrypted_access_token',
        xero_refresh_token: 'encrypted_refresh_token',
        xero_token_expires_at: new Date(Date.now() + 3600000), // 1 hour from now
        xero_tenant_id: 'test_tenant'
      }]);

      // Mock decryptToken to return different values for access and refresh tokens
      decryptToken
        .mockReturnValueOnce('test_xero_token')      // For access token
        .mockReturnValueOnce('test_xero_refresh');   // For refresh token

      const client = await tokenService.getOAuthClient('test_company_id', 'xero');
      expect(client).toBeDefined();
      expect(authSystem.initializeXero).toHaveBeenCalled();
    });

    it('should throw error for unsupported connection type', async () => {
      await expect(tokenService.getOAuthClient('test_company_id', 'unsupported'))
        .rejects.toThrow('Unsupported connection type: unsupported');
    });
  });

  describe('token validation', () => {
    it('should validate QBO token correctly', () => {
      const validToken = {
        access_token: 'valid_token',
        access_token_expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };
      expect(tokenService.validateQBOToken(validToken)).toBe(true);

      const expiredToken = {
        access_token: 'expired_token',
        access_token_expires_at: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };
      expect(tokenService.validateQBOToken(expiredToken)).toBe(false);
    });

    it('should validate Xero token correctly', () => {
      const validToken = {
        access_token: 'valid_token',
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };
      expect(tokenService.validateXeroToken(validToken)).toBe(true);

      const expiredToken = {
        access_token: 'expired_token',
        expires_at: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };
      expect(tokenService.validateXeroToken(expiredToken)).toBe(false);
    });
  });

  describe('token status', () => {
    it('should get QBO token status', async () => {
      query.mockResolvedValue([{
        qb_token: 'encrypted_access_token',
        qb_refresh_token: 'encrypted_refresh_token',
        qb_token_expires_at: new Date(Date.now() - 3600000), // 1 hour ago (expired)
        qb_realm_id: 'test_realm'
      }]);

      // Mock decryptToken to return different values for access and refresh tokens
      decryptToken
        .mockReturnValueOnce('expired_token')      // For access token
        .mockReturnValueOnce('test_refresh');     // For refresh token

      const status = await tokenService.getTokenStatus('test_company_id', 'qbo');
      expect(status.status).toBe('EXPIRED');
      expect(status.connectionType).toBe('qbo');
      expect(status.realmId).toBe('test_realm');
    });

    it('should get Xero token status', async () => {
      query.mockResolvedValue([{
        xero_token: 'encrypted_access_token',
        xero_refresh_token: 'encrypted_refresh_token',
        xero_token_expires_at: new Date(Date.now() - 3600000), // 1 hour ago (expired)
        xero_tenant_id: 'test_tenant'
      }]);

      // Mock decryptToken to return different values for access and refresh tokens
      decryptToken
        .mockReturnValueOnce('expired_xero_token')  // For access token
        .mockReturnValueOnce('test_xero_refresh');  // For refresh token

      const status = await tokenService.getTokenStatus('test_company_id', 'xero');
      expect(status.status).toBe('EXPIRED');
      expect(status.connectionType).toBe('xero');
      expect(status.realmId).toBe('test_tenant');
    });
  });

  describe('company connections', () => {
    it('should get company connections', async () => {
      query.mockResolvedValue([{
        connection_type: 'qbo',
        qb_realm_id: 'test_realm',
        xero_tenant_id: null
      }]);

      const connections = await tokenService.getCompanyConnections('test_company_id');
      expect(connections).toHaveLength(1);
      expect(connections[0].type).toBe('qbo');
      expect(connections[0].realmId).toBe('test_realm');
    });

    it('should handle company with no connections', async () => {
      query.mockResolvedValue([]);

      const connections = await tokenService.getCompanyConnections('test_company_id');
      expect(connections).toHaveLength(0);
    });
  });

  describe('extensibility', () => {
    it('should allow adding new connection handlers', () => {
      const myobHandler = {
        getTokenField: 'myob_token',
        getRealmField: 'myob_company_id',
        validateToken: jest.fn().mockReturnValue(true)
      };

      tokenService.addConnectionHandler('myob', myobHandler);
      expect(tokenService.getSupportedConnectionTypes()).toContain('myob');
    });

    it('should allow removing connection handlers', () => {
      tokenService.removeConnectionHandler('xero');
      expect(tokenService.getSupportedConnectionTypes()).not.toContain('xero');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      query.mockRejectedValue(new Error('Database error'));

      const status = await tokenService.getTokenStatus('test_company_id', 'qbo');
      expect(status.status).toBe('ERROR');
      expect(status.message).toBe('Database error');
    });

    it('should handle unsupported connection types', async () => {
      await expect(tokenService.getValidToken('test_company_id', 'unsupported'))
        .rejects.toThrow('Unsupported connection type: unsupported');
    });
  });
});
