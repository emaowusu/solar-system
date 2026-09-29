import { describe, expect, test, vi, afterEach } from 'vitest';
import { J2000, solveKepler, planetPosition, orbitalSpeed, orbitPath, displayRadius } from './orbit';
import { request } from './api';

const earth = { a: 1.0, e: 0.0167, L0: 100.46, varpi: 102.94, periodDays: 365.256 };
const mars = { a: 1.5237, e: 0.0934, L0: 355.45, varpi: 336.04, periodDays: 686.98 };

describe('orbit maths', () => {
  test('Kepler solver satisfies M = E - e sin E', () => {
    for (const e of [0, 0.0167, 0.2056, 0.9]) {
      for (const M of [-3, -1, 0, 0.5, 2.9]) {
        const E = solveKepler(M, e);
        expect(E - e * Math.sin(E)).toBeCloseTo(M, 9);
      }
    }
  });

  test('Earth distance at 2000-01-03 is near perihelion (~0.983 AU)', () => {
    const p = planetPosition(earth, Date.UTC(2000, 0, 3));
    expect(p.r).toBeGreaterThan(0.981);
    expect(p.r).toBeLessThan(0.986);
  });

  test('distance always stays between perihelion and aphelion', () => {
    for (let d = 0; d < 700; d += 7) {
      const { r } = planetPosition(mars, J2000 + d * 86400000);
      expect(r).toBeGreaterThanOrEqual(mars.a * (1 - mars.e) - 1e-9);
      expect(r).toBeLessThanOrEqual(mars.a * (1 + mars.e) + 1e-9);
    }
  });

  test('position repeats after one orbital period', () => {
    const t = Date.UTC(2026, 5, 1);
    const a = planetPosition(earth, t);
    const b = planetPosition(earth, t + earth.periodDays * 86400000);
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.y).toBeCloseTo(a.y, 6);
  });

  test("Earth's orbital speed is about 29.8 km/s", () => {
    expect(orbitalSpeed(1, 1)).toBeCloseTo(29.78, 1);
  });

  test('display scale is monotonic and orbit paths are closed', () => {
    expect(displayRadius(30)).toBeGreaterThan(displayRadius(1));
    const path = orbitPath(mars, 90);
    expect(path).toHaveLength(91);
    expect(path[0].x).toBeCloseTo(path[90].x, 6);
  });
});

describe('api client', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('sends bearer token and parses JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ hello: 'world' }) });
    vi.stubGlobal('fetch', fetchMock);
    const data = await request('/planets', { token: 'abc' });
    expect(data).toEqual({ hello: 'world' });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
  });

  test('throws with server error message and status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'Nope' }) }));
    await expect(request('/x', { token: null })).rejects.toMatchObject({ message: 'Nope', status: 401 });
  });
});
