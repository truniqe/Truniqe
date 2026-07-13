// ============================================================
// js/config.js — Truniqe App Configuration
// Replace placeholder values with your real credentials
// ============================================================

// Supabase
export const SUPABASE_URL = 'https://zsssroacfcsmvnbmcikv.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpzc3Nyb2FjZmNzbXZuYm1jaWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MTUyMTQsImV4cCI6MjA5OTQ5MTIxNH0.cUtv-i1aDrfvhLCToHk1whCjyzOubhBgUvsdlVGSAt0';

// Razorpay (test key starts with rzp_test_)
export const RAZORPAY_KEY_ID = 'rzp_test_YOUR_KEY_HERE';

// App
export const APP_NAME = 'Truniqe';
export const APP_URL = window.location.origin;

// Email sender (for Resend, used in edge function or serverless)
export const FROM_EMAIL = 'bookings@truniqe.com';

// Angle tags — keep in sync with DB CHECK constraint
export const ANGLE_TAGS = [
  'Design & Heritage',
  'Offbeat Location',
  'Experience-Driven',
];

// Common amenities list (for admin form multi-select)
export const AMENITY_OPTIONS = [
  'WiFi',
  'Air conditioning',
  'Swimming pool',
  'Plunge pool',
  'Spa & wellness',
  'Ayurvedic treatments',
  'Yoga & meditation',
  'Restaurant',
  'Organic farm',
  'Rooftop terrace',
  'Mountain views',
  'Beach access',
  'Kayaking / water sports',
  'Cycling trails',
  'Trekking guides',
  'Airport transfers',
  'Heritage tours',
  'Photography workshops',
  'Stargazing deck',
  'In-house chef',
  'Bonfire / fire pit',
  'Pet-friendly',
  'No alcohol policy',
  'Solar-powered',
  'Digital detox rooms',
];
