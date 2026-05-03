// ============================================================================
// <UndoToast /> — bottom-of-screen undo notification with auto-expire
// ============================================================================
// Drop one of these next to any irreversible-feeling action (a walk-in
// check-in, a bulk status change, a delete, etc.) and it gives the user
// 30 seconds to roll back with one click. Same pattern Gmail uses for
// "Email sent · Undo".
//
// Usage:
//   const [undo, setUndo] = useState(null)
//
//   async function handleSomething() {
//     const result = await doTheThing()
//     setUndo({
//       label:    `Walk-in: ${guestName}`,
//       onUndo:   async () => { await supabase.from('bookings').delete().eq('id', result.id); refresh() },
//       sublabel: '3 nights · Jungle room',         // optional
//     })
//   }
//
//   <UndoToast undo={undo} onClose={() => setUndo(null)} />
// ============================================================================
import { useEffect, useState } from 'react'
import { RotateCcw, X, Check, Loader2 } from 'lucide-react'

const AUTO_EXPIRE_MS = 30_000

export default function UndoToast({ undo, onClose }) {
  const [busy, setBusy] = useState(false)

  // Auto-expire so a stale 'Undo' from 10 minutes ago doesn't sit there
  // and accidentally get clicked.
  useEffect(() => {
    if (!undo) return
    const timer = setTimeout(() => onClose(), AUTO_EXPIRE_MS)
    return () => clearTimeout(timer)
  }, [undo, onClose])

  if (!undo) return null

  async function handleUndo() {
    if (busy || !undo.onUndo) return
    if (undo.confirm !== false &&
        !confirm(`Undo "${undo.label}"?`)) return
    setBusy(true)
    try {
      await undo.onUndo()
    } finally {
      setBusy(false)
      onClose()
    }
  }

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-deep text-white pl-4 pr-2 py-2 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 max-w-[90vw]"
      role="status"
      aria-live="polite"
    >
      <Check size={14} className="text-libre flex-shrink-0" />
      <span className="text-sm truncate">
        {undo.label}
        {undo.sublabel && (
          <span className="text-white/40 ml-1.5">· {undo.sublabel}</span>
        )}
      </span>
      <button
        type="button"
        onClick={handleUndo}
        disabled={busy}
        className="px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 flex-shrink-0"
      >
        {busy
          ? <><Loader2 size={11} className="animate-spin" /> Undoing…</>
          : <><RotateCcw size={11} /> Undo</>}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="text-white/50 hover:text-white text-base leading-none cursor-pointer p-1 flex-shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
