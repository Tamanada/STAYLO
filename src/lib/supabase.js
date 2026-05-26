import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.PROD) {
    throw new Error(
      'STAYLO: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in production. ' +
      'Check Cloudflare Pages → Settings → Environment variables.'
    )
  }
  console.warn('[STAYLO dev] Supabase env vars missing — using placeholder client. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.')
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key'
)
