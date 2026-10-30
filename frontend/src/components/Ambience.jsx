import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Decorative motion layer behind the trip pages: waves, leaves, snow or sun depending on the trip's mood.
// It sits under the paper (z-index -1), never catches clicks and is hidden from assistive technology.

export const AMBIENCE_LABELS = { vagues: 'Vagues', feuilles: 'Feuilles', neige: 'Neige', soleil: 'Soleil' };

const WINTER = [12, 1, 2];

export function ambienceFor(preferences) {
  const month = Number(preferences.start_date?.slice(5, 7));
  if (preferences.style === 'plage') return 'vagues';
  if (WINTER.includes(month)) return 'neige';
  if (preferences.style === 'nature') return 'feuilles';
  return 'soleil';
}

const STORAGE_KEY = 'runaway.ambiance';

export function useAmbiencePaused() {
  const [paused, setPaused] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'pause'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, paused ? 'pause' : 'on'); } catch { /* storage unavailable */ }
  }, [paused]);
  return [paused, setPaused];
}

// Stable pseudo-random values so particles keep their place between renders.
function seeded(index, salt) {
  const x = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function particles(count) {
  return Array.from({ length: count }, (_, i) => ({
    left: `${(seeded(i, 1) * 100).toFixed(2)}%`,
    size: seeded(i, 2),
    duration: seeded(i, 3),
    delay: seeded(i, 4),
    drift: seeded(i, 5) - 0.5,
    tone: i % 3,
  }));
}

const LEAVES = particles(18);
const FLAKES = particles(42);
const SPARKS = particles(9);

function Leaf() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2C19 7 19.5 15.5 12 22 4.5 15.5 5 7 12 2Z" />
      <path d="M12 5v15M12 10l-3-2.5M12 14l3.2-2.6" className="leaf-vein" />
    </svg>
  );
}

function Particles({ items, kind, render }) {
  return (
    <div className={`ambience-particles ${kind}`}>
      {items.map((p, i) => (
        <span key={i} className={`particle tone-${p.tone}`} style={{
          left: p.left,
          '--size': p.size,
          '--duration': `${(kind === 'leaves' ? 13 : 10) + p.duration * 12}s`,
          '--delay': `${-p.delay * 24}s`,
          '--drift': `${p.drift * 30}vw`,
        }}>
          <span className="particle-inner">{render(i)}</span>
        </span>
      ))}
    </div>
  );
}

// A periodic path twice the viewport wide: sliding it by half loops seamlessly.
function wavePath(height, amplitude, wavelength, periods) {
  const half = wavelength / 2;
  let d = `M0 ${amplitude} q${half / 2} ${-amplitude} ${half} 0 t${half} 0`;
  for (let i = 1; i < periods; i += 1) d += ` t${half} 0 t${half} 0`;
  return `${d} V${height} H0Z`;
}

function Waves() {
  const layers = [['back', 26, 480], ['mid', 18, 360], ['front', 12, 240]];
  return (
    <div className="ambience-waves">
      {layers.map(([name, amplitude, wavelength]) => (
        <svg key={name} className={`wave wave-${name}`} viewBox="0 0 2880 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d={wavePath(120, amplitude, wavelength, 2880 / wavelength)} />
        </svg>
      ))}
    </div>
  );
}

function Sun() {
  return (
    <>
      <svg className="ambience-sun" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
        <g className="sun-rays">
          {Array.from({ length: 16 }, (_, i) => (
            <path key={i} d="M200 18 L200 70" transform={`rotate(${i * 22.5} 200 200)`} />
          ))}
        </g>
        <circle cx="200" cy="200" r="150" className="sun-halo" />
        <circle cx="200" cy="200" r="104" className="sun-core" />
      </svg>
      <Particles items={SPARKS} kind="sparks" render={() => (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2l2 8 8 2-8 2-2 8-2-8-8-2 8-2z" /></svg>
      )} />
    </>
  );
}

export function Ambience({ mood, paused }) {
  return createPortal(
    <div className={`ambience ambience-${mood}`} data-paused={paused || undefined} aria-hidden="true">
      {mood === 'vagues' && <Waves />}
      {mood === 'feuilles' && <Particles items={LEAVES} kind="leaves" render={() => <Leaf />} />}
      {mood === 'neige' && <Particles items={FLAKES} kind="snow" render={i => (i % 4 ? <i className="flake-dot" /> : (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" /></svg>
      ))} />}
      {mood === 'soleil' && <Sun />}
    </div>,
    document.body,
  );
}
