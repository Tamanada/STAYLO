// ============================================
// /legal/privacy — Privacy Policy (Alpha placeholder)
// ============================================
// Minimal but legally present. To be replaced with a full GDPR/PDPA
// privacy policy drafted by Drew & Napier (Singapore) once incorporated.
// ============================================
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-deep">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange transition-colors mb-6 no-underline">
        <ArrowLeft size={16} /> Back to Staylo
      </Link>

      <h1 className="text-3xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-10">Effective date: April 28, 2026 · Alpha version</p>

      <div className="prose prose-sm max-w-none space-y-6 leading-relaxed text-gray-700">

        <section>
          <h2 className="text-xl font-bold text-deep">1. What we collect</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Account data</strong>: email, full name, password hash (managed by Supabase Auth).</li>
            <li><strong>Hotelier data</strong>: property details, photos, bank account info (held by Stripe Connect — STAYLO never sees full banking details).</li>
            <li><strong>Booking data</strong>: dates, guest count, special requests, special-needs information you provide.</li>
            <li><strong>Payment data</strong>: card details are processed by Stripe and never stored on our servers. Bitcoin Lightning invoices are stored as BOLT11 strings (no private keys).</li>
            <li><strong>Communication</strong>: emails you send to <a href="mailto:contact@staylo.app" className="text-orange">contact@staylo.app</a>.</li>
            <li><strong>Usage data</strong>: anonymous analytics on which pages are visited (no cookies that track you across other sites).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-deep">2. How we use it</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Process bookings and route payments to hoteliers</li>
            <li>Send booking confirmations and operational notifications</li>
            <li>Calculate ambassador commissions and pay them in BTC to your declared Lightning address</li>
            <li>Improve the Service (bug fixes, performance, new features)</li>
            <li>Comply with legal obligations (KYC/AML when triggered by share purchases or large payouts)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-deep">3. Who we share it with</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Hoteliers</strong>: when you book, the hotelier receives your name, email, phone (if provided), and special requests.</li>
            <li><strong>Stripe</strong> (payment processing) — see <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer" className="text-orange">Stripe Privacy Policy</a>.</li>
            <li><strong>Lightning provider</strong> (BTCPay Server self-hosted or similar) — for crypto payments.</li>
            <li><strong>Supabase</strong> (database + auth) — see <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer" className="text-orange">Supabase Privacy Policy</a>.</li>
            <li><strong>Vercel</strong> (hosting + CDN).</li>
          </ul>
          <p>We do <strong>not</strong> sell or rent your data to advertisers or third parties.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-deep">4. Your rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Access the personal data we hold about you</li>
            <li>Request correction or deletion of your data</li>
            <li>Withdraw consent at any time (deleting your account removes most data; some bookings may be retained for legal/accounting reasons)</li>
            <li>Lodge a complaint with a supervisory authority (in your jurisdiction or in Singapore once incorporated)</li>
          </ul>
          <p>To exercise these rights: <a href="mailto:contact@staylo.app" className="text-orange">contact@staylo.app</a></p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-deep">5. Data retention</h2>
          <p>
            Account data is kept while the account is active. Booking records are retained for 7 years
            (accounting requirements). Anonymous analytics: 24 months.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-deep">6. International transfers</h2>
          <p>
            Our infrastructure spans Singapore (database), the US (Stripe, Vercel CDN), and globally
            for Lightning Network. By using STAYLO you accept these transfers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-deep">7. Updates</h2>
          <p>
            This policy may evolve as STAYLO incorporates Staylo Holdings Pte. Ltd. and as we
            implement full GDPR/PDPA compliance with our Singapore counsel (Drew &amp; Napier). Material
            changes will be announced by email.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-deep">8. Contact</h2>
          <p>
            Privacy questions: <a href="mailto:contact@staylo.app" className="text-orange">contact@staylo.app</a> · +66 96 269 4286 · Koh Phangan, Thailand
          </p>
        </section>

      </div>
    </div>
  )
}
