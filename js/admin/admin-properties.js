// ============================================================
// js/admin/admin-properties.js — Admin Properties CRUD
// ============================================================

import { initAuth, onAuthChange, isAdmin, requireAdmin, showToast, formatCurrency } from '../auth.js';
import { fetchAllPropertiesAdmin, deleteProperty, updateProperty } from '../supabase.js';

let allProperties = [];
let pendingDeleteId   = null;
let pendingDeleteName = null;

async function init() {
  await initAuth();
  if (!isAdmin()) { requireAdmin(); return; }
  onAuthChange(updateAdminNav);
  setupSidebarToggle();
  setupDeleteModal();
  await loadProperties();
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

async function loadProperties() {
  const tbody = document.getElementById('properties-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:64px"><div class="spinner"></div></td></tr>`;

  try {
    allProperties = await fetchAllPropertiesAdmin();
    renderStats();
    renderTable(allProperties);
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--error)">${err.message}</td></tr>`;
  }
}

function renderStats() {
  const live  = allProperties.filter(p => p.status === 'live').length;
  const draft = allProperties.filter(p => p.status === 'draft').length;
  document.getElementById('stat-total').textContent = allProperties.length;
  document.getElementById('stat-live').textContent  = live;
  document.getElementById('stat-draft').textContent = draft;
  document.getElementById('properties-count').textContent = `${allProperties.length} total`;
}

function renderTable(properties) {
  const tbody = document.getElementById('properties-tbody');
  if (!tbody) return;

  if (!properties.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px;color:var(--text-muted)">
      No properties found. <a href="/dashboard/admin/property-form.html" style="color:var(--gold-dark);font-weight:600">Add your first property →</a>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = properties.map(renderPropertyRow).join('');

  // Delete buttons
  tbody.querySelectorAll('.delete-property-btn').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.id, btn.dataset.name));
  });

  // Toggle status buttons
  tbody.querySelectorAll('.toggle-status-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleStatus(btn.dataset.id, btn.dataset.status));
  });
}

function renderPropertyRow(p) {
  const statusBadge = p.status === 'live' ? 'badge-success' : 'badge-warning';
  const roomCount   = p.room_types_count ?? '—';
  return `
    <tr>
      <td>
        <div class="property-cell">
          ${p.cover_image_url
            ? `<img class="property-thumb" src="${p.cover_image_url}&w=96&q=70" alt="${p.name}">`
            : `<div class="property-thumb-placeholder"></div>`
          }
          <div>
            <div style="font-weight:600;color:var(--navy)">${p.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${(p.angle_tags || []).join(', ') || '—'}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--text-muted)">${p.location}, ${p.state || ''}</td>
      <td style="color:var(--text-secondary)">${p.owner_name || '—'}</td>
      <td>
        ${p.owner_phone
          ? `<a href="https://wa.me/91${p.owner_phone.replace(/\D/g,'')}" target="_blank"
               style="color:var(--success);font-weight:500;text-decoration:none;font-size:var(--text-sm)"
               title="Open WhatsApp">💬 ${p.owner_phone}</a>`
          : `<span style="color:var(--text-muted);font-size:var(--text-sm)">Not set</span>`
        }
      </td>
      <td style="text-align:center;font-weight:600">${roomCount}</td>
      <td><span class="badge ${statusBadge}">${p.status}</span></td>
      <td style="font-size:12px;color:var(--text-muted)">${new Date(p.created_at).toLocaleDateString('en-IN')}</td>
      <td>
        <div class="table-actions">
          <a href="/dashboard/admin/property-form.html?id=${p.id}" class="table-action-btn" title="Edit">✎</a>
          <a href="/property.html?id=${p.id}" target="_blank" class="table-action-btn" title="Preview">↗</a>
          <button class="table-action-btn toggle-status-btn"
            data-id="${p.id}" data-status="${p.status}"
            title="${p.status === 'live' ? 'Unpublish' : 'Publish'}">
            ${p.status === 'live' ? '⊘' : '◉'}
          </button>
          <button class="table-action-btn danger delete-property-btn"
            data-id="${p.id}" data-name="${p.name}" title="Delete">🗑</button>
        </div>
      </td>
    </tr>
  `;
}

async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === 'live' ? 'draft' : 'live';
  try {
    await updateProperty(id, { status: newStatus });
    showToast('Updated', `Property set to ${newStatus}.`);
    await loadProperties();
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

function setupDeleteModal() {
  const modal     = document.getElementById('delete-modal');
  const cancelBtn = document.getElementById('delete-cancel-btn');
  const confirmBtn = document.getElementById('delete-confirm-btn');

  cancelBtn?.addEventListener('click', closeDeleteModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeDeleteModal(); });

  confirmBtn?.addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    confirmBtn.textContent = 'Deleting…';
    confirmBtn.disabled = true;
    try {
      await deleteProperty(pendingDeleteId);
      showToast('Deleted', `"${pendingDeleteName}" has been removed.`, 'info');
      closeDeleteModal();
      await loadProperties();
    } catch (err) {
      showToast('Error', err.message, 'error');
      confirmBtn.textContent = 'Delete Property';
      confirmBtn.disabled = false;
    }
  });
}

function openDeleteModal(id, name) {
  pendingDeleteId   = id;
  pendingDeleteName = name;
  document.getElementById('delete-name').textContent = name;
  const modal = document.getElementById('delete-modal');
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('open'));
  const confirmBtn = document.getElementById('delete-confirm-btn');
  if (confirmBtn) { confirmBtn.textContent = 'Delete Property'; confirmBtn.disabled = false; }
}

function closeDeleteModal() {
  const modal = document.getElementById('delete-modal');
  modal?.classList.remove('open');
  setTimeout(() => { if (modal) modal.style.display = 'none'; }, 200);
  pendingDeleteId   = null;
  pendingDeleteName = null;
}

function setupFilters() {
  document.getElementById('filter-status')?.addEventListener('change', function() {
    const val  = this.value;
    const list = val === 'all' ? allProperties : allProperties.filter(p => p.status === val);
    renderTable(list);
  });

  document.getElementById('search-properties')?.addEventListener('input', function() {
    const q    = this.value.toLowerCase();
    const list = allProperties.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      (p.state || '').toLowerCase().includes(q) ||
      (p.owner_name || '').toLowerCase().includes(q)
    );
    renderTable(list);
  });
}

document.addEventListener('DOMContentLoaded', init);
