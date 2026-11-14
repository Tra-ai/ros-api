// RoS Legacy API + Admin dashboard (Vercel). Accounts are created by the admin only.
const express = require('express');
const crypto = require('crypto');
const db = require('../lib/db');
const { hashPassword, verifyPassword } = require('../lib/password');
const { adminLoginPage, adminDashboardPage } = require('../lib/pages');

const app = express();
const SECRET = process.env.TOKEN_SECRET || 'change-me';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log('REQ', JSON.stringify({
    method: req.method, url: req.originalUrl, headers: req.headers, body: req.body,
  }));
  next();
});

const ok = (data = {}) => ({ code: 0, status: 'ok', ...data });
const fail = (msg) => ({ code: 1, status: 'error', message: msg });

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i === -1) return;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}
const adminToken = () => crypto.createHmac('sha256', SECRET).update('admin-session').digest('hex');

function requireAdmin(req, res, next) {
  const cookies = parseCookies(req);
  if (ADMIN_PASSWORD && cookies.admin_session === adminToken()) return next();
  res.redirect('/admin');
}

app.get('/admin', (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(500).send('ADMIN_PASSWORD is not set on the server.');
  const cookies = parseCookies(req);
  if (cookies.admin_session === adminToken()) return res.redirect('/admin/dashboard');
  res.send(adminLoginPage());
});

app.post('/admin', (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(500).send('ADMIN_PASSWORD is not set on the server.');
  if (req.body.password !== ADMIN_PASSWORD) {
    return res.status(401).send(adminLoginPage({ error: 'Wrong password.' }));
  }
  res.setHeader('Set-Cookie', `admin_session=${adminToken()}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`);
  res.redirect('/admin/dashboard');
});

app.post('/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'admin_session=; Path=/; HttpOnly; Max-Age=0');
  res.redirect('/admin');
});

app.get('/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    const r = await db.query('SELECT id, username, email, created_at FROM ros_users ORDER BY id DESC');
    res.send(adminDashboardPage({ users: r.rows }));
  } catch (e) {
    res.status(500).send(adminDashboardPage({ users: [], error: e.message }));
  }
});

app.post('/admin/create-user', requireAdmin, async (req, res) => {
  const username = (req.body.username || '').trim();
  const email = (req.body.email || '').trim() || null;
  const password = req.body.password || '';
  try {
    if (username.length < 3 || password.length < 6) {
      throw new Error('Username (3+) and password (6+) are required.');
    }
    await db.query(
      'INSERT INTO ros_users (username, email, password_hash) VALUES ($1,$2,$3)',
      [username, email, hashPassword(password)]
    );
    const r = await db.query('SELECT id, username, email, created_at FROM ros_users ORDER BY id DESC');
    res.send(adminDashboardPage({ users: r.rows, ok: `Account "${username}" created.` }));
  } catch (e) {
    const msg = /duplicate key/i.test(e.message) ? 'That username is already taken.' : e.message;
    const r = await db.query('SELECT id, username, email, created_at FROM ros_users ORDER BY id DESC').catch(() => ({ rows: [] }));
    res.status(400).send(adminDashboardPage({ users: r.rows, error: msg }));
  }
});

app.post('/admin/delete-user', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM ros_users WHERE id = $1', [req.body.id]);
  } catch (e) { /* ignore */ }
  res.redirect('/admin/dashboard');
});

const sign = (uid) => {
  const p = Buffer.from(uid).toString('base64url');
  const h = crypto.createHmac('sha256', SECRET).update(p).digest('hex').slice(0, 32);
  return `${p}.${h}`;
};
const verifyTicket = (t) => {
  if (!t || !t.includes('.')) return null;
  const [p, h] = t.split('.');
  const good = crypto.createHmac('sha256', SECRET).update(p).digest('hex').slice(0, 32);
  return h === good ? Buffer.from(p, 'base64url').toString() : null;
};
const newUid = () => crypto.randomBytes(4).toString('hex');

app.post('/v2/ros/login_mobile_v2', async (req, res) => {
  const username = (req.body.username || req.body.account || '').trim();
  const password = req.body.password;
  if (username && password) {
    try {
      const r = await db.query('SELECT * FROM ros_users WHERE username = $1', [username]);
      const user = r.rows[0];
      if (user && verifyPassword(password, user.password_hash)) {
        const ticket = sign(`u:${user.id}`);
        return res.json(ok({ uid: user.id, ticket, token: ticket, session: ticket }));
      }
      return res.status(401).json(fail('Incorrect username or password.'));
    } catch (e) {
      return res.status(500).json(fail('Server error.'));
    }
  }
  const uid = username || newUid();
  const ticket = sign(uid);
  res.json(ok({ uid, ticket, token: ticket, session: ticket }));
});

app.post('/v2/account/rosl/exchangeTicket', (req, res) => {
  const t = req.body.ticket || req.body.token;
  const uid = verifyTicket(t) || newUid();
  const ticket = sign(uid);
  res.json(ok({ uid, ticket, token: ticket }));
});

app.post('/v2/ros/relaunch_v2', (req, res) => res.json(ok()));
app.post('/v2/ros/logout_v2', (req, res) => res.json(ok()));
app.get('/v2/ros/online-count', (req, res) => res.json(ok({ count: 0 })));
app.post('/v2/ros/ac/report', (req, res) => res.json(ok()));
app.all('/v2/ros/ac/device/status', (req, res) => res.json(ok({ banned: false })));

app.all('*', (req, res) => res.json(ok()));

module.exports = app;
