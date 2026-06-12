// ZenX Wealth prototype — screens (supports cards / open layout). Exports ZXPScreens.
(function () {
  const { fmtVND, fmtShort, data } = window.ZXP;
  const Icon = window.ZXPIcon, IconBox = window.ZXPIconBox, Bar = window.ZXPBar,
    Spark = window.ZXPSparkline, Ring = window.ZXPRing;

  const ePct = Math.round((data.emergency.months / data.emergency.target) * 100);
  const pPct = Math.round((data.pyf.saved / data.pyf.target) * 100);
  const srPct = Math.round(data.savingsRate * 100);
  const HL = (m) => <hr className="hairline" style={{ margin: m }} />;

  // Wrapper: a "panel" is a card in cards-mode, or an open block (top hairline) in open-mode.
  function Panel({ open, hero, children, style, pad, first }) {
    if (open) return <div style={{ borderTop: first ? 'none' : '1px solid var(--p-line)', paddingTop: first ? 0 : 26, marginTop: first ? 0 : 26, ...style }}>{children}</div>;
    return <div className="card" style={{ padding: pad != null ? pad : 22, background: hero ? 'var(--p-hero)' : undefined, ...style }}>{children}</div>;
  }

  // ─────────────────────────── DASHBOARD ───────────────────────────
  function Dashboard({ t, wide, open, onNav, focus, onToggleFocus }) {
    const stats = [
      { key: 'latte', icon: 'coffee', color: 'var(--p-accent)', label: t.latte, value: fmtShort(data.latte.amount), sub: '↓ 18% tháng này', subCls: 'pos', go: 'latte' },
      { key: 'emg', icon: 'shield', color: 'var(--p-pos)', label: t.emergency, value: `${data.emergency.months}/${data.emergency.target}`, sub: `${ePct}% mục tiêu`, bar: ePct, go: 'emergency' },
      { key: 'pyf', icon: 'piggy', color: 'var(--p-gold)', label: t.pyf, value: `${pPct}%`, sub: `${fmtShort(data.pyf.saved)} đã trích` },
      { key: 'sr', icon: 'trend', color: 'var(--p-pos)', label: t.savingsRate, value: `${srPct}%`, sub: 'vượt mục tiêu 30%' },
    ];
    const cols = wide ? 4 : 2;

    const heroInner = (
      <div style={{ display: wide ? 'grid' : 'block', gridTemplateColumns: wide ? '1.4fr 1fr' : 'none', gap: 40, alignItems: 'center' }}>
        <div>
          <div className="eyebrow">{t.netCashFlow} · {data.month}</div>
          <div className="num pos" style={{ fontSize: wide ? 66 : 44, marginTop: wide ? 12 : 8 }}>+{fmtShort(data.cashflow.net)}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <span className="pill" style={{ background: 'var(--p-pos-soft)', color: 'var(--p-pos)' }}>↑ {t.income} {fmtShort(data.cashflow.income)}</span>
            <span className="pill" style={{ background: 'var(--p-surface2)', color: 'var(--p-soft)' }}>{t.expense} {fmtShort(data.cashflow.expense)}</span>
          </div>
        </div>
        <div style={{ marginTop: wide ? 0 : 18 }}>
          <Spark data={data.cashTrend} w={wide ? 300 : 320} h={wide ? 70 : 46} color="var(--p-pos)" fillUnder />
          <div className="soft" style={{ fontSize: 12, marginTop: 8 }}>6 tháng gần nhất · {t.savingsRate.toLowerCase()} {srPct}%</div>
        </div>
      </div>
    );

    return (
      <div className="screen">
        <Panel open={open} hero first>{heroInner}</Panel>

        {/* stats */}
        {open ? (
          <div style={{ borderTop: '1px solid var(--p-line)', marginTop: 26, paddingTop: 22, display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)` }}>
            {stats.map((s, i) => (
              <div key={s.key} onClick={s.go ? () => onNav(s.go) : undefined}
                style={{ cursor: s.go ? 'pointer' : 'default', padding: wide ? '2px 24px 4px' : '6px 14px 18px',
                  paddingLeft: i % cols === 0 ? 0 : (wide ? 24 : 14),
                  borderRight: i % cols !== cols - 1 ? '1px solid var(--p-line)' : 'none',
                  borderBottom: !wide && i < 2 ? '1px solid var(--p-line)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: s.color }}><Icon name={s.icon} size={wide ? 20 : 18} /></span>
                  {s.go && <Icon name="chevron" size={14} stroke={1.6} style={{ color: 'var(--p-soft)' }} />}
                </div>
                <div className="soft" style={{ fontSize: 12.5, marginTop: 11, fontWeight: 600 }}>{s.label}</div>
                <div className="num" style={{ fontSize: wide ? 28 : 23, marginTop: 4 }}>{s.value}</div>
                {s.bar != null ? <Bar pct={s.bar} style={{ marginTop: 9, height: 5 }} /> : null}
                <div className={s.bar != null ? 'soft' : (s.subCls || 'soft')} style={{ fontSize: 11.5, marginTop: s.bar != null ? 7 : 5, fontWeight: 600 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: wide ? 18 : 12, marginTop: wide ? 18 : 12 }}>
            {stats.map((s) => (
              <div key={s.key} className={'card' + (s.go ? ' clickable' : '')} onClick={s.go ? () => onNav(s.go) : undefined} style={{ padding: wide ? 22 : 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <IconBox name={s.icon} color={s.color} size={wide ? 40 : 34} icon={wide ? 20 : 17} />
                  {s.go && <Icon name="chevron" size={15} stroke={1.6} style={{ color: 'var(--p-soft)' }} />}
                </div>
                <div className="soft" style={{ fontSize: 12.5, marginTop: 14, fontWeight: 600 }}>{s.label}</div>
                <div className="num" style={{ fontSize: wide ? 28 : 22, marginTop: 4 }}>{s.value}</div>
                {s.bar != null ? <Bar pct={s.bar} style={{ marginTop: 10, height: 6 }} /> : <div className={s.subCls || 'soft'} style={{ fontSize: 11.5, marginTop: 5, fontWeight: 600 }}>{s.sub}</div>}
                {s.bar != null && <div className="soft" style={{ fontSize: 11.5, marginTop: 7 }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        )}

        {/* focus */}
        <div style={{ marginTop: open ? 26 : (wide ? 26 : 20), borderTop: open ? '1px solid var(--p-line)' : 'none', paddingTop: open ? 24 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="head" style={{ fontSize: wide ? 19 : 16 }}>{t.focus}</div>
            <span className="pill" style={{ background: 'var(--p-accent-soft)', color: 'var(--p-accent)', cursor: 'pointer' }}><Icon name="sparkle" size={13} /> {t.coach}</span>
          </div>
          {open ? (
            <div>
              {focus.map((f, i) => (
                <div key={f.id} onClick={() => onToggleFocus(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0', cursor: 'pointer', borderTop: i ? '1px solid var(--p-line)' : 'none' }}>
                  <FocusDot done={f.done} />
                  <span style={{ fontSize: 14.5, flex: 1, fontWeight: 500, textDecoration: f.done ? 'line-through' : 'none', opacity: f.done ? .55 : 1 }}>{f.text}</span>
                  <span className="num accent" style={{ fontSize: 15 }}>{fmtShort(f.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: wide ? 'grid' : 'block', gridTemplateColumns: wide ? 'repeat(3,1fr)' : 'none', gap: 14 }}>
              {focus.map((f) => (
                <div key={f.id} className="card clickable" onClick={() => onToggleFocus(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: wide ? '16px 18px' : '13px 16px', marginBottom: wide ? 0 : 10 }}>
                  <FocusDot done={f.done} />
                  <span style={{ fontSize: 14, flex: 1, fontWeight: 500, textDecoration: f.done ? 'line-through' : 'none', opacity: f.done ? .55 : 1 }}>{f.text}</span>
                  <span className="num accent" style={{ fontSize: 15 }}>{fmtShort(f.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function FocusDot({ done }) {
    return (
      <span style={{ width: 24, height: 24, borderRadius: '50%', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? 'var(--p-pos)' : 'transparent', border: done ? 'none' : '1.6px solid var(--p-line)', color: '#fff', transition: 'all .2s' }}>
        {done && <Icon name="check" size={13} stroke={2.4} />}
      </span>
    );
  }

  // ─────────────────────────── LATTE FACTOR ───────────────────────────
  function LatteFactor({ t, wide, open }) {
    const maxCat = Math.max(...data.latte.categories.map((c) => c.amount));
    const heroInner = (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconBox name="coffee" color="var(--p-accent)" size={wide ? 44 : 38} icon={wide ? 22 : 19} />
          <div>
            <div className="head" style={{ fontSize: wide ? 20 : 17 }}>{t.latteTitle}</div>
            <div className="soft" style={{ fontSize: 12.5 }}>{t.latteSub}</div>
          </div>
        </div>
        <div style={{ display: wide ? 'grid' : 'block', gridTemplateColumns: wide ? '1fr 1fr' : 'none', gap: 30, alignItems: 'end', marginTop: 18 }}>
          <div>
            <div className="num accent" style={{ fontSize: wide ? 56 : 42 }}>{fmtShort(data.latte.amount)}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <span className="pill" style={{ background: 'var(--p-pos-soft)', color: 'var(--p-pos)' }}>↓ 18% vs tháng trước</span>
              <span className="pill soft" style={{ background: 'var(--p-surface2)' }}>Trước: {fmtShort(data.latte.last)}</span>
            </div>
          </div>
          <div style={{ marginTop: wide ? 0 : 18 }}>
            <Spark data={data.latte.trend} w={320} h={wide ? 64 : 48} color="var(--p-accent)" fillUnder />
            <div className="soft" style={{ fontSize: 12, marginTop: 6 }}>Xu hướng đang giảm — tiếp tục giữ.</div>
          </div>
        </div>
      </>
    );

    const catList = (
      <>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Rò rỉ theo nhóm</div>
        {data.latte.categories.map((c, i) => (
          <div key={i} style={{ marginBottom: i < data.latte.categories.length - 1 ? 16 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 7 }}>
              <IconBox name={c.icon} color="var(--p-accent)" size={30} icon={15} />
              <span style={{ fontSize: 13.5, flex: 1, fontWeight: 500 }}>{c.name}</span>
              <span className="num" style={{ fontSize: 15 }}>{fmtShort(c.amount)}</span>
            </div>
            <Bar pct={(c.amount / maxCat) * 100} style={{ height: 6 }} />
          </div>
        ))}
      </>
    );

    const projInner = (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <IconBox name="sparkle" color="var(--p-gold)" size={36} icon={18} />
        <div>
          <div className="soft" style={{ fontSize: 13 }}>Nếu giữ nhịp này, mỗi năm bạn tái phân bổ được</div>
          <div className="num gold" style={{ fontSize: wide ? 30 : 26, marginTop: 6 }}>{fmtShort(data.latte.yearProjection)}</div>
          <div className="soft" style={{ fontSize: 12, marginTop: 4 }}>vào quỹ dự phòng & tích sản dài hạn</div>
        </div>
      </div>
    );

    const tipsInner = (
      <>
        <div className="eyebrow" style={{ marginBottom: 14 }}>{t.tipsTitle}</div>
        {data.latte.tips.map((tip, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderTop: i ? '1px solid var(--p-line)' : 'none' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--p-accent)', flex: '0 0 auto' }} />
            <span style={{ fontSize: 13.5, flex: 1 }}>{tip.text}</span>
            <span className="num pos" style={{ fontSize: 14 }}>+{fmtShort(tip.save)}/th</span>
          </div>
        ))}
      </>
    );

    return (
      <div className="screen">
        <Panel open={open} hero first>{heroInner}</Panel>
        <div style={{ display: wide ? 'grid' : 'block', gridTemplateColumns: wide ? '1.2fr 1fr' : 'none', gap: open ? 36 : 18, marginTop: open ? 26 : (wide ? 18 : 12),
          borderTop: open ? '1px solid var(--p-line)' : 'none', paddingTop: open ? 24 : 0 }}>
          <Panel open={open} pad={wide ? 24 : 18} first>{catList}</Panel>
          <div>
            <Panel open={open} pad={wide ? 24 : 18} first style={open ? { marginTop: wide ? 0 : 24, borderTop: wide ? 'none' : '1px solid var(--p-line)', paddingTop: wide ? 0 : 24 } : { marginBottom: wide ? 18 : 12 }}>{projInner}</Panel>
            <Panel open={open} pad={wide ? 24 : 18} style={open ? { marginTop: 24 } : {}}>{tipsInner}</Panel>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────── EMERGENCY FUND ───────────────────────────
  function EmergencyFund({ t, wide, open }) {
    const e = data.emergency;
    const heroInner = (
      <>
        <div style={{ display: 'flex', flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: wide ? 40 : 18, textAlign: wide ? 'left' : 'center' }}>
          <Ring pct={ePct} size={wide ? 156 : 140} color="var(--p-accent)">
            <div className="num" style={{ fontSize: wide ? 30 : 27 }}>{e.months}</div>
            <div className="soft" style={{ fontSize: 11.5, marginTop: 2 }}>/ {e.target} {t.months}</div>
          </Ring>
          <div style={{ flex: 1 }}>
            <div className="eyebrow">{t.emergencyTitle}</div>
            <div className="head" style={{ fontSize: wide ? 24 : 20, marginTop: 8, lineHeight: 1.25 }}>{t.emergencySub}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: wide ? 'flex-start' : 'center', flexWrap: 'wrap' }}>
              <span className="pill" style={{ background: 'var(--p-surface2)', color: 'var(--p-ink)' }}>Đã có {fmtShort(e.saved)}</span>
              <span className="pill" style={{ background: 'var(--p-pos-soft)', color: 'var(--p-pos)' }}>Dự kiến đủ: {e.etaText}</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 8 }}>
            <span className="soft">{fmtVND(e.saved)}</span><span className="soft">Mục tiêu {fmtShort(e.goal)}</span>
          </div>
          <Bar pct={ePct} />
          <div className="soft" style={{ fontSize: 12.5, marginTop: 10 }}>Còn <b className="accent">{fmtShort(e.goal - e.saved)}</b> nữa là đạt {e.target} {t.months} an toàn.</div>
        </div>
      </>
    );

    const contribInner = (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="eyebrow">{t.contribTitle}</div>
          <span className="pill" style={{ background: 'var(--p-accent)', color: '#fff', cursor: 'pointer' }}><Icon name="plus" size={13} stroke={2.2} /> Nạp quỹ</span>
        </div>
        {e.contributions.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 0', borderTop: i ? '1px solid var(--p-line)' : 'none' }}>
            <div className="soft num" style={{ fontSize: 13, width: 46 }}>{c.date}</div>
            <span style={{ fontSize: 14, flex: 1 }}>{c.label}</span>
            <span className="num pos" style={{ fontSize: 15 }}>+{fmtShort(c.amount)}</span>
          </div>
        ))}
      </>
    );

    return (
      <div className="screen">
        <Panel open={open} hero first pad={wide ? 32 : 24}>{heroInner}</Panel>
        <Panel open={open} pad={wide ? 26 : 20} style={open ? { marginTop: 26 } : { marginTop: wide ? 18 : 12 }}>{contribInner}</Panel>
      </div>
    );
  }

  // ─────────────────────────── SETTINGS ───────────────────────────
  function Settings({ t, aud, setAud, wide, open }) {
    const opts = [
      { key: 'young', name: 'Trẻ', style: 'Phong cách Ấm', desc: 'Màu ấm, bo tròn, từ ngữ đơn giản — thân thiện, khích lệ.', sw: ['#C8643C', '#6E8B6A', '#FBF4EA'] },
      { key: 'mid', name: 'Trung niên', style: 'Phong cách Tư gia', desc: 'Nền trầm, vàng đồng, thuật ngữ tài chính chuẩn — sang trọng, điềm đạm.', sw: ['#0C1420', '#C9A24B', '#ECE5D6'] },
    ];
    const styleInner = (
      <>
        <div className="eyebrow">Cá nhân hoá</div>
        <div className="head" style={{ fontSize: wide ? 22 : 18, marginTop: 8 }}>Phong cách hiển thị</div>
        <div className="soft" style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.5, maxWidth: 520 }}>
          Chọn theo độ tuổi và sở thích của bạn. Đã thiết lập khi tạo tài khoản, có thể đổi bất cứ lúc nào — toàn bộ app sẽ đổi màu, font và cách dùng từ cho phù hợp.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: wide ? '1fr 1fr' : '1fr', gap: 14, marginTop: 20 }}>
          {opts.map((o) => {
            const on = aud === o.key;
            return (
              <div key={o.key} className="clickable" onClick={() => setAud(o.key)} style={{ padding: 18, borderRadius: 'var(--p-radius-sm)', cursor: 'pointer',
                border: on ? '2px solid var(--p-accent)' : '1px solid var(--p-line)', background: on ? 'var(--p-accent-soft)' : 'var(--p-surface2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {o.sw.map((c, i) => <span key={i} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,.08)' }} />)}
                  </div>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: on ? 'var(--p-accent)' : 'transparent', border: on ? 'none' : '1.6px solid var(--p-line)', color: '#fff' }}>
                    {on && <Icon name="check" size={13} stroke={2.4} />}
                  </span>
                </div>
                <div className="head" style={{ fontSize: 17, marginTop: 14 }}>{o.name}</div>
                <div className="accent" style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>{o.style}</div>
                <div className="soft" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.45 }}>{o.desc}</div>
              </div>
            );
          })}
        </div>
      </>
    );
    const otherInner = (
      <>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Khác</div>
        {[['Đơn vị tiền tệ', 'VND (₫)'], ['Mục tiêu quỹ dự phòng', '6 tháng chi phí'], ['Nhắc review hằng tuần', 'Chủ nhật, 20:00']].map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderTop: i ? '1px solid var(--p-line)' : 'none' }}>
            <span style={{ fontSize: 14 }}>{r[0]}</span><span className="soft" style={{ fontSize: 13.5, fontWeight: 500 }}>{r[1]}</span>
          </div>
        ))}
      </>
    );
    return (
      <div className="screen">
        <Panel open={open} pad={wide ? 30 : 22} first>{styleInner}</Panel>
        <Panel open={open} pad={wide ? 26 : 20} style={open ? { marginTop: 26 } : { marginTop: wide ? 18 : 12 }}>{otherInner}</Panel>
      </div>
    );
  }

  window.ZXPScreens = { Dashboard, LatteFactor, EmergencyFund, Settings };
})();
