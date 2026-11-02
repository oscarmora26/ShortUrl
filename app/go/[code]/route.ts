import { escapeHtml } from "@/lib/html";
import { hasClicks, recordClick, resolveLink } from "@/lib/links";

// S13: never touched at build time, so `npm run build` needs no database.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ code: string }> };

const NO_STORE = { "Cache-Control": "no-store" } as const;

const HTML_HEADERS = {
  ...NO_STORE,
  "Content-Type": "text/html; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
} as const;

/**
 * S4: the interstitial is self-contained on purpose. It depends on no layout,
 * no stylesheet and no client JavaScript, so an unauthenticated visitor always
 * sees it before reaching the destination.
 */
const STYLES = `
:root {
  --ink-900: #0E0F0C;
  --ink-800: #141611;
  --line: #262A22;
  --bone: #EDEEE6;
  --sage: #A8B39C;
  --sage-dim: #8A9680;
  --lime: #C8F751;
  --lime-ink: #0E0F0C;
  --amber: #E8A33D;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  background: var(--ink-900);
  color: var(--bone);
  font-family: "Instrument Sans", system-ui, sans-serif;
  line-height: 1.5;
}
main {
  width: 100%;
  max-width: 560px;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 32px;
  background: var(--ink-800);
}
p { margin: 0 0 16px; }
.eyebrow {
  margin-bottom: 24px;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sage-dim);
}
h1 { margin: 0 0 12px; font-size: 24px; font-weight: 600; }
.destination {
  margin-bottom: 16px;
  padding: 12px 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 14px;
  word-break: break-all;
}
.warning { color: var(--amber); font-size: 14px; }
.actions { display: flex; gap: 12px; align-items: center; margin-top: 24px; }
button, .back {
  font: inherit;
  font-weight: 600;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
}
button {
  border: 1px solid var(--lime);
  background: var(--lime);
  color: var(--lime-ink);
}
.back {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--sage);
}
`;

function renderInterstitial(code: string, targetUrl: string): string {
  const destination = escapeHtml(targetUrl);
  const action = escapeHtml(`/go/${encodeURIComponent(code)}`);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Vas a salir de ShortURL</title>
<style>${STYLES}</style>
</head>
<body>
<main>
<p class="eyebrow">Vas a salir de ShortURL</p>
<h1>Este link te lleva a</h1>
<p class="destination">${destination}</p>
<p class="warning">Este enlace es anónimo y no fue revisado. Verificá la dirección antes de continuar.</p>
<form method="post" action="${action}">
<div class="actions">
<button type="submit">Continuar</button>
<a class="back" href="/">Volver</a>
</div>
</form>
</main>
</body>
</html>
`;
}

function renderNotice(status: number, message: string): Response {
  const body = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(message)}</title>
<style>${STYLES}</style>
</head>
<body>
<main>
<p class="eyebrow">Vas a salir de ShortURL</p>
<h1>${escapeHtml(message)}</h1>
<p><a class="back" href="/">Volver</a></p>
</main>
</body>
</html>
`;

  return new Response(body, { status, headers: HTML_HEADERS });
}

/**
 * S4: `GET /go/:code` renders the destination, the warning, `Continuar` and
 * `Volver` for an anonymous link that has never been clicked. Already-clicked
 * links return to `/:code`, which redirects and records the click as usual.
 */
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { code } = await context.params;
  const resolution = await resolveLink(code);

  if (resolution.status === "not_found") {
    return renderNotice(404, "Este link no existe");
  }

  if (resolution.status !== "ok") {
    return renderNotice(410, "Este link ya no está disponible");
  }

  const { link } = resolution;

  // The interstitial exists only for a link that has never been clicked.
  if (await hasClicks(link.id)) {
    return new Response(null, {
      status: 302,
      headers: { Location: `/${encodeURIComponent(code)}`, ...NO_STORE },
    });
  }

  return new Response(renderInterstitial(code, link.targetUrl), {
    status: 200,
    headers: HTML_HEADERS,
  });
}

/**
 * S4: `Continuar` records the click and redirects. This is the only path that
 * turns an interstitial into a visit, so a server-side caller cannot reach the
 * destination without the click being recorded.
 */
export async function POST(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { code } = await context.params;
  const resolution = await resolveLink(code);

  if (resolution.status === "not_found") {
    return renderNotice(404, "Este link no existe");
  }

  if (resolution.status !== "ok") {
    return renderNotice(410, "Este link ya no está disponible");
  }

  const { link } = resolution;
  await recordClick(link.id);

  return new Response(null, {
    status: 302,
    headers: { Location: link.targetUrl, ...NO_STORE },
  });
}
