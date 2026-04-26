import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

/**
 * Service-role client — bypasses RLS. Use ONLY in edge functions, never expose
 * the service key to the browser.
 */
export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/**
 * User-scoped client — applies RLS using the caller's JWT.
 * Use to verify "this request really comes from user X".
 */
export function getUserClient(req: Request): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anon) throw new Error('SUPABASE_URL or SUPABASE_ANON_KEY missing')
  const authHeader = req.headers.get('Authorization') ?? ''
  return createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Returns the authenticated user from the request, or null.
 * Edge-function-safe: extracts the JWT from the Authorization header and
 * passes it explicitly to auth.getUser(token), instead of relying on the
 * supabase-js client picking up global headers (which is unreliable in
 * Deno serverless contexts).
 */
export async function getAuthUser(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anon) return null

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const supa = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error } = await supa.auth.getUser(token)
  if (error || !user) return null
  return user
}
