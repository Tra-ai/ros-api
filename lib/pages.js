const shell = (title, body, wide) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root{color-scheme:dark;}
  *{box-sizing:border-box;}
  body{margin:0;min-height:100vh;background:radial-gradient(circle at 50% 0%,#15203a,#0a0f1c 70%);
    font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#e6ebf5;padding:24px;
    display:flex;align-items:${wide ? 'flex-start' : 'center'};justify-content:center;}
  .card{width:100%;max-width:${wide ? '760px' : '420px'};background:#0e1626;border:1px solid #1d2a44;
    border-radius:18px;padding:32px 28px;box-shadow:0 20px 60px rgba(0,0,0,.45);margin-top:${wide ? '24px' : '0'};}
  .brand{text-align:center;margin-bottom:10px;font-size:26px;font-weight:800;letter-spacing:1px;
    background:linear-gradient(90deg,#4fa6ff,#7fd4ff);-webkit-background-clip:text;background-clip:text;color:transparent;}
  .sub{text-align:center;color:#6f87ad;letter-spacing:3px;font-size:12px;margin-bottom:18px;text-transform:uppercase;}
  h1{font-size:22px;margin:4px 0 16px;}
  label{display:block;font-size:12px;font-weight:700;letter-spacing:1px;color:#9fb3d1;margin:14px 0 6px;text-transform:uppercase;}
  input{width:100%;padding:12px 13px;border-radius:10px;border:1px solid #243457;background:#0b1220;
    color:#e6ebf5;font-size:15px;outline:none;}
  input:focus{border-color:#4fa6ff;}
  button{padding:12px 18px;border:0;border-radius:10px;font-size:14px;font-weight:700;
    color:#06101f;background:linear-gradient(90deg,#1f78e0,#4fd0ff);cursor:pointer;}
  button.full{width:100%;margin-top:20px;padding:14px;font-size:16px;}
  button.danger{background:linear-gradient(90deg,#e04f4f,#ff8a6f);}
  .msg{margin:0 0 16px;padding:10px 12px;border-radius:8px;font-size:13px;}
  .msg.err{background:#3a1420;color:#ff9aad;border:1px solid #5a1d30;}
  .msg.ok{background:#0f3324;color:#7cf0b8;border:1px solid #1c5a3f;}
  table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px;}
  th,td{text-align:left;padding:9px 8px;border-bottom:1px solid #1d2a44;}
  th{color:#7f97c0;font-weight:700;text-transform:uppercase;font-size:11px;}
  form.inline{display:inline;}
  .row{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;}
  .row > div{flex:1;min-width:140px;}
  .toplink{color:#7fb8ff;font-size:12px;text-decoration:none;}
  .foot{text-align:center;margin-top:22px;color:#52678c;font-size:11px;}
</style></head>
<body><div class="card">${body}
  <div class="foot">ROS Legacy admin &middot; self-hosted</div>
</div></body></html>`;

function adminLoginPage({ error } = {}) {
  const body = `
    <div class="brand">ROS LEGACY</div>
    <div class="sub">Admin panel</div>
    ${error ? `<div class="msg err">${error}</div>` : ''}
    <form method="POST" action="/admin">
      <label>Admin password</label>
      <input name="password" type="password" autocomplete="current-password" required autofocus>
      <button class="full" type="submit">Sign in</button>
    </form>
  `;
  return shell('ROS Legacy Admin - Sign in', body, false);
}

function adminDashboardPage({ users, error, ok }) {
  const rows = users.map(u => `
    <tr>
      <td>${u.id}</td>
      <td>${u.username}</td>
      <td>${u.email || '-'}</td>
      <td>${new Date(u.created_at).toISOString().slice(0, 16).replace('T', ' ')}</td>
      <td>
        <form class="inline" method="POST" action="/admin/delete-user" onsubmit="return confirm('Delete ${u.username}?');">
          <input type="hidden" name="id" value="${u.id}">
          <button class="danger" type="submit">Delete</button>
        </form>
      </td>
    </tr>`).join('');

  const body = `
    <div class="brand">ROS LEGACY</div>
    <div class="sub">Admin dashboard</div>
    ${error ? `<div class="msg err">${error}</div>` : ''}
    ${ok ? `<div class="msg ok">${ok}</div>` : ''}
    <h1>Create account</h1>
    <form method="POST" action="/admin/create-user">
      <div class="row">
        <div><label>Username</label><input name="username" required minlength="3" maxlength="32"></div>
        <div><label>Email (optional)</label><input name="email" type="email"></div>
        <div><label>Password</label><input name="password" type="password" required minlength="6"></div>
        <div><button type="submit">Create</button></div>
      </div>
    </form>
    <h1 style="margin-top:28px">Accounts (${users.length})</h1>
    <table>
      <tr><th>ID</th><th>Username</th><th>Email</th><th>Created</th><th></th></tr>
      ${rows || '<tr><td colspan="5">No accounts yet.</td></tr>'}
    </table>
    <form method="POST" action="/admin/logout" style="margin-top:20px">
      <button type="submit">Log out</button>
    </form>
  `;
  return shell('ROS Legacy Admin - Dashboard', body, true);
}

module.exports = { adminLoginPage, adminDashboardPage };
