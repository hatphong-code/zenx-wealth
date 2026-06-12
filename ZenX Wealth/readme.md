# ZenX Wealth — Design System

Visual + interaction system for **ZenX Wealth**, a personal-finance operating system for *late starters* (người khởi đầu muộn), built on the philosophy of *Start Late, Finish Rich* + the **Latte Factor**: control cash flow → stop small leaks → pay yourself first → build an emergency fund → review weekly. Vietnamese-first, VND.

The defining idea of this system is **one app, two audiences**. A single layout is re-skinned (color + font) and re-worded (terminology) for who's using it:

| | **Trẻ** (younger) | **Trung niên** (middle-aged) |
|---|---|---|
| Style | **Ấm** — warm, friendly, rounded | **Tư gia** — private-banking, refined |
| Mode | Light (cream) | Dark (navy + gold) |
| Display font | Bricolage Grotesque | Playfair Display |
| Body font | Be Vietnam Pro | Hanken Grotesk |
| Wording | Simple ("Tiền vặt rò rỉ") | Standard ("Latte Factor") |

The chosen interface direction is **Ít khung** (open / airy) — hairlines and whitespace instead of nested boxes — with a **Nhiều khung** (card) variant available.

## Sources
- Codebase surveyed: local `zenx-wealth/` (React + Vite + Tailwind + Firebase MVP). This system was derived from its product docs and screens, not copied from its (dark-blue) styling — it's a new aesthetic direction approved by the client.
- Live product: `wealth.zenx.asia`.

---

## CONTENT FUNDAMENTALS
- **Language**: Vietnamese-first. English kept only for brand/established terms (Latte Factor, Pay Yourself First, ZenX Wealth).
- **Address**: warm second person, no pronoun drama — "bạn". Encouraging but never hype ("Tiếp tục nhé!", "Giữ nhịp này…"). Never "get rich quick".
- **Two registers** (see `guidelines/terminology.html`):
  - *Trẻ*: plain, everyday words — "Tiền dư tháng này", "Quỹ phòng thân", "Tự trích trước".
  - *Trung niên*: standard finance terms — "Dòng tiền ròng", "Quỹ dự phòng", "Trả mình trước (Pay Yourself First)".
- **Numbers**: VND, Vietnamese grouping; compact form uses a non-breaking space — `12,5 tr`, `412 tr`, `700k`, `96.000.000 ₫`. Deltas read as health, not math ("↓ 18% tháng này" is good).
- **Casing**: sentence case for body/headings; UPPERCASE + tracked `.16em` only for eyebrows/section labels.
- **Emoji**: essentially none. A single 👋 appears beside a greeting in the warmest contexts; otherwise avoid.
- **Tone vibe**: calm, disciplined, system-building. "Mỗi đồng tiền có một nhiệm vụ."

## VISUAL FOUNDATIONS
- **Two palettes** (`tokens/colors.css`): warm earth (terracotta `#C8643C`, sage `#5E7E5A`, bronze `#B07D3F`, cream `#FBF4EA`) for Trẻ; navy (`#0C1420`/`#101B2B`) + gold (`#C9A24B`) + ivory (`#ECE5D6`) for Trung niên.
- **Semantic color**: green = positive/cash-positive; the brand accent (terracotta or gold) carries leaks/Latte; soft tints back pills and icon tiles. Kept legible in both modes.
- **Type** (`tokens/typography.css`): big tabular figures in the display font; eyebrows in body font, uppercase tracked. Vietnamese coverage verified on all four families.
- **Spacing & shape** (`tokens/spacing.css`): 4-based scale. Radii are **theme-dependent** — Ấm is rounder (24/16), Tư gia tighter (16/11).
- **Surfaces**: Ấm cards = white, hairline `#F3EAD9` border, soft warm shadow. Tư gia cards = `#101B2B`, gold hairline border `rgba(201,162,75,.18)`, deep shadow. In **open** mode there are no card boxes — just a 1px `--zx-line` hairline + generous padding.
- **Backgrounds**: solid cream (Ấm) or a subtle top-radial navy gradient (Tư gia). Hero blocks may use `--zx-bg-gradient`. No photography, no noise.
- **Progress**: rounded track (`--zx-track`) + gradient fill (`--zx-fill`); the emergency fund uses a circular `Ring`. Bars/rings animate width/dashoffset with `cubic-bezier(.2,.7,.3,1)`.
- **Motion**: theme swap cross-fades colors over ~.5s; screens enter with a 10px translate (never an opacity gate — content is visible without JS/animation). No bounces, no infinite loops.
- **Hover/press**: cards lift `translateY(-2px)`; nav/segmented shift background tint. Subtle.
- **Charts**: minimal inline sparklines (2px stroke, optional gradient fill), no axes/gridlines.

## ICONOGRAPHY
- Line icons, ~1.7 stroke, rounded caps/joins, on a 20×20 grid — a small hand-built set lives in `prototype/ui.jsx` (`ZXPIcon`: home, coffee, food, bag, play, truck, shield, piggy, trend, settings, chevron, arrow, sparkle, wallet, plus, check, flag, bell).
- For production, the closest CDN match is **Lucide** (same stroke weight / rounded style) — `https://unpkg.com/lucide@latest`. **Substitution flagged**: we did not ship an icon-font binary; use Lucide or the inline set.
- Icons sit in a rounded `--zx-radius-sm` tile filled with `--zx-icon-bg`, foreground in the accent.
- No emoji as icons; no unicode-glyph icons.

---

## INDEX / MANIFEST
- `styles.css` — entry point (`@import`s the three token files). Link this one file.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`. Switch theme with `data-theme="young" | "mid"` on a wrapper (default `:root` = young).
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand, principle, terminology, logo).
- `components/core/` — `Panel`, `Pill`, `StatTile`, `ProgressBar`, `Ring`, `Segmented`, `NavItem` (`.jsx` + `.d.ts` + `.prompt.md`, with a showcase card).
- `ui_kits/wealth-app/` — the full app recreation (3 screens + Settings, both themes, both devices).
- `prototype/` — the app's logic/data/screens (source for the UI kit); `/ZenX Wealth Prototype.html` is the standalone build.
- `ZenX Wealth Directions.html` — the original 4-direction exploration canvas (Tĩnh / Ấm / Tạp chí / Tư gia).
- `SKILL.md` — how to use this system as an Agent Skill.

> To share with your org, set the file type to **Design System** in the Share menu.
