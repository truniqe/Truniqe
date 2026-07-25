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

const MOCK_GOA_PROPERTIES_DETAILS = {
  'goa-mock-1': {
    property: {
      id: 'goa-mock-1',
      name: 'Ginger Goa, Candolim',
      location: 'Candolim, Goa',
      state: 'Goa',
      story: 'Long before Candolim became a bustling beach hub, Ginger Goa established its place as a reliable sanctuary. Known for its curated stays, the hotel merges modern comforts with intuitive warm hospitality. Excellent location, walking distance from the beachfront and main market lanes.',
      angle_tags: ['Design & Heritage'],
      amenities: ['Rooftop terrace', 'Swimming pool', 'Ayurvedic spa', 'Heritage tours', 'Air conditioning', 'WiFi', 'Airport transfers'],
      cover_image_url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1400&q=80',
      gallery_urls: [
        'https://images.unsplash.com/photo-1600011689032-8b628b8a8747?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80'
      ],
      status: 'live'
    },
    roomTypes: [
      { id: 'goa-mock-1-r1', name: 'Standard Room', description: 'Cozy and well-appointed double bed room, city facing.', base_price: 3899, max_guests: 2, photos: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80'] },
      { id: 'goa-mock-1-r2', name: 'Executive Suite Room', description: 'Large spacious suite with living area and pool facing balcony.', base_price: 5200, max_guests: 3, photos: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80'] }
    ]
  },
  'goa-mock-2': {
    property: {
      id: 'goa-mock-2',
      name: 'Fairfield by Marriott Goa Benaulim',
      location: 'Benaulim, Goa',
      state: 'Goa',
      story: 'Enjoy a premium, peaceful holiday at Fairfield by Marriott. Just a short walk from Benaulim beach, this property is designed for absolute comfort and relaxation. Indulge in the spa, splash in the outdoor pool, or enjoy locally inspired dining.',
      angle_tags: ['Design & Heritage'],
      amenities: ['Swimming pool', 'Gym', 'Spa', 'Bar', 'WiFi', 'Air conditioning'],
      cover_image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
      gallery_urls: [
        'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'
      ],
      status: 'live'
    },
    roomTypes: [
      { id: 'goa-mock-2-r1', name: 'Deluxe King Room', description: 'Luxury King bed with garden views and premium linens.', base_price: 8500, max_guests: 2, photos: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'] },
      { id: 'goa-mock-2-r2', name: 'Premium Suite Room', description: 'Large master suite with balcony, living area, and private bath tub.', base_price: 11000, max_guests: 3, photos: ['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80'] }
    ]
  },
  'goa-mock-3': {
    property: {
      id: 'goa-mock-3',
      name: 'Estrela Do Mar Beach Resort - A Beach Property',
      location: 'Calangute, Goa',
      state: 'Goa',
      story: 'Right on Calangute Beach, Estrela Do Mar is an iconic beach resort offering cozy wooden cottages and direct private beach access. Complete with live music, multiple swimming pools, and a lively bar.',
      angle_tags: ['Experience-Driven'],
      amenities: ['Private beach access', 'Swimming pool', 'Live music', 'Bar', 'WiFi', 'Air conditioning'],
      cover_image_url: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1400&q=80',
      gallery_urls: [
        'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1200&q=80'
      ],
      status: 'live'
    },
    roomTypes: [
      { id: 'goa-mock-3-r1', name: 'Standard Wooden Cottage', description: 'Cozy rustic wooden cottage built on the beach dunes.', base_price: 3436, max_guests: 2, photos: ['https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80'] },
      { id: 'goa-mock-3-r2', name: 'Luxury Beach Bungalow', description: 'Premium beach-front bungalow with private deck looking at the sea.', base_price: 5100, max_guests: 3, photos: ['https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80'] }
    ]
  },
  'goa-mock-4': {
    property: {
      id: 'goa-mock-4',
      name: 'Summit Calangute Resort & Spa',
      location: 'Calangute, Goa',
      state: 'Goa',
      story: 'Quiet, peaceful and yet close to the beach, Summit Calangute is the perfect choice for wellness and relaxation. Treat yourself to the Ayurvedic spa treatments or take a refreshing dip in our pool.',
      angle_tags: ['Experience-Driven'],
      amenities: ['Swimming pool', 'Ayurvedic spa', 'Bar', 'Restaurant', 'WiFi', 'Air conditioning'],
      cover_image_url: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1400&q=80',
      gallery_urls: [
        'https://images.unsplash.com/photo-1499363536502-87642509e31b?auto=format&fit=crop&w=1200&q=80'
      ],
      status: 'live'
    },
    roomTypes: [
      { id: 'goa-mock-4-r1', name: 'Standard Room', description: 'Comfortable double bed room with basic amenities.', base_price: 2135, max_guests: 2, photos: ['https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80'] },
      { id: 'goa-mock-4-r2', name: 'Family Suite Room', description: 'Large spacious double bed suite for 4 guests.', base_price: 3600, max_guests: 4, photos: ['https://images.unsplash.com/photo-1499363536502-87642509e31b?auto=format&fit=crop&w=800&q=80'] }
    ]
  }
};

async function init() {
  if (!propertyId) { window.location.href = '/properties.html'; return; }

  await initAuth();
  onAuthChange(updateNav);
  setupNav();

  try {
    if (propertyId.startsWith('goa-mock-')) {
      const mock = MOCK_GOA_PROPERTIES_DETAILS[propertyId];
      if (!mock) {
        document.getElementById('property-loading').style.display = 'none';
        document.getElementById('property-error').style.display = 'block';
        return;
      }
      property = mock.property;
      roomTypes = mock.roomTypes;
    } else {
      [property, roomTypes] = await Promise.all([
        fetchPropertyById(propertyId),
        fetchRoomTypes(propertyId),
      ]);
    }

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

  if (selectedRoom && !selectedRoom.id.startsWith('goa-mock-')) {
    try {
      availabilityMap = await fetchAvailability(selectedRoom.id, startStr, endStr);
    } catch (e) {
      availabilityMap = new Map();
    }
  } else {
    // For mock properties, all dates are available
    availabilityMap = new Map();
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
