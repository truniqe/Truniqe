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
  // 3. TEAM SLIDER — consistent scroll-snap and Akash-centered layout
  // ==========================================================

  const viewport = document.getElementById('team-viewport');
  const track = document.querySelector('.team-track');
  const prevBtn = document.getElementById('team-carousel-prev');
  const nextBtn = document.getElementById('team-carousel-next');
  const cards = track ? Array.from(track.querySelectorAll('.team-card')) : [];
  const desktopBreakpoint = 1100;
  const activeClass = 'team-card--active';
  let currentIndex = 2;
  let cardCenters = [];
  let resizeTimer = null;
  let scrollTick = false;
  let initialized = false;

  const clampIndex = (index) => Math.min(cards.length - 1, Math.max(0, index));

  const updateCardCenters = () => {
    cardCenters = cards.map((card) => card.offsetLeft + card.offsetWidth / 2);
  };

  const setActiveCard = (index) => {
    const activeIndex = clampIndex(index);
    currentIndex = activeIndex;
    cards.forEach((card, i) => {
      card.classList.toggle(activeClass, i === activeIndex);
    });
  };

  const updateButtonState = () => {
    if (!viewport || !prevBtn || !nextBtn) return;
    const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
    prevBtn.disabled = viewport.scrollLeft <= 4;
    nextBtn.disabled = viewport.scrollLeft >= maxScrollLeft - 4;
  };

  const getCenteredIndex = () => {
    if (!viewport || cardCenters.length !== cards.length) return currentIndex;
    const centerLine = viewport.scrollLeft + viewport.clientWidth / 2;
    let nearest = 0;
    let smallestDistance = Infinity;
    cardCenters.forEach((cardCenter, index) => {
      const distance = Math.abs(cardCenter - centerLine);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        nearest = index;
      }
    });
    return nearest;
  };

  const scrollToIndex = (index, instant = false) => {
    if (!viewport) return;
    const targetIndex = clampIndex(index);
    const target = cards[targetIndex];
    if (!target) return;
    const offset = Math.max(0, Math.round(target.offsetLeft + target.offsetWidth / 2 - viewport.clientWidth / 2));
    if (instant) {
      viewport.scrollLeft = offset;
    } else {
      viewport.scrollTo({ left: offset, behavior: 'smooth' });
    }
    setActiveCard(targetIndex);
    updateButtonState();
  };

  const handleScroll = () => {
    if (window.innerWidth >= desktopBreakpoint || scrollTick || !viewport) return;
    scrollTick = true;
    window.requestAnimationFrame(() => {
      const centered = getCenteredIndex();
      if (centered !== currentIndex) {
        setActiveCard(centered);
      }
      updateButtonState();
      scrollTick = false;
    });
  };

  const updateControls = () => {
    const showControls = window.innerWidth < desktopBreakpoint;
    if (prevBtn && nextBtn) {
      prevBtn.style.display = showControls ? 'flex' : 'none';
      nextBtn.style.display = showControls ? 'flex' : 'none';
    }
    if (viewport) {
      viewport.style.overflowX = showControls ? 'auto' : 'hidden';
    }
  };

  const handleResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      updateControls();
      updateCardCenters();
      if (window.innerWidth < desktopBreakpoint) {
        scrollToIndex(currentIndex, true);
      } else {
        setActiveCard(2);
      }
    }, 120);
  };

  const initSlider = () => {
    if (initialized || !viewport || !track || !prevBtn || !nextBtn || !cards.length) return;
    initialized = true;

    updateControls();
    updateCardCenters();
    setActiveCard(2);
    if (window.innerWidth < desktopBreakpoint) {
      scrollToIndex(2, true);
    }

    prevBtn.addEventListener('click', () => scrollToIndex(currentIndex - 1));
    nextBtn.addEventListener('click', () => scrollToIndex(currentIndex + 1));
    viewport.addEventListener('scroll', handleScroll, { passive: true });
    viewport.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollToIndex(currentIndex - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollToIndex(currentIndex + 1);
      }
    });
    window.addEventListener('resize', handleResize);
    updateButtonState();
  };

  if (document.readyState === 'loading') {
    window.addEventListener('load', initSlider, { once: true });
  } else {
    initSlider();
  }
})();
