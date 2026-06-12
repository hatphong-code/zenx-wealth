// Direction 3 — "Tạp chí" (Editorial / financial magazine). Exports EditMobile, EditDesktop.
(function () {
  const { fmtVND, fmtShort, user, phase, month, cashflow, savingsRate, netWorth, latte, emergency, pyf, roadmap, focus } = window.ZX;

  if (!document.getElementById('zx-edit-css')) {
    const s = document.createElement('style');
    s.id = 'zx-edit-css';
    s.textContent = `
    .zx-edit{--paper:#F5F1E7;--ink:#1A1714;--soft:#6E685C;--line:#1A1714;--hair:#CFC7B5;--ox:#7A2E2A;--bronze:#9C6B2C;
      font-family:'Archivo',system-ui,sans-serif;color:var(--ink);background:var(--paper);height:100%;width:100%;
      -webkit-font-smoothing:antialiased;}
    .zx-edit .serif{font-family:'Spectral',Georgia,serif;}
    .zx-edit .lab{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;}
    .zx-edit .num{font-family:'Spectral',Georgia,serif;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.01em;}
    .zx-edit .rule{height:1px;background:var(--hair);border:0;}
    .zx-edit .rule-ink{height:2px;background:var(--ink);border:0;}
    .zx-edit .ox{color:var(--ox);} .zx-edit .bz{color:var(--bronze);}
    .zx-edit .navc{font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;color:var(--soft);cursor:default;}
    .zx-edit .navc.on{color:var(--ink);border-bottom:2px solid var(--ox);padding-bottom:3px;}
    `;
    document.head.appendChild(s);
  }

  const ePct = Math.round((emergency.months / emergency.target) * 100);
  const pPct = Math.round((pyf.saved / pyf.target) * 100);

  function Masthead({ big }) {
    return (
      <div>
        <div className="rule-ink" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: big ? '7px 0' : '6px 0' }}>
          <span className="lab">{month}</span>
          <span className="lab">Bản tin tài chính cá nhân</span>
          <span className="lab ox">{phase.label}</span>
        </div>
        <div className="rule" />
        <div className="serif" style={{ fontWeight: 700, letterSpacing: big ? '-.02em' : '-.01em', fontSize: big ? 58 : 34, lineHeight: 1, textAlign: 'center', padding: big ? '14px 0 12px' : '10px 0 8px' }}>
          ZenX&nbsp;Wealth
        </div>
        <div className="rule-ink" />
      </div>
    );
  }

  function StatLine({ label, value, sub, accent }) {
    return (
      <div style={{ padding: '15px 0' }}>
        <div className="lab" style={{ color: 'var(--soft)' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6 }}>
          <span className={'num ' + (accent || '')} style={{ fontSize: 27 }}>{value}</span>
          <span style={{ fontSize: 11.5, color: 'var(--soft)', fontWeight: 600, letterSpacing: '.02em' }}>{sub}</span>
        </div>
      </div>
    );
  }

  function StatusBar() {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px 0', fontSize: 13, fontWeight: 700, color: '#1A1714' }}>
        <span>9:41</span><span style={{ fontSize: 12 }}>▮▮▮ 56%</span>
      </div>
    );
  }

  function EditMobile() {
    return (
      <div className="zx-edit" style={{ display: 'flex', flexDirection: 'column' }}>
        <StatusBar />
        <div style={{ padding: '16px 22px 28px' }}>
          <Masthead />

          {/* lead figure */}
          <div style={{ padding: '20px 0 6px' }}>
            <div className="lab" style={{ color: 'var(--soft)' }}>Dòng tiền ròng tháng này</div>
            <div className="num ox" style={{ fontSize: 64, lineHeight: 1, marginTop: 8 }}>+{fmtShort(cashflow.net)}</div>
            <div className="serif" style={{ fontSize: 15.5, fontStyle: 'italic', color: 'var(--soft)', marginTop: 10, lineHeight: 1.45 }}>
              Thu nhập {fmtVND(cashflow.income)} vượt chi tiêu {fmtVND(cashflow.expense)} — tháng dương thứ sáu liên tiếp.
            </div>
          </div>

          <div className="rule" style={{ margin: '10px 0' }} />

          {/* two-up */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            <div style={{ borderRight: '1px solid var(--hair)', paddingRight: 16 }}>
              <StatLine label="Latte Factor" value={fmtShort(latte.amount)} sub="↓ 18%" accent="ox" />
            </div>
            <div style={{ paddingLeft: 16 }}>
              <StatLine label="Tiết kiệm" value={`${Math.round(savingsRate * 100)}%`} sub="thu nhập" accent="bz" />
            </div>
          </div>
          <div className="rule" />
          <StatLine label="Quỹ dự phòng" value={`${emergency.months} / ${emergency.target} tháng`} sub={`${ePct}% mục tiêu · ${fmtShort(emergency.saved)}`} />
          <div className="rule" />
          <StatLine label="Trả mình trước" value={`${pPct}%`} sub={`${fmtShort(pyf.saved)} / ${fmtShort(pyf.target)}`} accent="bz" />

          <div className="rule-ink" style={{ margin: '14px 0 0' }} />
          {/* week ahead */}
          <div style={{ padding: '14px 0 0' }}>
            <div className="lab">Tuần tới</div>
            {focus.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '10px 0', borderBottom: i < focus.length - 1 ? '1px solid var(--hair)' : 'none' }}>
                <span className="num" style={{ fontSize: 15, width: 18 }}>{(i + 1).toString().padStart(2, '0')}</span>
                <span className="serif" style={{ fontSize: 16, flex: 1 }}>{f.text}</span>
                <span className="num ox" style={{ fontSize: 16 }}>{fmtShort(f.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function EditDesktop() {
    const navs = ['Tổng quan', 'Giao dịch', 'Latte Factor', 'Lộ trình', 'Quỹ dự phòng', 'Review tuần'];
    return (
      <div className="zx-edit" style={{ display: 'flex', flexDirection: 'column', padding: '34px 52px' }}>
        <Masthead big />
        {/* nav strip */}
        <div style={{ display: 'flex', gap: 26, justifyContent: 'center', padding: '12px 0' }}>
          {navs.map((n, i) => <span key={n} className={'navc' + (i === 0 ? ' on' : '')}>{n}</span>)}
        </div>
        <div className="rule" />

        {/* front-page grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1px 1fr', gap: 36, paddingTop: 28, flex: 1 }}>
          {/* lead column */}
          <div>
            <div className="lab" style={{ color: 'var(--soft)' }}>Câu chuyện trang nhất · Dòng tiền ròng</div>
            <div className="num ox" style={{ fontSize: 108, lineHeight: .96, marginTop: 14 }}>+{fmtShort(cashflow.net)}</div>
            <div className="serif" style={{ fontSize: 21, fontStyle: 'italic', marginTop: 18, lineHeight: 1.4, maxWidth: 540 }}>
              Thu nhập {fmtVND(cashflow.income)} vượt chi tiêu {fmtVND(cashflow.expense)} — đánh dấu tháng dương thứ sáu liên tiếp và đưa tỷ lệ tiết kiệm lên {Math.round(savingsRate * 100)}%.
            </div>
            <div className="rule" style={{ margin: '24px 0' }} />
            {/* roadmap as ruled timeline */}
            <div className="lab" style={{ color: 'var(--soft)', marginBottom: 14 }}>Lộ trình 5 năm · vị trí hiện tại</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {roadmap.map((r, i) => (
                <div key={i} style={{ flex: 1, paddingRight: 14 }}>
                  <div className="num" style={{ fontSize: 15, color: r.done ? 'var(--soft)' : r.active ? 'var(--ox)' : 'var(--hair)' }}>{(i + 1).toString().padStart(2, '0')}</div>
                  <div style={{ height: 2, background: r.done || r.active ? 'var(--ox)' : 'var(--hair)', margin: '7px 0' }} />
                  <div style={{ fontSize: 11.5, fontWeight: r.active ? 700 : 500, color: r.active ? 'var(--ink)' : 'var(--soft)', lineHeight: 1.3 }}>{r.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--hair)', width: 1 }} />

          {/* sidebar ledger */}
          <div>
            <div className="lab">Bảng chỉ số</div>
            <div className="rule-ink" style={{ margin: '10px 0 0' }} />
            <StatLine label="Latte Factor" value={fmtShort(latte.amount)} sub={`↓ 18% · ${latte.topCategory}`} accent="ox" />
            <div className="rule" />
            <StatLine label="Quỹ dự phòng" value={`${emergency.months} / ${emergency.target} th`} sub={`${ePct}% · ${fmtShort(emergency.saved)}`} />
            <div className="rule" />
            <StatLine label="Trả mình trước" value={`${pPct}%`} sub={fmtShort(pyf.saved)} accent="bz" />
            <div className="rule" />
            <StatLine label="Tài sản ròng" value={fmtShort(netWorth)} sub="↑ tăng đều" />
            <div className="rule-ink" style={{ margin: '0 0 16px' }} />
            <div className="lab">Tuần tới</div>
            {focus.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '11px 0', borderBottom: '1px solid var(--hair)' }}>
                <span className="num" style={{ fontSize: 14 }}>{(i + 1).toString().padStart(2, '0')}</span>
                <span className="serif" style={{ fontSize: 16, flex: 1 }}>{f.text}</span>
                <span className="num ox" style={{ fontSize: 16 }}>{fmtShort(f.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, { EditMobile, EditDesktop });
})();
