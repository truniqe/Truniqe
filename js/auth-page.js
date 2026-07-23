import { initAuth, signIn, signUp, signInWithGoogle, resetPassword,
         isLoggedIn, showToast } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  let mode = 'signin'; // 'signin' or 'signup'

  const tabSignIn = document.getElementById('tab-signin');
  const tabSignUp = document.getElementById('tab-signup');
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const groupName = document.getElementById('group-name');
  const submitBtn = document.getElementById('auth-submit-btn');
  const form = document.getElementById('auth-form');
  const btnGoogle = document.getElementById('btn-google');
  const forgotPasswordLink = document.getElementById('forgot-password');

  const params = new URLSearchParams(window.location.search);
  const returnUrl = params.get('return');

  // Initialize auth — this sets up the onAuthStateChange listener
  // which handles redirect via the 'return' query parameter
  await initAuth();

  // If the user is already logged in (e.g. returning from Google OAuth),
  // redirect immediately
  if (isLoggedIn()) {
    console.log('[Auth Page] Already logged in, redirecting...');
    redirectAfterLogin();
    return;
  }

  // Check URL hash to default to signup
  if (window.location.hash === '#signup') {
    setMode('signup');
  }

  // Check URL params for ?mode=reset
  if (params.get('mode') === 'reset') {
    showToast('Success', 'Check your email for the password reset link.', 'success');
  }

  function redirectAfterLogin() {
    if (returnUrl) {
      window.location.href = decodeURIComponent(returnUrl);
    } else {
      // Default: go to dashboard
      window.location.href = new URL('../dashboard/index.html', import.meta.url).href;
    }
  }

  function setMode(newMode) {
    mode = newMode;
    if (mode === 'signin') {
      tabSignIn.classList.add('active');
      tabSignUp.classList.remove('active');
      title.textContent = 'Welcome back';
      subtitle.textContent = 'Sign in to manage your bookings and saved stays.';
      groupName.style.display = 'none';
      submitBtn.textContent = 'Sign In';
      forgotPasswordLink.style.display = 'block';
    } else {
      tabSignUp.classList.add('active');
      tabSignIn.classList.remove('active');
      title.textContent = 'Create an account';
      subtitle.textContent = 'Join Truniqe to discover and book curated stays.';
      groupName.style.display = 'block';
      submitBtn.textContent = 'Create Account';
      forgotPasswordLink.style.display = 'none';
    }
  }

  tabSignIn.addEventListener('click', () => setMode('signin'));
  tabSignUp.addEventListener('click', () => setMode('signup'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value;
    
    // Disable button to prevent double submit
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Please wait...';
    submitBtn.disabled = true;

    try {
      if (mode === 'signup') {
        if (!name) throw new Error('Please enter your full name.');
        const { session } = await signUp({ email, password, name });
        if (!session) {
          showToast('Check your email', 'We sent you a confirmation link.', 'info');
        } else {
          showToast('Success', 'Account created successfully!');
          // Redirect after a brief delay to show the toast
          setTimeout(redirectAfterLogin, 800);
        }
      } else {
        await signIn({ email, password });
        showToast('Success', 'Signed in successfully!');
        // Redirect after a brief delay to show the toast
        setTimeout(redirectAfterLogin, 800);
      }
    } catch (err) {
      console.error(err);
      showToast('Error', err.message || 'Authentication failed', 'error');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

  btnGoogle.addEventListener('click', async () => {
    try {
      // Store the return URL in sessionStorage so we can retrieve it
      // after the OAuth redirect (query params are lost during OAuth flow)
      if (returnUrl) {
        sessionStorage.setItem('truniqe_auth_return', returnUrl);
      }
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      showToast('Error', err.message || 'Google sign in failed', 'error');
    }
  });

  forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    if (!email) {
      showToast('Error', 'Please enter your email address first.', 'error');
      return;
    }
    
    try {
      await resetPassword(email);
      showToast('Success', 'Password reset email sent!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error', err.message || 'Failed to send reset email', 'error');
    }
  });
});
