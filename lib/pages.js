const shell = (title, body) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root{color-scheme:dark;}
  *{box-sizing:border-box;}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 50% 0%,#15203a,#0a0f1c 70%);
    font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#e6ebf5;padding:24px;}
  .card{width:100%;max-width:420px;background:#0e1626;border:1px solid #1d2a44;border-radius:18px;
    padding:32px 28px;box-shadow:0 20px 60px rgba(0,0,0,.45);}
  .brand{text-align:center;margin-bottom:18px;}
  .brand .mark{font-size:30px;font-weight:800;letter-spacing:1px;
    background:linear-gradient(90deg,#4fa6ff,#7fd4ff);-webkit-background-clip:text;background-clip:text;color:transparent;}
  .sub{text-align:center;color:#6f87ad;letter-spacing:3px;font-size:12px;margin-bottom:6px;text-transform:uppercase;}
  h1{text-align:center;font-size:28px;margin:4px 0 6px;}
  h1 b{color:#4fa6ff;}
  p.lead{text-align:center;color:#8da2c2;margin:0 0 24px;font-size:14px;}
  label{display:block;font-size:12px;font-weight:700;letter-spacing:1px;color:#9fb3d1;margin:14px 0 6px;text-transform:uppercase;}
  input{width:100%;padding:13px 14px;border-radius:10px;border:1px solid #243457;background:#0b1220;
    color:#e6ebf5;font-size:15px;outline:none;}
  input:focus{border-color:#4fa6ff;}
  button{width:100%;margin-top:22px;padding:14px;border:0;border-radius:10px;font-size:16px;font-weight:700;
    color:#06101f;background:linear-gradient(90deg,#1f78e0,#4fd0ff);cursor:pointer;}
  .alt{display:block;text-align:center;margin-top:14px;padding:12px;border-radius:10px;border:1px solid #243457;
    color:#cfe0ff;text-decoration:none;font-weight:600;font-size:14px;}
  .msg{margin:14px 0;padding:10px 12px;border-radius:8px;font-size:13px;}
  .msg.err{background:#3a1420;color:#ff9aad;border:1px solid #5a1d30;}
  .msg.ok{background:#0f3324;color:#7cf0b8;border:1px solid #1c5a3f;}
  .foot{text-align:center;margin-top:22px;color:#52678c;font-size:11px;}
</style></head>
<body><div class="card">
  <div class="brand"><span class="mark">ROS LEGACY</span></div>
  ${body}
  <div class="foot">Secure connection &middot; self-hosted revival server</div>
</div></body></html>`;

function registerPage({ error, ok, client } = {}) {
  const q = client ? `?client=${encodeURIComponent(client)}` : '';
  const body = `
    <div class="sub">Create account</div>
    <h1>Join <b>ROS Legacy</b></h1>
    <p class="lead">Set a username and password to create your revival account.</p>
    ${error ? `<div class="msg err">${error}</div>` : ''}
    ${ok ? `<div class="msg ok">Account created. You can sign in now.</div>` : ''}
    <form method="POST" action="/register${q}">
      <label>Username</label>
      <input name="username" autocomplete="username" required minlength="3" maxlength="32">
      <label>Email (optional)</label>
      <input name="email" type="email" autocomplete="email">
      <label>Password</label>
      <input name="password" type="password" autocomplete="new-password" required minlength="6">
      <button type="submit">Create account</button>
    </form>
    <a class="alt" href="/login${q}">Already have an account? Sign in</a>
  `;
  return shell('ROS Legacy - Create account', body);
}

function loginPage({ error, client } = {}) {
  const q = client ? `?client=${encodeURIComponent(client)}` : '';
  const body = `
    <div class="sub">Ros Legacy</div>
    <h1>Sign <b>In</b></h1>
    <p class="lead">Enter your credentials to continue.</p>
    ${error ? `<div class="msg err">${error}</div>` : ''}
    <form method="POST" action="/login${q}">
      <label>Username / Email</label>
      <input name="username" autocomplete="username" required>
      <label>Password</label>
      <input name="password" type="password" autocomplete="current-password" required>
      <button type="submit">Sign in</button>
    </form>
    <a class="alt" href="/register${q}">Create account</a>
  `;
  return shell('ROS Legacy - Sign in', body);
}

function successPage(username) {
  const body = `
    <div class="sub">Signed in</div>
    <h1>Welcome, <b>${username}</b></h1>
    <p class="lead">You're signed in. You can return to the game now.</p>
  `;
  return shell('ROS Legacy - Signed in', body);
}

module.exports = { registerPage, loginPage, successPage };
