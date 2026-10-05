import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'masterloop_jwt_secret_dev_key_change_in_prod';
const JWT_EXPIRES_IN = '7d';

/**
 * Hash a plain password using bcryptjs
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plain password with stored hash
 */
export async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically secure random token (64 hex characters)
 */
export function generateRandomToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Compute SHA-256 hash of a token for safe database storage
 */
export function hashToken(token) {
  if (!token) return null;
  return crypto.createHash('sha256').update(String(token).trim()).digest('hex');
}

/**
 * Sign JWT session token containing userId and email
 */
export function signSessionToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT session token
 */
export function verifySessionToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Standard cookie configuration for HTTP-only authentication cookie
 */
export function getAuthCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}

export default {
  hashPassword,
  comparePassword,
  generateRandomToken,
  hashToken,
  signSessionToken,
  verifySessionToken,
  getAuthCookieOptions,
};
