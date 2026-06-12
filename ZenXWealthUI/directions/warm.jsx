// Direction 2 — "Ấm" (Warm / human, earth tones). Exports WarmMobile, WarmDesktop.
(function () {
  const { fmtVND, fmtShort, user, phase, month, cashflow, savingsRate, netWorth, latte, emergency, pyf, roadmap, focus } = window.ZX;

  if (!document.getElementById('zx-warm-css')) {
    const s = document.createElement('style');
    s.id = 'zx-warm-css';
    s.textContent = `
    .zx-warm{--cream:#FBF4EA;--card:#FFFFFF;--ink:#3A2E26;--soft:#92806F;--line:#EFE4D4;
      --clay:#C8643C;--clay-t:#F8E5D9;--sage:#6E8B6A;--sage-t:#E7EEE3;--bronze:#B07D3F;--bronze-t:#F4E8D2;
      font-family:'Be Vietnam Pro',system-ui,sans-serif;color:var(--ink);background:var(--cream);height:100%;width:100%;
      -webkit-font-smoothing:antialiased;}
    .zx-warm .disp{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:700;letter-spacing:-.02em;}
    .zx-warm .card{background:var(--card);border-radius:24px;box-shadow:0 1px 2px rgba(58,46,38,.04),0 10px 30px rgba(58,46,38,.05);}
    .zx-warm .pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:6px 12px;border-radius:999px;}
    .zx-warm .ic{display:flex;align-items:center;justify-content:center;border-radius:14px;flex:0 0 auto;}
    .zx-warm .barw{height:8px;border-radius:999px;background:var(--line);overflow:hidden;}
    .zx-warm .barw>span{display:block;height:100%;border-radius:999px;}
    .zx-warm .navp{font-size:14px;font-weight:600;color:var(--soft);padding:9px 16px;border-radius:999px;cursor:default;}
    .zx-warm .navp.on{color:var(--clay);background:var(--clay-t);}
    `;
    document.head.appendChild(s);
  }

  const ePct = Math.round((emergency.months / emergency.target) * 100);
  const pPct = Math.round((pyf.saved / pyf.target) * 100);

  const Icon = ({ name, c = '#3A2E26', s = 18 }) => {
    const p = {
      coffee: <><path d="M4 9h12v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9Z" /><path d="M16 10h2a2 2 0 0 1 0 4h-2" /><path d="M7 3v2M11 3v2" /></>,
      shield: <path d="M10 3l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V5l6-2Z" />,
      piggy: <><path d="M3 11a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2a3 3 0 0 1-3 3h-1v1H7v-1a5 5 0 0 1-4-5Z" /><circle cx="13" cy="11" r="1" /></>,
      trend: <><path d="M3 14l4-4 3 3 6-6" /><path d="M13 7h4v4" /></>,
    }[name];
    return <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{p}</svg>;
  };

  function StatusBar() {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px 0', fontSize: 13, fontWeight: 700, color: '#3A2E26' }}>
        <span>9:41</span>
        <span style={{ fontSize: 12, opacity: .8 }}>5G ▮▮▮ 56%</span>
      </div>
    );
  }

  function StatCard({ name, color, tint, label, value, sub }) {
    return (
      <div className="card" style={{ padding: 18 }}>
        <div className="ic" style={{ width: 36, height: 36, background: tint }}><Icon name={name} c={color} /></div>
        <div style={{ fontSize: 12.5, color: 'var(--soft)', marginTop: 14, fontWeight: 600 }}>{label}</div>
        <div className="disp" style={{ fontSize: 23, marginTop: 3 }}>{value}</div>
        <div style={{ fontSize: 11.5, color: color, marginTop: 3, fontWeight: 600 }}>{sub}</div>
      </div>
    );
  }

  function WarmMobile() {
    return (
      <div className="zx-warm" style={{ display: 'flex', flexDirection: 'column' }}>
        <StatusBar />
        <div style={{ padding: '18px 22px 28px' }}>
          {/* topbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#C8643C,#B07D3F)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>P</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--soft)' }}>{user.greeting},</div>
              <div className="disp" style={{ fontSize: 18 }}>{user.name} 👋</div>
            </div>
            <span className="pill" style={{ background: 'var(--bronze-t)', color: 'var(--bronze)' }}>{phase.label}</span>
          </div>

          {/* hero card */}
          <div className="card" style={{ marginTop: 20, padding: 22, background: 'linear-gradient(160deg,#FFFFFF 0%,#FCEFE2 100%)' }}>
            <div style={{ fontSize: 13, color: 'var(--soft)', fontWeight: 600 }}>Dòng tiền ròng · {month}</div>
            <div className="disp" style={{ fontSize: 40, marginTop: 8, color: 'var(--sage)' }}>+{fmtShort(cashflow.net)}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <span className="pill" style={{ background: 'var(--sage-t)', color: 'var(--sage)' }}>↑ Thu {fmtShort(cashflow.income)}</span>
              <span className="pill" style={{ background: '#F3ECE2', color: 'var(--soft)' }}>Chi {fmtShort(cashflow.expense)}</span>
            </div>
            <div style={{ marginTop: 16, fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
              Bạn đang để dành <b style={{ color: 'var(--clay)' }}>{Math.round(savingsRate * 100)}%</b> thu nhập tháng này — vượt mục tiêu 30%. Tiếp tục nhé!
            </div>
          </div>

          {/* stat grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            <StatCard name="coffee" color="var(--clay)" tint="var(--clay-t)" label="Latte Factor" value={fmtShort(latte.amount)} sub="↓ 18% tháng này" />
            <StatCard name="piggy" color="var(--bronze)" tint="var(--bronze-t)" label="Trả mình trước" value={`${pPct}%`} sub={`${fmtShort(pyf.saved)} đã trích`} />
          </div>

          {/* emergency fund card */}
          <div className="card" style={{ marginTop: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="ic" style={{ width: 34, height: 34, background: 'var(--sage-t)' }}><Icon name="shield" c="var(--sage)" /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--soft)', fontWeight: 600 }}>Quỹ dự phòng</div>
                <div className="disp" style={{ fontSize: 18 }}>{emergency.months} / {emergency.target} tháng</div>
              </div>
              <div className="disp" style={{ fontSize: 18, color: 'var(--sage)' }}>{ePct}%</div>
            </div>
            <div className="barw" style={{ marginTop: 14 }}><span style={{ width: `${ePct}%`, background: 'linear-gradient(90deg,#6E8B6A,#8AA886)' }} /></div>
            <div style={{ fontSize: 12, color: 'var(--soft)', marginTop: 8 }}>Còn {fmtShort(emergency.goal - emergency.saved)} nữa là đạt 6 tháng an toàn</div>
          </div>

          {/* focus */}
          <div style={{ marginTop: 20 }}>
            <div className="disp" style={{ fontSize: 16, marginBottom: 12 }}>Tiêu điểm tuần này</div>
            {focus.map((f, i) => (
              <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', marginBottom: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--clay-t)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#C8643C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l3 3 5-6" /></svg>
                </span>
                <span style={{ fontSize: 14, flex: 1, fontWeight: 500 }}>{f.text}</span>
                <span className="disp" style={{ fontSize: 15, color: 'var(--clay)' }}>{fmtShort(f.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function WarmDesktop() {
    const navs = ['Tổng quan', 'Giao dịch', 'Latte Factor', 'Lộ trình', 'Quỹ dự phòng', 'Review'];
    return (
      <div className="zx-warm" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* top nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '22px 44px', borderBottom: '1px solid var(--line)' }}>
          <span className="disp" style={{ fontSize: 20, color: 'var(--clay)' }}>ZenX Wealth</span>
          <div style={{ display: 'flex', gap: 4, marginLeft: 18 }}>
            {navs.map((n, i) => <span key={n} className={'navp' + (i === 0 ? ' on' : '')}>{n}</span>)}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="pill" style={{ background: 'var(--clay)', color: '#fff' }}>+ Thêm giao dịch</span>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#C8643C,#B07D3F)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>P</div>
          </div>
        </div>

        <div style={{ padding: '38px 44px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, color: 'var(--soft)' }}>{user.greeting},</div>
              <div className="disp" style={{ fontSize: 30 }}>{user.name} 👋</div>
            </div>
            <span className="pill" style={{ background: 'var(--bronze-t)', color: 'var(--bronze)', fontSize: 13, padding: '9px 16px' }}>{phase.label} · {phase.name}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 22, marginTop: 28 }}>
            {/* hero */}
            <div className="card" style={{ padding: 32, background: 'linear-gradient(150deg,#FFFFFF 0%,#FCEFE2 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--soft)', fontWeight: 600 }}>Dòng tiền ròng · {month}</div>
              <div className="disp" style={{ fontSize: 66, color: 'var(--sage)', marginTop: 10, lineHeight: 1 }}>+{fmtShort(cashflow.net)}</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <span className="pill" style={{ background: 'var(--sage-t)', color: 'var(--sage)', fontSize: 13 }}>↑ Thu {fmtVND(cashflow.income)}</span>
                <span className="pill" style={{ background: '#F3ECE2', color: 'var(--soft)', fontSize: 13 }}>Chi {fmtVND(cashflow.expense)}</span>
              </div>
              <div style={{ marginTop: 22, fontSize: 14.5, lineHeight: 1.55, maxWidth: 440 }}>
                Bạn đang để dành <b style={{ color: 'var(--clay)' }}>{Math.round(savingsRate * 100)}%</b> thu nhập — vượt mục tiêu 30%. Giữ nhịp này, quỹ dự phòng 6 tháng sẽ hoàn tất trước Tết.
              </div>
            </div>
            {/* emergency ring */}
            <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column' }}>
              <div className="ic" style={{ width: 40, height: 40, background: 'var(--sage-t)' }}><Icon name="shield" c="var(--sage)" s={20} /></div>
              <div style={{ fontSize: 14, color: 'var(--soft)', fontWeight: 600, marginTop: 16 }}>Quỹ dự phòng</div>
              <div className="disp" style={{ fontSize: 30, marginTop: 4 }}>{emergency.months} / {emergency.target} tháng</div>
              <div className="barw" style={{ marginTop: 18 }}><span style={{ width: `${ePct}%`, background: 'linear-gradient(90deg,#6E8B6A,#8AA886)' }} /></div>
              <div style={{ fontSize: 13, color: 'var(--soft)', marginTop: 'auto', paddingTop: 18 }}>Đã có {fmtVND(emergency.saved)}. Còn {fmtShort(emergency.goal - emergency.saved)} là an toàn.</div>
            </div>
          </div>

          {/* stat row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginTop: 20 }}>
            <StatCard name="coffee" color="var(--clay)" tint="var(--clay-t)" label="Latte Factor" value={fmtShort(latte.amount)} sub="↓ 18% tháng này" />
            <StatCard name="piggy" color="var(--bronze)" tint="var(--bronze-t)" label="Trả mình trước" value={`${pPct}%`} sub={`${fmtShort(pyf.saved)} đã trích`} />
            <StatCard name="trend" color="var(--sage)" tint="var(--sage-t)" label="Tỷ lệ tiết kiệm" value={`${Math.round(savingsRate * 100)}%`} sub="vượt mục tiêu" />
            <StatCard name="shield" color="var(--bronze)" tint="var(--bronze-t)" label="Tài sản ròng" value={fmtShort(netWorth)} sub="↑ tăng đều" />
          </div>

          {/* focus */}
          <div style={{ marginTop: 26 }}>
            <div className="disp" style={{ fontSize: 18, marginBottom: 14 }}>Tiêu điểm tuần này</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {focus.map((f, i) => (
                <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--clay-t)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="#C8643C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l3 3 5-6" /></svg>
                  </span>
                  <span style={{ fontSize: 15, flex: 1, fontWeight: 500 }}>{f.text}</span>
                  <span className="disp" style={{ fontSize: 17, color: 'var(--clay)' }}>{fmtShort(f.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, { WarmMobile, WarmDesktop });
})();
