import { signIn, signUp, signInWithGoogle, resetPassword, showToast } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
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

  // Check URL hash to default to signup
  if (window.location.hash === '#signup') {
    setMode('signup');
  }

  // Also check URL params for ?mode=reset
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'reset') {
    showToast('Success', 'Check your email for the password reset link.', 'success');
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
          // Auth listener in auth.js will handle redirect
        }
      } else {
        await signIn({ email, password });
        showToast('Success', 'Signed in successfully!');
        // Auth listener in auth.js will handle redirect
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
