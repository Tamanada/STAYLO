// Surgically appends the alpha_banner key block to the 11 missing locales,
// in both src/i18n and public/i18n, WITHOUT re-serializing the rest of the file.
const fs = require('fs');
const path = require('path');

const translations = {
  de: {
    headline: "ALPHA-RUNDE OFFEN · KOH PHANGAN",
    subline: "3.000 Anteile · 1.000 $/Anteil · Welt-Runde startet bei 1.500 $"
  },
  es: {
    headline: "RONDA ALPHA ABIERTA · KOH PHANGAN",
    subline: "3.000 participaciones · 1.000 $/participación · La Ronda Mundial abre a 1.500 $"
  },
  it: {
    headline: "ROUND ALPHA APERTO · KOH PHANGAN",
    subline: "3.000 quote · 1.000 $/quota · Il Round Mondiale apre a 1.500 $"
  },
  pt: {
    headline: "RODADA ALPHA ABERTA · KOH PHANGAN",
    subline: "3.000 cotas · US$ 1.000/cota · A Rodada Mundial abre em US$ 1.500"
  },
  ja: {
    headline: "ALPHAラウンド受付中 · パンガン島",
    subline: "3,000株 · 1株あたり1,000ドル · ワールドラウンドは1,500ドルから"
  },
  zh: {
    headline: "ALPHA轮开放 · 帕岸岛",
    subline: "3,000股 · 每股1,000美元 · 世界轮将于1,500美元开启"
  },
  ar: {
    headline: "جولة ALPHA مفتوحة · كوه فانجان",
    subline: "3,000 سهم · 1,000 دولار/سهم · تنطلق الجولة العالمية عند 1,500 دولار"
  },
  hi: {
    headline: "ALPHA राउंड खुला · कोह फंगन",
    subline: "3,000 शेयर · $1,000/शेयर · वर्ल्ड राउंड $1,500 पर खुलेगा"
  },
  id: {
    headline: "PUTARAN ALPHA DIBUKA · KOH PHANGAN",
    subline: "3.000 saham · $1.000/saham · Putaran Dunia dibuka di $1.500"
  },
  my: {
    headline: "ALPHA အဆင့် ဖွင့်လှစ်ပြီ · ကိုးဖန်ငန်",
    subline: "ရှယ်ယာ ၃,၀၀၀ · တစ်ရှယ်ယာ ၁,၀၀၀ ဒေါ်လာ · ကမ္ဘာ့အဆင့်ကို ၁,၅၀၀ ဒေါ်လာဖြင့် ဖွင့်လှစ်မည်"
  },
  ru: {
    headline: "ALPHA-РАУНД ОТКРЫТ · КО ПХАНГАН",
    subline: "3 000 долей · 1 000 $/доля · Мировой раунд стартует от 1 500 $"
  }
};

const locales = Object.keys(translations);
const dirs = ['src', 'public'];

function buildBlock(t) {
  // Match the en.json formatting:
  //   "alpha_banner": {
  //     "headline": "...",
  //     "subline": "..."
  //   }
  return (
    '  "alpha_banner": {\n' +
    '    "headline": ' + JSON.stringify(t.headline) + ',\n' +
    '    "subline": ' + JSON.stringify(t.subline) + '\n' +
    '  }'
  );
}

for (const locale of locales) {
  for (const dir of dirs) {
    const filePath = path.join(__dirname, dir, 'i18n', locale + '.json');
    let raw = fs.readFileSync(filePath, 'utf8');
    // Sanity check: not already present, and parses cleanly.
    const parsedBefore = JSON.parse(raw);
    if (parsedBefore.alpha_banner) {
      console.log('[skip] ' + dir + '/' + locale + ' already has alpha_banner');
      continue;
    }
    // Find the LAST closing brace (top-level `}`), back up over any trailing whitespace,
    // and inject `,\n` + block before it. We also preserve the trailing newline that follows.
    // Strategy: find the last '}' in the file, ensure it's the closing root brace.
    // Capture: [body before last `}` (including its preceding whitespace)][last `}`][trailing]
    const lastBrace = raw.lastIndexOf('}');
    if (lastBrace === -1) throw new Error('No closing brace in ' + filePath);
    let head = raw.slice(0, lastBrace);
    const tail = raw.slice(lastBrace); // starts with '}'
    // Trim trailing whitespace/newlines from head so we can append `,\n` cleanly.
    head = head.replace(/\s+$/, '');
    const block = buildBlock(translations[locale]);
    const out = head + ',\n' + block + '\n' + tail;
    // Validate the resulting file parses.
    const parsedAfter = JSON.parse(out);
    if (!parsedAfter.alpha_banner ||
        parsedAfter.alpha_banner.headline !== translations[locale].headline ||
        parsedAfter.alpha_banner.subline !== translations[locale].subline) {
      throw new Error('Post-injection validation failed for ' + filePath);
    }
    fs.writeFileSync(filePath, out, 'utf8');
    console.log('[ok]   ' + dir + '/' + locale);
  }
}
