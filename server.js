const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}
function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}
function nextId(list, base = 1) {
  return list.length ? Math.max(...list.map((x) => Number(x.id) || 0)) + 1 : base;
}
function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Sky Taxi v4 backend жұмыс істеп тұр' });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  const user = db.users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ message: 'Email немесе құпиясөз қате' });
  res.json({ token: `demo-token-${user.id}`, user: safeUser(user) });
});

app.get('/api/services', (req, res) => res.json(readDb().services));
app.get('/api/services/:slug', (req, res) => {
  const service = readDb().services.find((s) => s.slug === req.params.slug);
  if (!service) return res.status(404).json({ message: 'Қызмет табылмады' });
  res.json(service);
});

app.get('/api/profile/:userId', (req, res) => {
  const user = readDb().users.find((u) => u.id === Number(req.params.userId));
  if (!user) return res.status(404).json({ message: 'Пайдаланушы табылмады' });
  res.json(safeUser(user));
});
app.put('/api/profile/:userId', (req, res) => {
  const db = readDb();
  const idx = db.users.findIndex((u) => u.id === Number(req.params.userId));
  if (idx === -1) return res.status(404).json({ message: 'Пайдаланушы табылмады' });
  const existing = db.users[idx];
  db.users[idx] = {
    ...existing,
    name: req.body.name ?? existing.name,
    email: req.body.email ?? existing.email,
    phone: req.body.phone ?? existing.phone,
    city: req.body.city ?? existing.city,
    preferences: {
      ...existing.preferences,
      language: req.body.language ?? existing.preferences?.language,
      seat: req.body.seat ?? existing.preferences?.seat,
      notifications: String(req.body.notifications ?? existing.preferences?.notifications) !== 'false'
    }
  };
  writeDb(db);
  res.json({ message: 'Жеке ақпарат жаңартылды', user: safeUser(db.users[idx]) });
});

app.get('/api/bookings', (req, res) => {
  const db = readDb();
  const userId = req.query.userId ? Number(req.query.userId) : null;
  let bookings = db.bookings;
  if (userId) bookings = bookings.filter((b) => b.userId === userId);
  res.json(bookings.sort((a, b) => b.id - a.id));
});
app.post('/api/bookings', (req, res) => {
  const db = readDb();
  const id = nextId(db.bookings, 1001);
  const booking = {
    id,
    userId: Number(req.body.userId || 1),
    customerName: req.body.customerName,
    phone: req.body.phone,
    service: req.body.service,
    from: req.body.from,
    to: req.body.to,
    date: req.body.date,
    time: req.body.time,
    passengers: Number(req.body.passengers || 1),
    price: Number(req.body.price || 0),
    prepayment: Number(req.body.prepayment || 0),
    status: 'Күтілуде',
    paymentMethod: req.body.paymentMethod || 'Kaspi QR',
    createdAt: new Date().toLocaleString('kk-KZ')
  };
  db.bookings.push(booking);
  if (booking.prepayment > 0) {
    db.payments.unshift({
      id: nextId(db.payments, 501),
      userId: booking.userId,
      type: booking.paymentMethod,
      amount: booking.prepayment,
      bookingId: booking.id,
      status: 'Қабылданды',
      createdAt: new Date().toLocaleString('kk-KZ')
    });
  }
  db.notifications.unshift({
    id: nextId(db.notifications, 901),
    userId: booking.userId,
    title: 'Жаңа бронь қабылданды',
    message: `#${booking.id} тапсырысыңыз жүйеге жазылды.`,
    time: new Date().toLocaleString('kk-KZ')
  });
  writeDb(db);
  res.status(201).json({ message: 'Брондау сәтті қабылданды', booking });
});
app.patch('/api/bookings/:id/status', (req, res) => {
  const db = readDb();
  const idx = db.bookings.findIndex((b) => b.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ message: 'Бронь табылмады' });
  db.bookings[idx].status = req.body.status;
  db.notifications.unshift({
    id: nextId(db.notifications, 901),
    userId: db.bookings[idx].userId,
    title: 'Бронь статусы жаңарды',
    message: `#${db.bookings[idx].id} броні: ${req.body.status}`,
    time: new Date().toLocaleString('kk-KZ')
  });
  writeDb(db);
  res.json({ message: 'Статус жаңартылды', booking: db.bookings[idx] });
});

app.get('/api/payments', (req, res) => {
  const db = readDb();
  const userId = req.query.userId ? Number(req.query.userId) : null;
  let payments = db.payments;
  if (userId) payments = payments.filter((p) => p.userId === userId);
  res.json(payments.sort((a, b) => b.id - a.id));
});
app.post('/api/payments/prepay', (req, res) => {
  const db = readDb();
  const payment = {
    id: nextId(db.payments, 501),
    userId: Number(req.body.userId || 1),
    type: req.body.type || 'Kaspi QR',
    amount: Number(req.body.amount || 0),
    bookingId: Number(req.body.bookingId || 0),
    status: 'Қабылданды',
    createdAt: new Date().toLocaleString('kk-KZ')
  };
  db.payments.unshift(payment);
  const booking = db.bookings.find((b) => b.id === payment.bookingId);
  if (booking) booking.prepayment = payment.amount;
  db.notifications.unshift({
    id: nextId(db.notifications, 901),
    userId: payment.userId,
    title: 'Kaspi QR төлемі қабылданды',
    message: `#${payment.bookingId} броні үшін ${payment.amount.toLocaleString('kk-KZ')} ₸ төленді.`,
    time: new Date().toLocaleString('kk-KZ')
  });
  writeDb(db);
  res.status(201).json({ message: 'Предоплата қабылданды', payment });
});

app.get('/api/notifications/:userId', (req, res) => {
  const db = readDb();
  res.json(db.notifications.filter((n) => n.userId === Number(req.params.userId)).sort((a, b) => b.id - a.id));
});

app.get('/api/admin/stats', (req, res) => {
  const db = readDb();
  const revenue = db.payments.filter((p) => p.status === 'Қабылданды').reduce((sum, p) => sum + Number(p.amount || 0), 0);
  res.json({
    totalBookings: db.bookings.length,
    totalUsers: db.users.filter((u) => u.role === 'user').length,
    totalServices: db.services.length,
    totalRevenue: revenue,
    pendingBookings: db.bookings.filter((b) => b.status === 'Күтілуде').length,
    activeVehicles: db.vehicles.filter((v) => v.status === 'Белсенді').length,
    totalFleet: db.vehicles.length
  });
});
app.get('/api/admin/users', (req, res) => res.json(readDb().users.map(safeUser)));
app.get('/api/admin/payments', (req, res) => res.json(readDb().payments.sort((a, b) => b.id - a.id)));
app.get('/api/admin/vehicles', (req, res) => res.json(readDb().vehicles));
app.patch('/api/admin/vehicles/:id/status', (req, res) => {
  const db = readDb();
  const idx = db.vehicles.findIndex((v) => v.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ message: 'Флот табылмады' });
  db.vehicles[idx].status = req.body.status;
  writeDb(db);
  res.json({ message: 'Флот статусы жаңартылды', vehicle: db.vehicles[idx] });
});

app.get('/manifest.webmanifest', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'manifest.webmanifest')));
app.get('*', (req, res) => {
  const filePath = path.join(PUBLIC_DIR, req.path.replace(/^\//, ''));
  if (req.path !== '/' && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return res.sendFile(filePath);
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => console.log(`Sky Taxi v4 backend іске қосылды: http://localhost:${PORT}`));
