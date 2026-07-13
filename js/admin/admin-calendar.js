// ============================================================
// js/admin/admin-calendar.js — Availability Calendar Manager
// ============================================================

import { initAuth, isAdmin, requireAdmin, showToast, formatCurrency } from '../auth.js';
import { fetchAllProperties, fetchRoomTypes,
         fetchAllAvailability, upsertAvailability } from '../supabase.js';

let properties     = [];
let selectedProperty = null;
let selectedRoom   = null;
let roomTypes      = [];
let availabilityMap = new Map();
let calDate        = new Date();
let selectedDates  = new Set();
let mode           = 'block'; // 'block' | 'unblock'

async function init() {
  await initAuth();
  if (!isAdmin()) { requireAdmin(); return; }
  setupSidebarToggle();
  await loadProperties();
  setupControls();
}

function setupSidebarToggle() {
  const toggle  = document.getElementById('admin-menu-toggle');
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('admin-overlay');
  toggle?.addEventListener('click', () => { sidebar?.classList.toggle('open'); overlay?.classList.toggle('open'); });
  overlay?.addEventListener('click', () => { sidebar?.classList.remove('open'); overlay?.classList.remove('open'); });
}

async function loadProperties() {
  try {
    properties = await fetchAllProperties({ includesDraft: true });
    renderPropertyList();
    if (properties.length) selectProperty(properties[0]);
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

function renderPropertyList() {
  const list = document.getElementById('cal-property-list');
  if (!list) return;

  list.innerHTML = properties.map(p => `
    <div class="calendar-property-item" data-id="${p.id}">
      <div class="calendar-property-name">${p.name}</div>
      <div class="calendar-property-loc">${p.location}</div>
    </div>
  `).join('');

  list.querySelectorAll('.calendar-property-item').forEach(item => {
    item.addEventListener('click', () => {
      const prop = properties.find(p => p.id === item.dataset.id);
      if (prop) selectProperty(prop);
    });
  });
}

async function selectProperty(prop) {
  selectedProperty = prop;
  selectedDates.clear();

  // Update active state
  document.querySelectorAll('.calendar-property-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === prop.id);
  });

  try {
    roomTypes = await fetchRoomTypes(prop.id);
    renderRoomTabs();
    if (roomTypes.length) await selectRoom(roomTypes[0]);
  } catch (err) {
    showToast('Error loading rooms', err.message, 'error');
  }
}

function renderRoomTabs() {
  const tabs = document.getElementById('room-tabs');
  if (!tabs) return;

  tabs.innerHTML = roomTypes.map((r, i) => `
    <button class="room-tab ${i === 0 ? 'active' : ''}" data-id="${r.id}">${r.name}</button>
  `).join('');

  tabs.querySelectorAll('.room-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      tabs.querySelectorAll('.room-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const room = roomTypes.find(r => r.id === tab.dataset.id);
      if (room) await selectRoom(room);
    });
  });
}

async function selectRoom(room) {
  selectedRoom = room;
  selectedDates.clear();
  updateSelectedCountDisplay();

  try {
    availabilityMap = await fetchAllAvailability(room.id);
    renderCalendarGrid();
  } catch (err) {
    showToast('Error loading availability', err.message, 'error');
  }
}

function setupControls() {
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    calDate.setMonth(calDate.getMonth() - 1);
    renderCalendarGrid();
  });
  document.getElementById('cal-next')?.addEventListener('click', () => {
    calDate.setMonth(calDate.getMonth() + 1);
    renderCalendarGrid();
  });

  document.getElementById('mode-block')?.addEventListener('click', () => setMode('block'));
  document.getElementById('mode-unblock')?.addEventListener('click', () => setMode('unblock'));

  document.getElementById('apply-btn')?.addEventListener('click', applyChanges);
  document.getElementById('clear-selection-btn')?.addEventListener('click', () => {
    selectedDates.clear();
    updateSelectedCountDisplay();
    renderCalendarGrid();
  });

  document.getElementById('select-month-btn')?.addEventListener('click', selectWholeMonth);
}

function setMode(m) {
  mode = m;
  document.getElementById('mode-block')?.classList.toggle('active', m === 'block');
  document.getElementById('mode-unblock')?.classList.toggle('active', m === 'unblock');
}

function selectWholeMonth() {
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const today = new Date();
  today.setHours(0,0,0,0);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    if (dt >= today) {
      const str = toISODate(dt);
      selectedDates.add(str);
    }
  }
  updateSelectedCountDisplay();
  renderCalendarGrid();
}

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function renderCalendarGrid() {
  const year  = calDate.getFullYear();
  const month = calDate.getMonth();

  const titleEl = document.getElementById('cal-month-title');
  if (titleEl) titleEl.textContent = calDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const today     = new Date();
  today.setHours(0,0,0,0);
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const grid = document.getElementById('cal-grid');
  if (!grid) return;

  let html = '';

  for (let i = 0; i < firstDay; i++) html += `<div class="calendar-day empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const thisDate = new Date(year, month, d);
    thisDate.setHours(0,0,0,0);
    const isPast    = thisDate < today;
    const avail     = availabilityMap.get(dateStr);
    const isBlocked = avail?.is_blocked;
    const isSelected = selectedDates.has(dateStr);
    const isToday   = thisDate.getTime() === today.getTime();

    let cls = 'calendar-day';
    if (isPast) cls += ' past';
    else if (isSelected) {
      cls += mode === 'block' ? ' admin-blocked' : ' selected-start';
    } else if (isBlocked) cls += ' admin-blocked';
    else cls += ' available';
    if (isToday) cls += ' today';

    const price = avail?.price_override ? formatCurrency(avail.price_override) : '';
    html += `
      <div class="${cls}" data-date="${dateStr}" title="${dateStr}">
        ${d}
        ${price ? `<small style="font-size:9px;display:block;color:inherit;opacity:0.7">${price}</small>` : ''}
      </div>
    `;
  }

  grid.innerHTML = html;

  // Click handlers
  grid.querySelectorAll('.calendar-day:not(.past):not(.empty)').forEach(el => {
    el.addEventListener('click', () => {
      const date = el.dataset.date;
      if (selectedDates.has(date)) {
        selectedDates.delete(date);
      } else {
        selectedDates.add(date);
      }
      updateSelectedCountDisplay();
      renderCalendarGrid();
    });
  });
}

function updateSelectedCountDisplay() {
  const el = document.getElementById('selected-count');
  if (el) el.textContent = `${selectedDates.size} date${selectedDates.size !== 1 ? 's' : ''} selected`;
}

async function applyChanges() {
  if (!selectedRoom || !selectedDates.size) {
    showToast('No dates selected', 'Click on dates to select them first.', 'warning');
    return;
  }

  const isBlocking = mode === 'block';
  const priceInput = document.getElementById('price-override');
  const priceOverride = priceInput?.value ? parseFloat(priceInput.value) : null;

  const btn = document.getElementById('apply-btn');
  btn.classList.add('btn-loading');
  btn.disabled = true;

  try {
    await upsertAvailability(
      selectedRoom.id,
      Array.from(selectedDates),
      isBlocking,
      priceOverride,
    );

    showToast('Saved',
      `${selectedDates.size} date${selectedDates.size > 1 ? 's' : ''} ${isBlocking ? 'blocked' : 'unblocked'} successfully.`);

    // Refresh
    availabilityMap = await fetchAllAvailability(selectedRoom.id);
    selectedDates.clear();
    updateSelectedCountDisplay();
    renderCalendarGrid();

  } catch (err) {
    showToast('Error', err.message, 'error');
  } finally {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', init);
