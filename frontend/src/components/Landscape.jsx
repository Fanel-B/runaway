// Original decorative SVG scenes, one per trip mood. They never depict a verified place.

function Birds({ x, y }) {
  return (
    <g className="ls-stroke-ink ls-birds" fill="none" strokeWidth="2.5" strokeLinecap="round">
      <path d={`M${x} ${y} q10 -9 20 0 q10 -9 20 0`} />
      <path d={`M${x + 58} ${y + 26} q7 -6 14 0 q7 -6 14 0`} />
    </g>
  );
}

function Route({ d, stops }) {
  return (
    <g>
      <path d={d} className="ls-route" fill="none" strokeWidth="5" strokeDasharray="1 14" strokeLinecap="round" />
      {stops.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="9" className="ls-fill-coral ls-stroke-cream" strokeWidth="3" />)}
    </g>
  );
}

function Waves({ rows }) {
  return (
    <g className="ls-stroke-cream ls-waves" fill="none" strokeWidth="3" strokeLinecap="round" opacity="0.75">
      {rows.map(([x, y]) => <path key={`${x}-${y}`} d={`M${x} ${y} q20 -10 40 0 t40 0`} />)}
    </g>
  );
}

function Boat({ x, y }) {
  return (
    <g>
      <path d={`M${x - 35} ${y} h70 l-12 14 h-46z`} className="ls-fill-ink" />
      <path d={`M${x} ${y - 2} V${y - 54} L${x + 33} ${y - 4}z`} className="ls-fill-cream" />
    </g>
  );
}

function Equilibre() {
  const houses = [[150, 200, 54, 46], [214, 190, 40, 56], [262, 206, 60, 40], [330, 214, 44, 34]];
  return (
    <>
      <rect width="1440" height="420" className="ls-fill-rose" />
      <circle cx="1120" cy="170" r="160" fill="none" className="ls-stroke-ink" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="2 10" />
      <circle cx="1120" cy="170" r="120" className="ls-fill-sun" />
      <Birds x={860} y={60} />
      <path d="M0 170 C 200 110, 360 120, 520 170 S 820 230, 980 175 S 1260 120, 1440 165 V420 H0Z" className="ls-fill-cobalt-soft" />
      <rect y="215" width="1440" height="205" className="ls-fill-cobalt" />
      <Waves rows={[[560, 262], [640, 300], [860, 250], [520, 330], [940, 300]]} />
      <Boat x={705} y={250} />
      {houses.map(([x, y, w, h], i) => (
        <g key={x}>
          <rect x={x} y={y} width={w} height={h + 40} className={i % 2 ? 'ls-fill-sun' : 'ls-fill-coral'} />
          <path d={`M${x - 4} ${y} L${x + w / 2} ${y - 22} L${x + w + 4} ${y}z`} className="ls-fill-ink" />
          <rect x={x + w / 2 - 6} y={y + 12} width="12" height="16" rx="6" className="ls-fill-cream" />
        </g>
      ))}
      <path d="M0 250 C 150 225, 330 235, 500 250 S 700 350, 740 420 H0Z" className="ls-fill-sage" />
      <path d="M780 420 C 880 320, 1040 290, 1200 300 S 1380 280, 1440 270 V420Z" className="ls-fill-ink" />
      {[[1010, 286], [1048, 280], [1290, 266]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="20" className="ls-fill-sage" />)}
      <Route d="M860 420 C 930 370, 1000 350, 1080 340 S 1250 320, 1340 300" stops={[[1080, 340], [1340, 300]]} />
    </>
  );
}

function Nature() {
  const pines = [[200, 262, 14], [228, 270, 11], [1100, 262, 15], [1130, 268, 11], [1160, 262, 13]];
  return (
    <>
      <rect width="1440" height="420" className="ls-fill-sun" />
      <circle cx="360" cy="150" r="100" className="ls-fill-cream" />
      <Birds x={620} y={60} />
      <path d="M0 260 L160 150 L260 210 L420 80 L560 220 L700 140 L820 230 L990 90 L1130 210 L1250 150 L1440 240 V420 H0Z" className="ls-fill-cobalt" />
      <path d="M381 112 L420 80 L452 112 L432 104 L418 116 L400 104Z M954 120 L990 90 L1025 120 L1004 112 L988 126 L970 112Z" className="ls-fill-cream" />
      <path d="M0 300 C 180 230, 330 250, 480 290 S 780 330, 940 280 S 1240 230, 1440 290 V420 H0Z" className="ls-fill-sage" />
      {pines.map(([x, y, s]) => <path key={x} d={`M${x} ${y - s * 2.4} L${x - s} ${y} L${x + s} ${y}z`} className="ls-fill-ink" />)}
      <path d="M0 360 C 240 320, 520 330, 760 370 S 1160 360, 1440 330 V420 H0Z" className="ls-fill-ink" />
      <Route d="M90 420 C 160 380, 260 350, 380 330 S 620 300, 760 290" stops={[[380, 330], [760, 290]]} />
    </>
  );
}

function Plage() {
  return (
    <>
      <rect width="1440" height="420" className="ls-fill-sky" />
      <circle cx="1080" cy="140" r="95" className="ls-fill-coral" />
      <Birds x={520} y={80} />
      <path d="M860 210 C 960 160, 1080 160, 1180 185 S 1360 190, 1440 170 V230 H860Z" className="ls-fill-sage" />
      <rect y="210" width="1440" height="210" className="ls-fill-cobalt" />
      <Waves rows={[[420, 250], [600, 280], [800, 245], [1000, 270], [1200, 300], [700, 320]]} />
      <Boat x={760} y={262} />
      <path d="M0 140 C 90 130, 170 150, 220 200 C 260 240, 250 300, 290 420 H0Z" className="ls-fill-ink" />
      <path d="M0 360 C 300 320, 600 330, 900 350 S 1260 360, 1440 340 V420 H0Z" className="ls-fill-sun" />
      <path d="M980 300 L984 360" className="ls-stroke-ink" strokeWidth="4" strokeLinecap="round" />
      <path d="M928 306 Q980 258 1032 306Z" className="ls-fill-coral" />
      <path d="M980 268 L962 306 M980 268 L998 306" className="ls-stroke-cream" strokeWidth="4" />
      <rect x="1040" y="352" width="76" height="22" rx="3" className="ls-fill-rose" transform="rotate(-6 1078 363)" />
      <Route d="M140 420 C 300 392, 460 382, 640 376 S 860 366, 940 362" stops={[[640, 376]]} />
    </>
  );
}

function Culture() {
  const houses = [[0, 90, 120], [90, 70, 150], [160, 110, 110], [270, 80, 160], [350, 100, 125], [450, 70, 170],
    [520, 120, 115], [640, 80, 145], [720, 100, 130], [820, 70, 160], [890, 110, 120], [1000, 80, 150],
    [1080, 100, 118], [1180, 70, 165], [1250, 110, 128], [1360, 80, 150]];
  const fills = ['ls-fill-coral', 'ls-fill-rose', 'ls-fill-sun', 'ls-fill-cream'];
  return (
    <>
      <rect width="1440" height="420" className="ls-fill-sage" />
      <circle cx="1150" cy="130" r="100" className="ls-fill-sun" />
      <Birds x={300} y={70} />
      <path d="M0 230 H80 V180 H140 V210 H200 V150 H240 V120 H260 V150 H300 V200 H380 V170 H470 V215 H560 V160 H620 V190 H700 V140 H730 V110 H750 V140 H780 V200 H880 V170 H960 V210 H1040 V160 H1100 V200 H1200 V150 H1260 V190 H1340 V170 H1440 V420 H0Z" className="ls-fill-cobalt-soft" />
      <circle cx="515" cy="168" r="44" className="ls-fill-cobalt-soft" />
      {houses.map(([x, w, h], i) => {
        const top = 420 - h;
        return (
          <g key={x}>
            <path d={`M${x} 420 V${top} L${x + w / 2} ${top - w * 0.35} L${x + w} ${top} V420z`} className={fills[i % fills.length]} />
            <rect x={x + w * 0.22} y={top + 28} width={w * 0.18} height="24" rx="3" className="ls-fill-ink" />
            <rect x={x + w * 0.6} y={top + 28} width={w * 0.18} height="24" rx="3" className="ls-fill-ink" />
          </g>
        );
      })}
      <rect y="372" width="1440" height="48" className="ls-fill-ink" />
      <Route d="M40 396 H1400" stops={[[420, 396], [980, 396]]} />
    </>
  );
}

const SCENES = { equilibre: Equilibre, nature: Nature, plage: Plage, culture: Culture };

export function Landscape({ variant = 'equilibre', className = '' }) {
  const Scene = SCENES[variant] || Equilibre;
  return (
    <svg className={`landscape ${className}`} viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice"
      aria-hidden="true" focusable="false">
      <Scene />
    </svg>
  );
}
