// ============================================================
// js/home.js — Home Page Logic
// ============================================================

import { initAuth, updateNav, onAuthChange, showToast } from './auth.js';
import { fetchProperties } from './supabase.js';
import { formatCurrency } from './auth.js';

// ---- Init ----
async function init() {
  await initAuth();
  onAuthChange(updateNav);
  setupNav();
  setupSearch();
  setupAngleFilters();
  await loadFeaturedProperties();
  setupScrollBehavior();
  setupCollectionsSlider();
}

// ---- Navigation ----
function setupNav() {
  const nav = document.getElementById('main-nav');
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('nav-mobile');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      nav.classList.remove('nav-transparent');
      nav.classList.add('nav-solid');
    } else {
      nav.classList.remove('nav-solid');
      nav.classList.add('nav-transparent');
    }
  });

  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
  });

  // User dropdown
  const userMenuBtn = document.getElementById('nav-user-menu');
  const userDropdown = document.getElementById('nav-user-dropdown');
  userMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown?.classList.toggle('open');
  });
  document.addEventListener('click', () => userDropdown?.classList.remove('open'));
}

// ---- Scroll behavior ----
function setupScrollBehavior() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in-up');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.observe-scroll').forEach(el => observer.observe(el));
}

// ---- Search ----
function setupSearch() {
  const form = document.getElementById('search-form');
  const destInput = document.getElementById('search-destination');
  const checkinInput = document.getElementById('search-checkin');
  const checkoutInput = document.getElementById('search-checkout');
  const guestsInput = document.getElementById('search-guests');

  // Set min dates
  const today = new Date().toISOString().split('T')[0];
  if (checkinInput) checkinInput.min = today;
  if (checkoutInput) checkoutInput.min = today;

  checkinInput?.addEventListener('change', () => {
    if (checkoutInput) {
      const nextDay = new Date(checkinInput.value);
      nextDay.setDate(nextDay.getDate() + 1);
      checkoutInput.min = nextDay.toISOString().split('T')[0];
      if (checkoutInput.value && checkoutInput.value <= checkinInput.value) {
        checkoutInput.value = nextDay.toISOString().split('T')[0];
      }
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destInput?.value)    params.set('destination', destInput.value);
    if (checkinInput?.value) params.set('checkin', checkinInput.value);
    if (checkoutInput?.value) params.set('checkout', checkoutInput.value);
    if (guestsInput?.value)  params.set('guests', guestsInput.value);
    window.location.href = `/properties.html?${params}`;
  });
}

// ---- Angle filter strip ----
let activeTag = null;

function setupAngleFilters() {
  const chips = document.querySelectorAll('.angle-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.tag;

      if (activeTag === tag) {
        activeTag = null;
        chips.forEach(c => c.classList.remove('active'));
      } else {
        activeTag = tag;
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      }

      loadFeaturedProperties(activeTag);
    });
  });
}

// ---- Featured Properties ----
async function loadFeaturedProperties(tag = null) {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;

  // Show skeletons
  grid.innerHTML = Array(5).fill(0).map(() => `
    <div class="property-card">
      <div class="property-card-image skeleton" style="aspect-ratio:4/3"></div>
      <div class="property-card-body">
        <div class="skeleton" style="height:16px;width:60%;margin-bottom:8px;border-radius:4px"></div>
        <div class="skeleton" style="height:28px;width:80%;margin-bottom:8px;border-radius:4px"></div>
        <div class="skeleton" style="height:14px;width:100%;border-radius:4px"></div>
      </div>
    </div>
  `).join('');

  try {
    const properties = await fetchProperties({
      tags: tag ? [tag] : [],
      limit: 5,
    });

    if (!properties.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">🏡</div>
          <div class="empty-state-title">No stays found</div>
          <div class="empty-state-sub">Try a different filter or explore all properties.</div>
          <a href="/properties.html" class="btn btn-primary mt-6">Browse all stays</a>
        </div>
      `;
      return;
    }

    grid.innerHTML = properties.map(renderPropertyCard).join('');

    // Add click handlers
    grid.querySelectorAll('.property-card').forEach(card => {
      card.addEventListener('click', () => {
        window.location.href = `/property.html?id=${card.dataset.id}`;
      });
    });

  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">Could not load properties</div>
      <div class="empty-state-sub">Please check your Supabase connection.</div>
    </div>`;
  }
}

// ---- Render helpers ----
function tagHtml(tag) {
  const map = {
    'Design & Heritage': { cls: 'tag-heritage', icon: '🏛' },
    'Offbeat Location':  { cls: 'tag-offbeat',  icon: '🏔' },
    'Experience-Driven': { cls: 'tag-experience', icon: '✨' },
  };
  const t = map[tag] || { cls: '', icon: '' };
  return `<span class="tag ${t.cls}">${t.icon} ${tag}</span>`;
}

export function renderPropertyCard(p) {
  const price = p.min_price ? formatCurrency(p.min_price) : '—';
  const tags = (p.angle_tags || []).map(tagHtml).join('');
  const img = p.cover_image_url
    ? `<img src="${p.cover_image_url}&w=600&q=80" alt="${p.name}" loading="lazy">`
    : `<div style="width:100%;height:100%;background:var(--surface-dark);display:flex;align-items:center;justify-content:center;font-size:40px">🏨</div>`;

  return `
    <article class="property-card" data-id="${p.id}" role="button" tabindex="0"
      aria-label="View ${p.name}">
      <div class="property-card-image">
        ${img}
        <div class="tags">${tags}</div>
      </div>
      <div class="property-card-body">
        <div class="property-card-location">
          <span>📍</span> ${p.location}
        </div>
        <h3 class="property-card-name">${p.name}</h3>
        ${p.tagline ? `<p class="property-card-story">${p.tagline}</p>` : ''}
        <div class="property-card-footer">
          <div class="property-card-price">
            <span class="from">From</span>
            <span class="amount">${price}</span>
            <span class="per-night">/ night</span>
          </div>
          <span class="property-card-cta">View stay →</span>
        </div>
      </div>
    </article>
  `;
}

// ---- Keyboard nav for cards ----
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.classList.contains('property-card')) {
    window.location.href = `/property.html?id=${e.target.dataset.id}`;
  }
});

// ---- Collections Horizontal Slider Arrows ----
function setupCollectionsSlider() {
  const wrapper = document.querySelector('.collections-slider-wrapper');
  if (!wrapper) return;

  const grid = wrapper.querySelector('.collections-grid');
  const leftArrow = wrapper.querySelector('.slider-arrow-left');
  const rightArrow = wrapper.querySelector('.slider-arrow-right');
  if (!grid || !leftArrow || !rightArrow) return;

  const updateArrows = () => {
    const scrollLeft = grid.scrollLeft;
    const maxScrollLeft = grid.scrollWidth - grid.clientWidth;

    // Show/hide arrows depending on scroll position
    if (scrollLeft <= 2) {
      leftArrow.style.opacity = '0';
      leftArrow.style.pointerEvents = 'none';
    } else {
      leftArrow.style.opacity = '1';
      leftArrow.style.pointerEvents = 'auto';
    }

    if (scrollLeft >= maxScrollLeft - 2) {
      rightArrow.style.opacity = '0';
      rightArrow.style.pointerEvents = 'none';
    } else {
      rightArrow.style.opacity = '1';
      rightArrow.style.pointerEvents = 'auto';
    }
  };

  const scrollAmount = () => {
    const card = grid.querySelector('.collection-card');
    return card ? card.clientWidth + 20 : 300; // card width + gap (20px)
  };

  leftArrow.addEventListener('click', () => {
    grid.scrollBy({
      left: -scrollAmount(),
      behavior: 'smooth'
    });
  });

  rightArrow.addEventListener('click', () => {
    grid.scrollBy({
      left: scrollAmount(),
      behavior: 'smooth'
    });
  });

  grid.addEventListener('scroll', updateArrows);
  window.addEventListener('resize', updateArrows);

  // Initial check
  setTimeout(updateArrows, 100);
}

// ---- Boot ----
document.addEventListener('DOMContentLoaded', init);
