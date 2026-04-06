import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Phone, MessageCircle, Video, Clock, CheckCircle, Send } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

const contactMethods = [
  { id: 'asap', icon: Phone, label: 'Call me now (ASAP)', labelFr: 'Appelez-moi maintenant', color: 'text-libre', bg: 'bg-libre/10', border: 'border-libre/30' },
  { id: 'today', icon: Clock, label: 'Call me today', labelFr: 'Rappelez-moi aujourd\'hui', color: 'text-ocean', bg: 'bg-ocean/10', border: 'border-ocean/30' },
  { id: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', labelFr: 'WhatsApp', color: 'text-[#25D366]', bg: 'bg-[#25D366]/10', border: 'border-[#25D366]/30' },
  { id: 'line', icon: MessageCircle, label: 'LINE', labelFr: 'LINE', color: 'text-[#00B900]', bg: 'bg-[#00B900]/10', border: 'border-[#00B900]/30' },
  { id: 'telegram', icon: Send, label: 'Telegram', labelFr: 'Telegram', color: 'text-[#0088cc]', bg: 'bg-[#0088cc]/10', border: 'border-[#0088cc]/30' },
  { id: 'video', icon: Video, label: 'Google Meet', labelFr: 'Google Meet', color: 'text-sunset', bg: 'bg-sunset/10', border: 'border-sunset/30' },
]

export default function WelcomeCall() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [contactInfo, setContactInfo] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!selectedMethod || !contactInfo) return
    setLoading(true)
    try {
      // Update user's verification status to call_scheduled
      await supabase.from('users').update({
        verification_status: 'call_scheduled',
      }).eq('id', user.id)

      setSubmitted(true)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto">
        <div className="w-20 h-20 bg-libre/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={40} className="text-libre" />
        </div>
        <h3 className="text-xl font-bold text-deep mb-2">{t('dashboard.call_confirmed_title', 'We\'ll be in touch!')}</h3>
        <p className="text-sm text-gray-500 mb-1">
          {t('dashboard.call_confirmed_desc', 'A member of the Staylo team will contact you via')} <span className="font-bold text-deep">{contactMethods.find(m => m.id === selectedMethod)?.label}</span>
        </p>
        {selectedMethod === 'asap' && (
          <p className="text-sm text-libre font-medium mt-2">{t('dashboard.call_asap_note', 'We\'ll try to reach you within the next 30 minutes!')}</p>
        )}
        {selectedMethod === 'today' && preferredTime && (
          <p className="text-sm text-ocean font-medium mt-2">{t('dashboard.call_time_note', 'Preferred time:')} {preferredTime}</p>
        )}
      </Card>
    )
  }

  return (
    <Card className="p-8 max-w-lg mx-auto border-2 border-golden/20">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">👋</div>
        <h3 className="text-xl font-bold text-deep mb-2">
          {t('dashboard.call_title', 'Welcome! Let\'s meet.')}
        </h3>
        <p className="text-sm text-gray-500">
          {t('dashboard.call_subtitle', 'To finalize your registration, we\'d love to have a quick welcome call with you. How would you prefer to be contacted?')}
        </p>
      </div>

      {/* Contact method selection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {contactMethods.map(method => {
          const Icon = method.icon
          const isSelected = selectedMethod === method.id
          return (
            <button
              key={method.id}
              onClick={() => setSelectedMethod(method.id)}
              className={`p-4 rounded-2xl border-2 text-center transition-all ${
                isSelected
                  ? `${method.bg} ${method.border} shadow-md scale-105`
                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon size={24} className={`mx-auto mb-2 ${isSelected ? method.color : 'text-gray-400'}`} />
              <p className={`text-xs font-medium ${isSelected ? 'text-deep' : 'text-gray-500'}`}>
                {method.label}
              </p>
            </button>
          )
        })}
      </div>

      {/* Contact info input */}
      {selectedMethod && (
        <div className="space-y-4 mb-6">
          <Input
            label={selectedMethod === 'video'
              ? t('dashboard.call_email_label', 'Your email for the invite')
              : t('dashboard.call_number_label', 'Your phone number or ID')}
            placeholder={selectedMethod === 'video' ? 'you@email.com' : '+66 812 345 678'}
            value={contactInfo}
            onChange={e => setContactInfo(e.target.value)}
          />
          {(selectedMethod === 'today' || selectedMethod === 'video') && (
            <Input
              label={t('dashboard.call_time_label', 'Preferred time')}
              placeholder={t('dashboard.call_time_placeholder', 'e.g. 2pm, morning, afternoon...')}
              value={preferredTime}
              onChange={e => setPreferredTime(e.target.value)}
            />
          )}
        </div>
      )}

      {/* Submit */}
      {selectedMethod && contactInfo && (
        <Button
          variant="green"
          className="w-full"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? t('common.loading') : t('dashboard.call_submit', 'Request a call')}
        </Button>
      )}
    </Card>
  )
}
