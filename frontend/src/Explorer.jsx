import { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus, Pause, Play, LocateFixed, X, Loader2 } from 'lucide-react';
import SolarSystem, { MAX_ZOOM, MIN_ZOOM } from './SolarSystem';
import { orbitalSpeed, planetPosition } from './orbit';
import { request } from './api';
import { useAuth } from './AuthContext';

const SPEEDS = [
  { label: 'Live', mult: 1 }, { label: '1 day/s', mult: 86400 }, { label: '10 days/s', mult: 864000 },
  { label: '1 month/s', mult: 2629800 }, { label: '1 year/s', mult: 31557600 },
];
const AU_KM = 149.5978707;
const fmt = (n, d = 2) => n.toLocaleString(undefined, { maximumFractionDigits: d });

function LiveStats({ planet, ms }) {
  if (!planet.orbit) return null;
  const { r } = planetPosition(planet.orbit, ms);
  const light = (r * 499.005) / 60;
  return (
    <div className="live">
      <div className="live-title"><span className="dot" /> Live telemetry</div>
      <div className="grid">
        <div><b>{fmt(r, 4)} AU</b><span>{fmt(r * AU_KM, 1)} million km from Sun</span></div>
        <div><b>{fmt(orbitalSpeed(r, planet.orbit.a), 2)} km/s</b><span>Orbital speed</span></div>
        <div><b>{fmt(light, 1)} min</b><span>Sunlight travel time</span></div>
        <div><b>{fmt(planet.orbit.periodDays / 365.256, 2)} yr</b><span>Orbital period</span></div>
      </div>
    </div>
  );
}

function PlanetPanel({ planet, ms, onClose }) {
  const facts = [['Type', planet.type], ['Radius', `${fmt(planet.radiusKm, 1)} km`], ['Mass', planet.massKg], ['Gravity', planet.gravity],
    ['Day length', planet.dayLength], ['Moons', planet.moons], ['Temperature', planet.temperature]];
  return (
    <aside className="panel glass">
      <button className="icon-btn close" onClick={onClose} aria-label="Close details"><X size={18} /></button>
      <div className="hero-planet"><img src={`/planets/${planet.texture}`} alt={`${planet.name} surface map`} /></div>
      <h2>{planet.name}</h2>
      <p className="muted">{planet.description}</p>
      <LiveStats planet={planet} ms={ms} />
      <dl className="facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </aside>
  );
}

export default function Explorer({ theme }) {
  const { signout } = useAuth();
  const [planets, setPlanets] = useState([]);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [ms, setMs] = useState(Date.now());
  const [speedIdx, setSpeedIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const view = useRef({ zoom: 0.55, targetZoom: 0.55, px: 0, py: 0, follow: null });
  const sim = useRef({ ms: Date.now(), mult: 1, paused: false });

  useEffect(() => {
    request('/planets').then((d) => setPlanets(d.planets)).catch((e) => (e.status === 401 ? signout() : setError(e.message)));
  }, [signout]);

  const select = useCallback((id) => {
    setSelectedId(id);
    view.current.follow = id;
    if (id) view.current.targetZoom = Math.max(view.current.targetZoom, id === 'sun' ? 1.2 : 3.5);
  }, []);
  const zoomBy = (f) => { const v = view.current; v.targetZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.targetZoom * f)); };
  const reset = () => { Object.assign(view.current, { targetZoom: 0.55, px: 0, py: 0, follow: null }); setSelectedId(null); };
  const setSpeed = (i) => { sim.current.mult = SPEEDS[i].mult; if (i === 0) sim.current.ms = Date.now(); setSpeedIdx(i); };
  const togglePause = () => { sim.current.paused = !sim.current.paused; setPaused(sim.current.paused); };

  if (error) return <div className="center"><div className="error">{error}</div></div>;
  if (!planets.length) return <div className="center"><Loader2 className="spin" /> Loading solar system…</div>;
  const selected = planets.find((p) => p.id === selectedId);

  return (
    <main className="explorer">
      <SolarSystem planets={planets} selectedId={selectedId} onSelect={select} theme={theme} view={view} sim={sim} onTick={setMs} />
      <div className="hud glass">
        <div className="clock"><span className="dot" />{new Date(ms).toLocaleString(undefined, { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'medium' })} UTC</div>
        <div className="seg">
          <button className="icon-btn" onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>
          {SPEEDS.map((s, i) => <button key={s.label} className={i === speedIdx ? 'on' : ''} onClick={() => setSpeed(i)}>{s.label}</button>)}
        </div>
      </div>
      <div className="zoom glass">
        <button className="icon-btn" onClick={() => zoomBy(1.6)} aria-label="Zoom in"><Plus size={18} /></button>
        <button className="icon-btn" onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out"><Minus size={18} /></button>
        <button className="icon-btn" onClick={reset} aria-label="Reset view"><LocateFixed size={18} /></button>
      </div>
      <nav className="dock glass" aria-label="Bodies">
        {planets.map((p) => (
          <button key={p.id} className={p.id === selectedId ? 'on' : ''} onClick={() => select(p.id === selectedId ? null : p.id)}>
            <img src={`/planets/${p.texture}`} alt="" /><span>{p.name}</span>
          </button>
        ))}
      </nav>
      {selected && <PlanetPanel planet={selected} ms={ms} onClose={() => select(null)} />}
    </main>
  );
}
