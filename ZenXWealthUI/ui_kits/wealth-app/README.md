# Wealth App — UI Kit

High-fidelity recreation of the ZenX Wealth personal-finance app. Open `index.html`.

## What it shows
- **3 screens + Settings**: Tổng quan (Dashboard), Latte Factor, Quỹ dự phòng (Emergency Fund), Cài đặt.
- **Two audience themes** (a real product setting, chosen at onboarding):
  - **Trẻ → Ấm** — warm cream/terracotta/sage, Be Vietnam Pro + Bricolage, simple wording.
  - **Trung niên → Tư gia** — dark navy + gold, Playfair + Hanken, standard financial terms.
- **Two devices**: Mobile (bottom tabs) and Desktop (sidebar), with fit-to-viewport scaling.
- **Layout**: defaults to the **Ít khung** (open / airy) style; **Nhiều khung** (card) available via the top toggle.

The top control bar (Đối tượng / Giao diện / Thiết bị) is presentation chrome for browsing combos. Inside the product these map to: audience = onboarding/Settings choice, layout = a display preference, device = responsive.

## Source
Logic + screens live in `/prototype/` (`core.js` data + terminology + themes, `ui.jsx` primitives, `screens.jsx`, `app.jsx`). This kit loads those directly. The standalone user-facing build is `/ZenX Wealth Prototype.html` at the project root.

## Interactions
- Tap stat tiles (Latte / Quỹ) to navigate.
- Tap weekly-focus rows to tick them off.
- Settings → Phong cách hiển thị switches the whole app theme + terminology live.
- Selections persist to localStorage.
