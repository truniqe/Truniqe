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

  if (viewport && track && prevBtn && nextBtn && cards.length) {
    let currentIndex = 2;
    const minIndex = 0;
    const maxIndex = cards.length - 1;

    const clampIndex = (index) => Math.min(maxIndex, Math.max(minIndex, index));

    const scrollToCard = (index, instant = false) => {
      const target = cards[clampIndex(index)];
      if (!target) return;
      const offset = Math.max(0, Math.round(target.offsetLeft + target.offsetWidth / 2 - viewport.clientWidth / 2));
      if (instant) {
        viewport.scrollLeft = offset;
      } else {
        viewport.scrollTo({ left: offset, behavior: 'smooth' });
      }
      currentIndex = clampIndex(index);
      updateArrows();
    };

    const updateArrows = () => {
      const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
      prevBtn.disabled = viewport.scrollLeft <= 4;
      nextBtn.disabled = viewport.scrollLeft >= maxScrollLeft - 4;
    };

    const getNearestIndex = () => {
      const centerLine = viewport.scrollLeft + viewport.clientWidth / 2;
      let nearest = 0;
      let smallest = Infinity;
      cards.forEach((card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const distance = Math.abs(cardCenter - centerLine);
        if (distance < smallest) {
          smallest = distance;
          nearest = index;
        }
      });
      return nearest;
    };

    const onScroll = () => {
      currentIndex = getNearestIndex();
      updateArrows();
    };

    prevBtn.addEventListener('click', () => scrollToCard(currentIndex - 1));
    nextBtn.addEventListener('click', () => scrollToCard(currentIndex + 1));

    viewport.addEventListener('scroll', onScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      scrollToCard(currentIndex);
    });
    resizeObserver.observe(viewport);

    const initSlider = () => {
      if (!viewport || !track) return;
      const init = () => {
        scrollToCard(2, true);
        updateArrows();
      };
      requestAnimationFrame(init);
      setTimeout(init, 80);
    };

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', initSlider);
      window.addEventListener('load', initSlider);
    } else {
      initSlider();
    }
  }
})();
