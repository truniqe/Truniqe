// ============================================================
// js/admin/admin-properties.js — Admin Properties CRUD
// ============================================================

import { initAuth, updateNav, onAuthChange, isAdmin, requireAdmin, showToast } from '../auth.js';
import { fetchAllProperties, deleteProperty, updateProperty } from '../supabase.js';

async function init() {
  await initAuth();
  if (!isAdmin()) { requireAdmin(); return; }
  onAuthChange(() => {});
  setupSidebarToggle();
  await loadProperties();
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

async function loadProperties() {
  const tbody = document.getElementById('properties-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px"><div class="spinner"></div></td></tr>`;

  try {
    const properties = await fetchAllProperties({ includesDraft: true });

    if (!properties.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px;color:var(--text-muted)">
        No properties yet. <a href="property-form.html" style="color:var(--gold-dark);font-weight:600">Add your first property →</a>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = properties.map(renderPropertyRow).join('');

    // Delete buttons
    tbody.querySelectorAll('.delete-property-btn').forEach(btn => {
      btn.addEventListener('click', () => confirmDelete(btn.dataset.id, btn.dataset.name));
    });

    // Toggle status buttons
    tbody.querySelectorAll('.toggle-status-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleStatus(btn.dataset.id, btn.dataset.status));
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--error)">${err.message}</td></tr>`;
  }
}

function renderPropertyRow(p) {
  const statusBadge = p.status === 'live' ? 'badge-success' : 'badge-warning';
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
          </div>
        </div>
      </td>
      <td style="color:var(--text-muted)">${p.location}</td>
      <td><span class="badge ${statusBadge}">${p.status}</span></td>
      <td style="font-size:12px;color:var(--text-muted)">${new Date(p.created_at).toLocaleDateString('en-IN')}</td>
      <td>
        <div class="table-actions">
          <a href="property-form.html?id=${p.id}" class="table-action-btn" title="Edit">✎</a>
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

async function confirmDelete(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone and will remove all associated room types.`)) return;
  try {
    await deleteProperty(id);
    showToast('Deleted', `"${name}" has been removed.`, 'info');
    await loadProperties();
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', init);
