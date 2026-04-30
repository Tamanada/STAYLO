// Returns a SAFE redirect target — only same-origin paths starting with '/'
//   - rejects null / undefined / non-string
//   - rejects external URLs (must start with single '/')
//   - rejects '//' which is a protocol-relative URL exploit (could redirect to
//     evil.com on a https://example.com page)
// Use this anywhere a `?next=...` query param drives a redirect after auth.
export function safeNext(raw, fallback = '/dashboard') {
  if (!raw) return fallback
  if (typeof raw !== 'string') return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//')) return fallback
  return raw
}
