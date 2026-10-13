/* La Société — interactions + Motion (motion.dev) animations.
   Core features work without Motion; animations are layered on top. */

const MOTION_URL = 'https://cdn.jsdelivr.net/npm/motion@12.43.0/+esm';
const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

/* ---------------------------------------------------------------- core --- */

// Header background once scrolled
const header = $('[data-header]');
const onScroll = () => header.classList.toggle('solid', window.scrollY > 40);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Mobile menu
const burger = $('.burger');
const menu = $('#mobile-menu');
const setMenu = (open) => {
  burger.setAttribute('aria-expanded', String(open));
  burger.querySelector('.sr').textContent = open ? 'Fermer le menu' : 'Ouvrir le menu';
  menu.hidden = !open;
  document.body.classList.toggle('menu-open', open);
  $$('main, footer, .action-bar').forEach((el) => { el.inert = open; });
  if (open) {
    menu.querySelector('a').focus();
    menuOpened();
  }
};
let menuOpened = () => {};
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); }
});

// Opening hours (Quebec time). Thursday-Saturday close after midnight.
const HOURS = { 0: ['11:00', '22:00'], 1: ['11:00', '22:00'], 2: ['11:00', '22:00'], 3: ['11:00', '23:00'], 4: ['11:00', '01:00'], 5: ['11:00', '01:00'], 6: ['11:00', '01:00'] };
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmt = (t) => { const [h, m] = t.split(':').map(Number); return h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : ''); };
function nowInQuebec() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Toronto', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')), mins: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
}
try {
  const now = nowInQuebec();
  const prev = (now.day + 6) % 7;
  const [po, pc] = HOURS[prev];
  let state;
  let businessDay = now.day;
  if (toMin(pc) < toMin(po) && now.mins < toMin(pc)) {
    state = { open: true, text: 'Ouvert · ferme à ' + fmt(pc) };
    businessDay = prev;
  } else {
    const [o, c] = HOURS[now.day];
    let close = toMin(c);
    if (close <= toMin(o)) close += 1440;
    if (now.mins >= toMin(o) && now.mins < close) state = { open: true, text: 'Ouvert · ferme à ' + fmt(c) };
    else if (now.mins < toMin(o)) state = { open: false, text: 'Fermé · ouvre aujourd’hui à ' + fmt(o) };
    else state = { open: false, text: 'Fermé · ouvre demain à ' + fmt(HOURS[(now.day + 1) % 7][0]) };
  }
  $$('[data-status]').forEach((el) => {
    el.classList.add(state.open ? 'open' : 'closed');
    el.querySelector('.status-text').textContent = state.text;
  });
  $$('.hours tr[data-day="' + businessDay + '"]').forEach((tr) => { tr.classList.add('today'); tr.setAttribute('aria-current', 'date'); });
} catch (e) { /* keep the static text */ }

// Map loads only on request
$$('[data-map]').forEach((btn) => btn.addEventListener('click', () => {
  const frame = document.createElement('iframe');
  frame.src = btn.dataset.map;
  frame.title = 'Carte : La Société, 11640 1re Avenue, Saint-Georges';
  frame.loading = 'lazy';
  btn.closest('.map').appendChild(frame);
}));

/* -------------------------------------------------------------- motion --- */

const EASE = [0.22, 1, 0.36, 1];

function splitWords(el) {
  const wrap = (text) => text.split(/(\s+)/).map((part) => {
    if (!part.trim()) return document.createTextNode(part);
    const span = document.createElement('span');
    span.className = 'word';
    span.textContent = part;
    return span;
  });
  Array.from(el.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) node.replaceWith(...wrap(node.textContent));
    else if (node.nodeType === Node.ELEMENT_NODE) splitWords(node);
  });
}
const asEl = (a) => (a instanceof Element ? a : (a && (a.target || a.currentTarget)));

function initMotion({ animate, scroll, inView, stagger, hover, press }) {
  window.__motionReady = true;
  if (reduceMotion) return; // CSS already shows everything, no movement
  const entrance = !root.classList.contains('no-motion'); // Motion arrived late: skip entrance effects

  const hero = $('.hero');

  // Hero entrance: words spring up one by one
  if (entrance) {
    const title = $('[data-split]');
    splitWords(title);
    title.style.opacity = 1;
    animate($$('.word', title), { opacity: [0, 1], y: [48, 0], rotate: [4, 0] }, { delay: stagger(0.06, { startDelay: 0.15 }), type: 'spring', bounce: 0.32, duration: 0.95 });
    animate('[data-hero]', { opacity: [0, 1], y: [26, 0] }, { delay: stagger(0.12, { startDelay: 0.5 }), duration: 0.85, ease: EASE });
    animate('.hero-media img', { scale: [1.16, 1.04] }, { duration: 2.4, ease: EASE });
  }

  // Hero parallax and fade while scrolling past it
  scroll(animate('.hero-media', { y: ['0%', '16%'] }, { ease: 'linear' }), { target: hero, offset: ['start start', 'end start'] });
  scroll(animate('.hero-content', { opacity: [1, 0.15], y: [0, -70] }, { ease: 'linear' }), { target: hero, offset: ['start start', 'end start'] });

  // Rising beer bubbles (paused when the hero is off screen)
  const bubbleBox = $('.bubbles');
  const count = window.innerWidth < 700 ? 12 : 22;
  const rand = (a, b) => a + Math.random() * (b - a);
  const bubbleAnims = [];
  for (let i = 0; i < count; i++) {
    const b = document.createElement('span');
    const size = rand(4, 15);
    b.className = 'bubble';
    b.style.cssText = `width:${size}px;height:${size}px;left:${rand(2, 98)}%;`;
    bubbleBox.appendChild(b);
    bubbleAnims.push(animate(b, { y: [0, -(hero.offsetHeight + 60)], x: [0, rand(-36, 36)], opacity: [0, 0.9, 0.9, 0] }, { duration: rand(7, 15), delay: rand(0, 9), repeat: Infinity, ease: 'linear' }));
  }
  inView(hero, () => { bubbleAnims.forEach((a) => a.play()); return () => bubbleAnims.forEach((a) => a.pause()); });

  // Scroll progress bar
  scroll(animate('.progress', { scaleX: [0, 1] }, { ease: 'linear' }));

  // Header slides away when scrolling down, returns when scrolling up
  let lastY = window.scrollY;
  let hidden = false;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const goingDown = y > lastY + 6;
    const goingUp = y < lastY - 6;
    if (goingDown && y > 500 && !hidden && menu.hidden) { hidden = true; animate(header, { y: '-100%' }, { duration: 0.35, ease: EASE }); }
    else if ((goingUp || y < 200) && hidden) { hidden = false; animate(header, { y: '0%' }, { type: 'spring', stiffness: 380, damping: 32 }); }
    if (goingDown || goingUp) lastY = y;
  }, { passive: true });

  // Marquee: endless, slows down on hover
  const marquee = animate('.marquee-track', { x: ['0%', '-50%'] }, { duration: 32, repeat: Infinity, ease: 'linear' });
  hover('.marquee', () => { marquee.speed = 0.25; return () => { marquee.speed = 1; }; });

  // Section reveals
  if (entrance) {
    inView('[data-reveal]', (a) => {
      animate(asEl(a), { opacity: [0, 1], y: [44, 0] }, { duration: 0.95, ease: EASE });
    }, { margin: '0px 0px -12% 0px' });
    inView('[data-stagger]', (a) => {
      animate(Array.from(asEl(a).children), { opacity: [0, 1], y: [46, 0], scale: [0.97, 1] }, { delay: stagger(0.09), type: 'spring', bounce: 0.25, duration: 0.85 });
    }, { margin: '0px 0px -10% 0px' });
  }

  // Images drift at different speeds
  $$('[data-parallax]').forEach((el) => {
    const amount = Number(el.dataset.parallax) * 4;
    scroll(animate(el, { y: [-amount, amount] }, { ease: 'linear' }), { target: el, offset: ['start end', 'end start'] });
  });

  // Rotating stamp
  animate('.stamp', { rotate: [0, 360] }, { duration: 26, repeat: Infinity, ease: 'linear' });

  // Giant outlined text drifts sideways in the beer section
  scroll(animate('[data-drift]', { x: ['8%', '-32%'] }, { ease: 'linear' }), { target: $('#bieres'), offset: ['start end', 'end start'] });

  // Pints fill up when they come into view
  $$('.glass i').forEach((liquid) => { liquid.style.transform = 'scaleY(0)'; });
  inView('.glasses', () => {
    animate('.glass i', { scaleY: [0, 1] }, { delay: stagger(0.18), duration: 1.3, ease: [0.65, 0, 0.35, 1] });
  }, { amount: 0.6 });

  // Count-up numbers (rating, number of reviews)
  inView('[data-count]', (a) => {
    const el = asEl(a);
    const to = Number(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    animate(0, to, {
      duration: 1.6, ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { el.textContent = decimals ? v.toFixed(decimals).replace('.', ',') : Math.round(v).toLocaleString('fr-CA'); },
    });
  });

  // Dish cards lift on hover, photo zooms
  if (finePointer) {
    hover('.dish', (a) => {
      const el = asEl(a);
      const img = el.querySelector('img');
      animate(el, { y: -10 }, { type: 'spring', stiffness: 320, damping: 22 });
      animate(img, { scale: 1.08 }, { duration: 0.8, ease: EASE });
      return () => {
        animate(el, { y: 0 }, { type: 'spring', stiffness: 320, damping: 22 });
        animate(img, { scale: 1 }, { duration: 0.8, ease: EASE });
      };
    });

    // Magnetic primary buttons
    $$('.btn-amber').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        animate(btn, { x: (e.clientX - r.left - r.width / 2) * 0.18, y: (e.clientY - r.top - r.height / 2) * 0.28 }, { type: 'spring', stiffness: 300, damping: 18 });
      });
      btn.addEventListener('pointerleave', () => animate(btn, { x: 0, y: 0 }, { type: 'spring', stiffness: 300, damping: 18 }));
    });
  }

  // Buttons squish when pressed
  press('.btn, .action-bar a', (a) => {
    const el = asEl(a);
    animate(el, { scale: 0.94 }, { type: 'spring', stiffness: 700, damping: 30 });
    return () => animate(el, { scale: 1 }, { type: 'spring', stiffness: 500, damping: 18 });
  });

  // Mobile menu links slide in
  menuOpened = () => {
    animate($$('.mobile-menu nav a'), { opacity: [0, 1], x: [-40, 0] }, { delay: stagger(0.05), duration: 0.5, ease: EASE });
    animate('.mobile-menu-cta', { opacity: [0, 1], y: [20, 0] }, { delay: 0.25, duration: 0.5, ease: EASE });
  };
}

import(MOTION_URL)
  .then(initMotion)
  .catch(() => root.classList.add('no-motion'));
