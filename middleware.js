// ============================================================================
// Vercel Edge Middleware — host-based routing for app.staylo.app
// ============================================================================
//
// Why this exists:
//   vercel.json `rewrites` with a `host` condition do NOT override static
//   file serving in Vercel. When a request hits `app.staylo.app/`, Vercel
//   first looks for `dist/index.html` and serves it directly — never reaching
//   the rewrite rule. Edge middleware runs BEFORE the static check, so it's
//   the only reliable way to do host-based routing on multi-tenant subdomains
//   sitting in the same project.
//
// What it does:
//   For every request hitting `app.staylo.app`, rewrite the URL internally
//   to `/guest.html`. The browser address bar stays clean (e.g. `app.staylo.
//   app/checkin`), the React Router inside guest.html sees the actual
//   pathname and routes correctly to the matching screen.
//
// What it does NOT touch:
//   - Static assets (`/assets/*`, anything with a file extension): served as
//     usual so the React app can load its JS/CSS chunks.
//   - The hotelier app / STAYLO Ship (`/ship.html`): only deployed under the
//     root domain `staylo.app`, never under `app.staylo.app`. Excluded by the
//     matcher just in case someone bookmarks `app.staylo.app/ship.html`.
//   - The i18n JSON bundles (`/i18n/*`): shared between both apps, fetched
//     at runtime by the messenger. Excluded so they always resolve to the
//     real file, not the guest HTML.
//   - Any request NOT on `app.staylo.app`: short-circuits and falls through
//     to the regular Vercel routing (the marketing site + hotelier dashboard).
//
// Reference:
//   https://vercel.com/docs/edge-middleware
// ============================================================================

export const config = {
  // Match every path EXCEPT: Vercel internals, serverless API routes,
  // the messenger static file, the shared i18n JSON folder, the built
  // Vite asset folder, and anything that looks like a static file (has
  // a `.ext` suffix). Negative lookaheads in a single regex keep this
  // fast at the edge — no per-request string checks needed.
  matcher: '/((?!_vercel|api|ship\\.html|i18n/|assets/|.*\\.\\w+).*)',
};

export default function middleware(request) {
  const host = request.headers.get('host') || '';
  // Only act on the guest subdomain. Everything else falls through to
  // the default Vercel routing (= the marketing/dashboard React app at
  // dist/index.html).
  if (host !== 'app.staylo.app') return;

  const url = new URL(request.url);
  // Guard against infinite loop: if the request is already pointing at
  // /guest.html (e.g. a fetch from the guest app itself), pass through.
  if (url.pathname === '/guest.html') return;

  // Rewrite internally to /guest.html. The browser URL is preserved so
  // React Router inside guest.html reads the actual pathname (e.g.
  // /checkin, /history) and routes accordingly.
  url.pathname = '/guest.html';
  return new Response(null, {
    headers: { 'x-middleware-rewrite': url.toString() },
  });
}
