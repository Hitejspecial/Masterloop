import { verifySessionToken } from '../utils/auth.js';
import { findUserById } from '../services/userService.js';

/**
 * Require valid authenticated user session via HTTP-only cookie or Bearer token
 */
export async function requireAuth(req, res, next) {
  try {
    const token =
      req.cookies?.auth_token ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in.',
      });
    }

    const decoded = verifySessionToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please sign in again.',
      });
    }

    const user = await findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication verification failure.',
    });
  }
}

/**
 * Optional authentication - attaches user if session exists, but doesn't block unauthenticated requests
 */
export async function optionalAuth(req, res, next) {
  try {
    const token =
      req.cookies?.auth_token ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (token) {
      const decoded = verifySessionToken(token);
      if (decoded && decoded.userId) {
        const user = await findUserById(decoded.userId);
        if (user) {
          req.user = user;
        }
      }
    }
    next();
  } catch (error) {
    next();
  }
}

export default {
  requireAuth,
  optionalAuth,
};
