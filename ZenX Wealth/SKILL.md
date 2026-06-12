---
name: zenx-wealth-design
description: Use this skill to generate well-branded interfaces and assets for ZenX Wealth, a Vietnamese personal-finance app for late starters, either for production or throwaway prototypes/mocks. Contains design guidelines, two audience themes (Trẻ/Ấm and Trung niên/Tư gia), colors, type, fonts, terminology, and UI kit components.
user-invocable: true
---

Read the `readme.md` file within this skill, then explore the other files (`tokens/`, `components/core/`, `guidelines/`, `ui_kits/wealth-app/`, `prototype/`).

Key facts to load first:
- **One app, two audiences.** Skin + wording switch via `data-theme="young"` (Trẻ → Ấm, warm light) or `data-theme="mid"` (Trung niên → Tư gia, dark navy+gold). Link `styles.css`; tokens are `--zx-*`.
- **Layout default is "Ít khung"** (open/airy — hairlines + whitespace), with a "Nhiều khung" (card) variant.
- **Vietnamese-first.** Use the two terminology registers in `guidelines/terminology.html` (simple for Trẻ, standard finance terms for Trung niên). VND with compact units (`12,5 tr`).
- Fonts are Google Fonts (Be Vietnam Pro, Bricolage Grotesque, Hanken Grotesk, Playfair Display). Icons: the inline set in `prototype/ui.jsx`, or Lucide for production.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets/tokens out and produce static HTML the user can view. If working on production code, copy the tokens and components and follow the rules here. If invoked without guidance, ask what they want to build, ask a few questions, and act as an expert ZenX Wealth designer who outputs HTML artifacts or production code as needed.
