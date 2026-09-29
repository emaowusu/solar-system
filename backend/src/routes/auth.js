const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const redis = require('../redis');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, skip: () => process.env.NODE_ENV === 'test' });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sign = (user) =>
  jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email });

router.post('/signup', limiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !EMAIL_RE.test(email || '')) return res.status(400).json({ error: 'Name and a valid email are required' });
    if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: 'Email already registered' });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    return res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (err) { return next(err); }
});

router.post('/signin', limiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const user = email && (await User.findOne({ email: String(email).toLowerCase() }));
    const ok = user && typeof password === 'string' && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    return res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) { return next(err); }
});

router.post('/signout', requireAuth, async (req, res, next) => {
  try {
    const ttl = Math.max(req.user.exp - Math.floor(Date.now() / 1000), 1);
    await redis.set(`bl:${req.user.token}`, '1', 'EX', ttl);
    return res.json({ ok: true });
  } catch (err) { return next(err); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    return res.json({ user: publicUser(user) });
  } catch (err) { return next(err); }
});

module.exports = router;
