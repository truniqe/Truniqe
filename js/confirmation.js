// ============================================================
// js/confirmation.js — Booking Confirmation Page
// ============================================================

import { initAuth, updateNav, onAuthChange, formatCurrency, formatDate, showToast } from './auth.js';
import { fetchBookingById } from './supabase.js';

const params    = new URLSearchParams(window.location.search);
const bookingId = params.get('booking');

async function init() {
  await initAuth();
  onAuthChange(updateNav);
  setupNav();

  if (!bookingId) {
    window.location.href = '/';
    return;
  }

  try {
    const booking = await fetchBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    renderConfirmation(booking);
    document.getElementById('conf-loading').style.display = 'none';
    document.getElementById('conf-content').style.display = 'block';
    // Trigger confetti effect
    triggerConfetti();
  } catch (err) {
    console.error(err);
    document.getElementById('conf-loading').style.display = 'none';
    document.getElementById('conf-error').style.display = 'block';
  }
}

function renderConfirmation(booking) {
  const property = booking.room_types?.properties;
  const room     = booking.room_types;
  const nights   = Math.round((new Date(booking.check_out) - new Date(booking.check_in)) / 86400000);

  // Ref number (last 8 chars of booking id)
  const ref = booking.id.replace(/-/g, '').toUpperCase().slice(-8);
  document.getElementById('booking-ref').textContent = `TRQ-${ref}`;
  document.title = `Booking Confirmed — TRQ-${ref} | Truniqe`;

  const rows = [
    { label: 'Property',      value: property?.name || '—' },
    { label: 'Room',          value: room?.name || '—' },
    { label: 'Location',      value: property?.location || '—' },
    { label: 'Check-in',      value: formatDate(booking.check_in) },
    { label: 'Check-out',     value: formatDate(booking.check_out) },
    { label: 'Nights',        value: nights },
    { label: 'Guests',        value: booking.guests_count },
    { label: 'Guest Name',    value: booking.guest_name || '—' },
    { label: 'Guest Phone',   value: booking.guest_phone || '—' },
    { label: 'Total Paid',    value: formatCurrency(booking.total_amount) },
    { label: 'Payment ID',    value: booking.razorpay_payment_id || 'N/A' },
    { label: 'Status',        value: `<span class="badge badge-success">${booking.status}</span>` },
  ];

  document.getElementById('conf-details').innerHTML = rows.map(r => `
    <div class="confirmation-detail-row">
      <span class="confirmation-detail-label">${r.label}</span>
      <span class="confirmation-detail-value">${r.value}</span>
    </div>
  `).join('');

  // Property image
  if (property?.cover_image_url) {
    const imgEl = document.getElementById('conf-property-img');
    if (imgEl) {
      imgEl.src = property.cover_image_url;
      imgEl.alt = property.name;
      imgEl.style.display = 'block';
    }
  }

  // Special requests note
  if (booking.special_requests) {
    document.getElementById('conf-requests').innerHTML = `
      <div style="margin-top:var(--sp-4);padding:var(--sp-4);background:var(--info-light);border-radius:var(--radius-md)">
        <div style="font-size:var(--text-xs);font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--info);margin-bottom:var(--sp-2)">Special Requests</div>
        <div style="font-size:var(--text-sm);color:var(--text-primary)">${booking.special_requests}</div>
      </div>
    `;
  }
}

function setupNav() {
  const nav = document.getElementById('main-nav');
  nav?.classList.remove('nav-transparent');
  nav?.classList.add('nav-light');
}

// ---- Confetti ----
function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  const colors = ['#E8B86D', '#1A1A2E', '#F2CFA0', '#2D6A4F', '#7B3F6E'];
  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: -10,
    w: Math.random() * 12 + 4,
    h: Math.random() * 6 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.15,
    speedX: (Math.random() - 0.5) * 3,
    speedY: Math.random() * 4 + 2,
    opacity: 1,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let done = true;

    particles.forEach(p => {
      if (p.y < canvas.height + 20) {
        done = false;
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotSpeed;
        p.opacity -= 0.005;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    });

    if (!done && frame++ < 300) {
      requestAnimationFrame(draw);
    } else {
      canvas.style.display = 'none';
    }
  }

  draw();
}

document.addEventListener('DOMContentLoaded', init);
