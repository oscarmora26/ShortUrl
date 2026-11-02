# ShortURL2 — Design system

Direction: **warm editorial**. Serif display, neutral sans body, mono for data.
Near-black warm ink, bone text, acid lime accent. Hairlines over cards, tabular
numerals, generous air. Deliberately not Inter/Roboto/system fonts, not blue-on-black.

Fonts (Google Fonts, CDN):
- Display: **Fraunces** 600, optical size 72, tracking -0.03em
- Body/UI: **Instrument Sans** 400/500/600
- Data: **JetBrains Mono** 400/500, `font-variant-numeric: tabular-nums`

## Color

Declared once in `:root`. No literal hex anywhere else.

| Token | Value | Use |
| --- | --- | --- |
| `--ink-900` | `#0E0F0C` | page background |
| `--ink-800` | `#141611` | surface (cards, sidebar) |
| `--ink-700` | `#1B1E17` | raised (inputs, chips, hover) |
| `--line` | `#262A22` | default border, hairline separator |
| `--line-strong` | `#3A4033` | input border, focus ring base |
| `--bone` | `#EDEEE6` | primary text |
| `--sage` | `#A8B39C` | secondary text |
| `--sage-dim` | `#8A9680` | labels, metadata (≥4.5:1 on `--ink-800`) |
| `--lime` | `#C8F751` | accent, primary action, active state |
| `--lime-ink` | `#0E0F0C` | text on `--lime` (13:1, never white) |
| `--rust` | `#E2543A` | destructive |
| `--amber` | `#E8A33D` | warning, expiring links |

Rules:
- Positive deltas use `--lime`. Negative use `--rust`. Never green-for-up/red-for-down defaults.
- Text on `--lime` is always `--lime-ink`. White fails AA.
- Minimum text size 12px. `--sage-dim` is the floor for contrast; anything lighter fails.

## Type scale

Nothing outside this scale.

| Name | Size/Line | Family | Weight | Use |
| --- | --- | --- | --- | --- |
| `display-xl` | 64/1.02 | Fraunces | 600 | public hero headline |
| `display-l` | 44/1.06 | Fraunces | 600 | page titles in admin |
| `display-m` | 32/1.10 | Fraunces | 600 | section titles |
| `title` | 20/1.30 | Instrument Sans | 600 | card titles |
| `body` | 15/1.55 | Instrument Sans | 400 | default text |
| `small` | 13/1.45 | Instrument Sans | 400 | secondary text |
| `micro` | 12/1.20 | Instrument Sans | 500 | labels, uppercase, `0.08em` |
| `data-l` | 34/1.10 | JetBrains Mono | 500 | big stat numbers |
| `data-m` | 15/1.40 | JetBrains Mono | 400 | codes, URLs, counts |
| `data-s` | 12/1.40 | JetBrains Mono | 400 | metadata, axis labels |

## Space, radius, borders

- Space: **4, 8, 12, 16, 24, 32, 48, 64, 96** only. Page padding 32. Section gap 24. Card padding 20 or 24.
- Radius: **4, 8, 12** and `full`. Nothing larger. Editorial surfaces stay sharp.
- Borders: `1px --line` default; `1px --line-strong` on inputs and hover; focus is a `2px --lime` outline with `2px` offset.
- Shadows: none. Depth comes from `--ink-800` against `--ink-900` plus hairlines. One exception: the public form card gets `0 24px 60px rgb(0 0 0 / .45)`.
- Grain: a single `::after` overlay at `3%` opacity over the page body.

## Layout

- Marketing/public: max width 1200, 12 columns, gutter 24, centered.
- Admin: fixed sidebar 264, content max width 1120, padding 32, top bar 72.
- Tables: header row 44, data rows 56, hairline separators, no zebra.

## Components (one implementation each)

- **Button**: `primary` = `--lime` bg + `--lime-ink` text; `secondary` = transparent + `1px --line-strong`; `ghost` = text only; `danger` = transparent + `1px --rust` + `--rust` text. Height 40 (sm 32). Radius 8. Hover: `brightness(1.08)` on primary, `--ink-700` bg on secondary.
- **Input**: height 44, `--ink-700` bg, `1px --line-strong`, radius 8, `body` text, placeholder `--sage-dim`. Focus: `2px --lime` outline. Error: `1px --rust` + message in `small --rust`.
- **Field**: `micro` label above, 8 gap, then input. Label case is uppercase, `--sage-dim`.
- **Card**: `--ink-800`, `1px --line`, radius 12, padding 24.
- **Stat**: `micro` label, `data-l` value, `small` delta. No icon, no gradient.
- **NavItem**: 40 tall, radius 8, `small` 500. Active: `--ink-700` bg + a 2x14 `--lime` bar on the left + `--bone` text. Inactive: `--sage` text, no bar.
- **Table**: header `micro` uppercase `--sage-dim`; code cells in `data-m --lime`; counts in `data-m` right-aligned; meta in `data-s --sage-dim`.
- **Chart**: bars 2px top radius, `--lime`, days with zero clicks drawn as a 2px `--line` stub. Axis labels `data-s --sage-dim`. The current day bar is `--lime` at 100%, history at 65% opacity.
- **Pill**: 24 tall, radius full, `--ink-700`, `micro` text, optional 6px dot.
- **EmptyState**: `display-m` title, one `body` line, one `secondary` button. Centered, 96 vertical padding.

## Motion

- Page load: sections fade+rise `translateY(8px) → 0`, 240ms `cubic-bezier(.2,.8,.2,1)`, staggered 40ms per section. Max 6 staggered elements.
- Bars: grow from the baseline once on load, 320ms, staggered 8ms.
- Hover/focus only changes color, border, opacity. **Never scale data, never animate numbers.**
- Respect `prefers-reduced-motion`: all of the above off, no exceptions.

## Hard rules

1. No color literal outside `:root`.
2. No font size, radius, or spacing value outside the scales above.
3. No second component that does the same thing with different numbers.
4. Every admin route has an empty state and a loading skeleton.
5. Contrast: body text ≥ 7:1, labels ≥ 4.5:1, verified before delivery.
