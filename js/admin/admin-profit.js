// ============================================================
// js/admin/admin-profit.js — Revenue Analytics + Shareholder Payouts
// ============================================================

import { initAuth, onAuthChange, isAdmin, requireAdmin, showToast, formatCurrency } from '../auth.js';
import { fetchAllBookings } from '../supabase.js';

const STORAGE_KEY      = 'truniqe_shareholders';
const PAID_STORAGE_KEY = 'truniqe_paid_payouts';

let allBookings   = [];
let shareholders  = [];
let paidPayouts   = {}; // { shareId_period: true }
let editingShId   = null;
let currentRevenue = 0;

async function init() {
  await initAuth();
  // if (!isAdmin()) { requireAdmin(); return; }
  onAuthChange(updateAdminNav);
  setupSidebarToggle();

  shareholders = loadShareholders();
  paidPayouts  = loadPaidPayouts();

  setupShareholderModal();
  setupPeriodFilter();

  await loadBookings();
}

function updateAdminNav() {
  import('../auth.js').then(({ getProfile, getUser }) => {
    const profile = getProfile();
    const user    = getUser();
    const nameEl  = document.getElementById('admin-user-name');
    const initEl  = document.getElementById('admin-user-initial');
    if (nameEl) nameEl.textContent = profile?.name || user?.email?.split('@')[0] || 'Admin';
    if (initEl) initEl.textContent = (profile?.name || user?.email || 'A')[0].toUpperCase();
  });
}

function setupSidebarToggle() {
  const toggle  = document.getElementById('admin-menu-toggle');
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('admin-overlay');
  toggle?.addEventListener('click', () => { sidebar?.classList.toggle('open'); overlay?.classList.toggle('open'); });
  overlay?.addEventListener('click', () => { sidebar?.classList.remove('open'); overlay?.classList.remove('open'); });
}

// ---- Data Loading ----
async function loadBookings() {
  try {
    allBookings = await fetchAllBookings();
    renderAll();
  } catch (err) {
    console.error(err);
    showToast('Error', err.message, 'error');
  }
}

function getFilteredBookings() {
  const period    = document.getElementById('filter-period')?.value || 'all';
  const confirmed = allBookings.filter(b => b.status === 'confirmed');
  const now       = new Date();

  if (period === 'all') return confirmed;

  return confirmed.filter(b => {
    const d = new Date(b.created_at);
    if (period === 'thismonth') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (period === 'lastmonth') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
    }
    if (period === 'thisyear') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

function renderAll() {
  const bookings = getFilteredBookings();
  renderStats(bookings);
  renderChart(bookings);
  renderPropertyRevenue(bookings);
  renderShareholderPayouts(bookings);
}

// ---- Stats ----
function renderStats(bookings) {
  const total    = bookings.reduce((s, b) => s + Number(b.total_amount), 0);
  const count    = bookings.length;
  const avg      = count ? Math.round(total / count) : 0;
  const propSet  = new Set(bookings.map(b => b.room_types?.properties?.name).filter(Boolean));

  currentRevenue = total;

  document.getElementById('stat-total-revenue').textContent  = formatCurrency(total);
  document.getElementById('stat-booking-count').textContent  = count;
  document.getElementById('stat-avg-value').textContent      = formatCurrency(avg);
  document.getElementById('stat-earning-props').textContent  = propSet.size;
}

// ---- Revenue Chart (pure CSS/JS bars) ----
function renderChart(bookings) {
  const container = document.getElementById('revenue-chart');
  if (!container) return;

  // Group by month
  const months = {};
  bookings.forEach(b => {
    const d   = new Date(b.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[key] = (months[key] || 0) + Number(b.total_amount);
  });

  const sorted = Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-12);

  if (!sorted.length) {
    container.innerHTML = `<div style="text-align:center;padding:48px;color:var(--text-muted)">No revenue data for this period.</div>`;
    return;
  }

  const max = Math.max(...sorted.map(([, v]) => v)) || 1;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  container.innerHTML = `
    <div class="revenue-chart-inner">
      ${sorted.map(([key, val]) => {
        const [yr, mo] = key.split('-');
        const label    = `${monthNames[parseInt(mo) - 1]} ${yr.slice(2)}`;
        const heightPct = Math.max((val / max) * 100, 2);
        return `
          <div class="chart-bar-wrap">
            <div class="chart-bar-tooltip">₹${val.toLocaleString('en-IN')}</div>
            <div class="chart-bar" style="height:${heightPct}%"></div>
            <div class="chart-bar-label">${label}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ---- Property Revenue Breakdown ----
function renderPropertyRevenue(bookings) {
  const tbody = document.getElementById('property-revenue-tbody');
  if (!tbody) return;

  const propMap = {};
  const total   = bookings.reduce((s, b) => s + Number(b.total_amount), 0) || 1;

  bookings.forEach(b => {
    const name = b.room_types?.properties?.name || 'Unknown';
    if (!propMap[name]) propMap[name] = { revenue: 0, count: 0 };
    propMap[name].revenue += Number(b.total_amount);
    propMap[name].count++;
  });

  const sorted = Object.entries(propMap).sort(([, a], [, b]) => b.revenue - a.revenue);

  if (!sorted.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:48px;color:var(--text-muted)">No data</td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map(([name, d]) => {
    const sharePct = Math.round((d.revenue / total) * 100);
    return `
      <tr>
        <td style="font-weight:600;color:var(--navy)">${name}</td>
        <td style="text-align:center">${d.count}</td>
        <td style="font-weight:600">₹${d.revenue.toLocaleString('en-IN')}</td>
        <td>
          <div style="display:flex;align-items:center;gap:var(--sp-3)">
            <div style="flex:1;height:6px;background:var(--surface-dark);border-radius:var(--radius-full);overflow:hidden">
              <div style="height:100%;width:${sharePct}%;background:var(--gold);border-radius:var(--radius-full)"></div>
            </div>
            <span style="font-size:var(--text-xs);font-weight:600;color:var(--text-muted);min-width:32px">${sharePct}%</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ---- Shareholder Payouts ----
function renderShareholderPayouts(bookings) {
  const revenue = bookings.reduce((s, b) => s + Number(b.total_amount), 0);
  currentRevenue = revenue;

  const totalPct    = shareholders.reduce((s, sh) => s + Number(sh.share_pct), 0);
  const totalPaid   = shareholders.reduce((sum, sh) => {
    if (paidPayouts[sh.id]) return sum + (revenue * Number(sh.share_pct) / 100);
    return sum;
  }, 0);

  document.getElementById('share-total').textContent         = formatCurrency(revenue);
  document.getElementById('share-allocated-pct').textContent = `${Math.min(totalPct, 100).toFixed(1)}%`;
  document.getElementById('share-unallocated-pct').textContent = `${Math.max(0, 100 - totalPct).toFixed(1)}%`;
  document.getElementById('share-paid-total').textContent    = formatCurrency(totalPaid);

  // Warning
  const warn = document.getElementById('share-warning');
  if (warn) warn.style.display = totalPct > 100 ? '' : 'none';

  const list = document.getElementById('shareholders-list');
  if (!list) return;

  if (!shareholders.length) {
    list.innerHTML = `
      <div style="text-align:center;padding:48px;color:var(--text-muted)">
        <p style="font-size:var(--text-lg);margin-bottom:var(--sp-3)">No shareholders added yet</p>
        <p style="font-size:var(--text-sm)">Add shareholders to track how revenue should be distributed.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = `
    <div class="shareholders-grid">
      ${shareholders.map(sh => {
        const payout  = (revenue * Number(sh.share_pct)) / 100;
        const isPaid  = !!paidPayouts[sh.id];
        const initials = sh.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        return `
          <div class="shareholder-card ${isPaid ? 'paid' : ''}">
            <div class="shareholder-header">
              <div class="shareholder-avatar">${initials}</div>
              <div class="shareholder-info">
                <div class="shareholder-name">${sh.name}</div>
                <div class="shareholder-pct">${sh.share_pct}% equity</div>
              </div>
              <div style="display:flex;gap:var(--sp-2)">
                <button class="table-action-btn edit-sh-btn" data-id="${sh.id}" title="Edit">✎</button>
                <button class="table-action-btn danger remove-sh-btn" data-id="${sh.id}" title="Remove">✕</button>
              </div>
            </div>
            <div class="shareholder-payout">
              <span class="shareholder-payout-label">Payout</span>
              <span class="shareholder-payout-value">₹${payout.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
            </div>
            <button class="btn ${isPaid ? 'btn-secondary' : 'btn-primary'} btn-sm toggle-paid-btn"
              data-id="${sh.id}" style="width:100%;margin-top:var(--sp-3)">
              ${isPaid ? '✅ Marked as Paid' : '💰 Mark as Paid'}
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Event listeners
  list.querySelectorAll('.edit-sh-btn').forEach(btn => {
    btn.addEventListener('click', () => openShModal(btn.dataset.id));
  });
  list.querySelectorAll('.remove-sh-btn').forEach(btn => {
    btn.addEventListener('click', () => removeShareholder(btn.dataset.id));
  });
  list.querySelectorAll('.toggle-paid-btn').forEach(btn => {
    btn.addEventListener('click', () => togglePaid(btn.dataset.id));
  });
}

function togglePaid(id) {
  if (paidPayouts[id]) {
    delete paidPayouts[id];
  } else {
    paidPayouts[id] = true;
  }
  savePaidPayouts();
  renderShareholderPayouts(getFilteredBookings());
}

function removeShareholder(id) {
  if (!confirm('Remove this shareholder?')) return;
  shareholders = shareholders.filter(sh => sh.id !== id);
  delete paidPayouts[id];
  saveShareholders();
  savePaidPayouts();
  renderShareholderPayouts(getFilteredBookings());
}

// ---- Shareholder Modal ----
function setupShareholderModal() {
  document.getElementById('add-shareholder-btn')?.addEventListener('click', () => openShModal(null));

  const modal     = document.getElementById('shareholder-modal');
  const closeBtn  = document.getElementById('shareholder-modal-close');
  const cancelBtn = document.getElementById('sh-cancel-btn');
  const saveBtn   = document.getElementById('sh-save-btn');

  closeBtn?.addEventListener('click', closeShModal);
  cancelBtn?.addEventListener('click', closeShModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeShModal(); });

  saveBtn?.addEventListener('click', () => {
    const name = document.getElementById('sh-name')?.value.trim();
    const pct  = parseFloat(document.getElementById('sh-pct')?.value);

    if (!name) { showToast('Validation', 'Please enter a name.', 'error'); return; }
    if (!pct || pct <= 0 || pct > 100) { showToast('Validation', 'Enter a valid percentage (0.1–100).', 'error'); return; }

    if (editingShId) {
      const sh = shareholders.find(s => s.id === editingShId);
      if (sh) { sh.name = name; sh.share_pct = pct; }
    } else {
      shareholders.push({ id: Date.now().toString(), name, share_pct: pct });
    }

    saveShareholders();
    renderShareholderPayouts(getFilteredBookings());
    closeShModal();
    showToast('Saved', `Shareholder "${name}" has been saved.`);
  });
}

function openShModal(id) {
  editingShId = id;
  const modal = document.getElementById('shareholder-modal');
  document.getElementById('shareholder-modal-title').textContent = id ? 'Edit Shareholder' : 'Add Shareholder';

  if (id) {
    const sh = shareholders.find(s => s.id === id);
    if (sh) {
      document.getElementById('sh-name').value = sh.name;
      document.getElementById('sh-pct').value  = sh.share_pct;
    }
  } else {
    document.getElementById('sh-name').value = '';
    document.getElementById('sh-pct').value  = '';
  }

  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('open'));
}

function closeShModal() {
  const modal = document.getElementById('shareholder-modal');
  modal?.classList.remove('open');
  setTimeout(() => { if (modal) modal.style.display = 'none'; }, 200);
  editingShId = null;
}

function setupPeriodFilter() {
  document.getElementById('filter-period')?.addEventListener('change', renderAll);
}

// ---- LocalStorage ----
function loadShareholders() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveShareholders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shareholders));
}
function loadPaidPayouts() {
  try { return JSON.parse(localStorage.getItem(PAID_STORAGE_KEY) || '{}'); } catch { return {}; }
}
function savePaidPayouts() {
  localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify(paidPayouts));
}

document.addEventListener('DOMContentLoaded', init);
