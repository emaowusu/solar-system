const jwt = require('jsonwebtoken');
const redis = require('../redis');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (await redis.get(`bl:${token}`)) return res.status(401).json({ error: 'Session ended' });
    req.user = { id: payload.sub, token, exp: payload.exp };
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
