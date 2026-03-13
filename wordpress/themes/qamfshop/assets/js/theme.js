/**
 * QAMFSHOP Theme JavaScript
 *
 * Handles: mobile nav toggle, toast notifications,
 * WooCommerce AJAX cart count updates.
 */

(function() {
  'use strict';

  // ─── Mobile Hamburger Toggle ──────────────────────────────────────────────
  const hamburger = document.getElementById('hamburger-btn');
  if (hamburger) {
    hamburger.addEventListener('click', function() {
      document.querySelector('.header-nav').classList.toggle('mobile-open');
    });
  }

  // ─── Toast Notifications ──────────────────────────────────────────────────
  window.showToast = function(message, type) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast ' + (type || '') + ' show';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() {
      toast.classList.remove('show');
    }, 3500);
  };

  // ─── WooCommerce: Update cart count after AJAX add-to-cart ────────────────
  if (typeof jQuery !== 'undefined') {
    jQuery(document.body).on('added_to_cart', function(e, fragments) {
      // WooCommerce returns fragments — update cart count if available
      if (fragments && fragments['.cart-count']) {
        var countEl = document.querySelector('.cart-count');
        if (countEl) {
          countEl.outerHTML = fragments['.cart-count'];
        }
      }
      showToast('Added to cart!', 'success');
    });

    jQuery(document.body).on('removed_from_cart', function() {
      showToast('Item removed', '');
    });
  }

  // ─── Fade-in animations on scroll ────────────────────────────────────────
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-up');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.perk, .mk-feature, .mk-plan').forEach(function(el) {
    observer.observe(el);
  });

})();
