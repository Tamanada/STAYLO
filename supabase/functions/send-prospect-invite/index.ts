// ============================================================================
// send-prospect-invite — branded HTML cold-outreach email via Resend
// ============================================================================
// Called from /admin/prospects when an admin clicks "Send STAYLO email" on
// a prospect. Sends a fully-branded HTML email (matches the team-invite
// design language) and updates the prospect row:
//   - status         = 'contacted'
//   - contacted_at   = now()
//   - contact_count += 1
//
// Auth: admin only.
//
// Env vars required (same as send-team-invite):
//   RESEND_API_KEY
//   RESEND_FROM_EMAIL  — verified sender, e.g. "David from STAYLO <david@staylo.app>"
//                        For dev: "STAYLO <onboarding@resend.dev>" works.
//
// Cold-outreach hygiene:
//   - Reply-to set to david.dancingelephant@gmail.com so replies land in his
//     actual inbox, not in a no-reply void
//   - "Why am I receiving this?" footer to avoid spam complaints
//   - Tagged in Resend metadata as 'prospect_outreach' for delivery tracking
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getServiceClient, getAuthUser } from '../_shared/supabase.ts'
import { preflight, jsonResponse } from '../_shared/cors.ts'

interface Req {
  prospect_id: string
}

const FALLBACK_FROM  = 'STAYLO <onboarding@resend.dev>'
const REPLY_TO       = 'david.dancingelephant@gmail.com'
const SIGNUP_URL     = 'https://staylo.app/register?utm_source=outreach&utm_campaign=cold&utm_medium=email'

serve(async (req: Request) => {
  const pre = preflight(req); if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'POST only' }, 405)

  // 1. Auth — must be admin
  const user = await getAuthUser(req)
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

  const sb = getServiceClient()
  const { data: profile } = await sb.from('users').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'admin') return jsonResponse({ error: 'Admin only' }, 403)

  // 2. Resend config
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    return jsonResponse({
      error: 'Email service not configured',
      detail: 'RESEND_API_KEY env var is missing. Set it in Supabase function secrets.',
    }, 503)
  }
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || FALLBACK_FROM

  // 3. Parse body
  let body: Req
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }
  if (!body.prospect_id) return jsonResponse({ error: 'prospect_id required' }, 400)

  // 4. Load the prospect
  const { data: prospect, error: pErr } = await sb
    .from('prospects')
    .select('id, name_en, name_th, email, contact_name, contact_position, district, province, contact_count, status')
    .eq('id', body.prospect_id)
    .single()

  if (pErr || !prospect) return jsonResponse({ error: 'Prospect not found' }, 404)
  if (!prospect.email) return jsonResponse({ error: 'Prospect has no email — fill it in first' }, 400)
  if (prospect.status === 'blacklisted') return jsonResponse({ error: 'Prospect is blacklisted — refusing to email' }, 409)

  // 5. Build the email
  const greetName = prospect.contact_name || prospect.name_en || prospect.name_th || 'there'
  const hotelName = prospect.name_en || prospect.name_th || 'your property'
  const area      = [prospect.district, prospect.province].filter(Boolean).join(', ') || 'Thailand'
  const subject   = `${hotelName}: keep 10% commission for life on STAYLO`

  const html = renderEmail({ greetName, hotelName, area, prospectId: prospect.id })
  const text = renderText({ greetName, hotelName, area })

  // 6. Send via Resend
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:     fromEmail,
      to:       [prospect.email],
      reply_to: REPLY_TO,
      subject,
      html,
      text,
      tags: [
        { name: 'campaign', value: 'prospect_outreach' },
        { name: 'prospect_id', value: prospect.id },
      ],
    }),
  })

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    console.error('Resend API error:', resp.status, errText)
    return jsonResponse({
      error: 'Resend send failed',
      detail: errText.slice(0, 500),
      status: resp.status,
    }, 502)
  }

  const data = await resp.json().catch(() => ({}))

  // 7. Update prospect — mark as contacted
  const { error: updErr } = await sb
    .from('prospects')
    .update({
      status: prospect.status === 'new' ? 'contacted' : prospect.status,
      contacted_at: new Date().toISOString(),
      contact_count: (prospect.contact_count || 0) + 1,
    })
    .eq('id', prospect.id)

  if (updErr) {
    // Email went out but DB update failed — return partial success so the
    // operator knows the email was sent (Resend has the receipt).
    console.error('Prospect status update failed after email sent:', updErr)
    return jsonResponse({
      ok: true,
      email_id: data.id,
      warning: 'Email sent but DB status update failed. Bump status manually.',
    })
  }

  return jsonResponse({
    ok: true,
    email_id: data.id,
    sent_to: prospect.email,
  })
})

// ────────────────────────────────────────────────────────────────────────
// HTML email — branded, mobile-friendly, single-column layout.
// All inline styles because Gmail strips <style>. ~90 KB max recommended.
// ────────────────────────────────────────────────────────────────────────
function renderEmail({ greetName, hotelName, area, prospectId }: {
  greetName: string; hotelName: string; area: string; prospectId: string
}): string {
  // Per-prospect signup URL with attribution so we know which prospect converted
  const ctaUrl = `${SIGNUP_URL}&p=${encodeURIComponent(prospectId)}`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(hotelName)} on STAYLO</title>
</head>
<body style="margin:0;padding:0;background:#FFFDF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2D3436;-webkit-text-size-adjust:100%;">

<!-- Preheader (hidden in body, shown in inbox preview) -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#FFFDF8;">
  10% commission, locked for life. Hotelier-owned booking platform launching in ${escapeHtml(area)}.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFDF8;">
<tr>
<td align="center" style="padding:32px 16px;">

<!-- Card -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
       style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;border:1px solid #E8E0D8;overflow:hidden;box-shadow:0 4px 24px rgba(45,52,54,0.04);">

  <!-- Logo header -->
  <tr><td style="padding:28px 32px 0;">
    <span style="font-size:28px;font-weight:900;color:#2D3436;letter-spacing:-0.5px;">stay</span><span style="font-size:28px;font-weight:900;background:linear-gradient(135deg,#FF6B00,#E91E63);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:-0.5px;">lo</span>
    <p style="margin:6px 0 0;font-size:11px;color:#999;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Hotelier-owned booking platform</p>
  </td></tr>

  <!-- Hero -->
  <tr><td style="padding:32px 32px 8px;">
    <h1 style="margin:0 0 20px;font-size:26px;font-weight:900;color:#2D3436;line-height:1.25;">
      Hi ${escapeHtml(greetName)},
    </h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#444;">
      I'm <strong>David</strong>, founder of STAYLO. We're a small booking platform
      <strong>owned by the hoteliers themselves</strong> — not by VC investors taking 25 % off your back.
    </p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#444;">
      I came across <strong>${escapeHtml(hotelName)}</strong> while building our launch list for
      ${escapeHtml(area)}, and I'd love to have you on board as a founding member.
    </p>
  </td></tr>

  <!-- Comparison table -->
  <tr><td style="padding:0 32px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:#FFFDF8;border-radius:14px;border:1px solid #F0EBE5;">
      <tr>
        <td style="padding:18px 20px 8px;">
          <p style="margin:0;font-size:11px;color:#999;letter-spacing:1.2px;text-transform:uppercase;font-weight:800;">What you actually pay</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 20px 8px;">
          <table role="presentation" width="100%" cellpadding="6" cellspacing="0" border="0" style="font-size:14px;">
            <tr><td style="color:#666;">Booking.com</td><td align="right" style="font-weight:700;color:#999;text-decoration:line-through;">22 %</td></tr>
            <tr><td style="color:#666;">Agoda</td><td align="right" style="font-weight:700;color:#999;text-decoration:line-through;">18 – 25 %</td></tr>
            <tr><td style="color:#666;">Airbnb</td><td align="right" style="font-weight:700;color:#999;text-decoration:line-through;">15 – 20 %</td></tr>
            <tr><td style="border-top:2px solid #E8E0D8;padding-top:10px;font-weight:800;color:#2D3436;font-size:16px;">STAYLO</td>
                <td align="right" style="border-top:2px solid #E8E0D8;padding-top:10px;font-weight:900;color:#16a34a;font-size:18px;">10 %</td></tr>
            <tr><td style="font-size:11px;color:#999;padding-top:2px;">— locked for life as a founding member</td><td></td></tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Why us, 3 bullets -->
  <tr><td style="padding:8px 32px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding-bottom:14px;">
        <strong style="color:#FF6B00;font-size:18px;">●</strong>
        <span style="font-size:14px;color:#444;line-height:1.5;margin-left:6px;">
          <strong>You own a slice of the platform.</strong> Every founding hotelier becomes a shareholder — vote on policy, share in revenue.
        </span>
      </td></tr>
      <tr><td style="padding-bottom:14px;">
        <strong style="color:#E91E63;font-size:18px;">●</strong>
        <span style="font-size:14px;color:#444;line-height:1.5;margin-left:6px;">
          <strong>Optional Bitcoin payouts.</strong> Get paid in BTC instead of waiting for bank wires that lose 4 % to FX fees.
        </span>
      </td></tr>
      <tr><td>
        <strong style="color:#16a34a;font-size:18px;">●</strong>
        <span style="font-size:14px;color:#444;line-height:1.5;margin-left:6px;">
          <strong>Keep your existing channels.</strong> STAYLO is one more pipeline — no exclusivity, no commitment, free to leave.
        </span>
      </td></tr>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td align="center" style="padding:8px 32px 32px;">
    <a href="${escapeAttr(ctaUrl)}"
       style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#FF6B00,#E91E63);color:#fff;font-weight:800;font-size:16px;text-decoration:none;border-radius:9999px;box-shadow:0 4px 14px rgba(233,30,99,0.25);">
      List your property in 15 minutes →
    </a>
    <p style="margin:14px 0 0;font-size:12px;color:#999;">
      Free to register. No credit card. No commitment.
    </p>
  </td></tr>

  <!-- Personal sign-off -->
  <tr><td style="padding:0 32px 28px;">
    <p style="margin:0 0 8px;font-size:14px;color:#666;line-height:1.6;">
      Happy to answer any question — just hit reply, or call me on WhatsApp +66 ###. I can also come visit in person if you're around ${escapeHtml(area)}.
    </p>
    <p style="margin:16px 0 0;font-size:14px;color:#2D3436;">
      <strong>David</strong><br />
      <span style="color:#999;">Founder, STAYLO</span><br />
      <a href="https://staylo.app" style="color:#0071c2;text-decoration:none;">staylo.app</a> · <a href="mailto:${escapeAttr(REPLY_TO)}" style="color:#0071c2;text-decoration:none;">${escapeHtml(REPLY_TO)}</a>
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:18px 32px;background:#FAFAFA;border-top:1px solid #F0EBE5;">
    <p style="margin:0;font-size:11px;color:#999;line-height:1.5;text-align:center;">
      You're receiving this because <strong>${escapeHtml(hotelName)}</strong> appears in our public Thailand accommodation directory and we're inviting properties in ${escapeHtml(area)} to our launch.
      Don't want to hear from us again? <a href="mailto:${escapeAttr(REPLY_TO)}?subject=Unsubscribe" style="color:#999;">Reply with "remove"</a> and you're off the list immediately.
    </p>
  </td></tr>

</table>

</td>
</tr>
</table>

</body>
</html>`
}

// Plain text fallback — required for spam-filter friendliness.
function renderText({ greetName, hotelName, area }: {
  greetName: string; hotelName: string; area: string
}): string {
  return `Hi ${greetName},

I'm David, founder of STAYLO — a hotelier-owned booking platform.

We charge 10% commission instead of the 18-25% Booking and Agoda take, and that 10% is locked for life for founding members.

I'd love to have ${hotelName} on board for our launch in ${area}.

What you get:
- 10% commission, locked for life as a founding member
- Shareholder status — vote on policy, share in platform revenue
- Optional Bitcoin payouts (no FX fees, no bank delays)
- Keep your existing channels — no exclusivity, free to leave anytime

Sign up here (free, takes 15 min):
${SIGNUP_URL}

Just hit reply if you have questions, or call me on WhatsApp.

— David
Founder, STAYLO
${REPLY_TO}
https://staylo.app

—
You're receiving this because ${hotelName} appears in our public Thailand accommodation directory. Reply "remove" and you're off the list.`
}

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!))
}
function escapeAttr(s: string): string { return escapeHtml(s) }
