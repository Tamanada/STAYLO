// ============================================
// /legal/terms — Terms of Service (Alpha placeholder)
// ============================================
// Minimal but legally present. To be replaced with full T&C drafted by
// Drew & Napier (Singapore) once Staylo Holdings Pte. Ltd. is incorporated.
// ============================================
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-deep">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange transition-colors mb-6 no-underline">
        <ArrowLeft size={16} /> Back to Staylo
      </Link>

      <h1 className="text-3xl sm:text-4xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-400 mb-10">Effective date: April 28, 2026 · Alpha version</p>

      <div className="prose prose-sm max-w-none space-y-6 leading-relaxed text-gray-700">

        <section>
          <h2 className="text-xl font-bold text-deep">1. Who we are</h2>
          <p>
            Staylo (the "Service", the "Platform") is a cooperative hotel booking marketplace
            currently in Alpha. The legal entity will be <strong>Staylo Holdings Pte. Ltd.</strong>,
            a Singapore private limited company (incorporation in progress).
            Until incorporation is complete, the Service is operated under the personal
            responsibility of David, founder, based in Koh Phangan, Thailand.
            Contact: <a href="mailto:contact@staylo.app" className="text-orange">contact@staylo.app</a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-deep">2. Alpha disclaimer</h2>
          <p>
            The Service is in early Alpha. Features may change, break, or be removed without
            notice. Test mode payments are processed via Stripe and Lightning network sandbox
            providers. <strong>No real-money bookings are guaranteed during this phase.</strong> By using
            the Service you accept these conditions of testing.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-deep">3. Roles &amp; responsibilities</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Property / Founding Partner</strong> — hoteliers list rooms, set prices, and accept the 10% commission contract.</li>
            <li><strong>Member</strong> — travelers book rooms and may refer hotels.</li>
            <li><strong>Ambassador</strong> — Members who have referred at least one hotel; eligible to 2% BTC commission for life on those hotels' bookings.</li>
            <li><strong>STAYLO</strong> — operates the marketplace, processes payments, holds funds in escrow until check-out, and remits 90% to hoteliers.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-deep">4. Commission &amp; payouts</h2>
          <p>
            STAYLO charges a flat <strong>10% commission</strong> on every booking processed through
            the Platform. This rate is contractually locked for life upon Founding Partner
            signature. Payouts are made to the hotelier within one hour of guest check-out
            confirmation, in their chosen currency (USD, EUR, THB, BTC).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-deep">5. Crypto &amp; tokens</h2>
          <p>
            STAYLO accepts Bitcoin (Lightning Network) and operates a Bitcoin treasury reserve.
            The <strong>$STAY</strong> token (Solana SPL, 10B fixed supply) will launch at TGE M07 post-Alpha
            funding. $STAY is a utility/governance token and is <strong>not a security or investment
            product</strong>. Token earnings during Alpha are non-binding promises of allocation,
            subject to final tokenomics published at TGE.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-deep">6. Cancellations &amp; refunds</h2>
          <p>
            Each hotelier sets their own cancellation policy (flexible, moderate, or strict)
            visible at booking. STAYLO mediates disputes; held escrow funds are refunded to the
            guest if the booking is cancelled within the policy window.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-deep">7. Limitation of liability</h2>
          <p>
            STAYLO is a technology platform connecting travelers with hoteliers. We are not the
            operator of the accommodations and are not party to the lodging contract. STAYLO is
            not liable for the quality, safety, or conduct of stays beyond what we facilitate
            through our payment and dispute mechanisms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-deep">8. Governing law</h2>
          <p>
            These Terms are governed by Singapore law upon incorporation of Staylo Holdings
            Pte. Ltd. Disputes will be resolved by the courts of Singapore.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-deep">9. Contact</h2>
          <p>
            Questions or claims: <a href="mailto:contact@staylo.app" className="text-orange">contact@staylo.app</a> · +66 96 269 4286
          </p>
        </section>

      </div>
    </div>
  )
}
