// ============================================================
// js/booking.js — Booking Flow + Razorpay Integration
// ============================================================

import { initAuth, updateNav, onAuthChange, getUser, isLoggedIn, requireAuth,
         showToast, formatCurrency, formatDate, nightsBetween } from './auth.js';
import { fetchPropertyById, fetchRoomTypes, checkAvailability,
         createBooking, updateBooking, blockDatesForBooking } from './supabase.js';
import { RAZORPAY_KEY_ID, APP_NAME } from './config.js';

const params     = new URLSearchParams(window.location.search);
const propertyId = params.get('property');
const roomId     = params.get('room');
const checkIn    = params.get('checkin');
const checkOut   = params.get('checkout');

let property = null;
let room     = null;
let nights   = 0;
let total    = 0;
let pendingBookingId = null;

async function init() {
  await initAuth();
  onAuthChange(updateNav);

  // Guard: must be logged in
  if (!isLoggedIn()) {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `/auth.html?return=${returnUrl}`;
    return;
  }

  // Validate params
  if (!propertyId || !roomId || !checkIn || !checkOut) {
    showError('Missing booking information. Please go back and select a room.');
    return;
  }

  setupNav();

  try {
    [property] = await Promise.all([fetchPropertyById(propertyId)]);
    const rooms = await fetchRoomTypes(propertyId);
    room = rooms.find(r => r.id === roomId);

    if (!property || !room) {
      showError('Property or room not found.');
      return;
    }

    nights = nightsBetween(checkIn, checkOut);
    if (nights < 1) {
      showError('Invalid dates selected.');
      return;
    }

    total = nights * room.base_price;

    renderSummary();
    prefillGuestInfo();
    await checkDatesAvailable();
    setupForm();

    document.getElementById('booking-loading').style.display = 'none';
    document.getElementById('booking-content').style.display = 'block';

  } catch (err) {
    console.error(err);
    showError(err.message);
  }
}

function showError(msg) {
  document.getElementById('booking-loading').style.display = 'none';
  document.getElementById('booking-error').style.display = 'block';
  document.getElementById('booking-error-msg').textContent = msg;
}

function setupNav() {
  const nav = document.getElementById('main-nav');
  nav?.classList.remove('nav-transparent');
  nav?.classList.add('nav-light');
}

// ---- Render Summary ----
function renderSummary() {
  const summaryEl = document.getElementById('booking-summary-content');
  if (!summaryEl) return;

  const imgUrl = room.photos?.[0] || property.cover_image_url || '';

  summaryEl.innerHTML = `
    ${imgUrl ? `<img class="booking-summary-img" src="${imgUrl}" alt="${property.name}">` : ''}
    <div class="booking-summary-property">${property.name}</div>
    <div class="booking-summary-location">📍 ${property.location}</div>
    <div class="booking-summary-row">
      <span class="booking-summary-label">Room</span>
      <span class="booking-summary-value">${room.name}</span>
    </div>
    <div class="booking-summary-row">
      <span class="booking-summary-label">Check-in</span>
      <span class="booking-summary-value">${formatDate(checkIn)}</span>
    </div>
    <div class="booking-summary-row">
      <span class="booking-summary-label">Check-out</span>
      <span class="booking-summary-value">${formatDate(checkOut)}</span>
    </div>
    <div class="booking-summary-row">
      <span class="booking-summary-label">Nights</span>
      <span class="booking-summary-value">${nights}</span>
    </div>
    <div class="booking-summary-row">
      <span class="booking-summary-label">Rate</span>
      <span class="booking-summary-value">${formatCurrency(room.base_price)}/night</span>
    </div>
    <div class="booking-total-row">
      <span class="booking-total-label">Total</span>
      <span class="booking-total-amount">${formatCurrency(total)}</span>
    </div>
    <div style="margin-top:var(--sp-4);font-size:var(--text-xs);color:rgba(255,255,255,0.4)">
      ✓ Taxes & fees included · Free cancellation available
    </div>
  `;
}

// ---- Pre-fill guest info ----
function prefillGuestInfo() {
  const user = getUser();
  if (!user) return;

  const nameEl  = document.getElementById('guest-name');
  const emailEl = document.getElementById('guest-email');

  if (emailEl) emailEl.value = user.email;
  if (nameEl && user.user_metadata?.full_name) {
    nameEl.value = user.user_metadata.full_name;
  }
}

// ---- Check availability ----
async function checkDatesAvailable() {
  const statusEl = document.getElementById('availability-status');
  if (!statusEl) return;

  statusEl.className = 'availability-check checking';
  statusEl.innerHTML = `<div class="spinner spinner-sm"></div> Checking availability...`;

  try {
    const isAvailable = await checkAvailability(roomId, checkIn, checkOut);

    if (isAvailable) {
      statusEl.className = 'availability-check available';
      statusEl.innerHTML = `✓ Dates are available`;
    } else {
      statusEl.className = 'availability-check unavailable';
      statusEl.innerHTML = `✕ Sorry, these dates are no longer available. <a href="/property.html?id=${propertyId}" style="color:var(--error);text-decoration:underline">Choose other dates</a>`;
      document.getElementById('pay-btn')?.setAttribute('disabled', 'true');
    }
  } catch (err) {
    statusEl.className = 'availability-check unavailable';
    statusEl.innerHTML = `Could not verify availability. Please try again.`;
  }
}

// ---- Form setup ----
function setupForm() {
  const form = document.getElementById('booking-form');
  form?.addEventListener('submit', handleBookingSubmit);
}

async function handleBookingSubmit(e) {
  e.preventDefault();

  const name     = document.getElementById('guest-name')?.value?.trim();
  const phone    = document.getElementById('guest-phone')?.value?.trim();
  const guests   = parseInt(document.getElementById('guest-count')?.value, 10) || 1;
  const requests = document.getElementById('special-requests')?.value?.trim();

  if (!name || !phone) {
    showToast('Missing details', 'Please fill in your name and phone number.', 'error');
    return;
  }

  if (guests > room.max_guests) {
    showToast('Too many guests', `This room fits max ${room.max_guests} guests.`, 'warning');
    return;
  }

  // Re-check availability before payment
  const stillAvailable = await checkAvailability(roomId, checkIn, checkOut).catch(() => false);
  if (!stillAvailable) {
    showToast('Dates unavailable', 'These dates were just booked. Please choose others.', 'error');
    return;
  }

  // Create a pending booking record first
  try {
    const booking = await createBooking({
      room_type_id: roomId,
      guest_id: getUser().id,
      check_in: checkIn,
      check_out: checkOut,
      guests_count: guests,
      total_amount: total,
      status: 'pending',
      guest_name: name,
      guest_phone: phone,
      special_requests: requests,
    });
    pendingBookingId = booking.id;
  } catch (err) {
    showToast('Error', 'Could not create booking. Please try again.', 'error');
    console.error(err);
    return;
  }

  // Launch Razorpay
  launchRazorpay({ name, phone, guests });
}

// ---- Razorpay ----
function launchRazorpay({ name, phone }) {
  // Guard: check if Razorpay script loaded
  if (typeof window.Razorpay === 'undefined') {
    showToast('Payment unavailable',
      'Razorpay SDK not loaded. Add your key in js/config.js and ensure the script tag is present.',
      'error');
    return;
  }

  const user = getUser();

  const options = {
    key: RAZORPAY_KEY_ID,
    amount: Math.round(total * 100), // paise
    currency: 'INR',
    name: APP_NAME,
    description: `${property.name} · ${room.name} · ${nights} night${nights > 1 ? 's' : ''}`,
    image: property.cover_image_url || '',
    prefill: {
      name,
      email: user?.email || '',
      contact: phone,
    },
    theme: { color: '#E8B86D' },
    modal: {
      ondismiss: async () => {
        // Cancel the pending booking on dismiss
        if (pendingBookingId) {
          await updateBooking(pendingBookingId, { status: 'cancelled' }).catch(() => {});
          pendingBookingId = null;
        }
        showToast('Payment cancelled', 'Your booking was not completed.', 'warning');
      },
    },
    handler: async (response) => {
      await onPaymentSuccess(response);
    },
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', async (resp) => {
      showToast('Payment failed', resp.error.description, 'error');
      if (pendingBookingId) {
        await updateBooking(pendingBookingId, { status: 'cancelled' }).catch(() => {});
        pendingBookingId = null;
      }
    });
    rzp.open();
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

// ---- Payment success handler ----
async function onPaymentSuccess(response) {
  try {
    // Update booking to confirmed
    await updateBooking(pendingBookingId, {
      status: 'confirmed',
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_order_id: response.razorpay_order_id || null,
    });

    // Block the dates
    await blockDatesForBooking(roomId, checkIn, checkOut);

    // Redirect to confirmation
    window.location.href = `/confirmation.html?booking=${pendingBookingId}`;

  } catch (err) {
    console.error('Post-payment error:', err);
    showToast('Almost done!',
      'Payment received but we hit an error saving your booking. Please contact support with payment ID: ' + response.razorpay_payment_id,
      'warning');
  }
}

document.addEventListener('DOMContentLoaded', init);
