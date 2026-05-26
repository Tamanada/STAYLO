#!/usr/bin/env node
/**
 * Build pitch-hotelier.html — a hotelier-only variant of pitch.html.
 *
 * The full pitch.html (13 slides) is investor-aware. This variant
 * strips the investor slides (Alpha $1K, Cap table, $STAY token,
 * Phase Roadmap) and rewrites the close to omit any mention of
 * share price. Audience: hoteliers who want to use the platform,
 * not fund it. Typical use: first contact meetings where the
 * conversation is about "should I list my hotel on STAYLO", not
 * "should I buy founding shares".
 *
 * Source slides kept (from pitch.html, in new order):
 *   1. Cover (Stop paying 18%)
 *   2. Pain (OTA bleed)
 *   3. 10% commission locked
 *   4. STAYLO Ship (free toolkit)
 *   5. 1 property = 1 vote (governance protection)
 *   6. Built with hoteliers (the shift)
 *   7. Threshold 500 + Full Moon + ambassador flywheel
 *
 * Source slides DROPPED (investor-only):
 *   - 8.  Alpha share $1,000
 *   - 9.  Cap table
 *   - 10. $STAY token
 *   - 11. Phase roadmap
 *
 * New slides:
 *   8. CLOSE — "List your hotel today" (rewritten, no share-price mention)
 *   9. QR contact (copied from pitch.html slide 13, lightly adjusted)
 *
 * Strategy: parse pitch.html, slice out [1..7] sections, replace
 * the close+QR with new content, renumber to 1..9, write to
 * public/pitch-hotelier.html.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'public', 'pitch.html');
const OUT = path.resolve(__dirname, '..', 'public', 'pitch-hotelier.html');

function findSections(src) {
  const sections = [];
  const startRe = /<section class="slide[^"]*" data-slide="(\d+)">/g;
  let m;
  while ((m = startRe.exec(src)) !== null) {
    const num = parseInt(m[1], 10);
    const start = m.index;
    let depth = 1;
    let pos = startRe.lastIndex;
    const openRe = /<section\b/g;
    const closeRe = /<\/section>/g;
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    while (depth > 0) {
      const o = openRe.exec(src);
      const c = closeRe.exec(src);
      if (!c) throw new Error('Unbalanced <section> for slide ' + num);
      if (o && o.index < c.index) {
        depth++;
        closeRe.lastIndex = o.index + 1;
      } else {
        depth--;
        pos = c.index + '</section>'.length;
        openRe.lastIndex = pos;
        closeRe.lastIndex = pos;
      }
    }
    sections.push({ num, start, end: pos, text: src.slice(start, pos) });
    startRe.lastIndex = pos;
  }
  return sections;
}

function buildNewClose() {
  return `<section class="slide slide-dark slide-close" data-slide="8">
  <div class="brand">
    <div class="brand-mark" style="background:rgba(255,255,255,0.15);">S</div>
    <span class="brand-name" style="color:white; background:none;">STAYLO</span>
  </div>

  <div class="content" style="padding-top:84px;">
    <div class="label en" style="color:rgba(255,255,255,0.5);">List your hotel today</div>
    <div class="label th" style="color:rgba(255,255,255,0.5);">ลงทะเบียนโรงแรมของคุณวันนี้</div>

    <h1 class="md en" style="color:white;">Three steps. <span class="grad-text">No money today.</span></h1>
    <h1 class="md th" style="color:white;">สามขั้นตอน <span class="grad-text">ไม่ต้องจ่ายวันนี้</span></h1>

    <div class="close-steps" style="display:grid; grid-template-columns:repeat(3,1fr); gap:24px; margin-top:36px;">

      <div class="close-step" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:14px; padding:24px 24px 22px;">
        <div style="font-size:13px; font-weight:800; letter-spacing:1.6px; text-transform:uppercase; color:#FF6B00; margin-bottom:10px;">Step 1</div>
        <div class="close-step-title en" style="font-size:22px; font-weight:800; color:white;">List your hotel</div>
        <div class="close-step-title th" style="font-size:22px; font-weight:800; color:white;">ลงทะเบียนโรงแรม</div>
        <div class="close-step-body en" style="font-size:16px; color:rgba(255,255,255,0.65); margin-top:10px; line-height:1.5;">15 minutes on staylo.app. Photos, rooms, rates. Your "Founding Member" badge appears the same day.</div>
        <div class="close-step-body th" style="font-size:16px; color:rgba(255,255,255,0.65); margin-top:10px; line-height:1.5;">15 นาทีบน staylo.app รูปภาพ ห้อง ราคา ตราสัญลักษณ์ "Founding Member" ปรากฏในวันเดียวกัน</div>
      </div>

      <div class="close-step" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:14px; padding:24px 24px 22px;">
        <div style="font-size:13px; font-weight:800; letter-spacing:1.6px; text-transform:uppercase; color:#FF1F70; margin-bottom:10px;">Step 2</div>
        <div class="close-step-title en" style="font-size:22px; font-weight:800; color:white;">Open STAYLO Ship</div>
        <div class="close-step-title th" style="font-size:22px; font-weight:800; color:white;">เปิดใช้ STAYLO Ship</div>
        <div class="close-step-body en" style="font-size:16px; color:rgba(255,255,255,0.65); margin-top:10px; line-height:1.5;">The full operational app — HR, schedule, tasks, fiches, booking, guest bridge. Free for life. Onboard your team in an afternoon.</div>
        <div class="close-step-body th" style="font-size:16px; color:rgba(255,255,255,0.65); margin-top:10px; line-height:1.5;">แอปปฏิบัติการเต็มรูปแบบ — HR ตารางงาน คู่มือ จอง สะพานแขก ฟรีตลอดชีพ ฝึกอบรมทีมในบ่ายเดียว</div>
      </div>

      <div class="close-step" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:14px; padding:24px 24px 22px;">
        <div style="font-size:13px; font-weight:800; letter-spacing:1.6px; text-transform:uppercase; color:#7E22CE; margin-bottom:10px;">Step 3</div>
        <div class="close-step-title en" style="font-size:22px; font-weight:800; color:white;">Refer 3 hotels</div>
        <div class="close-step-title th" style="font-size:22px; font-weight:800; color:white;">แนะนำ 3 โรงแรม</div>
        <div class="close-step-body en" style="font-size:16px; color:rgba(255,255,255,0.65); margin-top:10px; line-height:1.5;">Each hotel you bring in earns you <strong style="color:white;">2% of their bookings in BTC — for life</strong>. Three hotels = passive income that compounds.</div>
        <div class="close-step-body th" style="font-size:16px; color:rgba(255,255,255,0.65); margin-top:10px; line-height:1.5;">ทุกโรงแรมที่คุณชวนเข้ามาได้รับ <strong style="color:white;">2% ของการจองเป็น BTC ตลอดชีพ</strong> สามโรงแรม = รายได้เชิงรับที่ทบต้น</div>
      </div>

    </div>

    <div class="close-urgency" style="margin-top:32px; padding:18px 24px; background:rgba(255,107,0,0.10); border:1px solid rgba(255,107,0,0.30); border-radius:12px;">
      <span class="en" style="font-size:16px; color:rgba(255,255,255,0.85); line-height:1.55;">No fee to list. No subscription. <strong style="color:#FF6B00;">10% commission locked for life</strong> by cooperative constitution — requires a 90% vote of members to change. Start saving on day one of platform launch.</span>
      <span class="th" style="font-size:16px; color:rgba(255,255,255,0.85); line-height:1.55;">ไม่มีค่าลงทะเบียน ไม่มีค่าสมาชิก <strong style="color:#FF6B00;">ค่าคอม 10% ล็อคตลอดชีพ</strong> ตามรัฐธรรมนูญสหกรณ์ — ต้องใช้เสียงโหวต 90% ของสมาชิกเพื่อเปลี่ยน เริ่มประหยัดตั้งแต่วันแรกที่แพลตฟอร์มเปิดตัว</span>
    </div>
  </div>

  <div class="footer-url"><a href="https://staylo.app" style="color:rgba(255,255,255,0.35);">staylo.app</a></div>
  <div class="slide-num" style="color:rgba(255,255,255,0.3);">8 / 9</div>
</section>`;
}

function adjustQrSlide(qrText) {
  // Update slide-num to 9/9, keep all content intact.
  return qrText
    .replace(/data-slide="\d+"/, 'data-slide="9"')
    .replace(
      /(<div class="slide-num"[^>]*>)\s*\d+\s*\/\s*\d+\s*(<\/div>)/,
      '$1 9 / 9 $2'
    );
}

function adjustKeptSlide(text, newNum, total) {
  return text
    .replace(/data-slide="\d+"/, `data-slide="${newNum}"`)
    .replace(
      /(<div class="slide-num"[^>]*>)\s*\d+\s*\/\s*\d+\s*(<\/div>)/g,
      `$1${newNum} / ${total}$2`
    );
}

function updateMetaForHotelier(src) {
  // Update <title>
  src = src.replace(
    /<title>[^<]*<\/title>/,
    '<title>STAYLO — List your hotel · Hotelier brief</title>'
  );
  // Update nav counter default text from "1 / 13" → "1 / 9"
  src = src.replace(
    /(<span class="ctrl-counter" id="counter">)\s*1\s*\/\s*\d+\s*(<\/span>)/,
    '$11 / 9$2'
  );
  return src;
}

function rewriteFooterResources(src) {
  // The Resources footer in pitch.html lists 6 cards. For the hotelier
  // variant, swap to a simpler 3-card footer pointing at: the 1-pager,
  // the full pitch (for serious investors), and STAYLO Ship (the app).
  const footerRegex = /<footer[\s\S]*?<\/footer>/;
  const newFooter = `<footer style="background:#1A1A2E; color:white; padding:48px 64px 64px; font-family:var(--font-main);">
  <div style="max-width:1280px; margin:0 auto;">

    <div style="font-size:13px; font-weight:800; letter-spacing:2px; text-transform:uppercase; color:#FF6B00; margin-bottom:8px;">
      <span class="en">Resources for hoteliers</span>
      <span class="th">เอกสารสำหรับโรงแรม</span>
    </div>
    <h2 style="font-size:34px; font-weight:800; margin-bottom:6px; letter-spacing:-1px;">
      <span class="en">Take it home. Decide on your own time.</span>
      <span class="th">นำกลับบ้าน ตัดสินใจตามเวลาของคุณ</span>
    </h2>
    <p style="font-size:17px; color:rgba(255,255,255,0.6); margin-bottom:32px; max-width:680px;">
      <span class="en">Everything you need to evaluate STAYLO at your own pace. No pressure.</span>
      <span class="th">ทุกอย่างที่คุณต้องใช้เพื่อพิจารณา STAYLO ตามจังหวะของคุณ ไม่กดดัน</span>
    </p>

    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:16px;">

      <a href="/pitch/one-pager.html" target="_blank" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:22px 24px; text-decoration:none; color:white;">
        <div style="font-size:11px; font-weight:800; letter-spacing:1.6px; text-transform:uppercase; color:#FF6B00; margin-bottom:6px;">📄 One-pager A4</div>
        <div style="font-size:19px; font-weight:800; margin-bottom:4px;"><span class="en">STAYLO at a glance</span><span class="th">STAYLO โดยย่อ</span></div>
        <div style="font-size:14px; color:rgba(255,255,255,0.6); line-height:1.4;"><span class="en">Print, share, hand to your team · EN / FR / TH</span><span class="th">พิมพ์ แชร์ แจกทีมงาน · EN / FR / TH</span></div>
      </a>

      <a href="/messenger.html" target="_blank" style="background:linear-gradient(135deg, rgba(255,31,112,0.10), rgba(126,34,206,0.10)); border:1px solid rgba(255,31,112,0.35); border-radius:12px; padding:22px 24px; text-decoration:none; color:white;">
        <div style="font-size:11px; font-weight:800; letter-spacing:1.6px; text-transform:uppercase; color:#FF1F70; margin-bottom:6px;">🚢 Try STAYLO Ship</div>
        <div style="font-size:19px; font-weight:800; margin-bottom:4px;"><span class="en">The operational app · live demo</span><span class="th">แอปปฏิบัติการ · เดโมจริง</span></div>
        <div style="font-size:14px; color:rgba(255,255,255,0.6); line-height:1.4;"><span class="en">HR · Schedule · Tasks · Booking · Guest bridge</span><span class="th">HR · ตารางงาน · งาน · จอง · สะพานแขก</span></div>
      </a>

      <a href="/pitch.html" target="_blank" style="background:linear-gradient(135deg, rgba(255,107,0,0.10), rgba(126,34,206,0.10)); border:1px solid rgba(255,107,0,0.35); border-radius:12px; padding:22px 24px; text-decoration:none; color:white;">
        <div style="font-size:11px; font-weight:800; letter-spacing:1.6px; text-transform:uppercase; color:#7E22CE; margin-bottom:6px;">💼 Want to invest?</div>
        <div style="font-size:19px; font-weight:800; margin-bottom:4px;"><span class="en">Founding Partner pitch</span><span class="th">การนำเสนอ Founding Partner</span></div>
        <div style="font-size:14px; color:rgba(255,255,255,0.6); line-height:1.4;"><span class="en">13 slides · cap table · token · roadmap · Alpha share $1,000</span><span class="th">13 สไลด์ · cap table · โทเค็น · roadmap · หุ้น Alpha $1,000</span></div>
      </a>

    </div>

    <div style="margin-top:36px; padding-top:24px; border-top:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; font-size:14px; color:rgba(255,255,255,0.55);">
      <div>
        <span class="en">Built with hoteliers, for hoteliers · Koh Phangan, Thailand</span>
        <span class="th">สร้างกับเจ้าของโรงแรม เพื่อเจ้าของโรงแรม · เกาะพะงัน ประเทศไทย</span>
      </div>
      <div style="font-family:'Courier New',monospace; font-size:13px;">
        contact@staylo.app · staylo.app
      </div>
    </div>

  </div>
</footer>`;
  return src.replace(footerRegex, newFooter);
}

function main() {
  let src = fs.readFileSync(SRC, 'utf8');
  const sections = findSections(src);

  if (sections.length !== 13) {
    throw new Error(`Source has ${sections.length} sections, expected 13`);
  }

  // Sections to keep from pitch.html (in DOM order — 1..7)
  const keptOldNums = [1, 2, 3, 4, 5, 6, 7];
  const byNum = Object.fromEntries(sections.map(s => [s.num, s]));

  // Rewrite kept slides with new numbering (1..7 of 9 total)
  const keptOut = keptOldNums.map((oldNum, idx) => {
    const newNum = idx + 1;
    return adjustKeptSlide(byNum[oldNum].text, newNum, 9);
  });

  // Build new close slide (8 of 9)
  const closeOut = buildNewClose();

  // Adjust QR slide from source (was slide 13) → becomes 9 of 9
  const qrOut = adjustQrSlide(byNum[13].text);

  // Stitch back into the document
  const header = src.slice(0, sections[0].start);
  const lastEnd = Math.max(...sections.map(s => s.end));
  let footer = src.slice(lastEnd);

  // Drop the local backup/test sections from the original between
  // slide 7 end and slide 13 start. We don't include slides 8..12.
  // Since we're rebuilding the section block entirely, footer starts
  // after the last section. So we keep everything after lastEnd.

  const SECTION_TITLES = [
    'COVER — Stop paying 18% to Booking',
    'PAIN — OTA commission bleed',
    '10% COMMISSION LOCKED — your savings',
    'STAYLO SHIP — free operational toolkit',
    '1 PROPERTY = 1 VOTE — your protection',
    'THE SHIFT — built with hoteliers',
    'THRESHOLD 500 — launch + ambassador flywheel',
    'CLOSE — list your hotel today',
    'QR / CONTACT',
  ];

  const allSections = [...keptOut, closeOut, qrOut];
  const stitched = allSections
    .map((s, i) => {
      const banner =
        '<!-- ================================================================\n' +
        `     SLIDE ${i + 1} — ${SECTION_TITLES[i]}\n` +
        '     ================================================================ -->';
      return banner + '\n' + s;
    })
    .join('\n\n');

  let out = header + stitched + footer;

  // Update meta + nav counter
  out = updateMetaForHotelier(out);

  // Rewrite the resources footer for hotelier audience
  out = rewriteFooterResources(out);

  // Atomic write
  const tmp = OUT + '.tmp';
  fs.writeFileSync(tmp, out, 'utf8');
  fs.renameSync(tmp, OUT);

  // Verify
  const verify = fs.readFileSync(OUT, 'utf8');
  const dataSlides = [...verify.matchAll(/data-slide="(\d+)"/g)].map(x => parseInt(x[1]));
  console.log('pitch-hotelier.html data-slide sequence:', dataSlides.join(','));
  if (dataSlides.join(',') !== '1,2,3,4,5,6,7,8,9') {
    throw new Error('Verification FAILED — expected 1..9 in DOM order, got ' + dataSlides.join(','));
  }
  console.log('✓ public/pitch-hotelier.html written, 9 slides');
}

main();
