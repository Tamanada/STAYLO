/*
  Step 4 — Connect Booking.com
  ============================
  Show the hotelier their unique Postmark inbound email address (tagged with
  their hotel slug), a copy button, and a 3-screenshot Gmail forwarding
  setup guide.

  When they add a Gmail forward filter pointing at this address, every
  Booking.com email hitting their inbox is forwarded to Postmark, which POSTs
  it to our webhook (ship-inbound-email), which parses it into a ship_bookings
  row.

  Nothing on this step touches the DB — the config lives entirely on the
  hotelier's Gmail side.
*/
import { useState } from 'react'
import { ArrowRight, Copy, Check, Mail, Zap, ExternalLink } from 'lucide-react'

// Live Postmark inbound address for SHIP (from Bitwarden / memory
// project_ship_postmark_setup.md). Change here if we migrate to a custom
// domain like bookings@app.ship.app.
const POSTMARK_INBOUND_BASE = '70d89f66a51008af47ebb2b297222459'
const POSTMARK_INBOUND_HOST = 'inbound.postmarkapp.com'

export default function Step4Booking({ data, goNext }) {
  const [copied, setCopied] = useState(false)
  const forwardAddress = `${POSTMARK_INBOUND_BASE}+${data.hotelSlug}@${POSTMARK_INBOUND_HOST}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(forwardAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2400)
    } catch {
      // silent — the mailto is a fallback
    }
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(255,107,0,0.1), rgba(255,31,112,0.06))',
            color: '#FF1F70', fontSize: 11, fontWeight: 800, letterSpacing: 1.2,
          }}>
          <Zap size={12} strokeWidth={3} />
          MAGIC MOMENT
        </div>
        <h1 className="font-black text-3xl sm:text-4xl mb-3" style={{
          color: '#1A1A2E', letterSpacing: '-0.8px',
        }}>
          Pull in your Booking.com reservations.
        </h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Forward one email once, and every future booking shows up here
          automatically. Takes 90 seconds.
        </p>
      </div>

      {/* The address card */}
      <div className="mb-6 p-5 rounded-2xl border-2" style={{
        borderColor: '#FF6B00',
        background: 'linear-gradient(135deg, rgba(255,107,0,0.04), rgba(255,31,112,0.02))',
      }}>
        <div className="flex items-center gap-2 mb-3 text-xs font-black tracking-widest uppercase" style={{ color: '#FF6B00' }}>
          <Mail size={13} strokeWidth={3} />
          Your hotel's forwarding address
        </div>

        <div className="flex items-center gap-2">
          <code className="flex-1 px-4 py-3 rounded-xl text-sm font-mono break-all" style={{
            background: 'white', border: '1px solid #E8E0D8', color: '#1A1A2E',
          }}>
            {forwardAddress}
          </code>

          <button
            type="button"
            onClick={copy}
            className="flex-shrink-0 px-4 py-3 rounded-xl font-black text-white flex items-center gap-2 transition-all"
            style={{
              background: copied
                ? '#00B894'
                : 'linear-gradient(135deg, #FF6B00, #FF1F70)',
              boxShadow: '0 6px 16px rgba(255,31,112,0.25)',
            }}
          >
            {copied ? <><Check size={16} strokeWidth={3} /> Copied</> : <><Copy size={16} strokeWidth={2.6} /> Copy</>}
          </button>
        </div>
      </div>

      {/* How to configure (3 steps) */}
      <div className="mb-8">
        <div className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: '#8892A0' }}>
          3 minutes in Gmail
        </div>
        <ol className="space-y-3">
          {[
            {
              n: '1',
              title: 'Open Gmail settings',
              body: 'Gear icon (top-right) → See all settings → tab "Forwarding and POP/IMAP".',
            },
            {
              n: '2',
              title: 'Add a forwarding address',
              body: 'Click "Add a forwarding address" → paste your address above → Gmail sends a one-time code (arrives at bookings+' + data.hotelSlug + '@… → we auto-forward it back to you, click the link inside).',
            },
            {
              n: '3',
              title: 'Create a filter for Booking.com',
              body: 'In tab "Filters and Blocked Addresses" → Create new filter → From: noreply@booking.com → Create filter → Forward it to your address, keep in inbox. Done!',
            },
          ].map((s) => (
            <li key={s.n} className="flex gap-4 p-4 rounded-xl border" style={{ borderColor: '#E8E0D8', background: 'white' }}>
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm" style={{
                background: 'linear-gradient(135deg, #FF6B00, #FF1F70)',
              }}>
                {s.n}
              </div>
              <div>
                <div className="font-black text-gray-900 mb-1">{s.title}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{s.body}</div>
              </div>
            </li>
          ))}
        </ol>

        <a
          href="https://support.google.com/mail/answer/10957?hl=en"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm font-bold no-underline"
          style={{ color: '#FF6B00' }}
        >
          Official Gmail forwarding guide
          <ExternalLink size={14} strokeWidth={2.6} />
        </a>
      </div>

      {/* Fallback for hoteliers on other email providers */}
      <div className="mb-8 p-4 rounded-xl text-sm text-gray-600" style={{
        background: '#FFF9E6', border: '1px solid #FBE289',
      }}>
        <strong className="text-gray-800">Using Outlook, Yahoo, or another email?</strong>{' '}
        Every provider has an auto-forward feature. Set it up the same way,
        forwarding <em>from</em> <code className="text-xs">noreply@booking.com</code>
        {' '}<em>to</em> the address above. Contact us if you get stuck.
      </div>

      {/* Continue */}
      <button
        type="button"
        onClick={goNext}
        className="w-full py-4 rounded-xl font-black text-white text-base transition-all flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #FF6B00 0%, #FF1F70 55%, #7E22CE 100%)',
          boxShadow: '0 12px 32px rgba(255,31,112,0.35)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      >
        I'll set this up later — Continue
        <ArrowRight size={18} strokeWidth={2.8} />
      </button>

      <div className="text-center text-xs text-gray-400 mt-3">
        You can always come back to this from Settings → Integrations.
      </div>
    </div>
  )
}
