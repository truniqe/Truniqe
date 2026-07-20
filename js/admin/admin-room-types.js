// ============================================================
// js/admin/admin-room-types.js — Room Types Management
// ============================================================

import { initAuth, onAuthChange, isAdmin, requireAdmin, showToast, formatCurrency } from '../auth.js';
import { fetchAllRoomTypes, deleteRoomType, fetchAllPropertiesAdmin } from '../supabase.js';

let allRoomTypes  = [];
let allProperties = [];
let pendingDeleteId   = null;
let pendingDeleteRoom = null;
let pendingDeleteProp = null;

async function init() {
  await initAuth();
  // if (!isAdmin()) { requireAdmin(); return; }
  onAuthChange(updateAdminNav);
  setupSidebarToggle();
  setupDeleteModal();
  await loadData();
  setupFilters();
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

async function loadData() {
  try {
    [allRoomTypes, allProperties] = await Promise.all([
      fetchAllRoomTypes(),
      fetchAllPropertiesAdmin(),
    ]);
    populatePropertyFilter();
    renderStats();
    renderTable(allRoomTypes);
  } catch (err) {
    console.error(err);
    document.getElementById('rooms-tbody').innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:var(--error)">${err.message}</td></tr>`;
  }
}

function populatePropertyFilter() {
  const sel = document.getElementById('filter-property');
  if (!sel) return;
  allProperties.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
}

function renderStats() {
  const total    = allRoomTypes.length;
  const avgPrice = total
    ? Math.round(allRoomTypes.reduce((s, r) => s + Number(r.base_price), 0) / total)
    : 0;
  const propsWithRooms = new Set(allRoomTypes.map(r => r.property_id)).size;

  document.getElementById('stat-total-rooms').textContent    = total;
  document.getElementById('stat-avg-price').textContent      = formatCurrency(avgPrice);
  document.getElementById('stat-props-with-rooms').textContent = propsWithRooms;
  document.getElementById('rooms-count').textContent         = `${total} total`;
}

function renderTable(rooms) {
  const tbody = document.getElementById('rooms-tbody');
  if (!tbody) return;

  if (!rooms.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px;color:var(--text-muted)">No room types found.</td></tr>`;
    return;
  }

  tbody.innerHTML = rooms.map(r => {
    const prop = allProperties.find(p => p.id === r.property_id);
    return `
      <tr>
        <td>
          <div style="font-weight:600;color:var(--navy)">${r.name}</div>
        </td>
        <td>
          <a href="/dashboard/admin/property-form.html?id=${r.property_id}"
             style="color:var(--gold-dark);font-weight:500;text-decoration:none">
            ${prop?.name || '—'}
          </a>
          <div style="font-size:12px;color:var(--text-muted)">${prop?.location || ''}</div>
        </td>
        <td style="font-weight:600">₹${Number(r.base_price).toLocaleString('en-IN')}<span style="font-weight:400;color:var(--text-muted)">/night</span></td>
        <td style="text-align:center">${r.max_guests} guests</td>
        <td style="max-width:220px">
          <div style="font-size:var(--text-sm);color:var(--text-secondary);
               overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${r.description || '—'}
          </div>
        </td>
        <td>
          <div class="table-actions">
            <a href="/dashboard/admin/property-form.html?id=${r.property_id}"
               class="table-action-btn" title="Edit in property form">✎</a>
            <button class="table-action-btn danger delete-room-btn"
              data-id="${r.id}"
              data-room-name="${r.name}"
              data-prop-name="${prop?.name || '?'}"
              title="Delete room type">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.delete-room-btn').forEach(btn => {
    btn.addEventListener('click', () =>
      openDeleteModal(btn.dataset.id, btn.dataset.roomName, btn.dataset.propName)
    );
  });
}

function setupFilters() {
  document.getElementById('filter-property')?.addEventListener('change', function() {
    const val  = this.value;
    const list = val === 'all' ? allRoomTypes : allRoomTypes.filter(r => r.property_id === val);
    renderTable(list);
  });

  document.getElementById('search-rooms')?.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    const propFilter = document.getElementById('filter-property')?.value || 'all';
    let list = propFilter === 'all' ? allRoomTypes : allRoomTypes.filter(r => r.property_id === propFilter);
    list = list.filter(r => {
      const prop = allProperties.find(p => p.id === r.property_id);
      return r.name.toLowerCase().includes(q) || (prop?.name || '').toLowerCase().includes(q);
    });
    renderTable(list);
  });
}

function setupDeleteModal() {
  const modal      = document.getElementById('delete-modal');
  const cancelBtn  = document.getElementById('delete-cancel-btn');
  const confirmBtn = document.getElementById('delete-confirm-btn');

  cancelBtn?.addEventListener('click', closeDeleteModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeDeleteModal(); });

  confirmBtn?.addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    confirmBtn.textContent = 'Deleting…';
    confirmBtn.disabled = true;
    try {
      await deleteRoomType(pendingDeleteId);
      showToast('Deleted', `"${pendingDeleteRoom}" has been removed.`, 'info');
      closeDeleteModal();
      await loadData();
    } catch (err) {
      showToast('Error', err.message, 'error');
      confirmBtn.textContent = 'Delete Room Type';
      confirmBtn.disabled = false;
    }
  });
}

function openDeleteModal(id, roomName, propName) {
  pendingDeleteId   = id;
  pendingDeleteRoom = roomName;
  pendingDeleteProp = propName;
  document.getElementById('delete-room-name').textContent = roomName;
  document.getElementById('delete-prop-name').textContent = propName;
  const modal = document.getElementById('delete-modal');
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('open'));
  const confirmBtn = document.getElementById('delete-confirm-btn');
  if (confirmBtn) { confirmBtn.textContent = 'Delete Room Type'; confirmBtn.disabled = false; }
}

function closeDeleteModal() {
  const modal = document.getElementById('delete-modal');
  modal?.classList.remove('open');
  setTimeout(() => { if (modal) modal.style.display = 'none'; }, 200);
  pendingDeleteId = null;
}

document.addEventListener('DOMContentLoaded', init);
