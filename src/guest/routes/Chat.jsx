// =====================================================================
// /chat — Direct line guest ↔ hotel reception desk
// =====================================================================
// Mobile-first chat surface. Messages persist in localStorage under
// the key `staylo_demo_chat` so the messenger (staff app) can listen
// for `storage` events and mirror them into the #concierge channel
// live. Reverse direction too — staff replies from the messenger
// land here within ~50ms via the same storage event.
//
// This is the DEMO BRIDGE for the Sasiwimol pitch. Real production
// architecture will use Supabase realtime channels in phase 2 — the
// data shape here is what the real schema will look like, so the
// swap is a one-line subscribe change.

import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'staylo_demo_chat'

// Seed messages for a clean demo open — gives the room some life so
// the manager doesn't see an empty chat on first load.
const SEED = [
  { id: 'sys-1',   sender: 'system', body: 'Welcome to By Nanda Phangan. Reply here any time — a team member is on standby 24/7.', ts: Date.now() - 1000*60*60*3 },
  { id: 'guest-1', sender: 'guest',  body: 'Hi! Could I get extra towels for room 204?', ts: Date.now() - 1000*60*60*2 - 1000*60*42 },
  { id: 'staff-1', sender: 'staff',  body: 'Of course — they\'ll be at your door within 10 minutes. Anything else?', ts: Date.now() - 1000*60*60*2 - 1000*60*38 },
  { id: 'guest-2', sender: 'guest',  body: 'That\'s it for now, thank you!', ts: Date.now() - 1000*60*60*2 - 1000*60*37 },
  { id: 'staff-2', sender: 'staff',  body: '🙏 You\'re welcome. Enjoy your stay 🌴', ts: Date.now() - 1000*60*60*2 - 1000*60*36 },
]

function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch {}
  // First open — seed and persist so the messenger sees them too
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED)) } catch {}
  return SEED
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' })
}

export default function GuestChat() {
  const [messages, setMessages] = useState(() => loadMessages())
  const [draft, setDraft] = useState('')
  const scrollRef = useRef(null)

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Cross-tab sync — when the messenger (other tab) writes to
  // STORAGE_KEY, fire the 'storage' event in this tab so we re-read
  // and re-render. Only listens for OUR key — ignores everything else.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return
      try {
        const next = JSON.parse(e.newValue || '[]')
        if (Array.isArray(next)) setMessages(next)
      } catch {}
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const send = () => {
    const text = draft.trim()
    if (!text) return
    const msg = {
      id: 'guest-' + Date.now(),
      sender: 'guest',
      body: text,
      ts: Date.now(),
    }
    const next = [...messages, msg]
    setMessages(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
    setDraft('')
    // Demo auto-reply: after a beat, the "staff" types back if there's
    // no other tab actively driving the conversation. Lets the screen
    // come alive even when the messenger isn't open. Skips if the
    // message is a known auto-reply trigger (avoids loops).
    setTimeout(() => {
      // Don't auto-reply if the messenger tab has already written one
      let current
      try { current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { current = next }
      const lastWasGuest = current[current.length - 1]?.sender === 'guest'
      if (!lastWasGuest) return
      const reply = {
        id: 'staff-' + Date.now(),
        sender: 'staff',
        body: pickAutoReply(text),
        ts: Date.now(),
      }
      const final = [...current, reply]
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(final)) } catch {}
      setMessages(final)
    }, 1800 + Math.random() * 1400)
  }

  return (
    <div className="guest-chat">
      <header className="guest-chat-head">
        <div className="guest-chat-head-em">🛎️</div>
        <div className="guest-chat-head-body">
          <div className="guest-chat-head-title">Reception · By Nanda Phangan</div>
          <div className="guest-chat-head-status">
            <span className="guest-chat-dot" /> Online · replies in ~4 min
          </div>
        </div>
      </header>

      <div className="guest-chat-feed" ref={scrollRef}>
        {messages.map((m, i) => {
          const prev = messages[i-1]
          const showDay = !prev || dayLabel(prev.ts) !== dayLabel(m.ts)
          return (
            <div key={m.id}>
              {showDay && <div className="guest-chat-day">{dayLabel(m.ts)}</div>}
              <Bubble msg={m} />
            </div>
          )
        })}
      </div>

      <footer className="guest-chat-compose">
        <input
          type="text"
          className="guest-chat-input"
          placeholder="Type a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send() } }}
        />
        <button className="guest-chat-send" onClick={send} aria-label="Send">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13"/>
            <path d="M22 2 15 22l-4-9-9-4z"/>
          </svg>
        </button>
      </footer>
    </div>
  )
}

function Bubble({ msg }) {
  if (msg.sender === 'system') {
    return <div className="guest-chat-sys">{msg.body}</div>
  }
  const isGuest = msg.sender === 'guest'
  return (
    <div className={'guest-chat-row ' + (isGuest ? 'right' : 'left')}>
      <div className={'guest-chat-bubble ' + (isGuest ? 'guest' : 'staff')}>
        {!isGuest && <div className="guest-chat-bubble-name">Sarah · Reception</div>}
        <div className="guest-chat-bubble-body">{msg.body}</div>
        <div className="guest-chat-bubble-time">{fmtTime(msg.ts)}</div>
      </div>
    </div>
  )
}

function dayLabel(ts) {
  const d = new Date(ts), today = new Date()
  const diffDays = Math.floor((today - d) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'short' })
}

// Cheap keyword-based auto-reply for the demo — covers the obvious
// concierge intents (towels, food, transport, late check-out) and
// falls back to a friendly generic.
function pickAutoReply(text) {
  const t = text.toLowerCase()
  if (/towel|serviette/.test(t))    return 'On it 🧖 — we\'ll bring fresh towels to your room in under 10 min.'
  if (/food|hungry|menu|order/.test(t)) return 'Our room-service menu opens at 11. Want me to send it now?'
  if (/taxi|transport|airport/.test(t)) return 'We can arrange a private car. What time would you like to leave?'
  if (/late.*check|extend|extension/.test(t)) return 'Let me check availability. We can usually offer 14:00 or 16:00 — no extra fee for Silver members.'
  if (/wifi|password/.test(t))       return 'Network: STAYLO_Guest · Password: phangan2026 (case-sensitive).'
  if (/breakfast/.test(t))           return 'Breakfast is served 7:00 – 10:30 at the main restaurant. Need it brought to your room?'
  if (/spa|massage/.test(t))         return 'Best to book ahead — tap Services → Spa to see today\'s availability.'
  return 'Thanks! A team member will be right with you ✨'
}
