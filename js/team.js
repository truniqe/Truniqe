/* ============================================================
   js/team.js — Premium Team Section Animations + Carousel
   Truniqe — Editorial Luxury Travel Platform
   ============================================================ */

(function () {
  'use strict';

  // Respect reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ==========================================================
  // 1. INTERSECTION OBSERVER — Fade-up cards on scroll
  // ==========================================================
  const teamCards = document.querySelectorAll('.team-card');

  if (teamCards.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('team-card--visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.15,
      }
    );

    teamCards.forEach((card, index) => {
      // Set stagger delay via CSS custom property
      card.style.setProperty('--card-delay', `${index * 150}ms`);
      observer.observe(card);
    });
  }

  // ==========================================================
  // 2. SECTION HEADER ANIMATION (optional fade-up)
  // ==========================================================
  const sectionHeader = document.querySelector('.team-section .section-header');
  if (sectionHeader) {
    const headerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('team-header--visible');
            headerObserver.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: '0px 0px -40px 0px', threshold: 0.1 }
    );
    headerObserver.observe(sectionHeader);
  }

  // ==========================================================
  // 3. MOBILE CAROUSEL — Show one card at a time with nav
  // ==========================================================

  const grid = document.getElementById('team-grid');
  const prevBtn = document.getElementById('team-carousel-prev');
  const nextBtn = document.getElementById('team-carousel-next');
  const dotsContainer = document.getElementById('team-carousel-dots');
  if (!grid || !prevBtn || !nextBtn || !dotsContainer) return;

  const cards = Array.from(grid.querySelectorAll('.team-card'));
  if (!cards.length) return;

  // Start with featured card (index 2 = Akash)
  let currentIndex = 2;
  const totalCards = cards.length;

  // Generate dots
  cards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'team-carousel-dot' + (i === currentIndex ? ' active' : '');
    dot.setAttribute('aria-label', `Go to team member ${i + 1}`);
    dot.dataset.index = i;
    dotsContainer.appendChild(dot);
  });

  const dots = Array.from(dotsContainer.querySelectorAll('.team-carousel-dot'));

  function isMobile() {
    return window.matchMedia('(max-width: 680px)').matches;
  }

  function updateCarousel(index) {
    // Clamp index
    if (index < 0) index = totalCards - 1;
    if (index >= totalCards) index = 0;
    currentIndex = index;

    cards.forEach((card, i) => {
      if (isMobile()) {
        card.classList.toggle('active', i === currentIndex);
      } else {
        // On desktop, show all cards by removing active filtering
        card.classList.remove('active');
      }
    });

    // Update dots
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  // Event listeners for buttons
  prevBtn.addEventListener('click', () => {
    updateCarousel(currentIndex - 1);
  });

  nextBtn.addEventListener('click', () => {
    updateCarousel(currentIndex + 1);
  });

  // Dot clicks
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      updateCarousel(parseInt(dot.dataset.index, 10));
    });
  });

  // Keyboard navigation
  grid.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      updateCarousel(currentIndex - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      updateCarousel(currentIndex + 1);
    }
  });

  // Re-evaluate on resize (e.g., rotate phone)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      updateCarousel(currentIndex);
    }, 200);
  });

  // Initialise — show only active on mobile
  updateCarousel(currentIndex);
})();
