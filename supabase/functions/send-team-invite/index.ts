// ============================================================================
// send-team-invite — email a property invitation via Resend
// ============================================================================
// Called by the Team tab in PropertyManage after creating a pending invite.
// Sends a branded email pointing the invitee to staylo.app/register so they
// can sign up. The signup auto-claims the pending invite (trigger
// claim_pending_invitations from migration 20260501080000).
//
// Env vars required:
//   RESEND_API_KEY      — from resend.com dashboard
//   RESEND_FROM_EMAIL   — verified sender, e.g. "STAYLO <invites@staylo.app>"
//                         For dev: "STAYLO <onboarding@resend.dev>" works
//                         without domain verification.
//
// If RESEND_API_KEY is missing, returns 503 with a clear error so the
// frontend can fall back to the manual share link.
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getAuthUser, jsonResponse } from '../_shared/supabase.ts'
import { handleOptions } from '../_shared/cors.ts'

interface Req {
  email: string
  property_name: string
  inviter_name: string
  role: string         // 'manager' | 'staff'
  signup_url: string   // pre-built link the invitee can click
}

const FALLBACK_FROM = 'STAYLO <onboarding@resend.dev>'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions()
  if (req.method !== 'POST') return jsonResponse({ error: 'POST only' }, 405)

  // Auth — must be authenticated user (any user; team RLS is checked at insert)
  const user = await getAuthUser(req)
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    return jsonResponse({
      error: 'Email service not configured',
      detail: 'RESEND_API_KEY env var is missing. Set it in Supabase function secrets.',
    }, 503)
  }
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || FALLBACK_FROM

  let body: Req
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }
  const { email, property_name, inviter_name, role, signup_url } = body
  if (!email || !property_name || !signup_url) {
    return jsonResponse({ error: 'email, property_name, signup_url are required' }, 400)
  }

  const subject = `${inviter_name || 'A STAYLO hotelier'} invited you to join ${property_name}`

  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#FFFDF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2D3436;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #E8E0D8;overflow:hidden;">
    <div style="padding:24px 28px;border-bottom:1px solid #F0EBE5;">
      <span style="font-size:24px;font-weight:900;color:#2D3436;">stay</span><span style="font-size:24px;font-weight:900;background:linear-gradient(135deg,#FF6B00,#E91E63);-webkit-background-clip:text;background-clip:text;color:transparent;">lo</span>
    </div>
    <div style="padding:28px;">
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#2D3436;">You've been invited!</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#555;">
        <strong>${escapeHtml(inviter_name || 'A STAYLO hotelier')}</strong> just added you to the team for
        <strong>${escapeHtml(property_name)}</strong> on STAYLO with the role <strong style="text-transform:capitalize;">${escapeHtml(role)}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#555;">
        STAYLO is a hotelier-owned booking platform — <strong>10% commission, locked for life</strong>, no middleman taking 25%.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${escapeAttr(signup_url)}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#FF6B00,#E91E63);color:#fff;font-weight:800;font-size:15px;text-decoration:none;border-radius:9999px;">
          Accept invitation →
        </a>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#888;">
        Or copy this link into your browser:
      </p>
      <p style="margin:0 0 24px;font-size:12px;color:#0071c2;word-break:break-all;">
        ${escapeHtml(signup_url)}
      </p>
      <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">
        Sign up with <strong>${escapeHtml(email)}</strong> — your access to <strong>${escapeHtml(property_name)}</strong> activates the moment you create the account.
      </p>
    </div>
    <div style="padding:16px 28px;background:#FAFAFA;border-top:1px solid #F0EBE5;font-size:11px;color:#999;text-align:center;">
      You're receiving this because someone invited you to a STAYLO property. If you didn't expect this, you can ignore the email.
    </div>
  </div>
</body></html>`

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject,
      html,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    console.error('Resend API error:', resp.status, text)
    return jsonResponse({
      error: 'Resend send failed',
      detail: text.slice(0, 500),
      status: resp.status,
    }, 502)
  }

  const data = await resp.json().catch(() => ({}))
  return jsonResponse({ ok: true, id: data.id })
})

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

function escapeAttr(s: string): string {
  return escapeHtml(s)
}
