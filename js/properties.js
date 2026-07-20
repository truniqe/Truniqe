// ============================================================
// js/properties.js — Property Listing Page
// ============================================================

import { initAuth, updateNav, onAuthChange, formatCurrency } from './auth.js';
import { fetchProperties } from './supabase.js';
import { renderPropertyCard } from './home.js';

const TAGS = ['Design & Heritage', 'Offbeat Location', 'Experience-Driven'];
const STATES = ['Rajasthan','Himachal Pradesh','Karnataka','Puducherry','Kerala','Goa','Uttarakhand','Jammu & Kashmir','Madhya Pradesh','Maharashtra'];

let filters = {
  destination: '',
  checkin: '',
  checkout: '',
  guests: 1,
  tags: [],
  sortBy: 'newest',
};

let offset = 0;
const LIMIT = 9;
let isLoading = false;
let hasMore = true;

async function init() {
  await initAuth();
  onAuthChange(updateNav);
  setupNav();
  parseURLParams();
  setupFilters();
  setupSidebar();
  await loadProperties(true);
  setupInfiniteScroll();
}

function setupNav() {
  const nav = document.getElementById('main-nav');
  nav?.classList.add('nav-solid');
  nav?.classList.remove('nav-transparent');

  document.getElementById('nav-hamburger')?.addEventListener('click', function() {
    this.classList.toggle('open');
    document.getElementById('nav-mobile')?.classList.toggle('open');
  });
}

// ---- Parse URL params from homepage search ----
function parseURLParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('destination')) {
    filters.destination = params.get('destination');
    const el = document.getElementById('filter-destination');
    if (el) el.value = filters.destination;
  }
  if (params.get('checkin')) {
    filters.checkin = params.get('checkin');
    const el = document.getElementById('filter-checkin');
    if (el) el.value = filters.checkin;
  }
  if (params.get('checkout')) {
    filters.checkout = params.get('checkout');
    const el = document.getElementById('filter-checkout');
    if (el) el.value = filters.checkout;
  }
  if (params.get('guests')) {
    filters.guests = parseInt(params.get('guests'), 10);
    const el = document.getElementById('filter-guests');
    if (el) el.value = filters.guests;
  }
  if (params.get('tag')) {
    filters.tags = [params.get('tag')];
    document.querySelectorAll(`input[name="tag"][value="${params.get('tag')}"]`)
      .forEach(el => (el.checked = true));
  }
}

// ---- Filters ----
function setupFilters() {
  const dest = document.getElementById('filter-destination');
  const checkin = document.getElementById('filter-checkin');
  const checkout = document.getElementById('filter-checkout');
  const guests = document.getElementById('filter-guests');
  const sort = document.getElementById('filter-sort');
  const resetBtn = document.getElementById('reset-filters');
  const today = new Date().toISOString().split('T')[0];

  if (checkin) checkin.min = today;
  if (checkout) checkout.min = today;

  // Debounced search
  let debounceTimer;
  const debouncedLoad = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadProperties(true), 400);
  };

  dest?.addEventListener('input', () => { filters.destination = dest.value; debouncedLoad(); });
  checkin?.addEventListener('change', () => { filters.checkin = checkin.value; debouncedLoad(); });
  checkout?.addEventListener('change', () => { filters.checkout = checkout.value; debouncedLoad(); });
  guests?.addEventListener('change', () => { filters.guests = parseInt(guests.value, 10); debouncedLoad(); });
  sort?.addEventListener('change', () => { filters.sortBy = sort.value; loadProperties(true); });

  // Tag checkboxes
  document.querySelectorAll('input[name="tag"]').forEach(cb => {
    cb.addEventListener('change', () => {
      filters.tags = Array.from(document.querySelectorAll('input[name="tag"]:checked'))
        .map(el => el.value);
      loadProperties(true);
    });
  });

  // State checkboxes
  document.querySelectorAll('input[name="state"]').forEach(cb => {
    cb.addEventListener('change', debouncedLoad);
  });

  resetBtn?.addEventListener('click', resetFilters);
}

function resetFilters() {
  filters = { destination: '', checkin: '', checkout: '', guests: 1, tags: [], sortBy: 'newest' };
  document.getElementById('filter-destination').value = '';
  document.getElementById('filter-checkin').value = '';
  document.getElementById('filter-checkout').value = '';
  document.getElementById('filter-guests').value = '1';
  document.getElementById('filter-sort').value = 'newest';
  document.querySelectorAll('input[name="tag"]').forEach(cb => (cb.checked = false));
  document.querySelectorAll('input[name="state"]').forEach(cb => (cb.checked = false));
  loadProperties(true);
}

// ---- Sidebar toggle (mobile) ----
function setupSidebar() {
  const toggle = document.getElementById('mobile-filter-btn');
  const sidebar = document.getElementById('filter-sidebar');
  const closeBtn = document.getElementById('sidebar-close');

  toggle?.addEventListener('click', () => sidebar?.classList.toggle('mobile-open'));
  closeBtn?.addEventListener('click', () => sidebar?.classList.remove('mobile-open'));
}

// ---- Load Properties ----
async function loadProperties(reset = false) {
  if (isLoading) return;
  isLoading = true;

  if (reset) {
    offset = 0;
    hasMore = true;
  }

  const grid = document.getElementById('properties-grid');
  const countEl = document.getElementById('result-count');
  const loadMoreBtn = document.getElementById('load-more');

  if (reset) {
    grid.innerHTML = Array(6).fill(0).map(() => `
      <div class="property-card">
        <div class="property-card-image skeleton" style="aspect-ratio:4/3"></div>
        <div class="property-card-body" style="gap:8px">
          <div class="skeleton" style="height:14px;width:50%;border-radius:4px"></div>
          <div class="skeleton" style="height:26px;width:80%;border-radius:4px"></div>
          <div class="skeleton" style="height:13px;width:100%;border-radius:4px"></div>
          <div class="skeleton" style="height:13px;width:70%;border-radius:4px;margin-top:16px"></div>
        </div>
      </div>
    `).join('');
  }

  try {
    const data = await fetchProperties({
      tags: filters.tags,
      destination: filters.destination,
      sortBy: filters.sortBy,
      limit: LIMIT,
      offset,
    });

    if (reset) grid.innerHTML = '';

    if (!data.length && reset) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">🗺️</div>
          <div class="empty-state-title">No stays found</div>
          <div class="empty-state-sub">Try adjusting your filters or clearing your search.</div>
          <button onclick="document.getElementById('reset-filters').click()" class="btn btn-outline mt-6">Clear filters</button>
        </div>
      `;
      if (countEl) countEl.innerHTML = '0 stays found';
      isLoading = false;
      return;
    }

    data.forEach(p => {
      const el = document.createElement('article');
      el.innerHTML = renderPropertyCard(p);
      const card = el.firstElementChild;
      grid.appendChild(card);
      card.addEventListener('click', () => window.location.href = `/property.html?id=${p.id}`);
    });

    offset += data.length;
    hasMore = data.length === LIMIT;

    if (countEl && reset) countEl.innerHTML = `<strong>${data.length < LIMIT ? data.length : ''+offset}+</strong> curated stays`;
    if (loadMoreBtn) loadMoreBtn.style.display = hasMore ? 'flex' : 'none';

  } catch (err) {
    console.error('Error loading properties:', err);
    if (reset) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">Could not load properties</div>
      <div class="empty-state-sub">${err.message}</div>
    </div>`;
  }

  isLoading = false;
}

// ---- Infinite scroll (or load more button) ----
function setupInfiniteScroll() {
  const loadMoreBtn = document.getElementById('load-more');
  loadMoreBtn?.addEventListener('click', () => loadProperties(false));
}

document.addEventListener('DOMContentLoaded', init);
