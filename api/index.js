// RoS Legacy API + Account server (Vercel). Real accounts stored in Postgres (Neon).
const express = require('express');
const crypto = require('crypto');
const db = require('../lib/db');
const { hashPassword, verifyPassword } = require('../lib/password');
const { registerPage, loginPage, successPage } = require('../lib/pages');

const app = express();
const SECRET = process.env.TOKEN_SECRET || 'change-me';

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
const wantsJson = (req) =>
  (req.headers.accept || '').includes('application/json') || req.query.format === 'json';

// ---------- stateless game ticket (unchanged behaviour for the game client) ----------
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

// ---------- account pages (real accounts in Postgres) ----------
app.get('/register', (req, res) => {
  res.send(registerPage({ client: req.query.client }));
});

app.post('/register', async (req, res) => {
  const client = req.query.client || req.body.client;
  const username = (req.body.username || '').trim();
  const email = (req.body.email || '').trim() || null;
  const password = req.body.password || '';
  try {
    if (username.length < 3 || password.length < 6) {
      throw new Error('Username (3+) and password (6+) are required.');
    }
    const hash = hashPassword(password);
    await db.query(
      'INSERT INTO ros_users (username, email, password_hash) VALUES ($1,$2,$3)',
      [username, email, hash]
    );
    if (wantsJson(req)) return res.json(ok({ username }));
    res.send(registerPage({ ok: true, client }));
  } catch (e) {
    const msg = /duplicate key/i.test(e.message) ? 'That username is already taken.' : e.message;
    if (wantsJson(req)) return res.status(400).json(fail(msg));
    res.status(400).send(registerPage({ error: msg, client }));
  }
});

app.get('/login', (req, res) => {
  res.send(loginPage({ client: req.query.client }));
});

app.post('/login', async (req, res) => {
  const client = req.query.client || req.body.client;
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  try {
    const r = await db.query('SELECT * FROM ros_users WHERE username = $1', [username]);
    const user = r.rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new Error('Incorrect username or password.');
    }
    const ticket = sign(`u:${user.id}`);
    if (wantsJson(req) || client === 'ros') {
      return res.json(ok({ uid: user.id, username: user.username, ticket, token: ticket }));
    }
    res.send(successPage(user.username));
  } catch (e) {
    if (wantsJson(req)) return res.status(400).json(fail(e.message));
    res.status(400).send(loginPage({ error: e.message, client }));
  }
});

// ---------- game client endpoints (used by the APK directly) ----------
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
    } catch (e) { /* fall through to guest */ }
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
