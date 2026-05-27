const slogans = [
  { lang: "EN", text: "Stop paying. Start owning." },
  { lang: "TH", text: "หยุดจ่าย เริ่มเป็นเจ้าของ" },
  { lang: "FR", text: "Arrêtez de payer. Commencez à posséder." },
  { lang: "JA", text: "払うのをやめて、オーナーになろう。" },
  { lang: "ZH", text: "停止支付佣金，开始成为股东。" },
  { lang: "ES", text: "Deja de pagar. Empieza a ser dueño." },
  { lang: "AR", text: "توقف عن الدفع. ابدأ بالامتلاك." },
  { lang: "RU", text: "Хватит платить. Начните владеть." },
  { lang: "HI", text: "भुगतान करना बंद करो। मालिक बनो।" },
  { lang: "PT", text: "Pare de pagar. Comece a ser dono." },
  { lang: "DE", text: "Hör auf zu zahlen. Werde Eigentümer." },
  { lang: "ID", text: "Berhenti bayar. Mulai memiliki." },
  { lang: "MY", text: "ပေးဆောင်မှုရပ်ပါ။ ပိုင်ဆိုင်ပါ။" },
  { lang: "IT", text: "Smetti di pagare. Inizia a possedere." },
]

export function SloganTicker() {
  // Double the array for seamless infinite scroll
  const items = [...slogans, ...slogans]

  return (
    <div
      className="relative overflow-hidden py-4"
      style={{
        background: 'linear-gradient(90deg, #FF6B00 0%, #FF3CB4 50%, #6C5CE7 100%)',
        borderTop: '1px solid rgba(255,255,255,0.15)',
        borderBottom: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <div className="flex animate-ticker whitespace-nowrap">
        {items.map((s, i) => (
          <span key={i} className="inline-flex items-center mx-8 shrink-0">
            <span className="text-xs font-mono text-white/70 mr-2">{s.lang}</span>
            <span className="text-sm font-semibold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.18)' }}>{s.text}</span>
            <span className="ml-8" style={{ color: '#FDCB6E' }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
