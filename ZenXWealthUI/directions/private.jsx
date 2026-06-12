// Direction 4 — "Tư gia" (Private banking, dark navy + gold). Exports PrivMobile, PrivDesktop.
(function () {
  const { fmtVND, fmtShort, user, phase, month, cashflow, savingsRate, netWorth, latte, emergency, pyf, roadmap, focus } = window.ZX;

  if (!document.getElementById('zx-priv-css')) {
    const s = document.createElement('style');
    s.id = 'zx-priv-css';
    s.textContent = `
    .zx-priv{--navy:#0C1420;--surf:#101B2B;--ivory:#ECE5D6;--soft:#8A93A1;--gold:#C9A24B;--gold-d:#9E7E37;
      --hair:rgba(201,162,75,.22);--green:#86A98C;
      font-family:'Hanken Grotesk',system-ui,sans-serif;color:var(--ivory);
      background:radial-gradient(120% 80% at 50% -10%,#13243A 0%,#0C1420 60%);height:100%;width:100%;-webkit-font-smoothing:antialiased;}
    .zx-priv .serif{font-family:'Playfair Display',Georgia,serif;}
    .zx-priv .lab{font-size:10.5px;letter-spacing:.26em;text-transform:uppercase;color:var(--gold);font-weight:600;}
    .zx-priv .soft{color:var(--soft);}
    .zx-priv .hair{height:1px;background:var(--hair);border:0;}
    .zx-priv .num{font-family:'Playfair Display',Georgia,serif;font-variant-numeric:tabular-nums;}
    .zx-priv .mono{width:42px;height:42px;border-radius:50%;border:1px solid var(--gold);display:flex;align-items:center;justify-content:center;
      font-family:'Playfair Display',serif;font-weight:700;color:var(--gold);letter-spacing:.02em;flex:0 0 auto;}
    .zx-priv .bar{height:3px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;}
    .zx-priv .bar>span{display:block;height:100%;background:linear-gradient(90deg,#9E7E37,#C9A24B,#E5C879);border-radius:2px;}
    .zx-priv .navi{font-size:13.5px;color:var(--soft);padding:9px 0;letter-spacing:.02em;cursor:default;}
    .zx-priv .navi.on{color:var(--ivory);}
    .zx-priv .navi.on::before{content:'';display:inline-block;width:14px;height:1px;background:var(--gold);vertical-align:middle;margin-right:9px;}
    `;
    document.head.appendChild(s);
  }

  const ePct = Math.round((emergency.months / emergency.target) * 100);
  const pPct = Math.round((pyf.saved / pyf.target) * 100);

  function StatusBar() {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px 0', fontSize: 13, fontWeight: 600, color: '#ECE5D6' }}>
        <span>9:41</span><span style={{ fontSize: 12, opacity: .7 }}>▮▮▮ 56%</span>
      </div>
    );
  }

  function Row({ label, value, sub, gold }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 0' }}>
        <div>
          <div style={{ fontSize: 13.5, color: 'var(--ivory)' }}>{label}</div>
          {sub && <div style={{ fontSize: 11.5, color: 'var(--soft)', marginTop: 3 }}>{sub}</div>}
        </div>
        <div className="num" style={{ fontSize: 23, color: gold ? 'var(--gold)' : 'var(--ivory)' }}>{value}</div>
      </div>
    );
  }

  function PrivMobile() {
    return (
      <div className="zx-priv" style={{ display: 'flex', flexDirection: 'column' }}>
        <StatusBar />
        <div style={{ padding: '20px 26px 30px' }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div className="mono" style={{ fontSize: 16 }}>ZX</div>
            <div style={{ flex: 1 }}>
              <div className="serif" style={{ fontSize: 17, fontWeight: 600 }}>ZenX Wealth</div>
              <div className="lab" style={{ fontSize: 9 }}>Private</div>
            </div>
            <span className="lab" style={{ fontSize: 9.5 }}>{phase.label}</span>
          </div>

          <div className="hair" style={{ margin: '24px 0' }} />

          {/* statement hero */}
          <div style={{ textAlign: 'center' }}>
            <div className="lab">Dòng tiền ròng · {month}</div>
            <div className="num" style={{ fontSize: 52, marginTop: 12, color: 'var(--gold)', lineHeight: 1 }}>+{fmtShort(cashflow.net)}</div>
            <div style={{ fontSize: 13, color: 'var(--soft)', marginTop: 12 }}>Thu {fmtShort(cashflow.income)} &nbsp;·&nbsp; Chi {fmtShort(cashflow.expense)}</div>
          </div>

          <div className="hair" style={{ margin: '24px 0 4px' }} />

          <Row label="Tài sản ròng" value={fmtShort(netWorth)} sub="Tăng trưởng ổn định" gold />
          <div className="hair" />
          <Row label="Latte Factor" value={fmtShort(latte.amount)} sub={`Giảm 18% · ${latte.topCategory}`} />
          <div className="hair" />

          {/* emergency w/ bar */}
          <div style={{ padding: '16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 13.5 }}>Quỹ dự phòng</div>
              <div className="num" style={{ fontSize: 20 }}>{emergency.months} / {emergency.target} <span style={{ fontSize: 13, color: 'var(--soft)' }}>tháng</span></div>
            </div>
            <div className="bar" style={{ marginTop: 12 }}><span style={{ width: `${ePct}%` }} /></div>
          </div>
          <div className="hair" />
          <Row label="Trả mình trước" value={`${pPct}%`} sub={`${fmtShort(pyf.saved)} đã phân bổ`} gold />

          <div className="hair" style={{ margin: '4px 0 22px' }} />
          <div className="lab" style={{ marginBottom: 14 }}>Khuyến nghị tuần</div>
          {focus.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '9px 0' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', flex: '0 0 auto' }} />
              <span style={{ fontSize: 14, flex: 1, color: 'var(--ivory)' }}>{f.text}</span>
              <span className="num" style={{ fontSize: 15, color: 'var(--gold)' }}>{fmtShort(f.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function PrivDesktop() {
    const navs = ['Tổng quan', 'Danh mục', 'Latte Factor', 'Lộ trình', 'Quỹ dự phòng', 'Review tuần'];
    return (
      <div className="zx-priv" style={{ display: 'flex' }}>
        {/* rail */}
        <div style={{ width: 236, flex: '0 0 auto', borderRight: '1px solid var(--hair)', padding: '40px 32px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="mono">ZX</div>
            <div>
              <div className="serif" style={{ fontSize: 16, fontWeight: 600 }}>ZenX Wealth</div>
              <div className="lab" style={{ fontSize: 9 }}>Private</div>
            </div>
          </div>
          <div className="hair" style={{ margin: '28px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {navs.map((n, i) => <div key={n} className={'navi' + (i === 0 ? ' on' : '')}>{n}</div>)}
          </div>
          <div style={{ marginTop: 'auto' }}>
            <div className="lab" style={{ marginBottom: 8 }}>Cố vấn của bạn</div>
            <div style={{ fontSize: 13, color: 'var(--soft)', lineHeight: 1.5 }}>AI Coach đã chuẩn bị 3 khuyến nghị cho tuần này.</div>
          </div>
        </div>

        {/* main statement */}
        <div style={{ flex: 1, padding: '46px 56px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="lab">{user.greeting}, {user.name}</div>
              <div className="serif" style={{ fontSize: 30, marginTop: 8, fontWeight: 600 }}>Bảng tài chính cá nhân</div>
            </div>
            <span className="lab" style={{ fontSize: 10 }}>{phase.label} · {phase.name}</span>
          </div>

          <div className="hair" style={{ margin: '34px 0' }} />

          {/* hero split */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 60, alignItems: 'end' }}>
            <div>
              <div className="lab">Dòng tiền ròng · {month}</div>
              <div className="num" style={{ fontSize: 88, color: 'var(--gold)', lineHeight: 1, marginTop: 16 }}>+{fmtShort(cashflow.net)}</div>
              <div style={{ fontSize: 14, color: 'var(--soft)', marginTop: 16 }}>Thu nhập {fmtVND(cashflow.income)} &nbsp;·&nbsp; Chi tiêu {fmtVND(cashflow.expense)}</div>
            </div>
            <div>
              <div className="lab">Tài sản ròng</div>
              <div className="num" style={{ fontSize: 46, marginTop: 14 }}>{fmtShort(netWorth)}</div>
              <div style={{ fontSize: 13, color: 'var(--green)', marginTop: 10 }}>Tỷ lệ tiết kiệm {Math.round(savingsRate * 100)}% · tăng trưởng đều</div>
            </div>
          </div>

          <div className="hair" style={{ margin: '38px 0 0' }} />

          {/* ledger grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 60 }}>
            <div>
              <Row label="Latte Factor" value={fmtShort(latte.amount)} sub={`Giảm 18% · ${latte.topCategory}`} />
              <div className="hair" />
              <Row label="Trả mình trước" value={`${pPct}%`} sub={`${fmtVND(pyf.saved)} đã phân bổ`} gold />
            </div>
            <div>
              <div style={{ padding: '16px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 13.5 }}>Quỹ dự phòng</div>
                  <div className="num" style={{ fontSize: 21 }}>{emergency.months} / {emergency.target} <span style={{ fontSize: 13, color: 'var(--soft)' }}>tháng</span></div>
                </div>
                <div className="bar" style={{ marginTop: 13 }}><span style={{ width: `${ePct}%` }} /></div>
                <div style={{ fontSize: 12, color: 'var(--soft)', marginTop: 9 }}>{fmtVND(emergency.saved)} / {fmtVND(emergency.goal)}</div>
              </div>
              <div className="hair" />
              <Row label="Tỷ lệ tiết kiệm" value={`${Math.round(savingsRate * 100)}%`} sub="của thu nhập thực nhận" />
            </div>
          </div>

          <div className="hair" style={{ margin: '0 0 26px' }} />
          <div className="lab" style={{ marginBottom: 16 }}>Khuyến nghị tuần này</div>
          <div style={{ display: 'flex', gap: 48 }}>
            {focus.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, flex: 1 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flex: '0 0 auto' }} />
                <span style={{ fontSize: 15, flex: 1 }}>{f.text}</span>
                <span className="num" style={{ fontSize: 17, color: 'var(--gold)' }}>{fmtShort(f.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, { PrivMobile, PrivDesktop });
})();
