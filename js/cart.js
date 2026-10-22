/* ============================================================
   cart.js — shared cart logic (index.html + checkout.html)
   Exposes window.RBCart
   ============================================================ */
window.RBCart = (function () {
  'use strict';

  const STORE_KEY = 'rb_cart_v1';
  let cart = load();

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch (e) { return []; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch (e) {}
  }
  function money(n) { return '$' + n.toFixed(2); }
  function qty() { return cart.reduce((s, i) => s + i.qty, 0); }
  function sum() { return cart.reduce((s, i) => s + i.qty * i.price, 0); }

  function add(id, name, price, img) {
    const found = cart.find(i => i.id === id);
    if (found) found.qty += 1;
    else cart.push({ id, name, price: Number(price), img, qty: 1 });
    save(); renderAll();
  }
  function inc(id) { const i = cart.find(x => x.id === id); if (i) { i.qty += 1; save(); renderAll(); } }
  function dec(id) { const i = cart.find(x => x.id === id); if (!i) return; i.qty -= 1; if (i.qty <= 0) cart = cart.filter(x => x !== i); save(); renderAll(); }
  function remove(id) { cart = cart.filter(x => x.id !== id); save(); renderAll(); }
  function clear() { cart = []; save(); renderAll(); }

  /* ---------- rendering (only touches elements that exist) ---------- */
  function renderBadge() {
    const el = document.getElementById('cartCount');
    if (el) {
      if (qty() > 0) { el.style.display = 'grid'; el.textContent = qty(); }
      else el.style.display = 'none';
    }
    if (window.RBUpdateHeader) window.RBUpdateHeader();
  }

  function renderDrawer() {
    const itemsEl = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const headEl  = document.getElementById('cartHeadCount');
    const checkEl = document.getElementById('cartCheckout');
    if (!itemsEl) return;

    if (headEl) headEl.textContent = '(' + qty() + ')';
    if (totalEl) totalEl.textContent = money(sum());
    if (checkEl) checkEl.disabled = qty() === 0;

    if (cart.length === 0) {
      itemsEl.innerHTML = '<div class="cart-empty"><strong>Your cart is empty</strong>Add a can or two to get started.</div>';
      return;
    }
    itemsEl.innerHTML = cart.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <span class="cart-thumb"><img src="${item.img}" alt="" referrerpolicy="no-referrer"></span>
        <div class="cart-info">
          <h4>${item.name}</h4>
          <div class="price">${money(item.price)} each</div>
          <div class="cart-row">
            <span class="qty">
              <button data-act="dec" aria-label="Decrease">−</button>
              <span>${item.qty}</span>
              <button data-act="inc" aria-label="Increase">+</button>
            </span>
            <button class="cart-remove" data-act="remove">Remove</button>
          </div>
        </div>
      </div>`).join('');
  }

  function renderSummary(target) {
    if (!target) return;
    if (cart.length === 0) {
      target.innerHTML = '<p class="sub">Your cart is empty. <a href="index.html" style="color:var(--red);font-weight:700">Go shopping →</a></p>';
      return;
    }
    target.innerHTML = '<ul>' + cart.map(i =>
      `<li><span>${i.name} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></li>`
    ).join('') + `</ul><p style="font-weight:800;margin-top:16px">Total: ${money(sum())}</p>`;
  }

  function renderAll() { renderBadge(); renderDrawer(); }

  /* ---------- drawer open/close ---------- */
  function openCart() {
    const d = document.getElementById('cartDrawer');
    const b = document.getElementById('cartBackdrop');
    if (d) { d.classList.add('open'); d.setAttribute('aria-hidden', 'false'); }
    if (b) b.classList.add('open');
  }
  function closeCart() {
    const d = document.getElementById('cartDrawer');
    const b = document.getElementById('cartBackdrop');
    if (d) { d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); }
    if (b) b.classList.remove('open');
  }

  /* ---------- event wiring ---------- */
  function init() {
    const toggle = document.getElementById('cartToggle');
    const close  = document.getElementById('cartClose');
    const back   = document.getElementById('cartBackdrop');
    const items  = document.getElementById('cartItems');
    const check  = document.getElementById('cartCheckout');

    if (toggle) toggle.addEventListener('click', openCart);
    if (close)  close.addEventListener('click', closeCart);
    if (back)   back.addEventListener('click', closeCart);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

    if (items) {
      items.addEventListener('click', e => {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const id = btn.closest('.cart-item').dataset.id;
        if (btn.dataset.act === 'inc') inc(id);
        else if (btn.dataset.act === 'dec') dec(id);
        else if (btn.dataset.act === 'remove') remove(id);
      });
    }

    if (check) check.addEventListener('click', () => {
      if (qty() === 0) return;
      window.location.href = 'checkout.html';
    });

    renderAll();
  }

  return { init, add, inc, dec, remove, clear, qty, sum, money, renderSummary, renderAll, items: () => cart };
})();

document.addEventListener('DOMContentLoaded', RBCart.init);