import pool from './db.js';
import crypto from 'crypto';


export async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function makeCustomApiCall(oauthClient, url, method, body) {
  try {
    console.log('Making QuickBooks API call:', { url, method, body });
    
    const response = await oauthClient.makeApiCall({
      url: url,
      method: method,
      body: body,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('QuickBooks API response received:', {
      hasBody: !!response.body,
      bodyType: typeof response.body,
      bodyKeys: response.body ? Object.keys(response.body) : 'no body',
      fullResponse: JSON.stringify(response, null, 2)
    });

    // Check if there's a QuickBooks error response
    if (response.body && response.body.Fault) {
      console.error('QuickBooks API Error Response:', {
        url: url,
        fault: response.body.Fault,
        faultKeys: Object.keys(response.body.Fault),
        errorType: typeof response.body.Fault.Error,
        errorIsArray: Array.isArray(response.body.Fault.Error),
        errorLength: response.body.Fault.Error ? response.body.Fault.Error.length : 'no error array'
      });
      
      // Safely extract error message
      let errorMessage = 'Unknown QuickBooks error';
      
      if (response.body.Fault.Error && Array.isArray(response.body.Fault.Error) && response.body.Fault.Error.length > 0) {
        const error = response.body.Fault.Error[0];
        errorMessage = error.Message || error.Detail || 'Unknown error';
        
        // Check for OAuth/authentication errors
        if (errorMessage.includes('OAuth') || errorMessage.includes('authentication') || errorMessage.includes('token')) {
          throw new Error('QBO_REAUTH_REQUIRED');
        }
      } else if (response.body.Fault.Error && typeof response.body.Fault.Error === 'string') {
        errorMessage = response.body.Fault.Error;
      } else if (response.body.Fault.Message) {
        errorMessage = response.body.Fault.Message;
      }
      
      throw new Error(`QuickBooks API Error: ${errorMessage}`);
    }

    return response.body || response;
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error.message === 'QBO_REAUTH_REQUIRED') {
      throw error;
    }
    
    // If it's already a QuickBooks API Error, re-throw it
    if (error.message.startsWith('QuickBooks API Error:')) {
      throw error;
    }
    
    // Log the error for debugging
    console.error('QuickBooks API Call Error:', {
      url: url,
      method: method,
      error: error.message,
      stack: error.stack
    });
    
    // Re-throw the error to be handled by the calling function
    throw error;
  }
}

const AES_SECRET_KEY = crypto
  .createHash('sha256')
  .update(String(process.env.AES_SECRET_KEY))
  .digest();

export function encryptToken(token) {
  const cipher = crypto.createCipheriv('aes-256-cbc', AES_SECRET_KEY, Buffer.alloc(16, 0));
  let encrypted = cipher.update(JSON.stringify(token), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decryptToken(encryptedToken) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', AES_SECRET_KEY, Buffer.alloc(16, 0));
  let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

export function roundQuantity(qty) {
  const parsed = parseFloat(qty);
  return parseFloat(parsed.toFixed(2));
}

/**
 * Formats a given timestamp string into a human-readable string
 * in 'DD/MM/YYYY HH:MM AM/PM' format for the Australia/Sydney time zone.
 *
 * @param {string | Date} timestamp - The timestamp value, ideally an ISO 8601 string from the database, or a Date object.
 * @returns {string} The formatted date and time string.
 */
export function formatTimestampForSydney(timestamp) {
  if (!timestamp) {
    return '';
  }

  const dateObject = new Date(timestamp);

  if (isNaN(dateObject.getTime())) {
    console.warn(`Invalid timestamp provided to formatter: ${timestamp}`);
    return 'Invalid Date';
  }

  return dateObject.toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}