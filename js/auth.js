// ============================================================
// js/auth.js — Firebase Auth State Management
// Handles login, logout, role checks, nav updates
// Replaces Supabase login with Firebase Auth
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { supabase, fetchProfile, upsertProfile } from './supabase.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB7l0-x6dEaeom78KTVoU1O68enAFvctQc",
  authDomain: "truniqe-2a136.firebaseapp.com",
  projectId: "truniqe-2a136",
  storageBucket: "truniqe-2a136.firebasestorage.app",
  messagingSenderId: "359261669840",
  appId: "1:359261669840:web:6687c2e12cb09ca23911d5",
  measurementId: "G-YJ7MW6X3FR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

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
export function initAuth() {
  console.log('[Truniqe Auth] initAuth() starting with Firebase...');
  
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      console.log('[Truniqe Auth] Firebase onAuthStateChanged user:', user ? `found (${user.email})` : 'none');
      
      _session = user ? { user } : null;

      if (user) {
        try {
          _profile = await fetchProfile(user.uid);
          console.log('[Truniqe Auth] Supabase Profile loaded:', JSON.stringify(_profile));
          if (!_profile) {
            // Profile not found in database, auto-create one
            console.log('[Truniqe Auth] Supabase Profile not found, auto-creating...');
            _profile = await upsertProfile({
              id: user.uid,
              name: user.displayName || user.email.split('@')[0],
              role: 'guest'
            });
          }
        } catch (err) {
          console.warn('[Truniqe Auth] Fetch profile failed, trying auto-creation:', err.message);
          try {
            _profile = await upsertProfile({
              id: user.uid,
              name: user.displayName || user.email.split('@')[0],
              role: 'guest'
            });
          } catch (upsertErr) {
            console.error('[Truniqe Auth] Profile auto-creation failed:', upsertErr.message);
            _profile = null;
          }
        }
      } else {
        _profile = null;
      }

      _initDone = true;
      notifyListeners();

      // Check return redirect if logged in
      if (user) {
        const returnUrl = new URLSearchParams(window.location.search).get('return')
          || sessionStorage.getItem('truniqe_auth_return');
        if (returnUrl) {
          sessionStorage.removeItem('truniqe_auth_return');
          window.location.href = decodeURIComponent(returnUrl);
        }
      } else {
        // Sign out redirects for protected paths
        const protectedPaths = ['/dashboard', '/booking'];
        const isProtected = protectedPaths.some(p => window.location.pathname.includes(p));
        if (isProtected) {
          const returnUrl = encodeURIComponent(window.location.href);
          window.location.href = new URL(`../auth.html?return=${returnUrl}`, import.meta.url).href;
        }
      }

      resolve();
    });
  });
}

// ---- Getters ----
export function getSession() { return _session; }
export function getUser() {
  if (!_session?.user) return null;
  const user = _session.user;
  // Return wrapper mapping id to uid for database query compatibility
  return {
    ...user,
    id: user.uid,
    uid: user.uid,
    email: user.email
  };
}
export function getProfile() { return _profile; }
export function isLoggedIn() { return !!_session?.user; }
export function isAdmin() { return _profile?.role === 'admin'; }

// ---- Auth actions ----
export async function signUp({ email, password, name }) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Update Firebase display name
  await updateProfile(user, { displayName: name });
  
  // Insert profile in Supabase profiles table
  const profileData = { id: user.uid, name, role: 'guest' };
  _profile = await upsertProfile(profileData);
  _session = { user };
  
  notifyListeners();
  return { session: _session };
}

export async function signIn({ email, password }) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  _session = { user };
  
  _profile = await fetchProfile(user.uid).catch(async () => {
    // Auto-create profile if missing
    return await upsertProfile({ id: user.uid, name: user.displayName || email.split('@')[0], role: 'guest' });
  });

  notifyListeners();
  return { session: _session };
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const user = userCredential.user;
  _session = { user };
  
  try {
    _profile = await fetchProfile(user.uid);
    if (!_profile) {
      _profile = await upsertProfile({ id: user.uid, name: user.displayName || user.email.split('@')[0], role: 'guest' });
    }
  } catch (e) {
    _profile = await upsertProfile({ id: user.uid, name: user.displayName || user.email.split('@')[0], role: 'guest' });
  }

  notifyListeners();
  
  // Handled after OAuth popups completes
  const returnUrl = new URLSearchParams(window.location.search).get('return')
    || sessionStorage.getItem('truniqe_auth_return');
  if (returnUrl) {
    sessionStorage.removeItem('truniqe_auth_return');
    window.location.href = decodeURIComponent(returnUrl);
  } else {
    window.location.href = new URL('../dashboard/index.html', import.meta.url).href;
  }
}

export async function signOut() {
  await firebaseSignOut(auth);
  _session = null;
  _profile = null;
  notifyListeners();
  window.location.href = new URL('../index.html', import.meta.url).href;
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ---- Guard helpers ----
export function requireAuth() {
  if (!isLoggedIn()) {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = new URL(`../auth.html?return=${returnUrl}`, import.meta.url).href;
    return false;
  }
  return true;
}

export function requireAdmin() {
  if (!isLoggedIn()) {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = new URL(`../auth.html?return=${returnUrl}`, import.meta.url).href;
    return false;
  }
  if (!isAdmin()) {
    console.warn('[Truniqe] requireAdmin: profile role =', _profile?.role, '| profile =', JSON.stringify(_profile));
    window.location.href = new URL('../index.html?admin_denied=1', import.meta.url).href;
    return false;
  }
  return true;
}

// ---- Nav updater ----
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

// ============================================================
// WHATSAPP FLOATING WIDGET DYNAMIC INJECTION
// ============================================================
function injectWhatsAppWidget() {
  if (document.getElementById('whatsapp-floating-widget')) return;

  const widget = document.createElement('a');
  widget.id = 'whatsapp-floating-widget';
  widget.href = 'https://wa.me/919910340021';
  widget.target = '_blank';
  widget.rel = 'noopener noreferrer';
  widget.className = 'whatsapp-widget-floating';
  widget.setAttribute('aria-label', 'Chat with us on WhatsApp');

  widget.innerHTML = `
    <svg viewBox="0 0 448 512" width="22" height="22" fill="currentColor" style="display:inline-block; vertical-align:middle;">
      <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
    </svg>
    <span>Chat with us</span>
  `;

  document.body.appendChild(widget);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectWhatsAppWidget);
} else {
  injectWhatsAppWidget();
}
