/*
  Done — welcome screen after all steps completed.
  Shows the hotel name + a big "Open SHIP" CTA.
*/
import { PartyPopper, ArrowRight, Rocket, Sparkles } from 'lucide-react'

export default function StepDone({ hotelName, hotelSlug, onOpenShip }) {
  return (
    <div className="text-center py-8">
      <div className="w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #FF6B00 0%, #FF1F70 55%, #7E22CE 100%)',
        boxShadow: '0 20px 40px rgba(255,31,112,0.35)',
      }}>
        <PartyPopper size={48} color="white" strokeWidth={2.2} />
      </div>

      <div className="inline-flex items-center gap-1 mb-4 px-3 py-1 rounded-full"
        style={{
          background: 'linear-gradient(135deg, rgba(255,107,0,0.1), rgba(255,31,112,0.06))',
          color: '#FF1F70', fontSize: 11, fontWeight: 800, letterSpacing: 1.2,
        }}>
        <Sparkles size={12} strokeWidth={3} />
        14-DAY TRIAL STARTED
      </div>

      <h1 className="font-black text-3xl sm:text-4xl mb-3" style={{
        color: '#1A1A2E', letterSpacing: '-0.8px',
      }}>
        Welcome to SHIP,<br/>
        <span style={{
          background: 'linear-gradient(135deg, #FF6B00, #FF1F70, #7E22CE)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
          fontStyle: 'italic',
        }}>
          {hotelName}.
        </span>
      </h1>

      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        Your hotel is live. Booking.com reservations will start appearing as
        soon as your forwarding rule fires.
      </p>

      <button
        type="button"
        onClick={onOpenShip}
        className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-black text-white transition-all"
        style={{
          background: 'linear-gradient(135deg, #FF6B00 0%, #FF1F70 55%, #7E22CE 100%)',
          fontSize: 17,
          boxShadow: '0 12px 32px rgba(255,31,112,0.35)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)' }}
      >
        <Rocket size={18} strokeWidth={2.6} />
        Open SHIP
        <ArrowRight size={18} strokeWidth={2.8} />
      </button>

      <div className="mt-8 text-xs text-gray-400 font-mono">
        hotel slug: <span className="font-bold" style={{ color: '#FF6B00' }}>{hotelSlug}</span>
      </div>
    </div>
  )
}
