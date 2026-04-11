import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, QrCode, CreditCard, Wifi, Award, Sticker, ShoppingCart, Truck } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import { useReferral } from '../../hooks/useReferral'
import { QRCodeSVG } from 'qrcode.react'

const kitItems = [
  { id: 'reception_stand', icon: QrCode, name: 'Reception Stand', desc: 'QR code stand for your front desk', qty: 1, unitCost: 3.50 },
  { id: 'room_cards', icon: CreditCard, name: 'Room Cards', desc: 'Guest cards with QR code (pack of 50)', qty: 50, unitCost: 0.15 },
  { id: 'wifi_cards', icon: Wifi, name: 'WiFi Cards', desc: 'WiFi access cards with QR (pack of 50)', qty: 50, unitCost: 0.10 },
  { id: 'window_sticker', icon: Sticker, name: 'Window Sticker', desc: '"Partner of Staylo" sticker with QR', qty: 1, unitCost: 2.00 },
  { id: 'certificate', icon: Award, name: 'Founding Partner Certificate', desc: 'Framed certificate with your partner number', qty: 1, unitCost: 8.00 },
]

export default function DashboardKit() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const { referralCode } = useReferral()
  const [cart, setCart] = useState({})
  const [orderSent, setOrderSent] = useState(false)

  const referralLink = referralCode ? `https://staylo.app/welcome?ref=${referralCode}` : ''

  function addToCart(itemId) {
    setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }))
  }

  function removeFromCart(itemId) {
    setCart(prev => {
      const newCart = { ...prev }
      if (newCart[itemId] > 1) newCart[itemId]--
      else delete newCart[itemId]
      return newCart
    })
  }

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = kitItems.find(i => i.id === id)
    return sum + (item ? item.unitCost * item.qty * qty : 0)
  }, 0)

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-deep mb-1">
            {t('dashboard.kit_title', 'My Welcome Kit')}
          </h1>
          <p className="text-sm text-gray-500">
            {t('dashboard.kit_subtitle', 'Your personalized materials to grow the Staylo network')}
          </p>
        </div>

      </div>

      {/* QR Preview */}
      {referralCode && (
        <Card className="p-6 mb-6 bg-gradient-to-br from-deep to-electric/90 text-white">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="bg-white p-3 rounded-2xl shadow-lg shrink-0">
              <QRCodeSVG
                value={referralLink}
                size={120}
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-bold text-lg mb-1">{t('dashboard.kit_qr_title', 'Your Unique QR Code')}</h3>
              <p className="text-white/60 text-sm mb-2">{t('dashboard.kit_qr_desc', 'This QR code is on all your kit materials. Every scan is tracked to your account.')}</p>
              <code className="text-xs text-golden bg-white/10 px-3 py-1 rounded-full">{referralCode}</code>
            </div>
          </div>
        </Card>
      )}

      {/* First kit info */}
      <Card className="p-5 mb-6 border-2 border-golden/20 bg-golden/5">
        <div className="flex items-start gap-3">
          <Package size={24} className="text-golden shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-deep text-sm">{t('dashboard.kit_first_free', 'Your first kit is FREE')}</h3>
            <p className="text-xs text-gray-500">{t('dashboard.kit_first_desc', 'As a Founding Partner, your personalized Welcome Kit is shipped to you at no cost. Refills are available at cost price via Print-on-Demand.')}</p>
          </div>
        </div>
      </Card>

      {/* Kit items grid */}
      <h3 className="font-bold text-deep mb-4">{t('dashboard.kit_items_title', 'Kit Contents & Refills')}</h3>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {kitItems.map(item => {
          const Icon = item.icon
          const inCart = cart[item.id] || 0
          return (
            <Card key={item.id} className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean/10 rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={24} className="text-ocean" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-deep text-sm">{t(`dashboard.kit_${item.id}`, item.name)}</h4>
                  <p className="text-xs text-gray-400 mb-2">{t(`dashboard.kit_${item.id}_desc`, item.desc)}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {item.qty > 1 ? `${item.qty} pcs` : '1 pc'} — <span className="font-semibold text-deep">${(item.unitCost * item.qty).toFixed(2)}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {inCart > 0 && (
                        <>
                          <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-sm font-bold hover:bg-gray-200">−</button>
                          <span className="text-sm font-bold text-deep w-4 text-center">{inCart}</span>
                        </>
                      )}
                      <button onClick={() => addToCart(item.id)} className="w-6 h-6 rounded-full bg-ocean/10 text-ocean text-sm font-bold hover:bg-ocean/20">+</button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Cart / Order summary */}
      {cartCount > 0 && !orderSent && (
        <Card className="p-6 border-2 border-ocean/20 bg-ocean/5 sticky bottom-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart size={20} className="text-ocean" />
              <div>
                <p className="font-bold text-deep text-sm">{cartCount} {t('dashboard.kit_items', 'item(s)')}</p>
                <p className="text-xs text-gray-500">{t('dashboard.kit_pod', 'Print-on-Demand — shipped locally')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xl font-black text-deep">${cartTotal.toFixed(2)}</span>
              <Button size="sm" onClick={() => setOrderSent(true)}>
                <Truck size={16} />
                {t('dashboard.kit_order', 'Order Refills')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Order confirmation */}
      {orderSent && (
        <Card className="p-6 border-2 border-libre/20 bg-libre/5 text-center">
          <p className="text-4xl mb-3">✅</p>
          <h3 className="font-bold text-deep text-lg mb-1">{t('dashboard.kit_ordered', 'Order Received!')}</h3>
          <p className="text-sm text-gray-500">{t('dashboard.kit_ordered_desc', 'Your refill kit will be printed and shipped locally. You\'ll receive a tracking number by email.')}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => { setOrderSent(false); setCart({}) }}>
            {t('dashboard.kit_new_order', 'Place Another Order')}
          </Button>
        </Card>
      )}
    </div>
  )
}
