const toggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() { toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open navigation'); navigation.classList.remove('is-open'); }
toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); navigation.classList.toggle('is-open', open); });
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { closeMenu(); toggle.focus(); } });
document.querySelector('#year').textContent = new Date().getFullYear();
navigation.querySelectorAll('a').forEach((link, index) => link.style.setProperty('--nav-order', index));
window.matchMedia('(min-width: 851px)').addEventListener('change', closeMenu);

const enquiryForm = document.querySelector('#enquiry-form');
enquiryForm?.addEventListener('submit', event => {
  event.preventDefault();
  if (!enquiryForm.reportValidity()) return;
  const data = new FormData(enquiryForm);
  const name = String(data.get('name')).trim();
  const message = String(data.get('message')).trim();
  if (!name || message.length < 10) { document.querySelector('#form-status').textContent = 'Please add your name and at least 10 characters about your project.'; return; }
  const subject = 'Axis project enquiry — ' + data.get('subject');
  const body = 'Name: ' + name + '\nEmail: ' + data.get('email') + '\nService: ' + data.get('subject') + '\n\n' + message;
  const mailto = 'mailto:info@axiswelldelivery.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  const fallback = document.querySelector('#email-fallback');
  fallback.href = mailto;
  fallback.hidden = false;
  document.querySelector('#form-status').textContent = 'Your draft is ready. Complete sending in your email app. If it did not open, use the link below or email info@axiswelldelivery.com.';
  window.location.href = mailto;
});

// Progressive enhancement: content is visible before, after, and without motion.
function initializeMotion() {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;

  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const shortTravel = window.matchMedia('(pointer: coarse)').matches ? 14 : 26;
  const active = new Map();
  const counters = new Map();
  const records = new Map();
  let stopped = false;

  function play(element, frames, options = {}) {
    if (stopped || element.matches(':focus-within')) return;
    const animation = element.animate(frames, { duration: 760, easing: ease, fill: 'backwards', ...options });
    active.set(element, animation);
    const remove = () => { if (active.get(element) === animation) active.delete(element); };
    animation.finished.then(remove, remove);
  }

  function countUp(element) {
    const number = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE && /^\s*\d+\s*$/.test(node.textContent));
    if (!number) return;
    const final = number.textContent;
    const target = Number(final.trim());
    const label = element.textContent.trim();
    const visual = document.createElement('span');
    visual.className = 'stat-number';
    visual.setAttribute('aria-hidden', 'true');
    visual.textContent = final;
    element.setAttribute('aria-label', label);
    element.querySelectorAll('span').forEach(span => span.setAttribute('aria-hidden', 'true'));
    number.replaceWith(visual);
    const state = { visual, final, frame: 0 };
    counters.set(element, state);
    let began;
    function tick(now) {
      if (stopped) return;
      began ??= now;
      const progress = Math.min((now - began) / 1150, 1);
      visual.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) state.frame = requestAnimationFrame(tick);
      else { visual.textContent = final; counters.delete(element); }
    }
    state.frame = requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const element = entry.target;
      observer.unobserve(element);
      const { type, delay } = records.get(element);
      element.dataset.motionSeen = 'true';
      if (stopped) continue;
      if (type === 'counter') { countUp(element); continue; }
      if (type === 'photo') {
        play(element, [
          { clipPath: 'inset(0 100% 0 0)', opacity: .45 },
          { clipPath: 'inset(0 0% 0 0)', opacity: 1 }
        ], { duration: 1000, delay });
      } else {
        play(element, [
          { opacity: 0, transform: `translate3d(0, ${shortTravel}px, 0)` },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' }
        ], { duration: type === 'card' ? 850 : 720, delay });
      }
    }
  }, { threshold: .06, rootMargin: '0px 0px 20px 0px' });

  function observe(selector, type = 'rise', stagger = 0) {
    document.querySelectorAll(selector).forEach(element => {
      if (records.has(element)) return;
      const siblings = [...element.parentElement.children].filter(sibling => sibling.matches(selector));
      const delay = Math.min(siblings.indexOf(element), 3) * stagger;
      records.set(element, { type, delay });
      observer.observe(element);
    });
  }

  observe('.about-image > img, .home-experience > .container > img, .commitment-image > img', 'photo');
  observe('.about-copy, .section-heading, .home-experience > .container > div, .commitment-copy, .leadership-grid > div:first-child, .contact-information, .enquiry-form, .detail-article, .detail-sidebar, .cta-band > .container');
  observe('.service-grid > .service-card, .project-grid > .project-card', 'card', 110);
  observe('.process-grid > article', 'rise', 110);
  observe('.leader-list > details, .project-list > a', 'rise', 65);
  observe('.stats strong', 'counter');

  // Never make a keyboard user wait for a focused control to become visible.
  document.addEventListener('focusin', event => {
    for (const [element, animation] of active) {
      if (element.contains(event.target)) animation.cancel();
    }
  });
  function finishMotion() {
    stopped = true;
    observer.disconnect();
    for (const animation of active.values()) animation.cancel();
    active.clear();
    for (const { visual, final, frame } of counters.values()) {
      cancelAnimationFrame(frame);
      visual.textContent = final;
    }
    counters.clear();
  }
  preference.addEventListener('change', event => { if (event.matches) finishMotion(); });
  window.addEventListener('beforeprint', finishMotion);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      for (const animation of active.values()) animation.finish();
      for (const { visual, final, frame } of counters.values()) {
        cancelAnimationFrame(frame);
        visual.textContent = final;
      }
      counters.clear();
    }
  });
}
initializeMotion();
