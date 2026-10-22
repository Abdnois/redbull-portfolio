/* ============================================================
   checkout.js — checkout page logic (Bank / bKash / PayPal)
   Uses the shared RBCart module.
   ============================================================ */
(function () {
  'use strict';

  const TAX_RATE = 0.08;
  const SHIPPING = 4.99;
  const FREE_SHIP_OVER = 20;

  /* payment fields required per method (PayPal = redirect, none) */
  const PAY_FIELDS = { bank: ['card', 'exp', 'cvc'], bkash: ['bkash'], paypal: [] };

  const emptyEl   = document.getElementById('checkoutEmpty');
  const mainEl    = document.getElementById('checkoutMain');
  const successEl = document.getElementById('checkoutSuccess');

  /* ---------- order summary ---------- */
  function renderSummary() {
    const items = RBCart.items();
    const box = document.getElementById('summaryItems');
    if (!box) return;

    box.innerHTML = items.map(i => `
      <div class="summary-item">
        <span class="summary-thumb"><img src="${i.img}" alt="" referrerpolicy="no-referrer"></span>
        <span class="summary-item-info">
          <h4>${i.name}</h4>
          <span>Qty ${i.qty}</span>
        </span>
        <span class="summary-item-price">${RBCart.money(i.price * i.qty)}</span>
      </div>`).join('');

    const subtotal = RBCart.sum();
    const shipping = subtotal >= FREE_SHIP_OVER ? 0 : (items.length ? SHIPPING : 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + shipping + tax;

    document.getElementById('sumSubtotal').textContent = RBCart.money(subtotal);
    document.getElementById('sumShipping').textContent = shipping === 0 ? 'Free' : RBCart.money(shipping);
    document.getElementById('sumTax').textContent      = RBCart.money(tax);
    document.getElementById('sumTotal').textContent    = RBCart.money(total);
  }

  function setState() {
    const hasItems = RBCart.qty() > 0;
    emptyEl.hidden = hasItems;
    mainEl.hidden  = !hasItems;
    successEl.hidden = true;
    if (hasItems) renderSummary();
  }

  /* ---------- validation rules ---------- */
  const RULES = {
    email:   v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email.',
    first:   v => v.trim().length > 0 || 'Required.',
    last:    v => v.trim().length > 0 || 'Required.',
    address: v => v.trim().length > 0 || 'Required.',
    city:    v => v.trim().length > 0 || 'Required.',
    zip:     v => /^[A-Za-z0-9\- ]{3,10}$/.test(v.trim()) || 'Enter a valid ZIP/postcode.',
    card:    v => v.replace(/\s/g, '').length >= 15 || 'Enter a valid card number.',
    exp:     v => /^(0[1-9]|1[0-2])\/\d{2}$/.test(v.trim()) || 'Use MM/YY.',
    cvc:     v => /^\d{3,4}$/.test(v.trim()) || '3–4 digits.',
    /* bKash: 11-digit Bangladeshi mobile, e.g. 01XXXXXXXXX */
    bkash:   v => /^01[3-9]\d{8}$/.test(v.replace(/\D/g, '')) || 'Enter a valid bKash number.'
  };

  function validateField(input) {
    const rule = RULES[input.name];
    if (!rule) return true;
    const field = input.closest('.field');
    const errEl = field.querySelector('.field-error');
    const result = rule(input.value);
    if (result === true) {
      field.classList.remove('invalid');
      if (errEl) errEl.textContent = '';
      return true;
    }
    field.classList.add('invalid');
    if (errEl) errEl.textContent = result;
    return false;
  }

  /* ---------- payment method handling ---------- */
  let form;
  function getMethod() {
    const checked = form.querySelector('input[name="payMethod"]:checked');
    return checked ? checked.value : 'bank';
  }

  function clearPayErrors() {
    Object.keys(PAY_FIELDS).forEach(m =>
      PAY_FIELDS[m].forEach(name => {
        const input = form.elements[name];
        if (!input) return;
        const field = input.closest('.field');
        field.classList.remove('invalid');
        const errEl = field.querySelector('.field-error');
        if (errEl) errEl.textContent = '';
      })
    );
  }

  function switchMethod() {
    const method = getMethod();
    form.querySelectorAll('.pay-panel').forEach(p => {
      p.hidden = p.dataset.panel !== method;
    });
    clearPayErrors();
  }

  /* ---------- input formatting ---------- */
  function wireFormatting() {
    const card = form.card, exp = form.exp, cvc = form.cvc, bkash = form.bkash;

    if (card) card.addEventListener('input', () => {
      const v = card.value.replace(/\D/g, '').slice(0, 16);
      card.value = v.replace(/(.{4})/g, '$1 ').trim();
    });
    if (exp) exp.addEventListener('input', () => {
      let v = exp.value.replace(/\D/g, '').slice(0, 4);
      if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
      exp.value = v;
    });
    if (cvc) cvc.addEventListener('input', () => {
      cvc.value = cvc.value.replace(/\D/g, '').slice(0, 4);
    });
    if (bkash) bkash.addEventListener('input', () => {
      bkash.value = bkash.value.replace(/\D/g, '').slice(0, 11);
    });
  }

  /* ---------- submit ---------- */
  function wireSubmit() {
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (RBCart.qty() === 0) { setState(); return; }

      const method = getMethod();
      const required = ['email', 'first', 'last', 'address', 'city', 'zip', ...PAY_FIELDS[method]];

      let firstInvalid = null;
      required.forEach(name => {
        const input = form.elements[name];
        if (!input) return;
        if (!validateField(input) && !firstInvalid) firstInvalid = input;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      /* In a real app: for 'paypal' you'd now redirect to PayPal,
         and for 'bkash' you'd call the bKash gateway. Demo just succeeds. */
      RBCart.clear();
      mainEl.hidden = true;
      emptyEl.hidden = true;
      successEl.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    Object.keys(RULES).forEach(name => {
      const input = form.elements[name];
      if (!input) return;
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.closest('.field').classList.contains('invalid')) validateField(input);
      });
    });

    form.querySelectorAll('input[name="payMethod"]').forEach(r =>
      r.addEventListener('change', switchMethod)
    );

    wireFormatting();
  }

  /* ---------- init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    setState();
    form = document.getElementById('checkoutForm');
    if (form) {
      wireSubmit();
      switchMethod();
    }
  });
})();