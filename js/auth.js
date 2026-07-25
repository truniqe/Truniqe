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
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.498 1.453 5.418 1.454 5.54.002 10.048-4.509 10.052-10.05.002-2.684-1.038-5.207-2.93-7.1-1.892-1.891-4.409-2.934-7.098-2.936-5.544 0-10.056 4.51-10.06 10.051-.002 1.948.5 3.85 1.452 5.46L2.52 21.57l6.127-1.616zm9.224-3.143c-.27-.135-1.597-.788-1.845-.878-.247-.09-.427-.135-.607.135-.18.27-.697.878-.855 1.058-.158.18-.315.202-.585.067-1.15-.578-2.012-1.01-2.825-2.41-.213-.368.213-.342.61-.137.355.18.427.3.562.45.135.15.068.315-.034.45-.101.135-.855 1.058-1.047 1.238-.19.18-.382.202-.652.067-1.564-.78-2.584-1.45-3.607-3.21-.27-.463.27-.428.77-.927.12-.12.27-.27.36-.405.09-.135.135-.225.202-.36.068-.135.034-.27-.017-.36-.05-.09-.427-1.058-.585-1.44-.153-.372-.322-.322-.427-.322-.102 0-.218-.011-.334-.011-.116 0-.304.045-.463.202-.158.158-.607.585-.607 1.429s.607 1.665.697 1.789c.09.124 1.193 1.822 2.89 2.553.404.174.718.278.963.356.406.129.776.111 1.069.067.327-.049 1.047-.427 1.193-.84.146-.413.146-.766.101-.84-.045-.075-.18-.12-.45-.255z"/>
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
