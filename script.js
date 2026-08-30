(() => {
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];

  // Sticky header state
  const header = qs('.site-header');
  const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  // Mobile navigation
  const toggle = qs('.menu-toggle');
  const nav = qs('.site-nav');
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  qsa('.site-nav a, .nav-book').forEach(el => el.addEventListener('click', () => {
    nav?.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded','false');
  }));

  // Reveal-on-scroll
  const revealNodes = qsa('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:0.14});
    revealNodes.forEach(node => observer.observe(node));
  } else {
    revealNodes.forEach(node => node.classList.add('in-view'));
  }

  // Menu filters
  qsa('.tab').forEach(tab => tab.addEventListener('click', () => {
    qsa('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const category = tab.dataset.category;
    qsa('.dish-card').forEach(card => {
      card.classList.toggle('is-hidden', category !== 'all' && card.dataset.category !== category);
    });
  }));

  // Modal helpers
  const openModal = id => {
    const modal = qs(id);
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
    const firstInput = qs('input, select, button.modal-close', modal);
    firstInput?.focus();
  };
  const closeModal = modal => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
    if (!qsa('.modal.is-open').length) document.body.classList.remove('modal-open');
  };
  qsa('[data-open-booking]').forEach(btn => btn.addEventListener('click', () => openModal('#booking-modal')));
  qsa('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.closest('.modal'))));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') qsa('.modal.is-open').forEach(closeModal);
  });

  // Booking form => mailto (static-host friendly)
  const dateInput = qs('input[name="date"]', qs('#booking-modal'));
  if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10);
  const bookingForm = qs('#booking-form');
  const success = qs('.form-success');
  bookingForm?.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(bookingForm);
    const name = String(data.get('name') || '').trim();
    const date = String(data.get('date') || '').trim();
    const time = String(data.get('time') || '').trim();
    const guests = String(data.get('guests') || '').trim();
    const subject = encodeURIComponent(`Бронь столика MORNINGO — ${name}`);
    const body = encodeURIComponent(`Здравствуйте!\n\nХочу забронировать столик в MORNINGO Café.\nИмя: ${name}\nДата: ${date}\nВремя: ${time}\nГости: ${guests}\n\nСпасибо!`);
    window.location.href = `mailto:hello@morningo.cafe?subject=${subject}&body=${body}`;
    bookingForm.hidden = true;
    success.hidden = false;
  });

  // Small cart, stored locally
  let cart = [];
  try {
    const stored = JSON.parse(localStorage.getItem('morningo_cart') || '[]');
    cart = Array.isArray(stored) ? stored.filter(item => item && item.name && Number.isFinite(Number(item.price)) && Number(item.qty) > 0) : [];
    cart = cart.map(item => ({name:String(item.name), price:Number(item.price), qty:Number(item.qty)}));
  } catch {
    cart = [];
  }
  const orderBar = qs('.order-bar');
  const toast = qs('.toast');
  let toastTimer;

  const cartSummary = () => {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    qs('.order-count').textContent = count;
    qsa('.order-total').forEach(el => el.textContent = `${total.toLocaleString('ru-RU')} ₽`);
    qsa('.order-total-large').forEach(el => el.textContent = `${total.toLocaleString('ru-RU')} ₽`);
    orderBar?.classList.toggle('visible', count > 0);
    return {count,total};
  };
  const persist = () => localStorage.setItem('morningo_cart', JSON.stringify(cart));

  const showToast = text => {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1400);
  };

  qsa('[data-add]').forEach(btn => btn.addEventListener('click', () => {
    const card = btn.closest('.dish-card');
    const name = card.dataset.name;
    const price = Number(card.dataset.price);
    const found = cart.find(item => item.name === name);
    if (found) found.qty += 1; else cart.push({name,price,qty:1});
    persist();
    cartSummary();
    showToast(`${name} добавлен`);
  }));

  const renderOrder = () => {
    const list = qs('#order-list');
    const {count} = cartSummary();
    if (!list) return;
    if (!count) {
      list.innerHTML = '<div class="order-empty">Заказ пока пуст. Добавьте блюда из меню.</div>';
      return;
    }
    list.innerHTML = cart.map((item, index) => `
      <div class="order-row">
        <div><strong>${item.name}</strong><span>${item.price.toLocaleString('ru-RU')} ₽ × ${item.qty}</span></div>
        <strong>${(item.price * item.qty).toLocaleString('ru-RU')} ₽</strong>
        <button type="button" data-remove-index="${index}" aria-label="Удалить ${item.name}">×</button>
      </div>`).join('');
    qsa('[data-remove-index]', list).forEach(btn => btn.addEventListener('click', () => {
      cart.splice(Number(btn.dataset.removeIndex), 1);
      persist();
      renderOrder();
      showToast('Позиция удалена');
    }));
  };
  qs('[data-open-order]')?.addEventListener('click', () => { renderOrder(); openModal('#order-modal'); });
  qs('[data-clear-order]')?.addEventListener('click', () => { cart.length = 0; persist(); renderOrder(); showToast('Заказ очищен'); });
  qs('[data-order-mail]')?.addEventListener('click', () => {
    if (!cart.length) { showToast('Добавьте что-нибудь в заказ'); return; }
    const total = cart.reduce((sum,item) => sum + item.price * item.qty, 0);
    const lines = cart.map(item => `${item.name} — ${item.qty} × ${item.price} ₽`).join('\n');
    const subject = encodeURIComponent('Заказ из MORNINGO Café');
    const body = encodeURIComponent(`Здравствуйте!\n\nХочу оформить заказ:\n${lines}\n\nИтого: ${total} ₽\n\nСпасибо!`);
    window.location.href = `mailto:hello@morningo.cafe?subject=${subject}&body=${body}`;
  });
  cartSummary();
})();
