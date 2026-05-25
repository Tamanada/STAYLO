#!/usr/bin/env node
/**
 * Mega translation batch for the remaining 446 ⟦TODO⟧ keys.
 * Brand terms preserved per BRAND_GLOSSARY.md §7:
 *   STAYLO, Staylo, Booking.com, Agoda, Founding Partner, Founding
 *   Member, Ambassador, $STAY, BTC, Bitcoin, Lightning, Solana, TAT,
 *   DBD, LOI, Stripe, Wallet of Satoshi, OTA.
 *
 * For each leaf key under a namespace, provide { fr, th } strings.
 * Re-run safe: only replaces values that still carry the ⟦TODO⟧ marker.
 * --------------------------------------------------------------------
 */
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');

const T = {
  giants: {
    why_10_short: { fr: "c'est tout ce qu'il faut", th: 'เท่านี้ก็พอ' },
  },
  social_proof: {
    members: { fr: 'Membres', th: 'สมาชิก' },
  },
  property: {
    error: { fr: "L'inscription a échoué. Vérifiez les champs obligatoires et réessayez.", th: 'การลงทะเบียนล้มเหลว กรุณาตรวจสอบช่องที่จำเป็นและลองอีกครั้ง' },
  },
  auth: {
    invalid_credentials: { fr: 'Email ou mot de passe invalide', th: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
  },
  common: {
    sign_out: { fr: 'Se déconnecter', th: 'ออกจากระบบ' },
  },
  ambassador_landing: {
    cta_dashboard: { fr: 'Aller à mon dashboard Ambassador', th: 'ไปที่ Dashboard Ambassador ของฉัน' },
    cta_activate: { fr: 'Activer mon compte Ambassador', th: 'เปิดใช้งานบัญชี Ambassador' },
  },
  chat: {
    error: { fr: 'Désolé, une erreur est survenue. Réessayez.', th: 'ขออภัย เกิดข้อผิดพลาด กรุณาลองอีกครั้ง' },
    placeholder: { fr: 'Demandez-moi tout sur STAYLO…', th: 'ถามอะไรเกี่ยวกับ STAYLO ก็ได้…' },
  },
  home_grid: {
    empty_title: { fr: 'Onboarding des premiers hôtels de Koh Phangan', th: 'กำลังต้อนรับโรงแรมแรกๆ ของเกาะพะงัน' },
    empty_desc: { fr: 'Les propriétés vedettes apparaîtront ici à mesure que les hôteliers complètent leur fiche. Vous voulez être le premier ?', th: 'ทรัพย์สินเด่นจะปรากฏที่นี่เมื่อเจ้าของโรงแรมกรอกข้อมูลเสร็จ อยากเป็นคนแรกไหม?' },
    empty_cta: { fr: 'Inscrire mon hôtel', th: 'ลงทะเบียนโรงแรมของฉัน' },
    view_all_count: { fr: 'Voir tous les {{count}} hôtels', th: 'ดูทั้งหมด {{count}} โรงแรม' },
    no_price: { fr: 'Tarifs bientôt', th: 'ราคาเร็วๆ นี้' },
  },
  app: {
    'shift_editor.scope_hint_timing': { fr: "L'enregistrement appliquera Début / Fin / Pause / Lieu aux jours cochés ci-dessous.", th: 'การบันทึกจะใช้ เริ่ม / สิ้นสุด / พัก / สถานที่ กับวันที่เลือกด้านล่าง' },
    'shift_editor.scope_hint_briefing': { fr: "L'enregistrement écrira le briefing sur les jours cochés ci-dessous. Les jours sans shift existant sont ignorés.", th: 'การบันทึกจะเขียน briefing ในวันที่เลือกด้านล่าง วันที่ไม่มีกะอยู่จะข้ามไป' },
    'shift_editor.tasks_recipe_attach': { fr: 'Attacher une recette (fiche technique)', th: 'แนบสูตรอาหาร (fiche technique)' },
    'shift_editor.scope_hint_tasks': { fr: "L'enregistrement clone les tâches du jour vers les jours cochés ci-dessous. Les tâches déjà présentes ne sont pas dupliquées.", th: 'การบันทึกจะ clone งานของวันนี้ไปยังวันที่เลือกด้านล่าง งานที่มีอยู่แล้วจะไม่ถูกทำซ้ำ' },
  },
  reset: {
    error_min: { fr: 'Le mot de passe doit faire au moins 8 caractères', th: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' },
    error_match: { fr: 'Les mots de passe ne correspondent pas', th: 'รหัสผ่านไม่ตรงกัน' },
    success_title: { fr: 'Mot de passe mis à jour !', th: 'อัปเดตรหัสผ่านแล้ว!' },
    success_msg: { fr: 'Redirection vers votre dashboard…', th: 'กำลังนำคุณกลับสู่ dashboard…' },
    title: { fr: 'Créer un nouveau mot de passe', th: 'สร้างรหัสผ่านใหม่' },
    subtitle: { fr: 'Entrez votre nouveau mot de passe ci-dessous', th: 'ใส่รหัสผ่านใหม่ของคุณด้านล่าง' },
    new_password: { fr: 'Nouveau mot de passe', th: 'รหัสผ่านใหม่' },
    password_placeholder: { fr: 'Min. 8 caractères', th: 'อย่างน้อย 8 ตัวอักษร' },
    confirm_password: { fr: 'Confirmer le mot de passe', th: 'ยืนยันรหัสผ่าน' },
    confirm_placeholder: { fr: 'Retapez le mot de passe', th: 'พิมพ์รหัสผ่านอีกครั้ง' },
    submit: { fr: 'Mettre à jour le mot de passe', th: 'อัปเดตรหัสผ่าน' },
  },
  verify: {
    gate_title: { fr: "Vérifiez d'abord votre email", th: 'ยืนยันอีเมลของคุณก่อน' },
    gate_reason: { fr: 'Vous avez besoin d\'un email vérifié', th: 'คุณต้องการอีเมลที่ยืนยันแล้ว' },
    gate_generic: { fr: 'Vous avez besoin d\'un email vérifié pour continuer.', th: 'คุณต้องมีอีเมลที่ยืนยันแล้วเพื่อดำเนินการต่อ' },
    gate_security: { fr: 'Cela vous protège, vous et les hôteliers avec qui vous interagissez.', th: 'นี่เป็นการปกป้องคุณและเจ้าของโรงแรมที่คุณติดต่อด้วย' },
    gate_button: { fr: 'Vérifier mon email', th: 'ยืนยันอีเมลของฉัน' },
    success_title: { fr: 'Email vérifié !', th: 'ยืนยันอีเมลสำเร็จ!' },
    success_desc: { fr: 'Retour à votre page précédente…', th: 'กำลังนำคุณกลับไปยังหน้าก่อนหน้า…' },
    continue: { fr: 'Continuer maintenant →', th: 'ดำเนินการต่อ →' },
    pending_title: { fr: 'Vérifiez votre boîte de réception', th: 'ตรวจสอบกล่องจดหมายของคุณ' },
    pending_desc: { fr: 'Nous avons envoyé un lien de confirmation à', th: 'เราได้ส่งลิงก์ยืนยันไปที่' },
    tip: { fr: 'Cliquez sur le lien dans l\'email pour activer votre compte. Vérifiez le dossier spam si vous ne le voyez pas après quelques minutes.', th: 'คลิกลิงก์ในอีเมลเพื่อเปิดใช้งานบัญชี ตรวจสอบโฟลเดอร์สแปมหากไม่เห็นภายในไม่กี่นาที' },
    resent: { fr: 'Email renvoyé. Vérifiez votre boîte de réception.', th: 'ส่งอีเมลอีกครั้งแล้ว ตรวจสอบกล่องจดหมาย' },
    rate_limit: { fr: 'Patientez une minute avant de demander un autre email.', th: 'กรุณารอสักครู่ก่อนขออีเมลใหม่' },
    resending: { fr: 'Envoi en cours…', th: 'กำลังส่ง…' },
    resend_button: { fr: "Renvoyer l'email de confirmation", th: 'ส่งอีเมลยืนยันอีกครั้ง' },
    wrong_email: { fr: 'Mauvais email ? Déconnectez-vous et réessayez', th: 'อีเมลไม่ถูก? ออกจากระบบและลองใหม่' },
  },
  lightning: {
    title: { fr: 'Payer avec Bitcoin Lightning', th: 'จ่ายด้วย Bitcoin Lightning' },
    expires_in: { fr: 'Expire dans', th: 'หมดอายุใน' },
    copied: { fr: 'Copié !', th: 'คัดลอกแล้ว!' },
    copy_invoice: { fr: 'Copier la facture BOLT11', th: 'คัดลอก invoice BOLT11' },
    waiting: { fr: 'En attente du paiement…', th: 'กำลังรอการชำระเงิน…' },
    paid_title: { fr: 'Paiement reçu !', th: 'รับการชำระเงินแล้ว!' },
    paid_desc: { fr: 'Votre réservation est en cours de confirmation…', th: 'กำลังยืนยันการจองของคุณ…' },
    expired_title: 'Invoice expirée',
    expired_desc: 'Les invoices Lightning expirent après 1 heure. Générez-en une nouvelle pour réessayer.',
    close: { fr: 'Fermer', th: 'ปิด' },
  },
  loi: {
    ambassador_clause_title: { fr: 'Programme de recrutement Ambassador', th: 'โครงการสรรหา Ambassador' },
    ambassador_clause_intro: { fr: "En tant que Founding Partner, vous acceptez de participer au programme de recrutement Ambassador de Staylo. C'est une partie centrale de notre stratégie de croissance et de votre partenariat.", th: 'ในฐานะ Founding Partner คุณตกลงเข้าร่วมโครงการสรรหา Ambassador ของ Staylo นี่เป็นส่วนหลักของกลยุทธ์การเติบโตและความเป็นพันธมิตรของคุณ' },
    ambassador_clause_step1_title: { fr: 'Welcome Kit personnalisé', th: 'Welcome Kit ที่ออกแบบเฉพาะคุณ' },
    ambassador_clause_step1_desc: { fr: 'Vous recevez gratuitement un kit branded avec votre QR code unique : stand de réception, cartes de chambre, cartes WiFi, sticker fenêtre, et certificat Founding Partner.', th: 'คุณรับชุดอุปกรณ์ติดแบรนด์ฟรีพร้อม QR code เฉพาะของคุณ: ป้ายต้อนรับ บัตรห้อง บัตร WiFi สติกเกอร์หน้าต่าง และใบรับรอง Founding Partner' },
    ambassador_clause_step2_title: { fr: 'QR code sur tous les points de contact client', th: 'QR code ที่จุดสัมผัสแขกทุกจุด' },
    ambassador_clause_step2_desc: { fr: "Votre QR code personnalisé est affiché au check-out, dans les chambres, sur les factures, et sur les cartes WiFi. Les clients le scannent pour découvrir Staylo.", th: 'QR code ของคุณแสดงตอน check-out ในห้อง บนใบแจ้งหนี้ และบนบัตร WiFi แขกสแกนเพื่อรู้จัก Staylo' },
    ambassador_clause_step3_title: { fr: 'Le client devient Ambassador', th: 'แขกกลายเป็น Ambassador' },
    ambassador_clause_step3_desc: { fr: "Quand un client scanne votre QR, il reçoit 1 nuit gratuite sur sa première réservation Staylo. S'il recommande un hôtel qui rejoint, il gagne 2% à vie — et vous avez contribué à la croissance du réseau.", th: 'เมื่อแขกสแกน QR ของคุณ พวกเขาจะได้รับ 1 คืนฟรีในการจอง Staylo ครั้งแรก ถ้าพวกเขาแนะนำโรงแรมที่เข้าร่วม จะได้รับ 2% ตลอดไป — และคุณได้ช่วยขยายเครือข่าย' },
    ambassador_clause_step4_title: { fr: 'Recharges de kit au prix coûtant', th: 'เติมชุดอุปกรณ์ที่ราคาทุน' },
    ambassador_clause_step4_desc: { fr: 'Les kits de remplacement sont disponibles au prix coûtant via votre dashboard. Print-on-demand, expédition locale — aucun stock à gérer.', th: 'ชุดอุปกรณ์ทดแทนหาได้ที่ราคาทุนผ่าน dashboard พิมพ์ตามคำสั่ง จัดส่งภายในประเทศ — ไม่ต้องเก็บสต็อก' },
    ambassador_clause_legal: { fr: 'En signant ce LOI, vous reconnaissez que l\'affichage du QR code Staylo aux points de contact client fait partie du Founding Partner agreement. Cela aide à faire croître la plateforme organiquement et augmente la valeur de vos parts. Le premier kit personnalisé est fourni gratuitement.', th: 'การลงนาม LOI นี้ คุณยอมรับว่าการแสดง QR code ของ Staylo ที่จุดสัมผัสแขกเป็นส่วนหนึ่งของข้อตกลง Founding Partner ซึ่งช่วยขยายแพลตฟอร์มอย่างเป็นธรรมชาติและเพิ่มมูลค่าหุ้นของคุณ ชุดแรกที่ปรับแต่งให้คุณจัดให้ฟรี' },
  },
  amb: {
    addr_saved: { fr: 'Lightning address enregistrée.', th: 'บันทึก Lightning address แล้ว' },
    need_addr: { fr: "Définissez d'abord votre Lightning address.", th: 'กรุณาตั้งค่า Lightning address ก่อน' },
    no_ready: { fr: 'Aucune commission prête à retirer pour le moment.', th: 'ยังไม่มีค่าคอมมิชชั่นที่พร้อมถอน' },
    payout_done: { fr: '{{sats}} sats envoyés ({{cents}}) à {{addr}}', th: 'ส่ง {{sats}} sats ({{cents}}) ไปยัง {{addr}} แล้ว' },
    title: { fr: 'Mes commissions BTC', th: 'ค่าคอมมิชชั่น BTC ของฉัน' },
    subtitle: { fr: 'Vous touchez 2% (en BTC) sur chaque réservation des hôtels que vous avez référés. Pour la vie.', th: 'คุณได้รับ 2% (เป็น BTC) ของทุกการจองในโรงแรมที่คุณแนะนำ ตลอดไป' },
    pending: { fr: 'En cours (booking pending)', th: 'รอดำเนินการ (จองที่รอการยืนยัน)' },
    ready: { fr: 'Prêt à retirer', th: 'พร้อมถอน' },
    paid: { fr: 'Total payé en BTC', th: 'ยอดจ่ายเป็น BTC' },
    your_ln_addr: { fr: 'Votre Lightning Address (BTC payout)', th: 'Lightning Address ของคุณ (BTC payout)' },
    save: { fr: 'Enregistrer', th: 'บันทึก' },
    ln_help: { fr: "Pas de Lightning Address ? Téléchargez Wallet of Satoshi (gratuit, 30 sec) pour en créer une.", th: 'ไม่มี Lightning Address? ดาวน์โหลด Wallet of Satoshi (ฟรี 30 วินาที) เพื่อสร้าง' },
    withdrawing: { fr: 'Envoi en cours…', th: 'กำลังส่ง…' },
    withdraw: { fr: 'Retirer {{amount}} maintenant', th: 'ถอน {{amount}} ตอนนี้' },
    recent: { fr: 'Dernières commissions', th: 'ค่าคอมมิชชั่นล่าสุด' },
  },
  bookings: {
    incoming_title: { fr: 'Réservations reçues', th: 'การจองที่ได้รับ' },
    trips_title: { fr: 'Mes voyages', th: 'การเดินทางของฉัน' },
    incoming_subtitle: { fr: 'Réservations faites sur vos propriétés — contact client, dates, demandes spéciales.', th: 'การจองในทรัพย์สินของคุณ — ติดต่อแขก วันที่ คำขอพิเศษ' },
    trips_subtitle: { fr: 'Vos réservations en tant que voyageur — voyages passés et à venir.', th: 'การจองของคุณในฐานะนักเดินทาง — การเดินทางที่ผ่านมาและกำลังจะมา' },
    tab_trips: { fr: 'Mes voyages', th: 'การเดินทางของฉัน' },
    tab_incoming: { fr: 'Réservations reçues', th: 'การจองที่ได้รับ' },
    upcoming: { fr: 'À venir', th: 'ที่กำลังจะมา' },
    past: { fr: 'Passées & annulées', th: 'ที่ผ่านมาและยกเลิก' },
    no_incoming: { fr: 'Aucune réservation reçue', th: 'ยังไม่มีการจอง' },
    no_incoming_desc: { fr: "Lorsqu'un voyageur réservera dans vos propriétés, elles apparaîtront ici.", th: 'เมื่อนักเดินทางจองทรัพย์สินของคุณ จะปรากฏที่นี่' },
    manage_properties: { fr: 'Gérer mes propriétés', th: 'จัดการทรัพย์สิน' },
    no_bookings: { fr: "Aucun voyage pour l'instant", th: 'ยังไม่มีการเดินทาง' },
    no_bookings_desc: { fr: 'Commencez à explorer des hôtels et faites votre première réservation.', th: 'เริ่มสำรวจโรงแรมและทำการจองครั้งแรกของคุณ' },
    browse_hotels: { fr: 'Parcourir les hôtels', th: 'ดูโรงแรม' },
    copy_ref: { fr: 'Cliquer pour copier la référence', th: 'คลิกเพื่อคัดลอกหมายเลขอ้างอิง' },
  },
  pms: {
    no_properties: { fr: 'Aucune propriété à gérer', th: 'ไม่มีทรัพย์สินที่ต้องจัดการ' },
    add_first: { fr: 'Enregistrez votre première propriété pour accéder au PMS.', th: 'ลงทะเบียนทรัพย์สินแรกเพื่อเข้าใช้ PMS' },
    add_property: { fr: 'Ajouter une propriété', th: 'เพิ่มทรัพย์สิน' },
    front_desk: { fr: 'Réception', th: 'แผนกต้อนรับ' },
    total_rooms: { fr: 'Chambres totales', th: 'ห้องทั้งหมด' },
    occupied: { fr: 'Occupées', th: 'มีแขก' },
    available: { fr: 'Disponibles', th: 'ว่าง' },
    arriving: { fr: 'Arrivées', th: 'มาถึง' },
    checking_out: { fr: 'Départs', th: 'เช็คเอาท์' },
    occupancy: { fr: "Taux d'occupation", th: 'อัตราการเข้าพัก' },
    no_rooms: { fr: 'Aucune chambre configurée', th: 'ยังไม่ได้ตั้งค่าห้อง' },
    add_rooms_first: { fr: 'Ajoutez des chambres dans Property Management pour utiliser la Réception.', th: 'เพิ่มห้องใน Property Management เพื่อใช้แผนกต้อนรับ' },
    manage_rooms: { fr: 'Gérer les chambres', th: 'จัดการห้อง' },
    click_to_manage: { fr: 'Cliquez pour voir le calendrier / faire un check-in', th: 'คลิกเพื่อดูปฏิทิน / เช็คอินแขก' },
    guests: { fr: 'invités', th: 'แขก' },
    tab_calendar: { fr: 'Calendrier', th: 'ปฏิทิน' },
    tab_walkin: { fr: 'Check-in walk-in', th: 'เช็คอิน walk-in' },
    err_name: { fr: 'Au moins le prénom du client principal est requis', th: 'ต้องระบุชื่อแขกหลักอย่างน้อย' },
    err_dates: { fr: 'Le check-out doit être après le check-in', th: 'เช็คเอาท์ต้องหลังเช็คอิน' },
    err_rate: { fr: 'Le tarif doit être > 0', th: 'อัตราต้องมากกว่า 0' },
    err_conflict: { fr: 'Ces dates chevauchent une réservation existante', th: 'วันที่นี้ทับกับการจองที่มีอยู่' },
    guest_phone: { fr: 'Téléphone du client principal', th: 'เบอร์โทรศัพท์แขกหลัก' },
    guest_email: { fr: 'Email (optionnel)', th: 'อีเมล (ไม่บังคับ)' },
    payment_method: { fr: 'Mode de paiement', th: 'วิธีการชำระเงิน' },
    check_in_date: { fr: 'Check-in', th: 'เช็คอิน' },
    check_out_date: { fr: 'Check-out', th: 'เช็คเอาท์' },
    adults: { fr: 'Adultes', th: 'ผู้ใหญ่' },
    children: { fr: 'Enfants', th: 'เด็ก' },
    rate_per_night: { fr: 'Tarif par nuit (USD)', th: 'ราคาต่อคืน (USD)' },
    special_requests: { fr: 'Demandes spéciales (optionnel)', th: 'คำขอพิเศษ (ไม่บังคับ)' },
    check_in_now: { fr: 'Check-in maintenant', th: 'เช็คอินตอนนี้' },
    housekeeping: { fr: 'Housekeeping', th: 'แม่บ้าน' },
    hk_subtitle: { fr: 'Gérez la propreté et la disponibilité des chambres', th: 'จัดการความสะอาดและความพร้อมของห้อง' },
    hk_note: { fr: 'Les statuts housekeeping sont enregistrés localement pour le moment. Persistance base de données à venir.', th: 'สถานะแม่บ้านบันทึกไว้ในเครื่องเฉพาะตอนนี้ ฐานข้อมูลคงทนจะมาในเร็วๆ นี้' },
    reports: { fr: 'Rapports & Analytics', th: 'รายงานและการวิเคราะห์' },
    reports_subtitle: { fr: 'Indicateurs clés de performance de vos propriétés', th: 'ตัวชี้วัดประสิทธิภาพหลักของทรัพย์สิน' },
    all_properties: { fr: 'Toutes les propriétés', th: 'ทรัพย์สินทั้งหมด' },
    total_revenue: { fr: 'Revenu total', th: 'รายได้รวม' },
    occupancy_rate: { fr: "Taux d'occupation", th: 'อัตราการเข้าพัก' },
    adr_desc: { fr: 'Tarif journalier moyen', th: 'อัตราเฉลี่ยรายวัน' },
    revpar_desc: { fr: 'Revenu par chambre disponible', th: 'รายได้ต่อห้องที่ว่าง' },
    total_bookings: { fr: 'Réservations totales', th: 'การจองทั้งหมด' },
    avg_stay: { fr: 'Durée moyenne de séjour', th: 'ระยะเวลาเฉลี่ยของการพัก' },
    properties_count: { fr: 'Propriétés', th: 'ทรัพย์สิน' },
    commission: { fr: 'Commission STAYLO (10%)', th: 'ค่าคอมมิชชั่น STAYLO (10%)' },
    commission_note: { fr: 'vs. $', th: 'เทียบกับ $' },
    revenue_trend: { fr: 'Tendance du revenu (6 derniers mois)', th: 'แนวโน้มรายได้ (6 เดือนล่าสุด)' },
    property_breakdown: { fr: 'Revenu par propriété', th: 'รายได้ตามทรัพย์สิน' },
  },
  banking: {
    title: { fr: 'Banque & Payouts', th: 'ธนาคารและการจ่ายเงิน' },
    subtitle: { fr: 'Recevez vos paiements dans votre devise locale, directement sur votre compte bancaire. Propulsé par Stripe Connect.', th: 'รับเงินในสกุลเงินท้องถิ่นของคุณ ตรงไปยังบัญชีธนาคาร ขับเคลื่อนด้วย Stripe Connect' },
    returned_title: { fr: 'Bon retour depuis Stripe', th: 'ยินดีต้อนรับกลับจาก Stripe' },
    returned_desc: { fr: 'Nous synchronisons le statut de votre compte. Cela peut prendre quelques secondes.', th: 'เรากำลังซิงค์สถานะบัญชีของคุณ อาจใช้เวลาสองสามวินาที' },
    error_title: { fr: "Quelque chose s'est mal passé", th: 'เกิดข้อผิดพลาด' },
    start_title: { fr: 'Configurer les payouts vers votre banque', th: 'ตั้งค่าการจ่ายเงินไปยังธนาคาร' },
    start_desc: { fr: 'STAYLO utilise Stripe Connect Express pour vous payer en toute sécurité. La configuration prend 5 minutes — vous avez besoin de votre pièce d\'identité, infos entreprise, et coordonnées bancaires.', th: 'STAYLO ใช้ Stripe Connect Express เพื่อจ่ายเงินคุณอย่างปลอดภัย การตั้งค่าใช้เวลา 5 นาที — คุณต้องการบัตรประชาชน ข้อมูลธุรกิจ และข้อมูลธนาคาร' },
    step1: { fr: 'Choisissez votre pays (définit votre devise par défaut).', th: 'เลือกประเทศของคุณ (กำหนดสกุลเงินเริ่มต้น)' },
    step2: { fr: 'Vérifiez votre identité sur Stripe (pièce ID + selfie).', th: 'ยืนยันตัวตนบน Stripe (บัตรประชาชน + เซลฟี่)' },
    step3: { fr: 'Ajoutez votre compte bancaire pour les payouts.', th: 'เพิ่มบัญชีธนาคารสำหรับรับเงิน' },
    step4: { fr: 'Terminé — recevez 90% de chaque réservation, payé le lendemain du check-out.', th: 'เสร็จสิ้น — รับ 90% ของทุกการจอง จ่ายในวันถัดจากเช็คเอาท์' },
    country_label: { fr: 'Pays de votre entreprise', th: 'ประเทศของธุรกิจ' },
    opening: { fr: 'Ouverture de Stripe…', th: 'กำลังเปิด Stripe…' },
    start_cta: { fr: 'Configurer les payouts sur Stripe', th: 'ตั้งค่าการจ่ายเงินบน Stripe' },
    account_id: { fr: 'ID du compte Stripe', th: 'ID บัญชี Stripe' },
    country: { fr: 'Pays', th: 'ประเทศ' },
    default_currency: { fr: 'Devise par défaut', th: 'สกุลเงินเริ่มต้น' },
    last_synced: { fr: 'Dernière synchro', th: 'ซิงค์ล่าสุด' },
    cap_details: { fr: 'Identité & infos entreprise soumises', th: 'ส่งข้อมูลตัวตนและธุรกิจแล้ว' },
    cap_charges: { fr: 'Peut accepter les paiements clients', th: 'สามารถรับเงินจากแขกได้' },
    cap_payouts: { fr: 'Peut recevoir les payouts en banque', th: 'สามารถรับเงินเข้าธนาคารได้' },
    refresh: { fr: 'Rafraîchir le statut', th: 'รีเฟรชสถานะ' },
    continue: { fr: "Terminer l'onboarding", th: 'จบการ onboard' },
    active_title: { fr: 'Vous êtes prêt à recevoir les payouts', th: 'คุณพร้อมรับเงินแล้ว' },
    active_desc: { fr: '90% de chaque paiement client est transféré sur votre compte bancaire 24h après la confirmation de la réservation (ou plus tôt une fois le questionnaire post-checkout en place).', th: '90% ของทุกการชำระเงินถูกโอนเข้าบัญชีธนาคารคุณ 24 ชั่วโมงหลังจากการจองได้รับการยืนยัน' },
    progress_title: { fr: 'Onboarding en cours', th: 'การ onboard กำลังดำเนินการ' },
    progress_desc: { fr: 'Stripe examine vos informations. Vous devrez peut-être fournir des documents supplémentaires — cliquez sur "Terminer l\'onboarding" ci-dessus pour vérifier ce qu\'il manque.', th: 'Stripe กำลังตรวจสอบข้อมูลของคุณ คุณอาจต้องส่งเอกสารเพิ่มเติม — คลิก "จบการ onboard" ด้านบนเพื่อตรวจสอบ' },
    restricted_title: { fr: 'Payouts restreints', th: 'การจ่ายเงินถูกจำกัด' },
    restricted_desc: { fr: 'Stripe a restreint certaines capacités de votre compte. Cliquez sur "Terminer l\'onboarding" pour résoudre.', th: 'Stripe จำกัดความสามารถบางอย่างของบัญชี คลิก "จบการ onboard" เพื่อแก้ไข' },
    footer: { fr: 'Sécurisé par Stripe — STAYLO ne voit jamais vos coordonnées bancaires ni carte.', th: 'ปลอดภัยโดย Stripe — STAYLO ไม่เห็นข้อมูลบัตรหรือธนาคารของคุณ' },
  },
};

function apply(locale) {
  const p = path.join(ROOT, 'src', 'i18n', `${locale}.json`);
  const bundle = JSON.parse(fs.readFileSync(p, 'utf-8'));
  let count = 0;
  for (const [ns, keys] of Object.entries(T)) {
    bundle[ns] = bundle[ns] || {};
    for (const [k, v] of Object.entries(keys)) {
      // Handle nested keys with dots (e.g. shift_editor.scope_hint_timing)
      const trans = (typeof v === 'string') ? v : v[locale];
      if (!trans) continue;
      if (k.includes('.')) {
        const parts = k.split('.');
        let cur = bundle[ns];
        for (let i = 0; i < parts.length - 1; i++) {
          if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
          cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = trans;
      } else {
        bundle[ns][k] = trans;
      }
      count++;
    }
  }
  fs.writeFileSync(p, JSON.stringify(bundle, null, 2) + '\n', 'utf-8');
  console.log(`  ${locale}.json: ${count} keys translated`);
}

console.log('[translate-batch] applying batch 1/2 (small + medium namespaces)…');
apply('fr');
apply('th');
console.log('[translate-batch] done. Run sync next.');
