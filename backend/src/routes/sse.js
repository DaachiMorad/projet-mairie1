const router = require('express').Router();
const { auth } = require('../middleware/auth');

// Map userId -> res
const clients = new Map();

function broadcast(userId, event, data) {
  const res = clients.get(userId);
  if (res) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

// GET /api/sse
router.get('/', auth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.set(req.user.id, res);
  res.write('event: connected\ndata: {}\n\n');

  // Heartbeat
  const hb = setInterval(() => res.write(':ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(hb);
    clients.delete(req.user.id);
  });
});

module.exports = router;
module.exports.broadcast = broadcast;
