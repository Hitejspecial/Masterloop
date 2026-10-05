import express from 'express';
import {
  hashPassword,
  comparePassword,
  generateRandomToken,
  hashToken,
  signSessionToken,
  verifySessionToken,
  getAuthCookieOptions,
} from '../utils/auth.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';
import { findUserByEmail, findUserById, createUser } from '../services/userService.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user account with unverified email state
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required.',
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Name must be at least 2 characters.',
      });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    const normalizedEmail = email.toLowerCase().trim();
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long.',
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match.',
      });
    }

    // Check existing account
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      if (existingUser.emailVerified) {
        return res.status(400).json({
          success: false,
          error: 'An account with this email address already exists. Please sign in.',
        });
      }

      // If user exists but is not verified, renew token and resend email
      const token = generateRandomToken();
      existingUser.name = name.trim();
      existingUser.passwordHash = await hashPassword(password);
      existingUser.verificationTokenHash = hashToken(token);
      existingUser.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await existingUser.save();

      const emailResult = await sendVerificationEmail({
        to: existingUser.email,
        name: existingUser.name,
        token,
        req,
      });

      const responsePayload = {
        success: true,
        message: 'A verification link has been sent to your email address.',
        email: normalizedEmail,
      };

      if (process.env.NODE_ENV !== 'production') {
        if (emailResult.previewUrl) responsePayload.previewUrl = emailResult.previewUrl;
        if (emailResult.verificationLink) responsePayload.devVerificationLink = emailResult.verificationLink;
      }

      return res.status(200).json(responsePayload);
    }

    // Hash password & generate token
    const passwordHash = await hashPassword(password);
    const token = generateRandomToken();
    const tokenHash = hashToken(token);

    const newUser = await createUser({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      emailVerified: false,
      verificationTokenHash: tokenHash,
      verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Send verification email
    const emailResult = await sendVerificationEmail({
      to: newUser.email,
      name: newUser.name,
      token,
      req,
    });

    const responsePayload = {
      success: true,
      message: 'Account created. We sent a verification link to your email address.',
      email: normalizedEmail,
    };

    if (process.env.NODE_ENV !== 'production') {
      if (emailResult.previewUrl) responsePayload.previewUrl = emailResult.previewUrl;
      if (emailResult.verificationLink) responsePayload.devVerificationLink = emailResult.verificationLink;
    }

    return res.status(201).json(responsePayload);
  } catch (error) {
    console.error('[Auth API] Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred during registration. Please try again.',
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Validate email verification token and activate account
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        error: 'Verification token and email are required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification request.',
      });
    }

    if (user.emailVerified) {
      return res.status(200).json({
        success: true,
        message: 'Email is already verified. You can sign in.',
        alreadyVerified: true,
      });
    }

    const tokenHash = hashToken(token);
    if (!user.verificationTokenHash || user.verificationTokenHash !== tokenHash) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token.',
      });
    }

    if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Verification token has expired. Please request a new verification email.',
        expired: true,
      });
    }

    // Mark verified
    user.emailVerified = true;
    user.verificationTokenHash = null;
    user.verificationTokenExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now sign in.',
    });
  } catch (error) {
    console.error('[Auth API] Verify email error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify email. Please try again.',
    });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email to an unverified user
 */
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);

    // Safe response even if user not found (prevents enumeration)
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an unverified account exists, a new verification link has been sent.',
      });
    }

    if (user.emailVerified) {
      return res.status(200).json({
        success: true,
        message: 'This email is already verified. You can sign in.',
        alreadyVerified: true,
      });
    }

    const token = generateRandomToken();
    user.verificationTokenHash = hashToken(token);
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      token,
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Verification link resent. Please check your inbox.',
    });
  } catch (error) {
    console.error('[Auth API] Resend verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resend verification email.',
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user, verify credentials, enforce email verification, and set HTTP-only cookie
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // Enforce email verification
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email before signing in.',
        needsVerification: true,
        email: user.email,
      });
    }

    // Generate JWT and set secure HTTP-only cookie
    const token = signSessionToken({
      userId: user._id,
      email: user.email,
      name: user.name,
    });

    res.cookie('auth_token', token, getAuthCookieOptions());

    user.lastLoginAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('[Auth API] Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred during sign in. Please try again.',
    });
  }
});

/**
 * POST /api/auth/logout
 * Invalidate session and clear HTTP-only cookie
 */
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', getAuthCookieOptions());
  return res.status(200).json({
    success: true,
    message: 'Signed out successfully.',
  });
});

/**
 * GET /api/auth/me
 * Retrieve current authenticated user profile from HTTP-only cookie
 */
router.get('/me', async (req, res) => {
  try {
    const token =
      req.cookies?.auth_token ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) {
      return res.status(200).json({
        success: false,
        authenticated: false,
        user: null,
      });
    }

    const decoded = verifySessionToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(200).json({
        success: false,
        authenticated: false,
        user: null,
      });
    }

    const user = await findUserById(decoded.userId);
    if (!user) {
      res.clearCookie('auth_token', getAuthCookieOptions());
      return res.status(200).json({
        success: false,
        authenticated: false,
        user: null,
      });
    }

    return res.status(200).json({
      success: true,
      authenticated: true,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('[Auth API] /me error:', error);
    return res.status(200).json({
      success: false,
      authenticated: false,
      user: null,
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request a secure password reset link
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);

    // Safe response - do not reveal if email exists
    let devInfo = {};
    if (user) {
      const token = generateRandomToken();
      user.resetPasswordTokenHash = hashToken(token);
      user.resetPasswordTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      const emailResult = await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        token,
        req,
      });

      if (process.env.NODE_ENV !== 'production') {
        if (emailResult.previewUrl) devInfo.previewUrl = emailResult.previewUrl;
        if (emailResult.resetLink) devInfo.devResetLink = emailResult.resetLink;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists with that email address, a password reset link has been sent.',
      ...devInfo,
    });
  } catch (error) {
    console.error('[Auth API] Forgot password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process password reset request.',
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using a valid reset token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, email, newPassword, confirmPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token, email, and new password are required.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long.',
      });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired password reset link.',
      });
    }

    const tokenHash = hashToken(token);
    if (!user.resetPasswordTokenHash || user.resetPasswordTokenHash !== tokenHash) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired password reset link.',
      });
    }

    if (user.resetPasswordTokenExpires && user.resetPasswordTokenExpires < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Password reset link has expired. Please request a new one.',
      });
    }

    // Update password and clear reset token
    user.passwordHash = await hashPassword(newPassword);
    user.resetPasswordTokenHash = null;
    user.resetPasswordTokenExpires = null;
    user.emailVerified = true; // password reset confirms email ownership
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('[Auth API] Reset password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset password. Please try again.',
    });
  }
});

export default router;
