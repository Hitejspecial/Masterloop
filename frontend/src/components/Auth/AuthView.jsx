import React, { useState, useEffect } from 'react';
import {
  Layers,
  Mail,
  Lock,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';
import api from '../../services/api.js';

export function AuthView({ initialMode = 'login', onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'verify-email' | 'forgot-password' | 'reset-password'

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [needsVerificationEmail, setNeedsVerificationEmail] = useState(null);
  const [resendingVerification, setResendingVerification] = useState(false);

  // Check URL parameters for token and email (e.g. clicked link from email)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('mode');
    const urlToken = params.get('token');
    const urlEmail = params.get('email');

    if (urlToken) setToken(urlToken);
    if (urlEmail) setEmail(urlEmail);

    if (urlMode === 'verify-email' || (urlToken && urlMode !== 'reset-password')) {
      setMode('verify-email');
      // If token and email are both in URL, attempt automatic verification
      if (urlToken && urlEmail) {
        verifyEmailToken(urlToken, urlEmail);
      }
    } else if (urlMode === 'reset-password' || (urlMode && ['login', 'register', 'forgot-password'].includes(urlMode))) {
      setMode(urlMode);
    }
  }, []);

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSwitchMode = (newMode) => {
    clearMessages();
    setMode(newMode);
  };

  // 1. Email Verification Execution
  const verifyEmailToken = async (verToken, verEmail) => {
    setLoading(true);
    clearMessages();
    try {
      const res = await api.verifyEmail({ token: verToken, email: verEmail });
      if (res.ok && res.success) {
        setSuccessMessage(res.message || 'Email verified successfully! You can now sign in.');
      } else {
        setErrorMessage(res.error || 'Verification token is invalid or has expired.');
      }
    } catch (err) {
      setErrorMessage('Failed to verify email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Resend Verification
  const handleResendVerification = async () => {
    const targetEmail = needsVerificationEmail || email;
    if (!targetEmail) {
      setErrorMessage('Please provide your email address to resend verification.');
      return;
    }

    setResendingVerification(true);
    clearMessages();
    try {
      const res = await api.resendVerificationEmail({ email: targetEmail });
      if (res.ok && res.success) {
        setSuccessMessage(res.message || 'Verification link resent. Please check your inbox.');
      } else {
        setErrorMessage(res.error || 'Unable to resend verification email.');
      }
    } catch (err) {
      setErrorMessage('Network error while resending verification.');
    } finally {
      setResendingVerification(false);
    }
  };

  // 3. Handle Registration Submission
  const handleRegister = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!name.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });

      if (res.ok && res.success) {
        setNeedsVerificationEmail(email.trim());
        setMode('verify-email');
        setSuccessMessage(res.message || 'Account created! Please check your email to verify your account.');
      } else {
        setErrorMessage(res.error || 'Registration failed. Please check your details.');
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Login Submission
  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.loginUser({
        email: email.trim(),
        password,
      });

      if (res.ok && res.success && res.user) {
        // Authenticated successfully! Notify parent
        if (onAuthSuccess) {
          onAuthSuccess(res.user);
        }
      } else if (res.needsVerification) {
        setNeedsVerificationEmail(res.email || email.trim());
        setErrorMessage('Your email has not been verified yet. Please check your inbox or resend verification.');
      } else {
        setErrorMessage(res.error || 'Invalid email or password.');
      }
    } catch (err) {
      setErrorMessage('Unable to connect to service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Handle Forgot Password Submission
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.requestPasswordReset({ email: email.trim() });
      if (res.ok && res.success) {
        setSuccessMessage(res.message || 'If an account exists with that email address, a password reset link has been sent.');
      } else {
        setErrorMessage(res.error || 'Failed to process request.');
      }
    } catch (err) {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 6. Handle Reset Password Submission
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!password) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword({
        token,
        email: email.trim(),
        newPassword: password,
        confirmPassword,
      });

      if (res.ok && res.success) {
        setSuccessMessage(res.message || 'Password reset successfully. You can now sign in with your new password.');
        setPassword('');
        setConfirmPassword('');
      } else {
        setErrorMessage(res.error || 'Failed to reset password. Link may be expired.');
      }
    } catch (err) {
      setErrorMessage('Network error while resetting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-900 select-none">
      {/* Brand Header */}
      <div className="mb-6 flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs">
          <Layers className="w-4 h-4 stroke-[2.5]" />
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-bold text-lg tracking-tight text-slate-900">MasterLoop</span>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
            GATE CSE Portal
          </span>
        </div>
      </div>

      {/* Main Auth Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 max-w-md w-full shadow-xs space-y-5">
        {/* Dynamic Header */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {mode === 'login' && 'Welcome back'}
            {mode === 'register' && 'Create your account'}
            {mode === 'verify-email' && 'Verify your email'}
            {mode === 'forgot-password' && 'Reset your password'}
            {mode === 'reset-password' && 'Set a new password'}
          </h2>
          <p className="text-xs text-slate-500">
            {mode === 'login' && 'Sign in to access your mock exams, question sets, and test records.'}
            {mode === 'register' && 'Register to practice questions, take full mocks, and track your progress.'}
            {mode === 'verify-email' && 'Verify email ownership to activate your examination account.'}
            {mode === 'forgot-password' && 'Enter your email address to receive a secure password reset link.'}
            {mode === 'reset-password' && 'Choose a strong password with at least 8 characters.'}
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span>{errorMessage}</span>
              {(needsVerificationEmail || mode === 'verify-email') && (
                <div className="mt-1.5 pt-1.5 border-t border-rose-200/80">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="font-semibold text-rose-800 hover:text-rose-900 underline cursor-pointer"
                  >
                    {resendingVerification ? 'Sending...' : 'Resend verification link'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed flex-1">{successMessage}</span>
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('forgot-password')}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <div className="text-center pt-2 text-xs text-slate-500">
              <span>Don't have an account? </span>
              <button
                type="button"
                onClick={() => handleSwitchMode('register')}
                className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
              >
                Create account
              </button>
            </div>
          </form>
        )}

        {/* 2. REGISTRATION FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Full Name</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Confirm Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <div className="text-center pt-2 text-xs text-slate-500">
              <span>Already have an account? </span>
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
              >
                Sign in
              </button>
            </div>
          </form>
        )}

        {/* 3. EMAIL VERIFICATION VIEW */}
        {mode === 'verify-email' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-700 space-y-2">
              <p className="leading-relaxed">
                We sent a secure verification link to{' '}
                <strong className="text-slate-900 font-mono">{email || needsVerificationEmail || 'your email'}</strong>.
              </p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Click the verification button in the email to activate your account. Links expire after 24 hours.
              </p>
            </div>

            {!successMessage && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Verification Code or Token
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Paste token or click email link"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => verifyEmailToken(token, email || needsVerificationEmail)}
                  disabled={loading || !token.trim()}
                  className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Verify Email Address</span>
                </button>
              </div>
            )}

            {successMessage && (
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendingVerification}
                className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
              >
                {resendingVerification ? 'Resending...' : 'Resend verification email'}
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Back to sign in
              </button>
            </div>
          </div>
        )}

        {/* 4. FORGOT PASSWORD VIEW */}
        {mode === 'forgot-password' && (
          <form onSubmit={handleForgotPassword} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Account Email Address</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending reset link...</span>
                </>
              ) : (
                <>
                  <span>Send reset link</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <div className="text-center pt-2 text-xs">
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="text-slate-500 hover:text-slate-800 inline-flex items-center space-x-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to sign in</span>
              </button>
            </div>
          </form>
        )}

        {/* 5. RESET PASSWORD VIEW */}
        {mode === 'reset-password' && (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">New Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating password...</span>
                </>
              ) : (
                <>
                  <span>Reset password</span>
                  <KeyRound className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <div className="text-center pt-2 text-xs">
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="text-slate-500 hover:text-slate-800 inline-flex items-center space-x-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to sign in</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AuthView;
