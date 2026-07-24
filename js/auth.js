// ============================================================
// js/auth.js — Auth State Management
// Handles login, logout, role checks, nav updates
// ============================================================

import { supabase } from './supabase.js';
import { fetchProfile } from './supabase.js';

// ---- Cached session ----
let _session = null;
let _profile = null;
let _initDone = false;

// ---- Listeners ----
const _listeners = new Set();

export function onAuthChange(fn) {
  _listeners.add(fn);
  // Immediately call with current state
  fn(_session, _profile);
}

function notifyListeners() {
  _listeners.forEach(fn => fn(_session, _profile));
}

// ---- Initialize ----
export async function initAuth() {
  console.log('[Truniqe Auth] initAuth() starting...');

  // Use getSession() first to get local session
  const { data: { session }, error: sessError } = await supabase.auth.getSession();

  if (sessError) {
    console.error('[Truniqe Auth] getSession error:', sessError.message);
  }

  _session = session;
  console.log('[Truniqe Auth] Session:', session ? `found (${session.user.email})` : 'none');

  if (session) {
    try {
      _profile = await fetchProfile(session.user.id);
      console.log('[Truniqe Auth] Profile loaded:', JSON.stringify(_profile));
    } catch (err) {
      console.warn('[Truniqe Auth] Profile fetch failed, retrying...', err.message);
      // Retry once after a short delay
      try {
        await new Promise(r => setTimeout(r, 500));
        _profile = await fetchProfile(session.user.id);
        console.log('[Truniqe Auth] Profile loaded on retry:', JSON.stringify(_profile));
      } catch (retryErr) {
        console.error('[Truniqe Auth] Profile fetch retry failed:', retryErr.message);
        _profile = null;
      }
    }
  }

  _initDone = true;
  notifyListeners();

  // Listen for auth state changes
  supabase.auth.onAuthStateChange(async (event, newSession) => {
    console.log('[Truniqe Auth] onAuthStateChange:', event, newSession ? `(${newSession.user.email})` : '(no session)');

    // Skip INITIAL_SESSION event — we already handled it above via getSession()
    // This prevents a race condition where the callback fires before initAuth resolves
    if (event === 'INITIAL_SESSION') {
      console.log('[Truniqe Auth] Skipping INITIAL_SESSION (already handled)');
      return;
    }

    _session = newSession;

    if (newSession) {
      _profile = await fetchProfile(newSession.user.id).catch((err) => {
        console.warn('[Truniqe Auth] Profile fetch in state change failed:', err.message);
        return _profile; // Keep existing profile if fetch fails
      });
    } else {
      _profile = null;
    }

    notifyListeners();

    if (event === 'SIGNED_IN') {
      // Redirect if there's a return URL (from query param or sessionStorage)
      const returnUrl = new URLSearchParams(window.location.search).get('return')
        || sessionStorage.getItem('truniqe_auth_return');
      if (returnUrl) {
        sessionStorage.removeItem('truniqe_auth_return');
        window.location.href = decodeURIComponent(returnUrl);
      }
    }

    if (event === 'SIGNED_OUT') {
      console.log('[Truniqe Auth] SIGNED_OUT event fired');
      const protectedPaths = ['/dashboard', '/booking'];
      const isProtected = protectedPaths.some(p => window.location.pathname.includes(p));
      if (isProtected) {
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = new URL(`../auth.html?return=${returnUrl}`, import.meta.url).href;
      }
    }
  });

  console.log('[Truniqe Auth] initAuth() complete. isLoggedIn:', !!_session, 'isAdmin:', _profile?.role === 'admin');
}

// ---- Getters ----
export function getSession() { return _session; }
export function getUser() { return _session?.user ?? null; }
export function getProfile() { return _profile; }
export function isLoggedIn() { return !!_session?.user; }
export function isAdmin() { return _profile?.role === 'admin'; }

// ---- Auth actions ----
export async function signUp({ email, password, name }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  // Build the redirect URL, preserving any return URL
  let redirectTo = new URL('../auth.html', import.meta.url).href;
  const returnUrl = new URLSearchParams(window.location.search).get('return');
  if (returnUrl) {
    redirectTo += `?return=${encodeURIComponent(returnUrl)}`;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.href = new URL('../index.html', import.meta.url).href;
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL('../auth.html?mode=reset', import.meta.url).href,
  });
  if (error) throw error;
}

// ---- Guard helpers ----

/**
 * Redirect to auth page if not logged in
 * Call this at top of any protected page
 */
export function requireAuth() {
  if (!isLoggedIn()) {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = new URL(`../auth.html?return=${returnUrl}`, import.meta.url).href;
    return false;
  }
  return true;
}

/**
 * Redirect to auth if not logged in, or to / if logged in but not admin.
 * Returns false if access is denied.
 */
export function requireAdmin() {
  if (!isLoggedIn()) {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = new URL(`../auth.html?return=${returnUrl}`, import.meta.url).href;
    return false;
  }
  if (!isAdmin()) {
    // Log profile for debugging
    console.warn('[Truniqe] requireAdmin: profile role =', _profile?.role, '| profile =', JSON.stringify(_profile));
    window.location.href = new URL('../index.html?admin_denied=1', import.meta.url).href;
    return false;
  }
  return true;
}

// ---- Nav updater ----
/**
 * Update navigation to reflect auth state.
 * Expects elements with id: nav-auth-btn, nav-user-menu, nav-user-name
 */
export function updateNav() {
  const authBtn   = document.getElementById('nav-auth-btn');
  const userMenu  = document.getElementById('nav-user-menu');
  const userName  = document.getElementById('nav-user-name');
  const userInit  = document.getElementById('nav-user-initial');
  const adminLink = document.getElementById('nav-admin-link');

  if (isLoggedIn()) {
    if (authBtn)  authBtn.style.display  = 'none';
    if (userMenu) userMenu.style.display = 'flex';
    if (userName) userName.textContent = _profile?.name || getUser()?.email?.split('@')[0] || 'Account';
    if (userInit) {
      const n = _profile?.name || getUser()?.email || 'U';
      userInit.textContent = n[0].toUpperCase();
    }
    if (adminLink) adminLink.style.display = isAdmin() ? 'block' : 'none';
  } else {
    if (authBtn)  authBtn.style.display  = 'flex';
    if (userMenu) userMenu.style.display = 'none';
    if (adminLink) adminLink.style.display = 'none';
  }
}

// ============================================================
// TOAST UTILITY (shared across pages)
// ============================================================
export function showToast(title, message = '', type = 'success') {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const container = document.getElementById('toast-container')
    || (() => {
      const c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      document.body.appendChild(c);
      return c;
    })();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.success}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================================
// DATE UTILITIES
// ============================================================
export function formatDate(dateStr, opts = {}) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...opts,
  });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function nightsBetween(checkIn, checkOut) {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function toISODate(date) {
  return date.toISOString().split('T')[0];
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toISODate(d);
}
