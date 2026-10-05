import crypto from 'crypto';
import User from '../models/User.js';
import { getConnectionStatus } from '../config/db.js';

// In-memory fallback store when MongoDB Atlas connection is offline/unconfigured
const inMemoryUsers = new Map();

/**
 * Normalizes user object to guarantee .toSafeObject() is always present
 */
function createSafeUserProxy(raw) {
  if (!raw) return null;
  const userObj = {
    _id: raw._id ? String(raw._id) : (raw.id || crypto.randomUUID()),
    name: raw.name,
    email: raw.email.toLowerCase().trim(),
    passwordHash: raw.passwordHash,
    emailVerified: Boolean(raw.emailVerified),
    verificationTokenHash: raw.verificationTokenHash || null,
    verificationTokenExpires: raw.verificationTokenExpires ? new Date(raw.verificationTokenExpires) : null,
    resetPasswordTokenHash: raw.resetPasswordTokenHash || null,
    resetPasswordTokenExpires: raw.resetPasswordTokenExpires ? new Date(raw.resetPasswordTokenExpires) : null,
    lastLoginAt: raw.lastLoginAt ? new Date(raw.lastLoginAt) : null,
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
  };

  userObj.toSafeObject = function () {
    const copy = { ...this };
    delete copy.passwordHash;
    delete copy.verificationTokenHash;
    delete copy.verificationTokenExpires;
    delete copy.resetPasswordTokenHash;
    delete copy.resetPasswordTokenExpires;
    delete copy.toSafeObject;
    delete copy.save;
    return copy;
  };

  userObj.save = async function () {
    this.updatedAt = new Date();
    inMemoryUsers.set(this.email, this);
    inMemoryUsers.set(this._id, this);
    return this;
  };

  return userObj;
}

/**
 * Find user by email (MongoDB Atlas primary, memory fallback)
 */
export async function findUserByEmail(email) {
  if (!email) return null;
  const normalized = email.toLowerCase().trim();
  const dbStatus = getConnectionStatus();

  if (dbStatus.isConnected) {
    try {
      const user = await User.findOne({ email: normalized });
      if (user) return user;
    } catch (err) {
      console.warn('[UserService] MongoDB findUserByEmail failed, checking local store:', err.message);
    }
  }

  const mem = inMemoryUsers.get(normalized);
  return mem ? createSafeUserProxy(mem) : null;
}

/**
 * Find user by ID (MongoDB Atlas primary, memory fallback)
 */
export async function findUserById(id) {
  if (!id) return null;
  const dbStatus = getConnectionStatus();

  if (dbStatus.isConnected) {
    try {
      const user = await User.findById(id);
      if (user) return user;
    } catch (err) {
      console.warn('[UserService] MongoDB findUserById failed, checking local store:', err.message);
    }
  }

  const mem = inMemoryUsers.get(String(id));
  return mem ? createSafeUserProxy(mem) : null;
}

/**
 * Create a new user (MongoDB Atlas primary, memory fallback)
 */
export async function createUser({
  name,
  email,
  passwordHash,
  emailVerified = false,
  verificationTokenHash = null,
  verificationTokenExpires = null,
}) {
  const normalizedEmail = email.toLowerCase().trim();
  const dbStatus = getConnectionStatus();

  if (dbStatus.isConnected) {
    try {
      const newUser = new User({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        emailVerified,
        verificationTokenHash,
        verificationTokenExpires,
      });
      await newUser.save();
      return newUser;
    } catch (err) {
      console.warn('[UserService] MongoDB createUser failed, falling back to memory store:', err.message);
    }
  }

  const id = crypto.randomUUID();
  const memUser = createSafeUserProxy({
    _id: id,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    emailVerified,
    verificationTokenHash,
    verificationTokenExpires,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  inMemoryUsers.set(normalizedEmail, memUser);
  inMemoryUsers.set(id, memUser);
  return memUser;
}

export default {
  findUserByEmail,
  findUserById,
  createUser,
};
