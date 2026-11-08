// DIỄN VIÊN — những sinh linh nhỏ làm thế giới "đang sống":
//  · mèo ngủ (linh vật, xuân/hạ): cuộn tròn trên bãi cỏ, thở, tai giật, chóp đuôi phẩy, "z" bay; mưa/cỏ ướt → trú hiên;
//    cùng một chỗ luôn là cùng một con (lông theo toạ độ), có hôm vắng (theo ngày), đôi khi có mèo con rúc sau lưng mẹ
//    (đuôi mẹ quấn qua), hoặc bướm đậu lưng. Mèo cuộn ~34 đơn vị ≈ 0.41 chiều cao cửa (84); lông theo vùng; nằm trong ổ cỏ
//    (+ vạt nắng khi nắng); hôm vắng ổ trống có chim sẻ mổ hạt.
//  · đom đóm đêm hè (cuối xuân) theo cụm, sát cỏ · bướm ngày xuân/hạ (vỗ – lướt – hạ xuống hoa) · chim đậu theo cặp
//    (sẻ / cò trắng / bồ câu / hải âu; con rỉa lông, con quay mặt ra) + đàn chim chữ V lúc rạng đông, chạng vạng
//  · đèn hoa đăng đêm rằm (cụm 2–3 + một chiếc trôi lẻ, giấy trong mờ, vệt phản chiếu, vũng sáng trên nước)
//  · khói bếp giờ nấu ăn & mùa đông (cụm dẹt xoay ngẫu nhiên, nghiêng theo gió, ăn sắc chiều).
// Thuần, tất định (ctx.rng/ctx.ph). Vật lặp dựng MỘT lần trong defs (<g id="ac-…">) rồi <use>; màu = biến bảng màu.
// LUẬT <use>: phần tử được <use> tham chiếu phải TĨNH (không class động, không style animation bên trong) — bản sao <use>
// có hoạt ảnh không lên compositor, cả cảnh vẽ lại mỗi khung; qua <use> lồng nhau thì đứng im. Phần động (thân thở, tai,
// chóp đuôi, đầu chim, cánh bướm, ngọn cỏ, thân đèn) tách thành def tĩnh riêng; class động đặt trên <g> bọc <use> TẠI CHỖ
// DÙNG (fill-box của <g> = khung của nội dung → tâm xoay giữ nguyên). Vật nhỏ dùng một lần (cú mèo, "z", ngọn lửa) viết thẳng.
import type { ActorsModule, Ctx, Piece, Spot } from './types'
import { LAYER_F, clamp, ground, n0 } from './util'

const f3 = (v: number) => String(Math.round(v * 1000) / 1000)
const wetSky = (ctx: Ctx) => ctx.cur.precip === 'phun' || ctx.cur.precip === 'mua' || ctx.cur.precip === 'mua-to'
const dayKey = (ctx: Ctx) => `${ctx.vn.y}-${ctx.vn.mo}-${ctx.vn.d}`
const spotKey = (s: Spot) => `${s.layer}:${n0(s.x)}:${n0(s.y)}`
const worldX = (s: Spot) => s.x / LAYER_F[s.layer]
const lite = (ctx: Ctx, n: number) => (ctx.detail === 'lite' ? Math.max(1, Math.round(n / 2)) : n)

type Acc = { pieces: Piece[]; defs: Map<string, string>; css: Map<string, string> }

// ───────────────────────── MÈO (thiết kế hệ ×≈6: dài 180 từ đuôi −92 tới mõm 88, bụng chạm y=0) ─────────────────────────
// Mèo là "nhân vật cảm xúc" của brief nên phải ĐỌC RA ngay cả khi nhỏ. Cỡ chỉ được nhích (brief nói "chú mèo nhỏ", và
// phép đo nội bộ giữ mèo/cửa ∈ [0.3, 0.45] tới s = 1.1) — độ đọc đến từ tương phản, không từ phóng to:
//  · bộ lông theo vùng, chọn theo nền (COAT): ấm/sáng trên cỏ vừa & gạch, mèo mun trên nền sáng; xám chỉ là con phụ
//  · nằm trong "ổ cỏ" sáng (cỏ rạp bóng) + vạt nắng ấm khi trời nắng → quầng sáng tách khối lưng khỏi nền
//  · viền sáng mép lưng/đầu đủ đậm để đọc ở 1600 px (ấm khi nắng)
//  · hôm mèo vắng (hoặc đi trú mưa): ổ cỏ trống còn vết lõm; trời khô ban ngày có đôi chim sẻ sà xuống mổ.
/** Tỉ lệ thiết kế → thế giới (s = 1): mèo dài CAT_LEN·CAT_K ≈ 34 đơn vị (≈ 0.41 cửa; s = 1.1 → 0.45 trần kiểm). */
export const CAT_K = 0.19
export const CAT_LEN = 180
/** Chỗ nằm do vùng đặt quá xa/nhỏ (s 0.5) không được nhỏ hơn mức này — dưới đó mèo chỉ còn là một chấm. */
const CAT_SMIN = 0.72
const CB = 'M-78 0C-90-30-66-72-30-73C2-74 30-58 42-38C48-26 50-12 48 0Z'
const CH = 'M26-24C26-44 42-56 58-56C76-56 88-42 88-28C88-12 76-4 58-4C40-4 26-10 26-24Z'
const CT = 'M-76-12C-92 4-50 10-10 8C14 7 28 6 36 2'
const EB = 'M33-40L36-66Q37-73 43-67L54-54Z'
const EF = 'M66-55L79-69Q84-73 85-66L87-42Z'
const GINGER = 'color-mix(in oklab,color-mix(in oklab,var(--x1),var(--p1) 35%),var(--e1) 46%)'
// Bộ lông: mướp cam · tam thể · xám mướp · đen trắng. Mặc định chung ở FUR0 (đặt lại trên MỌI con, kể cả mèo con
// lồng trong nhóm của mẹ — biến CSS kế thừa nên phải đặt lại đủ).
const FUR0 = '--bo:0;--co:0;--eo:0;--wo:0;--wb:0;--w:var(--w3);--wp:var(--a);--ea:var(--a);--y:var(--k1);--yo:.85;--rim:.3;--ie:.45'
const FUR = [
  `--a:${GINGER};--b:var(--x1);--bo:.85;--w:var(--w1);--wo:.85;--wb:.7;--wp:var(--w1);--rim:.34`,
  `--a:var(--w3);--c:${GINGER};--co:1;--e:var(--k1);--eo:.9;--ea:${GINGER};--rim:.2`,
  `--a:var(--s3);--b:var(--s4);--bo:.6;--w:var(--s1);--wo:.85;--wb:.6;--wp:var(--s1);--rim:.42`,
  // đen trắng: viền sáng mép lưng & đỉnh đầu, mi mắt sáng, lòng tai rõ — để khối đen vẫn đọc ra dáng mèo
  `--a:color-mix(in oklab,var(--k1),var(--s4) 22%);--wo:1;--wb:1;--wp:var(--w3);--y:var(--w3);--yo:.6;--rim:.7;--ie:.6`,
]
// Mỗi vùng có "con mèo của mình" (như nhân vật thường trú trong game indie): bộ lông chọn theo NỀN để khối mèo tách khỏi đất —
// lông sáng/ấm nơi nền xanh vừa hoặc gạch đỏ (bù màu, sáng hơn nền), mèo mun nơi nền sáng (đồng hoa, đỉnh vách) để tương phản sắc độ.
// Xám mướp (cùng sắc độ cỏ xanh vừa) chỉ làm con phụ. [x0 vùng (thế giới), lông chính, lông phụ] theo chỉ số FUR.
const COAT: [number, number, number][] = [
  [0, 1, 3], [1800, 1, 0], [3600, 0, 1], [5400, 0, 1], [7200, 1, 0], [9000, 0, 1], [10800, 0, 3], [12600, 1, 2], [14400, 3, 0], [16200, 3, 2],
]
const coatRow = (sp: Spot) => {
  const wx = worldX(sp)
  let row = COAT[0] as [number, number, number]
  for (const c of COAT) if (c[0] <= wx) row = c
  return row
}
/** Bộ lông của con mèo ở bãi `sp` (v = số ngẫu nhiên theo chỗ); `avoid` = lông con đã nằm cùng chỗ trú (tránh hai con y hệt). */
const coatOf = (sp: Spot, v: number, avoid?: number) => {
  const row = coatRow(sp)
  const fur = v < 0.78 ? row[1] : row[2]
  if (fur !== avoid) return fur
  return fur === row[1] ? row[2] : row[1] !== avoid ? row[1] : (fur + 1) % FUR.length
}
// Ngọn cỏ trước mèo: [x chân, y chân, cao, nghiêng, rộng] — chân so le, gom ở chân trước & phía đuôi.
const BLADES: [number, number, number, number, number][][] = [
  [[38, 10, 22, -5, 5], [62, 7, 17, 4, 4], [-90, 9, 19, -4, 5]],
  [[50, 13, 27, 2, 5], [-74, 6, 15, 5, 4]],
]
const blades = (list: [number, number, number, number, number][]) =>
  list.map(([x, y, h, l, w]) => `M${x} ${y}q${n0(l / 2)} ${-n0(h / 2)} ${l} ${-h}q${n0((w - l) / 2) + 1} ${n0(h / 2)} ${w - l} ${h}Z`).join('')
// Ổ cỏ: cỏ rạp thành bầu dục sáng hơn nền (lá cỏ nằm phản nắng), lòng ổ hơi lõm tối, mép ổ vài ngọn bị đè ngả ra ngoài.
const NEST_BLADES: [number, number, number, number, number][] = [
  [-124, 5, 15, -11, 5], [-108, 2, 11, -8, 4], [-60, -2, 8, -4, 4], [22, -2, 7, 3, 4], [104, 2, 13, 9, 5], [118, 6, 10, 9, 4],
]
const NEST_DEF =
  `<g id="ac-ns"><ellipse class="g1" opacity=".62" cx="-4" cy="3" rx="124" ry="15"/><ellipse class="k1" opacity=".1" cx="-6" cy="2" rx="88" ry="8"/>` +
  `<path class="hl" opacity=".5" d="M-112 0C-80-6 40-7 100-1C50-3-60-3-112 0Z"/><path class="g2" d="${blades(NEST_BLADES)}"/></g>`
// Vạt nắng (chỉ khi nắng thật): cỏ quanh ổ sáng & ấm lên một chút như chỗ nắng lọt — là CỎ được nắng, không phải quầng phát sáng.
const SUN_DEF =
  `<radialGradient id="ac-sp"><stop offset="0" style="stop-color:color-mix(in oklab,var(--g1),var(--e1) 30%)" stop-opacity=".5"/>` +
  `<stop offset=".5" style="stop-color:var(--g1)" stop-opacity=".26"/><stop offset="1" style="stop-color:var(--g1)" stop-opacity="0"/></radialGradient>` +
  `<ellipse id="ac-sn" cx="-6" cy="-8" rx="250" ry="52" fill="url(#ac-sp)"/>`
// Chim sẻ nâu đứng đất (sẻ nhà VN: mũ nâu hạt dẻ, má trắng chấm đen, lưng nâu, bụng nhạt) — chỉ dùng trên ổ mèo trống.
// Def TĨNH: thân (ac-sg) + đầu (ac-sgh); đầu động (.ac-hd) bọc ngoài tại chỗ dùng như chim đậu.
const SG_DEF =
  `<g id="ac-sg"><path class="b2" d="M-8-6L-18-2Q-18 0-16 0L-7-3Z"/><path class="d1" d="M-10-4C-9-11 0-14 6-11C10-9 10-3 4-1C-1 1-8 0-10-4Z"/>` +
  `<path class="w2" d="M-4-1C1 0 7-2 8-7C6-3 1-2-4-1Z"/><path class="b2" d="M-8-7C-3-11 3-11 4-8C0-5-5-5-8-7Z"/><path class="x1" opacity=".7" d="M-6-8l4-1M-1-9l3-.5"/>` +
  `<path class="ac-lg" d="M0-1v2M3-1v2"/></g>` +
  `<g id="ac-sgh"><circle class="w2" cx="6" cy="-12" r="4.4"/><path class="x1" d="M1.8-13.4A4.4 4.4 0 0 1 10.3-13Q6-15 1.8-13.4Z"/><circle class="k2" cx="5.4" cy="-11.4" r="1"/><path class="k2" d="M10-13l4 1.5-4 1.5Z"/></g>`

// Mèo tách thành các def TĨNH; mỗi con ghép lại tại chỗ dùng theo đúng thứ tự vẽ cũ:
//   bóng (ac-c0) · thân [.ac-br] (ac-cb) · đầu [.ac-hb] = tai trước [.ac-et] (ac-ce) + tai sau & mặt (ac-ch) · chân trước (ac-c1)
//   rồi (sau mèo con nếu có) đuôi (ac-tl) · chóp đuôi [.ac-tt] (ac-tp) · lớp đêm của đuôi (ac-tn) · ba chữ "z" · cỏ [sw3/sw1].
// Tai sau (x 33…54) và tai trước (x ≥ 62 kể cả lúc giật −18°) không chạm nhau nên vẽ tai trước trước tai sau vẫn y hệt.
function catDef(nt: boolean): string {
  return (
    `<radialGradient id="ac-ag"><stop offset="0" style="stop-color:var(--k1)" stop-opacity=".42"/><stop offset="1" style="stop-color:var(--k1)" stop-opacity="0"/></radialGradient>` +
    `<g id="ac-c0"><ellipse cx="-4" cy="2" rx="100" ry="12" fill="url(#ac-ag)"/><ellipse class="ao" cx="-12" cy="1" rx="72" ry="3"/></g>` +
    // thân (thở)
    `<g id="ac-cb"><path class="ac-a" d="${CB}"/>` +
    `<path class="ac-c" d="M-56-56C-44-72-12-76 0-64C-6-50-30-44-44-46C-52-47-58-50-56-56Z"/>` +
    `<path class="ac-e" d="M-82-20C-84-36-74-52-62-54C-58-40-60-24-70-12Z"/>` +
    `<ellipse class="ac-wb" cx="34" cy="-13" rx="20" ry="13"/>` +
    `<path class="ac-b" stroke-width="6" d="M-62-48q8 8 10 20M-40-64q6 10 6 24M-16-70q4 10 2 24M8-66q0 10-4 22M28-54q-2 8-6 18"/>` +
    `<path class="ac-hc" d="M-60-6C-62-36-30-48-8-30"/>` +
    `<path class="hl" d="M-80-30C-70-60-40-72-12-72C10-72 30-60 40-44C20-58-4-64-30-62C-52-60-70-50-80-30Z"/>` +
    `<path class="sh" d="M-80 0C-84-10-82-22-76-30C-70-14-40-8 46-8L48 0Z"/>` +
    `<path class="ac-rim" d="M-77-38C-69-57-52-72-30-73C2-74 30-58 42-38"/>` +
    (nt ? `<path class="ac-nt" d="${CB}"/>` : '') +
    `</g>` +
    // tai trước (giật) — lớp đêm của tai đi theo tai (cùng chiều quấn với mặt nên lúc yên vẫn y như một lớp gộp)
    `<g id="ac-ce"><path class="ac-a" d="${EF}"/><path class="ac-ie" d="M71-53L80-62L82-47Z"/><path class="ac-rim" d="M67-55L79-69Q82-72 84-70"/>` +
    (nt ? `<path class="ac-nt" d="${EF}"/>` : '') +
    `</g>` +
    // tai sau + đầu (gục lên chân trước; cả khối nhấp theo nhịp thở)
    `<g id="ac-ch"><path class="ac-ea" d="${EB}"/><path class="ac-ie" d="M39-47L40-61L48-54Z"/><path class="ac-rim" d="M34-44L36-66Q37-72 41-70"/>` +
    `<path class="ac-a" d="${CH}"/><path class="ac-c" d="M30-30C30-46 40-56 52-56C50-46 44-36 30-30Z"/>` +
    `<ellipse class="ac-w" cx="63" cy="-13" rx="16" ry="10"/><path class="ac-b" stroke-width="3.5" d="M50-52l1 8M58-54v9M66-52l-1 8"/>` +
    `<path class="ac-y" d="M43-30q6 5 12 0M66-31q6 5 12 0"/><path class="p1" opacity=".7" d="M60-21h7l-3.5 4Z"/>` +
    `<path class="hl" d="M32-38C38-50 50-55 62-54C52-50 42-46 32-38Z"/><path class="sh" d="M28-16C36-6 56-4 76-6C70-2 56 0 44-2C36-4 30-9 28-16Z"/>` +
    `<path class="ac-rim" d="M26-20C26-30 28-37 31-42"/>` +
    (nt ? `<path class="ac-nt" d="${CH}${EB}"/>` : '') +
    `</g>` +
    // chân trước + bóng dưới cằm (tách đầu khỏi chân)
    `<g id="ac-c1"><ellipse cx="-14" cy="1" rx="70" ry="9" fill="url(#ac-ag)" opacity=".75"/><ellipse class="ac-p" cx="44" cy="-4" rx="11" ry="6"/><ellipse class="ac-p" cx="67" cy="-3" rx="11" ry="6"/>` +
    `<path class="sh" d="M36-8C46-3 62-2 81-6C76-1 62 1 50 0C43-1 39-4 36-8Z"/></g>` +
    // đuôi quấn trước bụng (vẽ SAU mèo con: đuôi mẹ quấn qua con); chóp đuôi (phẩy chậm) riêng; lớp đêm của đuôi vẽ sau chóp
    `<g id="ac-tl"><path class="ac-t" stroke-width="14" d="${CT}"/><path class="ac-r" stroke-width="14" stroke-dasharray="4 10" d="${CT}"/></g>` +
    `<path id="ac-tp" class="ac-t" stroke-width="12" d="M34 3C46 2 55-4 54-13"/>` +
    (nt ? `<path id="ac-tn" class="ac-nk" stroke-width="14" d="${CT}"/>` : '') +
    // cỏ trước mặt mèo khi nằm trên bãi cỏ: vài ngọn chân so le, màu khớp nền (đung đưa: sw3 / sw1 bọc ngoài)
    `<path id="ac-g0" class="g3" d="${blades(BLADES[0] ?? [])}"/><path id="ac-g1" class="g2" d="${blades(BLADES[1] ?? [])}"/>`
  )
}

/** Một con mèo tại chỗ dùng: def tĩnh, class động trên <g> bọc ngoài (thở · đầu nhấp · tai giật). */
const CAT_USE =
  `<use href="#ac-c0"/><g class="ac-br"><use href="#ac-cb"/></g>` +
  `<g class="ac-hb"><g class="ac-et"><use href="#ac-ce"/></g><use href="#ac-ch"/></g><use href="#ac-c1"/>`
/** Đuôi: thân tĩnh · chóp phẩy · lớp đêm (chỉ khi tối). */
const tailUse = (nt: boolean) => `<use href="#ac-tl"/><g class="ac-tt"><use href="#ac-tp"/></g>${nt ? '<use href="#ac-tn"/>' : ''}`
/** Ba chữ "z" bay (chỉ mèo mẹ; mèo con không vẽ — trước đây vẽ rồi ẩn, hoạt ảnh vô hình vẫn chạy luồng chính). */
const ZZZ = [0, 1, 2].map(i => `<path class="ac-z${i}" d="M78-88h20l-20 22h20"/>`).join('')
const GRASS_USE = `<g class="sw3"><use href="#ac-g0"/></g><g class="sw1"><use href="#ac-g1"/></g>`

function catCss(night: number, furs: Set<number>, sun: boolean): string {
  const ks = [...furs].sort()
  return (
    ks.map(i => `.ac-k${i}`).join(',') + `{${FUR0}}` +
    ks.map(i => `.ac-k${i}{${FUR[i] ?? ''}}`).join('') +
    `.ac-a{fill:var(--a)}.ac-ea{fill:var(--ea)}.ac-c{fill:var(--c,none);opacity:var(--co)}.ac-e{fill:var(--e,none);opacity:var(--eo)}` +
    `.ac-w{fill:var(--w);opacity:var(--wo)}.ac-wb{fill:var(--w);opacity:var(--wb)}.ac-p{fill:var(--wp)}.ac-ie{fill:var(--p1);opacity:var(--ie)}` +
    `.ac-b,.ac-t,.ac-r,.ac-y,.ac-hc,.ac-z0,.ac-z1,.ac-z2,.ac-rim{fill:none;stroke-linecap:round}.ac-b,.ac-r{stroke:var(--b,none);opacity:var(--bo)}.ac-r{opacity:calc(var(--bo)*.75)}.ac-t{stroke:var(--a)}` +
    `.ac-y{stroke:var(--y);stroke-width:3.4;opacity:var(--yo)}.ac-hc{stroke:var(--k1);stroke-width:4;opacity:.15}` +
    // viền sáng: nắng thì ấm (ánh mặt trời hắt mép lưng), râm/đêm thì lạnh theo trời
    `.ac-rim{stroke:${sun ? 'color-mix(in oklab,var(--s1),var(--e1) 40%)' : 'var(--s1)'};stroke-width:6;opacity:var(--rim)}` +
    (night > 0.01 ? `.ac-nt{fill:var(--k1);opacity:${f3(night)}}.ac-nk{fill:none;stroke:var(--k1);stroke-linecap:round;opacity:${f3(night)}}` : '') +
    // thở 4s · đầu nhấp theo nhịp thở · tai giật 12s · chóp đuôi 8s · "z" 6s (mọi chu kỳ là ước của 24 → một --dl cho cả con)
    // Các class này nằm trên <g> bọc <use> (fill-box của <g> = khung nội dung → tâm xoay như khi đặt trên chính phần tử).
    `.ac-br,.ac-et,.ac-tt,.ac-z0,.ac-z1,.ac-z2{transform-box:fill-box}` +
    `.ac-br{transform-origin:50% 100%;animation:ac-br 4s var(--dl) infinite}@keyframes ac-br{50%{transform:scale(1.012,1.06)}}` +
    `.ac-hb{animation:ac-hb 4s var(--dl) infinite}@keyframes ac-hb{50%{transform:translate(0,-2px) rotate(-.6deg)}}` +
    `.ac-et{transform-origin:15% 100%;animation:ac-et 12s var(--dl) infinite}@keyframes ac-et{0%,84%,94%,100%{transform:none}86%{transform:rotate(-18deg)}88%{transform:rotate(4deg)}90%{transform:rotate(-10deg)}}` +
    `.ac-tt{transform-origin:0 100%;animation:ac-tt 8s var(--dl) infinite}@keyframes ac-tt{0%,22%,100%{transform:none}40%{transform:rotate(24deg)}56%{transform:rotate(-8deg)}72%{transform:rotate(12deg)}}` +
    // mỗi chữ "z" một luật animation đủ (độ trễ trong cùng luật — không ghi đè animation-delay lên shorthand có var())
    `.ac-z0,.ac-z1,.ac-z2{stroke:var(--w3);stroke-width:6;stroke-linejoin:round;opacity:0;transform-origin:0 100%}` +
    [0, 2, 4].map((d, i) => `.ac-z${i}{animation:ac-z 6s ${d ? `calc(var(--dl) - ${d}s)` : 'var(--dl)'} linear infinite}`).join('') +
    `@keyframes ac-z{0%{transform:scale(.5)}25%{opacity:.75}to{transform:translate(40px,-110px) scale(1.3);opacity:0}}`
  )
}

function cats(ctx: Ctx, spots: Spot[], acc: Acc) {
  if (ctx.season !== 'xuan' && ctx.season !== 'ha') return
  const rainy = wetSky(ctx) || ctx.wet > 0.6
  const shelters = spots.filter(s => s.kind === 'cat-shelter')
  const used = new Map<Spot, number>()
  const furAt = new Map<Spot, number>() // lông con đầu ở mỗi chỗ nằm: con thứ hai cùng chỗ trú phải khác lông
  const day = dayKey(ctx)
  const calm = ctx.daylight > 0.6 && !rainy && ctx.cur.wind < 0.7
  // vạt nắng chỉ khi mặt trời thật sự chiếu xuống (ban ngày, mây không dày, khô)
  const sun = ctx.daylight > 0.5 && !rainy && (ctx.cur.cloud === 'quang' || ctx.cur.cloud === 'it' || ctx.cur.cloud === 'vua')
  const night = ctx.daylight < 0.5 ? (0.5 - ctx.daylight) * 0.44 : 0
  const nt = night > 0.01
  const furs = new Set<number>()
  let nest = false
  let lit = false
  for (const sp of spots) {
    if (sp.kind !== 'cat') continue
    const id = spotKey(sp)
    const away = ctx.rng(`ac-meo-${day}-${id}`)() >= 0.85 // ~1/7 số ngày mèo đi chơi
    let at: Spot | undefined = away ? undefined : sp
    if (at && rainy) {
      let best: Spot | undefined
      let bd = 1400
      for (const sh of shelters) {
        if (sh.layer !== sp.layer) continue
        const d = Math.abs(sh.x - sp.x) + Math.abs(sh.y - sp.y) * 0.5
        if (d < bd) [best, bd] = [sh, d]
      }
      at = best // không có chỗ trú trong khung → đi trú chỗ khác, ngoài khung hình
    }
    if (at !== sp) {
      // Ổ trống: vết cỏ rạp còn đó (kể chuyện "có một con mèo hay nằm đây"); hôm vắng, khô ráo, ban ngày → chim sẻ sà xuống.
      const s0 = Math.max(sp.s ?? 1, CAT_SMIN)
      let svg = `<g transform="translate(${n0(sp.x)} ${n0(sp.y)}) scale(${f3(CAT_K * s0)})"><use href="#ac-ns"/></g>`
      if (away && calm) svg += sparrows(ctx, sp, s0, `${day}-${id}`, acc)
      acc.pieces.push({ layer: sp.layer, x0: n0(sp.x - 30 * s0), x1: n0(sp.x + 30 * s0), prio: 4, svg })
      nest = true
      if (!at) continue
    }
    const k = used.get(at) ?? 0
    if (k >= 2) continue
    used.set(at, k + 1)
    const look = ctx.rng(`ac-long-${id}`) // cùng chỗ → cùng con mèo
    const fur = coatOf(sp, look(), furAt.get(at))
    if (!furAt.has(at)) furAt.set(at, fur)
    const dir = look() < 0.5 ? 1 : -1
    const s = Math.max(at.s ?? 1, CAT_SMIN)
    const x = at.x + k * CAT_LEN * CAT_K * 1.15 * s * -dir
    const y = at.y
    const onGrass = at === sp
    // trên bãi cỏ: ổ cỏ rạp + (nắng) vạt nắng, rồi mới tới bóng & thân mèo
    let inner = (onGrass ? `<use href="#ac-ns"/>${sun ? '<use href="#ac-sn"/>' : ''}` : '') + CAT_USE
    const day2 = ctx.rng(`ac-con-${day}-${id}`)
    if (day2() < 0.22) {
      // mèo con rúc sau lưng mẹ, đầu tựa vào hông mẹ; đuôi mẹ (vẽ sau) quấn qua; 60% lông khác mẹ cho dễ đọc
      const kf = day2() < 0.6 ? (fur + 1 + Math.floor(day2() * (FUR.length - 1))) % FUR.length : fur
      furs.add(kf)
      inner += `<g class="ac-k${kf}" transform="translate(-116 1) scale(.55)" style="--dl:${ctx.ph(24, `ac-con-${id}`)}">${CAT_USE}${tailUse(nt)}</g>`
    }
    inner += tailUse(nt) + (k ? '' : ZZZ) // con thứ hai cùng chỗ trú: không thêm dòng "z" (hai dòng chồng nhau rối mắt)
    if (onGrass) inner += GRASS_USE
    const m = CAT_K * s
    let svg = `<g class="ac-k${fur}" transform="translate(${n0(x)} ${n0(y)}) scale(${f3(m * dir)} ${f3(m)})" style="--dl:${ctx.ph(24, `ac-meo-${id}`)}">${inner}</g>`
    if (calm && onGrass && day2() < 0.25) {
      // một con bướm trắng đậu trên lưng (đỉnh lưng ≈ (−24, −73) hệ thiết kế), cánh khép mở chậm
      acc.defs.set('bf', BF_DEF)
      acc.css.set('bf', BF_CSS)
      svg += bsUse(`class="f3" transform="translate(${n0(x - 24 * m * dir)} ${n0(y - 72 * m)}) scale(${f3(0.38 * s * dir)} ${f3(0.38 * s)})" style="--fd:${ctx.ph(6.8, `ac-bfm-${id}`)}"`)
    }
    furs.add(fur)
    nest ||= onGrass
    lit ||= onGrass && sun
    acc.pieces.push({ layer: at.layer, x0: n0(x - 44 * s), x1: n0(x + 44 * s), prio: 7, svg })
  }
  if (furs.size) {
    acc.defs.set('cat', catDef(nt))
    acc.css.set('cat', catCss(night, furs, sun))
    if (lit) acc.defs.set('cat-sun', SUN_DEF)
  }
  if (nest) acc.defs.set('cat-nest', NEST_DEF)
}

/** Một/hai con sẻ mổ hạt trên ổ cỏ trống (con đầu cúi mổ, con sau nghiêng đầu nhìn quanh). */
function sparrows(ctx: Ctx, sp: Spot, s0: number, key: string, acc: Acc): string {
  const r = ctx.rng(`ac-se-${key}`)
  const n = lite(ctx, r() < 0.6 ? 2 : 1)
  let svg = ''
  for (let i = 0; i < n; i += 1) {
    const bx = sp.x + (i ? 8 + r() * 8 : -(4 + r() * 10)) * s0
    const d = (i ? -1 : 1) * (r() < 0.5 ? 1 : -1)
    const m = (BIRD_K.se ?? 0.42) * s0 * (0.9 + r() * 0.15)
    svg += `<g transform="translate(${n0(bx)} ${n0(sp.y + 1)}) scale(${f3(m * d)} ${f3(m)})" style="--hn:${i ? 'ac-tl' : 'ac-pk'};--dl:${ctx.ph(24, `ac-se-${key}-${i}`)}"><use href="#ac-sg"/><g class="ac-hd"><use href="#ac-sgh"/></g></g>`
  }
  acc.defs.set('b-sg', SG_DEF)
  acc.css.set('leg', LEG_CSS)
  acc.css.set('bird', BIRD_CSS)
  return svg
}

// ───────────────────────── BƯỚM (hệ ×2: sải ~30) ─────────────────────────
// Cánh trước + cánh sau, đầu cánh sẫm (đọc rõ trên nền trời/cỏ), một chấm; nửa trái = <use> lật của nửa phải.
// Def TĨNH: đôi cánh (ac-bfw) và thân (ac-bfb) tách riêng; vỗ cánh = .ac-fw trên <g> bọc đôi cánh tại chỗ dùng (bfUse).
const BF_DEF =
  `<g id="ac-bfw"><g id="ac-bw"><path d="M0-1C2-9 9-15 14-13C17-11 15-5 11-3C8-1 4 0 0 0ZM0 0C5 0 10 2 10 6C10 9 6 10 3 8C1 6 0 3 0 0Z"/>` +
  `<path class="k2" opacity=".55" d="M14-13C17-11 15-5 11-3C13-6 14-9 14-13Z"/><circle class="k2" opacity=".45" cx="8" cy="-8" r="1.4"/><path class="hl" d="M0-1C2-6 5-9 8-10C6-6 4-3 0 0Z"/></g>` +
  `<use href="#ac-bw" transform="scale(-1 1)"/></g><g id="ac-bfb"><ellipse class="k2" cy="1" rx="1.2" ry="5.5"/><path class="z2" d="M0-4q-1-4-3-6M0-4q1-4 3-6"/></g>` +
  // nhìn nghiêng khi đậu: hai cánh dựng khép, thỉnh thoảng hé xoè (dẹt xuống) rồi khép lại — cánh (ac-bsw) + thân (ac-bsb)
  `<g id="ac-bsw"><path d="M2 0C-2 0-8-3-8-8C-8-11-4-12-2-9C0-6 1-3 2 0ZM1 0C-3-6-2-14 3-18C6-20 9-17 8-13C7-8 5-4 3 0Z"/>` +
  `<path class="k2" opacity=".55" d="M3-18C6-20 9-17 8-13C7-15 5-17 3-18Z"/><path class="hl" d="M1 0C-1-5 0-11 3-15C3-10 3-5 2 0Z"/></g>` +
  `<g id="ac-bsb"><ellipse class="k2" cx="1" cy=".6" rx="5" ry="1"/><circle class="k2" cx="6.2" cy=".1" r="1.1"/><path class="z2" d="M7-1q3-3 4-7M7-1q4-2 6-5"/></g>`
/** Bướm bay tại chỗ dùng; `attrs` = class màu / transform đặt chỗ / style (--fs, --fd) của cả con. */
const bfUse = (attrs: string) => `<g ${attrs}><g class="ac-fw"><use href="#ac-bfw"/></g><use href="#ac-bfb"/></g>`
/** Bướm đậu (nhìn nghiêng) tại chỗ dùng: cánh khép mở (.ac-sw bọc ngoài) + thân. */
const bsUse = (attrs: string) => `<g ${attrs}><g class="ac-sw"><use href="#ac-bsw"/></g><use href="#ac-bsb"/></g>`
// Vỗ 3 nhịp rồi lướt cánh mở (~64% chu kỳ, ảnh chụp hầu như luôn thấy cánh xoè).
const BF_CSS =
  `.ac-fw{transform-box:fill-box;transform-origin:50% 50%;animation:ac-fp var(--fs,2.3s) var(--fd,0s) infinite}` +
  `@keyframes ac-fp{0%,36%,to{transform:none}6%,18%,30%{transform:scaleX(.25)}12%,24%{transform:none}}` +
  `.ac-sw{transform-box:fill-box;transform-origin:50% 100%;animation:ac-sv 3.4s var(--fd,0s) ease-in-out infinite alternate}@keyframes ac-sv{0%,45%{transform:none}to{transform:scaleY(.38) skewX(-10deg)}}`
// Đường bay chập chờn (vòng kín) chu kỳ 19 / 23 / 29 s — biên ±60…120.
const BF_PATHS: [number, string][] = [
  [19, '14%{transform:translate(60px,-30px)}30%{transform:translate(118px,-6px)}46%{transform:translate(90px,-56px)}62%{transform:translate(30px,-40px)}78%{transform:translate(-40px,-62px)}90%{transform:translate(-30px,-20px)}'],
  [23, '16%{transform:translate(-50px,-36px)}34%{transform:translate(-110px,-14px)}50%{transform:translate(-80px,-70px)}68%{transform:translate(-10px,-48px)}84%{transform:translate(30px,-14px)}'],
  [29, '12%{transform:translate(40px,-50px)}28%{transform:translate(-10px,-88px)}44%{transform:translate(-80px,-50px)}62%{transform:translate(-50px,6px)}80%{transform:translate(30px,-24px)}'],
]
// Con "hạ xuống hoa": 21 s — lượn, hạ xuống mặt cỏ (−6), đậu ~3.4 s khép mở cánh chậm, rồi bay lên.
const BF_LAND =
  `.ac-pl{animation:ac-pl 21s var(--pd) infinite}@keyframes ac-pl{0%,to{transform:translate(0,0)}12%{transform:translate(48px,-30px)}26%{transform:translate(80px,calc(var(--ly)*.5px - 14px))}` +
  `34%{transform:translate(66px,calc(var(--ly)*1px - 7px))}36%,52%{transform:translate(64px,calc(var(--ly)*1px))}58%{transform:translate(76px,calc(var(--ly)*1px - 26px))}74%{transform:translate(20px,-52px)}88%{transform:translate(-36px,-24px)}}` +
  `.ac-fa{animation:ac-va 21s var(--pd) infinite}.ac-fb{opacity:0;animation:ac-vb 21s var(--pd) infinite}` +
  `@keyframes ac-va{0%,35.8%,52.2%,to{opacity:1}36%,52%{opacity:0}}@keyframes ac-vb{0%,35.8%,52.2%,to{opacity:0}36%,52%{opacity:1}}`

function butterflies(ctx: Ctx, spots: Spot[], acc: Acc) {
  if (ctx.season !== 'xuan' && ctx.season !== 'ha') return
  if (ctx.daylight < 0.55 || ctx.cur.wind >= 0.7 || ctx.cur.precip !== 'khong' || ctx.wet > 0.6) return
  let any = false
  let land = false
  for (const sp of spots) {
    if (sp.kind !== 'butterflies') continue
    const id = spotKey(sp)
    const r = ctx.rng(`ac-buom-${id}`)
    const s = sp.s ?? 1
    const w = sp.w ?? 200
    const n = lite(ctx, 2 + Math.floor(r() * 3))
    let svg = ''
    for (let i = 0; i < n; i += 1) {
      const col = ['f3', 'f2', 'w1', 'p2', 'f3'][Math.floor(r() * 5)] ?? 'f3'
      const x = sp.x + (r() - 0.5) * w
      const y = sp.y - r() * 50 * s
      const m = 0.7 * s * (0.85 + r() * 0.25)
      const fly = `style="--fs:${f3(2 + r() * 0.7)}s;--fd:-${f3(r() * 2)}s"`
      const at = `transform="translate(${n0(x)} ${n0(y)}) scale(${f3(m)})"`
      if (i === 0 && n >= 2) {
        // hạ xuống hoa / mặt cỏ: lớp 3 dùng địa hình chung (spot nằm trên mặt đất thì dùng chính spot)
        const gy = sp.layer === 3 ? ground(x + 64) : sp.y + 20
        const target = gy > sp.y + 10 ? Math.min(gy - 6, sp.y + 80) : sp.y + 16
        const ly = n0(clamp(target - y, 8, 120))
        // (ac-fa / ac-fb chỉ đổi opacity nên đứng chung <g> với transform đặt chỗ được)
        svg += `<g class="ac-pl" style="--pd:${ctx.ph(21, `ac-bl-${id}`)};--ly:${ly}">${bfUse(`class="${col} ac-fa" ${at} ${fly}`)}${bsUse(`class="${col} ac-fb" transform="translate(${n0(x)} ${n0(y + 2)}) scale(${f3(m * 0.8)})" style="--fd:-${f3(r() * 3)}s"`)}</g>`
        land = true
        continue
      }
      const p = Math.floor(r() * BF_PATHS.length) % BF_PATHS.length
      const per = (BF_PATHS[p] as [number, string])[0]
      svg += `<g class="ac-p${p}" style="animation-delay:${ctx.ph(per, `ac-buom-${id}-${i}`)}">${bfUse(`class="${col}" ${at} ${fly}`)}</g>`
    }
    acc.pieces.push({ layer: sp.layer, x0: n0(sp.x - w / 2 - 130), x1: n0(sp.x + w / 2 + 130), prio: 4, svg })
    any = true
  }
  if (any) {
    acc.defs.set('bf', BF_DEF)
    acc.css.set('bf', BF_CSS)
    acc.css.set('bfp', BF_PATHS.map(([per, kf], i) => `.ac-p${i}{animation:ac-p${i} ${per}s infinite}@keyframes ac-p${i}{0%,100%{transform:translate(0,0)}${kf}}`).join(''))
    if (land) acc.css.set('bfl', BF_LAND)
  }
}

// ───────────────────────── ĐOM ĐÓM (toàn bộ trong glow) ─────────────────────────
// 3 cỡ (gần–thấp to sáng · xa–cao nhỏ mờ), lõi xanh vàng. 4 đường lượn × 3 kiểu nháy (kiểu 3 tắt ~70% chu kỳ).
// Chu kỳ đều là ước của 48 → một --dl cho cả đàn.
const FF_DEF =
  `<g id="ac-f0"><circle r="13" fill="url(#gg)"/><circle class="ac-fc" r="2"/></g>` +
  `<g id="ac-f1"><circle r="9" fill="url(#gg)"/><circle class="ac-fc" r="1.5"/></g>` +
  `<g id="ac-f2" opacity=".7"><circle r="6" fill="url(#gg)"/><circle class="ac-fc" r="1"/></g>`
const FF_W = [
  '25%{transform:translate(14px,-9px)}50%{transform:translate(22px,4px)}75%{transform:translate(6px,10px)}',
  '30%{transform:translate(-12px,-14px)}60%{transform:translate(-20px,2px)}80%{transform:translate(-6px,6px)}',
  '20%{transform:translate(8px,12px)}45%{transform:translate(-10px,18px)}70%{transform:translate(-16px,-4px)}',
  '33%{transform:translate(18px,-16px)}66%{transform:translate(-8px,-22px)}',
]
const FF_B = [
  '0%,to{opacity:.08}40%{opacity:1}55%{opacity:.8}70%{opacity:.1}',
  '0%,to{opacity:.9}20%{opacity:.1}35%{opacity:.03}60%{opacity:1}',
  '0%,68%,to{opacity:0}76%{opacity:1}84%{opacity:.45}90%{opacity:.95}',
]
// [đường, chu kỳ lượn, kiểu nháy, chu kỳ nháy, lệch]
const FF_Q: [number, number, number, number, number][] = [
  [0, 12, 0, 3, 0], [1, 16, 1, 4, 1.3], [2, 24, 2, 6, 2.1], [3, 16, 1, 3, 0.7],
  [1, 12, 2, 8, 2.9], [0, 24, 0, 6, 3.7], [2, 16, 2, 12, 1.9], [3, 24, 0, 4, 4.4],
]

function fireflies(ctx: Ctx, spots: Spot[], acc: Acc) {
  const season = ctx.season === 'ha' || (ctx.season === 'xuan' && ctx.seasonT > 0.6)
  if (!season || ctx.daylight >= 0.35 || ctx.cur.precip !== 'khong' || ctx.cur.wind >= 0.8) return
  let any = false
  for (const sp of spots) {
    if (sp.kind !== 'fireflies') continue
    const id = spotKey(sp)
    const r = ctx.rng(`ac-domdom-${id}`)
    const s = sp.s ?? 1
    const w = sp.w ?? 240
    const n = lite(ctx, 8 + Math.floor(r() * 7) + Math.floor(Math.max(0, w - 300) / 200)) // bãi rộng → đông hơn
    const nc = ctx.detail === 'lite' ? 2 : 3 + (r() < 0.5 ? 1 : 0)
    const cs: number[] = []
    let halos = ''
    for (let c = 0; c < nc; c += 1) {
      const cx = sp.x + ((c + 0.5 + (r() - 0.5) * 0.5) / nc - 0.5) * w
      cs.push(cx)
      const rx = 45 + r() * 15
      halos += `<ellipse cx="${n0(cx)}" cy="${n0(sp.y - 16 * s)}" rx="${n0(rx)}" ry="${n0(rx * 0.6)}" fill="url(#gg)" opacity="${f3(0.05 + r() * 0.02)}"/>`
    }
    let glow = `${halos}<g style="--dl:${ctx.ph(48, `ac-domdom-${id}`)}">`
    const spread = Math.min(w / nc, 170)
    for (let i = 0; i < n; i += 1) {
      const x = (cs[i % nc] as number) + (r() - 0.5) * spread
      const low = r() < 0.7
      const y = sp.y - (low ? 4 + r() * 36 : 40 + r() * 90) * s
      const sym = low ? (r() < 0.55 ? 0 : 1) : r() < 0.3 ? 1 : 2
      glow += `<use href="#ac-f${sym}" x="${n0(x)}" y="${n0(y)}" class="ac-q${(i + Math.floor(r() * FF_Q.length)) % FF_Q.length}"/>`
    }
    glow += '</g>'
    acc.pieces.push({ layer: sp.layer, x0: n0(sp.x - w / 2 - 60), x1: n0(sp.x + w / 2 + 60), prio: 5, svg: '', glow })
    any = true
  }
  if (any) {
    acc.defs.set('ff', FF_DEF)
    acc.css.set(
      'ff',
      `.ac-fc{fill:color-mix(in oklab,var(--e4),var(--e1) 35%)}` +
        FF_W.map((kf, i) => `@keyframes ac-w${i}{${kf}}`).join('') +
        FF_B.map((kf, i) => `@keyframes ac-bl${i}{${kf}}`).join('') +
        FF_Q.map(([w, pw, b, pb, o], i) => `.ac-q${i}{animation:ac-w${w} ${pw}s infinite,ac-bl${b} ${pb}s infinite;animation-delay:${o ? `calc(var(--dl) - ${o}s)` : 'var(--dl)'}}`).join(''),
    )
  }
}

// ───────────────────────── CHIM ĐẬU (hệ ×2) + ĐÀN CHIM CHỮ V ─────────────────────────
// Mỗi loài hai def TĨNH: thân (ac-X, gồm chân) và đầu (ac-Xh). Đầu động (.ac-hd) bọc ngoài tại chỗ dùng. Chân (y ≥ −2, x ≤ 4)
// không chạm đầu kể cả lúc cúi rỉa 42°, nên vẽ chân trước đầu vẫn y hệt; cò vốn vẽ đầu sau cùng.
const BIRD_DEFS: Record<string, string> = {
  // chim sẻ — bóng .k2
  se:
    `<g id="ac-se" class="k2"><path d="M-8-6L-18-2Q-18 0-16 0L-7-3Z"/><path d="M-10-4C-9-11 0-14 6-11C10-9 10-3 4-1C-1 1-8 0-10-4Z"/>` +
    `<path class="sh" d="M-8-7C-3-11 3-11 4-8C0-5-5-5-8-7Z"/><ellipse class="hl" cx="3" cy="-4" rx="4" ry="2.4"/><path class="ac-lg" d="M0-1v2M3-1v2"/></g>` +
    `<g id="ac-seh" class="k2"><circle cx="6" cy="-12" r="4.4"/><path d="M10-13l4 1.5-4 1.5Z"/></g>`,
  // cò trắng — ruộng bậc thang, hồ sen
  co:
    `<g id="ac-co"><path class="ac-lg" d="M-2 0l2-13M3 0l-1-13"/><path class="w3" d="M-14-17l-6 3 6-1ZM-14-17C-10-23 2-23 6-18C7-14 1-11-5-12C-9-12-13-14-14-17Z"/>` +
    `<path class="sh" d="M-12-15C-6-12 0-12 5-15C2-11-6-10-12-15Z"/></g>` +
    `<g id="ac-coh"><path class="ac-nk2" d="M4-18C9-22 4-28 8-33"/><ellipse class="w3" cx="9" cy="-34" rx="3.4" ry="2.6"/><path class="w1" d="M12-35l8 1.6-8 1Z"/></g>`,
  // bồ câu — tháp chuông
  bc:
    `<g id="ac-bc" class="s3"><path class="s4" d="M-7-6L-16-3L-15 0L-6-3Z"/><path d="M-10-6C-9-13 2-16 8-11C10-8 9-2 2-1C-4 0-9-2-10-6Z"/><path class="s4" d="M-8-8C-3-12 4-11 5-8C1-6-4-5-8-8Z"/>` +
    `<path class="ac-lg" d="M0-1v2M3-1v2"/></g>` +
    `<g id="ac-bch"><circle class="s4" cx="7" cy="-13" r="4.4"/><path class="p2" opacity=".75" d="M3-10q4 2 7-1v3q-4 2-7 0Z"/><path class="p3" d="M11-14l3.4 1.4-3.4 1Z"/></g>`,
  // hải âu — vách hải đăng
  ha:
    `<g id="ac-ha"><path class="k2" d="M-13-6L-19-4L-13-3Z"/><path class="w3" d="M-11-6C-9-12 2-14 8-11C10-8 9-3 2-2C-4-1-10-2-11-6Z"/><path class="s2" d="M-12-7C-6-12 4-11 5-8C0-6-6-5-12-7Z"/>` +
    `<path class="ac-lg" d="M0-2v3M3-2v3"/></g>` +
    `<g id="ac-hah"><circle class="w3" cx="7" cy="-13" r="4.2"/><path class="w1" d="M11-14l5 1.2-5 1.2Z"/><circle class="k1" cx="8" cy="-14" r=".9"/></g>`,
}
const LEG_CSS = `.ac-lg{fill:none;stroke:var(--k2);stroke-width:1.3;stroke-linecap:round}`
const BIRD_CSS =
  `.ac-nk2{fill:none;stroke:var(--w3);stroke-width:3.4;stroke-linecap:round}` +
  `.ac-hd{transform-box:fill-box;transform-origin:30% 90%;animation:var(--hn,none) 8s var(--dl,0s) infinite}` +
  `@keyframes ac-tl{0%,58%,92%,to{transform:none}62%,74%{transform:rotate(-22deg)}79%,88%{transform:rotate(12deg)}}` +
  // rỉa lông: cúi mỏ vào ngực/cánh, mổ vài nhịp
  `@keyframes ac-pk{0%,62%,90%,to{transform:none}67%,73%,79%,85%{transform:translate(-1px,2px) rotate(42deg)}70%,76%,82%{transform:translate(-1px,2px) rotate(30deg)}}`
// Hệ số cỡ theo loài (sẻ nhỏ hơn bồ câu / hải âu) và khoảng cách giữa hai con trong một cặp.
const BIRD_K: Record<string, number> = { se: 0.42, co: 0.5, bc: 0.5, ha: 0.5 }

function birdType(sp: Spot): string {
  const wx = worldX(sp)
  if (wx >= 5400 && wx < 9000) return 'co'
  if (wx >= 12600 && wx < 14400) return 'bc'
  if (wx >= 16200) return 'ha'
  return 'se'
}

function perches(ctx: Ctx, spots: Spot[], acc: Acc) {
  if (ctx.daylight < 0.3 || (ctx.cur.precip !== 'khong' && ctx.cur.precip !== 'phun')) return
  const day = dayKey(ctx)
  for (const sp of spots) {
    if (sp.kind !== 'perch') continue
    const id = spotKey(sp)
    const r = ctx.rng(`ac-chim-${day}-${Math.floor(ctx.vn.hourF / 3)}-${id}`)
    const s = sp.s ?? 1
    const w = sp.w ?? 70
    const type = birdType(sp)
    const n = lite(ctx, 2 + Math.floor(r() * 3))
    const gapK = (type === 'co' ? 1.7 : 1) * s
    // Nhóm: phần lớn là cặp, đôi khi một con lẻ. Khoảng cách ngẫu nhiên (tối thiểu 8), giữa các nhóm thưa hơn.
    const groups: number[] = []
    for (let left = n; left > 0; ) {
      const g = left >= 2 && r() < 0.75 ? 2 : 1
      groups.push(g)
      left -= g
    }
    const xs: [number, number, number][] = [] // [x tương đối, nhóm, thứ tự trong nhóm]
    let cur = 0
    groups.forEach((g, gi) => {
      for (let j = 0; j < g; j += 1) {
        xs.push([cur, gi, j])
        if (j < g - 1) cur += (8 + r() * 5) * gapK
      }
      cur += (18 + r() * 26) * gapK
    })
    const span = (xs[xs.length - 1] as [number, number, number])[0]
    const shift = sp.x - span / 2 + (r() - 0.5) * w * 0.3
    // dây điện (w ≥ 100): spot là điểm võng thấp nhất → hai bên cao dần theo parabol
    const sag = w >= 100 ? w * 0.03 : 0
    let svg = ''
    for (const [rx, gi, j] of xs) {
      const x = shift + rx
      const dx = x - sp.x
      const y = sp.y - (sag ? 4 * sag * (dx / w) ** 2 : 0)
      const d = r() < 0.5 ? 1 : -1
      const m = (BIRD_K[type] ?? 0.5) * s * (type === 'co' ? 1 : 0.88 + r() * 0.2)
      const pair = (groups[gi] ?? 1) === 2
      // trong cặp: con đầu rỉa lông, con sau quay mặt ra (dẹp ngang); con lẻ: nghiêng đầu
      const front = pair && j === 1
      const anim = pair ? (j === 0 ? '--hn:ac-pk;' : '') : '--hn:ac-tl;'
      // transform đặt chỗ ở <g> ngoài; .ac-hd ở <g> riêng bọc đầu (hoạt ảnh transform không được đè transform đặt chỗ)
      const head = anim ? `<g class="ac-hd"><use href="#ac-${type}h"/></g>` : `<use href="#ac-${type}h"/>`
      svg += `<g transform="translate(${n0(x)} ${n0(y)}) scale(${f3(m * d * (front ? 0.64 : 1))} ${f3(m)})"${anim ? ` style="${anim}--dl:${ctx.ph(24, `ac-chim-${id}-${rx | 0}`)}"` : ''}><use href="#ac-${type}"/>${head}</g>`
    }
    acc.pieces.push({ layer: sp.layer, x0: n0(shift - 20), x1: n0(shift + span + 20), prio: 3, svg })
    acc.defs.set(`b-${type}`, BIRD_DEFS[type] ?? '')
    acc.css.set('leg', LEG_CSS)
    acc.css.set('bird', BIRD_CSS)
  }
}

// Cú mèo: đêm, nhiều nhất một con trên một chỗ đậu (trừ vách biển); mắt sáng (glow) chớp, thỉnh thoảng ngoảnh đầu.
// Chỉ một con mỗi cảnh → viết thẳng (không defs/<use>): mặt & mắt có hoạt ảnh, bản sao <use> sẽ không lên compositor.
const OWL_BODY =
  `<path class="b2" d="M-8 0C-11-8-10-20-7-25L-6-31L-2-26H2L6-31L7-25C10-20 11-8 8 0Z"/><ellipse class="b3" opacity=".5" cy="-8" rx="5" ry="6"/>` +
  `<path class="sh" d="M3-17C9-13 10-5 8 0H1C6-5 6-12 3-17Z"/><ellipse class="b3 ac-of" cy="-21" rx="6.5" ry="5"/><path class="ac-lg" d="M-2 0v2M2 0v2"/>`
const OWL_EYES =
  `<g class="ac-oy"><circle cy="-21" r="8" fill="url(#gw)" opacity=".55"/><circle class="e1" cx="-2.6" cy="-21" r="1.7"/><circle class="e1" cx="2.6" cy="-21" r="1.7"/></g>`
const OWL_CSS =
  // mỗi class một shorthand đủ (không ghi đè animation-name lên shorthand có var())
  `.ac-of,.ac-oy{transform-box:fill-box;transform-origin:50% 50%}.ac-of{animation:ac-of 10s var(--dl) infinite}.ac-oy{animation:ac-oy 10s var(--dl) infinite}` +
  `@keyframes ac-of{0%,40%,to{transform:none}46%,66%{transform:translateX(2px)}72%,90%{transform:translateX(-1.5px)}}` +
  `@keyframes ac-oy{0%,20%,24%,40%,to{transform:none}22%{transform:scaleY(.1)}46%,66%{transform:translateX(2px)}72%,78%,82%,90%{transform:translateX(-1.5px)}80%{transform:translateX(-1.5px) scaleY(.1)}}`

function owl(ctx: Ctx, spots: Spot[], acc: Acc) {
  if (ctx.daylight >= 0.2 || (ctx.cur.precip !== 'khong' && ctx.cur.precip !== 'phun')) return
  const day = dayKey(ctx)
  for (const sp of spots) {
    if (sp.kind !== 'perch' || birdType(sp) === 'ha') continue
    const id = spotKey(sp)
    const r = ctx.rng(`ac-cu-${day}-${id}`)
    if (r() > 0.4) continue
    const x = sp.x + (r() - 0.5) * (sp.w ?? 40) * 0.6
    const t = `transform="translate(${n0(x)} ${n0(sp.y)}) scale(${f3(0.5 * (sp.s ?? 1))})" style="--dl:${ctx.ph(10, `ac-cu-${id}`)}"`
    acc.pieces.push({ layer: sp.layer, x0: n0(x - 20), x1: n0(x + 20), prio: 4, svg: `<g ${t}>${OWL_BODY}</g>`, glow: `<g ${t}>${OWL_EYES}</g>` })
    acc.css.set('owl', OWL_CSS)
    acc.css.set('leg', LEG_CSS)
    return
  }
}

/** Chu kỳ đàn chim chữ V (giây); băng qua trong 55% đầu chu kỳ. */
export const FLOCK_P = 200

function flock(ctx: Ctx, spots: Spot[], acc: Acc) {
  const h = ctx.vn.hourF
  const dawn = h >= 5.2 && h <= 7.3
  const dusk = h >= 16.4 && h <= 18.7
  if ((!dawn && !dusk) || spots.length === 0) return
  if (ctx.cur.precip !== 'khong' && ctx.cur.precip !== 'phun') return
  const slot = `${dayKey(ctx)}-${Math.floor(h * 2)}`
  const r = ctx.rng(`ac-dan-${slot}`)
  if (r() > 0.8) return
  // Tâm khung nhìn ước từ các spot đang thấy (lớp 3) → lớp 2.
  const cx = (spots.reduce((a, s) => a + worldX(s), 0) / spots.length) * LAYER_F[2]
  const y = 250 + r() * 100
  const n = lite(ctx, 5 + Math.floor(r() * 5))
  const left = r() < 0.5
  // Hai nhánh V lệch nhau (một nhánh dài & dốc hơn), xê dịch nhỏ; con cuối tụt lại phía sau.
  const armA: [number, number] = [19 + r() * 3, 12 + r() * 3]
  const armB: [number, number] = [15 + r() * 3, -(8 + r() * 3)]
  let birds = ''
  for (let i = 0; i < n; i += 1) {
    const k = Math.ceil(i / 2)
    const arm = i % 2 === 0 ? armA : armB
    let bx = -k * arm[0] + (r() - 0.5) * 6
    let by = k * arm[1] + (r() - 0.5) * 5
    if (i === n - 1 && n > 3) [bx, by] = [bx - 10 - r() * 8, by + 6]
    birds += `<use href="#ac-v" x="${n0(bx)}" y="${n0(by)}" class="ac-vf" style="animation-delay:-${f3(r() * 0.9)}s"/>`
  }
  const svg = `<g transform="translate(${n0(cx)} ${n0(y)})${left ? ' scale(-1 1)' : ''}"><g class="ac-fk" style="animation-delay:${ctx.ph(FLOCK_P, `ac-dan-${slot}`)}">${birds}</g></g>`
  acc.pieces.push({ layer: 2, x0: n0(cx - 1300), x1: n0(cx + 1300), prio: 3, svg })
  acc.defs.set('v', `<path id="ac-v" class="ac-vb" d="M-11 1Q-5-5 0 0Q5-5 11 1"/>`)
  acc.css.set(
    'v',
    `.ac-vb{fill:none;stroke:var(--k2);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}` +
      `.ac-vf{transform-box:fill-box;transform-origin:50% 50%;animation:ac-vf .62s infinite alternate}@keyframes ac-vf{to{transform:scaleY(-.5)}}` +
      `.ac-fk{animation:ac-fk ${FLOCK_P}s linear infinite}@keyframes ac-fk{0%{transform:translate(-1050px,40px);opacity:0}2%{opacity:1}55%{transform:translate(1150px,-50px);opacity:1}55.1%,to{transform:translate(1150px,-50px);opacity:0}}`,
  )
}

// ───────────────────────── ĐÈN HOA ĐĂNG (đêm rằm, toàn bộ trong glow; hệ ×2) ─────────────────────────
// Trên nước: vũng sáng + vệt phản chiếu dọc (lung linh) + gợn tròn lan. Thân đèn (dập dềnh): cánh ngoài giấy kem
// trong mờ (chóp nhuộm màu), ánh nến xuyên qua chân cánh, cánh giữa trắng, búp giữa sáng nhất có quầng ấm bên trong.
// Def TĨNH: vũng sáng (ac-lp), vệt phản chiếu (ac-lr), gợn (ac-lg), ngọn lửa (ac-lf), thân đèn trừ ngọn lửa (ac-lt); class
// động bọc ngoài tại chỗ dùng (LT_USE). Ba hình có hoạt ảnh opacity: opacity gốc chuyển lên <g> bọc (vệt .55, lửa .9, gợn 0
// trong .ac-rg) để giá trị gốc lẫn giá trị hoạt ảnh vẫn y như khi class nằm trên chính hình.
const LT_DEF =
  `<ellipse id="ac-lp" cy="4" rx="38" ry="8" fill="url(#gw)" opacity=".5"/><ellipse id="ac-lr" cy="32" rx="5" ry="30" fill="url(#gw)"/>` +
  `<ellipse id="ac-lg" cy="3" rx="22" ry="4.5"/><ellipse id="ac-lf" class="w3" cy="-9" rx="1.8" ry="3.6"/>` +
  `<g id="ac-lt"><circle cy="-10" r="30" fill="url(#gw)" opacity=".5"/><path class="k2" opacity=".6" d="M-21 0C-12 5 12 5 21 0Z"/>` +
  `<path class="p3" opacity=".85" d="M-22-1C-23-6-18-9-11-8C-12-5-11-2-8 0ZM22-1C23-6 18-9 11-8C12-5 11-2 8 0Z"/>` +
  `<path class="ac-tp" d="M-22-1C-23-6-18-9-11-8C-15-7-19-4-22-1ZM22-1C23-6 18-9 11-8C15-7 19-4 22-1Z"/>` +
  `<ellipse cy="-4" rx="15" ry="5" fill="url(#gw)" opacity=".9"/>` +
  `<path class="w3" opacity=".85" d="M-15 0C-18-8-13-15-6-17C-6-10-5-4-2 0ZM15 0C18-8 13-15 6-17C6-10 5-4 2 0Z"/>` +
  `<path class="ac-tp" d="M-15-6C-15-11-11-15-6-17C-7-13-10-9-15-6ZM15-6C15-11 11-15 6-17C7-13 10-9 15-6Z"/>` +
  `<path class="ac-vn" d="M-11-2q-3-5-1-11M11-2q3-5 1-11M-16-2q-2-2-1-5M16-2q2-2 1-5"/>` +
  `<path class="e2" d="M-6 0C-8-9-4-18 0-22C4-18 8-9 6 0Z"/><ellipse cy="-8" rx="5" ry="9" fill="url(#gw)"/></g>`
/** Một chiếc đèn tại chỗ dùng (thứ tự vẽ như cũ): vũng sáng · vệt phản chiếu · gợn · [dập dềnh: thân đèn · ngọn lửa]. */
const LT_USE =
  `<use href="#ac-lp"/><g class="ac-rf" opacity=".55"><use href="#ac-lr"/></g><g class="ac-rg"><use href="#ac-lg"/></g>` +
  `<g class="ac-lb"><use href="#ac-lt"/><g class="fl" opacity=".9"><use href="#ac-lf"/></g></g>`
// [chu kỳ, biên trôi] — hai kiểu cho cụm, kiểu cuối cho chiếc trôi lẻ (xa hơn, chậm hơn)
const LT_D: [number, number][] = [[48, 30], [64, -26], [96, 64]]
const LT_TINT = ['p1', 'e1', 'f1']

function lanterns(ctx: Ctx, spots: Spot[], acc: Acc) {
  if (ctx.moonPhase < 0.44 || ctx.moonPhase > 0.56 || ctx.daylight >= 0.3) return
  if (ctx.cur.precip === 'mua' || ctx.cur.precip === 'mua-to') return
  let any = false
  for (const sp of spots) {
    if (sp.kind !== 'lantern-water') continue
    const id = spotKey(sp)
    const r = ctx.rng(`ac-hoadang-${dayKey(ctx)}-${id}`)
    const s = sp.s ?? 1
    const w = sp.w ?? 260
    const n = lite(ctx, 5 + Math.floor(r() * 5))
    // Một chiếc trôi lẻ + các cụm 2–3 chiếc (không để cụm 1).
    const sizes: number[] = [1]
    for (let left = n - 1; left > 0; ) {
      let g = left >= 3 && r() < 0.45 ? 3 : 2
      if (left - g === 1) g = Math.min(left, 3)
      if (g > left) g = left
      sizes.push(g)
      left -= g
    }
    // Ô ngang xáo trộn để chiếc lẻ không luôn ở một đầu.
    const slots = sizes.map((_, i) => i)
    for (let i = slots.length - 1; i > 0; i -= 1) {
      const j = Math.floor(r() * (i + 1))
      ;[slots[i], slots[j]] = [slots[j] as number, slots[i] as number]
    }
    const groups: [number, string][] = []
    sizes.forEach((size, gi) => {
      const depth = r()
      const gx = sp.x + (((slots[gi] as number) + 0.5 + (r() - 0.5) * 0.55) / sizes.length - 0.5) * w * 0.92
      const gy = sp.y + (depth - 0.5) * w * 0.16
      const mBase = 0.5 * s * (0.5 + 0.7 * depth)
      const j = size === 1 ? 2 : Math.floor(r() * 2)
      const per = (LT_D[j] as [number, number])[0]
      const mem: [number, string][] = []
      for (let k = 0; k < size; k += 1) {
        const m = mBase * (0.9 + r() * 0.16)
        const x = gx + (k - (size - 1) / 2) * 38 * m + (r() - 0.5) * 6 * m
        const y = gy + (r() - 0.5) * 10 * m + (size === 3 && k === 1 ? -5 * m : 0)
        const tint = LT_TINT[Math.floor(r() * LT_TINT.length) % LT_TINT.length] ?? 'p1'
        mem.push([y, `<g transform="translate(${n0(x)} ${n0(y)}) scale(${f3(m)})"${depth < 0.3 ? ' opacity=".85"' : ''} class="ac-t-${tint}" style="--ld:${ctx.ph(5.2, `ac-ld-${id}-${gi}-${k}`)}">${LT_USE}</g>`])
      }
      mem.sort((a, b) => a[0] - b[0])
      groups.push([gy, `<g class="ac-l${j}" style="--ld:${ctx.ph(per, `ac-hd-${id}-${gi}`)}">${mem.map(q => q[1]).join('')}</g>`])
    })
    groups.sort((a, b) => a[0] - b[0]) // xa (cao hơn) vẽ trước
    acc.pieces.push({ layer: sp.layer, x0: n0(sp.x - w / 2 - 80), x1: n0(sp.x + w / 2 + 80), prio: 6, svg: '', glow: groups.map(g => g[1]).join('') })
    any = true
  }
  if (any) {
    acc.defs.set('lt', LT_DEF)
    acc.css.set(
      'lt',
      LT_TINT.map(t => `.ac-t-${t}{--lt:var(--${t})}`).join('') +
        `.ac-tp{fill:var(--lt);opacity:.5}.ac-vn{fill:none;stroke:var(--b2);stroke-width:.7;stroke-linecap:round;opacity:.35}` +
        `.ac-rg{fill:none;stroke:var(--e2);stroke-width:.9;opacity:0;transform-box:fill-box;transform-origin:50% 50%;animation:ac-rg 4.6s var(--ld) ease-out infinite}@keyframes ac-rg{0%{transform:scale(.55);opacity:.6}55%,to{transform:scale(1.5);opacity:0}}` +
        `.ac-rf{transform-box:fill-box;transform-origin:50% 0;animation:ac-rf 2.6s var(--ld) infinite alternate}@keyframes ac-rf{to{transform:scale(1.45,.84);opacity:.3}}` +
        `.ac-lb{animation:ac-lb 5.2s var(--ld) ease-in-out infinite alternate}@keyframes ac-lb{to{transform:translateY(1.6px) rotate(1.6deg)}}` +
        LT_D.map(
          ([per, dx], i) =>
            `.ac-l${i}{animation:ac-l${i} ${per}s var(--ld) infinite alternate}@keyframes ac-l${i}{33%{transform:translate(${n0(dx / 3)}px,2px)}66%{transform:translate(${n0((dx * 2) / 3)}px,0)}to{transform:translate(${dx}px,1px)}}`,
        ).join(''),
    )
  }
}

// ───────────────────────── KHÓI (cụm dẹt xoay ngẫu nhiên, bốc lên, nghiêng theo --wind; 8 cụm so le / 14 s) ─────────────────────────
const SM_N = 8
const SM_P = 14

function smoke(ctx: Ctx, spots: Spot[], acc: Acc) {
  const h = ctx.vn.hourF
  const cooking = (h >= 5 && h < 7) || (h >= 10.5 && h < 11.5) || (h >= 16.5 && h < 19)
  if (!cooking && ctx.season !== 'dong') return
  let any = false
  for (const sp of spots) {
    if (sp.kind !== 'smoke') continue
    const id = spotKey(sp)
    const r = ctx.rng(`ac-khoi-${id}`)
    const s = sp.s ?? 1
    const n = ctx.detail === 'lite' ? SM_N / 2 : SM_N
    let svg = `<g style="--dl:${ctx.ph(SM_P, `ac-khoi-${id}`)}">`
    for (let i = 0; i < n; i += 1) {
      const k = ctx.detail === 'lite' ? i * 2 : i
      const rx = (12 + r() * 5) * s
      svg += `<ellipse class="ac-sm ac-s${k}" cx="${n0(sp.x + (r() - 0.5) * 4 * s)}" cy="${n0(sp.y - 3 * s)}" rx="${n0(rx)}" ry="${n0(rx / 1.4)}" style="--r:${n0(r() * 180)}deg"/>`
    }
    svg += '</g>'
    acc.pieces.push({ layer: sp.layer, x0: n0(sp.x - 40), x1: n0(sp.x + 180), prio: 4, svg })
    any = true
  }
  if (any) {
    // chiều/sáng sớm (daylight < .7): khói ăn ánh nắng xiên
    const mid = ctx.daylight < 0.7 ? 'color-mix(in oklab,var(--s1),var(--e1) 20%)' : 'var(--s2)'
    acc.defs.set(
      'sm',
      `<radialGradient id="ac-sg"><stop offset="0" style="stop-color:var(--s1)"/><stop offset=".55" style="stop-color:${mid}" stop-opacity=".72"/><stop offset="1" style="stop-color:var(--s2)" stop-opacity="0"/></radialGradient>`,
    )
    acc.css.set(
      'sm',
      `.ac-sm{fill:url(#ac-sg);transform-box:fill-box;transform-origin:50% 50%;opacity:0}` +
        // mỗi cụm một shorthand đủ, độ trễ trong cùng luật (ghi đè animation-delay lên shorthand có var() kéo về luồng chính)
        Array.from({ length: SM_N }, (_, i) => `.ac-s${i}{animation:ac-sm ${SM_P}s ${i ? `calc(var(--dl) - ${f3((i * SM_P) / SM_N)}s)` : 'var(--dl)'} linear infinite}`).join('') +
        `@keyframes ac-sm{0%{transform:translate(0,0) skewX(0deg) rotate(var(--r)) scale(.35);opacity:0}8%{opacity:1}` +
        `45%{transform:translate(calc(var(--wind)*30px + 4px),-56px) skewX(calc(var(--wind)*12deg)) rotate(calc(var(--r) + 20deg)) scale(1.5);opacity:.78}` +
        `100%{transform:translate(calc(var(--wind)*100px + 14px),-140px) skewX(calc(var(--wind)*12deg)) rotate(calc(var(--r) + 45deg)) scale(2.2);opacity:0}}`,
    )
  }
}

export const actors: ActorsModule = {
  build(ctx, spots) {
    const acc: Acc = { pieces: [], defs: new Map(), css: new Map() }
    cats(ctx, spots, acc)
    butterflies(ctx, spots, acc)
    fireflies(ctx, spots, acc)
    perches(ctx, spots, acc)
    owl(ctx, spots, acc)
    flock(ctx, spots, acc)
    lanterns(ctx, spots, acc)
    smoke(ctx, spots, acc)
    return { pieces: acc.pieces, defs: [...acc.defs.values()].join(''), css: [...acc.css.values()].join('') }
  },
}
