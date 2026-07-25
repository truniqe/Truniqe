// ============================================================
// js/home.js — Home Page Logic
// ============================================================

import { initAuth, updateNav, onAuthChange, showToast } from './auth.js';
import { fetchProperties, fetchCollectionRoomTypes } from './supabase.js';
import { formatCurrency } from './auth.js';

// ---- Init ----
async function init() {
  await initAuth();
  onAuthChange(updateNav);
  setupNav();
  setupSearch();
  setupAngleFilters();
  await loadFeaturedProperties();
  await loadCollections();
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
const HOLIDAYS_2026 = {
  '2026-07-16': 'Rath...',
  '2026-07-26': 'Milad...',
  '2026-07-28': 'Raks...',
  '2026-08-15': 'Indep...',
  '2026-08-26': 'Milad...',
  '2026-08-27': 'Raks...',
  '2026-08-28': 'Raks...',
  '2026-08-29': 'Raks...',
  '2026-08-30': 'Milad...'
};

function formatDisplayDate(dateStr) {
  if (!dateStr) return 'Select Date';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function setupSearch() {
  const form = document.getElementById('search-form');
  const destInput = document.getElementById('search-destination');
  
  // Hidden inputs & Display elements
  const checkinInput = document.getElementById('search-checkin');
  const checkoutInput = document.getElementById('search-checkout');
  const displayCheckin = document.getElementById('display-checkin');
  const displayCheckout = document.getElementById('display-checkout');

  const displayGuests = document.getElementById('display-guests');
  const roomsInput = document.getElementById('search-rooms');
  const adultsInput = document.getElementById('search-adults');
  const childrenInput = document.getElementById('search-children');
  const petsInput = document.getElementById('search-pets');

  // Trigger Fields
  const fieldCheckin = document.getElementById('field-checkin');
  const fieldCheckout = document.getElementById('field-checkout');
  const fieldGuests = document.getElementById('field-guests');

  // Popups
  const calendarPopup = document.getElementById('calendar-popup');
  const guestsPopup = document.getElementById('guests-popup');

  // Calendar State
  let calendarBaseDate = new Date(2026, 6, 1); // Start in July 2026 as in mockup
  let selectedCheckIn = checkinInput?.value || '2026-07-26';
  let selectedCheckOut = checkoutInput?.value || '2026-07-27';
  let isSelectingStart = true;

  // Guest State
  let rooms = parseInt(roomsInput?.value || '1', 10);
  let adults = parseInt(adultsInput?.value || '2', 10);
  let children = parseInt(childrenInput?.value || '0', 10);
  let pets = petsInput?.value === 'true';

  // Set initial display
  if (displayCheckin && selectedCheckIn) displayCheckin.textContent = formatDisplayDate(selectedCheckIn);
  if (displayCheckout && selectedCheckOut) displayCheckout.textContent = formatDisplayDate(selectedCheckOut);
  updateGuestsDisplay();

  // ---- Popup Toggles ----
  fieldCheckin?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCalendar(true);
    toggleGuests(false);
  });

  fieldCheckout?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCalendar(true);
    toggleGuests(false);
  });

  fieldGuests?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleGuests(true);
    toggleCalendar(false);
  });

  // Close popups on click outside
  document.addEventListener('click', (e) => {
    if (!calendarPopup?.contains(e.target) && !fieldCheckin?.contains(e.target) && !fieldCheckout?.contains(e.target)) {
      toggleCalendar(false);
    }
    if (!guestsPopup?.contains(e.target) && !fieldGuests?.contains(e.target)) {
      toggleGuests(false);
    }
  });

  function toggleCalendar(show) {
    if (!calendarPopup) return;
    if (show) {
      calendarPopup.style.display = 'block';
      fieldCheckin?.classList.add('active');
      fieldCheckout?.classList.add('active');
      renderDoubleCalendar();
    } else {
      calendarPopup.style.display = 'none';
      fieldCheckin?.classList.remove('active');
      fieldCheckout?.classList.remove('active');
    }
  }

  function toggleGuests(show) {
    if (!guestsPopup) return;
    if (show) {
      guestsPopup.style.display = 'block';
      fieldGuests?.classList.add('active');
      syncGuestsUI();
    } else {
      guestsPopup.style.display = 'none';
      fieldGuests?.classList.remove('active');
    }
  }

  // ---- Double Calendar Render & Click Handlers ----
  const btnPrevMonth = document.getElementById('btn-prev-month');
  const btnNextMonth = document.getElementById('btn-next-month');

  btnPrevMonth?.addEventListener('click', (e) => {
    e.stopPropagation();
    calendarBaseDate.setMonth(calendarBaseDate.getMonth() - 1);
    renderDoubleCalendar();
  });

  btnNextMonth?.addEventListener('click', (e) => {
    e.stopPropagation();
    calendarBaseDate.setMonth(calendarBaseDate.getMonth() + 1);
    renderDoubleCalendar();
  });

  function renderDoubleCalendar() {
    const leftMonthTitle = document.getElementById('title-left-month');
    const rightMonthTitle = document.getElementById('title-right-month');
    const leftGrid = document.getElementById('days-left-month');
    const rightGrid = document.getElementById('days-right-month');

    if (!leftGrid || !rightGrid) return;

    // Calculate months
    const leftMonthDate = new Date(calendarBaseDate.getFullYear(), calendarBaseDate.getMonth(), 1);
    const rightMonthDate = new Date(calendarBaseDate.getFullYear(), calendarBaseDate.getMonth() + 1, 1);

    if (leftMonthTitle) leftMonthTitle.textContent = leftMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (rightMonthTitle) rightMonthTitle.textContent = rightMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    renderMonthGrid(leftMonthDate, leftGrid);
    renderMonthGrid(rightMonthDate, rightGrid);
  }

  function renderMonthGrid(monthDate, gridElement) {
    gridElement.innerHTML = '';
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Empty cells before the 1st
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'day-cell muted';
      gridElement.appendChild(emptyCell);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Day cells
    for (let day = 1; day <= totalDays; day++) {
      const cell = document.createElement('div');
      cell.className = 'day-cell';
      
      const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      cell.innerHTML = `<span class="day-number">${day}</span>`;
      
      // Holiday label
      if (HOLIDAYS_2026[dayDateStr]) {
        const holLabel = document.createElement('span');
        holLabel.className = 'day-holiday-label';
        holLabel.textContent = HOLIDAYS_2026[dayDateStr];
        cell.appendChild(holLabel);
      }

      // Range Highlight & Selection States
      if (dayDateStr === selectedCheckIn) {
        cell.classList.add('selected-start');
      } else if (dayDateStr === selectedCheckOut) {
        cell.classList.add('selected-end');
      } else if (selectedCheckIn && selectedCheckOut && dayDateStr > selectedCheckIn && dayDateStr < selectedCheckOut) {
        cell.classList.add('in-range');
      }

      // Disable past dates
      if (dayDateStr < todayStr) {
        cell.classList.add('disabled');
      } else {
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          handleDateSelection(dayDateStr);
        });
      }

      gridElement.appendChild(cell);
    }
  }

  function handleDateSelection(dateStr) {
    if (isSelectingStart) {
      selectedCheckIn = dateStr;
      selectedCheckOut = '';
      isSelectingStart = false;
      renderDoubleCalendar();
    } else {
      if (dateStr <= selectedCheckIn) {
        selectedCheckIn = dateStr;
        selectedCheckOut = '';
        isSelectingStart = false;
      } else {
        selectedCheckOut = dateStr;
        isSelectingStart = true;
        
        // Save values
        if (checkinInput) checkinInput.value = selectedCheckIn;
        if (checkoutInput) checkoutInput.value = selectedCheckOut;
        
        // Update display text
        if (displayCheckin) displayCheckin.textContent = formatDisplayDate(selectedCheckIn);
        if (displayCheckout) displayCheckout.textContent = formatDisplayDate(selectedCheckOut);
        
        toggleCalendar(false);
      }
      renderDoubleCalendar();
    }
  }

  // ---- Guests Counter Increments / Decrements ----
  const btnRoomsDec = document.getElementById('btn-rooms-dec');
  const btnRoomsInc = document.getElementById('btn-rooms-inc');
  const valRooms = document.getElementById('val-rooms');

  const btnAdultsDec = document.getElementById('btn-adults-dec');
  const btnAdultsInc = document.getElementById('btn-adults-inc');
  const valAdults = document.getElementById('val-adults');

  const btnChildrenDec = document.getElementById('btn-children-dec');
  const btnChildrenInc = document.getElementById('btn-children-inc');
  const valChildren = document.getElementById('val-children');

  const chkPets = document.getElementById('chk-pets');
  const btnGuestsApply = document.getElementById('btn-guests-apply');

  btnRoomsDec?.addEventListener('click', (e) => { e.stopPropagation(); if (rooms > 1) { rooms--; syncGuestsUI(); } });
  btnRoomsInc?.addEventListener('click', (e) => { e.stopPropagation(); if (rooms < 8) { rooms++; syncGuestsUI(); } });

  btnAdultsDec?.addEventListener('click', (e) => { e.stopPropagation(); if (adults > 1) { adults--; syncGuestsUI(); } });
  btnAdultsInc?.addEventListener('click', (e) => { e.stopPropagation(); if (adults < 20) { adults++; syncGuestsUI(); } });

  btnChildrenDec?.addEventListener('click', (e) => { e.stopPropagation(); if (children > 0) { children--; syncGuestsUI(); } });
  btnChildrenInc?.addEventListener('click', (e) => { e.stopPropagation(); if (children < 10) { children++; syncGuestsUI(); } });

  btnGuestsApply?.addEventListener('click', (e) => {
    e.stopPropagation();
    pets = chkPets ? chkPets.checked : false;

    // Save states to inputs
    if (roomsInput) roomsInput.value = rooms;
    if (adultsInput) adultsInput.value = adults;
    if (childrenInput) childrenInput.value = children;
    if (petsInput) petsInput.value = pets;

    updateGuestsDisplay();
    toggleGuests(false);
  });

  function syncGuestsUI() {
    if (valRooms) valRooms.textContent = rooms;
    if (valAdults) valAdults.textContent = adults;
    if (valChildren) valChildren.textContent = children;
    if (chkPets) chkPets.checked = pets;

    // Disabled styles
    btnRoomsDec?.classList.toggle('disabled', rooms <= 1);
    btnRoomsInc?.classList.toggle('disabled', rooms >= 8);
    btnAdultsDec?.classList.toggle('disabled', adults <= 1);
    btnAdultsInc?.classList.toggle('disabled', adults >= 20);
    btnChildrenDec?.classList.toggle('disabled', children <= 0);
    btnChildrenInc?.classList.toggle('disabled', children >= 10);
  }

  function updateGuestsDisplay() {
    if (!displayGuests) return;
    const totalGuests = adults + children;
    const roomStr = `${rooms} Room${rooms > 1 ? 's' : ''}`;
    const guestStr = `${totalGuests} Guest${totalGuests > 1 ? 's' : ''}`;
    const petsStr = pets ? ', 🐾' : '';
    displayGuests.textContent = `${roomStr}, ${guestStr}${petsStr}`;
  }

  // ---- Form Submission ----
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    
    if (destInput?.value) params.set('destination', destInput.value);
    if (selectedCheckIn) params.set('checkin', selectedCheckIn);
    if (selectedCheckOut) params.set('checkout', selectedCheckOut);
    
    // totalGuests for compat with existing search params parser
    const totalGuests = adults + children;
    params.set('guests', totalGuests);
    params.set('rooms', rooms);
    params.set('adults', adults);
    params.set('children', children);
    params.set('pets', pets ? 'true' : 'false');

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

// ---- Collections loaded dynamically from room_types ----
async function loadCollections() {
  const grid = document.getElementById('collections-grid');
  if (!grid) return;

  try {
    const roomTypes = await fetchCollectionRoomTypes();
    if (roomTypes && roomTypes.length > 0) {
      grid.innerHTML = roomTypes.map(renderCollectionCard).join('');
    }
  } catch (err) {
    console.error('Could not load room types for collections:', err);
  }
}

function renderCollectionCard(room) {
  let title = room.description || '';
  let sub = '';

  if (room.description && room.description.includes(' — ')) {
    const parts = room.description.split(' — ');
    title = parts[0];
    sub = parts.slice(1).join(' — ');
  } else if (room.description && room.description.includes(' - ')) {
    const parts = room.description.split(' - ');
    title = parts[0];
    sub = parts.slice(1).join(' - ');
  }

  const photoUrl = (room.photos && room.photos.length > 0) ? room.photos[0] : '';
  const targetUrl = room.property_id ? `/property.html?id=${room.property_id}` : '/properties.html';

  return `
    <a href="${targetUrl}" class="collection-card" aria-label="${room.name}">
      ${photoUrl ? `<img src="${photoUrl}" alt="${room.name}" loading="lazy">` : ''}
      <div class="collection-card-body">
        <div class="collection-card-eyebrow">${room.name}</div>
        <div class="collection-card-title">${title}</div>
        <div class="collection-card-sub">${sub}</div>
      </div>
    </a>
  `;
}

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
