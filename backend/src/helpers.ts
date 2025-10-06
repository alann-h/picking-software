import crypto from 'crypto';

const AES_SECRET_KEY = crypto
  .createHash('sha256')
  .update(String(process.env.AES_SECRET_KEY))
  .digest();

export function encryptToken(token: unknown): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', AES_SECRET_KEY, iv);
  let encrypted = cipher.update(JSON.stringify(token), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptToken<T>(encryptedToken: string): T {
  const parts = encryptedToken.split(':');
  
  // Handle legacy format (without IV prefix) for backward compatibility
  if (parts.length === 1) {
    // Legacy decryption with zero IV
    const decipher = crypto.createDecipheriv('aes-256-cbc', AES_SECRET_KEY, Buffer.alloc(16, 0));
    let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted) as T;
  }
  
  // New format with IV prefix
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted token format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', AES_SECRET_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted) as T;
}

export function roundQuantity(qty: string | number): number {
  const parsed = parseFloat(String(qty));
  if (isNaN(parsed)) {
    return 0;
  }
  return parseFloat(parsed.toFixed(2));
}

/**
 * Formats a given timestamp string into a human-readable string
 * in 'DD/MM/YYYY HH:MM AM/PM' format for the Australia/Sydney time zone.
 *
 * @param {string | Date} timestamp - The timestamp value, ideally an ISO 8601 string from the database, or a Date object.
 * @returns {string} The formatted date and time string.
 */
export function formatTimestampForSydney(timestamp: Date | string) {
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
export function normalizeUUID(uuid: string) {
  if (!uuid) return null;
  return uuid.replace(/-/g, '').toLowerCase();
}

/**
 * Compare two UUIDs for equality (handles different formats)
 * @param {string} uuid1 - First UUID
 * @param {string} uuid2 - Second UUID
 * @returns {boolean} - True if UUIDs are equal
 */
export function compareUUIDs(uuid1: string, uuid2: string) {
  if (!uuid1 || !uuid2) return false;
  return normalizeUUID(uuid1) === normalizeUUID(uuid2);
}

/**
 * Validate if a string is a valid UUID format
 * @param {string} uuid - String to validate
 * @returns {boolean} - True if valid UUID format
 */
export function isValidUUID(uuid: string) {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Safely convert string to UUID for database queries
 * @param {string} uuid - String to convert
 * @returns {string|null} - Valid UUID or null
 */
export function safeUUID(uuid: string) {
  return isValidUUID(uuid) ? uuid : null;
}

/**
 * Parse Australian date format (dd/mm/yyyy) to ISO format
 * @param {string} dateString - Date string in Australian format
 * @returns {string} ISO date string (yyyy-mm-dd)
 */
export function parseAustralianDate(dateString: string): string {
  if (!dateString) return new Date().toISOString().split('T')[0];
  
  // Try parsing as dd/mm/yyyy first (most common Australian format)
  const match = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    // Validate the date
    const date = new Date(isoDate);
    if (!isNaN(date.getTime())) {
      return isoDate;
    }
  }
  
  // Fallback: try parsing as-is
  const fallbackDate = new Date(dateString);
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate.toISOString().split('T')[0];
  }
  
  // If all else fails, return current date
  return new Date().toISOString().split('T')[0];
}