// ============================================================================
// <SEO /> — per-page head tags via react-helmet-async
// ============================================================================
// Drop one of these at the top of any public page that should rank or
// appear in social previews. Defaults inherit from index.html when a prop
// is omitted, so you only override what's specific to the page.
//
// Usage:
//   <SEO
//     title="Become a STAYLO Ambassador — earn 2% BTC for life"
//     description="Refer hotels to STAYLO and earn 2% in Bitcoin on every booking."
//     path="/ambassador"
//   />
//
// Why per-page meta matters:
//   - Google's renderer executes JS during indexing → these tags DO count
//   - Social-card scrapers (Twitter, Facebook, LinkedIn, Slack) read the
//     Open Graph tags from the rendered HTML
//   - Browsers display the per-page <title> in the tab — better UX too
// ============================================================================
import { Helmet } from 'react-helmet-async'

const SITE_URL = 'https://staylo.app'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

export default function SEO({
  title,
  description,
  path,
  image,
  noindex = false,
  schema,                    // optional extra JSON-LD object for this page
}) {
  const fullTitle = title
    ? `${title} | STAYLO`
    : 'STAYLO Hotels — Hotelier-owned booking platform · 10% commission for life'
  const fullDesc = description
    || "STAYLO is the booking platform owned by hoteliers. Pay 10% commission instead of Booking.com's 22% — locked for life."
  const url = path ? `${SITE_URL}${path}` : SITE_URL
  const ogImage = image || DEFAULT_OG_IMAGE

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={fullDesc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:url"         content={url} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={fullDesc} />
      <meta property="og:image"       content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:url"         content={url} />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={fullDesc} />
      <meta name="twitter:image"       content={ogImage} />

      {/* Optional page-specific JSON-LD */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  )
}
