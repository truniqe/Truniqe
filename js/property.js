// ============================================================
// js/property.js — Property Detail Page
// Gallery, Rooms, Calendar, Booking CTA
// ============================================================

import { initAuth, updateNav, onAuthChange, formatCurrency, formatDate, showToast } from './auth.js';
import { fetchPropertyById, fetchRoomTypes, fetchAvailability } from './supabase.js';

let property = null;
let roomTypes = [];
let selectedRoom = null;
let checkIn = '';
let checkOut = '';
let availabilityMap = new Map(); // 'YYYY-MM-DD' -> {is_blocked}
let calendarDate = new Date();

const params = new URLSearchParams(window.location.search);
const propertyId = params.get('id');

async function init() {
  if (!propertyId) { window.location.href = '/properties.html'; return; }

  await initAuth();
  onAuthChange(updateNav);
  setupNav();

  try {
    [property, roomTypes] = await Promise.all([
      fetchPropertyById(propertyId),
      fetchRoomTypes(propertyId),
    ]);

    if (!property || property.status !== 'live') {
      document.getElementById('property-loading').style.display = 'none';
      document.getElementById('property-error').style.display = 'block';
      return;
    }

    renderProperty();
    renderRooms();
    setupCalendar();
    setupBookingCTA();
    document.getElementById('property-loading').style.display = 'none';
    document.getElementById('property-content').style.display = 'block';

  } catch (err) {
    console.error(err);
    document.getElementById('property-loading').style.display = 'none';
    document.getElementById('property-error').style.display = 'block';
  }
}

// ---- Render property info ----
function renderProperty() {
  document.title = `${property.name} — Truniqe`;
  document.getElementById('property-title').textContent = property.name;
  document.getElementById('property-location').textContent = property.location;
  document.getElementById('property-curators-note').textContent = property.story || '';

  // Tags
  const tagsEl = document.getElementById('property-tags');
  if (tagsEl) {
    tagsEl.innerHTML = (property.angle_tags || []).map(tag => {
      const map = {
        'Design & Heritage': { cls: 'tag-heritage', icon: '🏛' },
        'Offbeat Location':  { cls: 'tag-offbeat',  icon: '🏔' },
        'Experience-Driven': { cls: 'tag-experience', icon: '✨' },
      };
      const t = map[tag] || { cls:'', icon:'' };
      return `<span class="tag ${t.cls}">${t.icon} ${tag}</span>`;
    }).join('');
  }

  // Amenities
  const amenEl = document.getElementById('property-amenities');
  if (amenEl) {
    amenEl.innerHTML = (property.amenities || []).map(a =>
      `<span class="amenity-chip">✓ ${a}</span>`
    ).join('');
  }

  // Min price CTA
  const minPrice = roomTypes.length ? Math.min(...roomTypes.map(r => r.base_price)) : null;
  if (minPrice) {
    const priceEl = document.getElementById('cta-starting-price');
    if (priceEl) priceEl.textContent = formatCurrency(minPrice);
  }

  // Gallery
  renderGallery();

  // Breadcrumb
  const breadcrumb = document.getElementById('property-breadcrumb');
  if (breadcrumb) breadcrumb.textContent = property.name;
}

// ---- Gallery ----
let lightboxImages = [];
let lightboxIndex = 0;

function renderGallery() {
  const galleryEl = document.getElementById('property-gallery');
  if (!galleryEl) return;

  const allImages = [
    property.cover_image_url,
    ...(property.gallery_urls || []),
  ].filter(Boolean);

  lightboxImages = allImages;

  if (!allImages.length) {
    galleryEl.innerHTML = `<div style="aspect-ratio:16/9;background:var(--surface-dark);border-radius:var(--radius-xl);display:flex;align-items:center;justify-content:center;font-size:64px">🏨</div>`;
    return;
  }

  const [cover, ...thumbs] = allImages;

  galleryEl.innerHTML = `
    <div class="gallery">
      <div class="gallery-main" onclick="openLightbox(0)">
        <img src="${cover}" alt="${property.name}" loading="lazy">
        ${allImages.length > 2 ? `
          <button class="gallery-show-all" onclick="openLightbox(0)">
            📷 Show all ${allImages.length} photos
          </button>
        ` : ''}
      </div>
      ${thumbs.slice(0, 2).map((url, i) => `
        <div class="gallery-thumb" onclick="openLightbox(${i + 1})">
          <img src="${url}" alt="${property.name} photo ${i+2}" loading="lazy">
        </div>
      `).join('')}
    </div>
  `;

  // Lightbox
  const lightbox = document.getElementById('lightbox');
  window.openLightbox = (index) => {
    lightboxIndex = index;
    updateLightbox();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.closeLightbox = () => {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  };

  window.lightboxNext = () => {
    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    updateLightbox();
  };

  window.lightboxPrev = () => {
    lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    updateLightbox();
  };

  lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox) window.closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox?.classList.contains('open')) return;
    if (e.key === 'ArrowRight') window.lightboxNext();
    if (e.key === 'ArrowLeft')  window.lightboxPrev();
    if (e.key === 'Escape')     window.closeLightbox();
  });
}

function updateLightbox() {
  const img = document.getElementById('lightbox-img');
  const counter = document.getElementById('lightbox-counter');
  if (img) img.src = lightboxImages[lightboxIndex];
  if (counter) counter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
}

// ---- Room Types ----
function renderRooms() {
  const container = document.getElementById('rooms-container');
  if (!container) return;

  if (!roomTypes.length) {
    container.innerHTML = `<p class="text-muted">No rooms available for this property.</p>`;
    return;
  }

  container.innerHTML = roomTypes.map(room => `
    <div class="room-card" id="room-${room.id}" data-room-id="${room.id}">
      <div class="room-card-image">
        ${room.photos?.[0]
          ? `<img src="${room.photos[0]}" alt="${room.name}" loading="lazy">`
          : `<div style="width:100%;height:100%;background:var(--surface-dark);display:flex;align-items:center;justify-content:center;font-size:48px">🛏</div>`
        }
      </div>
      <div class="room-card-body">
        <h4 class="room-card-name">${room.name}</h4>
        <p class="room-card-desc">${room.description || ''}</p>
        <div class="room-card-meta">
          <span class="room-meta-item">👤 Up to ${room.max_guests} guests</span>
        </div>
        <div class="room-card-footer">
          <div class="room-price">
            ${formatCurrency(room.base_price)} <small>/ night</small>
          </div>
          <button class="btn btn-primary btn-sm" onclick="selectRoom('${room.id}')">
            Select Room
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ---- Calendar ----
function setupCalendar() {
  if (!roomTypes.length) return;
  // Load availability for first room type by default
  selectedRoom = roomTypes[0];
  loadCalendarMonth(calendarDate);

  document.getElementById('cal-prev')?.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    loadCalendarMonth(calendarDate);
  });
  document.getElementById('cal-next')?.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    loadCalendarMonth(calendarDate);
  });
}

async function loadCalendarMonth(date) {
  const year  = date.getFullYear();
  const month = date.getMonth();
  const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate  = new Date(year, month + 1, 0);
  const endStr   = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  document.getElementById('cal-month-title').textContent =
    date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  if (selectedRoom) {
    try {
      availabilityMap = await fetchAvailability(selectedRoom.id, startStr, endStr);
    } catch (e) {
      availabilityMap = new Map();
    }
  }

  renderCalendarGrid(year, month);
}

function renderCalendarGrid(year, month) {
  const grid = document.getElementById('cal-grid');
  if (!grid) return;

  const today = new Date();
  today.setHours(0,0,0,0);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = '';

  // Empty cells before month start
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const thisDate = new Date(year, month, d);
    thisDate.setHours(0,0,0,0);

    const avail = availabilityMap.get(dateStr);
    const isBlocked = avail?.is_blocked;
    const isPast = thisDate < today;
    const isToday = thisDate.getTime() === today.getTime();

    let cls = 'calendar-day';
    if (isPast) cls += ' past';
    else if (isBlocked) cls += ' blocked';
    else cls += ' available';
    if (isToday) cls += ' today';

    // Show price override if any
    const priceLabel = avail?.price_override ? `<br><small style="font-size:9px;color:var(--gold-dark)">${formatCurrency(avail.price_override)}</small>` : '';

    html += `<div class="${cls}" title="${dateStr}">${d}${priceLabel}</div>`;
  }

  grid.innerHTML = html;

  // Date range selection
  let selectingStart = true;
  grid.querySelectorAll('.calendar-day.available').forEach(dayEl => {
    dayEl.addEventListener('click', () => {
      const dateStr = dayEl.title;
      if (selectingStart) {
        checkIn = dateStr;
        checkOut = '';
        selectingStart = false;
        updateDateSelectionUI();
      } else {
        if (dateStr <= checkIn) {
          checkIn = dateStr;
          checkOut = '';
          return;
        }
        checkOut = dateStr;
        selectingStart = true;
        updateDateSelectionUI();
        updateBookingCTA();
      }
    });
  });
}

function updateDateSelectionUI() {
  const grid = document.getElementById('cal-grid');
  if (!grid) return;

  grid.querySelectorAll('.calendar-day').forEach(el => {
    el.classList.remove('selected-start', 'selected-end', 'in-range');
    const d = el.title;
    if (!d) return;
    if (d === checkIn) el.classList.add('selected-start');
    else if (d === checkOut) el.classList.add('selected-end');
    else if (checkIn && checkOut && d > checkIn && d < checkOut) el.classList.add('in-range');
  });

  // Update CTA date fields
  const checkinEl = document.getElementById('cta-checkin');
  const checkoutEl = document.getElementById('cta-checkout');
  if (checkinEl) checkinEl.value = checkIn;
  if (checkoutEl) checkoutEl.value = checkOut;
}

// ---- Book Now CTA ----
function setupBookingCTA() {
  const bookBtn = document.getElementById('book-now-btn');
  bookBtn?.addEventListener('click', proceedToBooking);

  // Scroll to rooms
  document.getElementById('scroll-to-rooms-btn')?.addEventListener('click', () => {
    document.getElementById('rooms-section')?.scrollIntoView({ behavior: 'smooth' });
  });
}

window.selectRoom = (roomId) => {
  selectedRoom = roomTypes.find(r => r.id === roomId);

  // Update selected state
  document.querySelectorAll('.room-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`room-${roomId}`)?.classList.add('selected');

  // Update CTA room name
  const ctaRoom = document.getElementById('cta-room-name');
  if (ctaRoom) ctaRoom.textContent = selectedRoom.name;

  // Reload calendar for this room
  loadCalendarMonth(calendarDate);

  // Scroll CTA into view on mobile
  document.getElementById('booking-cta')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

function updateBookingCTA() {
  const ctaNights = document.getElementById('cta-nights');
  const ctaTotal = document.getElementById('cta-total');
  const checkinDisp = document.getElementById('cta-checkin-display');
  const checkoutDisp = document.getElementById('cta-checkout-display');

  if (checkIn && checkOut && selectedRoom) {
    const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
    const total = nights * selectedRoom.base_price;

    if (ctaNights) ctaNights.textContent = `${nights} night${nights > 1 ? 's' : ''}`;
    if (ctaTotal) ctaTotal.textContent = formatCurrency(total);
    if (checkinDisp) checkinDisp.textContent = formatDate(checkIn);
    if (checkoutDisp) checkoutDisp.textContent = formatDate(checkOut);

    document.getElementById('book-now-btn')?.removeAttribute('disabled');
  } else {
    if (ctaNights) ctaNights.textContent = '—';
    if (ctaTotal) ctaTotal.textContent = '—';
    document.getElementById('book-now-btn')?.setAttribute('disabled', 'true');
  }
}

function proceedToBooking() {
  if (!selectedRoom || !checkIn || !checkOut) {
    showToast('Select dates', 'Please choose check-in and check-out dates.', 'warning');
    return;
  }
  const url = `/booking.html?property=${propertyId}&room=${selectedRoom.id}&checkin=${checkIn}&checkout=${checkOut}`;
  window.location.href = url;
}

function setupNav() {
  const nav = document.getElementById('main-nav');
  nav?.classList.remove('nav-transparent');
  nav?.classList.add('nav-light');

  document.getElementById('nav-hamburger')?.addEventListener('click', function() {
    this.classList.toggle('open');
    document.getElementById('nav-mobile')?.classList.toggle('open');
  });
}

document.addEventListener('DOMContentLoaded', init);
