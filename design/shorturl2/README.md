# ShortURL2 — design source

Source of truth: `ShortUrl2.fig` (OpenPencil document, page `ShortURL2 · Pantallas`).
Rendered reference: `export/*.png` (2x exports, 2880px wide).

| Screen | File | Artboard |
| --- | --- | --- |
| 01 Public create | `export/01-crear-link.png` | 1440x900 |
| 02 Owner login | `export/02-login-dueno.png` | 1440x900 |
| 03 Dashboard | `export/03-dashboard.png` | 1440x1024 |
| 04 Link detail | `export/04-detalle-link.png` | 1440x1024 |

## Color tokens

Collection `ShortURL2`, bound as real variables in the document.

| Token | Value | Use |
| --- | --- | --- |
| `bg` | `#0A0C10` | page background |
| `surface` | `#12151C` | cards, sidebar |
| `surface-raised` | `#181C25` | chips, secondary buttons |
| `border` | `#232935` | default borders, dividers |
| `border-strong` | `#2E3646` | inputs, outlined buttons |
| `text` | `#E9EDF5` | primary text |
| `text-muted` | `#9AA4B8` | secondary text |
| `text-dim` | `#808A9E` | labels, metadata |
| `accent` | `#5B8CFF` | primary action, links, bars |
| `positive` | `#3DDC97` | up deltas, today, active dot |
| `danger` | `#FF6B6B` | destructive action |
| `warning` | `#FFB454` | reserved |

Contrast decisions, measured: text on `accent` is `#0A0C10` (6.2:1) not white
(3.16:1, fails AA). `text-dim` is `#808A9E` (5.25:1 on `surface`); the earlier
`#6B7488` was 3.90:1 and failed.

## Typography

- UI: **Inter** — 12/13/14/16/17/20/24/56px, bold headings with negative tracking.
- Numerals, codes, metadata: **JetBrains Mono** — 12/13/15/17/30px.
- Micro labels are 12px, uppercase, `0.6–0.8px` tracking.

## Layout

8px spacing grid; cards `rounded 14–18px`; inputs and buttons `rounded 8–10px`.
Radii at 4/6/8/10/12/14/18/99. Sidebar is 248px, content padding 32px.

## Known deltas between document and render

1. Hero headline overflows its 720px column and is drawn on top of the subtitle
   (`01-crear-link.png`). Fix in code: max width plus real wrapping, never a
   single clipped line.
2. Sidebar footer: the `dueño` label and `Salir` sit too close (`03-dashboard.png`).
3. Table header row leaves a ~63px gap before the first row (`03-dashboard.png`).
4. `export_image` is unavailable in this OpenPencil build; exports are manual and
   are the only ground truth for visual fidelity.
