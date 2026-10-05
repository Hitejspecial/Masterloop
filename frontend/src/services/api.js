/**
 * MasterLoop Frontend API Service
 * Communicates directly with the Express backend (/api/*)
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'https://masterloop.onrender.com';

/**
 * Check backend health and MongoDB connection status
 */
export async function getBackendHealth() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn('[API] Health check failed:', error);
    return {
      status: 'offline',
      database: { state: 'disconnected', isConnected: false },
      geminiConfigured: false,
      error: error.message,
    };
  }
}

// hello

/**
 * Request an AI academic explanation for a question and user choice via Express backend
 */
export async function fetchAIExplanation({
  questionText,
  subject,
  topic,
  options = [],
  correctAnswer,
  explanation = '',
  userChoice = null,
}) {
  try {
    const res = await fetch(`${BASE_URL}/api/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionText,
        subject,
        topic,
        options,
        correctAnswer,
        explanation,
        userChoice,
      }),
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('[API] fetchAIExplanation failed:', error);
    return {
      success: true,
      mode: 'deterministic_fallback',
      analysis: explanation || 'Detailed academic derivation provided for this question.',
    };
  }
}

/**
 * Request an AI error diagnostic summary via Express backend
 */
export async function fetchAIMistakeSummary({ totalMistakes, categories, weakTopics }) {
  try {
    const res = await fetch(`${BASE_URL}/api/ai/mistake-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalMistakes,
        categories,
        weakTopics,
      }),
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('[API] fetchAIMistakeSummary failed:', error);
    return {
      success: true,
      mode: 'deterministic_fallback',
      summary: `Focus on resolving repeated mistakes in your weakest topics through targeted revision.`,
    };
  }
}

/**
 * Fetch questions from backend MongoDB (or fallback repository)
 */
export async function fetchQuestions(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/api/questions?${query}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn('[API] fetchQuestions failed:', error);
    return { success: false, questions: [] };
  }
}

/**
 * Fetch a single question by ID
 */
export async function fetchQuestionById(id) {
  try {
    const res = await fetch(`${BASE_URL}/api/questions/${id}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn(`[API] fetchQuestionById (${id}) failed:`, error);
    return { success: false, question: null };
  }
}

/**
 * Fetch tests from backend MongoDB collection 'tests'
 */
export async function fetchTests(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/api/tests?${query}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn('[API] fetchTests failed:', error);
    return { success: false, tests: [] };
  }
}

/**
 * Fetch test by ID with optional resolved questions
 */
export async function fetchTestById(id, resolveQuestions = true) {
  try {
    const res = await fetch(`${BASE_URL}/api/tests/${id}?resolveQuestions=${resolveQuestions}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn(`[API] fetchTestById (${id}) failed:`, error);
    return { success: false, test: null };
  }
}

/**
 * Fetch taxonomy from backend MongoDB collection 'taxonomy'
 */
export async function fetchTaxonomy() {
  try {
    const res = await fetch(`${BASE_URL}/api/taxonomy`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn('[API] fetchTaxonomy failed:', error);
    return { success: false, taxonomy: [], mistakeCategories: [] };
  }
}

/* ==========================================================================
   AUTHENTICATION API (HTTP-only Cookies, Verification, Sessions)
   ========================================================================== */

/**
 * Safe JSON response parser that handles HTML or unexpected error pages cleanly
 */
async function safeJson(res, defaultError = 'Request failed.') {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return { ok: res.ok, status: res.status, ...data };
    }
    await res.text().catch(() => '');
    return {
      ok: res.ok,
      status: res.status,
      success: false,
      error:
        res.status === 401
          ? 'Invalid email or password.'
          : res.status === 403
          ? 'Please verify your email before signing in.'
          : defaultError,
    };
  } catch (err) {
    return {
      ok: res.ok,
      status: res.status,
      success: false,
      error: defaultError,
    };
  }
}

/**
 * Register a new candidate account
 */
export async function registerUser({ name, email, password, confirmPassword }) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password, confirmPassword }),
    });
    return await safeJson(res, 'Network error during registration. Please try again.');
  } catch (error) {
    console.error('[API] registerUser failed:', error);
    return { success: false, error: 'Network error during registration. Please try again.' };
  }
}

/**
 * Verify account email address with security token
 */
export async function verifyEmail({ token, email }) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token, email }),
    });
    return await safeJson(res, 'Network error during email verification.');
  } catch (error) {
    console.error('[API] verifyEmail failed:', error);
    return { success: false, error: 'Network error during email verification.' };
  }
}

/**
 * Resend verification email link to candidate
 */
export async function resendVerificationEmail({ email }) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    return await safeJson(res, 'Network error resending verification link.');
  } catch (error) {
    console.error('[API] resendVerificationEmail failed:', error);
    return { success: false, error: 'Network error resending verification link.' };
  }
}

/**
 * Sign in candidate with credentials and receive secure HTTP-only cookie
 */
export async function loginUser({ email, password }) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    return await safeJson(res, 'Network error during sign in. Please try again.');
  } catch (error) {
    console.error('[API] loginUser failed:', error);
    return { success: false, error: 'Network error during sign in. Please try again.' };
  }
}

/**
 * Sign out and clear HTTP-only session cookie
 */
export async function logoutUser() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return await safeJson(res, 'Sign out completed.');
  } catch (error) {
    console.error('[API] logoutUser failed:', error);
    return { success: true };
  }
}

/**
 * Check active session and fetch current logged-in user profile
 */
export async function getCurrentUser() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      credentials: 'include',
    });
    if (!res.ok) return { success: false, authenticated: false, user: null };
    return await safeJson(res, 'Could not retrieve session.');
  } catch (error) {
    console.warn('[API] getCurrentUser failed:', error);
    return { success: false, authenticated: false, user: null };
  }
}

/**
 * Request password reset link for candidate email
 */
export async function requestPasswordReset({ email }) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    return await safeJson(res, 'Network error requesting password reset.');
  } catch (error) {
    console.error('[API] requestPasswordReset failed:', error);
    return { success: false, error: 'Network error requesting password reset.' };
  }
}

/**
 * Reset password using verification token
 */
export async function resetPassword({ token, email, newPassword, confirmPassword }) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token, email, newPassword, confirmPassword }),
    });
    return await safeJson(res, 'Network error resetting password.');
  } catch (error) {
    console.error('[API] resetPassword failed:', error);
    return { success: false, error: 'Network error resetting password.' };
  }
}

export default {
  getBackendHealth,
  fetchAIExplanation,
  fetchAIMistakeSummary,
  fetchQuestions,
  fetchQuestionById,
  fetchTests,
  fetchTestById,
  fetchTaxonomy,
  registerUser,
  verifyEmail,
  resendVerificationEmail,
  loginUser,
  logoutUser,
  getCurrentUser,
  requestPasswordReset,
  resetPassword,
};
