const fs = require('fs');

const file = 'api/index.js';
const source = fs.readFileSync(file, 'utf8');

const start = "app.post('/v2/account/rosl/exchangeTicket'";
const end = "\n\napp.post('/v2/ros/relaunch_v2'";

const a = source.indexOf(start);
const b = source.indexOf(end, a);

if (a === -1 || b === -1 || b <= a) {
  console.error('ERROR: Exchange route not found. No changes made.');
  process.exit(1);
}

const backup = file + '.backup-' + Date.now();
fs.copyFileSync(file, backup);

const replacement = `app.post('/v2/account/rosl/exchangeTicket', async (req, res) => {
  try {
    const t = req.body.ticket || req.body.token || '';
    const uid = verifyTicket(t);

    if (!uid) {
      return res.status(200).json({
        success: false,
        message: 'Invalid or expired ticket.'
      });
    }

    let username = uid;
    const match = uid.match(/^u:(\\\\d+)$/);

    if (match) {
      const result = await db.query(
        'SELECT username FROM ros_users WHERE id = $1',
        [match[1]]
      );

      if (!result.rows[0]) {
        return res.status(200).json({
          success: false,
          message: 'Account not found.'
        });
      }

      username = result.rows[0].username;
    }

    const rosToken = sign(uid);

    return res.status(200).json({
      success: true,
      username,
      ros_token: rosToken
    });
  } catch (error) {
    console.error('Exchange error:', error.message);

    return res.status(200).json({
      success: false,
      message: 'Exchange service error.'
    });
  }
});`;

const updated = source.slice(0, a) + replacement + source.slice(b);

fs.writeFileSync(file, updated);
console.log('PATCH SUCCESS');
console.log('Backup:', backup);
