import request from 'supertest';
import server from '../src/server';
import { getAuthUri, handleCallback, getUserToken } from '../src/auth';
import { fetchCustomers, saveCustomers, getCustomerId } from '../src/customers';
import { estimateToDB, checkQuoteExists, fetchQuoteData } from '../src/quotes';
import { processFile, getProductName, getProductFromDB, getAllProducts } from '../src/products';

jest.mock('../src/auth');
jest.mock('../src/customers');
jest.mock('../src/quotes');
jest.mock('../src/products');

const dummyUserId = "eda9692a-7512-4e74-b88d-bf4d17af70a4";
const dummyTokenData = {
  realmId: "9130357908851946",
  id_token: "",
  createdAt: 1725871385150,
  expires_in: 9999999,
  token_type: "bearer",
  access_token: "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0..wO9Qto2hWzSrY8A9XJwiBQ.IffahRiF8NDMfYcDw9seZoRkRBGbdriWS5LnvAejiu7uUpWkDMafwHzV-k1I06rnd7ZjlOg_V1hO8UvEaJfiP9jXGyBv_64Fv7gEysKVBb37_gZDGHPxUlZX9P-LheDhz5_LSsolzIUZwAoS76jEh7aTHpSnmg_iMl_J6xQQzT6JVYOuiWqYV6h3obdiv3BdeSJVV1zuAw6g37s6q85V37vPzagjPbUE5o4GHTiXMeg5boKC2a5gD316Z-MRdAUUewUpc8-dFuXi_WBB19Vu3kimSTQlPJT4q_kbBCyDQDLlfhwf1kuFAJrGlCgy-6ua59NWTptcxnuzzn_0qlN9pssWsEh7H7bWN-5xCU0v-NYDt5D9FICPy6NIepigr7seRE8uYd2XE_6dKg4wD1-9YFNU_N5RrvLuWC4I5PBpgZ8wgq0FCqZGUUG4tGkZhUuN9ORVmx6n_t3SBxURGkJaZHMHgFjkfaJ0v2NbDfrUXhU9l0pE08Y1kQwan4CqTy_emYDwL-6RVR0QBjmi4KYCUP1qvL0GK4Y5tgWBdxoJnQLQ_k9nxkHFHunpkX9pCa7hkcjhHRTrz_Co6u6eX_sv5H5eE-EjgPMXYb8gM5HlYwyEsEsKcrZhI-cRwhvKnZnaVovlsIz3l1HRJ7vf2ga47n_ms0wS1J_mqLV1XRCfqIEk5Ll-PpBoVbJEiaw_DjRzW2OjGh3yv8ZN4Ee_PskK_fsjT0ftQCxtwcb0r6EPDTTsHaJYbWEP3lhUBAQaZg7x.XLpyhmho5pngjbw_OCv1fQ",
  refresh_token: "AB11734597772AH7COWvi69cOVN95NcFYfv9akExFH80Ycg1Ey",
  x_refresh_token_expires_in: 8656438
};

beforeAll(() => {
  server.close();
});

describe('Authentication Endpoints', () => {
  it('GET /authUri - generates the correct QuickBooks OAuth2 URL', async () => {
    const mockUri = 'https://appcenter.intuit.com/connect/oauth2?client_id=testid&redirect_uri=http%3A%2F%2Flocalhost%3A5033%2Fcallback&response_type=code&scope=com.intuit.quickbooks.accounting&state=intuit-test';
    getAuthUri.mockResolvedValue(mockUri);

    const response = await request(server).get('/authUri');

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(mockUri);
  });

  it('GET /callback - handles OAuth callback correctly', async () => {
    handleCallback.mockResolvedValue(dummyUserId);

    const response = await request(server).get('/callback?code=testcode&state=teststate');

    expect(response.statusCode).toBe(302); // Redirect
    expect(response.header.location).toBe(`http://localhost:3000/oauth/callback?userId=${dummyUserId}`);
  });

  it('GET /retrieveToken/:userId - retrieves token for valid user', async () => {
    getUserToken.mockResolvedValue(dummyTokenData);

    const response = await request(server).get(`/retrieveToken/${dummyUserId}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(dummyTokenData);
  });

});

describe('Customer Endpoints', () => {
  it('GET /getCustomers/:userId - fetches customers for valid user', async () => {
    const mockCustomers = [{ id: '1', name: 'Customer 1' }, { id: '2', name: 'Customer 2' }];
    fetchCustomers.mockResolvedValue(mockCustomers);

    const response = await request(server).get(`/getCustomers/${dummyUserId}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockCustomers);
  });

  it('POST /saveCustomers - saves customers successfully', async () => {
    const mockCustomers = [{ id: '1', name: 'Customer 1' }, { id: '2', name: 'Customer 2' }];
    saveCustomers.mockResolvedValue({ message: 'Quote saved successfully in database' });

    const response = await request(server)
      .post('/saveCustomers')
      .send(mockCustomers);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Quote saved successfully in database' });
  });

  it('GET /getCustomerId/:customerName - retrieves customer ID', async () => {
    const mockCustomerId = '12345';
    getCustomerId.mockResolvedValue(mockCustomerId);

    const response = await request(server).get('/getCustomerId/TestCustomer');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ customerId: mockCustomerId });
  });
});

describe('Quote Endpoints', () => {
  it('GET /estimate/:quoteId/:userId - fetches quote data', async () => {
    const mockQuoteData = { id: '1', customerName: 'Test Customer', totalAmount: 100 };
    checkQuoteExists.mockResolvedValue(true);
    fetchQuoteData.mockResolvedValue(mockQuoteData);

    const response = await request(server).get(`/estimate/1/${dummyUserId}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ source: 'database', data: mockQuoteData });
  });

  it('POST /saveQuote - saves quote successfully', async () => {
    const mockQuote = { id: '1', customerName: 'Test Customer', totalAmount: 100 };
    estimateToDB.mockResolvedValue({ message: 'Quote saved successfully' });

    const response = await request(server)
      .post('/saveQuote')
      .send({ quote: mockQuote });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Quote saved successfully in database' });
  });
});

describe('Product Endpoints', () => {
  it('GET /getProduct/:productId - retrieves product data', async () => {
    const mockProduct = { id: '1', name: 'Test Product', price: 10 };
    getProductFromDB.mockResolvedValue(mockProduct);

    const response = await request(server).get('/getProduct/1');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockProduct);
  });

  it('GET /getAllProducts - retrieves all products', async () => {
    const mockProducts = [
      { productName: 'Product 1', barcode: '123456' },
      { productName: 'Product 2', barcode: '789012' }
    ];
    getAllProducts.mockResolvedValue(mockProducts);

    const response = await request(server).get('/getAllProducts');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockProducts);
  });

  it('POST /upload - processes file upload successfully', async () => {
    const mockFile = Buffer.from('test file content');
    processFile.mockResolvedValue('File processed successfully');

    const response = await request(server)
      .post('/upload')
      .attach('input', mockFile, 'test.xlsx');

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('File processed successfully');
  });

  it('GET /barcodeToName/:barcode - retrieves product name for barcode', async () => {
    const mockProductName = 'Test Product';
    getProductName.mockResolvedValue(mockProductName);

    const response = await request(server).get('/barcodeToName/123456');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ productName: mockProductName });
  });
});