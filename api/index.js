// RoS Legacy API on Vercel (stateless). Response shapes are GUESSES;
// real requests are printed with console.log -> Vercel dashboard > Logs.
const express = require('express');
const crypto = require('crypto');

const app = express();
const SECRET = process.env.TOKEN_SECRET || 'change-me';

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log('REQ', JSON.stringify({
    method: req.method, url: req.originalUrl,
    headers: req.headers, body: req.body,
  }));
  next();
});

// Stateless ticket: base64url(uid).hmac  (no database needed)
const sign = (uid) => {
  const p = Buffer.from(uid).toString('base64url');
  const h = crypto.createHmac('sha256', SECRET).update(p).digest('hex').slice(0, 32);
  return `${p}.${h}`;
};
const verify = (t) => {
  if (!t || !t.includes('.')) return null;
  const [p, h] = t.split('.');
  const good = crypto.createHmac('sha256', SECRET).update(p).digest('hex').slice(0, 32);
  return h === good ? Buffer.from(p, 'base64url').toString() : null;
};
const ok = (data = {}) => ({ code: 0, status: 'ok', ...data });
const newUid = () => crypto.randomBytes(4).toString('hex');

app.post('/v2/ros/login_mobile_v2', (req, res) => {
  const uid = req.body.uid || req.body.account || newUid();
  const ticket = sign(String(uid));
  res.json(ok({ uid, ticket, token: ticket, session: ticket }));
});

app.post('/v2/account/rosl/exchangeTicket', (req, res) => {
  const t = req.body.ticket || req.body.token;
  const uid = verify(t) || newUid();
  const ticket = sign(uid);
  res.json(ok({ uid, ticket, token: ticket }));
});

app.post('/v2/ros/relaunch_v2', (req, res) => res.json(ok()));
app.post('/v2/ros/logout_v2', (req, res) => res.json(ok()));
app.get('/v2/ros/online-count', (req, res) => res.json(ok({ count: 0 })));
app.post('/v2/ros/ac/report', (req, res) => res.json(ok()));
app.all('/v2/ros/ac/device/status', (req, res) => res.json(ok({ banned: false })));

// Catch-all: unknown endpoints are logged above and answered with ok
app.all('*', (req, res) => res.json(ok()));

module.exports = app;
