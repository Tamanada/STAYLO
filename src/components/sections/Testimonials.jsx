import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const REVIEWS = [
  { key: 'review1', avatar: '👨‍💼', stars: 5 },
  { key: 'review2', avatar: '👩‍💼', stars: 5 },
  { key: 'review3', avatar: '🧔', stars: 5 },
]

export function Testimonials() {
  const { t } = useTranslation()

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
            {t('home_testimonials.title_1', 'Hoteliers ')}<span className="text-gradient">{t('home_testimonials.title_highlight', 'love it')}</span>
          </h2>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-3 gap-6">
          {REVIEWS.map(review => (
            <div key={review.key} className="card-hover rounded-3xl p-7"
              style={{
                background: '#FFFDF8',
                border: '1.5px solid #E8E0D8',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}>
              {/* Stars */}
              <div className="flex gap-0.5 mb-5">
                {Array.from({ length: review.stars }).map((_, i) => (
                  <Star key={i} size={16} fill="#FDCB6E" stroke="#FDCB6E" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm italic leading-relaxed mb-6" style={{ color: '#636E72' }}>
                "{t(`home_testimonials.${review.key}_quote`)}"
              </p>

              {/* Avatar + info */}
              <div className="flex items-center gap-3">
                <span className="text-3xl">{review.avatar}</span>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#2D3436' }}>{t(`home_testimonials.${review.key}_name`)}</p>
                  <p className="text-xs" style={{ color: '#B2BEC3' }}>{t(`home_testimonials.${review.key}_role`)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
