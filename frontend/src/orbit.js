// Keplerian orbital mechanics for real-time planet positions.
export const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
const rad = (d) => (d * Math.PI) / 180;

export function normalizeAngle(a) {
  const t = a % (2 * Math.PI);
  return t > Math.PI ? t - 2 * Math.PI : t < -Math.PI ? t + 2 * Math.PI : t;
}

/** Solve Kepler's equation M = E - e sin E with Newton–Raphson. */
export function solveKepler(M, e) {
  let E = e < 0.8 ? M : Math.sign(M) * Math.PI;
  for (let i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}

/** Heliocentric position in AU (ecliptic plane) at a given epoch in ms. */
export function planetPosition(orbit, ms) {
  const { a, e, L0, varpi, periodDays } = orbit;
  const days = (ms - J2000) / 86400000;
  const M = normalizeAngle(rad(L0 - varpi) + (2 * Math.PI * days) / periodDays);
  const E = solveKepler(M, e);
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const r = a * (1 - e * Math.cos(E));
  const lon = nu + rad(varpi);
  return { x: r * Math.cos(lon), y: r * Math.sin(lon), r, lon };
}

/** Orbital speed in km/s (vis-viva), distance and semi-major axis in AU. */
export const orbitalSpeed = (r, a) => 29.7847 * Math.sqrt(2 / r - 1 / a);

/** Non-linear display scale so inner and outer planets both fit on screen. */
export const displayRadius = (au) => Math.pow(au, 0.55) * 120;

export function toDisplay(pos) {
  const k = pos.r === 0 ? 0 : displayRadius(pos.r) / pos.r;
  return { x: pos.x * k, y: pos.y * k };
}

export function orbitPath(orbit, steps = 180) {
  const { a, e, varpi } = orbit;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const nu = (i / steps) * 2 * Math.PI;
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
    const lon = nu + rad(varpi);
    return toDisplay({ x: r * Math.cos(lon), y: r * Math.sin(lon), r });
  });
}
