// Set environment variables before importing
process.env.VITE_APP_ENV = 'development';
process.env.REDIRECT_URI_DEV = 'http://localhost:5033/auth/callback';
process.env.CLIENT_ID_DEV = 'test_qbo_client_id';
process.env.CLIENT_SECRET_DEV = 'test_qbo_client_secret';
process.env.XERO_CLIENT_ID = 'test_xero_client_id';
process.env.XERO_CLIENT_SECRET = 'test_xero_client_secret';

// Mock the crypto module
const mockCrypto = {
  randomBytes: jest.fn().mockReturnValue({ toString: jest.fn().mockReturnValue('test_random_string') })
};

jest.mock('crypto', () => mockCrypto);

// Mock the OAuth client
const mockOAuthClient = {
  authorizeUri: jest.fn().mockReturnValue('https://test.qbo.auth.uri'),
  createToken: jest.fn().mockResolvedValue({ getToken: jest.fn().mockReturnValue({ realmId: 'test_realm' }) }),
  setToken: jest.fn(),
  getToken: jest.fn().mockReturnValue({ realmId: 'test_realm' }),
  isAccessTokenValid: jest.fn().mockReturnValue(true),
  token: { isRefreshTokenValid: jest.fn().mockReturnValue(true) },
  refreshUsingToken: jest.fn().mockResolvedValue({ getToken: jest.fn().mockReturnValue({ realmId: 'test_realm' }) }),
  revoke: jest.fn().mockResolvedValue(),
  getUserInfo: jest.fn().mockResolvedValue({ json: { email: 'test@example.com', givenName: 'Test', familyName: 'User' } }),
  environment: 'sandbox'
};

// Mock the Xero client
const mockXeroClient = {
  buildConsentUrl: jest.fn().mockReturnValue('https://test.xero.auth.uri'),
  apiCallback: jest.fn().mockResolvedValue({
    access_token: 'test_access_token',
    refresh_token: 'test_refresh_token',
    expires_at: 1234567890
  }),
  setTokenSet: jest.fn(),
  refreshToken: jest.fn().mockResolvedValue({
    access_token: 'new_access_token',
    refresh_token: 'new_refresh_token',
    expires_at: 1234567899
  })
};

jest.mock('intuit-oauth', () => {
  return jest.fn().mockImplementation(() => mockOAuthClient);
});

jest.mock('xero-node', () => ({
  XeroClient: jest.fn().mockImplementation(() => mockXeroClient)
}));

// Import after setting environment variables
import { AuthSystem } from '../src/services/authSystem.js';

describe('AuthSystem', () => {
  let authSystem;
  
  beforeEach(() => {
    // Set environment variables
    process.env = { ...process.env, ...mockEnv };
    authSystem = new AuthSystem();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(authSystem.environment).toBe('development');
      expect(authSystem.redirectUri).toBe('http://localhost:3000/callback');
      expect(authSystem.qboClientId).toBe('test_qbo_client_id');
      expect(authSystem.qboClientSecret).toBe('test_qbo_client_secret');
      expect(authSystem.xeroClientId).toBe('test_xero_client_id');
      expect(authSystem.xeroClientSecret).toBe('test_xero_client_secret');
    });

    it('should throw error for missing environment variables', () => {
      delete process.env.VITE_APP_ENV;
      expect(() => new AuthSystem()).toThrow('Missing required environment variables');
    });
  });

  describe('QBO methods', () => {
    it('should initialize QBO client correctly', () => {
      const qboClient = authSystem.initializeQBO();
      expect(qboClient).toBeDefined();
    });

    it('should get QBO auth URI', () => {
      const authUri = authSystem.getQBOAuthUri();
      expect(authUri).toBe('https://test.qbo.auth.uri');
    });

    it('should handle QBO callback', async () => {
      const token = await authSystem.handleQBOCallback('http://localhost:3000/callback?code=test');
      expect(token.realmId).toBe('test_realm');
    });

    it('should refresh QBO token', async () => {
      const token = { refresh_token: 'test_refresh' };
      const refreshedToken = await authSystem.refreshQBOToken(token);
      expect(refreshedToken.realmId).toBe('test_realm');
    });

    it('should get QBO base URL', () => {
      const baseURL = authSystem.getQBOBaseURL(mockOAuthClient);
      expect(baseURL).toBeDefined();
    });

    it('should get QBO realm ID', () => {
      const realmId = authSystem.getQBORealmId(mockOAuthClient);
      expect(realmId).toBe('test_realm');
    });

    it('should revoke QBO token', async () => {
      await expect(authSystem.revokeQBOToken({})).resolves.not.toThrow();
    });

    it('should get QBO user info', async () => {
      const userInfo = await authSystem.getQBOUserInfo({});
      expect(userInfo.email).toBe('test@example.com');
    });
  });

  describe('Xero methods', () => {
    it('should initialize Xero client correctly', () => {
      const xeroClient = authSystem.initializeXero();
      expect(xeroClient).toBeDefined();
    });

    it('should get Xero auth URI', () => {
      const authUri = authSystem.getXeroAuthUri();
      expect(authUri).toBe('https://test.xero.auth.uri');
    });

    it('should handle Xero callback', async () => {
      const token = await authSystem.handleXeroCallback('http://localhost:3000/callback?code=test');
      expect(token.access_token).toBe('test_access_token');
      expect(token.refresh_token).toBe('test_refresh_token');
    });

    it('should refresh Xero token', async () => {
      const token = { 
        access_token: 'old_token',
        refresh_token: 'refresh_token',
        expires_at: 1234567890,
        tenant_id: 'test_tenant'
      };
      const refreshedToken = await authSystem.refreshXeroToken(token);
      expect(refreshedToken.access_token).toBe('new_access_token');
    });

    it('should handle Xero token revocation', async () => {
      await expect(authSystem.revokeXeroToken({})).resolves.not.toThrow();
    });

    it('should get Xero user info', async () => {
      const userInfo = await authSystem.getXeroUserInfo({
        access_token: 'test_token',
        refresh_token: 'test_refresh',
        expires_at: 1234567890,
        tenant_id: 'test_tenant'
      });
      expect(userInfo.givenName).toBe('Xero');
      expect(userInfo.familyName).toBe('User');
    });
  });

  describe('error handling', () => {
    it('should handle QBO callback errors', async () => {
      mockOAuthClient.createToken.mockRejectedValue(new Error('QBO error'));
      await expect(authSystem.handleQBOCallback('invalid_url')).rejects.toThrow('Could not create QBO token');
    });

    it('should handle Xero callback errors', async () => {
      mockXeroClient.apiCallback.mockRejectedValue(new Error('Xero error'));
      await expect(authSystem.handleXeroCallback('invalid_url')).rejects.toThrow('Could not create Xero token');
    });

    it('should handle QBO token refresh errors', async () => {
      mockOAuthClient.isAccessTokenValid.mockReturnValue(false);
      mockOAuthClient.token.isRefreshTokenValid.mockReturnValue(false);
      await expect(authSystem.refreshQBOToken({})).rejects.toThrow('QBO refresh token has expired');
    });
  });
});
