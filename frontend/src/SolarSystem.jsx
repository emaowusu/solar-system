import { useEffect, useRef } from 'react';
import { planetPosition, orbitPath, toDisplay } from './orbit';

const PALETTE = {
  dark: { top: '#02040a', bottom: '#0b1330', orbit: 'rgba(150,180,255,0.22)', label: '#eaf0ff', star: '255,255,255' },
  light: { top: '#f4f7ff', bottom: '#cbd8f2', orbit: 'rgba(30,50,110,0.30)', label: '#101a38', star: '40,60,120' },
};
export const MIN_ZOOM = 0.15;
export const MAX_ZOOM = 60;
const bodySize = (km) => 3 + 5 * Math.log10(Math.max(km, 2400) / 2400);

export default function SolarSystem({ planets, selectedId, onSelect, theme, view, sim, onTick }) {
  const canvasRef = useRef(null);
  const live = useRef({});
  live.current = { theme, selectedId, onSelect, onTick };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const images = {};
    planets.forEach((p) => { const im = new Image(); im.src = `/planets/${p.texture}`; images[p.id] = im; });
    const paths = {};
    planets.forEach((p) => { if (p.orbit) paths[p.id] = orbitPath(p.orbit); });
    const stars = Array.from({ length: 280 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.3 + 0.2, a: Math.random() * 0.7 + 0.2 }));
    let hits = [], W = 0, H = 0, raf, last = performance.now(), lastTick = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    function drawTexture(img, x, y, r, spin) {
      if (!img.complete || !img.naturalWidth) { ctx.fillStyle = '#888'; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); return; }
      const iw = img.naturalWidth, ih = img.naturalHeight, sw = iw / 2;
      const off = ((spin % 1) + 1) % 1 * iw;
      const first = Math.min(sw, iw - off);
      ctx.drawImage(img, off, 0, first, ih, x - r, y - r, (2 * r * first) / sw, 2 * r);
      if (first < sw) ctx.drawImage(img, 0, 0, sw - first, ih, x - r + (2 * r * first) / sw, y - r, (2 * r * (sw - first)) / sw, 2 * r);
    }

    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const s = sim.current, v = view.current, pal = PALETTE[live.current.theme] || PALETTE.dark;
      if (!s.paused) s.ms += dt * 1000 * s.mult;
      v.zoom += (v.targetZoom - v.zoom) * Math.min(1, dt * 8);

      const bodies = planets.map((p) => ({ p, w: p.orbit ? toDisplay(planetPosition(p.orbit, s.ms)) : { x: 0, y: 0 } }));
      const f = v.follow && bodies.find((b) => b.p.id === v.follow);
      if (f) {
        v.px += (-f.w.x * v.zoom - v.px) * Math.min(1, dt * 6);
        v.py += (f.w.y * v.zoom - v.py) * Math.min(1, dt * 6);
      }
      const cx = W / 2 + v.px, cy = H / 2 + v.py;
      const scr = (w) => ({ x: cx + w.x * v.zoom, y: cy - w.y * v.zoom });

      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, pal.top); g.addColorStop(1, pal.bottom);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (const st of stars) { ctx.fillStyle = `rgba(${pal.star},${st.a * (live.current.theme === 'light' ? 0.35 : 1)})`; ctx.fillRect(st.x * W, st.y * H, st.s, st.s); }

      ctx.lineWidth = 1; ctx.strokeStyle = pal.orbit;
      for (const b of bodies) {
        const path = paths[b.p.id]; if (!path) continue;
        ctx.beginPath();
        path.forEach((pt, i) => { const q = scr(pt); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
        ctx.stroke();
      }

      hits = [];
      const sunScr = scr({ x: 0, y: 0 });
      const zs = Math.pow(v.zoom, 0.45);
      // draw far-to-near so nothing important is hidden
      for (const b of [...bodies].sort((a, c) => (a.p.id === 'sun' ? -1 : c.p.id === 'sun' ? 1 : 0))) {
        const { p } = b, q = scr(b.w), isSun = p.id === 'sun';
        const r = isSun ? 24 * Math.pow(v.zoom, 0.4) : Math.max(2.5, bodySize(p.radiusKm) * zs);
        if (q.x < -200 || q.x > W + 200 || q.y < -200 || q.y > H + 200) continue;
        const spin = now / (30000 + r * 900) + planets.indexOf(p) * 0.13;

        if (isSun) {
          const glow = ctx.createRadialGradient(q.x, q.y, r * 0.6, q.x, q.y, r * 4.5);
          glow.addColorStop(0, 'rgba(255,190,70,0.55)'); glow.addColorStop(1, 'rgba(255,140,0,0)');
          ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(q.x, q.y, r * 4.5, 0, 7); ctx.fill();
        }
        if (p.rings) { ctx.strokeStyle = 'rgba(214,190,140,0.75)'; ctx.lineWidth = r * 0.55; ctx.beginPath(); ctx.ellipse(q.x, q.y, r * 1.95, r * 0.55, -0.35, Math.PI, 2 * Math.PI); ctx.stroke(); }
        ctx.save(); ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.clip();
        drawTexture(images[p.id], q.x, q.y, r, spin);
        if (!isSun) {
          const dx = sunScr.x - q.x, dy = sunScr.y - q.y, d = Math.hypot(dx, dy) || 1;
          const sh = ctx.createRadialGradient(q.x + (dx / d) * r * 0.45, q.y + (dy / d) * r * 0.45, r * 0.15, q.x, q.y, r * 1.05);
          sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.82)');
          ctx.fillStyle = sh; ctx.fillRect(q.x - r, q.y - r, 2 * r, 2 * r);
        }
        ctx.restore();
        if (p.rings) { ctx.strokeStyle = 'rgba(214,190,140,0.85)'; ctx.lineWidth = r * 0.55; ctx.beginPath(); ctx.ellipse(q.x, q.y, r * 1.95, r * 0.55, -0.35, 0, Math.PI); ctx.stroke(); }

        if (live.current.selectedId === p.id) { ctx.strokeStyle = '#4da3ff'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(q.x, q.y, r + 8, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
        ctx.font = `${live.current.selectedId === p.id ? 600 : 500} 12px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.fillStyle = pal.label;
        ctx.shadowColor = live.current.theme === 'dark' ? '#000' : '#fff'; ctx.shadowBlur = 4;
        ctx.fillText(p.name, q.x, q.y + r + (p.rings ? 20 : 16) + (isSun ? 10 : 0));
        ctx.shadowBlur = 0;
        hits.push({ id: p.id, x: q.x, y: q.y, r: Math.max(r * (p.rings ? 2 : 1), 12) });
      }
      if (now - lastTick > 200) { lastTick = now; live.current.onTick?.(s.ms); }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // --- interaction: wheel zoom, drag pan, pinch zoom, click select ---
    const pointers = new Map();
    let moved = 0, pinch = 0;
    const pick = (e) => {
      const rect = canvas.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
      return [...hits].reverse().find((h) => Math.hypot(h.x - x, h.y - y) <= h.r + 4)?.id ?? null;
    };
    const zoomAt = (factor, x, y) => {
      const v = view.current, z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor)), ratio = z / v.zoom;
      const ox = x - W / 2, oy = y - H / 2;
      if (!v.follow) { v.px = ox - (ox - v.px) * ratio; v.py = oy - (oy - v.py) * ratio; }
      v.zoom = z; v.targetZoom = z;
    };
    const onWheel = (e) => { e.preventDefault(); const r = canvas.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top); };
    const onDown = (e) => { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; };
    const onMove = (e) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) { canvas.style.cursor = pick(e) ? 'pointer' : 'grab'; return; }
      const cur = { x: e.clientX, y: e.clientY };
      if (pointers.size === 2) {
        pointers.set(e.pointerId, cur);
        const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) { const r = canvas.getBoundingClientRect(); zoomAt(d / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); }
        pinch = d; moved = 99; return;
      }
      moved += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);
      if (moved > 5) { view.current.follow = null; view.current.px += cur.x - prev.x; view.current.py += cur.y - prev.y; }
      pointers.set(e.pointerId, cur);
    };
    const onUp = (e) => {
      pointers.delete(e.pointerId); pinch = 0;
      if (moved <= 5) live.current.onSelect(pick(e));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [planets, view, sim]);

  return <canvas ref={canvasRef} className="space" aria-label="Interactive solar system" />;
}
