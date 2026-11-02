# ShortURL2 — Google Stitch export

Generated with the Google Stitch MCP server (`https://stitch.googleapis.com/mcp`, tool prefix
`mcp__stitch__*`). Design system first, then the seven screens of `design/screens-brief.md`,
each rendered against that one system.

| | |
| --- | --- |
| Project | `ShortURL2` — `projects/14306968687900525596` |
| projectId | `14306968687900525596` |
| assetId (design system) | `e3808bb5ad684a96b5822d8312c8c583` |
| `designSystem` passed to every screen | `assets/e3808bb5ad684a96b5822d8312c8c583` |
| `selectedScreenInstance` used to build it | `15745335617775118553` (`projects/14306968687900525596/screens/15745335617775118553`) |
| deviceType | `DESKTOP` (canvas 1280×1024, exported at 2×) |
| modelId | `GEMINI_3_8_FLASH` |
| Source of truth for tokens | `design/system.md` (unchanged) |

## Path taken

**Primary path.** `upload_design_md` and `create_design_system_from_design_md` both succeeded, so the
fallback path (inline tokens on screen 1, reuse its `designSystem`) was **not** used.

1. `create_project { title: "ShortURL2" }` → `projects/14306968687900525596`.
2. `design/system.md` rewritten into Stitch's DESIGN.md shape (YAML frontmatter with `name`,
   `description`, `fonts`, `typography`, `colors`, `radius`, `spacing`, followed by the prose
   sections verbatim) and uploaded base64 with `upload_design_md`. It returned
   `{ id: "15745335617775118553", sourceScreen: "projects/14306968687900525596/screens/15745335617775118553", width: 390, height: 884 }`.
3. `create_design_system_from_design_md { deviceType: "DESKTOP", selectedScreenInstance: {…} }` →
   `{ assetId: "e3808bb5ad684a96b5822d8312c8c583" }`.
4. `generate_screen_from_text` seven times, each with `designSystem: "assets/e3808bb5ad684a96b5822d8312c8c583"`,
   `deviceType: "DESKTOP"`, `modelId: "GEMINI_3_8_FLASH"` and that screen's brief section turned into a
   layout prompt with the copy quoted verbatim.
5. `get_project` → **incomplete for this project** (see *API behaviour*), so the screen resource names
   from the generation responses were used with `download_file`: once on `html_code.name`, once on
   `screenshot.name`.

## Screens

| # | Route | Screen (Stitch) | Files |
| --- | --- | --- | --- |
| 1 | `/` Crear link | `9274ccfd38b1406eb23c44cb29fce9d4` | `screens/01-crear-link.html`, `shots/01-crear-link.png` |
| 2 | `/go/:code` Intersticial | `7750d309eee54e8ba9208051afe817a0` | `screens/02-intersticial.html`, `shots/02-intersticial.png` |
| 3 | `/login` Acceso del dueño | `52e0d9b52fcd40c3ab72d2795278357b` | `screens/03-login.html`, `shots/03-login.png` |
| 4 | `/admin` Panel | `a05671132b644764bdca36abad7a2041` | `screens/04-panel.html`, `shots/04-panel.png` |
| 5 | `/admin/links` Índice de links | `49105d90202c4925b7fb48144166eaa0` | `screens/05-admin-links.html`, `shots/05-admin-links.png` |
| 6 | `/admin/links/:code` Detalle | `bb14cece883e4265969fae1d5a04dfb0` (edited; original `cc6bd90d3e984a4a8cf1038711a78d34`) | `screens/06-link-detalle.html`, `shots/06-link-detalle.png` |
| 7 | `/admin/analytics` Analíticas | `3c58636f17334c50837210ebd98bb9d7` (edited; original `f8702db3af474d56a127619690590756`) | `screens/07-admin-analytics.html`, `shots/07-admin-analytics.png` |

## What Stitch actually used

Fonts — verified in the exported CSS of all seven files, loaded from Google Fonts:
`Fraunces` (opsz 9..144, weight 600, tracking -0.03em), `Instrument Sans` (400/500/600),
`JetBrains Mono` (400/500, `tabular-nums`). No Inter, Roboto, Arial or `system-ui` on any element.
(The only `inter` substring in the files is `pointer-events` and the word "Intersticial".)

Colors — every screen declares exactly the eleven tokens of `design/system.md` and nothing else:
`#0E0F0C` ink-900 · `#141611` ink-800 · `#1B1E17` ink-700 · `#262A22` line ·
`#3A4033` line-strong · `#EDEEE6` bone · `#A8B39C` sage · `#8A9680` sage-dim ·
`#C8F751` lime · `#E2543A` rust · `#E8A33D` amber. No blue, cyan, purple or gradient anywhere;
lime is confined to primary actions, active nav, chart bars, codes and positive deltas.

## Defects found by reading my own screenshots

Every PNG was opened and inspected after download. Seven screens, four with real defects,
one repair round (`edit_screens`) each.

### Fixed

1. **06 Detalle — ragged lower split, plus a ghost button in the accent color.**
   The chart card stopped ~145 px above the second card of the 300 px rail (the split used
   `align-items: flex-start`), leaving a dead band under the chart and two different bottom edges;
   and `Abrir ↗` was hard-coded to `var(--lime)` although a ghost button is text-only.
   Repair: new screen `bb14cece883e4265969fae1d5a04dfb0`. Re-read: chart card and rail now share one
   bottom baseline, `Abrir ↗` is `#EDEEE6` (`style="color: var(--bone)"` in the HTML). Fixed.
2. **07 Analíticas — wrong font on a data value.**
   The Comparativa value `lunes` carried an inline `font-family: 'Instrument Sans'` at 34 px while
   `34,7` and `6` used the data face, breaking the `data-l` rule.
   Repair: new screen `3c58636f17334c50837210ebd98bb9d7`; the override is gone, `lunes` now renders
   in JetBrains Mono 500/34 px with the other two values. Fixed.

### Not fixed — `edit_screens` returned success text but changed nothing

3. **01 Crear link — invented footer copy and the dead band above it.**
   The screen ends with a footer bar the brief never asks for: `shorturl.app · 2025` on the left and
   `API`, `Privacidad`, `Términos` on the right — three destinations the product does not have. Above
   that bar sits ~180 px of nothing between the rate-limit note and the footer.
   Repair requested (delete the footer, rebalance to 96 px of air above the pill and below the note).
   The tool answered with a narrative that listed both fixes as applied, but the screen was **not**
   regenerated or mutated: the re-download is byte-identical (`13519` B HTML / `3776223` B PNG before
   and after) and `.page-footer` / `.footer-links a` are still in the CSS. One round is the limit, so
   this is shipped with the defect visible.
4. **04 Panel — clipped action ellipsis.**
   In every table row the `···` action affordance is cut by the table card's right edge (two dots
   visible instead of three): `.cell-action { width: 48px; padding-right: 24px }` leaves no room for
   the glyphs inside `overflow: hidden`.
   Repair requested (widen the cell, keep the 24 px gutter). Same silent no-op: re-download
   byte-identical (`20404` B / `3916834` B), `.cell-action` still 48 px. Shipped with the defect visible.

### Judged minor — recorded, not repaired

- **03 Login**: the `Recordarme 7 días` checkbox is a lime-filled box with a dark check at ~8 px
  radius, louder than the 18 px / `1px #3A4033` / radius-4 box the input styling implies, and it
  competes with the `Entrar` button. A text caret is painted before the password dots.
- **05 Índice de links**: the disabled `Anterior` control renders as a solid grey chip instead of the
  transparent secondary button (`.btn-page:disabled { opacity: .4 }` over a filled background), and
  ~260 px of empty page sits below the pagination footer.
- **02 Intersticial**: the grain overlay (`feTurbulence` noise, per `design/system.md`) reads as a
  coarse visible grid at 2×. Host emphasis is correct in CSS (`.host` bone 500 vs `.path` sage 400)
  but nearly invisible in the render.
- **All admin screens**: the sidebar `v1` badge renders as a near-circular 24 px pill — correct per the
  Pill component, but it reads as a circle rather than a pill.
- **06** keeps ~230 px of empty page below the content after the repair; that is the fixed
  1280×1024 Stitch viewport, not a layout break.

## API behaviour worth knowing

- `list_screens` and `get_project` are **stale/incomplete** for this project: both only ever return
  four screens plus the `DESIGN.md` preview (`15745335617775118553`) — screens 5, 6 and 7 and both
  edited screens never appear. Downloads therefore used the screen resource names returned by
  `generate_screen_from_text` / `edit_screens` directly, which do work with `download_file`.
- `edit_screens` has two outcomes: it either returns a **new** screen (6 and 7) or reports success
  while leaving the selected screen untouched (1 and 4). The two are only distinguishable by
  re-downloading and comparing bytes.
- The project still contains the two superseded originals of screens 6 and 7
  (`cc6bd90d3e984a4a8cf1038711a78d34`, `f8702db3af474d56a127619690590756`) plus the `DESIGN.md`
  preview instance; nothing was deleted.

## Copy

All copy is the brief's, verbatim. Two places the brief leaves data-shaped holes, filled minimally and
only there: the destinations of table rows 2-5 in screens 4, 5 and 7 (`ejemplo.com/precios`,
`docs.ejemplo.com/guia/urls-cortas`, `tienda.ejemplo.com/lanzamiento`, `ejemplo.com/newsletter`,
`ejemplo.com/viejo-post`) and the aggregate `9.482` with its weekday values in screen 7, which the
brief's "7 bars with values in data-s" requires but does not spell out. Nothing else was added or
rewritten.

---

## DESIGN.md uploaded to Stitch

```markdown
---
name: ShortURL2 — Warm Editorial
description: Warm editorial design system. Serif display (Fraunces), neutral sans body (Instrument Sans), mono for data (JetBrains Mono). Near-black warm ink background, bone text, acid lime accent. Hairlines over cards, tabular numerals, generous air.
fonts:
  - family: Fraunces
    weights: [600]
    use: display headlines
  - family: Instrument Sans
    weights: [400, 500, 600]
    use: body and UI
  - family: JetBrains Mono
    weights: [400, 500]
    use: codes, URLs, counts, metadata
typography:
  display-xl: { family: Fraunces, size: 64px, lineHeight: 1.02, weight: 600, tracking: -0.03em }
  display-l: { family: Fraunces, size: 44px, lineHeight: 1.06, weight: 600, tracking: -0.03em }
  display-m: { family: Fraunces, size: 32px, lineHeight: 1.10, weight: 600, tracking: -0.03em }
  title: { family: Instrument Sans, size: 20px, lineHeight: 1.30, weight: 600 }
  body: { family: Instrument Sans, size: 15px, lineHeight: 1.55, weight: 400 }
  small: { family: Instrument Sans, size: 13px, lineHeight: 1.45, weight: 400 }
  micro: { family: Instrument Sans, size: 12px, lineHeight: 1.20, weight: 500, tracking: 0.08em, transform: uppercase }
  data-l: { family: JetBrains Mono, size: 34px, lineHeight: 1.10, weight: 500 }
  data-m: { family: JetBrains Mono, size: 15px, lineHeight: 1.40, weight: 400 }
  data-s: { family: JetBrains Mono, size: 12px, lineHeight: 1.40, weight: 400 }
colors:
  ink-900: "#0E0F0C"
  ink-800: "#141611"
  ink-700: "#1B1E17"
  line: "#262A22"
  line-strong: "#3A4033"
  bone: "#EDEEE6"
  sage: "#A8B39C"
  sage-dim: "#8A9680"
  lime: "#C8F751"
  lime-ink: "#0E0F0C"
  rust: "#E2543A"
  amber: "#E8A33D"
radius:
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px
spacing: [4, 8, 12, 16, 24, 32, 48, 64, 96]
---

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
```
