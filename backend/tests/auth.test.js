import request from 'supertest'
import server from '../src/server'
import { getAuthUri } from '../src/service'

jest.mock('../src/service', () => ({
  getAuthUri: jest.fn()
}))

beforeAll(() => {
  server.close()
})

describe('GET /authUri', () => {
  it('generates the correct QuickBooks OAuth2 URL', async () => {
    const mockUri = 'https://appcenter.intuit.com/connect/oauth2?client_id=AB1AaqKda2WlUbZA4miMCw6qvx5Vmi6tf09EFwOQLooS4fud17&redirect_uri=http%3A%2F%2Flocalhost%3A5033%2Fcallback&response_type=code&scope=com.intuit.quickbooks.accounting&state=intuit-test'
    getAuthUri.mockResolvedValue(mockUri)

    const response = await request(server).get('/authUri')

    expect(response.statusCode).toBe(200)
    expect(response.text).toBe(mockUri)
  })

  it('handles errors', async () => {
    getAuthUri.mockRejectedValue(new Error('Error fetching auth URI'))

    const response = await request(server).get('/authUri')

    expect(response.statusCode).toBe(500)
    expect(response.body).toEqual({ error: 'Error fetching auth URI' })
  })
})
