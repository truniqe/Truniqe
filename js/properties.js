// ============================================================
// js/properties.js — Property Listing Page with left sidebar filters
// ============================================================

import { initAuth, updateNav, onAuthChange, formatCurrency } from './auth.js';
import { fetchProperties } from './supabase.js';

// Mock Goa properties to match screenshots
const MOCK_GOA_PROPERTIES = [
  {
    id: "goa-mock-1",
    name: "Ginger Goa, Candolim",
    location: "Candolim, Goa",
    state: "Goa",
    min_price: 3899,
    cover_image_url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600011689032-8b628b8a8747?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80"
    ],
    angle_tags: ["Design & Heritage"],
    amenities: ["Rooftop terrace", "Swimming pool", "Ayurvedic spa", "Airport transfers"],
    stars: 4,
    rating: 4.2,
    ratingLabel: "Very Good",
    ratingCount: 3571,
    landmark: "Candolim | 8 minutes walk to Candolim Beach",
    verified: true,
    sponsored: false,
    propertyType: "Hotel",
    features: [
      "Enjoy Happy Hours with 1+1 offer",
      "Early check-in upto 2 hrs (subject to availability)",
      "Enjoy Complimentary Breakfast along with your stay"
    ],
    coupleFriendly: true
  },
  {
    id: "goa-mock-2",
    name: "Fairfield by Marriott Goa Benaulim",
    location: "Benaulim, Goa",
    state: "Goa",
    min_price: 8500,
    cover_image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80"
    ],
    angle_tags: ["Design & Heritage"],
    amenities: ["Swimming pool", "Gym", "Spa", "Bar"],
    stars: 4,
    rating: 4.6,
    ratingLabel: "Excellent",
    ratingCount: 1713,
    landmark: "Benaulim | About a minute walk to Benaulim Beach",
    verified: true,
    sponsored: true,
    propertyType: "Hotel",
    features: [
      "Complimentary evening high tea on arrival between 4:30 p.m. and 6:30 p.m.",
      "Free Cancellation till check-in",
      "Couple Friendly"
    ],
    coupleFriendly: true
  },
  {
    id: "goa-mock-3",
    name: "Estrela Do Mar Beach Resort - A Beach Property",
    location: "Calangute, Goa",
    state: "Goa",
    min_price: 3436,
    cover_image_url: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80"
    ],
    angle_tags: ["Experience-Driven"],
    amenities: ["Private beach access", "Swimming pool", "Live music", "Bar"],
    stars: 4,
    rating: 3.9,
    ratingLabel: "Very Good",
    ratingCount: 8499,
    landmark: "Calangute | About a minute walk to Calangute Beach",
    verified: true,
    sponsored: false,
    propertyType: "Resort",
    features: [
      "Ideal spot near Calangute beach, Great breakfast buffet with live music, Cozy wooden cottages.",
      "Free Cancellation till check-in",
      "Couple Friendly"
    ],
    coupleFriendly: true
  },
  {
    id: "goa-mock-4",
    name: "Summit Calangute Resort & Spa",
    location: "Calangute, Goa",
    state: "Goa",
    min_price: 2135,
    cover_image_url: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1499363536502-87642509e31b?auto=format&fit=crop&w=800&q=80"
    ],
    angle_tags: ["Experience-Driven"],
    amenities: ["Swimming pool", "Ayurvedic spa", "Bar", "Restaurant"],
    stars: 4,
    rating: 4.0,
    ratingLabel: "Very Good",
    ratingCount: 764,
    landmark: "Calangute | 2.2 km drive to Calangute Beach",
    verified: true,
    sponsored: false,
    propertyType: "Resort",
    features: [
      "Guaranteed Late Check-out available",
      "Free Cancellation till check-in",
      "Enjoy Happy Hours with 1+1 offer on Alcoholic Beverages",
      "Calm location near beaches, exceptional food quality, spacious rooms with ambiance."
    ],
    coupleFriendly: true
  }
];

let allStays = []; // Fetched stays combined with mocks
let filteredStays = []; // Stays after left sidebar filters
let isLoading = false;

// Mood → filter mapping used by Browse-by-Mood section on the homepage
const MOOD_CONFIG = {
  romantic:    { label: '♥ Romantic Getaway',    tags: ['Experience-Driven'], couple: true  },
  family:      { label: '😊 Family Outing',        tags: ['Experience-Driven', 'Design & Heritage'], couple: false },
  celebration: { label: '✦ Celebration Special',  tags: ['Experience-Driven'], couple: false },
  party:       { label: '♫ Party Place',           tags: ['Experience-Driven'], couple: false },
  detox:       { label: '🌙 Digital Detox',        tags: ['Offbeat Location'],  couple: false },
  group:       { label: '⊙ Group Reunion',         tags: ['Experience-Driven', 'Offbeat Location'], couple: false }
};

// Filter configuration state
let activeFilters = {
  destination: 'Goa, India',
  checkin: '2026-07-26',
  checkout: '2026-07-27',
  rooms: 1,
  adults: 2,
  children: 0,
  infants: 0,
  pets: false,
  localitySearch: '',
  suggested: [],
  priceRanges: [],
  minBudget: null,
  maxBudget: null,
  stars: [],
  ratings: [],
  propertyTypes: [],
  sortBy: 'newest',
  mood: null   // set when arriving from Browse-by-Mood
};

async function init() {
  await initAuth();
  onAuthChange(updateNav);
  setupNav();
  parseURLParams();
  setupTopSearchPanel();
  setupSidebarFiltersEvents();
  setupSortEvents();
  await loadStaysData();
}

function setupNav() {
  const nav = document.getElementById('main-nav');
  nav?.classList.add('nav-solid');
  nav?.classList.remove('nav-transparent');

  document.getElementById('nav-hamburger')?.addEventListener('click', function() {
    this.classList.toggle('open');
    document.getElementById('nav-mobile')?.classList.toggle('open');
  });

  // User dropdown
  const userMenuBtn = document.getElementById('nav-user-avatar');
  const userDropdown = document.getElementById('nav-user-dropdown');
  userMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown?.classList.toggle('open');
  });
  document.addEventListener('click', () => userDropdown?.classList.remove('open'));

  // Sign out
  document.getElementById('nav-signout-btn')?.addEventListener('click', async () => {
    const { signOut } = await import('./auth.js');
    signOut();
  });
}

// ---- Parse URL params from homepage search ----
function parseURLParams() {
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('destination')) {
    activeFilters.destination = params.get('destination');
    const el = document.getElementById('search-destination');
    if (el) el.value = activeFilters.destination;
  }
  if (params.get('checkin')) {
    activeFilters.checkin = params.get('checkin');
    const el = document.getElementById('search-checkin');
    if (el) el.value = activeFilters.checkin;
  }
  if (params.get('checkout')) {
    activeFilters.checkout = params.get('checkout');
    const el = document.getElementById('search-checkout');
    if (el) el.value = activeFilters.checkout;
  }
  if (params.get('rooms')) {
    activeFilters.rooms = parseInt(params.get('rooms'), 10);
    const el = document.getElementById('search-rooms');
    if (el) el.value = activeFilters.rooms;
  }
  if (params.get('adults')) {
    activeFilters.adults = parseInt(params.get('adults'), 10);
    const el = document.getElementById('search-adults');
    if (el) el.value = activeFilters.adults;
  }
  if (params.get('children')) {
    activeFilters.children = parseInt(params.get('children'), 10);
    const el = document.getElementById('search-children');
    if (el) el.value = activeFilters.children;
  }
  if (params.get('infants')) {
    activeFilters.infants = parseInt(params.get('infants'), 10);
    const el = document.getElementById('search-infants');
    if (el) el.value = activeFilters.infants;
  }
  if (params.get('pets')) {
    activeFilters.pets = params.get('pets') === 'true';
    const el = document.getElementById('search-pets');
    if (el) el.value = activeFilters.pets;
  }

  // Update top strip displays
  const displayCheckin = document.getElementById('display-checkin');
  const displayCheckout = document.getElementById('display-checkout');
  const displayGuests = document.getElementById('display-guests');

  // Format date helper inside properties.js
  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  if (displayCheckin && activeFilters.checkin) displayCheckin.textContent = formatDateLabel(activeFilters.checkin);
  if (displayCheckout && activeFilters.checkout) displayCheckout.textContent = formatDateLabel(activeFilters.checkout);
  
  if (displayGuests) {
    const totalG = activeFilters.adults + activeFilters.children + (activeFilters.infants || 0);
    displayGuests.textContent = `${activeFilters.rooms} Room${activeFilters.rooms > 1 ? 's' : ''}, ${totalG} Guest${totalG > 1 ? 's' : ''}${activeFilters.pets ? ', 🐾' : ''}`;
  }

  // If there's an incoming tag (e.g. tag = Design & Heritage) from Collections clicks, select it in the Suggested For You list
  const tag = params.get('tag');
  if (tag) {
    if (tag.includes('Heritage')) {
      activeFilters.suggested.push('heritage');
      const cb = document.querySelector('input[name="suggested"][value="5-star"]'); // fallback highlight
      if (cb) cb.checked = true;
    }
  }

  // ---- Browse-by-Mood param (?mood=romantic|family|celebration|party|detox|group) ----
  const mood = params.get('mood');
  if (mood && MOOD_CONFIG[mood]) {
    activeFilters.mood = mood;
    // Inject a dismissable mood banner pill below the breadcrumb
    const breadcrumb = document.getElementById('stays-breadcrumb');
    if (breadcrumb) {
      const pill = document.createElement('div');
      pill.id = 'mood-banner-pill';
      pill.style.cssText = [
        'display:inline-flex', 'align-items:center', 'gap:8px',
        'background:var(--navy)', 'color:#fff',
        'font-size:12px', 'font-weight:600', 'letter-spacing:0.04em',
        'padding:6px 14px', 'border-radius:999px',
        'margin-top:10px', 'cursor:default'
      ].join(';');
      pill.innerHTML = `${MOOD_CONFIG[mood].label}
        <button onclick="document.getElementById('mood-banner-pill').remove();activeFilters.mood=null;applyStaysFilters?.();"
          style="background:none;border:none;color:rgba(255,255,255,0.7);font-size:14px;cursor:pointer;line-height:1;padding:0 0 1px 4px"
          aria-label="Clear mood filter">&times;</button>`;
      breadcrumb.insertAdjacentElement('afterend', pill);
    }
  }
}

// ---- Setup Top Search Panel events ----
function setupTopSearchPanel() {
  const form = document.getElementById('search-form');
  const destInput = document.getElementById('search-destination');
  const checkinInput = document.getElementById('search-checkin');
  const checkoutInput = document.getElementById('search-checkout');
  const displayCheckin = document.getElementById('display-checkin');
  const displayCheckout = document.getElementById('display-checkout');
  const displayGuests = document.getElementById('display-guests');

  const roomsInput = document.getElementById('search-rooms');
  const adultsInput = document.getElementById('search-adults');
  const childrenInput = document.getElementById('search-children');
  const petsInput = document.getElementById('search-pets');

  const fieldCheckin = document.getElementById('field-checkin');
  const fieldCheckout = document.getElementById('field-checkout');
  const fieldGuests = document.getElementById('field-guests');

  const calendarPopup = document.getElementById('calendar-popup');
  const guestsPopup = document.getElementById('guests-popup');

  let calendarBaseDate = new Date(2026, 6, 1);
  let selectedCheckIn = activeFilters.checkin;
  let selectedCheckOut = activeFilters.checkout;
  let isSelectingStart = true;

  let rooms = activeFilters.rooms;
  let adults = activeFilters.adults;
  let children = activeFilters.children;
  let infants = activeFilters.infants || 0;
  let pets = activeFilters.pets;

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

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  // Popup triggers
  fieldCheckin?.addEventListener('click', (e) => { e.stopPropagation(); toggleCalendar(true); toggleGuests(false); });
  fieldCheckout?.addEventListener('click', (e) => { e.stopPropagation(); toggleCalendar(true); toggleGuests(false); });
  fieldGuests?.addEventListener('click', (e) => { e.stopPropagation(); toggleGuests(true); toggleCalendar(false); });

  document.addEventListener('click', (e) => {
    if (!calendarPopup?.contains(e.target) && !fieldCheckin?.contains(e.target) && !fieldCheckout?.contains(e.target)) toggleCalendar(false);
    if (!guestsPopup?.contains(e.target) && !fieldGuests?.contains(e.target)) toggleGuests(false);
  });

  function toggleCalendar(show) {
    if (!calendarPopup) return;
    calendarPopup.style.display = show ? 'block' : 'none';
    fieldCheckin?.classList.toggle('active', show);
    fieldCheckout?.classList.toggle('active', show);
    if (show) renderDoubleCalendar();
  }

  function toggleGuests(show) {
    if (!guestsPopup) return;
    guestsPopup.style.display = show ? 'block' : 'none';
    fieldGuests?.classList.toggle('active', show);
    if (show) syncGuestsUI();
  }

  // Calendar render navigation
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
    const leftTitle = document.getElementById('title-left-month');
    const rightTitle = document.getElementById('title-right-month');
    const leftGrid = document.getElementById('days-left-month');
    const rightGrid = document.getElementById('days-right-month');

    if (!leftGrid || !rightGrid) return;

    const leftMonthDate = new Date(calendarBaseDate.getFullYear(), calendarBaseDate.getMonth(), 1);
    const rightMonthDate = new Date(calendarBaseDate.getFullYear(), calendarBaseDate.getMonth() + 1, 1);

    if (leftTitle) leftTitle.textContent = leftMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (rightTitle) rightTitle.textContent = rightMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    renderMonthGrid(leftMonthDate, leftGrid);
    renderMonthGrid(rightMonthDate, rightGrid);
  }

  function renderMonthGrid(monthDate, gridElement) {
    gridElement.innerHTML = '';
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
      const cell = document.createElement('div');
      cell.className = 'day-cell muted';
      gridElement.appendChild(cell);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (let day = 1; day <= totalDays; day++) {
      const cell = document.createElement('div');
      cell.className = 'day-cell';
      const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cell.innerHTML = `<span class="day-number">${day}</span>`;

      if (HOLIDAYS_2026[dayDateStr]) {
        const span = document.createElement('span');
        span.className = 'day-holiday-label';
        span.textContent = HOLIDAYS_2026[dayDateStr];
        cell.appendChild(span);
      }

      if (dayDateStr === selectedCheckIn) cell.classList.add('selected-start');
      else if (dayDateStr === selectedCheckOut) cell.classList.add('selected-end');
      else if (selectedCheckIn && selectedCheckOut && dayDateStr > selectedCheckIn && dayDateStr < selectedCheckOut) cell.classList.add('in-range');

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
        if (checkinInput) checkinInput.value = selectedCheckIn;
        if (checkoutInput) checkoutInput.value = selectedCheckOut;
        if (displayCheckin) displayCheckin.textContent = formatDateLabel(selectedCheckIn);
        if (displayCheckout) displayCheckout.textContent = formatDateLabel(selectedCheckOut);
        
        activeFilters.checkin = selectedCheckIn;
        activeFilters.checkout = selectedCheckOut;
        toggleCalendar(false);
      }
      renderDoubleCalendar();
    }
  }

  // Guests Counters
  const btnRoomsDec = document.getElementById('btn-rooms-dec');
  const btnRoomsInc = document.getElementById('btn-rooms-inc');
  const valRooms = document.getElementById('val-rooms');
  const btnAdultsDec = document.getElementById('btn-adults-dec');
  const btnAdultsInc = document.getElementById('btn-adults-inc');
  const valAdults = document.getElementById('val-adults');
  const btnChildrenDec = document.getElementById('btn-children-dec');
  const btnChildrenInc = document.getElementById('btn-children-inc');
  const valChildren = document.getElementById('val-children');
  const btnInfantsDec = document.getElementById('btn-infants-dec');
  const btnInfantsInc = document.getElementById('btn-infants-inc');
  const valInfants = document.getElementById('val-infants');
  const infantsInput = document.getElementById('search-infants');
  const chkPets = document.getElementById('chk-pets');
  const btnGuestsApply = document.getElementById('btn-guests-apply');

  btnRoomsDec?.addEventListener('click', (e) => { e.stopPropagation(); if (rooms > 1) { rooms--; syncGuestsUI(); } });
  btnRoomsInc?.addEventListener('click', (e) => { e.stopPropagation(); if (rooms < 8) { rooms++; syncGuestsUI(); } });
  btnAdultsDec?.addEventListener('click', (e) => { e.stopPropagation(); if (adults > 1) { adults--; syncGuestsUI(); } });
  btnAdultsInc?.addEventListener('click', (e) => { e.stopPropagation(); if (adults < 20) { adults++; syncGuestsUI(); } });
  btnChildrenDec?.addEventListener('click', (e) => { e.stopPropagation(); if (children > 0) { children--; syncGuestsUI(); } });
  btnChildrenInc?.addEventListener('click', (e) => { e.stopPropagation(); if (children < 10) { children++; syncGuestsUI(); } });
  btnInfantsDec?.addEventListener('click', (e) => { e.stopPropagation(); if (infants > 0) { infants--; syncGuestsUI(); } });
  btnInfantsInc?.addEventListener('click', (e) => { e.stopPropagation(); if (infants < 10) { infants++; syncGuestsUI(); } });

  btnGuestsApply?.addEventListener('click', (e) => {
    e.stopPropagation();
    pets = chkPets ? chkPets.checked : false;
    if (roomsInput) roomsInput.value = rooms;
    if (adultsInput) adultsInput.value = adults;
    if (childrenInput) childrenInput.value = children;
    if (infantsInput) infantsInput.value = infants;
    if (petsInput) petsInput.value = pets;
    
    activeFilters.rooms = rooms;
    activeFilters.adults = adults;
    activeFilters.children = children;
    activeFilters.infants = infants;
    activeFilters.pets = pets;

    updateGuestsDisplay();
    toggleGuests(false);
  });

  function syncGuestsUI() {
    if (valRooms) valRooms.textContent = rooms;
    if (valAdults) valAdults.textContent = adults;
    if (valChildren) valChildren.textContent = children;
    if (valInfants) valInfants.textContent = infants;
    if (chkPets) chkPets.checked = pets;

    btnRoomsDec?.classList.toggle('disabled', rooms <= 1);
    btnRoomsInc?.classList.toggle('disabled', rooms >= 8);
    btnAdultsDec?.classList.toggle('disabled', adults <= 1);
    btnAdultsInc?.classList.toggle('disabled', adults >= 20);
    btnChildrenDec?.classList.toggle('disabled', children <= 0);
    btnChildrenInc?.classList.toggle('disabled', children >= 10);
    btnInfantsDec?.classList.toggle('disabled', infants <= 0);
    btnInfantsInc?.classList.toggle('disabled', infants >= 10);
  }

  function updateGuestsDisplay() {
    if (!displayGuests) return;
    const totalG = adults + children + infants;
    displayGuests.textContent = `${rooms} Room${rooms > 1 ? 's' : ''}, ${totalG} Guest${totalG > 1 ? 's' : ''}${pets ? ', 🐾' : ''}`;
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    activeFilters.destination = destInput?.value || '';
    loadStaysData(); // Reload stays with new destination
  });
}

// ---- Setup Left Sidebar Filters Events ----
function setupSidebarFiltersEvents() {
  // Locality Search
  const locSearch = document.getElementById('filter-locality-search');
  locSearch?.addEventListener('input', () => {
    activeFilters.localitySearch = locSearch.value.trim().toLowerCase();
    applyStaysFilters();
  });

  // Suggested checkboxes
  document.querySelectorAll('input[name="suggested"]').forEach(cb => {
    cb.addEventListener('change', () => {
      activeFilters.suggested = Array.from(document.querySelectorAll('input[name="suggested"]:checked'))
        .map(el => el.value);
      applyStaysFilters();
    });
  });

  // Price range checkboxes
  document.querySelectorAll('input[name="price-range"]').forEach(cb => {
    cb.addEventListener('change', () => {
      activeFilters.priceRanges = Array.from(document.querySelectorAll('input[name="price-range"]:checked'))
        .map(el => el.value);
      applyStaysFilters();
    });
  });

  // Budget Min/Max fields
  const budgetMin = document.getElementById('budget-min');
  const budgetMax = document.getElementById('budget-max');
  const budgetGoBtn = document.getElementById('btn-budget-go');

  const applyBudget = () => {
    activeFilters.minBudget = budgetMin.value ? parseFloat(budgetMin.value) : null;
    activeFilters.maxBudget = budgetMax.value ? parseFloat(budgetMax.value) : null;
    applyStaysFilters();
  };

  budgetGoBtn?.addEventListener('click', applyBudget);
  budgetMin?.addEventListener('keypress', (e) => { if (e.key === 'Enter') applyBudget(); });
  budgetMax?.addEventListener('keypress', (e) => { if (e.key === 'Enter') applyBudget(); });

  // Star Category checkboxes
  document.querySelectorAll('input[name="stars"]').forEach(cb => {
    cb.addEventListener('change', () => {
      activeFilters.stars = Array.from(document.querySelectorAll('input[name="stars"]:checked'))
        .map(el => parseInt(el.value, 10));
      applyStaysFilters();
    });
  });

  // User Rating checkboxes
  document.querySelectorAll('input[name="rating"]').forEach(cb => {
    cb.addEventListener('change', () => {
      activeFilters.ratings = Array.from(document.querySelectorAll('input[name="rating"]:checked'))
        .map(el => parseFloat(el.value));
      applyStaysFilters();
    });
  });

  // Property Type checkboxes
  document.querySelectorAll('input[name="property-type"]').forEach(cb => {
    cb.addEventListener('change', () => {
      activeFilters.propertyTypes = Array.from(document.querySelectorAll('input[name="property-type"]:checked'))
        .map(el => el.value);
      applyStaysFilters();
    });
  });

  // Accordion drop-downs in sidebar
  const ptTrigger = document.getElementById('property-type-trigger');
  const ptContent = document.getElementById('property-type-content');
  const ptIcon = document.getElementById('property-type-icon');

  ptTrigger?.addEventListener('click', () => {
    const isClosed = ptContent.style.display === 'none';
    ptContent.style.display = isClosed ? 'flex' : 'none';
    ptIcon.classList.toggle('open', isClosed);
  });

  const vTrigger = document.getElementById('villas-dropdown-trigger');
  const vContent = document.getElementById('villas-dropdown-content');
  const vIcon = document.getElementById('villas-dropdown-icon');

  vTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isClosed = vContent.style.display === 'none';
    vContent.style.display = isClosed ? 'flex' : 'none';
    vIcon.classList.toggle('open', isClosed);
  });
}

// ---- Setup Sort Events ----
function setupSortEvents() {
  const chips = document.querySelectorAll('.sort-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilters.sortBy = chip.dataset.sort;
      applyStaysFilters();
    });
  });
}

// ---- Fetch Data from Database and Mocks ----
async function loadStaysData() {
  if (isLoading) return;
  isLoading = true;

  const grid = document.getElementById('properties-grid');
  if (grid) {
    grid.innerHTML = Array(3).fill(0).map(() => `
      <div class="stay-horizontal-card skeleton-card">
        <div class="stay-image-container skeleton" style="min-height:240px"></div>
        <div class="stay-info-container" style="gap:12px; padding:24px">
          <div class="skeleton" style="height:28px; width:60%; border-radius:4px"></div>
          <div class="skeleton" style="height:14px; width:40%; border-radius:4px"></div>
          <div class="skeleton" style="height:14px; width:80%; border-radius:4px"></div>
          <div class="skeleton" style="height:48px; width:100%; border-radius:4px; margin-top:20px"></div>
        </div>
        <div class="stay-pricing-container" style="gap:12px; padding:24px">
          <div class="skeleton" style="height:24px; width:50%; align-self:flex-end; border-radius:4px"></div>
          <div class="skeleton" style="height:32px; width:80%; align-self:flex-end; border-radius:4px; margin-top:auto"></div>
        </div>
      </div>
    `).join('');
  }

  try {
    // 1. Fetch properties from database matching destination name
    let dbProperties = [];
    try {
      dbProperties = await fetchProperties({
        destination: activeFilters.destination !== 'Goa, India' ? activeFilters.destination : '',
        limit: 20
      });
    } catch (e) {
      console.warn("Supabase fetch failed, falling back to mocks", e);
    }

    // 2. Map database properties to enriched properties with metadata
    const mappedDbStays = dbProperties.map(p => {
      const meta = getPropertyMeta(p);
      return {
        ...p,
        ...meta
      };
    });

    // 3. Prepend mock Goa properties if search includes Goa
    const isGoaSearch = activeFilters.destination.toLowerCase().includes('goa');
    if (isGoaSearch) {
      // Prioritize Goa mocks
      allStays = [...MOCK_GOA_PROPERTIES, ...mappedDbStays.filter(s => s.state?.toLowerCase() === 'goa')];
    } else {
      // Show database stays, append mocks as backup if list is short
      allStays = [...mappedDbStays];
      if (allStays.length < 3) {
        allStays = [...allStays, ...MOCK_GOA_PROPERTIES];
      }
    }

    // Update breadcrumb
    const breadcrumb = document.getElementById('stays-breadcrumb');
    if (breadcrumb) {
      breadcrumb.textContent = `Home > Stays in ${activeFilters.destination || 'India'}`;
    }

    applyStaysFilters();

  } catch (err) {
    console.error("Error loading stays:", err);
    if (grid) {
      grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Could not load properties</div>
        <div class="empty-state-sub">${err.message}</div>
      </div>`;
    }
  }

  isLoading = false;
}

// ---- Client-side Filter & Sort Stays ----
function applyStaysFilters() {
  filteredStays = allStays.filter(s => {
    // 0. Browse-by-Mood filter (from homepage mood section)
    if (activeFilters.mood && MOOD_CONFIG[activeFilters.mood]) {
      const cfg = MOOD_CONFIG[activeFilters.mood];
      const stayTags = s.angle_tags || [];
      const tagMatch = cfg.tags.some(t => stayTags.includes(t));
      if (!tagMatch) return false;
      if (cfg.couple && !s.coupleFriendly) return false;
    }

    // 1. Locality Search filter
    if (activeFilters.localitySearch) {
      const matchName = s.name.toLowerCase().includes(activeFilters.localitySearch);
      const matchLoc = s.location.toLowerCase().includes(activeFilters.localitySearch);
      if (!matchName && !matchLoc) return false;
    }

    // 2. Suggested filter
    if (activeFilters.suggested.length > 0) {
      // resort, couples, cancellation
      const matchSuggested = activeFilters.suggested.every(tag => {
        if (tag === 'resort') return s.propertyType === 'Resort';
        if (tag === 'couples') return s.coupleFriendly === true;
        if (tag === 'cancellation') return s.features?.some(f => f.toLowerCase().includes('cancel'));
        return true;
      });
      if (!matchSuggested) return false;
    }

    // 3. Price range checkboxes filter
    if (activeFilters.priceRanges.length > 0) {
      const matchPriceRange = activeFilters.priceRanges.some(range => {
        const price = s.min_price || 0;
        if (range === '0-1500') return price <= 1500;
        if (range === '1500-3000') return price > 1500 && price <= 3000;
        if (range === '3000-5500') return price > 3000 && price <= 5500;
        if (range === '5500-10000') return price > 5500 && price <= 10000;
        if (range === '10000-18000') return price > 10000 && price <= 18000;
        if (range === '18000+') return price > 18000;
        return true;
      });
      if (!matchPriceRange) return false;
    }

    // 4. Custom Budget Min/Max range filter
    if (activeFilters.minBudget !== null) {
      if ((s.min_price || 0) < activeFilters.minBudget) return false;
    }
    if (activeFilters.maxBudget !== null) {
      if ((s.min_price || 0) > activeFilters.maxBudget) return false;
    }

    // 5. Star Category filter
    if (activeFilters.stars.length > 0) {
      if (!activeFilters.stars.includes(s.stars)) return false;
    }

    // 6. User Rating filter
    if (activeFilters.ratings.length > 0) {
      const matchRating = activeFilters.ratings.some(reqVal => {
        const rating = s.rating || 0;
        return rating >= reqVal;
      });
      if (!matchRating) return false;
    }

    // 7. Property Type filter
    if (activeFilters.propertyTypes.length > 0) {
      if (!activeFilters.propertyTypes.includes(s.propertyType)) return false;
    }

    return true;
  });

  // ---- Sorting ----
  if (activeFilters.sortBy === 'price_asc') {
    filteredStays.sort((a, b) => (a.min_price || 0) - (b.min_price || 0));
  } else if (activeFilters.sortBy === 'price_desc') {
    filteredStays.sort((a, b) => (b.min_price || 0) - (a.min_price || 0));
  } else if (activeFilters.sortBy === 'rating_desc') {
    filteredStays.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (activeFilters.sortBy === 'best_rated') {
    // rating high, then price low
    filteredStays.sort((a, b) => {
      const diffRating = (b.rating || 0) - (a.rating || 0);
      if (diffRating !== 0) return diffRating;
      return (a.min_price || 0) - (b.min_price || 0);
    });
  } else {
    // newest / popularity (default: sort by stars high, rating high)
    filteredStays.sort((a, b) => {
      const diffStars = (b.stars || 0) - (a.stars || 0);
      if (diffStars !== 0) return diffStars;
      return (b.rating || 0) - (a.rating || 0);
    });
  }

  renderStaysList();
}

// ---- Render stays cards list ----
function renderStaysList() {
  const grid = document.getElementById('properties-grid');
  const countEl = document.getElementById('result-count');

  if (countEl) {
    countEl.innerHTML = `<strong>${filteredStays.length}</strong> Properties in ${activeFilters.destination.split(',')[0]}`;
  }

  if (!grid) return;
  grid.innerHTML = '';

  if (filteredStays.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1">
        <div class="empty-state-icon">🏡</div>
        <div class="empty-state-title">No stays match your filters</div>
        <div class="empty-state-sub">Try checking other filter checkboxes or clearing your budget range.</div>
        <button id="clear-filters-btn" class="btn btn-outline mt-6">Clear All Filters</button>
      </div>
    `;

    document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
      // Uncheck all checkboxes
      document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
      const budgetMin = document.getElementById('budget-min');
      const budgetMax = document.getElementById('budget-max');
      if (budgetMin) budgetMin.value = '';
      if (budgetMax) budgetMax.value = '';
      const locSearch = document.getElementById('filter-locality-search');
      if (locSearch) locSearch.value = '';

      // Reset filter state
      activeFilters.localitySearch = '';
      activeFilters.suggested = [];
      activeFilters.priceRanges = [];
      activeFilters.minBudget = null;
      activeFilters.maxBudget = null;
      activeFilters.stars = [];
      activeFilters.ratings = [];
      activeFilters.propertyTypes = [];

      applyStaysFilters();
    });

    return;
  }

  filteredStays.forEach(s => {
    const card = document.createElement('article');
    card.className = 'stay-horizontal-card';
    card.dataset.id = s.id;

    // Render image carousel slides
    const images = [s.cover_image_url, ...(s.gallery_urls || [])].filter(Boolean);
    const imagesHtml = images.map((url, index) => `
      <img src="${url}" class="stay-carousel-image" alt="${s.name} - Photo ${index + 1}" loading="lazy" style="${index > 0 ? 'display:none;' : ''}">
    `).join('');

    const starsHtml = Array(s.stars || 4).fill('★').join('');
    
    // Generate feature list
    const featuresHtml = (s.features || []).map(f => `
      <li class="stay-feature-item">
        <span class="stay-feature-icon">✓</span>
        <span>${f}</span>
      </li>
    `).slice(0, 3).join('');

    const formattedPrice = formatCurrency(s.min_price || 0);
    const taxesVal = Math.round((s.min_price || 0) * 0.18); // 18% GST standard
    const formattedTaxes = formatCurrency(taxesVal);

    card.innerHTML = `
      <!-- Left: Carousel Images -->
      <div class="stay-image-container">
        <div class="stay-carousel-images" id="carousel-images-${s.id}">
          ${imagesHtml}
        </div>
        ${images.length > 1 ? `
          <button type="button" class="stay-carousel-arrow left" id="arrow-left-${s.id}">‹</button>
          <button type="button" class="stay-carousel-arrow right" id="arrow-right-${s.id}">›</button>
        ` : ''}
        <div class="stay-image-count-badge" id="image-badge-${s.id}">1 of ${images.length} Photos</div>
      </div>

      <!-- Middle: Info Details -->
      <div class="stay-info-container">
        <div>
          <div class="stay-title-bar">
            ${s.verified ? '<span class="stay-verified-icon">✓</span>' : ''}
            <h2 class="stay-title">${s.name}</h2>
            <div class="stay-stars">${starsHtml}</div>
          </div>
          <p class="stay-landmark-sub">${s.landmark || s.location}</p>

          <div class="stay-badges">
            ${s.coupleFriendly ? '<span class="stay-badge-chip couple-friendly">Couple Friendly</span>' : ''}
            ${s.sponsored ? '<span class="stay-badge-chip sponsored">Sponsored</span>' : ''}
          </div>
        </div>

        <ul class="stay-features-list">
          ${featuresHtml}
        </ul>
      </div>

      <!-- Right: Price & Ratings -->
      <div class="stay-pricing-container">
        <div class="stay-rating-box">
          <div class="stay-rating-label">${s.ratingLabel || 'Excellent'}</div>
          <div class="stay-rating-count">(${s.ratingCount || 100} Ratings)</div>
          <div class="stay-rating-score">${s.rating?.toFixed(1) || '4.0'}</div>
        </div>

        <div class="stay-price-details">
          <div class="stay-price-main">${formattedPrice}</div>
          <div class="stay-price-taxes">+ ${formattedTaxes} taxes & fees<br>Per Night</div>
          <span class="stay-book-link" id="book-link-${s.id}">Login to Book Now & Pay Later!</span>
        </div>

        <button type="button" class="stay-book-btn" id="book-btn-${s.id}">Book Stay</button>
      </div>
    `;

    grid.appendChild(card);

    // Initialize carousel navigation triggers
    let currentImgIndex = 0;
    const imgElements = card.querySelectorAll('.stay-carousel-image');
    const badgeElement = card.querySelector(`#image-badge-${s.id}`);

    card.querySelector(`#arrow-left-${s.id}`)?.addEventListener('click', (e) => {
      e.stopPropagation();
      imgElements[currentImgIndex].style.display = 'none';
      currentImgIndex = (currentImgIndex - 1 + images.length) % images.length;
      imgElements[currentImgIndex].style.display = 'block';
      if (badgeElement) badgeElement.textContent = `${currentImgIndex + 1} of ${images.length} Photos`;
    });

    card.querySelector(`#arrow-right-${s.id}`)?.addEventListener('click', (e) => {
      e.stopPropagation();
      imgElements[currentImgIndex].style.display = 'none';
      currentImgIndex = (currentImgIndex + 1) % images.length;
      imgElements[currentImgIndex].style.display = 'block';
      if (badgeElement) badgeElement.textContent = `${currentImgIndex + 1} of ${images.length} Photos`;
    });

    // Detail clicks navigation
    const navigateToDetail = () => {
      window.location.href = `/property.html?id=${s.id}`;
    };

    card.querySelector(`#book-link-${s.id}`)?.addEventListener('click', (e) => {
      e.stopPropagation();
      navigateToDetail();
    });

    card.querySelector(`#book-btn-${s.id}`)?.addEventListener('click', (e) => {
      e.stopPropagation();
      navigateToDetail();
    });

    // Make middle column and image click navigate to detail
    card.querySelector('.stay-info-container').addEventListener('click', navigateToDetail);
    card.querySelector('.stay-image-container').addEventListener('click', navigateToDetail);
  });
}

// Helper to map DB properties to descriptive metadata deterministically
function getPropertyMeta(p) {
  const nameLower = p.name.toLowerCase();
  if (nameLower.includes('samode')) {
    return {
      stars: 5,
      rating: 4.8,
      ratingLabel: 'Excellent',
      ratingCount: 2419,
      landmark: 'Jaipur | 10 minutes drive to City Palace',
      verified: true,
      sponsored: false,
      propertyType: 'Hotel',
      features: [
        'Free Cancellation till check-in',
        'Special Mughal Courtyard access',
        'Enjoy Complimentary Breakfast along with your stay'
      ],
      coupleFriendly: true
    };
  } else if (nameLower.includes('spiti')) {
    return {
      stars: 3,
      rating: 4.5,
      ratingLabel: 'Excellent',
      ratingCount: 342,
      landmark: 'Kaza | 15 minutes walk to Kaza Monastery',
      verified: true,
      sponsored: false,
      propertyType: 'Homestay',
      features: [
        'Traditional local organic meals included',
        'Stargazing deck access',
        'Monastery treks guidance'
      ],
      coupleFriendly: false
    };
  } else if (nameLower.includes('shreyas')) {
    return {
      stars: 5,
      rating: 4.9,
      ratingLabel: 'Excellent',
      ratingCount: 856,
      landmark: 'Nelamangala | 45 minutes drive from Bengaluru',
      verified: true,
      sponsored: true,
      propertyType: 'Resort',
      features: [
        'Organic farm-to-table vegetarian meals included',
        'Pre-dawn meditation sessions',
        'Ayurvedic treatments consult'
      ],
      coupleFriendly: true
    };
  } else {
    // Dune Eco Village or others
    return {
      stars: 4,
      rating: 4.2,
      ratingLabel: 'Very Good',
      ratingCount: 1904,
      landmark: p.location + ' | About a minute walk to private beach',
      verified: true,
      sponsored: false,
      propertyType: 'Resort',
      features: [
        'Direct private beach access',
        'Solar powered eco bungalows',
        'Complimentary Kayaking in Lagoon'
      ],
      coupleFriendly: true
    };
  }
}

document.addEventListener('DOMContentLoaded', init);
