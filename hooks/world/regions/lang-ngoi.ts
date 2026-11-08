// KHỐI lang-ngoi (x2700 z.92): 4 mảng — trời sáng · đồi xa trong sương (sáng-vừa) · dải mái ngói & tường vôi (vừa, nằm ngang 1/3 dưới)
//   · đất tiền cảnh tối dần xuống đáy + luỹ tre/chuối tối hai mép. Tiêu điểm: GIẾNG + cây khế ở 1/3 phải (x≈67%), sân gạch sáng quanh giếng,
//   lối mòn chữ S quét từ góc phải dưới lên giếng. Bỏ: ô lò cò, gà, diều, guốc, hàng cau giữa trời, cổng & loa (vụn/nét dọc). Màn sương
//   phối cảnh phủ tầng giữa–xa (nhà B, C, D, đồi) → 3 tầng giá trị: gần đậm (A, giếng, khế) · giữa vừa · xa nhạt ngả màu trời.
// KHỐI gieng-lang (x2626 z1.16, nới khung: nhà hai mép trọn vẹn, giếng ≈77% & khế ≈70% bề ngang): 4 mảng — trời · mái & tường (vừa) · sân gạch sáng ấm (đỡ tiêu điểm) · cỏ tiền cảnh tối;
//   giếng tách khỏi nền nhờ bóng tán đổ lên sân & viền sáng theo hướng nắng; ao (trái) và đống rơm nón (phải) là 2 vật phụ lùi.
// Vùng "Làng mái ngói" (x 1800–3600): xóm Bắc Bộ rêu phong, dựng theo CHIỀU SÂU chứ không xếp hàng mặt tiền.
//  · Tầng trước: nhà A ba gian (to, hạ thấp), ao làng soi bóng, đường làng từ cổng vào.
//  · Tầng giữa: nhà B nhìn xiên 3/4 lộ đầu hồi bít đốc đón nắng (bậc đốc, lỗ thông gió, gian bếp, ống khói); nhà C cũ, thấp, cửa xanh.
//  · Tầng sau: nhà D nhỏ, nhạt sương, khuất sau tán khế; hoa giấy phủ trụ hồi; một ô cửa sổ không bao giờ tắt đèn.
//  · Tiêu điểm: GIẾNG LÀNG ở 1/3 phải, cành khế rủ làm khung, lối ngõ đất dẫn mắt từ đáy khung lên.
//  · Câu chuyện: rùa đá khổng lồ cõng bia ngủ dưới rêu cạnh cổng làng (lộ mai, đầu, một mắt nhắm; khăn đỏ ai buộc);
//    đáy giếng luôn soi một bầu trời KHÁC giờ (trưa thấy trăng khuyết & sao, đêm thấy trời xanh có mây).
// Theo giờ: cửa sổ, đèn hiên, bếp đỏ lửa, gà mổ thóc ban ngày. Theo mùa: khế hoa/quả, dâm bụt, phơi thóc, đèn ông sao,
// Tết (câu đối, cành đào, cây nêu, đèn lồng). Theo trời: mưa cất đồ phơi, chum hứng giọt, vũng nước & ao gợn; tuyết phủ mép mái.
import type { Ctx, Layer, Piece, Region, Spot } from '../types'
import { fbm, ground, n0, type Pt } from '../util'

type Rn = () => number
const N = n0
/** Số gọn: tối đa 2 chữ số thập phân, bỏ số 0 đầu. */
const f2 = (v: number) => String(Math.round(v * 100) / 100).replace(/^(-?)0\./, '$1.')
const td = (d: string) => d.replace(/ -/g, '-')
const rr = (x: number, y: number, w: number, h: number) => `M${N(x)} ${N(y)}h${N(w)}v${N(h)}h${-N(w)}z`
const el = (cx: number, cy: number, rx: number, ry: number) =>
  `M${N(cx - rx)} ${N(cy)}a${N(rx)} ${N(ry)} 0 1 0 ${N(2 * rx)} 0a${N(rx)} ${N(ry)} 0 1 0 ${-N(2 * rx)} 0`
const P = (c: string, d: string, a = '') => (d ? `<path class="${c}" d="${td(d)}"${a}/>` : '')
const Fu = (id: string, d: string, a = '') => `<path fill="url(#${id})" d="${td(d)}"${a}/>`
const O = (o: number) => ` opacity="${f2(o)}"`
const G = (x: number, y: number, s: string, k = 1, ky = k) =>
  s ? `<g transform="translate(${N(x)} ${N(y)})${k === 1 && ky === 1 ? '' : `scale(${f2(k)}${ky === k ? '' : ' ' + f2(ky)})`}">${s}</g>` : ''
const U = (id: string, x: number, y: number, a = '') => `<use href="#ln-${id}"${N(x) ? ` x="${N(x)}"` : ''}${N(y) ? ` y="${N(y)}"` : ''}${a}/>`
/** <use> có tỉ lệ / lật ngang / xoay. */
const UT = (id: string, x: number, y: number, k: number, flip = false, a = '', rot = 0) =>
  `<use href="#ln-${id}" transform="translate(${N(x)} ${N(y)})${rot ? `rotate(${N(rot)})` : ''}${k === 1 && !flip ? '' : `scale(${flip ? `${f2(-k)} ${f2(k)}` : f2(k)})`}"${a}/>`
const glowC = (cx: number, cy: number, r: number) => `<circle fill="url(#gw)" cx="${N(cx)}" cy="${N(cy)}" r="${N(r)}"/>`
/** Nét tự do một lần (màu & bề dày riêng) — rẻ hơn thêm class. */
const SK = (c: string, w: number, d: string, o = 1) => `<path style="fill:none;stroke:var(--${c});stroke-width:${w}${o < 1 ? `;opacity:${f2(o)}` : ''}" d="${td(d)}"/>`
/** Chấm tròn (hoa, bèo, lá rụng) = đoạn dài 0 với đầu tròn; toạ độ m tương đối cho gọn. */
function dots(c: string, pts: Pt[], w = 3): string {
  if (!pts.length) return ''
  let d = ''
  let px = 0
  let py = 0
  pts.forEach(([x, y], i) => {
    const X = N(x)
    const Y = N(y)
    d += (i ? `m${X - px} ${Y - py}` : `M${X} ${Y}`) + 'h0'
    px = X
    py = Y
  })
  return `<path class="ln-dt" style="stroke:var(--${c})${w === 3 ? '' : `;stroke-width:${w}`}" d="${td(d)}"/>`
}

const mid = (a: Pt, b: Pt): Pt => [N((a[0] + b[0]) / 2), N((a[1] + b[1]) / 2)]
/** Vòng kín mượt (Q qua trung điểm), toạ độ tương đối. */
function loop(pts: Pt[]): string {
  const r = pts.map(([x, y]) => [N(x), N(y)] as Pt)
  const n = r.length
  let c = mid(r[n - 1] as Pt, r[0] as Pt)
  let d = `M${c[0]} ${c[1]}`
  for (let i = 0; i < n; i += 1) {
    const p = r[i] as Pt
    const m = mid(p, r[(i + 1) % n] as Pt)
    d += `q${p[0] - c[0]} ${p[1] - c[1]} ${m[0] - c[0]} ${m[1] - c[1]}`
    c = m
  }
  return d + 'z'
}
/** Đường mở mượt đi qua điểm đầu & cuối. */
function line(pts: Pt[]): string {
  const r = pts.map(([x, y]) => [N(x), N(y)] as Pt)
  let c = r[0] as Pt
  let d = `M${c[0]} ${c[1]}`
  if (r.length === 2) return d + `l${(r[1] as Pt)[0] - c[0]} ${(r[1] as Pt)[1] - c[1]}`
  for (let i = 1; i < r.length - 1; i += 1) {
    const p = r[i] as Pt
    const m = i === r.length - 2 ? (r[i + 1] as Pt) : mid(p, r[i + 1] as Pt)
    d += `q${p[0] - c[0]} ${p[1] - c[1]} ${m[0] - c[0]} ${m[1] - c[1]}`
    c = m
  }
  return d
}
/** Khối hữu cơ; zig > 0 cho mép lá răng cưa (tán lá). */
function lump(r: Rn, cx: number, cy: number, rx: number, ry: number, n = 7, rough = 0.3, zig = 0): string {
  const pts: Pt[] = []
  const ph = r() * 6.28
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * 6.283 + ph
    const k = (1 + rough * (Math.sin(a * 3 + ph) * 0.5 + r() - 0.5)) * (i % 2 ? 1 - zig : 1)
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return loop(pts)
}
/** Dải kín mép trên top(x) – mép dưới bot(x). */
function strip(x0: number, x1: number, step: number, top: (x: number) => number, bot: (x: number) => number): string {
  const a: Pt[] = []
  const b: Pt[] = []
  const n = Math.max(2, Math.round((x1 - x0) / step))
  for (let i = 0; i <= n; i += 1) {
    const x = x0 + ((x1 - x0) * i) / n
    a.push([x, top(x)])
    b.push([x, bot(x)])
  }
  return line([...a, ...b.reverse()]) + 'z'
}
/** Vòm lá tơ: mép trên răng cưa, mép dưới rủ tua. Gốc (cx, by) ở đáy giữa. */
function feather(r: Rn, cx: number, by: number, w: number, h: number, n = 14): string {
  const top: Pt[] = []
  const bot: Pt[] = []
  for (let i = 0; i <= n; i += 1) {
    const t = i / n
    const hh = h * (0.3 + 0.7 * Math.pow(Math.sin(Math.PI * t), 0.6))
    top.push([cx - w / 2 + w * t + (r() - 0.5) * 6, by - hh - (i % 2 ? h * 0.08 : 0)])
  }
  for (let i = n; i >= 0; i -= 2) {
    const t = i / n
    bot.push([cx - w * 0.46 + w * 0.92 * t, by + (i % 4 ? h * 0.12 : 0)])
  }
  return line([...top, ...bot]) + 'z'
}

// ───────────────────────── hằng số nhà ─────────────────────────
// Toạ độ nhà: gốc ở chân trụ hồi trái, y âm hướng lên. Mép mái/hiên E, nóc RG, mặt nền PL, trụ hồi GW, gian BW.
const E = -100
const RG = -196
const PL = -14
const GW = 24
const BW = 100

/** Độ võng parabol tại x (0 ở hai đầu, s ở giữa). */
const sagAt = (x: number, x0: number, x1: number, s: number) => {
  const t = (2 * (x - x0)) / (x1 - x0) - 1
  return s * (1 - t * t)
}

/**
 * Mái ngói mặt trước x0..x1: ngói võng giữa ~10px, thớ hàng cong theo võng, vài viên mới thay (r1) & ô vỡ (k1);
 * rêu tụ mép ngói dưới, khuất sau trụ hồi & dọc bờ nóc, vệt rêu chảy theo rãnh âm; bờ nóc vữa dày 10, hai đầu vểnh.
 */
function roof(r: Rn, x0: number, x1: number, moss: number): string {
  const w = x1 - x0
  const cx = N((x0 + x1) / 2)
  const sr = 10
  const se = 4
  const ey = E + 2
  const Q = (y: number, s: number) => `Q${cx} ${N(y + 2 * s)}`
  const arc = (y: number, s: number, a = x0, b = x1) => `M${a} ${y}${Q(y, s)} ${b} ${y}`
  let s = Fu('ln-t', `M${x0} ${RG}${Q(RG, sr)} ${x1} ${RG}V${ey}${Q(ey, se)} ${x0} ${ey}z`)
  let cr = ''
  for (let i = 1; i < 5; i += 1) cr += `M${x0} ${N(RG + ((ey - RG) * i) / 5)}q${N(w / 2)} ${N(2 * (sr + ((se - sr) * i) / 5))} ${w} 0`
  let nw = ''
  for (let i = 0; i < 2; i += 1) {
    const x = x0 + 1 + 10 * Math.floor((r() * (w - 24)) / 10)
    const row = 1 + Math.floor(r() * 5)
    nw += rr(x, RG + row * 14 + sagAt(x, x0, x1, sr - row), 10, 14 * (1 + (i % 2)))
  }
  const bx = x0 + 11 + 10 * Math.floor((r() * (w - 40)) / 10)
  s += P('ln-cr', cr) + P('r1', nw) + P('k1', `M${bx} ${N(RG + 46 + sagAt(bx, x0, x1, 7))}h7l-2 5 2 6h-7z`, O(0.45))
  // đầu ngói tròn & rêu mép ngói theo võng
  s += P('ln-te', arc(ey + 1, se)) + P('ln-mo', arc(ey - 4, se, x0 + 3, x1 - 3), ` stroke-dashoffset="${N(r() * 90)}"`) + P('ln-mp', arc(ey - 7, se, x0 + 3, x1 - 3), ` stroke-dashoffset="${N(r() * 90)}"`)
  // bờ nóc vữa, hai đầu vểnh, mép trên hắt sáng, rêu dưới bờ nóc
  const b0 = x0 + 4
  const b1 = x1 - 4
  s += P('s3', `M${b0} ${RG + 3}Q${b0 - 2} ${RG - 8} ${b0 + 2} ${RG - 20}Q${b0 + 5} ${RG - 10} ${b0 + 12} ${RG - 8}${Q(RG - 8, sr)} ${b1 - 12} ${RG - 8}Q${b1 - 5} ${RG - 10} ${b1 - 2} ${RG - 20}Q${b1 + 2} ${RG - 8} ${b1} ${RG + 3}${Q(RG + 3, sr)} ${b0} ${RG + 3}z`)
  s += P('ln-rh', arc(RG - 7, sr, b0 + 10, b1 - 10)) + U('mc', x0 + 1, ey - 4) + UT('mc', x1 - 1, ey - 4, 1, true) + U('mc', x0 + 2, RG + 12) + U('mc', cx - 10 * Math.floor(r() * 6), RG + 12 + sr)
  // vệt rêu chảy theo rãnh âm: từ bờ nóc xuống & từ mép ngói lên
  for (let i = 0; i < 2 + Math.round(moss); i += 1) {
    const x = x0 + 17 + 10 * Math.floor((((i + r()) / (2 + Math.round(moss))) * (w - 40)) / 10)
    s += i % 2 ? `<use href="#ln-ms" transform="translate(${x} ${N(ey - 6 + sagAt(x, x0, x1, se))})scale(1 -.7)"/>` : U('ms', x, RG + 10 + sagAt(x, x0, x1, sr))
  }
  return s + Fu('ln-pg', `M${x0} ${RG}H${x1}V${ey}H${x0}z`)
}

function mossBand(r: Rn): string {
  const W = 2 * GW + 3 * BW
  const mp: Pt[] = []
  for (let x = -6; x <= W + 6; x += 38) mp.push([x, -3 - r() * (x < 60 || x > W - 60 ? 16 : 7)])
  return P('m3', line(mp) + `V2H-6z`, O(0.8)) + P('m2', line(mp.map(([x, y]) => [x, y * 0.5 - 1] as Pt)) + `V2H-6z`)
}

// ───────────────────────── defs (tạo một lần, tất định) ─────────────────────────
const sc = (v: string, o: number) => `style="stop-color:var(--${v})" stop-opacity="${f2(o)}"`
const pat = (id: string, w: number, h: number, s: string, a = '') => `<pattern id="ln-${id}" width="${w}" height="${h}"${a} patternUnits="userSpaceOnUse">${s}</pattern>`
const JAR = 'M-11-40q-12 5-15 18q-2 14 8 22h36q10-8 8-22q-3-13-15-18z'
const WIN = 'M30-74h40v34H30z'
const DOOR = 'M7-83h86v69H7z'
let defsMemo = ''

function buildDefs(ctx: Ctx): string {
  if (defsMemo) return defsMemo
  const r = ctx.rng('ln-defs')
  // trụ hồi bít đốc (chính diện): vôi vàng, mép trái hắt sáng, phải khuất, gờ bậc đọng rêu, ố nước, ẩm chân
  const top = RG - 14
  let led = ''
  let mo = ''
  let st = ''
  for (const y of [E - 5, (E + RG) / 2 - 6]) {
    led += rr(-3, y, GW + 6, 5)
    mo += lump(r, 7 + r() * 10, y - 1, 9, 2.6, 5, 0.3)
    st += rr(4 + r() * 12, y + 7, 2, 14 + r() * 34)
  }
  const gable =
    P('w1', rr(0, top, GW, PL - top)) + P('sh', rr(GW - 7, top, 7, PL - top)) + P('z3', `M1 ${top + 2}V${PL - 3}`, O(0.8)) + P('k2', st, O(0.16)) +
    P('m3', `M0 ${PL}v-18l6 4 5-8 6 6 7-3v19z`, O(0.35)) + P('s2', led + `M-2 ${top - 2}h${GW + 4}l-4-8h${-GW + 4}z`) + P('m2', mo) + Fu('ln-pg', rr(0, top, GW, PL - top))
  const tile = `<path class="r2" d="M0 0h30v110H0z"/><path class="r1" d="M1 0h4v110H1zM11 0h3v110h-3zM21 0h4v110h-4z"/><path class="r3" d="M6 0h3v110H6zM15 0h4v110h-4zM26 0h3v110h-3z" opacity=".75"/><path class="hl" d="M2 0h1v110H2zM22 0h1v110h-1z"/><path class="r1" d="M6 14h3v28H6zM15 70h4v28h-4zM26 42h3v14h-3z" opacity=".8"/><path class="k1" d="M1 56h4v14H1zM21 84h4v14h-4zM11 28h3v14h-3z" opacity=".16"/><path fill="url(#ln-r)" d="M0 0h30v110H0z"/>`
  // cửa bức bàn: bốn cánh, mạch ván lệch, một cánh sẫm một cánh bạc, ô song thoáng, chân cửa bám bẩn (dùng lật để đổi)
  const xs = [7, 28, 50, 71, 93]
  const X = (i: number) => xs[i] as number
  let seam = ''
  for (let i = 0; i < 4; i += 1) seam += `M${N(X(i) + 6 + r() * (X(i + 1) - X(i) - 12))}-83v${i % 2 ? 69 : N(24 + r() * 22)}`
  const leaf = (i: number) => rr(X(i), -83, X(i + 1) - X(i), 69)
  const door = `<path d="${DOOR}"/>` + P('b1', leaf(1), O(0.32)) + P('b3', leaf(3), O(0.3)) + P('ln-sm', seam) + P('k1', 'M28-83h1v69h-1zM50-83h1v69h-1zM71-83h1v69h-1z', O(0.55)) + P('b1', 'M7-58h86v3H7zM7-35h86v3H7z') + P('k1', 'M7-95h86v11H7z') + Fu('ln-s', 'M7-95h86v11H7z') + P('k1', 'M7-26h86v12H7z', O(0.14))
  // nhành tre dài (dọc +x, rủ cuối) & bụi tre (5 thân vồng, 2 nhành mỗi thân, gốc rậm) — tĩnh; lắc cả bụi ở nơi đặt
  const plume = () => {
    const pts: Pt[] = [[0, 0], [30, -7], [60, -6], [88, 4], [112, 22]]
    let s = P('l4', line([...pts.map(([x, y]) => [x, y - 5] as Pt), ...pts.slice().reverse().map(([x, y]) => [x, y + 9] as Pt)]) + 'z')
    for (let i = 0; i < 7; i += 1) {
      const t = i / 6
      s += U(i % 3 === 1 ? 'bg' : 'bf', t * 108, -7 * Math.sin(Math.PI * t * 0.9) + 26 * Math.pow(t, 3) - 2)
    }
    return s
  }
  const clump = () => {
    let c1 = ''
    let c2 = ''
    let pl = ''
    let xMin = 0
    let xMax = 0
    let yMin = 0
    for (let i = 0; i < 5; i += 1) {
      const bx = -22 + i * 11 + (r() - 0.5) * 4
      const h = 220 + r() * 100
      const lx = bx * 3 + (r() - 0.5) * 50
      const C: Pt = [bx + lx * 0.05, -h * 0.7]
      const E1: Pt = [bx + lx, -h]
      const seg = `M${N(bx)} 0q${N(lx * 0.05)} ${N(-h * 0.7)} ${N(lx)} ${N(-h)}`
      if (i === 2) c2 += seg
      else c1 += seg
      for (const t of [0.64, 1]) {
        const px = (1 - t) ** 2 * bx + 2 * (1 - t) * t * C[0] + t * t * E1[0]
        const py = 2 * (1 - t) * t * C[1] + t * t * E1[1]
        const dx = 2 * (1 - t) * (C[0] - bx) + 2 * t * (E1[0] - C[0])
        const dy = 2 * (1 - t) * C[1] + 2 * t * (E1[1] - C[1])
        const ang = N((Math.atan2(dy, dx) * 180) / Math.PI + (lx >= 0 ? 20 : -20))
        const k = f2(0.6 + 0.3 * t * r() + 0.15)
        pl += `<use href="#ln-pl" transform="translate(${N(px)} ${N(py)})rotate(${ang})scale(${k} ${lx >= 0 ? k : '-' + k})"/>`
        xMin = Math.min(xMin, px)
        xMax = Math.max(xMax, px)
        yMin = Math.min(yMin, py)
      }
    }
    return (
      P('l4', feather(r, (xMin + xMax) / 2, yMin * 0.3, (xMax - xMin) * 0.6, -yMin * 0.5, 14), O(0.85)) +
      `<g class="ln-cu"><path id="ln-cq" d="${td(c1)}"/></g>` + P('ln-cv', c2) + `<use href="#ln-cq" class="ln-cn"/>` + pl +
      P('l4', feather(r, 0, 4, 96, 76, 12)) + P('l3', feather(r, -10, -6, 62, 52, 9)) + U('bg', -30, -40) + U('bf', 20, -44)
    )
  }
  const lau = () => {
    let d = ''
    let d2 = ''
    for (let i = 0; i < 7; i += 1) {
      const bx = i * 12 + r() * 6 - 40
      const hh = 100 + r() * 90
      const lean = (r() - 0.4) * 60
      const seg = `M${N(bx)} 0q${N(lean * 0.3)} ${N(-hh * 0.6)} ${N(lean)} ${N(-hh)}q${N(-lean * 0.5 + 4)} ${N(hh * 0.5)} ${N(-lean + 8)} ${N(hh)}z`
      if (i % 3) d += seg
      else d2 += seg
    }
    // TĨNH (được <use> tham chiếu): lắc .sw3 bọc ở từng chỗ dùng
    return P('g2', d) + P('g1', d2) + P('w3', 'M-14-170h3v6h-3zM18-180h3v6h-3zM2-196h3v6h-3z', O(0.8))
  }
  const rr2 = ctx.rng('ln-mai2')
  defsMemo =
    pat('t', 30, 110, tile, ' y="-200"') +
    pat('b', 14, 8, `<path class="r2" d="M0 0h14v8H0z"/><path class="r1" d="M7 4h6v3H7z" opacity=".6"/><path class="s2" d="M0 3h14v1H0zM0 7h14v1H0zM6 0h1v3H6zM13 4h1v3h-1z" opacity=".8"/>`) +
    // sân gạch Bát Tràng nhìn xiên; vài ô chênh màu cho khỏi đều
    pat('c', 60, 16, `<path class="r1" d="M0 0h60v16H0z"/><path class="w2" d="M0 0h60v16H0z" opacity=".38"/><path class="r2" d="M0 0h15v4H0zM15 4h15v4H15zM45 8h15v4H45zM30 12h15v4H30z" opacity=".26"/><path class="s2" d="M0 3h60v1H0zM0 7h60v1H0zM0 11h60v1H0zM0 15h60v1H0zM14 0h1v16h-1zM29 0h1v16h-1zM44 0h1v16h-1zM59 0h1v16h-1z" opacity=".42"/>`) +
    pat('s', 7, 9, `<path class="b2" d="M0 0h3v9H0z"/><path class="b3" d="M0 0h1v9H0z"/>`) +
    pat('k', 7, 9, `<path class="k1" d="M0 0h3v9H0z"/>`) +
    // bóng mái răng cưa theo đầu ngói + dịu dần (một ô 10×56 lặp dọc tường dưới hiên)
    pat('q', 10, 56, `<path class="k1" d="M0 0h10v30H0zM.5 30a4.5 4.5 0 0 0 9 0z" opacity=".26"/><path fill="url(#ln-e)" d="M0 35h10v21H0z" opacity=".4"/>`, ' y="-100"') +
    // ẩm chân tường, mép loang
    pat('dm', 50, 30, `<path class="m3" d="M0 30V14q5-4 9 0q5 6 11-2q6-8 12 0q6 6 10-2q4-4 8 4V30z" opacity=".32"/>`, ' y="-44"') +
    pat('lv', 6, 4, `<path class="k1" d="M0 3h6v1H0z" opacity=".45"/><path class="hl" d="M0 0h6v1H0z"/>`) +
    pat('pg', 173, 97, `<path class="k1" d="M8 12q34-10 58 6t-4 30q-36 10-52-10t-2-26zM96 52q30-6 54 8q14 14-8 24q-30 8-46-6q-12-14 0-26zM118 4q20-2 30 8q-6 12-24 8z" opacity=".05"/><path class="hl" d="M62 50q22-6 34 6q4 14-18 18q-24 2-26-10q0-10 10-14zM140 30q18 0 26 10q-8 10-26 6zM0 70q16-4 26 8q-6 14-26 10z" opacity=".3"/>`) +
    `<linearGradient id="ln-z" x2="0" y2="1"><stop offset="0" style="stop-color:var(--haze)" stop-opacity="0"/><stop offset=".8" style="stop-color:var(--haze)" stop-opacity=".52"/><stop offset="1" style="stop-color:var(--haze)" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="ln-e" x2="0" y2="1"><stop offset="0" ${sc('k1', 0.62)}/><stop offset="1" ${sc('k1', 0)}/></linearGradient>` +
    `<linearGradient id="ln-r" x2="0" y2="1"><stop offset="0" ${sc('s1', 0.32)}/><stop offset=".3" ${sc('s1', 0)}/><stop offset="1" ${sc('k1', 0.38)}/></linearGradient>` +
    `<linearGradient id="ln-h"><stop offset="0" ${sc('s1', 0.3)}/><stop offset=".4" ${sc('s1', 0)}/><stop offset="1" ${sc('k1', 0.5)}/></linearGradient>` +
    `<linearGradient id="ln-a" x2="0" y2="1"><stop offset="0" style="stop-color:var(--a1)"/><stop offset=".6" style="stop-color:var(--a2)"/><stop offset="1" style="stop-color:var(--a3)"/></linearGradient>` +
    `<g id="ln-gb">${gable}</g><g id="ln-dr">${door}</g>` +
    `<g id="ln-wn"><path class="k1" d="${WIN}"/><path fill="url(#ln-s)" d="${WIN}"/><path class="ln-fr" d="${WIN}"/><path class="s2" d="M26-39h48v4H26z"/><path class="k2" d="M31-35h3v12h-3zM64-35h2v19h-2z" opacity=".16"/></g>` +
    `<g id="ln-gs"><use href="#ln-wn"/><path class="p2" d="M14-76h14v38H14zM72-76h14v38H72z"/><path fill="url(#ln-lv)" d="M15-74h12v34H15zM73-74h12v34H73z"/><path class="sh" d="M72-76h14v38H72z"/></g>` +
    `<g id="ln-wg"><path class="e2" d="${WIN}" opacity=".9"/><path fill="url(#ln-k)" d="${WIN}"/><circle fill="url(#gw)" cx="50" cy="-57" r="48"/></g>` +
    `<g id="ln-og"><path class="e2" d="M29-83h21v69H29z" opacity=".55"/><path class="e1" d="M33-50h13v36H33z" opacity=".3"/><circle fill="url(#gw)" cx="40" cy="-44" r="50" opacity=".8"/><path class="e2" d="M29-14h21l34 32H-5z" opacity=".1"/></g>` +
    // vôi bong lộ gạch, mép sứt
    `<g id="ln-sp"><path class="w2" d="${td(lump(r, 0, 0, 15, 10, 9, 0.55, 0.3))}"/><path fill="url(#ln-b)" d="${td(lump(r, 1, 1, 11, 7, 8, 0.5, 0.25))}"/><path class="sh" d="M-9 5q9 5 20 0l-2 3q-8 3-16 0z"/></g>` +
    // cụm rêu 3 sắc (đỉnh m1, thân m2, khuất m3) & vệt rêu chảy theo rãnh, nhạt dần
    `<g id="ln-mc"><path class="m3" d="${td(lump(r, 12, -3, 14, 5, 8, 0.5, 0.3))}"/><path class="m2" d="${td(lump(r, 9, -5, 9, 3.4, 6, 0.5, 0.3))}"/><path class="m1" d="${td(lump(r, 7, -7, 4, 1.6, 5, 0.4))}" opacity=".85"/></g>` +
    `<g id="ln-ms"><path class="m3" d="M-2 0q-1 22 2 44q3-22 2-44z" opacity=".25"/><path class="m2" d="M-2.5 0q0 10 2.5 18q2.5-8 2.5-18z" opacity=".6"/></g>` +
    // MỘT mái ngói ba gian dùng chung: nhà A nguyên bản; C & D thu hẹp còn hai gian (ngói hẹp = xa hơn); B nhìn xiên 3/4 (affine)
    `<g id="ln-r3">${roof(rr2, GW - 1, GW + 3 * BW + 1, 1)}</g>` +
    // rêu chân tường cả bề ngang nhà ba gian, mép fbm, dày ở hai đầu hồi
    `<g id="ln-mb">${mossBand(r)}</g>` +
    // bụi dâm bụt
    `<g id="ln-lf"><path class="l4" d="${td(lump(r, 2, -18, 30, 19, 9, 0.3, 0.26))}"/><path class="l3" d="${td(lump(r, -6, -24, 22, 14, 8, 0.3, 0.26))}"/><path class="l2" d="${td(lump(r, -12, -30, 12, 8, 6, 0.4, 0.2))}"/><path class="l1" d="${td(lump(r, -15, -33, 5, 3, 5, 0.4))}" opacity=".8"/></g>` +
    `<g id="ln-db"><path class="ao" d="${el(0, 1, 30, 4)}"/><use href="#ln-lf"/></g>` +
    `<g id="ln-tf"><path class="g3" d="M-8 0q-2-9-7-14q7 5 9 14zM-3 0q0-12 3-19q-1 10 1 19zM3 0q3-8 9-12q-5 6-6 12z"/><path class="g1" d="M-5 0q-1-10 1-16q1 8 0 16zM6 0q2-6 6-9q-3 4-4 9z"/></g>` +
    `<g id="ln-tg"><use href="#ln-tf"/><path class="f3" d="M-1-21h3v3h-3zM11-13h3v3h-3zM-15-16h3v3h-3z"/></g>` +
    `<g id="ln-th"><use href="#ln-tf"/><path class="f2" d="M-1-21h3v3h-3zM11-13h3v3h-3zM-14-15h3v3h-3z"/></g>` +
    `<g id="ln-fn"><path class="g3" d="M0 0q4-10 15-14q-9 6-13 14zM0 0q-3-9-13-11q9 4 11 11z"/><path class="g2" d="M2-4q6-1 10-7l-10 5zM-2-4q-5-1-8-5l7 3zM5-8q4-3 8-3l-7 2z"/></g>` +
    `<g id="ln-j"><path class="ao" d="${el(0, 0, 22, 4)}"/><path class="b2" d="${JAR}"/><path fill="url(#ln-h)" d="${JAR}"/><path class="b1" d="M-12-43h24v4h-24z"/><path class="k1" d="${el(0, -42, 10, 2)}"/><path class="m3" d="M-19-2q19 4 38 0l-2-6q-17 4-34 0z" opacity=".7"/></g>` +
    `<g id="ln-bf"><path class="l3" d="M0 0q9 1 17 8q-10-3-17-7zM5 2q5 6 5 16q-3-8-6-15zM12 5q9 0 17 6q-10-3-17-5zM15 6q2 8 0 15q-2-8-1-15zM22 9q5 5 5 13q-3-7-6-12z"/><path class="l1" d="M1 0q10-3 18-1q-9 1-18 2zM9 3q8 3 12 10q-6-5-12-9z"/></g>` +
    `<g id="ln-bg" transform="scale(-1 1)"><use href="#ln-bf"/></g>` +
    `<g id="ln-pl">${plume()}</g><g id="ln-cl">${clump()}</g><g id="ln-la">${lau()}</g>` +
    `<g id="ln-bn"><path d="M0 0q20-13 44-12q24 1 38 9q-14 12-40 13q-26 1-42-10z"/><path class="sh" d="M0 0q36 6 82-3q-14 12-40 13q-26 1-42-10z"/><path class="ln-mr" d="M0 0q40-5 82-3"/><path class="ln-tt" d="M26 2l2 9M48 2l3 9M62 0l3 7M36-2l1-9M58-4l2-8"/></g>` 
  return defsMemo
}

const CSS =
  `.ln-cu{fill:none;stroke:var(--l3);stroke-width:5;stroke-linecap:round}.ln-cv{fill:none;stroke:var(--g2);stroke-width:4;stroke-linecap:round}.ln-cn{fill:none;stroke:var(--k2);stroke-width:5.6;stroke-dasharray:2 30;opacity:.5}` +
  `.ln-te,.ln-cr,.ln-rh,.ln-sc,.ln-mo,.ln-mp,.ln-co,.ln-fr,.ln-sm,.ln-ln,.ln-wh,.ln-fm,.ln-mt,.ln-tw,.ln-sw,.ln-sx,.ln-rp,.ln-dl,.ln-rr,.ln-lg,.ln-tt,.ln-cd,.ln-mr,.ln-dt,.ln-dp{fill:none;stroke-linecap:round}` +
  `.ln-te{stroke:var(--r3);stroke-width:7;stroke-dasharray:.1 10}.ln-cr{stroke:var(--r3);stroke-width:1.6;stroke-dasharray:40 2 25 3 60 2;opacity:.6}.ln-rh{stroke:var(--s1);stroke-width:1.6;opacity:.75}.ln-sc{stroke:var(--k1);stroke-width:9;stroke-dasharray:.1 10}` +
  `.ln-mo{stroke:var(--m3);stroke-width:7;stroke-dasharray:18 5 34 9 7 4 26 14 11 6;opacity:.85}.ln-mp{stroke:var(--m2);stroke-width:3.6;stroke-dasharray:9 14 20 8 5 22 14 10}` +
  `.ln-co{stroke:var(--b2);stroke-width:86;stroke-linecap:butt}.ln-fr{stroke:var(--b1);stroke-width:3}.ln-sm{stroke:var(--k1);stroke-width:.8;opacity:.35}.ln-ln{stroke:var(--k2);stroke-width:1}.ln-wh{stroke:var(--k1);stroke-width:2.6}` +
  `.ln-fm{stroke:var(--p2);stroke-width:2.6;stroke-linejoin:round}.ln-mt{stroke:var(--x2);stroke-width:2}.ln-tw{stroke:var(--b1);stroke-width:2}.ln-sw{stroke:var(--d1);stroke-width:1.2;opacity:.75}.ln-sx{stroke:var(--w2);stroke-width:1.6}` +
  `.ln-rp{stroke:var(--w2);stroke-width:8;stroke-dasharray:1.5 2;stroke-linecap:butt}` +
  `.ln-dl{stroke:var(--d2);stroke-width:.8;opacity:.6}.ln-rr{stroke:var(--a1);stroke-width:1}` +
  `.ln-lg{stroke:var(--b3);stroke-width:6;stroke-dasharray:.1 9}.ln-tt{stroke:var(--k1);stroke-width:1;opacity:.3}.ln-cd{stroke:var(--w1);stroke-width:1.4;stroke-dasharray:2 6;opacity:.9}.ln-mr{stroke:var(--g1);stroke-width:1.5;opacity:.7}` +
  `.ln-hz{fill:var(--haze)}.ln-dt{stroke-width:3}` +
  `.ln-dp{stroke:var(--a1);stroke-width:1.6;stroke-dasharray:5 19;stroke-linecap:butt}@keyframes ln-dp{to{transform:translateY(24px)}}` +
  `.ln-hg{transform-box:fill-box;transform-origin:50% 0}` +
  `@keyframes ln-hg{from{transform:rotate(calc(-1deg - var(--wind)*5deg))}to{transform:rotate(calc(1.2deg + var(--wind)*8deg))}}` +
  ''

type Bay = 'd' | 'o' | 'w' | 'g' | 'k'
type HOpt = { far?: boolean; lit: boolean[]; glowDay?: number }

/** Nếp nhà gian, tường hồi bít đốc: nền, tường, gian cửa, cột hiên, bóng mái răng cưa, bóng trụ, ẩm chân, ố, vôi bong, mái, trụ hồi. */
function house(ctx: Ctx, id: string, bays: Bay[], o: HOpt): { s: string; g: string; W: number } {
  const r = ctx.rng('ln-nha-' + id)
  const n = bays.length
  const W = 2 * GW + BW * n
  const iw = W - 2 * GW
  let s = P('s3', rr(-6, PL, W + 12, 15)) + P('w1', rr(GW, E, iw, PL - E))
  let g = ''
  bays.forEach((b, i) => {
    const x = GW + i * BW
    s += b === 'w' ? U('wn', x, 0) : b === 'g' ? U('gs', x, 0) : i % 2 ? `<use href="#ln-dr" class="${b === 'k' ? 'p2' : 'b2'}" transform="matrix(-1 0 0 1 ${x + 100} 0)"/>` : U('dr', x, 0, ` class="${b === 'k' ? 'p2' : 'b2'}"`)
    if (b === 'o') s += P('k1', rr(x + 29, -83, 21, 69))
    if (o.lit[i]) g += U(b === 'o' ? 'og' : 'wg', x, 0)
    if (b !== 'd' && b !== 'o' && b !== 'k' && o.glowDay) s += P('e2', rr(x + 31, -73, 38, 32), O(o.glowDay))
  })
  s += `<path class="ln-co" d="M${GW + 2}-57h${iw - 4}" stroke-dasharray="8 ${N((iw - 12) / n) - 8}"/>`
  // bóng mái đổ xuống tường dưới hiên, mép răng cưa theo đầu ngói; dịu dần; bóng trụ hồi trái đổ lên tường
  s += Fu('ln-h', rr(GW, E, iw, PL - E), O(0.42)) + Fu('ln-pg', rr(GW, E, iw, PL - E)) + Fu('ln-q', rr(GW, E, iw, 56))
  const fine = !o.far && ctx.detail !== 'lite'
  if (fine) s += P('sh', `M${GW} ${E + 30}h15l-7 ${PL - E - 30}h-8z`) + Fu('ln-dm', rr(GW, PL - 30, iw, 30))
  s += (n === 3 ? U('r3', 0, 0) : `<use href="#ln-r3" transform="matrix(.669 0 0 1 8 0)"/>`) + U('gb', 0, 0) + U('gb', W - GW, 0)
  if (fine) s += UT('sp', GW + BW * (n - 1) + 86, -28, 0.8)
  if (!o.far) s += n === 3 ? U('mb', 0, 0) : `<use href="#ln-mb" transform="matrix(.69 0 0 1 0 0)"/>`
  return { s, g, W }
}

/**
 * Nhà B nhìn xiên 3/4: đầu hồi bít đốc hướng trái (đón nắng) có bậc đốc & lỗ thông gió, mặt tiền hai gian
 * (gian bếp mở cửa, đỏ lửa khi nấu tối), mái ngói chung nghiêng theo phối cảnh, ống khói sau bờ nóc.
 * Gốc: chân góc trước–trái mặt tiền.
 */
function houseB(ctx: Ctx, o: { fire: boolean; lit: boolean; snow: boolean }): { s: string; g: string; chim: Pt } {
  const nz = ctx.noise('ln-nha-B')
  const D = 90
  const S = 45
  const dy = 12
  const FW = 228
  const rg = -172
  const ey = E + 2
  const ex = FW - 14
  const ap = rg - 10
  const mx = N(ex / 2)
  // đầu hồi: 8 bậc đốc lên đỉnh, 8 bậc xuống
  let gf = `M0 ${PL}V${E - 8}`
  const ups: Pt[] = []
  let x = 0
  let y = E - 8
  for (let i = 0; i < 8; i += 1) {
    const nx = N((-S * (i + 1)) / 8)
    const ny = N(E - 8 + ((ap - E + 8) * (i + 1)) / 8)
    gf += `h${nx - x}v${ny - y}`
    ups.push([nx + 1, ny + 1])
    x = nx
    y = ny
  }
  for (let i = 0; i < 8; i += 1) {
    const nx = N(-S - ((D - S) * (i + 1)) / 8)
    const ny = N(ap + ((E - dy - 8 - ap) * (i + 1)) / 8)
    gf += `v${ny - y}h${nx - x}`
    x = nx
    y = ny
  }
  gf += `V${PL - dy}z`
  const chim: Pt = [ex - S - 66, rg - 46]
  let s = `<defs><path id="ln-gf" d="${td(gf)}"/></defs>`
  // ống khói (sau bờ nóc), nền, mặt tiền, gian bếp mở, cửa sổ, cột hiên, bóng mái
  s += Fu('ln-b', rr(chim[0] - 9, rg - 42, 18, 54)) + P('s2', rr(chim[0] - 12, rg - 47, 24, 6))
  s += P('s3', `M0 ${PL}L${-D} ${PL - dy}v13L0 ${PL + 15}z` + rr(0, PL, FW + 4, 15))
  s += P('w2', rr(0, E - 2, FW, PL - E + 2)) + Fu('ln-pg', rr(0, E - 2, FW, PL - E + 2)) + U('dr', 12, 0, ' class="b2"') + P('k1', rr(41, -83, 21, 69)) + U('wn', 112, 0)
  s += `<path class="ln-co" d="M14-57h${FW - 30}" stroke-dasharray="8 92"/>`
  s += Fu('ln-q', rr(0, E, FW, 56)) + (ctx.detail !== 'lite' ? Fu('ln-dm', rr(0, PL - 30, FW, 30)) : '')
  // đầu hồi đón nắng: vôi + phủ sáng, ẩm chân, lỗ thông gió, vệt ố dưới lỗ, rêu đọng bậc, vôi bong, mép trước hắt sáng
  s += `<use href="#ln-gf" class="w1"/><use href="#ln-gf" class="hl"/>`
  const gd: Pt[] = []
  for (let xx = 0; xx >= -D; xx -= 45) gd.push([xx, PL + (dy * xx) / D - 8 - Math.abs(fbm(nz, xx / 20, 2.2, 2)) * 34])
  const fine = ctx.detail !== 'lite'
  if (fine) s += P('m3', line(gd) + `L${-D} ${PL - dy}L0 ${PL}z`, O(0.32))
  s += P('s2', el(-S, rg + 24, 8, 10)) + P('k1', el(-S, rg + 24, 5, 7)) + P('m3', `M${-D} ${PL - dy}l${D} ${dy}h${FW}v-8l-40-4-30 6-50-8-40 5-48-4-20 2L0 ${PL - 9}l${-D} ${-dy - 6}z`, O(0.75))
  if (fine) s += UT('sp', -62, -44, 0.9)
  // mái nhìn xiên: ngói nghiêng, thớ hàng, viên mới, đầu ngói, rêu mép, bờ nóc vểnh đầu phải
  s += `<use href="#ln-r3" transform="matrix(.722 0 .459 .755 24 -24)"/>`
  const R0 = -S + 2
  const R1 = ex - S - 6
  const rm = N((R0 + R1) / 2)
  // mép tường hồi phải (nhìn cạnh) nhô cao hơn mái
  s += P('w2', `M${FW - 14} ${PL}V${E - 6}l${-S} ${ap - E + 6}h8l${S} ${E - 6 - ap}V${PL}z`) + P('sh', `M${FW - 8} ${PL}V${E - 6}l${-S} ${ap - E + 6}h2l${S} ${E - 6 - ap}V${PL}z`)
  // tuyết đọng bờ nóc & mép ngói
  if (o.snow) s += `<g transform="matrix(.722 0 .459 .755 24 -24)">${P('w3', `M${GW} ${RG + 2}Q174 ${RG + 22} ${GW + 300} ${RG + 2}V${E - 3}Q174 ${E + 3} ${GW} ${E - 3}z`, O(0.5))}</g>` + P('w3', `M${R0} ${rg - 9}Q${rm} ${rg + 11} ${R1} ${rg - 9}v5Q${rm} ${rg + 16} ${R0} ${rg - 4}zM2 ${ey - 5}Q${mx} ${ey + 7} ${ex - 4} ${ey - 5}v4Q${mx} ${ey + 10} 2 ${ey - 1}z`)
  let g = o.lit ? U('wg', 112, 0) : ''
  if (o.fire) g += `<g class="fl">${P('e1', rr(42, -56, 19, 42), O(0.85))}${glowC(52, -40, 62)}</g>`
  return { s, g, chim }
}

/** Bụi chuối: thân giả bẹ khô, lá to bản rách tua lắc theo gió, buồng & bắp chuối. */
function banana(): string {
  let s = P('ao', el(4, 1, 28, 4)) + P('g3', 'M-17 0q2-37 3-74h5q1 37 3 74zM1 0q2-50 3-100h5q1 50 3 100zM15 0q2-31 3-62h5q1 31 3 62z')
  s += P('d1', 'M-20 0q0-14 6-20l6 4q-3 8-2 16zM-8-62q-14 10-16 40l5-2q2-24 13-34z')
  const L: [number, number, number, number, string][] = [[-11, -74, 1, 200, 'l3'], [7, -100, 0.95, -20, 'l2']]
  let a = ''
  let b = ''
  L.forEach(([x, y, k, rot, c], i) => {
    const u = UT('bn', x, y, k, false, ` class="${c}"`, rot)
    if (i % 2) a += u
    else b += u
  })
  s += P('p1', 'M17-64q5 2 3 12q-2 4-5 1q-2-8 2-13z')
  return s + `<g class="sw2 ln-eg">${b}</g><g class="sw3 ln-eg">${a}</g>`
}

// ───────────────────────── vùng ─────────────────────────
export const region: Region = {
  id: 'lang-ngoi',
  name: 'Làng mái ngói',
  x0: 1800,
  x1: 3600,
  shots: [
    { id: 'lang-ngoi', name: 'Xóm mái ngói rêu phong', x: 2700, y: 525, zoom: 0.92 },
    { id: 'gieng-lang', name: 'Giếng làng & sân gạch', x: 2590, y: 585, zoom: 1.16 },
  ],
  build(ctx: Ctx) {
    const lite = ctx.detail === 'lite'
    // vân (gờ cỏ, sợi rơm, bèo, rêu kẽ): chỉ vẽ khi đủ sáng để thấy — đêm & lite giản lược
    const tex = !lite && ctx.daylight > 0.3
    const defs = buildDefs(ctx)
    const pieces: Piece[] = []
    const spots: Spot[] = []
    // vo = số ký tự VỎ <g> bọc lớp động ngoài nội dung được <use> tham chiếu. Ngân sách cắt nội bộ cuối build
    // không tính phần vỏ này → mảnh nào giữ / cắt vẫn y như khi lớp động còn nằm trong nội dung tham chiếu.
    const vo = new Map<Piece, number>()
    const add = (x0: number, x1: number, prio: number, svg: string, glow = '', layer: Layer = 3, wrap = 0) => {
      if (!svg && !glow) return
      const p: Piece = glow ? { layer, x0, x1, prio, svg, glow } : { layer, x0, x1, prio, svg }
      pieces.push(p)
      if (wrap) vo.set(p, wrap)
    }
    const ph = (p: number, k: string) => ctx.ph(p, 'ln-' + k)
    const h = ctx.vn.hourF
    const S = ctx.season
    const sT = ctx.seasonT
    const pr = ctx.cur.precip
    const rain = pr === 'phun' || pr === 'mua' || pr === 'mua-to'
    const pour = pr === 'mua' || pr === 'mua-to'
    const snow = pr === 'tuyet'
    const wet = ctx.wet
    const dark = ctx.daylight < 0.62
    const eve = dark && h >= 15 && h < 22.6
    const dawn = dark && h >= 4.6 && h < 8
    const late = dark && !eve && !dawn
    const tet = (S === 'dong' && sT > 0.85) || (S === 'xuan' && sT < 0.08)
    const cook = (h >= 4.8 && h < 7.2) || (h >= 10.3 && h < 12) || (h >= 16 && h < 19.6)
    const clothes = !rain && !snow && !dark && wet < 0.4 && h >= 6.5 && h < 18.3
    const rice = ((S === 'thu' && sT > 0.45) || (S === 'ha' && sT < 0.3)) && !rain && wet < 0.3 && h >= 7 && h < 17.5
    const star = S === 'thu' && sT < 0.5
    // đêm rằm Trung Thu (trăng tròn tháng 9–10 dương lịch): lồng đèn giấy treo hiên nhà B & C
    const trungThu = dark && (ctx.vn.mo === 9 || ctx.vn.mo === 10) && Math.abs(ctx.moonPhase - 0.5) < 0.07
    const lantern = (x: number) => P('p1', el(x, -84, 7, 8)) + glowC(x, -84, 28)
    const gy = (x: number) => N(ground(x))
    const ripple = (x: number, y: number, w: number, k: string) => `<path class="rip ln-rr" style="animation-delay:${ph(3.4, k)}" d="${td(el(x, y, w, w / 5))}"/>`
    const sway = (cls: string, s: string) => `<g class="${cls}">${s}</g>`
    const snowRidge = (W: number, far = false) => (far ? '' : P('w3', `M${GW + 2} ${RG + 2}Q${W / 2} ${RG + 22} ${W - GW - 2} ${RG + 2}V${E - 3}Q${W / 2} ${E + 3} ${GW + 2} ${E - 3}z`, O(0.5))) + P('w3', `M${GW + 3} ${RG - 9}Q${W / 2} ${RG + 11} ${W - GW - 3} ${RG - 9}v6Q${W / 2} ${RG + 17} ${GW + 3} ${RG - 3}zM${GW + 4} ${E - 5}Q${W / 2} ${E + 3} ${W - GW - 4} ${E - 5}v4Q${W / 2} ${E + 7} ${GW + 4} ${E - 1}z`)

    // ── nền cỏ riêng của làng (một mảnh liền, không đường nối): dải mép hữu cơ fbm, đậm dần xuống đáy;
    //    hai đầu vùng khớp lại dải đất lõi (+58 / +190) để không lộ bậc khi camera đi qua
    {
      const nz = ctx.noise('ln-dat')
      const wgt = (x: number) => Math.min(1, Math.max(0, (x - 1800) / 160), Math.max(0, (3600 - x) / 160))
      const band = (cls: string, base: number, my: number, amp: number, f: number, tuft = 0) => {
        const pts: Pt[] = []
        const st = tuft ? 120 : 180
        for (let x = 1800; x <= 3600; x += st) pts.push([x, ground(x) + base + wgt(x) * (my - base + amp * fbm(nz, x / f, my / 50, 3) * 2.6 + (tuft && (x / st) % 2 ? -tuft : 0))])
        return P(cls, line(pts) + 'V1120H1800z')
      }
      let s = P('g2', `M1800 ${gy(1800) + 30}L2700 ${gy(2700) + 30}L3600 ${gy(3600) + 30}V1120H1800z`) + band('g3', 58, 106, 22, 160, tex ? 5 : 0) + band('g4', 190, 228, 16, 120).replace('/>', O(0.62) + '/>')
      // vân cỏ: gờ đất tương phản thấp chạy theo đường đồng mức (không thêm vật); tuyết phủ thì mất
      if (tex && !snow) {
        let rd = ''
        for (const [y0, x0, x1] of [[120, 1860, 2400], [140, 3140, 3540]] as const) {
          const pts: Pt[] = []
          for (let x = x0; x <= x1; x += 120) pts.push([x, ground(x) + y0 + fbm(nz, x / 140, y0, 2) * 30])
          rd += line(pts)
        }
        s += SK('g4', 3, rd, 0.24)
      }
      // đáy khung chìm dần (bóng mây/tán) → tiền cảnh tối, đẩy chiều sâu
      s += `<path fill="url(#ln-e)" transform="matrix(1 0 0 -1 0 2010)" d="M1800 890H3600V1120H1800z"${O(snow ? 0.2 : 0.26)}/>`
      if (snow) {
        const sp: Pt[] = []
        for (let x = 1800; x <= 3600; x += 150) sp.push([x, ground(x) + 34 + fbm(nz, x / 90, 9, 2) * 22])
        s += P('w3', line(sp) + 'V1120H1800z', O(0.42))
      }
      add(1800, 3600, lite ? 8 : 6, s)
    }

    // ── luỹ tre trái (giáp ga cũ) & loa phường
    {
      const lx = 1938
      const ly = gy(lx) + 6
      add(1790, 2000, 6, sway('sw2 ln-eg', UT('cl', 1838, 768, 1, true)) + (lite ? '' : sway('sw4 ln-eg', UT('cl', 1905, 770, 0.86))))
      spots.push({ kind: 'perch', layer: 3, x: lx, y: ly - 170, s: 1 })
    }

    // ── nhà D: nhỏ, tận sau, nhạt sương, khuất sau tán khế; cửa chớp; hoa giấy phủ trụ hồi;
    //    ô cửa sổ không bao giờ tắt đèn (giữa trưa vẫn hửng ấm)
    {
      const X = 2790
      const Y = 712
      const k = 0.62
      const D = house(ctx, 'D', ['g', 'd'], { far: true, lit: [true, eve], glowDay: 0.3 })
      let ex = ''
      if (snow) ex += snowRidge(D.W, true)
      if (!lite) add(X - 10, X + 170, 5, G(X, Y, D.s + ex, k), G(X, Y, D.g, k))
      spots.push({ kind: 'perch', layer: 3, x: X + 80, y: Y - 124, s: 0.6 })
    }

    // ── nhà B (3/4, đầu hồi đón nắng) — gian bếp, khói bếp
    {
      const X = 2626
      const Y = 760
      const k = 0.86
      const B = houseB(ctx, { fire: cook && dark, lit: eve || dawn, snow })
      add(X - 82, X + 200, 7, G(X, Y, B.s, k), G(X, Y, B.g + (trungThu ? lantern(40) + lantern(170) : ''), k))
      if (cook || S === 'dong' || (dark && h < 21)) spots.push({ kind: 'smoke', layer: 3, x: X + B.chim[0] * k, y: Y + B.chim[1] * k, s: 0.9 })
    }

    // ── nhà C (cũ nhất, thấp, cửa xanh, cửa chớp) — một ô cửa thức khuya
    {
      const X = 3096
      const Y = 764
      const C = house(ctx, 'C', ['g', 'k'], { lit: [eve || late || dawn, false] })
      let ex = ''
      if (snow) ex += snowRidge(C.W)
      add(X - 10, X + 230, 7, G(X, Y, C.s + ex, 0.88, 0.82), G(X, Y, C.g + (trungThu ? lantern(124) : ''), 0.88, 0.82))
    }

    // ── màn sương phối cảnh khí quyển (tầng giữa–xa): nhạt & ngả màu trời, đặc ở chân nhà, tan dần lên trên
    add(1960, 3440, 8, Fu('ln-z', 'M1960 790V700Q2000 560 2200 470H3200Q3420 560 3440 700V790z', O(Math.min(1, 0.92 + ctx.cur.fog * 0.3))))

    // ── nhà A (nhà chính ba gian, tầng trước, to & thấp nhất khung)
    const AX = 2118
    const AY = 800
    const AK = 1.06
    const AKY = 1.1
    // Ao soi bóng nhà A bằng <use href="#ln-hA"> → #ln-hA phải TĨNH. Đèn treo lắc nằm NGOÀI #ln-hA, trong <g transform> riêng
    // (lớp lắc bên trong); tuyết mép mái vẽ SAU đèn nên khi có đèn cũng ra ngoài (giữ thứ tự chồng lớp). Bóng nước KHÔNG soi
    // đèn & tuyết: lật qua mặt ao chúng rơi hẳn ngoài clip #ln-cp (đo cả năm, kể cả biên độ lắc: hở ≥ 19 px) → không vẽ.
    {
      const A = house(ctx, 'A', ['w', 'o', 'd'], { lit: [eve || dawn, eve, false] })
      // nón lá treo tường, bóng đèn tròn ngoài hiên
      let ex = (lite ? '' : P('w2', 'M84-74l13-10 13 10q-13 4-26 0z')) + P('ln-ln', 'M174-100v20') + P('w3', el(174, -76, 3, 4))
      let eg = eve ? `<circle fill="url(#gw)" cx="174" cy="-66" r="60" opacity=".7"/>` + P('e1', el(174, -76, 4, 5), O(0.8)) : ''
      // đèn lắc (sao / lồng đèn): class lắc & nội dung tĩnh; ngôi sao (thu) và đèn lồng (Tết) không bao giờ cùng lúc
      let hc = ''
      let hl = ''
      if (star) {
        hc = 'ln-hg ln-h3'
        hl = P('ln-ln', 'M262-100v14') + P('p1', 'M262-86l3 7h8l-6 5 2 8-7-4-7 4 2-8-6-5h8z')
        if (dark) eg += glowC(262, -74, 30)
      }
      if (tet) {
        // câu đối đỏ chữ vàng hai cột giữa, chậu đào, đèn lồng đỏ
        ex += P('p1', rr(118, -78, 6, 54) + rr(226, -78, 6, 54)) + P('ln-cd', 'M121-74v46M229-74v46')
        if (!lite) {
          ex += P('p2', 'M296-14q-6-12 0-22h8q6 10 0 22z') + P('ln-tw', 'M300-36q-6-20-20-30M300-36q6-24 22-28')
          const pf: Pt[] = []
          const rp = ctx.rng('ln-dao')
          for (let i = 0; i < 6; i += 1) pf.push([280 + rp() * 44, -76 + rp() * 36])
          ex += dots('f1', pf, 4.4)
          hc = 'ln-hg ln-h2'
          hl = P('ln-ln', 'M74-100v10M276-100v10') + P('p1', el(74, -82, 7, 8) + el(276, -82, 7, 8))
          if (dark) eg += glowC(74, -82, 26) + glowC(276, -82, 26)
        }
      }
      const sn = snow ? snowRidge(A.W) : ''
      const tf = `translate(${AX} ${AY})scale(${AK} ${AKY})`
      let s = `<g id="ln-hA" transform="${tf}">${A.s + ex + (hl ? '' : sn)}</g>`
      // vỏ thêm so với khi đèn còn trong #ln-hA: đúng một cặp <g transform="tf"></g>
      const wv = hl ? `<g transform="${tf}"></g>`.length : 0
      if (hl) s += `<g transform="${tf}"><g class="${hc}">${hl}</g>${sn}</g>`
      add(AX - 10, AX + 380, 9, s, G(AX, AY, A.g + eg, AK, AKY), 3, wv)
      spots.push({ kind: 'cat-shelter', layer: 3, x: AX + 312 * AK, y: AY - 14 * AKY, s: 1 })
      spots.push({ kind: 'perch', layer: 3, x: AX + 120 * AK, y: AY - 208 * AKY, s: 1 })
    }

    // ── đường làng: từ cổng vào, lượn trước nhà A tới sân; đất hai sắc, vệt mòn giữa, cỏ lấn mép
    {
      const nz = ctx.noise('ln-lo')
      const top: Pt[] = []
      const bot: Pt[] = []
      for (let x = 1990; x <= 2670; x += 136) {
        const g0 = 810 + 14 * Math.sin((x - 1990) / 200) + nz(x / 90, 1) * 6
        const wd = (10 + 16 * Math.min(1, (x - 1990) / 260)) * (1 + 0.35 * Math.sin((x - 1900) / 120))
        top.push([x, g0 + nz(x / 70, 2) * 5])
        bot.push([x, g0 + wd + nz(x / 60, 3) * 6])
      }
      add(1980, 2680, 5, P('d1', line([...top, ...bot.reverse()]) + 'z') + (tex ? U('tg', 2420, 812) : ''))
    }

    // ── sân gạch (gốc 2640, 760): mép trước sứt, gạch vỡ, rêu kẽ, ô lò cò phấn, phơi thóc, vũng nước
    {
      const r = ctx.rng('ln-san')
      const nz = ctx.noise('ln-san')
      const X = 2640
      const Y = 760
      const L = 650
      const gl = (x: number) => ground(x + X) - Y
      const front = (x: number) => gl(x) + 66 + nz(x / 60, 0.4) * 16 + (x > 250 && x < 470 ? 10 * Math.sin(((x - 250) / 220) * Math.PI) : 0)
      const fp: Pt[] = []
      for (let x = 0; x <= L; x += 65) fp.push([x ? x : -24, front(x)])
      fp.splice(1, 0, [14, front(30) - 30])
      let s = `<defs><path id="ln-yd" d="${td(`M44 ${N(gl(44) + 3)}L${L / 2} ${N(gl(L / 2) + 3)}L${L} ${N(gl(L) + 3)}` + line(fp.slice().reverse()).replace('M', 'L') + 'z')}"/></defs><use href="#ln-yd" fill="url(#ln-c)"/><use href="#ln-yd" class="wetsheen"/><use href="#ln-yd" fill="url(#ln-pg)"/>`
      // bóng tán khế loang trên sân (nắng xuyên tán)
      if (ctx.daylight > 0.5 && !rain && ctx.cur.cloud !== 'u-am') s += P('sh', lump(r, 280, 30, 90, 8, 5, 0.5), O(0.9))
      if (tex) {
        // rêu kẽ mép sân & kẽ gạch, gạch vỡ lệch ở mép
        s += `<path class="ln-mo" d="${td(line(fp.filter((_, i) => i % 2 === 0).map(([x, y]) => [x, y - 1] as Pt)))}" style="stroke:var(--m2);stroke-width:5"/>`
      }
      if (rice) s += P(S === 'thu' ? 'f1' : 'w1', 'M430 26h100l4 22H426z') + P('ln-sw', 'M436 34q46-4 92 0M440 42q40-3 86 0') + P('b2', 'M540 64l26-34 2 1-25 34z')
      else if (S === 'thu' && sT > 0.45) s += P('p2', 'M470 48q30-30 60 0z')
      if (wet > 0.2 || rain) {
        s += P('a2', el(230, 50, 24, 4) + el(510, 54, 18, 3), O(0.9))
        if (rain) s += ripple(230, 50, 8, 'a')
        else if (!dark) s += P('w3', 'M218 46h16l-3 3h-10z') + P('s2', 'M226 46v-8l5 8z')
      }
      if (S === 'thu') {
        const lf: Pt[] = []
        for (let i = 0; i < 8; i += 1) lf.push([200 + r() * 260, 14 + r() * 40])
        s += dots('l2', lf)
      }
      // cỏ lấn mép sau & mép phải sân (mép răng cưa, không còn cạnh thước kẻ)
      if (tex && !snow) {
        let gr = `M${L - 70} ${N(gl(L - 70) + 2)}`
        for (let i = 0; i < 7; i += 1) gr += `l10 ${i % 2 ? 7 : -5}`
        s += P('g2', gr + `l2 ${N(front(L) - gl(L))}l-36 6l-14-${N((front(L) - gl(L)) * 0.6)}z`, O(0.85)) + P('ao', `M0 ${N(gl(0) + 3)}L${L} ${N(gl(L) + 3)}v5L0 ${N(gl(0) + 8)}z`, O(0.3))
      }
      // góc sân gạch vỡ, cỏ & rêu lấn vào kẽ (chỗ mèo ngủ): mép răng cưa, nằm trong mặt sân chứ không dán lên
      s += P('m3', 'M530 66q10-6 20-3q8-6 18-2q10-5 18 0q10-4 18 2q8-2 12 3z', O(0.55)) + P('m2', 'M548 61q8-3 14-1M578 60q8-3 13 0', O(0.6)) + P('r3', 'M592 50l12-2 1 5-12 2z', O(0.7))
      if (snow) s += `<use href="#ln-yd" class="w3" opacity=".55"/>`
      add(2630, 3300, lite ? 7 : 6, G(X, Y, s))
      spots.push({ kind: 'cat', layer: 3, x: X + 565, y: Y + 58, s: 1, w: 50 })
    }

    // ── lối mòn từ sân xuống đáy khung: cong chữ S theo phối cảnh (hẹp xa, rộng gần), mép đất loang tan vào cỏ, hai vệt bánh
    //    nhạt dần về phía sân, dải cỏ giữa đứt quãng, cỏ lấn mép; vài viên gạch vỡ nối sân; vũng sau mưa; tuyết phủ khi tuyết
    {
      const nz = ctx.noise('ln-ngo')
      const C: Pt[] = [[0, -4], [-26, 60], [-24, 130], [44, 200], [170, 290]]
      const half = (y: number) => 24 + Math.pow(Math.max(0, y) / 290, 1.3) * 66
      const side = (sg: number, f: number, c = C) => c.map(([x, y]) => [x + sg * half(y) * (f + nz(y / 40, sg * f) * 0.22), y] as Pt)
      const band = (a: number, b: number, sg: number, c = C) => line([...side(sg, a, c), ...side(sg, b, c).reverse()]) + 'z'
      const body = (f: number) => line([...side(-1, f), ...side(1, f).reverse()]) + 'z'
      let s = P('g2', body(1.25), O(0.5)) + P('d1', body(1))
      // vệt bánh lún (tối) & gờ giữa hai vệt (sáng), mờ dần lên phía sân
      const Cn = C.slice(1)
      s += P('d2', band(0.32, 0.5, -1, Cn) + band(0.32, 0.5, 1, Cn), O(0.36))
      if (tex && !snow) s += P('g3', band(-0.08, 0.08, 1, C.slice(2)), O(0.5))
      s += P('r3', 'M-10 0l12-3 2 7-13 2zM8 2l11-2 1 6-11 1z')
      if (wet > 0.2 || rain) s += P('a2', el(-20, 150, 24, 4), O(0.85)) + (rain ? ripple(-20, 150, 7, 'n') : P('hl', el(-26, 148, 10, 1.4)))
      if (snow) s += P('w3', body(1.05), O(0.5))
      add(2740, 3240, 6, G(2928, 832, s))
    }

    // ── cây khế: thân nghiêng u bướu, rễ nổi, tán khối sáng trên–trái tối dưới–phải, lỗ thủng thấy trời,
    //    cành rủ thấp về phía giếng (khung tiêu điểm); hoa tím li ti / quả năm cánh theo mùa
    {
      const r = ctx.rng('ln-khe')
      let t = P('ao', el(4, 2, 52, 7))
      t += P('b2', 'M-26 3q14-2 17-14q3-26-2-50q-3-14 3-26l7 3q-4 12 0 22q8-14 22-22l4 5q-14 8-18 22q-2 18 4 44q4 12 22 16zM-30 3q-10 2-16 0q8-6 18-6zM14 1q16 0 22 4q-12 0-22-1z') + P('b1', 'M3 0q-5-24-1-48l5-10q-2 30 6 58z', O(0.75))
      if (!lite) t += P('m2', 'M-22 1q4-10 12-8q4 6-2 8zM-4-70q8-6 14-2l-3 4q-6-2-11 0z') + SK('b2', 4, 'M14-74q40-28 82-14q14 6 18 22')
      const cl = (a: [number, number, number, boolean, number?][]) => a.map(([x, y, k, f, q]) => UT('lf', x, y, k, f, '', q ?? 0)).join('')
      let can = `<g style="--l1:var(--l3);--l2:var(--l3);--l3:var(--l4)">${cl([[-62, -80, 1.8, true, -8], [58, -76, 2, false, 6]])}</g>`
      if (S === 'dong') can = cl([[-40, -96, 1.2, true, -8], [44, -104, 1.1, false, 6]]) + SK('b2', 3, 'M-2-60q-30-40-60-52M4-60q20-50 50-60M0-70q-4-40 6-80')
      else can += cl(lite ? [[-30, -116, 2.1, true], [36, -118, 1.9, false]] : [[-36, -112, 2, true, 5], [40, -116, 1.9, false, -4], [2, -148, 1.4, true]])
      let br = lite ? '' : cl([[112, -44, 1.1, false, 10], [94, -58, 0.8, true]])
      const fl: Pt[] = []
      if ((S === 'xuan' && !tet) || (S === 'ha' && sT < 0.3)) for (let i = 0; i < 10; i += 1) fl.push([-70 + r() * 130, -180 + r() * 74])
      can += dots('f1', fl, 2.6)
      const fruit = S === 'thu' ? 'f1' : S === 'ha' ? 'l1' : ''
      if (fruit) {
        let fr = ''
        for (let i = 0; i < 3; i += 1) fr += `M${N(-50 + r() * 100)} ${N(-116 + r() * 26)}q5 2 5 7t-5 7q-5-2-5-7t5-7z`
        can += P(fruit, fr)
        if (!lite) br += P(fruit, 'M100-56q5 2 5 7t-5 7q-5-2-5-7t5-7z')
      }
      const thin = ''
      t += `<g class="sw4 ln-eg"${thin}>${can}</g>` + (br ? `<g class="sw3 ln-eg"${thin}>${br}</g>` : '')
      if (tet) t += SK('b3', 2, 'M-56 40v-268') + G(-56, -224, P('l2', 'M0 0q-12-6-20 4q10-2 20 0q-4-14 6-20q2 10-6 20q14-4 22 4q-12 0-22-8z') + P('ln-ln', 'M0 4l-8 40M0 4l8 36') + P('p1', 'M-10 44h5l-1 8h-3zM6 40h5l-1 8h-3z'))
      add(2800, 3040, 7, G(2904, 772, t))
      if (S === 'xuan' || S === 'ha') spots.push({ kind: 'butterflies', layer: 3, x: 2930, y: 700, s: 1, w: 120 })
    }

    // ── GIẾNG LÀNG (tiêu điểm): bệ đá loang nước, thành gạch hắt sáng trái, rêu chân, tang trống & gàu;
    //    đáy giếng soi một bầu trời khác giờ: trưa thấy trăng khuyết & sao, đêm thấy trời xanh có mây
    {
      const r = ctx.rng('ln-gieng')
      const wall = 'M-32-40v34q32 9 64 0v-34z'
      let s = P('ao', el(2, 3, 72, 10)) + P('s3', el(0, -1, 64, 13)) + (wet > 0.15 ? P('a2', el(18, 2, 30, 5), O(0.3 + wet * 0.4)) : '') + Fu('ln-b', wall) + Fu('ln-h', wall)
      s += P('m2', 'M-32-6v-10q6-6 10-2q6-8 12-1q8-6 14 1q6-6 12 0q6-6 14 0v12q-32 9-64 0z') + (tex ? U('fn', -22, -18) : '')
      s += P('s2', el(0, -40, 34, 10)) + P('k1', el(0, -40, 26, 7)) + P('m2', 'M-34-40q6-8 16-5q6-4 10 1q-6 4-14 7q-8 0-12-3zM18-46q8-1 14 4l-4 3q-4-4-10-7z', O(0.85)) + P('m3', 'M-64 2q-4-10 10-14q12-2 18 6q-8 9-28 8z', O(0.7))
      // bầu trời khác giờ trong lòng giếng (ban ngày: trăng khuyết & sao)
      if (!dark) s += dots('w3', [[-13, -41], [11, -38], [17, -42]], 1.4) + P('w3', 'M4-44a4 4 0 1 0 3 7a3 3 0 1 1-3-7z')
      s += P('b2', rr(-31, -104, 5, 64) + rr(26, -104, 5, 64) + rr(-26, -84, 52, 9)) + P('b1', rr(-35, -108, 70, 6) + rr(29, -104, 2, 64))
      if (!lite) s += P('ln-rp', 'M-20-80h32') + P('ln-mt', 'M31-80h8v10h6')
      s += P('ln-ln', 'M4-75v30') + P('x2', 'M-3-45h14l-2 9h-10z') + P('m2', 'M-36-108h28q-6 3-18 2q-6 2-10-2z')
      if (S === 'ha' && (rain || h >= 17 || h < 6)) s += P('g3', 'M-26-47q4-6 9-3q3 2 2 5h-12z') + P('k1', rr(-20, -51, 2, 2))
      if (snow) s += P('w3', 'M-34-42a34 10 0 0 1 68 0l-6 2a28 7 0 0 0-56 0zM-36-110h72v3h-72z')
      if (rain) s += ripple(1, -39, 6, 'g')
      const glow = dark ? P('a1', el(1, -39, 20, 4.6), O(0.32)) + P('w3', 'M-12-40q2-4 6-2q3-3 6 0q4-1 4 3h-16z', O(0.4)) : ''
      add(2900, 3090, 9, G(2995, 820, s, 1.3), G(2995, 820, glow, 1.3))
    }

    // ── sương có tầng: đặc sát mặt đất (chân nhà, sân, giếng), loãng dần lên cao — chỉ khi có sương
    if (ctx.cur.fog > 0.25) add(1800, 3600, 7, Fu('ln-z', 'M1800 640H3600V900H1800z', O(Math.min(1, ctx.cur.fog * 1.1))))

    // ── dây phơi (mưa / tối: cất đồ, chỉ còn kẹp; tuyết: dỡ hẳn) — nón lá úp đầu cột
    if (!snow) {
      const L = 150
      const ly = (x: number) => 10 * Math.sin((Math.PI * x) / L)
      let s = P('d1', rr(-2, -2, 4, 72) + rr(L - 2, 0, 4, 72)) + P('ln-ln', `M0 1Q${L / 2} 21 ${L} 3`) + P('w2', 'M-12 0l12-10 12 10q-12 4-24 0z')
      if (clothes) {
        const hang = (x: number, cls: string, inner: string) => G(x, ly(x), `<g class="ln-hg${cls}">${inner}</g>`)
        s += hang(28, '', P('p2', 'M-12 0h24l6 9-5 3-3-4v22h-20v-22l-3 4-5-3z') + P('sh', 'M4 0h8l6 9-5 3-3-4v22h-6z'))
        s += hang(60, ' ln-h2', P('p1', rr(-7, 0, 14, 26)) + P('p3', rr(-7, 18, 14, 3)) + P('sh', rr(2, 0, 5, 26)))
        if (!lite) s += hang(92, ' ln-h3', P('k2', 'M-9 0h18l-1 34h-7l-1-24-1 24h-7z') + P('hl', 'M-9 0h7l-1 34h-6z'))
      } else s += P('b3', `M36 ${N(ly(36)) - 2}h3v5h-3zM76 ${N(ly(76)) - 2}h3v5h-3zM116 ${N(ly(116)) - 2}h3v5h-3z`)
      add(2480, 2660, lite ? 8 : 6, G(2494, 742, s))
      spots.push({ kind: 'perch', layer: 3, x: 2572, y: 754, s: 0.9 })
    }

    // ── chum vại góc hiên nhà A (mưa: hứng giọt từ mép ngói)
    {
      const jx = 2452
      const jy = 818
      let j = U('j', 0, 0) + U('j', 30, 4) + (lite ? '' : UT('j', -24, 6, 0.66))
      if (rain) j += `<path class="ln-dp" d="M0-124V-42M30-120V-38"/>` + (pour ? SK('a1', 1.4, `M${AX + 30 - jx} -128v118`, 0.4) : '')
      if (snow) j += P('w3', el(0, -43, 13, 3) + el(30, -39, 13, 3))
      add(2420, 2500, lite ? 8 : 6, G(jx, jy, j))
    }

    // ── RÙA ĐÁ khổng lồ cõng bia, ngủ dưới rêu cạnh cổng (lộ mai, đầu & một mắt nhắm); chữ trên bia đã mòn hết;
    //    khăn đỏ ai buộc vẫn còn — làng vẫn nhớ
    {
      let s = P('ao', el(6, 2, 96, 10)) + P('s3', 'M-86 0q2-44 52-60q62-14 100 26q10 18 6 34zM66-4q8-22 32-22q18 0 20 14q0 10-12 12h-40z') + P('sh', 'M20-52q46 10 52 52h-40q2-30-12-52z', O(0.8))
      s += P('m3', 'M-80-6q8-34 46-50q50-12 86 18q-20-4-34 4q-26-8-44 6q-26-2-54 22z') + P('s2', 'M-38-56v-76q0-14 22-14t22 14v76z') + P('sh', 'M-4-56v-80q8 4 10 10v70z')
      s += (lite ? '' : UT('mc', -78, -18, 3) + UT('mc', 10, -40, 2.6, true)) + P('z1', 'M92-15q4 3 8 0') + P('p1', 'M-39-96h46v5h-46zM7-95l6 12-3 2-5-11z', O(0.8))
      if (snow) s += P('w3', 'M-36-146q20-10 40 0l-4 4q-16-6-32 0zM-60-46q30-20 70-12l-4 4q-34-6-62 12z')
      add(1790, 2020, 6, G(1890, 792, s))
    }

    // ── hộp thư đỏ (còn kẹp lá thư) + xe đạp cũ dựng trụ hồi nhà A
    {
      const m = P('b2', rr(-2, -40, 4, 40)) + P('p1', 'M-9-40v-14q0-8 9-8t9 8v14z') + P('k1', rr(-5, -51, 10, 2)) + P('w3', 'M-4-51l8-1 1 5-8 1z')
      let b = P('ao', el(0, 1, 40, 4)) + P('ln-wh', el(-22, -15, 14, 14) + el(22, -15, 14, 14))
      b += P('ln-fm', 'M-22-15L-3-14L-9-38M-3-14Q8-16 15-36L22-15M-22-15L-9-36') + (lite ? '' : P('ln-mt', 'M15-36l1-7M10-45q6-3 13 0') + P('b1', 'M-15-41h12q-2 4-8 3zM16-52h14l-2 10h-10z'))
      add(2030, 2170, lite ? 8 : 5, G(2052, gy(2052) + 46, m) + G(2098, 812, b))
    }

    // ── ao làng trước nhà A: bờ đất sụt phía xa (đổ bóng tối xuống nước), soi bóng mái nhà, bèo, súng, cọc tre, cầu ao,
    //    mép cỏ phía gần lấn ra mặt nước (gốc 2290, 902)
    {
      const r = ctx.rng('ln-ao')
      const X = 2290
      const Y = 902
      let s = `<defs><path id="ln-pd" d="${td(lump(r, 0, 0, 160, 25, 12, 0.3))}"/><clipPath id="ln-cp"><use href="#ln-pd"/></clipPath></defs>`
      s += `<use href="#ln-pd" class="d2" transform="translate(6 -5)scale(1.1 1.45)" opacity=".75"/><use href="#ln-pd" class="${snow ? 'w3' : 'm3'}" transform="translate(-8 -3)scale(1.05 1.2)" opacity=".6"/>`
      s += `<g clip-path="url(#ln-cp)">${Fu('ln-a', 'M-170-30h340v60h-340z')}<g opacity=".46"><use href="#ln-hA" transform="matrix(1 0 0 -1 ${-X} ${2 * AY + 88 - Y})"/></g>`
      s += P('k1', 'M-170-30h340v12q-90 7-170 1q-90 5-170-3z', O(snow ? 0.1 : 0.2))
      if (snow) s += P('w3', 'M-170-30h340v60h-340z', O(0.45))
      if (tex) {
        const bo: Pt[] = []
        for (let i = 0; i < 5; i += 1) bo.push([-140 + r() * 60 + (i % 3) * 110, 4 + r() * 16])
        s += dots('l1', bo, 2.4)
      }
      s += P('b2', 'M60-24h3v30h-3zM70-20h3v24h-3z') + ripple(rain ? 40 : 64, 4, 10, 'p') + '</g>'
      let lip = 'M-150 21'
      for (let i = 0; i < 9; i += 1) lip += `l${N(17 + r() * 9)} ${i % 2 ? N(6 + r() * 4) : -N(5 + r() * 6)}`
      s += P(snow ? 'w3' : 'g3', lip + 'V34H-150z', O(0.9))
      add(2120, 2460, 6, G(X, Y, s))
    }

    // ── rào dâm bụt: bốn cụm không đều, có lỗ hở; hoa đỏ xuân/hạ/đầu thu
    if (!lite) {
      const r = ctx.rng('ln-rao')
      const fl: Pt[] = []
      let bu = ''
      const B: [number, number, number][] = [[2500, 914, 1.15], [2560, 926, 0.8], [3110, 896, 1.06], [3362, 890, 1.3]]
      B.forEach(([x, y, k], i) => {
        if (lite && i % 2) return
        bu += UT('db', x, y, k, i % 2 === 1)
        fl.push([x - 22 * k + r() * 40 * k, y - 34 * k + r() * 22 * k])
      })
      let s = `<g class="ln-eg">${bu}</g>`
      if ((S === 'xuan' && !tet) || S === 'ha' || (S === 'thu' && sT < 0.4)) s += dots('p1', fl, 3.8)
      add(2450, 3420, 3, s)
    }

    // ── cây rơm (đống rơm nón quanh cọc tre, kiểu Bắc Bộ): thân nón phình, ba tầng rơm xếp mép rủ, mặt khuất theo hướng nắng,
    //    sợi rơm toả dọc thân, nắp rơm buộc đầu cọc, rơm xổ chân, rêu chân phía khuất; tuyết phủ chóp & vai các tầng
    {
      const am = h < 12
      const k = S === 'thu' || S === 'dong' ? 1.38 : 1.22
      let s = P('ao', el(6, 2, 66, 8)) + P(S === 'thu' || S === 'dong' ? 'w1' : 'w2', 'M-60 0q-8-22 6-42q16-36 46-70q8-6 16 0q30 36 46 70q12 20 4 42q-58 10-118 0z')
      // mặt khuất: sáng sớm nắng đông (trái) → khuất phải; chiều ngược lại
      s += `<path class="sh" d="M10-112q30 36 46 70q12 20 4 42q-28 5-56 4q16-56 6-116z"${am ? '' : ' transform="scale(-1 1)"'}${O(0.7)}/>`
      // ba tầng rơm: mép rủ, bóng dưới mép
      s += P('d1', 'M-58-36q30 12 60 4q28-6 56 0l-2 7q-28-5-54 1q-30 8-62-4zM-38-74q20 9 40 3q20-5 36 0l-2 6q-18-4-34 1q-22 7-42-2z', O(0.42))
      if (tex) {
        let st = ''
        const r = ctx.rng('ln-rom')
        for (let i = 0; i < 6; i += 1) {
          const x = -46 + i * 17 + r() * 6
          const y = -8 - r() * 70
          st += `M${N(x)} ${N(y)}l${N(x * 0.08)} ${N(-14 - r() * 10)}`
        }
        s += P('ln-sw', st + 'M-64 2l-12 4M60 1l13 5M-44 4l-8 6M30 5l9 6') + P('m3', 'M18 2q18-2 36-14q4 8 0 14q-18 4-36 2z', O(0.55))
      }
      s += P('b3', 'M-2-140h4v34h-4z') + P('d1', 'M-12-110q12-12 24 0q-12 6-24 0z')
      if (snow) s += P('w3', 'M-14-112q14-10 28 0q14 16 22 30q-30-8-72 0q8-14 22-30z', O(0.92))
      add(3220, 3400, 5, G(3310, 952, s, k))
    }

    // ── bụi chuối & luỹ tre phải (diều mắc ngọn)
    {
      add(3305, 3475, 6, G(3385, gy(3385) + 4, banana()))
      add(3360, 3600, 5, sway('sw1 ln-eg', UT('cl', 3446, 776, 1.06)) + (lite ? '' : sway('sw2 ln-eg', UT('cl', 3556, 772, 0.92, true))))
      if (dark && (S === 'ha' || S === 'xuan')) spots.push({ kind: 'fireflies', layer: 3, x: 3440, y: 720, s: 1, w: 160 })
    }

    // ── tiền cảnh (lớp 4): khóm cỏ lau lớn
    //    #ln-la tĩnh; .sw3 bọc ngoài từng <use>. Bản lật: lớp lắc nằm TRONG phép lật (trục & chiều lắc như khi còn ở trong #ln-la)
    //    Vỏ = phần dài hơn <use> trần (U / UT lật) như khi lớp lắc còn trong #ln-la.
    if (!lite) {
      const a = sway('sw3', U('la', 2990, 1100))
      const b = `<g transform="translate(4460 1104)scale(-1.15 1.15)">${sway('sw3', U('la', 0, 0))}</g>`
      add(2930, 3060, 2, a, '', 4, a.length - U('la', 2990, 1100).length)
      add(4400, 4530, 2, b, '', 4, b.length - UT('la', 4460, 1104, 1.15, true).length)
    }

    // ── khung tiền cảnh lớp 4: một mảng cỏ & ráy tối đi vào từ góc dưới-trái (ít chi tiết, mép răng cưa), đẩy chiều sâu
    {
      const r = ctx.rng('ln-l4')
      let s = P('g4', lump(r, 3000, 1030, 270, 92, 11, 0.22, 0.24)) + P('k1', lump(r, 2990, 1062, 250, 66, 9, 0.2), O(0.2))
      if (tex) s += P('g3', 'M2860 966q-10-50 18-84q-6 40 0 84zM2930 958q6-46 40-70q-24 32-30 70z', O(0.75))
      add(2720, 3280, lite ? 3 : 5, s, '', 4)
    }

    const len = (p: Piece) => p.svg.length + (p.glow?.length ?? 0) - (vo.get(p) ?? 0)
    let tot = pieces.reduce((a, p) => a + len(p), 0)
    while (tot > (lite ? 7900 : 14300)) {
      let k = 0
      pieces.forEach((p, i) => {
        if (p.prio < (pieces[k] as Piece).prio) k = i
      })
      const [p] = pieces.splice(k, 1)
      if (!p) break
      tot -= len(p)
    }
    const css =
      CSS +
      (S === 'thu' ? '.ln-eg{--l1:var(--g1);--l2:var(--m1);--l3:var(--m2);--l4:var(--m3)}' : '') +
      (S === 'dong' ? '.ln-eg{--l1:var(--w2);--l2:var(--m1);--l3:var(--m2);--l4:var(--s3)}' : '') +
      `.ln-hg{animation:ln-hg 3.1s ease-in-out ${ph(6.2, 'h1')} infinite alternate}.ln-hg.ln-h2{animation:ln-hg 2.3s ease-in-out ${ph(4.6, 'h2')} infinite alternate}.ln-hg.ln-h3{animation:ln-hg 4.2s ease-in-out ${ph(8.4, 'h3')} infinite alternate}.ln-dp{animation:ln-dp .5s linear ${ph(0.5, 'dp')} infinite}`
    return { pieces, spots, defs, css }
  },
}
