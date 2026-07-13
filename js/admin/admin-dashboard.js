// ============================================================
// js/admin/admin-dashboard.js — Admin Bookings Overview
// ============================================================

import { initAuth, updateNav, onAuthChange, isAdmin, requireAdmin,
         formatCurrency, formatDate, showToast } from '../auth.js';
import { fetchAllBookings, updateBooking } from '../supabase.js';

async function init() {
  await initAuth();
  if (!isAdmin()) { requireAdmin(); return; }
  onAuthChange(updateAdminNav);
  setupSidebarToggle();
  await loadStats();
  await loadBookings();
  setupFilters();
}

function updateAdminNav() {
  const nameEl = document.getElementById('admin-user-name');
  const initEl = document.getElementById('admin-user-initial');
  // Importing from auth
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

    document.getElementById('stat-total-bookings').textContent = allBookings.length;
    document.getElementById('stat-confirmed').textContent = confirmed.length;
    document.getElementById('stat-revenue').textContent = formatCurrency(revenue);
    document.getElementById('stat-pending').textContent = allBookings.filter(b => b.status === 'pending').length;
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
          // Refresh
          allBookings = [];
          await loadStats();
          await loadBookings(document.getElementById('filter-status')?.value || 'all');
        } catch (err) {
          showToast('Error', err.message, 'error');
        }
      });
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--error)">${err.message}</td></tr>`;
  }
}

function renderBookingRow(b) {
  const property = b.room_types?.properties;
  const room     = b.room_types;
  const ref      = b.id.replace(/-/g, '').toUpperCase().slice(-8);

  const statusBadge = {
    confirmed: 'badge-success',
    pending:   'badge-warning',
    cancelled: 'badge-error',
  }[b.status] || 'badge-neutral';

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
        <select class="form-select status-select" data-id="${b.id}"
                style="padding:4px 8px;font-size:12px;min-width:130px">
          <option value="pending"   ${b.status==='pending'   ?'selected':''}>Pending</option>
          <option value="confirmed" ${b.status==='confirmed' ?'selected':''}>Confirmed</option>
          <option value="cancelled" ${b.status==='cancelled' ?'selected':''}>Cancelled</option>
        </select>
      </td>
    </tr>
  `;
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
