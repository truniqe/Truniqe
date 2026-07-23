// ============================================================
// js/admin/admin-dashboard.js — Admin Bookings + WhatsApp
// ============================================================

import { initAuth, updateNav, onAuthChange, isLoggedIn, requireAuth,
         isAdmin, requireAdmin,
         formatCurrency, formatDate, showToast } from '../auth.js';
import { fetchAllBookings, updateBooking } from '../supabase.js';

async function init() {
  console.log('[Admin Dashboard] init() starting...');
  await initAuth();

  console.log('[Admin Dashboard] isLoggedIn:', isLoggedIn(), 'isAdmin:', isAdmin());

  if (!isLoggedIn()) {
    console.log('[Admin Dashboard] Not logged in, redirecting to auth...');
    requireAuth();
    return;
  }
  if (!isAdmin()) {
    console.warn('[Admin Dashboard] User is logged in but NOT admin.');
    showToast('Admin Access Required', 'Your user account does not have admin permissions.', 'warning');
    const tbody = document.getElementById('bookings-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px;color:var(--text-secondary)">
        <strong>⚠️ Admin Access Required</strong><br>
        Your account role is not set to admin in Supabase.<br>
        <a href="/setup-admin.html" style="color:var(--gold-dark);font-weight:600;margin-top:8px;display:inline-block">Click here to setup admin privileges →</a><br>
        <a href="/debug-auth.html" style="color:var(--text-muted);font-size:13px;margin-top:4px;display:inline-block">Debug auth state →</a>
      </td></tr>`;
    }
    return;
  }

  console.log('[Admin Dashboard] Admin verified, loading dashboard...');
  onAuthChange(updateAdminNav);
  setupSidebarToggle();
  await loadStats();
  await loadBookings();
  setupFilters();
  setupWAModal();
}


function updateAdminNav() {
  const nameEl = document.getElementById('admin-user-name');
  const initEl = document.getElementById('admin-user-initial');
  import('../auth.js').then(({ getProfile, getUser }) => {
    const profile = getProfile();
    const user    = getUser();
    if (nameEl) nameEl.textContent = profile?.name || user?.email?.split('@')[0] || 'Admin';
    if (initEl) initEl.textContent = (profile?.name || user?.email || 'A')[0].toUpperCase();
  });
}

function setupSidebarToggle() {
  const toggle  = document.getElementById('admin-menu-toggle');
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('admin-overlay');
  toggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('open');
  });
  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
  });
}

let allBookings = [];

async function loadStats() {
  try {
    allBookings = await fetchAllBookings();
    const confirmed = allBookings.filter(b => b.status === 'confirmed');
    const revenue   = confirmed.reduce((sum, b) => sum + Number(b.total_amount), 0);
    const pending   = allBookings.filter(b => b.status === 'pending');

    document.getElementById('stat-total-bookings').textContent = allBookings.length;
    document.getElementById('stat-confirmed').textContent      = confirmed.length;
    document.getElementById('stat-revenue').textContent        = formatCurrency(revenue);
    document.getElementById('stat-pending').textContent        = pending.length;

    const rate = allBookings.length
      ? Math.round((confirmed.length / allBookings.length) * 100)
      : 0;
    const rateEl = document.getElementById('stat-confirm-rate');
    if (rateEl) rateEl.textContent = `${rate}% conversion rate`;

    // Update pending badge in nav
    const badge = document.getElementById('nav-pending-count');
    if (badge) {
      badge.textContent = pending.length;
      badge.style.display = pending.length ? '' : 'none';
    }

    // Update count label
    const countEl = document.getElementById('bookings-count');
    if (countEl) countEl.textContent = `${allBookings.length} total`;

  } catch (err) {
    console.error(err);
  }
}

async function loadBookings(statusFilter = 'all') {
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;

  try {
    if (!allBookings.length) allBookings = await fetchAllBookings();

    const filtered = statusFilter === 'all'
      ? allBookings
      : allBookings.filter(b => b.status === statusFilter);

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px;color:var(--text-muted)">No bookings found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(renderBookingRow).join('');

    // Status change dropdowns
    tbody.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const id = sel.dataset.id;
        try {
          await updateBooking(id, { status: sel.value });
          showToast('Updated', `Booking status changed to ${sel.value}.`);
          allBookings = [];
          await loadStats();
          await loadBookings(document.getElementById('filter-status')?.value || 'all');
        } catch (err) {
          showToast('Error', err.message, 'error');
        }
      });
    });

    // WhatsApp buttons
    tbody.querySelectorAll('.wa-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const bookingId = btn.dataset.bookingId;
        const booking = allBookings.find(b => b.id === bookingId);
        if (booking) openWAModal(booking);
      });
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--error)">${err.message}</td></tr>`;
  }
}

function renderBookingRow(b) {
  const property   = b.room_types?.properties;
  const room       = b.room_types;
  const ref        = b.id.replace(/-/g, '').toUpperCase().slice(-8);
  const ownerPhone = property?.owner_phone || '';
  const ownerName  = property?.owner_name  || 'Owner';

  const statusBadge = {
    confirmed: 'badge-success',
    pending:   'badge-warning',
    cancelled: 'badge-error',
  }[b.status] || 'badge-neutral';

  const waDisabled = !ownerPhone ? 'disabled title="No owner phone number set for this property"' : '';
  const waClass    = !ownerPhone ? 'table-action-btn wa-btn' : 'table-action-btn wa-btn wa-btn-active';

  return `
    <tr>
      <td><code style="font-size:11px;color:var(--text-muted)">TRQ-${ref}</code></td>
      <td>
        <div style="font-weight:600;color:var(--navy)">${b.guest_name || '—'}</div>
        <div style="font-size:12px;color:var(--text-muted)">${b.guest_phone || ''}</div>
      </td>
      <td>
        <div style="font-weight:500">${property?.name || '—'}</div>
        <div style="font-size:12px;color:var(--text-muted)">${room?.name || ''}</div>
      </td>
      <td>
        <div>${formatDate(b.check_in)}</div>
        <div style="font-size:12px;color:var(--text-muted)">→ ${formatDate(b.check_out)}</div>
      </td>
      <td>${b.guests_count}</td>
      <td style="font-weight:600">${formatCurrency(b.total_amount)}</td>
      <td>
        <span class="badge ${statusBadge}">${b.status}</span>
      </td>
      <td>
        <div style="display:flex;gap:var(--sp-2);align-items:center;flex-wrap:nowrap">
          <select class="form-select status-select" data-id="${b.id}"
                  style="padding:4px 8px;font-size:12px;min-width:120px">
            <option value="pending"   ${b.status==='pending'   ?'selected':''}>Pending</option>
            <option value="confirmed" ${b.status==='confirmed' ?'selected':''}>Confirmed</option>
            <option value="cancelled" ${b.status==='cancelled' ?'selected':''}>Cancelled</option>
          </select>
          <button class="${waClass}" data-booking-id="${b.id}"
                  ${waDisabled}
                  style="background:${ownerPhone ? '#25D366' : 'var(--surface-dark)'};
                         border-color:${ownerPhone ? '#25D366' : 'var(--surface-dark)'};
                         color:${ownerPhone ? '#fff' : 'var(--text-muted)'};
                         width:auto;padding:0 10px;gap:4px;font-size:12px;font-weight:600">
            💬 WhatsApp
          </button>
        </div>
      </td>
    </tr>
  `;
}

// ---- WhatsApp Modal ----
let currentWABooking = null;

function setupWAModal() {
  const modal     = document.getElementById('wa-modal');
  const closeBtn  = document.getElementById('wa-modal-close');
  const cancelBtn = document.getElementById('wa-cancel-btn');
  const sendBtn   = document.getElementById('wa-send-btn');

  closeBtn?.addEventListener('click',  closeWAModal);
  cancelBtn?.addEventListener('click', closeWAModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeWAModal(); });

  sendBtn?.addEventListener('click', () => {
    const phone   = currentWABooking?.room_types?.properties?.owner_phone;
    const message = document.getElementById('wa-message')?.value || '';
    if (!phone) { showToast('Error', 'No owner phone number available.', 'error'); return; }

    // Strip non-digits, ensure country code
    const cleaned = phone.replace(/\D/g, '');
    const withCC  = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
    const url     = `https://wa.me/${withCC}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    closeWAModal();
  });
}

function openWAModal(booking) {
  currentWABooking = booking;
  const property = booking.room_types?.properties;
  const room     = booking.room_types;

  // Populate owner info
  const ownerName  = property?.owner_name  || 'Property Owner';
  const ownerPhone = property?.owner_phone || '';
  document.getElementById('wa-owner-name').textContent  = ownerName;
  document.getElementById('wa-owner-phone').textContent = ownerPhone ? `+${ownerPhone.replace(/\D/g, '')}` : '(no phone)';

  // Build message
  const checkIn  = formatDate(booking.check_in);
  const checkOut = formatDate(booking.check_out);
  const nights   = Math.round(
    (new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24)
  );
  const message = [
    `Hello ${ownerName}! 👋`,
    ``,
    `A new booking has been confirmed on Truniqe for *${property?.name || 'your property'}*.`,
    ``,
    `📋 *Booking Details*`,
    `Guest: ${booking.guest_name || 'Guest'}`,
    `Phone: ${booking.guest_phone || 'N/A'}`,
    `Room: ${room?.name || 'N/A'}`,
    `Check-in: ${checkIn}`,
    `Check-out: ${checkOut}`,
    `Nights: ${nights}`,
    `Guests: ${booking.guests_count}`,
    `Amount: ₹${Number(booking.total_amount).toLocaleString('en-IN')}`,
    booking.special_requests ? `Special Requests: ${booking.special_requests}` : '',
    ``,
    `Please ensure the property is ready for the guest's arrival.`,
    ``,
    `— Truniqe Team 🏛`,
  ].filter(l => l !== undefined).join('\n');

  document.getElementById('wa-message').value = message;

  const modal = document.getElementById('wa-modal');
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('open'));
}

function closeWAModal() {
  const modal = document.getElementById('wa-modal');
  modal?.classList.remove('open');
  setTimeout(() => { if (modal) modal.style.display = 'none'; }, 200);
  currentWABooking = null;
}

function setupFilters() {
  document.getElementById('filter-status')?.addEventListener('change', function() {
    loadBookings(this.value);
  });

  document.getElementById('search-bookings')?.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    document.querySelectorAll('#bookings-tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
