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

/**
 * Utility functions for UUID handling and comparison
 */

/**
 * Normalize UUID for comparison (remove hyphens and convert to lowercase)
 * @param {string} uuid - The UUID to normalize
 * @returns {string} - Normalized UUID string
 */
export function normalizeUUID(uuid) {
  if (!uuid) return null;
  return uuid.replace(/-/g, '').toLowerCase();
}

/**
 * Compare two UUIDs for equality (handles different formats)
 * @param {string} uuid1 - First UUID
 * @param {string} uuid2 - Second UUID
 * @returns {boolean} - True if UUIDs are equal
 */
export function compareUUIDs(uuid1, uuid2) {
  if (!uuid1 || !uuid2) return false;
  return normalizeUUID(uuid1) === normalizeUUID(uuid2);
}

/**
 * Validate if a string is a valid UUID format
 * @param {string} uuid - String to validate
 * @returns {boolean} - True if valid UUID format
 */
export function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Safely convert string to UUID for database queries
 * @param {string} uuid - String to convert
 * @returns {string|null} - Valid UUID or null
 */
export function safeUUID(uuid) {
  return isValidUUID(uuid) ? uuid : null;
}