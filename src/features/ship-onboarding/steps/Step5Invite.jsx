/*
  Step 5 — Invite a manager (optional)
  ====================================
  Owner enters their manager's email → we INSERT a ship_hotel_invitations row
  with a random token → email is sent (via Postmark or a later Edge Function)
  → manager clicks the link → signup with same email → auto-joins as manager.

  V1 stub: we insert the invitation row (RLS enforces owner check) but the
  email delivery hook comes in a later commit. For now the owner sees a
  "share this link" fallback so nothing blocks them from moving on.

  The step is skippable — many owners run solo for weeks before adding staff.
*/
import { useState } from 'react'
import { UserPlus, Mail, ArrowRight, Copy, Check, AlertCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

// Cryptographically-random token, URL-safe. 24 bytes → 32 base64url chars.
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export default function Step5Invite({ data, goNext }) {
  const [email, setEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  async function sendInvite(e) {
    e.preventDefault()
    if (!emailOk || submitting) return
    setError('')
    setSubmitting(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('Session expired. Please refresh.')

      const token = randomToken()
      const { error: invErr } = await supabase
        .from('ship_hotel_invitations')
        .insert({
          hotel_id: data.hotelId,
          email: email.trim().toLowerCase(),
          role: 'manager',
          token,
          invited_by: userId,
        })
      if (invErr) throw invErr

      const link = `${window.location.origin}/ship-join?token=${token}`
      setInviteLink(link)
    } catch (err) {
      console.error('[Step5] invite failed', err)
      setError(err.message || 'Could not create the invitation.')
    } finally {
      setSubmitting(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2400)
    } catch {}
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{
          background: 'linear-gradient(135deg, rgba(255,107,0,0.12), rgba(255,31,112,0.08))',
        }}>
          <UserPlus size={30} style={{ color: '#FF6B00' }} strokeWidth={2.2} />
        </div>
        <h1 className="font-black text-3xl sm:text-4xl mb-3" style={{
          color: '#1A1A2E', letterSpacing: '-0.8px',
        }}>
          Add a manager?
        </h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Give someone you trust their own login. Skip if you're solo — you
          can invite anyone later from Settings → Team.
        </p>
      </div>

      {/* Invite link ready */}
      {inviteLink ? (
        <div className="mb-6">
          <div className="p-5 rounded-2xl mb-4" style={{
            background: 'linear-gradient(135deg, rgba(0,184,148,0.08), rgba(0,184,148,0.03))',
            border: '1px solid rgba(0,184,148,0.35)',
          }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#00B894' }}>
                <Check size={16} strokeWidth={3} color="white" />
              </div>
              <div>
                <div className="font-black text-gray-900 mb-1">Invitation ready for {email}</div>
                <div className="text-sm text-gray-600">
                  Copy the link below and send it via WhatsApp, Line, or SMS.
                  We'll wire up automatic email delivery shortly.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-3 rounded-xl text-xs font-mono break-all" style={{
              background: 'white', border: '1px solid #E8E0D8', color: '#1A1A2E',
            }}>
              {inviteLink}
            </code>
            <button type="button" onClick={copyLink}
              className="flex-shrink-0 px-4 py-3 rounded-xl font-black text-white flex items-center gap-2"
              style={{
                background: copied ? '#00B894' : 'linear-gradient(135deg, #FF6B00, #FF1F70)',
              }}>
              {copied ? <><Check size={16} strokeWidth={3} /> Copied</> : <><Copy size={16} strokeWidth={2.6} /> Copy</>}
            </button>
          </div>
        </div>
      ) : (
        // Invite form
        <form onSubmit={sendInvite} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Manager's email
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@yourhotel.com"
                autoFocus
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 outline-none transition-colors text-base"
                style={{ borderColor: '#E8E0D8', background: 'white' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B00'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#E8E0D8'}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl flex items-start gap-2 text-sm" style={{
              background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FCA5A5',
            }}>
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" strokeWidth={2.4} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!emailOk || submitting}
            className="w-full py-4 rounded-xl font-black text-white text-base transition-all flex items-center justify-center gap-2"
            style={{
              background: emailOk && !submitting
                ? 'linear-gradient(135deg, #FF6B00 0%, #FF1F70 55%, #7E22CE 100%)'
                : '#E8E0D8',
              cursor: emailOk && !submitting ? 'pointer' : 'not-allowed',
              boxShadow: emailOk && !submitting ? '0 12px 32px rgba(255,31,112,0.35)' : 'none',
            }}
          >
            {submitting ? 'Creating invite…' : (
              <><UserPlus size={18} strokeWidth={2.6} /> Create invitation</>
            )}
          </button>
        </form>
      )}

      {/* Skip / finish */}
      <button
        type="button"
        onClick={goNext}
        className="w-full py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2"
        style={{
          background: inviteLink ? 'linear-gradient(135deg, #FF6B00, #FF1F70)' : 'transparent',
          color: inviteLink ? 'white' : '#8892A0',
          border: inviteLink ? 'none' : '1.5px solid #E8E0D8',
        }}
      >
        {inviteLink ? 'Finish setup' : "Skip — I'll do this later"}
        <ArrowRight size={17} strokeWidth={2.6} />
      </button>
    </div>
  )
}
