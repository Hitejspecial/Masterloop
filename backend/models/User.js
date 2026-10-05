import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationTokenHash: {
      type: String,
      default: null,
      index: true,
    },
    verificationTokenExpires: {
      type: Date,
      default: null,
    },
    resetPasswordTokenHash: {
      type: String,
      default: null,
      index: true,
    },
    resetPasswordTokenExpires: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Never expose passwordHash or token hashes in JSON conversions
UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.verificationTokenHash;
  delete obj.verificationTokenExpires;
  delete obj.resetPasswordTokenHash;
  delete obj.resetPasswordTokenExpires;
  return obj;
};

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;
