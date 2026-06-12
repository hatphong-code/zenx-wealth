// Direction 1 — "Tĩnh" (Zen minimal, light). Exports ZenMobile, ZenDesktop.
(function () {
  const { fmtVND, fmtShort, user, phase, month, cashflow, savingsRate, netWorth, latte, emergency, pyf, roadmap, focus, trend } = window.ZX;

  if (!document.getElementById('zx-zen-css')) {
    const s = document.createElement('style');
    s.id = 'zx-zen-css';
    s.textContent = `
    .zx-zen{--paper:#FAF8F3;--ink:#26302B;--soft:#7C857F;--line:#E7E2D7;--sage:#4F6F5E;--sage-soft:#EAEFEA;--red:#A8543E;
      font-family:'Hanken Grotesk',system-ui,sans-serif;color:var(--ink);background:var(--paper);height:100%;width:100%;
      -webkit-font-smoothing:antialiased;letter-spacing:.005em;}
    .zx-zen .serif{font-family:'Newsreader',Georgia,serif;font-weight:400;letter-spacing:-.01em;}
    .zx-zen .eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--soft);font-weight:600;}
    .zx-zen .hair{height:1px;background:var(--line);border:0;}
    .zx-zen .chip{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--sage);
      background:var(--sage-soft);padding:5px 11px;border-radius:999px;font-weight:600;}
    .zx-zen .dot{width:6px;height:6px;border-radius:50%;background:var(--sage);}
    .zx-zen .bar{height:3px;border-radius:2px;background:var(--line);overflow:hidden;}
    .zx-zen .bar>span{display:block;height:100%;background:var(--sage);border-radius:2px;}
    .zx-zen .statbar{height:2px;background:var(--line);}
    .zx-zen .up{color:var(--sage);} .zx-zen .down{color:var(--red);}
    .zx-zen .navitem{font-size:14px;color:var(--soft);padding:8px 0;cursor:default;}
    .zx-zen .navitem.on{color:var(--ink);font-weight:600;}
    `;
    document.head.appendChild(s);
  }

  const ePct = Math.round((emergency.months / emergency.target) * 100);
  const pPct = Math.round((pyf.saved / pyf.target) * 100);

  // ── tiny sparkline ──
  function Spark({ w = 100, h = 28, stroke = '#4F6F5E' }) {
    const max = Math.max(...trend), min = Math.min(...trend);
    const pts = trend.map((v, i) => {
      const x = (i / (trend.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return (
      <svg width={w} height={h} style={{ display: 'block' }}>
        <polyline points={pts.join(' ')} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={w} cy={pts[pts.length - 1].split(',')[1]} r="2.4" fill={stroke} />
      </svg>
    );
  }

  function StatusBar() {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 26px 0', fontSize: 13, fontWeight: 600, color: '#26302B' }}>
        <span>9:41</span>
        <span style={{ display: 'flex', gap: 5, alignItems: 'center', opacity: .85 }}>
          <span style={{ letterSpacing: '.08em' }}>▮▮▮</span>
          <span style={{ fontSize: 12 }}>56%</span>
        </span>
      </div>
    );
  }

  function MetricRow({ label, value, sub, subClass }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '17px 0' }}>
        <div style={{ fontSize: 14, color: 'var(--soft)' }}>{label}</div>
        <div style={{ textAlign: 'right' }}>
          <div className="serif" style={{ fontSize: 20 }}>{value}</div>
          {sub && <div className={subClass} style={{ fontSize: 12, marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
    );
  }

  function ZenMobile() {
    return (
      <div className="zx-zen" style={{ display: 'flex', flexDirection: 'column' }}>
        <StatusBar />
        <div style={{ padding: '22px 26px 30px' }}>
          {/* header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="serif" style={{ fontSize: 19, fontWeight: 500 }}>ZenX<span style={{ color: 'var(--sage)' }}>.</span></span>
            <span className="chip"><span className="dot" />{phase.label}</span>
          </div>

          {/* greeting + hero */}
          <div style={{ marginTop: 34 }}>
            <div style={{ fontSize: 15, color: 'var(--soft)' }}>{user.greeting},</div>
            <div className="serif" style={{ fontSize: 26, marginTop: 2 }}>{user.name}.</div>
          </div>

          <div style={{ marginTop: 30 }}>
            <div className="eyebrow">Dòng tiền ròng · {month}</div>
            <div className="serif" style={{ fontSize: 46, lineHeight: 1.04, marginTop: 12, color: 'var(--sage)' }}>
              +{fmtShort(cashflow.net)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--soft)' }}>Thu {fmtShort(cashflow.income)} · Chi {fmtShort(cashflow.expense)}</span>
              <Spark w={70} h={22} />
            </div>
          </div>

          {/* savings rate calm line */}
          <div style={{ marginTop: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: 'var(--soft)' }}>Tỷ lệ tiết kiệm</span>
              <span style={{ fontWeight: 600 }}>{Math.round(savingsRate * 100)}%</span>
            </div>
            <div className="bar"><span style={{ width: `${savingsRate * 100}%` }} /></div>
          </div>

          <hr className="hair" style={{ margin: '26px 0 2px' }} />

          <MetricRow label="Latte Factor" value={fmtShort(latte.amount)} sub={`↓ 18% · ${latte.topCategory}`} subClass="up" />
          <hr className="hair" />
          <MetricRow label="Quỹ dự phòng" value={`${emergency.months} / ${emergency.target} tháng`} sub={`${ePct}% chặng đường`} subClass="" />
          <hr className="hair" />
          <MetricRow label="Trả mình trước" value={`${pPct}%`} sub={`${fmtShort(pyf.saved)} / ${fmtShort(pyf.target)}`} subClass="" />

          {/* focus */}
          <div style={{ marginTop: 30 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Tiêu điểm tuần này</div>
            {focus.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '9px 0' }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--sage)', flex: '0 0 auto' }} />
                <span style={{ fontSize: 14.5, flex: 1 }}>{f.text}</span>
                <span className="serif" style={{ fontSize: 15, color: 'var(--sage)' }}>{fmtShort(f.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function ZenDesktop() {
    const navs = ['Tổng quan', 'Giao dịch', 'Latte Factor', 'Lộ trình', 'Quỹ dự phòng', 'Review tuần'];
    return (
      <div className="zx-zen" style={{ display: 'flex' }}>
        {/* rail */}
        <div style={{ width: 224, flex: '0 0 auto', borderRight: '1px solid var(--line)', padding: '40px 30px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          <span className="serif" style={{ fontSize: 22, fontWeight: 500 }}>ZenX<span style={{ color: 'var(--sage)' }}>.</span></span>
          <div style={{ marginTop: 38, display: 'flex', flexDirection: 'column' }}>
            {navs.map((n, i) => <div key={n} className={'navitem' + (i === 0 ? ' on' : '')}>{n}</div>)}
          </div>
          <div style={{ marginTop: 'auto' }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Tài sản ròng</div>
            <div className="serif" style={{ fontSize: 24 }}>{fmtShort(netWorth)}</div>
          </div>
        </div>

        {/* main */}
        <div style={{ flex: 1, padding: '46px 56px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 15, color: 'var(--soft)' }}>{user.greeting},</div>
              <div className="serif" style={{ fontSize: 32, marginTop: 2 }}>{user.name}.</div>
            </div>
            <span className="chip"><span className="dot" />{phase.label} · {phase.name}</span>
          </div>

          {/* hero + savings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 56, marginTop: 46, alignItems: 'end' }}>
            <div>
              <div className="eyebrow">Dòng tiền ròng · {month}</div>
              <div className="serif" style={{ fontSize: 76, lineHeight: 1, marginTop: 16, color: 'var(--sage)' }}>+{fmtShort(cashflow.net)}</div>
              <div style={{ fontSize: 14, color: 'var(--soft)', marginTop: 14 }}>Thu nhập {fmtVND(cashflow.income)} · Chi tiêu {fmtVND(cashflow.expense)}</div>
            </div>
            <div style={{ paddingBottom: 6 }}>
              <Spark w={300} h={64} />
              <div style={{ fontSize: 12, color: 'var(--soft)', marginTop: 8 }}>6 tháng gần nhất · dòng tiền dương đều</div>
            </div>
          </div>

          <hr className="hair" style={{ margin: '44px 0 0' }} />

          {/* metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
            {[
              { l: 'Latte Factor', v: fmtShort(latte.amount), s: '↓ 18% tháng', sc: 'up' },
              { l: 'Quỹ dự phòng', v: `${emergency.months}/${emergency.target} th`, s: `${ePct}% mục tiêu`, sc: '' },
              { l: 'Trả mình trước', v: `${pPct}%`, s: fmtShort(pyf.saved), sc: '' },
              { l: 'Tỷ lệ tiết kiệm', v: `${Math.round(savingsRate * 100)}%`, s: 'của thu nhập', sc: '' },
            ].map((m, i) => (
              <div key={i} style={{ padding: '28px 28px 28px 0', borderRight: i < 3 ? '1px solid var(--line)' : 'none', paddingLeft: i ? 28 : 0 }}>
                <div style={{ fontSize: 13, color: 'var(--soft)' }}>{m.l}</div>
                <div className="serif" style={{ fontSize: 30, marginTop: 12 }}>{m.v}</div>
                <div className={m.sc} style={{ fontSize: 12.5, marginTop: 6, color: m.sc ? '' : 'var(--soft)' }}>{m.s}</div>
              </div>
            ))}
          </div>

          <hr className="hair" style={{ margin: '0 0 40px' }} />

          {/* focus + roadmap */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 18 }}>Tiêu điểm tuần này</div>
              {focus.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0' }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--sage)', flex: '0 0 auto' }} />
                  <span style={{ fontSize: 15, flex: 1 }}>{f.text}</span>
                  <span className="serif" style={{ fontSize: 16, color: 'var(--sage)' }}>{fmtShort(f.amount)}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 18 }}>Lộ trình</div>
              {roadmap.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '8px 0' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', flex: '0 0 auto',
                    background: r.done ? 'var(--sage)' : r.active ? 'transparent' : 'var(--line)',
                    border: r.active ? '1.5px solid var(--sage)' : 'none' }} />
                  <span style={{ fontSize: 14, color: r.done ? 'var(--soft)' : r.active ? 'var(--ink)' : 'var(--soft)', fontWeight: r.active ? 600 : 400, textDecoration: r.done ? 'line-through' : 'none' }}>{r.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, { ZenMobile, ZenDesktop });
})();
