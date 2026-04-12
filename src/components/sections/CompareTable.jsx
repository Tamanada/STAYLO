import { useTranslation } from 'react-i18next'

const ROW_KEYS = [
  {
    featureKey: 'commission_rate',
    booking: '17-22%', agoda: '17%', airbnb: '15%',
    stayloKey: 'staylo_commission',
  },
  {
    featureKey: 'co_ownership',
    booking: '✗', agoda: '✗', airbnb: '✗',
    stayloKey: 'staylo_shares',
  },
  {
    featureKey: 'governance_vote',
    booking: '✗', agoda: '✗', airbnb: '✗',
    stayloKey: 'staylo_vote',
  },
  {
    featureKey: 'annual_dividends',
    booking: '✗', agoda: '✗', airbnb: '✗',
    stayloKey: 'staylo_dividends',
  },
  {
    featureKey: 'token_rewards',
    booking: '✗', agoda: '✗', airbnb: '✗',
    stayloKey: 'staylo_tokens',
  },
  {
    featureKey: 'commission_fixed',
    booking: '✗ No', agoda: '✗ No', airbnb: '✗ No',
    stayloKey: 'staylo_fixed',
  },
]

export function CompareTable() {
  const { t } = useTranslation()

  return (
    <section style={{ background: '#F8F6F0', padding: '80px 5%' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="section-label mb-3">{t('home_compare.section_label', 'Compare')}</p>
          <h2 style={{
            fontSize: 'clamp(28px, 3.5vw, 46px)',
            fontWeight: 900,
            letterSpacing: '-1.5px',
            color: '#2D3436',
            lineHeight: 1.15,
          }}>
            {t('home_compare.title_1', 'Why hoteliers ')}<span className="text-gradient">{t('home_compare.title_highlight', 'switch')}</span>
          </h2>
        </div>

        {/* Table */}
        <div className="rounded-3xl overflow-hidden"
          style={{
            background: 'white',
            border: '1.5px solid #E8E0D8',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th className="text-left px-6 py-5 text-sm font-bold" style={{ color: '#2D3436' }}>{t('home_compare.feature', 'Feature')}</th>
                  <th className="text-center px-4 py-5 text-sm font-bold" style={{ color: '#B2BEC3' }}>Booking.com</th>
                  <th className="text-center px-4 py-5 text-sm font-bold" style={{ color: '#B2BEC3' }}>Agoda</th>
                  <th className="text-center px-4 py-5 text-sm font-bold" style={{ color: '#B2BEC3' }}>Airbnb</th>
                  <th className="text-center px-4 py-5 text-sm font-bold rounded-tr-xl"
                    style={{ color: '#00B894', background: 'rgba(0,184,148,0.08)' }}>
                    Staylo ✓
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROW_KEYS.map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #F0EDE8' }}>
                    <td className="px-6 py-4 text-sm font-semibold" style={{ color: '#2D3436' }}>{t(`home_compare.${row.featureKey}`)}</td>
                    <Cell text={row.booking} bad />
                    <Cell text={row.agoda} bad />
                    <Cell text={row.airbnb} bad />
                    <td className="text-center px-4 py-4 text-sm font-bold"
                      style={{ color: '#00B894', background: 'rgba(0,184,148,0.04)' }}>
                      {t(`home_compare.${row.stayloKey}`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: Staylo vs Others */}
          <div className="md:hidden p-5 space-y-4">
            {ROW_KEYS.map((row, i) => (
              <div key={i} className="rounded-2xl p-4" style={{ background: '#FAFAF8', border: '1px solid #F0EDE8' }}>
                <p className="text-xs font-bold mb-2" style={{ color: '#B2BEC3' }}>{t(`home_compare.${row.featureKey}`)}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#FF7675' }}>{row.booking}</span>
                  <span className="text-sm font-bold" style={{ color: '#00B894' }}>{t(`home_compare.${row.stayloKey}`)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Cell({ text, bad }) {
  return (
    <td className="text-center px-4 py-4 text-sm"
      style={{ color: bad ? '#FF7675' : '#636E72' }}>
      {text}
    </td>
  )
}
