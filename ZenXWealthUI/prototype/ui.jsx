// ZenX Wealth prototype — themed primitives + icons. Exports to window.
(function () {
  if (!document.getElementById('zxp-css')) {
    const s = document.createElement('style');
    s.id = 'zxp-css';
    s.textContent = `
    .zxp{font-family:var(--p-fbody);color:var(--p-ink);background:var(--p-bg);
      transition:background .5s ease,color .45s ease;-webkit-font-smoothing:antialiased;}
    .zxp .num{font-family:var(--p-fnum);font-weight:var(--p-numweight);font-variant-numeric:tabular-nums;letter-spacing:-.01em;line-height:1;}
    .zxp .head{font-family:var(--p-fhead);font-weight:var(--p-headweight);letter-spacing:-.01em;}
    .zxp .eyebrow{font-family:var(--p-fbody);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--p-soft);font-weight:600;}
    .zxp .card{background:var(--p-surface);border:var(--p-cardborder);border-radius:var(--p-radius);box-shadow:var(--p-shadow);
      transition:background .5s,border-color .5s,box-shadow .5s,transform .18s;}
    .zxp .card.clickable{cursor:pointer;}
    .zxp .card.clickable:hover{transform:translateY(-2px);}
    .zxp .soft{color:var(--p-soft);} .zxp .accent{color:var(--p-accent);} .zxp .pos{color:var(--p-pos);} .zxp .gold{color:var(--p-gold);}
    .zxp .pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:6px 12px;border-radius:999px;white-space:nowrap;}
    .zxp .bar{height:8px;border-radius:999px;background:var(--p-track);overflow:hidden;}
    .zxp .bar>span{display:block;height:100%;border-radius:999px;background:var(--p-fill);transition:width .7s cubic-bezier(.2,.7,.3,1);}
    .zxp .iconbox{display:flex;align-items:center;justify-content:center;background:var(--p-iconbg);border-radius:var(--p-radius-sm);flex:0 0 auto;
      transition:background .5s;}
    .zxp .screen{animation:zxpFade .42s cubic-bezier(.2,.7,.3,1);}
    @keyframes zxpFade{from{transform:translateY(10px)}to{transform:none}}
    @media (prefers-reduced-motion: reduce){.zxp .screen{animation:none}}
    .zxp .hairline{height:1px;background:var(--p-line);border:0;transition:background .5s;}
    `;
    document.head.appendChild(s);
  }

  const ICONS = {
    home: <><path d="M3 9.5L10 4l7 5.5V16a1 1 0 0 1-1 1h-3v-5H7v5H4a1 1 0 0 1-1-1V9.5Z" /></>,
    coffee: <><path d="M4 9h11v3.5A4.5 4.5 0 0 1 10.5 17h-2A4.5 4.5 0 0 1 4 12.5V9Z" /><path d="M15 10h1.5a2 2 0 0 1 0 4H15" /><path d="M7 3v2M10.5 3v2" /></>,
    food: <><path d="M5 3v6a2 2 0 0 0 2 2v6M5 3v4M7 3v4M14 3c-1.5 0-2 2-2 4s1 3 2 3v7" /></>,
    bag: <><path d="M5 7h10l-.8 9.2a1 1 0 0 1-1 .8H6.8a1 1 0 0 1-1-.8L5 7Z" /><path d="M7.5 7V5.5a2.5 2.5 0 0 1 5 0V7" /></>,
    play: <><rect x="3.5" y="4.5" width="13" height="11" rx="2.5" /><path d="M8.5 8l3.5 2-3.5 2V8Z" /></>,
    truck: <><path d="M2.5 6h8v7h-8z" /><path d="M10.5 8.5h3l2 2.5v2h-5z" /><circle cx="6" cy="15" r="1.4" /><circle cx="13.5" cy="15" r="1.4" /></>,
    shield: <path d="M10 3l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V5l6-2Z" />,
    piggy: <><path d="M3 11a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2a3 3 0 0 1-3 3h-1v1H7v-1a5 5 0 0 1-4-5Z" /><circle cx="13" cy="11" r=".8" /></>,
    trend: <><path d="M3 14l4-4 3 3 6-6" /><path d="M13 7h4v4" /></>,
    settings: <><circle cx="10" cy="10" r="2.6" /><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4" /></>,
    chevron: <path d="M7 4l5 6-5 6" />,
    arrow: <><path d="M4 10h11" /><path d="M11 6l4 4-4 4" /></>,
    sparkle: <path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6L10 3Z" />,
    wallet: <><rect x="3" y="5" width="14" height="11" rx="2.5" /><path d="M13 10h2.5" /><path d="M3 8h11a1 1 0 0 1 1 1v2" /></>,
    plus: <><path d="M10 4v12M4 10h12" /></>,
    check: <path d="M4 10.5l3.5 3.5L16 6" />,
    flag: <><path d="M5 3v14" /><path d="M5 4h9l-2 3 2 3H5" /></>,
    bell: <><path d="M6 8a4 4 0 0 1 8 0c0 4 1.5 5 1.5 5h-11S6 12 6 8Z" /><path d="M8.5 16a1.5 1.5 0 0 0 3 0" /></>,
  };

  function Icon({ name, size = 18, stroke = 1.7, fill = 'none', style }) {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill={fill === 'currentColor' ? 'currentColor' : 'none'}
        stroke={fill === 'currentColor' ? 'none' : 'currentColor'} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
        {ICONS[name] || null}
      </svg>
    );
  }

  function IconBox({ name, size = 38, color = 'var(--p-accent)', icon = 18, style }) {
    return (
      <div className="iconbox" style={{ width: size, height: size, color, ...style }}>
        <Icon name={name} size={icon} />
      </div>
    );
  }

  function Bar({ pct, style }) {
    return <div className="bar" style={style}><span style={{ width: Math.max(0, Math.min(100, pct)) + '%' }} /></div>;
  }

  function Sparkline({ data, w = 120, h = 36, color = 'var(--p-accent)', fillUnder = false, dot = true }) {
    const max = Math.max(...data), min = Math.min(...data);
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * (h - 6) - 3;
      return [x, y];
    });
    const line = pts.map((p) => p.join(',')).join(' ');
    const area = `0,${h} ${line} ${w},${h}`;
    const last = pts[pts.length - 1];
    const id = 'sg' + Math.random().toString(36).slice(2, 7);
    return (
      <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
        {fillUnder && (
          <>
            <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.18" /><stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient></defs>
            <polygon points={area} fill={`url(#${id})`} />
          </>
        )}
        <polyline points={line} fill="none" style={{ stroke: color }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {dot && <circle cx={last[0]} cy={last[1]} r="2.8" style={{ fill: color }} />}
      </svg>
    );
  }

  function Ring({ pct, size = 132, stroke = 11, color = 'var(--p-fill-color, var(--p-accent))', children }) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return (
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: 'var(--p-track)' }} strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: color, transition: 'stroke-dashoffset .9s cubic-bezier(.2,.7,.3,1)' }}
            strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
      </div>
    );
  }

  // segmented control (for in-app + presentation chrome)
  function Segmented({ value, onChange, options, dark }) {
    return (
      <div style={{ display: 'inline-flex', padding: 3, borderRadius: 999, gap: 2,
        background: dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.05)' }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button key={o.value} onClick={() => onChange(o.value)} style={{
              border: 'none', cursor: 'pointer', borderRadius: 999, padding: '7px 14px', fontSize: 12.5, fontWeight: 600,
              fontFamily: 'inherit', transition: 'all .2s', whiteSpace: 'nowrap',
              background: on ? (dark ? '#fff' : '#1A1714') : 'transparent',
              color: on ? (dark ? '#15263C' : '#fff') : (dark ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.55)') }}>
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  Object.assign(window, { ZXPIcon: Icon, ZXPIconBox: IconBox, ZXPBar: Bar, ZXPSparkline: Sparkline, ZXPRing: Ring, ZXPSegmented: Segmented });
})();
