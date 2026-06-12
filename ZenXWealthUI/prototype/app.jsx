// ZenX Wealth prototype — app shell (frames + nav + state) and presentation control bar.
(function () {
  const { terms, themes, data, fmtShort } = window.ZXP;
  const Icon = window.ZXPIcon, Seg = window.ZXPSegmented;
  const S = window.ZXPScreens;
  const { useState, useEffect, useLayoutEffect, useRef } = React;

  const LS = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

  const NAV = [
    { key: 'dashboard', icon: 'home' },
    { key: 'latte', icon: 'coffee' },
    { key: 'emergency', icon: 'shield' },
    { key: 'settings', icon: 'settings' },
  ];

  function StatusBar() {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 24px 0', fontSize: 13, fontWeight: 700, flex: '0 0 auto' }}>
        <span>9:41</span>
        <span style={{ fontSize: 12, opacity: .75, display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>5G ▮▮▮ 56%</span>
      </div>
    );
  }

  function Avatar({ size = 40 }) {
    return <div style={{ width: size, height: size, borderRadius: '50%', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * .42, color: '#fff', fontFamily: 'var(--p-fhead)',
      background: 'linear-gradient(135deg, var(--p-accent), var(--p-gold))' }}>P</div>;
  }

  function MobileTopBar({ t }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 10px', flex: '0 0 auto' }}>
        <Avatar size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="soft" style={{ fontSize: 12.5 }}>{t.greeting}</div>
          <div className="head" style={{ fontSize: 17 }}>{data.phase.label} · {data.phase.name}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--p-soft)', background: 'var(--p-surface2)' }}>
          <Icon name="bell" size={18} />
        </div>
      </div>
    );
  }

  function BottomNav({ t, screen, onNav }) {
    return (
      <div style={{ flex: '0 0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', padding: '8px 10px 14px',
        background: 'var(--p-navbg)', borderTop: '1px solid var(--p-line)', backdropFilter: 'blur(10px)' }}>
        {NAV.map((n) => {
          const on = screen === n.key;
          return (
            <button key={n.key} onClick={() => onNav(n.key)} style={{ border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 0',
              color: on ? 'var(--p-accent)' : 'var(--p-soft)', fontFamily: 'var(--p-fbody)' }}>
              <Icon name={n.icon} size={21} stroke={on ? 2 : 1.7} />
              <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 500 }}>{t.nav[n.key]}</span>
            </button>
          );
        })}
      </div>
    );
  }

  function Sidebar({ t, aud, screen, onNav }) {
    return (
      <div style={{ width: 244, flex: '0 0 auto', borderRight: '1px solid var(--p-line)', padding: '30px 22px', display: 'flex', flexDirection: 'column',
        background: 'var(--p-navbg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 8px' }}>
          <div style={{ width: 38, height: 38, borderRadius: themes[aud].mode === 'dark' ? '50%' : 12, border: themes[aud].mode === 'dark' ? '1px solid var(--p-gold)' : 'none',
            background: themes[aud].mode === 'dark' ? 'transparent' : 'linear-gradient(135deg,var(--p-accent),var(--p-gold))',
            color: themes[aud].mode === 'dark' ? 'var(--p-gold)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--p-fhead)', fontWeight: 700, fontSize: 15 }}>
            {themes[aud].mode === 'dark' ? 'ZX' : 'Z'}
          </div>
          <span className="head" style={{ fontSize: 18 }}>ZenX Wealth</span>
        </div>
        <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV.map((n) => {
            const on = screen === n.key;
            return (
              <button key={n.key} onClick={() => onNav(n.key)} style={{ border: 'none', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 'var(--p-radius-sm)', fontFamily: 'var(--p-fbody)',
                background: on ? 'var(--p-accent-soft)' : 'transparent', color: on ? 'var(--p-accent)' : 'var(--p-soft)', fontWeight: on ? 700 : 500, fontSize: 14, transition: 'all .2s' }}>
                <Icon name={n.icon} size={19} stroke={on ? 2 : 1.7} /> {t.nav[n.key]}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 'auto', padding: '16px 12px 0', borderTop: '1px solid var(--p-line)' }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>{t.netWorth}</div>
          <div className="num" style={{ fontSize: 22 }}>{fmtShort(data.netWorth)}</div>
        </div>
      </div>
    );
  }

  function DesktopTopBar({ t, screen }) {
    return (
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 16, padding: '20px 36px 18px', borderBottom: '1px solid var(--p-line)' }}>
        <div style={{ minWidth: 0 }}>
          <div className="soft" style={{ fontSize: 13, lineHeight: 1.3 }}>{t.greeting}</div>
          <div className="head" style={{ fontSize: 22, lineHeight: 1.2, marginTop: 2, whiteSpace: 'nowrap' }}>{t.nav[screen]}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="pill" style={{ background: 'var(--p-accent)', color: '#fff', cursor: 'pointer', padding: '9px 16px' }}><Icon name="plus" size={14} stroke={2.2} /> Thêm giao dịch</span>
          <Avatar size={40} />
        </div>
      </div>
    );
  }

  function Screen({ aud, screen, device, open, focus, setFocus, setAud }) {
    const t = terms[aud];
    const wide = device === 'desktop';
    const onNav = (s) => setScreenGlobal(s);
    const onToggleFocus = (id) => setFocus((f) => f.map((x) => x.id === id ? { ...x, done: !x.done } : x));
    const common = { t, wide, open };
    if (screen === 'dashboard') return <S.Dashboard {...common} onNav={onNav} focus={focus} onToggleFocus={onToggleFocus} />;
    if (screen === 'latte') return <S.LatteFactor {...common} />;
    if (screen === 'emergency') return <S.EmergencyFund {...common} />;
    if (screen === 'settings') return <S.Settings {...common} aud={aud} setAud={setAud} />;
    return null;
  }

  let setScreenGlobal = () => {};

  function PhoneFrame({ aud, screen, open, focus, setFocus, setAud }) {
    const t = terms[aud];
    return (
      <div style={{ width: 392, height: 812, borderRadius: 46, overflow: 'hidden', position: 'relative',
        boxShadow: '0 0 0 10px #16161a, 0 0 0 12px #2a2a30, 0 40px 90px rgba(0,0,0,.4)' }}>
        <div className="zxp" style={{ ...themes[aud].vars, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <StatusBar />
          <MobileTopBar t={t} />
          <div style={{ flex: 1, overflow: 'auto', padding: '6px 18px 20px', scrollbarWidth: 'none' }}>
            <Screen aud={aud} screen={screen} device="mobile" open={open} focus={focus} setFocus={setFocus} setAud={setAud} />
          </div>
          <BottomNav t={t} screen={screen} onNav={setScreenGlobal} />
        </div>
      </div>
    );
  }

  function DesktopFrame({ aud, screen, open, focus, setFocus, setAud }) {
    const t = terms[aud];
    const dark = themes[aud].mode === 'dark';
    return (
      <div style={{ width: 1180, height: 752, borderRadius: 16, overflow: 'hidden', boxShadow: '0 40px 90px rgba(0,0,0,.28)' }}>
        {/* browser chrome */}
        <div style={{ height: 42, display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', background: dark ? '#080d14' : '#E7E1D5' }}>
          <div style={{ display: 'flex', gap: 7 }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#E1604F' }} />
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#E8B23A' }} />
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#5FB85F' }} />
          </div>
          <div style={{ flex: 1, maxWidth: 340, margin: '0 auto', background: dark ? '#101b2b' : '#FBF8F1', borderRadius: 8, padding: '6px 14px',
            fontSize: 12.5, color: dark ? '#8A93A1' : '#7C756A', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>wealth.zenx.asia</div>
          <div style={{ width: 52 }} />
        </div>
        <div className="zxp" style={{ ...themes[aud].vars, height: 710, display: 'flex' }}>
          <Sidebar t={t} aud={aud} screen={screen} onNav={setScreenGlobal} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <DesktopTopBar t={t} screen={screen} />
            <div style={{ flex: 1, overflow: 'auto', padding: '28px 36px 40px', scrollbarWidth: 'none' }}>
              <Screen aud={aud} screen={screen} device="desktop" open={open} focus={focus} setFocus={setFocus} setAud={setAud} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  function App() {
    const [aud, setAud] = useState(LS('zxp-aud', 'young'));
    const [device, setDevice] = useState(LS('zxp-device', 'mobile'));
    const [screen, setScreen] = useState(LS('zxp-screen', 'dashboard'));
    const [layout, setLayout] = useState(LS('zxp-layout', 'cards'));
    const [focus, setFocus] = useState(data.focus);
    setScreenGlobal = (s) => { setScreen(s); save('zxp-screen', s); };

    useEffect(() => save('zxp-aud', aud), [aud]);
    useEffect(() => save('zxp-device', device), [device]);
    useEffect(() => save('zxp-layout', layout), [layout]);

    const chooseAud = (a) => { setAud(a); };

    // fit-scale the frame
    const stageRef = useRef(null);
    const [scale, setScale] = useState(1);
    const fw = device === 'desktop' ? 1180 : 392;
    const fh = device === 'desktop' ? 752 : 812;
    useLayoutEffect(() => {
      const fit = () => {
        const el = stageRef.current; if (!el) return;
        const aw = el.clientWidth - 48, ah = el.clientHeight - 48;
        setScale(Math.min(1, aw / fw, ah / fh));
      };
      fit();
      window.addEventListener('resize', fit);
      return () => window.removeEventListener('resize', fit);
    }, [fw, fh]);

    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#E9E5DD', fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
        {/* presentation control bar */}
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 18, padding: '12px 22px', background: '#fff', borderBottom: '1px solid #E2DCD0', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#C8643C,#B07D3F)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, fontFamily: "'Bricolage Grotesque',sans-serif" }}>Z</div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#2A241E' }}>ZenX Wealth</span>
            <span style={{ fontSize: 12, color: '#9B9081', background: '#F1ECE2', padding: '3px 9px', borderRadius: 999, fontWeight: 600 }}>Prototype</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <span style={{ fontSize: 12.5, color: '#8C8273', fontWeight: 600, whiteSpace: 'nowrap' }}>Đối tượng</span>
            <Seg value={aud} onChange={chooseAud} options={[{ value: 'young', label: 'Trẻ · Ấm' }, { value: 'mid', label: 'Trung niên · Tư gia' }]} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12.5, color: '#8C8273', fontWeight: 600, whiteSpace: 'nowrap' }}>Giao diện</span>
            <Seg value={layout} onChange={(l) => setLayout(l)} options={[{ value: 'cards', label: 'Nhiều khung' }, { value: 'open', label: 'Ít khung' }]} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12.5, color: '#8C8273', fontWeight: 600, whiteSpace: 'nowrap' }}>Thiết bị</span>
            <Seg value={device} onChange={(d) => setDevice(d)} options={[{ value: 'mobile', label: 'Mobile' }, { value: 'desktop', label: 'Desktop' }]} />
          </div>
        </div>

        {/* stage */}
        <div ref={stageRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center', transition: 'transform .35s ease' }}>
            {device === 'desktop'
              ? <DesktopFrame aud={aud} screen={screen} open={layout === 'open'} focus={focus} setFocus={setFocus} setAud={chooseAud} />
              : <PhoneFrame aud={aud} screen={screen} open={layout === 'open'} focus={focus} setFocus={setFocus} setAud={chooseAud} />}
          </div>
        </div>
      </div>
    );
  }

  window.ZXPApp = App;
})();
