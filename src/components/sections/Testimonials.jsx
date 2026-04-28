// ============================================
// Testimonials — homepage social proof section
// ============================================
// Was: 3 hardcoded fake reviews (👨‍💼 / 👩‍💼 / 🧔 with invented quotes).
// Now: fetches real reviews from `reviews` table (created by chantier #2
// post-checkout questionnaire). If none exist yet, renders nothing —
// honest beats fake on a marketing page.
//
// The reviews table is expected to exist with columns:
//   - id, booking_id, rating (1-10), title, body, author_name,
//     author_country, created_at, is_published
// If the table doesn't exist yet, the query errors silently and we
// render nothing (no error visible to the user).
// ============================================
import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

const FEATURED_LIMIT = 3

export function Testimonials() {
  const { t } = useTranslation()
  const [reviews, setReviews] = useState(null)  // null = loading, [] = none, [...] = data

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('id, rating, title, body, author_name, author_country, created_at')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(FEATURED_LIMIT)
        if (cancelled) return
        if (error) {
          // Table may not exist yet — treat as 'no reviews', stay silent
          setReviews([])
          return
        }
        setReviews(data ?? [])
      } catch {
        if (!cancelled) setReviews([])
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Loading or none → render nothing (homepage doesn't need a placeholder)
  if (reviews === null || reviews.length === 0) return null

  return (
    <section style={{ background: 'white', padding: '80px 5%' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="section-label mb-3">{t('home_testimonials.section_label', 'Testimonials')}</p>
          <h2 style={{
            fontSize: 'clamp(28px, 3.5vw, 46px)',
            fontWeight: 900,
            letterSpacing: '-1.5px',
            color: '#2D3436',
            lineHeight: 1.15,
          }}>
            {t('home_testimonials.title_1', 'Travelers ')}<span className="text-gradient">{t('home_testimonials.title_highlight', 'love it')}</span>
          </h2>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-3 gap-6">
          {reviews.map(review => {
            // Convert 0-10 rating to 1-5 stars (round)
            const stars = Math.max(1, Math.min(5, Math.round((review.rating || 8) / 2)))
            return (
              <div key={review.id} className="card-hover rounded-3xl p-7"
                style={{
                  background: '#FFFDF8',
                  border: '1.5px solid #E8E0D8',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }}>
                {/* Stars */}
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} size={16} fill="#FDCB6E" stroke="#FDCB6E" />
                  ))}
                </div>

                {/* Quote */}
                {review.title && (
                  <p className="font-bold text-sm mb-2" style={{ color: '#2D3436' }}>{review.title}</p>
                )}
                <p className="text-sm italic leading-relaxed mb-6" style={{ color: '#636E72' }}>
                  "{review.body}"
                </p>

                {/* Avatar + info */}
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{review.author_country || '🌍'}</span>
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#2D3436' }}>{review.author_name || 'Verified guest'}</p>
                    <p className="text-xs" style={{ color: '#B2BEC3' }}>
                      {new Date(review.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
