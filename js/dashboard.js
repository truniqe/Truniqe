// ============================================================
// js/dashboard.js — Guest Booking History Dashboard
// ============================================================

import { initAuth, updateNav, onAuthChange, isLoggedIn, requireAuth,
         formatCurrency, formatDate, showToast } from './auth.js';
import { fetchGuestBookings, updateBooking } from './supabase.js';

async function init() {
  await initAuth();

  if (!isLoggedIn()) {
    requireAuth();
    return;
  }

  onAuthChange(updateNav);
  setupNav();
  await loadBookings();
}

function setupNav() {
  const nav = document.getElementById('main-nav');
  nav?.classList.remove('nav-transparent');
  nav?.classList.add('nav-solid');

  document.getElementById('nav-hamburger')?.addEventListener('click', function () {
    this.classList.toggle('open');
    document.getElementById('nav-mobile')?.classList.toggle('open');
  });
}

async function loadBookings() {
  const list    = document.getElementById('bookings-list');
  const loading = document.getElementById('bookings-loading');
  const empty   = document.getElementById('bookings-empty');

  if (!list) return;

  try {
    const bookings = await fetchGuestBookings();

    loading.style.display = 'none';

    if (!bookings.length) {
      empty.style.display = 'block';
      return;
    }

    list.innerHTML = bookings.map(renderBookingItem).join('');

    // Tab filtering
    setupTabs(bookings);

    // Cancel buttons
    list.querySelectorAll('.cancel-booking-btn').forEach(btn => {
      btn.addEventListener('click', () => cancelBooking(btn.dataset.id));
    });

  } catch (err) {
    console.error(err);
    loading.style.display = 'none';
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">Error loading bookings</div>
      <div class="empty-state-sub">${err.message}</div>
    </div>`;
  }
}

function renderBookingItem(booking) {
  const property = booking.room_types?.properties;
  const room     = booking.room_types;
  const nights   = Math.round((new Date(booking.check_out) - new Date(booking.check_in)) / 86400000);
  const ref      = booking.id.replace(/-/g, '').toUpperCase().slice(-8);

  const statusClass = {
    confirmed: 'badge-success',
    pending:   'badge-warning',
    cancelled: 'badge-error',
  }[booking.status] || 'badge-neutral';

  const imgUrl = property?.cover_image_url || '';

  return `
    <div class="booking-item" data-status="${booking.status}">
      ${imgUrl
        ? `<img class="booking-item-img" src="${imgUrl}" alt="${property?.name}">`
        : `<div class="booking-item-img" style="background:var(--surface-dark);display:flex;align-items:center;justify-content:center;font-size:48px">🏨</div>`
      }
      <div class="booking-item-body">
        <a href="/property.html?id=${booking.room_types?.property_id || ''}" class="booking-item-property">${property?.name || 'Property'}</a>
        <div class="booking-item-room">${room?.name || ''} &nbsp;·&nbsp; TRQ-${ref}</div>
        <div class="booking-item-dates">
          📅 ${formatDate(booking.check_in)} → ${formatDate(booking.check_out)}
          &nbsp;·&nbsp; ${nights} night${nights > 1 ? 's' : ''}
          &nbsp;·&nbsp; ${booking.guests_count} guest${booking.guests_count > 1 ? 's' : ''}
        </div>
      </div>
      <div class="booking-item-meta">
        <span class="badge ${statusClass}">${booking.status}</span>
        <div class="booking-item-amount">${formatCurrency(booking.total_amount)}</div>
        ${booking.status === 'confirmed' ? `
          <a href="/confirmation.html?booking=${booking.id}" class="btn btn-ghost btn-sm">View</a>
        ` : ''}
        ${booking.status === 'pending' ? `
          <button class="btn btn-danger btn-sm cancel-booking-btn" data-id="${booking.id}">Cancel</button>
        ` : ''}
      </div>
    </div>
  `;
}

function setupTabs(bookings) {
  const tabs = document.querySelectorAll('.booking-tab');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.dataset.filter;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const items = document.querySelectorAll('.booking-item');
      items.forEach(item => {
        if (filter === 'all' || item.dataset.status === filter) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

async function cancelBooking(bookingId) {
  if (!confirm('Are you sure you want to cancel this booking?')) return;

  try {
    await updateBooking(bookingId, { status: 'cancelled' });
    showToast('Booking cancelled', 'Your booking has been cancelled.', 'info');
    await loadBookings();
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', init);
