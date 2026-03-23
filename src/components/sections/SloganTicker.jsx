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
    <div className="relative overflow-hidden bg-gradient-to-r from-deep via-[#0d1f3c] to-deep py-4 border-y border-white/10">
      <div className="flex animate-ticker whitespace-nowrap">
        {items.map((s, i) => (
          <span key={i} className="inline-flex items-center mx-8 shrink-0">
            <span className="text-xs font-mono text-ocean/60 mr-2">{s.lang}</span>
            <span className="text-sm font-semibold text-white/80">{s.text}</span>
            <span className="ml-8 text-sunset/40">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
