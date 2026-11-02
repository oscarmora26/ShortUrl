# ShortURL2 — Screen brief (7 screens)

Feed this together with `design/system.md`. Every screen uses only components and
tokens defined there. Copy is final: do not rewrite it to make lines fit.

**Removed from the product:** any "created by" / author column (there is no user
model — links are created by anonymous visitors or by the owner), and the Settings
screen (configuration lives in environment variables).

**Roles:** the public shortens links with no account. Only the owner sees analytics,
behind a single login.

---

## 1. `/` — Crear link (public)

Purpose: shorten a URL in one action, and show the result immediately.

- Top bar 72: wordmark `shorturl` (Fraunces, `title`) + `v1` pill. Right: text link `Panel` and a `secondary` button `Iniciar sesión`.
- Hero, centered, max 760:
  - Pill with lime dot: `Analíticas en vivo`
  - `display-xl`: `Links cortos.` / `Datos que sirven.` (two lines, forced break)
  - `body --sage`: `Pegá cualquier URL, obtené un link de 7 caracteres y mirá exactamente cuándo lo abren.`
- Form card (`--ink-800`, radius 12, padding 24, shadow), max 720:
  - `micro` label: `URL ORIGINAL`
  - Row: input (placeholder `https://ejemplo.com/una/url/muy/larga`) + `primary` button `Acortar`
  - Hairline
  - `micro` label: `LINK GENERADO`
  - Result strip (`--ink-700`, radius 8): lime dot + `data-m` `shorturl.app/x7Kd2pQ`, then `secondary` button `Copiar`
  - Two meta rows in `data-s`, label column 72 fixed: `resp.` → `302 · Cache-Control: no-store`; `destino` → `ejemplo.com/una/url/muy/larga`
- Note under card, `small --sage-dim`: `Máximo 20 links por hora por IP · los clics de previews también cuentan`

States: empty (as above), invalid URL (input border `--rust`, message `Ingresá una URL http o https válida.`), rate limited (`Dejaste de poder crear links por esta hora. Probá más tarde.`), success (result strip appears with 240ms rise).

## 2. `/go/:code` — Intersticial (public, only for anonymous links)

Purpose: show where a short link goes before redirecting. Kills blind phishing.

- No nav. Centered card, max 560.
- `micro --amber`: `VAS A SALIR DE SHORTURL`
- `display-m`: `Este link te lleva a`
- Destination in a `--ink-700` strip, `data-m`, wrapping, with the bare host emphasized: `ejemplo.com/blog/como-acortar-urls`
- `small --sage`: `No podemos verificar el contenido del destino. Si no esperabas este link, cerralo.`
- Actions: `primary` `Continuar` + `secondary` `Volver`
- Meta line `data-s --sage-dim`: `Creado hace 3 días · expira en 27 días`
- Small footer link: `Reportar este link`

## 3. `/login` — Acceso del dueño

Purpose: get the owner in without friction. Currently the weakest screen.

- Split layout, full height. Left 44% `--ink-800` panel with a hairline right border; right is the form on `--ink-900`.
- Left panel, bottom-aligned: `display-m` `El panel es tuyo.` and `small --sage` `Los links son públicos. Las métricas, no.` Above it, the wordmark at the top of the panel.
- Right panel, centered, max 380:
  - `micro --sage-dim`: `ACCESO AL PANEL`
  - `display-m`: `Entrá a tus métricas`
  - Field: `micro` `CONTRASEÑA` + input with dots
  - Row: checkbox `Recordarme 7 días`
  - `primary` button full width: `Entrar`
  - Hairline + `small --sage-dim`: `Sesión firmada en este navegador. Sin correo, sin registro.`
- States: wrong password → input `--rust` border, `small --rust` `Contraseña incorrecta.`; loading → button shows `Entrando…` and disables; success → redirect to `/admin`.
- No "show password" affordance, no social buttons, no sign-up link.

## 4. `/admin` — Panel

Purpose: answer "how are my links doing right now" in one screen.

- Sidebar 264: wordmark top; nav `Panel` (active), `Links`, `Analíticas`; bottom, above a hairline: owner name `oscar` + `dueño` stacked, and a `ghost` `Salir` on the right.
- Top bar 72: `display-l` `Panel` + `small --sage-dim` `Últimos 30 días · Buenos Aires`. Right: search input 240 (`Buscar código o URL`) + `primary` `+ Nuevo link`.
- Content, gap 24:
  - Four `Stat` cards: `Clics totales` `1.284` `↑ 12,4% vs. período anterior` (lime); `Links activos` `37` `3 creados esta semana`; `Clics hoy` `47` `↑ 8 vs. ayer`; `Promedio diario` `42,8` `últimos 30 días`
  - Chart card, fills remaining height: `title` `Clics por día`, legend right (`Clics` lime, `Hoy` lime 100%), bars grow from baseline, axis `1 may` / `15 may` / `30 may`
  - Table card: header `CÓDIGO` `DESTINO` `CLICS` `CREADO` (+ 24px action gutter). Five rows, 56 tall: `x7Kd2pQ` · `ejemplo.com/blog/como-acortar-urls` · `1.284` · `hace 12 d`; then `m3Qz8Tn` 612, `b9Wr4Lc` 388, `t5Nv1Hs` 241, `k2Jd7Pm` 96.
- Empty state: no links yet → `Centered EmptyState` with `Todavía no acortaste nada.` + `primary` `Crear el primero`.

## 5. `/admin/links` — Índice de links (missing before)

Purpose: find and manage any link. This is the list; the detail is `/admin/links/:code`.

- Same sidebar and top bar. Title `display-l` `Links` + `small --sage-dim` `37 activos · 4 deshabilitados`.
- Toolbar row: search input (grow, `Buscar por código, URL o destino`), `Estado` select (`Todos` / `Activos` / `Deshabilitados`), `secondary` `Exportar CSV`.
- Table card, full width: columns `CÓDIGO` (120) `DESTINO` (fill) `CLICS` (80 right) `CREADO` (110) `ESTADO` (110) `ACCIONES` (48).
  - Row example: `x7Kd2pQ` mono lime · `ejemplo.com/blog/como-acortar-urls` (truncate) · `1.284` · `hace 12 d` · pill `Activo` · `···`
  - A disabled row: code in `--sage`, pill `Deshabilitado` in `--amber` on `--ink-700`.
- Footer: `small --sage-dim` `37 de 41 links · página 1 de 2` with `secondary` `Anterior` / `Siguiente`.
- States: loading skeleton rows; empty result → `No hay links que coincidan.`; error → inline `small --rust`.

## 6. `/admin/links/:code` — Detalle

Purpose: everything about one link.

- Top bar: `secondary` icon button `←`, then `data-m --bone` `x7Kd2pQ` and `data-s --sage-dim` `302 · no-store · creado hace 12 días`. Right: `secondary` `Copiar link`, `danger` `Deshabilitar`.
- Destino strip, full width: `micro` `DESTINO` + `data-m` full URL + `ghost` `Abrir` on the right.
- Three `Stat` cards: `Clics totales` `1.284`; `Clics hoy` `47` `↑ 8 vs. ayer`; `Mejor día` `71` `lunes 26 de mayo`.
- Lower split: chart card `Clics por día` (grow) + rail 300 with two cards:
  - `TOP DÍAS` in `micro`, then three rows 40 tall: `lunes 26 may` … `71`; `martes 27 may` … `67`; `miércoles 28 may` … `66`. Each row has a 2px lime tick.
  - `ACTIVIDAD` in `micro`, three label/value rows: `Primer clic` `12 may`; `Último clic` `hace 2 min`; `Promedio` `42,8 /día`.
- States: disabled link → a `--amber` banner under the header: `Este link está deshabilitado. Devuelve 410 a quien lo abra.` with `secondary` `Reactivar`.

## 7. `/admin/analytics` — Analíticas globales (missing before)

Purpose: the aggregate view the sidebar was promising.

- Same shell. Title `display-l` `Analíticas` + `small --sage-dim` `Todos los links · últimos 90 días`.
- Filter row: segmented control `7 d` / `30 d` / `90 d` (active = `--ink-700` + bone text + lime underline 2px), and `secondary` `Exportar CSV`.
- Chart card, wide: `Clics totales` with the big number in `data-l` and the daily series below.
- Two-column split:
  - Left card `Top links` (5 rows: rank, code, destino truncated, bar relative + count)
  - Right card `Días de la semana` (7 bars, `lun`…`dom`, values in `data-s`)
- Bottom card: `Comparativa` — three `Stat`s: `Mejor día de la semana` `lunes`; `Clics por link (promedio)` `34,7`; `Links con cero clics` `6`.
- Empty state: `Todavía no hay clics para analizar.`

---

## Global states to design once, reuse everywhere

- **404** (unknown code): `Este link no existe.` + link back to `/`.
- **410** (disabled): `Este link fue deshabilitado.`
- **429** (rate limited) inline on the public form.
- **Loading skeletons** for the three admin data screens.
