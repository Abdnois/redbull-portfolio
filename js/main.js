/* ============================================================
   main.js — home page interactions
   (scroll intro, header, ingredient stack, modal, reveals,
    product rendering)
   ============================================================ */
(function () {
  'use strict';

  /* ---------- PRODUCT DATA (edit here, not in HTML) ---------- */
  const CDN = 'https://www.redbull.com/energydrink/v1/resources/storyblok/images/f/287059/528x1348/';
  const PRODUCTS = [
    { id:'energy',    name:'Red Bull Energy Drink', price:'2.99', label:'Energy Drink',
      img: CDN + '53e078bcb9/gb_ed_250ml_energy-drink_country_rgb__cold_closed_front_com_full.png/m/686x0' },
    { id:'sugarfree', name:'Red Bull Sugarfree',    price:'2.99', label:'Sugarfree',
      img: CDN + '4b21f6a617/gb_sf_250ml_sugarfree_country_rgb__cold_closed_front_com_full.png/m/310x0' },
    { id:'zero',      name:'Red Bull Zero',         price:'2.99', label:'Zero',
      img: 'https://www.redbull.com/energydrink/v1/resources/storyblok/images/f/287059/528x1348/e4d03d54d0/int_zr_250ml_energy-drink_country__cold_closed_front_com_full.png/m/310x0' }
  ];

  const row = document.getElementById('productsRow');
  if (row) {
    row.innerHTML = PRODUCTS.map((p, i) => `
      <div class="product reveal d-${i + 1}">
        <div class="product-visual">
          <span class="dot" aria-hidden="true"></span>
          <div class="dot-card" aria-hidden="true">
            <span class="dot-card-thumb"><img src="${p.img}" alt="" referrerpolicy="no-referrer"></span>
            <span class="dot-card-info"><strong>${p.label}</strong><em>$${p.price}</em></span>
          </div>
          <img class="product-img" src="${p.img}" alt="${p.name}"
               onerror="this.onerror=null;this.src='redbull-can.png'" referrerpolicy="no-referrer">
        </div>
        <h3>${p.name.replace('Red Bull ', 'Red Bull<br>')}</h3>
        <button class="btn-add" data-id="${p.id}" data-name="${p.name}"
                data-price="${p.price}" data-img="${p.img}">Add to cart</button>
      </div>`).join('');
  }

  /* ---------- REVEALS ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .18, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal, .visual-reveal').forEach(el => io.observe(el));

  /* ---------- FLOATING HEADER ---------- */
  const siteHeader = document.getElementById('siteHeader');
  const productsSection = document.getElementById('products');
  function updateHeader() {
    if (!siteHeader || !productsSection) return;
    const r = productsSection.getBoundingClientRect();
    const nearProducts = r.top < window.innerHeight * 0.7;
    const hasItems = typeof RBCart !== 'undefined' && RBCart.qty() > 0;
    siteHeader.classList.toggle('show', nearProducts || hasItems);
  }
  window.RBUpdateHeader = updateHeader;

  /* ---------- SHARED MATH ---------- */
  const clamp01 = v => Math.min(Math.max(v, 0), 1);
  const smooth  = t => t * t * (3 - 2 * t);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const mqDesktop = window.matchMedia('(min-width: 921px)');
  const reduced   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function sample(kf, p) {
    if (p <= kf[0][0]) return kf[0][1];
    const last = kf[kf.length - 1];
    if (p >= last[0]) return last[1];
    for (let i = 0; i < kf.length - 1; i++) {
      const a = kf[i], b = kf[i + 1];
      if (p >= a[0] && p <= b[0]) {
        const t = (p - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * smooth(t);
      }
    }
    return last[1];
  }

  /* ---------- PINNED INTRO ---------- */
  const introTrack = document.getElementById('home');
  const introCan   = document.getElementById('introCan');
  const aIn = document.getElementById('aIn');
  const bIn = document.getElementById('bIn');
  const cIn = document.getElementById('cIn');

  function introProgress() {
    const denom = introTrack.offsetHeight - window.innerHeight;
    return denom <= 0 ? 0 : clamp01(-introTrack.getBoundingClientRect().top / denom);
  }
  function fade(el, o, slide) {
    if (!el) return;
    el.style.opacity = o.toFixed(3);
    if (slide) el.style.transform = 'translateY(' + ((1 - o) * 14).toFixed(2) + 'px)';
  }
  const KF = {
    canX: [[0,34],[.1,34],[.3,44],[.5,58],[.62,66],[1,66]],
    canS: [[0,1],[.1,1],[.3,.66],[1,.66]],
    aO:   [[0,1],[.2,1],[.38,0],[1,0]],
    bO:   [[0,0],[.18,0],[.3,1],[.58,1],[.68,0],[1,0]],
    cO:   [[0,0],[.62,0],[.76,1],[1,1]]
  };
  function drawIntro(p) {
    introCan.style.setProperty('--cx', sample(KF.canX, p).toFixed(2) + 'vw');
    introCan.style.setProperty('--cs', sample(KF.canS, p).toFixed(4));
    fade(aIn, sample(KF.aO, p), false);
    fade(bIn, sample(KF.bO, p), true);
    fade(cIn, sample(KF.cO, p), true);
  }

  /* ---------- INGREDIENT STACKING ---------- */
  const ingSection = document.getElementById('ingredients');
  const ingCards = ingSection ? [...ingSection.querySelectorAll('.ing-card')] : [];
  const tabPopEl = document.getElementById('tabPop');
  const PEEK = 12, RISE = 120;

  function updateIngCards() {
    if (!mqDesktop.matches) {
      ingCards.forEach(c => { c.style.opacity = ''; c.style.transform = ''; });
      return;
    }
    const rect = ingSection.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    if (scrollable <= 0) return;
    const progress = clamp01(-rect.top / scrollable);

    const te = easeOut(clamp01(progress / 0.04));
    tabPopEl.style.opacity = String(Math.min(1, te * 1.6));
    tabPopEl.style.transform = 'translate(-50%,' + (12 - te * 92).toFixed(1) + '%)';

    const n = ingCards.length, first = 0.14, span = 0.86 / n;
    const eases = ingCards.map((_, i) => easeOut(clamp01((progress - (first + i * span)) / span)));
    ingCards.forEach((card, i) => {
      const e = eases[i];
      let older = 0;
      for (let j = i + 1; j < n; j++) older += eases[j];
      card.style.opacity = e <= 0 ? '0' : String(Math.min(1, e * 1.8));
      card.style.transform = 'translateY(' + ((1 - e) * RISE - older * PEEK).toFixed(1) + 'px)';
      card.style.zIndex = i + 1;
    });
  }

  /* ---------- MAIN LOOP ---------- */
  if (!reduced && introTrack) {
    let target = introProgress(), cur = target, lastIntro = -1;
    let needsCards = true, needsHeader = true;
    window.addEventListener('scroll', () => { target = introProgress(); needsCards = true; needsHeader = true; }, { passive: true });
    window.addEventListener('resize', () => { target = introProgress(); needsCards = true; needsHeader = true; });
    (function loop() {
      const d = target - cur;
      if (Math.abs(d) < 0.0004) cur = target; else cur += d * 0.12;
      if (cur !== lastIntro) { drawIntro(cur); lastIntro = cur; }
      if (needsCards) { updateIngCards(); needsCards = false; }
      if (needsHeader) { updateHeader(); needsHeader = false; }
      requestAnimationFrame(loop);
    })();
  } else {
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  /* ---------- MODAL ---------- */
  const backdrop = document.getElementById('modalBackdrop');
  const openBtn = document.getElementById('openModal');
  const closeBtn = document.getElementById('closeModal');
  if (backdrop && openBtn) {
    openBtn.addEventListener('click', () => backdrop.classList.add('open'));
    closeBtn.addEventListener('click', () => backdrop.classList.remove('open'));
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') backdrop.classList.remove('open'); });
  }

  /* ---------- ADD-TO-CART BUTTONS (delegated) ---------- */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-add');
    if (!btn) return;
    RBCart.add(btn.dataset.id, btn.dataset.name, btn.dataset.price, btn.dataset.img);
    const original = btn.textContent;
    btn.classList.add('added');
    btn.textContent = 'Added ✓';
    setTimeout(() => { btn.classList.remove('added'); btn.textContent = original; }, 1200);
  });
})();