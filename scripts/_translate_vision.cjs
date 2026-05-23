#!/usr/bin/env node
/**
 * One-shot translation pass for the `vision` namespace.
 * Replaces every ⟦TODO⟧ marker with proper FR + TH translations.
 * Brand terms left untouched per BRAND_GLOSSARY.md §7:
 *   STAYLO, Staylo, Booking.com, Agoda, Founding Partner, Founding
 *   Member, Ambassador, $STAY, Solana, BTC, TAT, DBD, LOI.
 * --------------------------------------------------------------------
 * After running: re-run `node scripts/sync-messenger-i18n.cjs`.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const T = {
  invest_cta: { fr: 'Devenir Founding Member', th: 'เป็น Founding Member' },
  flow_label: { fr: 'Pour chaque', th: 'สำหรับทุกๆ' },
  flow_booked: { fr: 'réservés', th: 'ที่จอง' },
  flow_ota_title: { fr: 'Avec Booking.com / Agoda', th: 'ที่ Booking.com / Agoda' },
  flow_ota_commission: { fr: 'Commission', th: 'ค่าคอมมิชชั่น' },
  flow_ota_where: { fr: 'Où va-t-elle ?', th: 'ไปไหน?' },
  flow_ota_destination: { fr: 'Hedge funds & paradis fiscaux', th: 'กองทุนเก็งกำไรและที่หลบเลี่ยงภาษี' },
  flow_ota_back: { fr: 'Ce qui vous revient ?', th: 'อะไรกลับมาหาคุณ?' },
  flow_you_keep: { fr: 'Vous gardez', th: 'คุณเหลือ' },
  flow_recommended: { fr: 'MEILLEURE OFFRE', th: 'ดีกว่า' },
  flow_staylo_title: { fr: 'Avec Staylo', th: 'ที่ Staylo' },
  flow_staylo_commission: { fr: 'Commission', th: 'ค่าคอมมิชชั่น' },
  flow_staylo_where: { fr: 'Où va-t-elle ?', th: 'ไปไหน?' },
  flow_staylo_community: { fr: 'Votre communauté', th: 'ชุมชนของคุณ' },
  flow_more_revenue: { fr: 'de revenus supplémentaires vs OTAs', th: 'รายได้เพิ่มเทียบกับ OTA' },
  flow_disclaimer: {
    fr: "Basé sur une commission OTA moyenne de 22%. L'économie réelle dépend de votre plateforme et de vos tarifs actuels.",
    th: 'อิงจากค่าคอมมิชชั่นเฉลี่ย OTA 22% การประหยัดจริงขึ้นอยู่กับแพลตฟอร์มและอัตราปัจจุบันของคุณ',
  },
  projections_badge: { fr: 'Projections financières', th: 'การคาดการณ์ทางการเงิน' },
  projections_title: { fr: 'La feuille de route vers $1B', th: 'เส้นทางสู่ 1 พันล้านเหรียญ' },
  projections_subtitle: {
    fr: 'Données transparentes. Chiffres réels. Conçu pour la confiance.',
    th: 'ข้อมูลโปร่งใส ตัวเลขจริง สร้างเพื่อความไว้วางใจ',
  },
  proj_36m_title: { fr: 'Projections financières à 36 mois', th: 'การคาดการณ์ทางการเงิน 36 เดือน' },
  share_structure_title: {
    fr: 'Structure des parts — 500 000 parts · 4 catégories',
    th: 'โครงสร้างหุ้น — 500,000 หุ้น · 4 หมวด',
  },
  tokenomics_title: {
    fr: 'Token $STAY — 10 Mds offre · Solana · Halving Bitcoin',
    th: 'Token $STAY — 10 พันล้าน · Solana · Halving แบบ Bitcoin',
  },
  governance_detail_title: {
    fr: 'Gouvernance — DAO on-chain · 1 hôtel = 1 vote',
    th: 'การกำกับดูแล — DAO on-chain · 1 โรงแรม = 1 เสียง',
  },
  investor_rights_title: {
    fr: 'Droits des investisseurs privés — Engagés sans contrôler',
    th: 'สิทธิของนักลงทุนภาคเอกชน — มีส่วนร่วมแต่ไม่ควบคุม',
  },
  ambassador_cta: { fr: 'Devenir Ambassador', th: 'เป็น Ambassador' },
  docs_badge: { fr: "Processus d'inscription", th: 'กระบวนการลงทะเบียน' },
  docs_title: { fr: 'Ce qu\'il faut pour rejoindre', th: 'สิ่งที่คุณต้องใช้เพื่อเข้าร่วม' },
  docs_subtitle: {
    fr: "Pour devenir Founding Partner officiel de Staylo, votre entreprise doit être légalement enregistrée. Voici ce que nous demandons :",
    th: 'เพื่อเป็น Founding Partner อย่างเป็นทางการของ Staylo ธุรกิจของคุณต้องจดทะเบียนถูกต้องตามกฎหมาย นี่คือสิ่งที่เราต้องการ:',
  },
  doc_license: { fr: "Licence d'exploitation", th: 'ใบอนุญาตประกอบกิจการ' },
  doc_license_desc: {
    fr: "Licence TAT (Thaïlande) ou enregistrement commercial local équivalent",
    th: 'ใบอนุญาต ททท (ประเทศไทย) หรือใบทะเบียนพาณิชย์ท้องถิ่นที่เทียบเท่า',
  },
  doc_registration: { fr: 'Immatriculation de société', th: 'หนังสือรับรองบริษัท' },
  doc_registration_desc: {
    fr: "Certificat d'immatriculation DBD ou équivalent (SARL, SAS, micro-entreprise)",
    th: 'หนังสือรับรอง DBD หรือเทียบเท่า (เช่น บริษัทจำกัด ห้างหุ้นส่วน เจ้าของคนเดียว)',
  },
  doc_property: { fr: 'Justificatif de propriété', th: 'หลักฐานทรัพย์สิน' },
  doc_property_desc: {
    fr: "Acte de propriété, bail, ou contrat de gestion de la propriété",
    th: 'โฉนดที่ดิน สัญญาเช่า หรือสัญญาบริหารทรัพย์สิน',
  },
  doc_tax: { fr: 'Identifiant fiscal', th: 'เลขประจำตัวผู้เสียภาษี' },
  doc_tax_desc: {
    fr: "Numéro d'identification fiscale valide pour l'entité commerciale",
    th: 'เลขประจำตัวผู้เสียภาษีที่ใช้ได้สำหรับนิติบุคคล',
  },
  doc_loi: { fr: "Lettre d'intention", th: 'หนังสือแสดงเจตจำนง' },
  doc_loi_desc: {
    fr: 'LOI signée (fournie par Staylo) — bilingue TH/EN, non contraignante',
    th: 'LOI ที่ลงนาม (จัดทำโดย Staylo) — สองภาษา TH/EN ไม่ผูกมัด',
  },
  doc_contract: { fr: 'Contrat Founding Partner', th: 'สัญญา Founding Partner' },
  doc_contract_desc: {
    fr: "Accord de partenariat officiel — signé à l'achat des parts",
    th: 'ข้อตกลงเป็นพันธมิตรอย่างเป็นทางการ — ลงนามเมื่อซื้อหุ้น',
  },
  doc_required: { fr: 'Requis', th: 'บังคับ' },
  docs_note: {
    fr: "Le processus officiel de partenariat démarrera lorsque les 3 000 parts alpha seront toutes réservées. Réservez vos parts maintenant — les documents arrivent plus tard.",
    th: 'กระบวนการพันธมิตรอย่างเป็นทางการจะเริ่มเมื่อมีการจองหุ้นอัลฟ่าครบ 3,000 หุ้น จองหุ้นของคุณตอนนี้ — ส่งเอกสารทีหลัง',
  },
};

function apply(locale) {
  const p = path.join(ROOT, 'src', 'i18n', `${locale}.json`);
  const bundle = JSON.parse(fs.readFileSync(p, 'utf-8'));
  bundle.vision = bundle.vision || {};
  let count = 0;
  for (const [k, v] of Object.entries(T)) {
    if (v[locale]) {
      bundle.vision[k] = v[locale];
      count++;
    }
  }
  fs.writeFileSync(p, JSON.stringify(bundle, null, 2) + '\n', 'utf-8');
  console.log(`  ${locale}.json: ${count} keys translated`);
}

console.log('[translate-vision] applying FR + TH translations…');
apply('fr');
apply('th');
console.log('[translate-vision] done. Run sync next.');
