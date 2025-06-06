import pool from './db.js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { AccessError } from './error.js';

dotenv.config({ path: '.env' });

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
  const token = oauthClient.getToken().access_token;
  const response = await fetch(url, {
    method: method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });
  return response.json();
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

export function validateAndRoundQty(qty) {
  const parsed = parseFloat(qty);
  if (isNaN(parsed) || parsed < 0) {
    throw new Error('Invalid quantity');
  }
  return parseFloat(parsed.toFixed(2));
}

export async function productIdToQboId(productId) {
  try {
    const result = await query(
      `SELECT qbo_item_id FROM products WHERE productid = $1`,
      [productId]
    );

    if (result.length === 0) {
      throw new AccessError(`No product found with productid=${productId}`);
    }

    return result[0].qbo_item_id;
  } catch (err) {
    throw new AccessError(err.message);
  }
}
