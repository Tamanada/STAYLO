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

/** Returns the authenticated user from the request, or null. */
export async function getAuthUser(req: Request) {
  const supa = getUserClient(req)
  const { data: { user }, error } = await supa.auth.getUser()
  if (error || !user) return null
  return user
}
