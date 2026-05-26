#!/usr/bin/env node
/**
 * seed_equipment_library.cjs
 * -----------------------------------------------------------------------
 * One-shot seeder for the `equipment_library` table.
 *
 * For each of ~100 common kitchen items (wok, mandoline, thermomix...)
 * we fetch the first horizontal photo from Pixabay and upsert a row
 * keyed by slug. The recipe picker in messenger.html queries this table
 * first; only when there are < 3 local hits does it fall back to live
 * Pixabay (saving API quota and giving instant results to cooks).
 *
 * Idempotent: re-running upserts on slug. Run after a migration or when
 * we want to refresh stale photo URLs.
 *
 * Usage:
 *   # 1. Get a free Pixabay key at https://pixabay.com/api/docs/
 *   # 2. Export the env vars (or pass via .env loader of your choice):
 *   export PIXABAY_API_KEY=...
 *   export SUPABASE_URL=https://your-project.supabase.co
 *   export SUPABASE_SERVICE_ROLE_KEY=eyJhb...   (NOT the anon key — RLS needs bypass)
 *   # 3. Run:
 *   node scripts/seed_equipment_library.cjs
 *
 * Pixabay terms: free for commercial use, attribution recommended.
 * We store the photographer in `attribution` for the credit chip.
 * -----------------------------------------------------------------------
 */
const { createClient } = require('@supabase/supabase-js');

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!PIXABAY_API_KEY) {
  console.error('✗ Missing PIXABAY_API_KEY. Get one at https://pixabay.com/api/docs/');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('✗ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('  The service-role key bypasses RLS — get it from:');
  console.error('  Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ---------------------------------------------------------------------
 * Catalog — ~100 common kitchen items spanning hotel/restaurant ops.
 *
 * Each entry:
 *   slug      — unique identifier, lowercase, kebab-case
 *   name_en   — display name (English) — canonical
 *   name_fr   — display name (French)  — for FR-speaking cooks
 *   name_th   — display name (Thai)    — for TH-speaking cooks
 *   category  — coarse bucket for filter UI
 *   query     — what to send to Pixabay. Often slightly different from
 *               the name to get better photo results (e.g. "wok pan"
 *               instead of just "wok" which returns random stir-fry shots).
 * --------------------------------------------------------------------- */
const ITEMS = [
  // ─── Cookware (15) ───
  { slug: 'wok', name_en: 'Wok', name_fr: 'Wok', name_th: 'กระทะวอก', category: 'cookware', query: 'wok pan empty' },
  { slug: 'saute-pan', name_en: 'Sauté pan', name_fr: 'Sauteuse', name_th: 'กระทะซอเต้', category: 'cookware', query: 'saute pan kitchen' },
  { slug: 'frying-pan', name_en: 'Frying pan', name_fr: 'Poêle', name_th: 'กระทะ', category: 'cookware', query: 'frying pan empty' },
  { slug: 'saucepan', name_en: 'Saucepan', name_fr: 'Casserole', name_th: 'หม้อ', category: 'cookware', query: 'saucepan kitchen' },
  { slug: 'stockpot', name_en: 'Stockpot', name_fr: 'Faitout', name_th: 'หม้อต้ม', category: 'cookware', query: 'stockpot kitchen' },
  { slug: 'dutch-oven', name_en: 'Dutch oven', name_fr: 'Cocotte', name_th: 'หม้อเหล็กหล่อ', category: 'cookware', query: 'dutch oven cast iron' },
  { slug: 'gastronorm-pan', name_en: 'Gastronorm pan', name_fr: 'Bac gastro', name_th: 'ถาดแกสโทรนอม', category: 'cookware', query: 'gastronorm pan' },
  { slug: 'crepe-pan', name_en: 'Crêpe pan', name_fr: 'Crêpière', name_th: 'กระทะเครป', category: 'cookware', query: 'crepe pan' },
  { slug: 'grill-pan', name_en: 'Grill pan', name_fr: 'Poêle grill', name_th: 'กระทะย่าง', category: 'cookware', query: 'grill pan kitchen' },
  { slug: 'paella-pan', name_en: 'Paella pan', name_fr: 'Plat à paella', name_th: 'กระทะปาเอย่า', category: 'cookware', query: 'paella pan' },
  { slug: 'tagine', name_en: 'Tagine', name_fr: 'Tajine', name_th: 'หม้อตาจีน', category: 'cookware', query: 'tagine moroccan' },
  { slug: 'plancha', name_en: 'Plancha', name_fr: 'Plancha', name_th: 'แผ่นเหล็กย่าง', category: 'cookware', query: 'plancha grill' },
  { slug: 'baking-sheet', name_en: 'Baking sheet', name_fr: 'Plaque de cuisson', name_th: 'ถาดอบ', category: 'cookware', query: 'baking sheet tray' },
  { slug: 'roasting-pan', name_en: 'Roasting pan', name_fr: 'Plat à rôtir', name_th: 'ถาดอบเนื้อ', category: 'cookware', query: 'roasting pan' },
  { slug: 'steamer-basket', name_en: 'Steamer basket', name_fr: 'Panier vapeur', name_th: 'ตะกร้านึ่ง', category: 'cookware', query: 'bamboo steamer basket' },

  // ─── Knives (8) ───
  { slug: 'chef-knife', name_en: 'Chef knife', name_fr: 'Couteau de chef', name_th: 'มีดเชฟ', category: 'knives', query: 'chef knife kitchen' },
  { slug: 'paring-knife', name_en: 'Paring knife', name_fr: "Couteau d'office", name_th: 'มีดปอก', category: 'knives', query: 'paring knife' },
  { slug: 'boning-knife', name_en: 'Boning knife', name_fr: 'Couteau à désosser', name_th: 'มีดเลาะกระดูก', category: 'knives', query: 'boning knife' },
  { slug: 'bread-knife', name_en: 'Bread knife', name_fr: 'Couteau à pain', name_th: 'มีดหั่นขนมปัง', category: 'knives', query: 'bread knife serrated' },
  { slug: 'santoku', name_en: 'Santoku knife', name_fr: 'Couteau santoku', name_th: 'มีดซันโตคุ', category: 'knives', query: 'santoku knife japanese' },
  { slug: 'fillet-knife', name_en: 'Fillet knife', name_fr: 'Couteau à filet', name_th: 'มีดแล่ปลา', category: 'knives', query: 'fillet knife fish' },
  { slug: 'cleaver', name_en: 'Cleaver', name_fr: 'Couperet', name_th: 'มีดอีโต้', category: 'knives', query: 'cleaver chinese knife' },
  { slug: 'kitchen-shears', name_en: 'Kitchen shears', name_fr: 'Ciseaux de cuisine', name_th: 'กรรไกรครัว', category: 'knives', query: 'kitchen shears scissors' },

  // ─── Small appliances (12) ───
  { slug: 'thermomix', name_en: 'Thermomix', name_fr: 'Thermomix', name_th: 'เทอร์โมมิกซ์', category: 'small_appliances', query: 'thermomix' },
  { slug: 'blender', name_en: 'Blender', name_fr: 'Blender', name_th: 'เครื่องปั่น', category: 'small_appliances', query: 'kitchen blender' },
  { slug: 'food-processor', name_en: 'Food processor', name_fr: 'Robot ménager', name_th: 'เครื่องเตรียมอาหาร', category: 'small_appliances', query: 'food processor' },
  { slug: 'stand-mixer', name_en: 'Stand mixer', name_fr: 'Robot pâtissier', name_th: 'เครื่องตีแป้ง', category: 'small_appliances', query: 'stand mixer kitchen' },
  { slug: 'hand-mixer', name_en: 'Hand mixer', name_fr: 'Batteur électrique', name_th: 'เครื่องตีไข่', category: 'small_appliances', query: 'hand mixer kitchen' },
  { slug: 'immersion-blender', name_en: 'Immersion blender', name_fr: 'Mixeur plongeant', name_th: 'เครื่องปั่นมือถือ', category: 'small_appliances', query: 'immersion blender' },
  { slug: 'juicer', name_en: 'Juicer', name_fr: 'Centrifugeuse', name_th: 'เครื่องสกัดน้ำผลไม้', category: 'small_appliances', query: 'juicer kitchen' },
  { slug: 'rice-cooker', name_en: 'Rice cooker', name_fr: 'Cuiseur à riz', name_th: 'หม้อหุงข้าว', category: 'small_appliances', query: 'rice cooker' },
  { slug: 'sous-vide', name_en: 'Sous-vide circulator', name_fr: 'Cuiseur sous-vide', name_th: 'เครื่องซูวี', category: 'small_appliances', query: 'sous vide circulator' },
  { slug: 'deep-fryer', name_en: 'Deep fryer', name_fr: 'Friteuse', name_th: 'หม้อทอด', category: 'small_appliances', query: 'deep fryer kitchen' },
  { slug: 'coffee-machine', name_en: 'Espresso machine', name_fr: 'Machine espresso', name_th: 'เครื่องชงกาแฟ', category: 'small_appliances', query: 'espresso machine' },
  { slug: 'kettle', name_en: 'Electric kettle', name_fr: 'Bouilloire', name_th: 'กาต้มน้ำไฟฟ้า', category: 'small_appliances', query: 'electric kettle' },

  // ─── Tools (20) ───
  { slug: 'mandoline', name_en: 'Mandoline', name_fr: 'Mandoline', name_th: 'ที่ฝานบาง', category: 'tools', query: 'mandoline slicer kitchen' },
  { slug: 'whisk', name_en: 'Whisk', name_fr: 'Fouet', name_th: 'ตะกร้อตีไข่', category: 'tools', query: 'whisk kitchen' },
  { slug: 'ladle', name_en: 'Ladle', name_fr: 'Louche', name_th: 'ทัพพี', category: 'tools', query: 'ladle kitchen' },
  { slug: 'spatula', name_en: 'Spatula', name_fr: 'Spatule', name_th: 'ตะหลิว', category: 'tools', query: 'spatula kitchen silicone' },
  { slug: 'tongs', name_en: 'Tongs', name_fr: 'Pince', name_th: 'ที่คีบอาหาร', category: 'tools', query: 'kitchen tongs' },
  { slug: 'peeler', name_en: 'Peeler', name_fr: 'Économe', name_th: 'ที่ปอก', category: 'tools', query: 'vegetable peeler' },
  { slug: 'box-grater', name_en: 'Box grater', name_fr: 'Râpe', name_th: 'ที่ขูด', category: 'tools', query: 'box grater kitchen' },
  { slug: 'microplane', name_en: 'Microplane', name_fr: 'Microplane', name_th: 'ที่ขูดละเอียด', category: 'tools', query: 'microplane zester' },
  { slug: 'can-opener', name_en: 'Can opener', name_fr: 'Ouvre-boîte', name_th: 'ที่เปิดกระป๋อง', category: 'tools', query: 'can opener kitchen' },
  { slug: 'garlic-press', name_en: 'Garlic press', name_fr: 'Presse-ail', name_th: 'ที่บดกระเทียม', category: 'tools', query: 'garlic press' },
  { slug: 'rolling-pin', name_en: 'Rolling pin', name_fr: 'Rouleau à pâtisserie', name_th: 'ไม้นวดแป้ง', category: 'tools', query: 'rolling pin wooden' },
  { slug: 'pastry-brush', name_en: 'Pastry brush', name_fr: 'Pinceau de cuisine', name_th: 'แปรงทาเนย', category: 'tools', query: 'pastry brush' },
  { slug: 'sieve', name_en: 'Fine sieve', name_fr: 'Tamis', name_th: 'กระชอน', category: 'tools', query: 'fine sieve kitchen' },
  { slug: 'colander', name_en: 'Colander', name_fr: 'Passoire', name_th: 'ตะแกรงสะเด็ดน้ำ', category: 'tools', query: 'colander kitchen' },
  { slug: 'funnel', name_en: 'Funnel', name_fr: 'Entonnoir', name_th: 'กรวย', category: 'tools', query: 'funnel kitchen' },
  { slug: 'ice-cream-scoop', name_en: 'Ice cream scoop', name_fr: 'Cuillère à glace', name_th: 'ที่ตักไอศกรีม', category: 'tools', query: 'ice cream scoop' },
  { slug: 'zester', name_en: 'Citrus zester', name_fr: 'Zesteur', name_th: 'ที่ขูดเปลือกส้ม', category: 'tools', query: 'citrus zester' },
  { slug: 'lemon-squeezer', name_en: 'Lemon squeezer', name_fr: 'Presse-citron', name_th: 'ที่คั้นมะนาว', category: 'tools', query: 'lemon squeezer' },
  { slug: 'skimmer', name_en: 'Skimmer / spider', name_fr: 'Écumoire', name_th: 'ที่ตักฟอง', category: 'tools', query: 'kitchen skimmer spider' },
  { slug: 'mortar-pestle', name_en: 'Mortar and pestle', name_fr: 'Mortier et pilon', name_th: 'ครกและสาก', category: 'tools', query: 'mortar pestle' },

  // ─── Measurement (5) ───
  { slug: 'kitchen-scale', name_en: 'Kitchen scale', name_fr: 'Balance de cuisine', name_th: 'เครื่องชั่งครัว', category: 'measure', query: 'kitchen scale digital' },
  { slug: 'measuring-cups', name_en: 'Measuring cups', name_fr: 'Tasses à mesurer', name_th: 'ถ้วยตวง', category: 'measure', query: 'measuring cups set' },
  { slug: 'measuring-spoons', name_en: 'Measuring spoons', name_fr: 'Cuillères doseuses', name_th: 'ช้อนตวง', category: 'measure', query: 'measuring spoons set' },
  { slug: 'thermometer', name_en: 'Cooking thermometer', name_fr: 'Thermomètre de cuisine', name_th: 'เครื่องวัดอุณหภูมิ', category: 'measure', query: 'cooking thermometer probe' },
  { slug: 'timer', name_en: 'Kitchen timer', name_fr: 'Minuteur', name_th: 'นาฬิกาจับเวลา', category: 'measure', query: 'kitchen timer' },

  // ─── Bakery / pastry (10) ───
  { slug: 'piping-bag', name_en: 'Piping bag', name_fr: 'Poche à douille', name_th: 'ถุงบีบครีม', category: 'bakery', query: 'piping bag pastry' },
  { slug: 'piping-tips', name_en: 'Piping tips', name_fr: 'Douilles', name_th: 'หัวบีบครีม', category: 'bakery', query: 'piping tips nozzles' },
  { slug: 'dough-scraper', name_en: 'Dough scraper', name_fr: 'Corne de pâtisserie', name_th: 'ที่ขูดแป้ง', category: 'bakery', query: 'dough scraper' },
  { slug: 'bench-scraper', name_en: 'Bench scraper', name_fr: 'Coupe-pâte', name_th: 'ที่ตัดแป้ง', category: 'bakery', query: 'bench scraper baking' },
  { slug: 'cake-pan', name_en: 'Cake pan', name_fr: 'Moule à gâteau', name_th: 'พิมพ์เค้ก', category: 'bakery', query: 'cake pan round' },
  { slug: 'springform-pan', name_en: 'Springform pan', name_fr: 'Moule à charnière', name_th: 'พิมพ์สปริงฟอร์ม', category: 'bakery', query: 'springform pan' },
  { slug: 'muffin-tin', name_en: 'Muffin tin', name_fr: 'Moule à muffins', name_th: 'พิมพ์มัฟฟิน', category: 'bakery', query: 'muffin tin' },
  { slug: 'loaf-pan', name_en: 'Loaf pan', name_fr: 'Moule à cake', name_th: 'พิมพ์ขนมปัง', category: 'bakery', query: 'loaf pan bread' },
  { slug: 'cooling-rack', name_en: 'Cooling rack', name_fr: 'Grille de refroidissement', name_th: 'ตะแกรงพักขนม', category: 'bakery', query: 'cooling rack wire' },
  { slug: 'silicone-mat', name_en: 'Silicone baking mat', name_fr: 'Tapis silicone', name_th: 'แผ่นซิลิโคนรองอบ', category: 'bakery', query: 'silicone baking mat' },

  // ─── Storage / Prep (10) ───
  { slug: 'cutting-board', name_en: 'Cutting board', name_fr: 'Planche à découper', name_th: 'เขียง', category: 'prep', query: 'cutting board wooden' },
  { slug: 'mixing-bowl', name_en: 'Mixing bowl', name_fr: 'Cul-de-poule', name_th: 'ชามผสม', category: 'prep', query: 'mixing bowl stainless' },
  { slug: 'salad-spinner', name_en: 'Salad spinner', name_fr: 'Essoreuse à salade', name_th: 'ที่สลัดผัก', category: 'prep', query: 'salad spinner' },
  { slug: 'ramekin', name_en: 'Ramekin', name_fr: 'Ramequin', name_th: 'ถ้วยเรเมอกิน', category: 'prep', query: 'ramekin ceramic' },
  { slug: 'gastronorm-container', name_en: 'Gastronorm container', name_fr: 'Bac inox', name_th: 'กล่องเก็บอาหาร', category: 'prep', query: 'gastronorm container stainless' },
  { slug: 'vacuum-sealer', name_en: 'Vacuum sealer', name_fr: 'Machine sous-vide', name_th: 'เครื่องซีลสุญญากาศ', category: 'prep', query: 'vacuum sealer kitchen' },
  { slug: 'mason-jar', name_en: 'Mason jar', name_fr: 'Bocal en verre', name_th: 'โหลแก้ว', category: 'prep', query: 'mason jar' },
  { slug: 'pepper-mill', name_en: 'Pepper mill', name_fr: 'Moulin à poivre', name_th: 'ที่บดพริกไทย', category: 'prep', query: 'pepper mill grinder' },
  { slug: 'salt-cellar', name_en: 'Salt cellar', name_fr: 'Salière', name_th: 'ที่ใส่เกลือ', category: 'prep', query: 'salt cellar' },
  { slug: 'oil-bottle', name_en: 'Oil dispenser', name_fr: "Huilier", name_th: 'ขวดน้ำมัน', category: 'prep', query: 'oil dispenser bottle kitchen' },

  // ─── Ovens / Heating (6) ───
  { slug: 'combi-oven', name_en: 'Combi oven', name_fr: 'Four mixte', name_th: 'เตาอบคอมบิ', category: 'heating', query: 'combi oven professional' },
  { slug: 'salamander', name_en: 'Salamander grill', name_fr: 'Salamandre', name_th: 'เตาย่างซาลามานเดอร์', category: 'heating', query: 'salamander grill kitchen' },
  { slug: 'induction-burner', name_en: 'Induction burner', name_fr: 'Plaque à induction', name_th: 'เตาแม่เหล็กไฟฟ้า', category: 'heating', query: 'induction cooktop burner' },
  { slug: 'gas-burner', name_en: 'Gas burner', name_fr: 'Brûleur à gaz', name_th: 'เตาแก๊ส', category: 'heating', query: 'gas stove burner' },
  { slug: 'microwave', name_en: 'Microwave oven', name_fr: 'Four micro-ondes', name_th: 'เตาไมโครเวฟ', category: 'heating', query: 'microwave oven' },
  { slug: 'rice-steamer', name_en: 'Steamer', name_fr: 'Cuit-vapeur', name_th: 'หม้อนึ่ง', category: 'heating', query: 'food steamer' },

  // ─── Beverages / Bar (5) ───
  { slug: 'cocktail-shaker', name_en: 'Cocktail shaker', name_fr: 'Shaker', name_th: 'เชคเกอร์', category: 'bar', query: 'cocktail shaker' },
  { slug: 'jigger', name_en: 'Jigger', name_fr: 'Doseur', name_th: 'ถ้วยตวงเหล้า', category: 'bar', query: 'jigger bartender' },
  { slug: 'muddler', name_en: 'Muddler', name_fr: 'Pilon à cocktail', name_th: 'ที่ตำคอกเทล', category: 'bar', query: 'cocktail muddler' },
  { slug: 'bar-spoon', name_en: 'Bar spoon', name_fr: 'Cuillère de bar', name_th: 'ช้อนบาร์', category: 'bar', query: 'bar spoon cocktail' },
  { slug: 'ice-bucket', name_en: 'Ice bucket', name_fr: 'Seau à glace', name_th: 'ถังน้ำแข็ง', category: 'bar', query: 'ice bucket bar' },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchPixabayTop(query) {
  const url = new URL('https://pixabay.com/api/');
  url.searchParams.set('key', PIXABAY_API_KEY);
  url.searchParams.set('q', query);
  url.searchParams.set('image_type', 'photo');
  url.searchParams.set('orientation', 'horizontal');
  url.searchParams.set('per_page', '3');
  url.searchParams.set('safesearch', 'true');
  // No `lang` — we want the most universally-tagged photo, not localized
  const resp = await fetch(url.toString(), {
    headers: { 'User-Agent': 'STAYLO-Seeder/1.0' },
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '?');
    throw new Error(`Pixabay ${resp.status}: ${body.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.hits?.[0] || null;
}

async function upsertItem(item, hit) {
  const row = {
    slug: item.slug,
    name_en: item.name_en,
    name_fr: item.name_fr,
    name_th: item.name_th,
    category: item.category,
    image_url: hit.webformatURL,
    thumb_url: hit.previewURL,
    source: 'pixabay',
    source_id: String(hit.id),
    attribution: `Photo by ${hit.user} on Pixabay`,
  };
  const { error } = await sb
    .from('equipment_library')
    .upsert(row, { onConflict: 'slug' });
  if (error) throw new Error(`upsert ${item.slug}: ${error.message}`);
}

async function main() {
  console.log('=== STAYLO equipment library seed ===');
  console.log(`Target: ${ITEMS.length} items`);
  console.log(`Supabase: ${SUPABASE_URL}\n`);

  let success = 0, skipped = 0, failed = 0;
  for (let i = 0; i < ITEMS.length; i++) {
    const item = ITEMS[i];
    const pct = String(Math.round(((i+1)/ITEMS.length)*100)).padStart(3);
    try {
      const hit = await fetchPixabayTop(item.query);
      if (!hit) {
        console.log(`  ${pct}%  ⚠  ${item.slug.padEnd(25)} — no Pixabay hit for "${item.query}"`);
        skipped++;
      } else {
        await upsertItem(item, hit);
        console.log(`  ${pct}%  ✓  ${item.slug.padEnd(25)} ← Pixabay #${hit.id} (by ${hit.user})`);
        success++;
      }
    } catch (err) {
      console.log(`  ${pct}%  ✗  ${item.slug.padEnd(25)} — ${err.message}`);
      failed++;
    }
    // Pixabay rate limit is 100 req / 60s; 700ms between calls keeps us safe
    await sleep(700);
  }

  console.log('\n=== Done ===');
  console.log(`  ✓ Seeded   : ${success}`);
  console.log(`  ⚠ Skipped  : ${skipped}  (no Pixabay photo found — try a different query)`);
  console.log(`  ✗ Failed   : ${failed}`);
  console.log(`  Total      : ${ITEMS.length}`);

  if (failed > 0) process.exit(2);
}

main().catch(err => {
  console.error('FATAL', err);
  process.exit(1);
});
