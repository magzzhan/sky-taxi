const API = '/api';
const DEMO_USER_ID = 1;
const AUTH_KEY = 'skyTaxiCurrentUser';
function getCurrentUser() { try { return JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null'); } catch { return null; } }
function setCurrentUser(user) { sessionStorage.setItem(AUTH_KEY, JSON.stringify(user)); }
function clearCurrentUser() { sessionStorage.removeItem(AUTH_KEY); }
let deferredInstallPrompt = null;

function currentPath() {
  return location.pathname === '/' ? '/index.html' : location.pathname;
}
function headerTemplate() {
  const path = currentPath();
  const active = (page) => path.includes(page) ? 'active' : '';
  return `
  <header class="site-header">
    <div class="container nav-wrap">
      <a class="brand" href="/index.html">Sky Taxi</a>
      <button class="nav-toggle" id="navToggle" type="button">☰</button>
      <nav class="nav" id="mainNav">
        <a class="${path === '/index.html' ? 'active' : ''}" href="/index.html">Басты бет</a>
        <a class="${active('services') || active('service-detail') ? 'active' : ''}" href="/services.html">Қызметтер</a>
        <a class="${active('map') ? 'active' : ''}" href="/map.html">Карта</a>
        <a class="${active('fleet') ? 'active' : ''}" href="/fleet.html">Флот</a>
        <a class="${active('pricing') ? 'active' : ''}" href="/pricing.html">Тарифтер</a>
        <a class="${active('booking') ? 'active' : ''}" href="/booking.html">Брондау</a>
        <a class="${active('cabinet') ? 'active' : ''}" href="/cabinet.html">Кабинет</a>
        <a class="${active('admin') ? 'active' : ''}" href="/admin.html">Админ</a>
        <a class="${active('contact') ? 'active' : ''}" href="/contact.html">Байланыс</a>
      </nav>
    </div>
  </header>`;
}
function footerTemplate() {
  return `
  <footer class="site-footer">
    <div class="container footer-grid">
      <div>
        <h3>Sky Taxi</h3>
        <p>Full stack сервис: клиенттік сайт, карта, ұшу флоты, Kaspi QR предоплата, жеке кабинет және мобильді PWA режимі.</p>
      </div>
      <div>
        <h4>Тез өту</h4>
        <a href="/map.html">Карта</a>
        <a href="/fleet.html">Флот</a>
        <a href="/cabinet.html">Жеке кабинет</a>
      </div>
      <div>
        <h4>Байланыс</h4>
        <a href="https://wa.me/77475480688" target="_blank" rel="noopener">WhatsApp</a>
        <a href="mailto:makomngoi@gmail.com">makomngoi@gmail.com</a>
      </div>
    </div>
  </footer>
  <nav class="mobile-bottom-nav">
    <a class="${location.pathname.includes('index') || location.pathname === '/' ? 'active' : ''}" href="/index.html">Басты</a>
    <a class="${location.pathname.includes('map') ? 'active' : ''}" href="/map.html">Карта</a>
    <a class="${location.pathname.includes('booking') ? 'active' : ''}" href="/booking.html">Бронь</a>
    <a class="${location.pathname.includes('cabinet') ? 'active' : ''}" href="/cabinet.html">Кабинет</a>
    <a class="${location.pathname.includes('contact') ? 'active' : ''}" href="/contact.html">Байланыс</a>
  </nav>`;
}
function includeLayout() {
  document.querySelectorAll('[data-include="header"]').forEach((el) => (el.outerHTML = headerTemplate()));
  document.querySelectorAll('[data-include="footer"]').forEach((el) => (el.outerHTML = footerTemplate()));
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('mainNav');
  if (toggle && nav) toggle.addEventListener('click', () => nav.classList.toggle('open'));
}
async function getJson(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  let payload = null;
  try { payload = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(payload?.message || 'Қате орын алды');
  return payload;
}
function formatMoney(value) { return `${Number(value || 0).toLocaleString('kk-KZ')} ₸`; }
function statusClass(status = '') {
  if (/растал|қабылдан|орындал|белсенді/i.test(status)) return 'confirmed';
  if (/бас тарт|cancel|тех/i.test(status)) return 'cancelled';
  return 'pending';
}
function renderTable(headers, rowsHtml) {
  return `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rowsHtml || `<tr><td colspan="${headers.length}" class="empty-state">Мәлімет жоқ</td></tr>`}</tbody></table>`;
}
function serviceCard(service) {
  return `
    <article class="feature-card service-visual-card">
      <img class="card-image" src="${service.image}" alt="${service.title}" />
      <div class="service-card-top">
        <div>
          <h3>${service.title}</h3>
          <p>${service.description}</p>
        </div>
        <span class="price-pill">${service.price}</span>
      </div>
      <div class="service-badges">
        <span class="tag">${service.duration || 'Икемді'}</span>
      </div>
      <div class="cta-actions mobile-stack">
        <a class="btn btn-secondary full" href="/service-detail.html?slug=${service.slug}">Ішінен ашу</a>
        <a class="btn btn-primary full" href="/booking.html?service=${service.slug}">Брондау</a>
      </div>
    </article>`;
}
async function loadServices() {
  const services = await getJson(`${API}/services`);
  const home = document.getElementById('homeServices');
  const grid = document.getElementById('servicesGrid');
  if (home) home.innerHTML = services.slice(0, 4).map(serviceCard).join('');
  if (grid) grid.innerHTML = services.map(serviceCard).join('');

  const selects = [document.getElementById('bookingService'), document.getElementById('quickService')].filter(Boolean);
  selects.forEach((select) => {
    const fromQuery = new URLSearchParams(location.search).get('service');
    select.innerHTML = '<option value="">Қызмет таңдаңыз</option>' + services.map((s) => `<option value="${s.title}" data-price="${parseInt(String(s.price).replace(/\D/g, ''), 10)}" ${fromQuery === s.slug ? 'selected' : ''}>${s.title}</option>`).join('');
    const option = select.selectedOptions[0];
    if (option?.dataset?.price) {
      const priceInput = select.id === 'quickService' ? document.getElementById('quickPrice') : document.getElementById('bookingPrice');
      if (priceInput) priceInput.value = option.dataset.price;
    }
    select.addEventListener('change', () => {
      const selected = select.selectedOptions[0];
      const price = selected?.dataset?.price;
      const priceInput = select.id === 'quickService' ? document.getElementById('quickPrice') : document.getElementById('bookingPrice');
      if (price && priceInput) priceInput.value = price;
    });
  });
}
async function loadServiceDetail() {
  const container = document.getElementById('serviceDetail');
  if (!container) return;
  const slug = new URLSearchParams(location.search).get('slug');
  if (!slug) return (container.innerHTML = '<div class="empty-state">Қызмет таңдалмаған.</div>');
  try {
    const service = await getJson(`${API}/services/${slug}`);
    container.innerHTML = `
      <div class="detail-hero-grid">
        <div>
          <span class="eyebrow">${service.price}</span>
          <h1>${service.title}</h1>
          <p>${service.details}</p>
          <div class="service-meta"><span>Ұзақтығы: ${service.duration || 'Икемді'}</span><span>Онлайн брондау қолжетімді</span></div>
          <div class="feature-tags">${service.features.map((item) => `<span class="tag">${item}</span>`).join('')}</div>
          <div class="cta-actions mobile-stack"><a class="btn btn-primary full" href="/booking.html?service=${service.slug}">Осы қызметті брондау</a><a class="btn btn-secondary full" href="/services.html">Қызметтерге қайту</a></div>
        </div>
        <img class="detail-image" src="${service.image}" alt="${service.title}" />
      </div>`;
  } catch (e) {
    container.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}
async function submitBooking(form, messageEl) {
  const data = Object.fromEntries(new FormData(form).entries());
  data.userId = DEMO_USER_ID;
  data.passengers = Number(data.passengers);
  data.price = Number(data.price);
  data.prepayment = Number(data.prepayment);
  try {
    const res = await getJson(`${API}/bookings`, { method: 'POST', body: JSON.stringify(data) });
    messageEl.textContent = `${res.message}. Бронь ID: ${res.booking.id}`;
    form.reset();
  } catch (e) { messageEl.textContent = e.message; }
}
function bindBookingForms() {
  const quick = document.getElementById('quickBookingForm');
  const quickMsg = document.getElementById('quickBookingMessage');
  if (quick && quickMsg) quick.addEventListener('submit', (e) => { e.preventDefault(); submitBooking(quick, quickMsg); });
  const booking = document.getElementById('bookingForm');
  const bookingMsg = document.getElementById('bookingMessage');
  if (booking && bookingMsg) booking.addEventListener('submit', (e) => { e.preventDefault(); submitBooking(booking, bookingMsg); });
  const prepayForm = document.getElementById('prepayForm');
  const prepayMsg = document.getElementById('prepayMessage');
  if (prepayForm && prepayMsg) prepayForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(prepayForm).entries());
    data.userId = DEMO_USER_ID;
    data.amount = Number(data.amount);
    data.bookingId = Number(data.bookingId || 0);
    try {
      const res = await getJson(`${API}/payments/prepay`, { method: 'POST', body: JSON.stringify(data) });
      prepayMsg.textContent = `${res.message}. Төлем ID: ${res.payment.id}`;
      prepayForm.reset();
    } catch (e2) { prepayMsg.textContent = e2.message; }
  });
}
async function loadCabinet() {
  const profileForm = document.getElementById('profileForm');
  if (!profileForm) return;
  const profileMessage = document.getElementById('profileMessage');
  const refresh = async () => {
    const user = await getJson(`${API}/profile/${DEMO_USER_ID}`);
    profileForm.elements.name.value = user.name || '';
    profileForm.elements.phone.value = user.phone || '';
    profileForm.elements.email.value = user.email || '';
    profileForm.elements.city.value = user.city || '';
    profileForm.elements.language.value = user.preferences?.language || '';
    profileForm.elements.seat.value = user.preferences?.seat || '';
    profileForm.elements.notifications.checked = Boolean(user.preferences?.notifications);
    document.getElementById('profileAvatar').textContent = user.avatar || 'ST';
    document.getElementById('profileTitle').textContent = user.name;
    document.getElementById('profileSubtitle').textContent = `${user.tier || 'Client'} клиент`;
    document.getElementById('balanceView').textContent = formatMoney(user.balance);
    const [bookings, payments, notifications] = await Promise.all([
      getJson(`${API}/bookings?userId=${DEMO_USER_ID}`),
      getJson(`${API}/payments?userId=${DEMO_USER_ID}`),
      getJson(`${API}/notifications/${DEMO_USER_ID}`)
    ]);
    document.getElementById('bookingCountView').textContent = bookings.length;
    document.getElementById('paymentCountView').textContent = payments.length;
    document.getElementById('notificationCountView').textContent = notifications.length;
    document.getElementById('userBookings').innerHTML = renderTable(['ID', 'Қызмет', 'Маршрут', 'Күні', 'Статус', 'Баға'], bookings.map((b) => `<tr><td>#${b.id}</td><td>${b.service}</td><td>${b.from} → ${b.to}</td><td>${b.date} ${b.time}</td><td><span class="status ${statusClass(b.status)}">${b.status}</span></td><td>${formatMoney(b.price)}</td></tr>`).join(''));
    document.getElementById('userPayments').innerHTML = renderTable(['ID', 'Түрі', 'Бронь', 'Сома', 'Статус', 'Күні'], payments.map((p) => `<tr><td>#${p.id}</td><td>${p.type}</td><td>#${p.bookingId || '-'}</td><td>${formatMoney(p.amount)}</td><td><span class="status ${statusClass(p.status)}">${p.status}</span></td><td>${p.createdAt}</td></tr>`).join(''));
    document.getElementById('userNotifications').innerHTML = notifications.length ? notifications.map((n) => `<article class="notification-item"><strong>${n.title}</strong><div>${n.message}</div><small>${n.time}</small></article>`).join('') : '<div class="empty-state">Хабарлама жоқ</div>';
  };
  document.getElementById('loadProfileBtn')?.addEventListener('click', refresh);
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(profileForm).entries());
    data.notifications = profileForm.elements.notifications.checked;
    try {
      await getJson(`${API}/profile/${DEMO_USER_ID}`, { method: 'PUT', body: JSON.stringify(data) });
      profileMessage.textContent = 'Жеке ақпарат сақталды';
      await refresh();
    } catch (e2) { profileMessage.textContent = e2.message; }
  });
  await refresh();
}
async function loadAdmin() {
  const statsEl = document.getElementById('adminStats');
  if (!statsEl) return;
  const adminContent = document.getElementById('adminContent');
  const guardMessage = document.getElementById('adminGuardMessage');
  const loginMessage = document.getElementById('adminLoginMessage');
  const setAdminState = (user) => {
    const isAdmin = user && user.role === 'admin';
    if (adminContent) adminContent.style.display = isAdmin ? 'block' : 'none';
    if (guardMessage) guardMessage.textContent = isAdmin
      ? `${user.name} ретінде кірдіңіз. Енді админ панелі белсенді.`
      : 'Админ ретінде кіргеннен кейін аналитика мен басқару блоктары ашылады.';
  };
  const refresh = async () => {
    const current = getCurrentUser();
    if (!current || current.role !== 'admin') {
      setAdminState(null);
      return;
    }
    const [stats, bookings, payments, users, vehicles] = await Promise.all([
      getJson(`${API}/admin/stats`), getJson(`${API}/bookings`), getJson(`${API}/admin/payments`), getJson(`${API}/admin/users`), getJson(`${API}/admin/vehicles`)
    ]);
    setAdminState(current);
    statsEl.innerHTML = [
      ['Бронь', stats.totalBookings], ['Клиент', stats.totalUsers], ['Қызмет', stats.totalServices], ['Түсім', formatMoney(stats.totalRevenue)], ['Күтілуде', stats.pendingBookings], ['Белсенді флот', stats.activeVehicles], ['Жалпы флот', stats.totalFleet]
    ].map(([label, value]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join('');
    document.getElementById('adminBookings').innerHTML = renderTable(['ID','Клиент','Қызмет','Маршрут','Статус','Әрекет'], bookings.map((b) => `<tr><td>#${b.id}</td><td>${b.customerName}</td><td>${b.service}</td><td>${b.from} → ${b.to}</td><td><span class="status ${statusClass(b.status)}">${b.status}</span></td><td><select data-booking="${b.id}" class="status-select"><option ${b.status==='Күтілуде'?'selected':''}>Күтілуде</option><option ${b.status==='Расталды'?'selected':''}>Расталды</option><option ${b.status==='Орындалды'?'selected':''}>Орындалды</option><option ${b.status==='Бас тартылды'?'selected':''}>Бас тартылды</option></select></td></tr>`).join(''));
    document.getElementById('adminPayments').innerHTML = renderTable(['ID','Түрі','Сома','Бронь','Статус'], payments.map((p) => `<tr><td>#${p.id}</td><td>${p.type}</td><td>${formatMoney(p.amount)}</td><td>#${p.bookingId}</td><td><span class="status ${statusClass(p.status)}">${p.status}</span></td></tr>`).join(''));
    document.getElementById('adminUsers').innerHTML = renderTable(['ID','Аты','Email','Қала','Tier'], users.map((u) => `<tr><td>#${u.id}</td><td>${u.name}</td><td>${u.email}</td><td>${u.city}</td><td>${u.tier || '-'}</td></tr>`).join(''));
    document.getElementById('adminVehicles').innerHTML = `<div class="fleet-grid">${vehicles.map((v) => `<article class="fleet-card"><img class="fleet-image" src="${v.image}" alt="${v.name}"/><div class="fleet-card-body"><div class="fleet-head"><h3>${v.name}</h3><span class="status ${statusClass(v.status)}">${v.status}</span></div><p>${v.base}</p><div class="fleet-meta"><span>${v.capacity} орын</span><span>${v.range}</span><span>${v.battery}</span></div><select class="vehicle-status" data-vehicle="${v.id}"><option ${v.status==='Белсенді'?'selected':''}>Белсенді</option><option ${v.status==='Резервте'?'selected':''}>Резервте</option><option ${v.status==='Техқызметте'?'selected':''}>Техқызметте</option></select></div></article>`).join('')}</div>`;
    document.querySelectorAll('.status-select').forEach((select) => select.addEventListener('change', async () => { await getJson(`${API}/bookings/${select.dataset.booking}/status`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) }); refresh(); }));
    document.querySelectorAll('.vehicle-status').forEach((select) => select.addEventListener('change', async () => { await getJson(`${API}/admin/vehicles/${select.dataset.vehicle}/status`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) }); refresh(); }));
  };
  document.getElementById('refreshAdminBtn')?.addEventListener('click', refresh);
  document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
    clearCurrentUser();
    if (loginMessage) loginMessage.textContent = 'Админ сессиясы жабылды';
    setAdminState(null);
  });
  document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      const res = await getJson(`${API}/login`, { method: 'POST', body: JSON.stringify(data) });
      if (res.user.role !== 'admin') throw new Error('Бұл аккаунт админ емес');
      setCurrentUser(res.user);
      if (loginMessage) loginMessage.textContent = `${res.user.name} кірді`;
      refresh();
    } catch (e2) { if (loginMessage) loginMessage.textContent = e2.message; }
  });
  setAdminState(getCurrentUser());
  if (getCurrentUser()?.role === 'admin') await refresh();
}
async function bindLoginForms() {
  const form = document.getElementById('userLoginForm');
  if (!form) return;
  const message = document.getElementById('userLoginMessage');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await getJson(`${API}/login`, { method: 'POST', body: JSON.stringify(data) });
      setCurrentUser(res.user);
      message.textContent = `${res.user.name} сәтті кірді`;
    } catch (e2) { message.textContent = e2.message; }
  });
}
async function loadMap() {
  const mapPanel = document.getElementById('routeMapPanel');
  if (!mapPanel) return;
  const routes = [
    { from: 'Алматы Hub', to: 'Астана Hub', time: '55 мин', price: '210 000 ₸' },
    { from: 'Астана Hub', to: 'Шымкент Hub', time: '60 мин', price: '195 000 ₸' },
    { from: 'Алматы Hub', to: 'Шымкент Hub', time: '48 мин', price: '180 000 ₸' },
    { from: 'Алматы Hub', to: 'Қарағанды', time: '35 мин', price: '125 000 ₸' }
  ];
  const list = document.getElementById('routeList');
  list.innerHTML = routes.map((r, i) => `<button class="route-item ${i===0?'active':''}" data-route="${i}"><strong>${r.from} → ${r.to}</strong><span>${r.time} • ${r.price}</span></button>`).join('');
  const info = document.getElementById('routeInfo');
  const render = (route) => info.innerHTML = `<h3>${route.from} → ${route.to}</h3><p>Жоспарланған уақыт: ${route.time}</p><p>Бағасы: ${route.price}</p><div class="cta-actions mobile-stack"><a class="btn btn-primary full" href="/booking.html">Осы маршрутты брондау</a><a class="btn btn-secondary full" href="https://wa.me/77475480688" target="_blank" rel="noopener">WhatsApp-қа жіберу</a></div>`;
  render(routes[0]);
  list.querySelectorAll('.route-item').forEach((btn) => btn.addEventListener('click', () => {
    list.querySelectorAll('.route-item').forEach((x) => x.classList.remove('active'));
    btn.classList.add('active');
    render(routes[Number(btn.dataset.route)]);
  }));
}
async function loadFleet() {
  const el = document.getElementById('fleetPublic');
  if (!el) return;
  const vehicles = await getJson(`${API}/admin/vehicles`);
  document.getElementById('fleetCount').textContent = vehicles.length;
  el.innerHTML = vehicles.map((v) => `<article class="fleet-card public"><img class="fleet-image" src="${v.image}" alt="${v.name}"/><div class="fleet-card-body"><div class="fleet-head"><h3>${v.name}</h3><span class="status ${statusClass(v.status)}">${v.status}</span></div><p>${v.base}</p><div class="fleet-meta"><span>${v.capacity} орын</span><span>${v.range}</span><span>${v.battery}</span></div></div></article>`).join('');
}
function setupPWAInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredInstallPrompt = e; document.querySelectorAll('[data-install]').forEach((btn) => btn.classList.remove('hidden'));
  });
  document.querySelectorAll('[data-install]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice; deferredInstallPrompt = null;
  }));
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

document.addEventListener('DOMContentLoaded', async () => {
  includeLayout();
  setupPWAInstall();
  await Promise.allSettled([loadServices(), loadServiceDetail(), loadCabinet(), loadAdmin(), bindLoginForms(), loadMap(), loadFleet()]);
  bindBookingForms();
});
