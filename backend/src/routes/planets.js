const express = require('express');
const planets = require('../data/planets');
const redis = require('../redis');

const router = express.Router();
const KEY = 'planets:all';

async function loadPlanets() {
  try {
    const cached = await redis.get(KEY);
    if (cached) return JSON.parse(cached);
  } catch (_err) { /* cache is best-effort */ }
  try { await redis.set(KEY, JSON.stringify(planets), 'EX', 3600); } catch (_err) { /* ignore */ }
  return planets;
}

router.get('/', async (_req, res, next) => {
  try { res.json({ planets: await loadPlanets() }); } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const planet = (await loadPlanets()).find((p) => p.id === req.params.id);
    return planet ? res.json({ planet }) : res.status(404).json({ error: 'Planet not found' });
  } catch (err) { return next(err); }
});

module.exports = router;
