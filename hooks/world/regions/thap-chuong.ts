// Vùng "Tháp chuông" (x 12600–14400): cao nguyên rêu phong. Tháp đồng hồ cổ CHỈ GIỜ THẬT, thân hơi nghiêng vì năm tháng;
// quả chuông lắc khi gió mạnh; cửa sổ hoa hồng đá chạm, kính màu dịu (đêm sáng ấm). Thư viện bỏ ngỏ: tường đổ lộ kệ sách,
// cây mọc xuyên mái làm nứt sàn, nắng rọi qua mái thủng có bụi bay. Cầu thang xoắn bậc nêm có tay vịn dẫn lên khoảng
// không — mấy bậc cuối rời ra trôi lên trời, kết thúc ở một khung cửa gỗ đứng giữa trời. Đồng hồ mặt trời bằng đá: bóng kim
// & bóng tháp theo mặt trời thật. Rêu đọng mặt trên mọi gờ, chảy vệt xuống mặt khuất nắng; đồng cỏ có búi cỏ, lối mòn, hoa
// dại theo mùa; tiền cảnh có dương xỉ, mặt đồng hồ đá vỡ, chồng sách rêu phủ.
// Kỹ thuật gọn: toạ độ cục bộ + đường tương đối (nhiều đa giác trong MỘT path); gom nét cùng lớp màu vào một <path>;
// rêu = MỘT đường dùng lại 3 lần (m3/m2/m1 nét đứt); lá / cỏ / hoa / lá dương xỉ đặt bằng <marker> ở từng đỉnh;
// cỏ đồng = <pattern>; bậc thang = một đường dùng lại (cổ bậc = bản lệch xuống).
import { clamp, fbm, ground, n0, type Pt } from '../util'
import type { BuildOut, Ctx, Layer, Piece, Region, Season, Spot } from '../types'

// ───────────────────────── Vị trí các vật (lớp 3) ─────────────────────────
const TX = 13250 // tháp chuông (tâm chân)
const TY = 697
const SX = 13018 // cầu thang xoắn
const SY = 698
const LX = 13900 // thư viện
const LY = 704
const CX = 13400 // gốc sân lát đá
const CY = 700
/** Thân tháp nghiêng nhẹ (skewX): đỉnh lệch phải ~10 px. */
const SKEW = 'skewX(-1.2)'
const SKT = Math.tan((1.2 * Math.PI) / 180)

// ───────────────────────── Bút vẽ gọn ─────────────────────────
const J = (a: number[]) => a.map((v, i) => (i && v >= 0 ? ' ' : '') + v).join('')
/** Nhiều đa giác (kín) hoặc gấp khúc (hở) trong MỘT đường tương đối: "M…l…z m…l…z". */
function mp(polys: Pt[][], z = true): string {
  let s = ''
  let cx = 0
  let cy = 0
  for (const poly of polys) {
    const q = poly.map(([x, y]) => [n0(x), n0(y)] as Pt)
    const f = q[0]
    if (!f) continue
    s += s ? 'm' + J([f[0] - cx, f[1] - cy]) : 'M' + J(f)
    let [px, py] = f
    const ds: number[] = []
    for (const [x, y] of q.slice(1)) {
      ds.push(x - px, y - py)
      px = x
      py = y
    }
    // đoạn ngang/dọc viết h/v (ngắn hơn), lệnh lặp liền nhau bỏ chữ cái
    let last = ''
    for (let i = 0; i < ds.length; i += 2) {
      const dx = ds[i] as number
      const dy = ds[i + 1] as number
      const c = dy === 0 ? 'h' : dx === 0 ? 'v' : 'l'
      const v = dy === 0 ? [dx] : dx === 0 ? [dy] : [dx, dy]
      s += c === last ? ((v[0] as number) >= 0 ? ' ' : '') + J(v) : c + J(v)
      last = c
    }
    if (z) {
      s += 'z'
      ;[cx, cy] = f
    } else [cx, cy] = [px, py]
  }
  return s
}
/** Gấp khúc tương đối: "M x y l dx dy …[z]". */
const rp = (pts: Pt[], z = true) => mp([pts], z)
/** Đường cong mượt tương đối (q qua trung điểm). */
function sp(pts: Pt[], z = false): string {
  const q = pts.map(([x, y]) => [n0(x), n0(y)] as Pt)
  const f = q[0]
  if (!f || q.length < 3) return rp(q, z)
  let [cx, cy] = f
  const ns: number[] = []
  for (let i = 1; i < q.length - 1; i += 1) {
    const [px, py] = q[i] as Pt
    const [nx, ny] = q[i + 1] as Pt
    const mx = n0((px + nx) / 2)
    const my = n0((py + ny) / 2)
    ns.push(px - cx, py - cy, mx - cx, my - cy)
    cx = mx
    cy = my
  }
  const [lx, ly] = q[q.length - 1] as Pt
  return `M${J(f)}q${J(ns)}l${J([lx - cx, ly - cy])}${z ? 'z' : ''}`
}
/** Đường cho marker-mid: thêm đỉnh đệm ở hai đầu để MỌI điểm đều mọc marker. */
const mk = (pts: Pt[]) => (pts.length ? mp([[pts[0] as Pt, ...pts, pts[pts.length - 1] as Pt]], false) : '')
const f2 = (v: number) => String(v).replace(/^(-?)0\./, '$1.')
const O = (v: number) => ` opacity="${f2(v)}"`
/** Class dựng khối (.hl .sh .ao) đã có opacity trong CSS → phải ghi đè bằng style. */
const SOFT = new Set(['hl', 'sh', 'ao', 'wetsheen'])
const P = (c: string, d: string, a = '') => (d ? `<path class="${c}"${a} d="${d}"/>` : '')
const F = (fill: string, d: string) => `<path fill="${fill}" d="${d}"/>`
const T = (x: number, y: number, s: string, a = '', tf = '') => `<g transform="translate(${n0(x)} ${n0(y)})${tf}"${a}>${s}</g>`
const U = (id: string, c: string, a = '') => `<use href="#${id}" class="${c}"${a}/>`

type Add = (c: string, d: string, o?: number) => void
/** Gom nét theo lớp màu (khoá "lớp" hoặc "lớp@độ-mờ" hoặc "url(#…)"): mỗi lớp thành MỘT <path>, giữ thứ tự lần đầu xuất hiện. */
function acc(): { a: Add; out: () => string } {
  const m = new Map<string, string>()
  const a: Add = (c, d, o) => {
    if (!d) return
    const k = o === undefined ? c : `${c}@${o}`
    m.set(k, (m.get(k) ?? '') + d)
  }
  const out = () => {
    let s = ''
    for (const [k, d] of m) {
      const [c = '', o] = k.split('@')
      const ov = o ? (SOFT.has(c) ? ` style="opacity:${f2(Number(o))}"` : O(Number(o))) : ''
      s += c.startsWith('url(') ? F(c, d) : P(c, d, ov)
    }
    m.clear()
    return s
  }
  return { a, out }
}

/** Khối hữu cơ góc cạnh (mảng vữa lở, đá vụn, chùm lá). */
function lump(r: () => number, cx: number, cy: number, rx: number, ry: number, n = 6, k0 = 0.62, k1 = 0.5): string {
  const pts: Pt[] = []
  const ph = r() * 6.3
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + ph
    const k = k0 + r() * k1
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return rp(pts)
}
/** Khối hữu cơ tròn trịa (đá mòn, tảng đá). */
function blobS(r: () => number, cx: number, cy: number, rx: number, ry: number, n: number, rough = 0.22): string {
  const pts: Pt[] = []
  const ph = r() * 6.3
  for (let i = 0; i <= n + 1; i += 1) {
    const a = (i / n) * Math.PI * 2 + ph
    const k = 0.84 + 0.16 * Math.sin(a * 3 + ph) + (i % n === 0 ? 0 : (r() - 0.5) * rough)
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return sp(pts, true)
}
/** Dải điểm gần như ngang (cho marker cỏ/hoa). */
function row(r: () => number, x0: number, x1: number, y: number, step: number, jy: number): Pt[] {
  const pts: Pt[] = []
  for (let x = x0; x <= x1; x += step * (0.6 + r() * 0.8)) pts.push([x, y + (r() - 0.5) * jy])
  return pts
}
/** Đệm rêu dọc các đường gấp khúc (mặt trên gờ): MỘT đường dùng lại 3 lần — m3 đáy (lệch xuống), m2 thân, m1 ngọn. */
const mossU = (id: string) => U(id, 'tc-mc', ' y="2"') + U(id, 'tc-mb') + U(id, 'tc-ma', ' y="-2"')
const MOSS: [string, Pt[][]][] = [
  // tháp: mặt trên mọi gờ, chân tháp
  ['tc-mT', [[[-74, -45], [52, -45], [80, -52]], [[-66, -227], [40, -227], [64, -227]], [[-70, -317], [42, -317], [57, -316]], [[-66, -405], [40, -405], [62, -405]], [[-84, 2], [-56, 2]], [[40, 2], [82, -2]]]],
  // thư viện: mái, bậu cửa, mép tường vỡ, nóc kệ, móng, mẩu tường phải
  ['tc-mL', [[[-206, -212], [-150, -212]], [[-172, -63], [-108, -63]], [[-54, -175], [-40, -158]], [[-20, -61], [-2, -43]], [[-52, -203], [104, -203]], [[-204, -18], [-130, -18]], [[150, -56], [156, -60], [164, -52], [172, -72], [182, -66], [192, -82], [204, -76]], [[146, -18], [206, -18]]]],
  // đồng hồ mặt trời: chân bệ, mép mặt số
  ['tc-mS', [[[-31, -6], [-12, -8]], [[16, -8], [30, -5]], [[-28, -56], [-14, -51]]]],
]
/** Vệt rêu chảy dưới gờ, thuôn dần, dồn về phía khuất nắng (phải). Mỗi đoạn: [x0, x1, y, số vệt, dài tối đa]. */
function drips(r: () => number, segs: number[][]): string {
  const polys: Pt[][] = []
  for (const [x0 = 0, x1 = 0, y = 0, n = 0, L = 40] of segs)
    for (let i = 0; i < n; i += 1) {
      const x = x0 + (x1 - x0) * Math.sqrt(r())
      const w = 4 + r() * 4
      polys.push([[x, y], [x + w * (0.3 + r() * 0.4), y + L * (0.45 + r() * 0.55)], [x + w, y]])
    }
  return mp(polys)
}
/** Thường xuân sống: thân ngoằn ngoèo, dày ở gốc thưa dần lên, rẽ nhánh; ba kiểu chùm lá (to ở gốc, lệch/nhỏ ở ngọn & nhánh). */
const IVY: Record<Season, string[]> = {
  xuan: ['tc-ivs', 'tc-ib', 'tc-ia'],
  ha: ['tc-iv', 'tc-ib', 'tc-ia'],
  thu: ['tc-iv', 'tc-ib', 'tc-ia'],
  dong: ['tc-ivw', 'tc-ivw', 'tc-ivw'],
}
function ivy(a: Add, r: () => number, season: Season, x: number, y: number, n: number, ang: number, wob: number, step: number, lim: (p: Pt) => Pt = p => p, br = 2): void {
  const cls = IVY[season]
  const grow = (x: number, y: number, n: number, ang: number, step: number, br: number, ci: number) => {
    const pts: Pt[] = [[x, y]]
    let d = ang
    for (let i = 0; i < n; i += 1) {
      d = ang + (d - ang) * 0.6 + (r() - 0.5) * wob
      const st = step * (0.55 + i / n)
      const q: Pt = [x + Math.cos(d) * st, y + Math.sin(d) * st]
      const p = lim(q)
      if (p[0] !== q[0]) d = -Math.PI - d // chạm mép tường: bật ngược hướng ngang
      ;[x, y] = p
      pts.push([x, y])
    }
    const cut = ci ? 0 : Math.ceil(pts.length * 0.45)
    if (cut) a(cls[0] as string, rp(pts.slice(0, cut + 1), false))
    a(cls[ci || 1] as string, rp(pts.slice(cut), false))
    for (let b = 0; b < br; b += 1) {
      const p = pts[2 + Math.floor(r() * Math.max(1, pts.length - 4))]
      if (p) grow(p[0], p[1], 4 + Math.floor(r() * 4), ang + (b % 2 ? -1 : 1) * (0.9 + r() * 0.5), step * 0.8, 0, 1 + (b % 2))
    }
  }
  grow(x, y, n, ang, step, br, 0)
}

// ───────────────────────── Hình lặp (định nghĩa MỘT lần trong defs, các mảnh gọi <use>) ─────────────────────────
/** Sườn phải chóp tháp (khuất nắng). */
const SPS = 'M36-403q-8-4-12-17L-8-550l54 129q4 14 14 22z'
/** Mép vỡ tường trước thư viện. */
const EDGE: Pt[] = [[-52, -200], [-46, -188], [-50, -172], [-38, -156], [-42, -138], [-26, -116], [-30, -98], [-14, -76], [-18, -58], [0, -40], [-4, -28], [14, -18], [16, 2]]
/** Các chùm tán cây [x, y, rộng, cao]. */
const CL: [number, number, number, number][] = [
  [70, -318, 34, 22],
  [104, -352, 36, 26],
  [150, -384, 42, 26],
  [198, -366, 38, 26],
  [238, -330, 34, 22],
  [164, -338, 40, 24],
  [124, -310, 34, 18],
]
function shapeDefs(ctx: Ctx): string {
  const cr = ctx.rng('thap-chuong-tan-khung')
  const pd = (id: string, d: string) => `<path id="${id}" d="${d}"/>`
  return (
    pd('tc-sp', 'M-66-403q12-4 14-17l44-130 32 130q4 13 12 17q-51 5-102 0z' + SPS) +
    pd('tc-tr', mp(stairGeo().fr)) +
    pd('tc-in', 'M-58-14v-186l256 4v182z') +
    pd('tc-lw', rp([[-204, 2], [-204, -200], ...EDGE]) + 'M150 2v-54l6-6 8 8 8-20 10 6 10-16 12 6v76z') +
    pd('tc-cn', CL.map(([x, y, w, h]) => blobS(cr, x, y, w * 0.95, h * 0.95, 7, 0.4)).join('')) +
    MOSS.map(([id, lines]) => pd(id, mp(lines, false))).join('') +
    courtDefs(ctx)
  )
}

// ───────────────────────── CSS riêng (tiền tố tc-) ─────────────────────────
// [tên, biến màu, bề rộng, dasharray, đầu tròn?]
const STROKES: [string, string, number, string, boolean][] = [
  ['lt', 'l2', 3, '0 17 0 29', true],
  ['sn', 'w3', 4, '', true],
  ['br', 'b1', 3, '', true],
  ['bt', 'b1', 1.8, '', true],
  ['bw', 'b1', 5, '', true],
  ['rl', 'b3', 2, '', true],
  ['fn', 'k2', 1.8, '', true],
  ['dt', 'w3', 2.6, '', true],
  ['xr', 'x1', 1.6, '', true],
  ['ma', 'm1', 2.6, '2 10 4 16 3 12', true],
  ['mb', 'm2', 7, '8 6 14 5 5 9 11 4', true],
  ['mc', 'm3', 6, '18 4 11 3 25 5', true],
  ['tk', 'k2', 3, '.8 5.1', false],
  ['mu', 's1', 3, '', false],
  ['vs', 's1', 8, '5 1.6', false],
  ['q1', 's1', 9, '12 3 8 3', false],
]
// marker theo đỉnh: [class, marker]
const MK: [string, string][] = [
  ['iv', 'kl'],
  ['ia', 'ka'],
  ['ib', 'kb'],
  ['ivs', 'ks'],
  ['ivw', 'kw'],
  ['le', 'kl'],
  ['fp', 'kp'],
  ['fq', 'kq'],
  ['g', 'kg'],
  ['gd', 'kd'],
  ['gh', 'kh'],
  ['f1', 'k1'],
  ['f2', 'k2'],
  ['f3', 'k3'],
]
const CSS =
  // mọi class bắt đầu bằng tc- là nét (không tô); .tc-sk (mảng trời) ghi đè lại phía sau
  `[class^=tc-]{fill:none;stroke-linejoin:round}` +
  STROKES.filter(s => s[4])
    .map(([n]) => `.tc-${n}`)
    .join(',') +
  `{stroke-linecap:round}` +
  STROKES.map(([n, v, w, d]) => `.tc-${n}{stroke:var(--${v});stroke-width:${w}${d ? `;stroke-dasharray:${d}` : ''}}`).join('') +
  `.tc-q2,.tc-q3,.tc-q4{stroke-width:9;stroke-dasharray:1 6;stroke-linecap:round;stroke-linejoin:round}.tc-q2{stroke:var(--l2);stroke-width:7}.tc-q3{stroke:var(--l3)}.tc-q4{stroke:var(--l4)}` +
  `.tc-iv,.tc-ia,.tc-ib,.tc-ivs,.tc-ivw{stroke:var(--b1)}.tc-fp,.tc-fq{stroke:var(--l4)}.tc-fp{stroke-width:1.4}` +
  MK.map(([n, k]) => `.tc-${n}{marker-mid:url(#tc-${k})}`).join('') +
  `[id^=tc-k]{overflow:visible}.tc-mo{fill:none;stroke:var(--k1);stroke-width:.8;opacity:.38}.tc-sk{fill:var(--sky1)}` +
  `.tc-ck{stroke:var(--k2);stroke-width:5;stroke-dasharray:1.6 10.44;stroke-dashoffset:.8}.tc-cq{stroke:var(--k1);stroke-width:8;stroke-dasharray:2.6 33.53;stroke-dashoffset:1.3}` +
  `.tc-rd{--ra:var(--p2);--rb:var(--p1);--rc:var(--p3);--rt:var(--s1)}.tc-rn{--ra:var(--e2);--rb:var(--e1);--rc:var(--e2);--rt:var(--k2)}` +
  `@keyframes tc-r{to{transform:rotate(360deg)}}.tc-hh{animation:tc-r 43200s linear infinite}.tc-mh{animation:tc-r 3600s linear infinite}` +
  `.tc-bl{animation:tc-bl 3.3s ease-in-out infinite alternate}@keyframes tc-bl{from{transform:rotate(calc(var(--a)*-1deg))}to{transform:rotate(calc(var(--a)*1deg))}}` +
  `.tc-lf{transform-box:fill-box;transform-origin:50% 50%;opacity:0;animation:tc-lf 15s linear infinite}@keyframes tc-lf{10%{opacity:1}50%{transform:translate(-18px,150px) rotate(220deg)}88%{opacity:1}to{transform:translate(12px,300px) rotate(400deg);opacity:0}}` +
  `.tc-dm{animation:tc-dm 13s ease-in-out infinite alternate}@keyframes tc-dm{50%{opacity:.35}to{transform:translate(11px,-17px)}}` +
  `.tc-tx{font:8px serif;letter-spacing:1.6px;text-anchor:middle}.tc-be{stroke:url(#tc-bk);stroke-width:9}`

// ───────────────────────── Defs: hoạ tiết, marker, kính màu, dương xỉ ─────────────────────────
const LV = (c: string, t: string) => `<use href="#tc-lv" class="${c}" transform="${t}"/>`
const MKR = (id: string, s: string, orient = true) => `<marker id="tc-${id}"${orient ? ' orient="auto"' : ''}>${s}</marker>`

/** Kệ sách: ô lặp 118×68 (hai tầng), sách cao 70–110 %, có khe trống, quyển nghiêng, chồng sách nằm ngang. */
function bookTile(r: () => number): string {
  const { a, out } = acc()
  const cols = ['p1', 'p3', 'p2', 'w2', 'r2', 'b3', 'x1', 's3', 'm2', 'd1', 'r1']
  const col = () => cols[Math.floor(r() * cols.length)] as string
  for (const base of [30, 64]) {
    let x = 1
    const lean = 2 + Math.floor(r() * 6)
    const flat = 8 + Math.floor(r() * 4)
    for (let i = 0; x < 110; i += 1) {
      if (r() < 0.08) {
        x += 3 + Math.floor(r() * 5)
        continue
      }
      if (i === flat) {
        const w = 13 + Math.floor(r() * 5)
        for (let k = 0; k < 3; k += 1) a(col(), `M${x + k} ${base - k * 4}h${w - 2 * k}v-4h${2 * k - w}z`)
        x += w + 1
        continue
      }
      const w = 4 + Math.floor(r() * 4)
      const h = Math.round(26 * (0.7 + r() * 0.42))
      if (i === lean) {
        const k = Math.round(h * 0.35)
        a(col(), `M${x} ${base}h${w}l${k}-${h}h-${w}z`)
        x += w + k + 1
      } else {
        a(col(), `M${x} ${base}v-${h}h${w}v${h}z`)
        x += w
      }
    }
  }
  a('b2', 'M0 30h118v4H0zM0 64h118v4H0z')
  a('hl', 'M2 30v-20h1v20zM41 64v-22h1v22zM77 30v-18h1v18z')
  return `<pattern id="tc-bs" width="118" height="68" patternUnits="userSpaceOnUse"><rect class="k1" width="118" height="68"/>${out()}</pattern>`
}

/** Bụi dương xỉ: 6 lá cong võng xuống, lá chét to ở gốc, nhỏ ở ngọn. */
function fernDef(r: () => number): string {
  let s1 = ''
  let s2 = ''
  for (const [ang, L] of [[-2.75, 58], [-2.3, 70], [-1.85, 66], [-1.4, 72], [-0.95, 62], [-0.5, 50]] as const) {
    const pts: Pt[] = []
    let x = 0
    let y = 0
    let a = ang + (r() - 0.5) * 0.2
    for (let i = 0; i <= 8; i += 1) {
      pts.push([x, y])
      a += (ang < -1.57 ? -1 : 1) * 0.12
      x += (Math.cos(a) * L) / 8
      y += (Math.sin(a) * L) / 8
    }
    s1 += rp(pts.slice(0, 6), false)
    s2 += rp(pts.slice(5), false)
  }
  return `<g id="tc-fe">${P('tc-fp', s1)}${P('tc-fq', s2)}</g>`
}

/** Cỏ đồng: ô lặp 420×60 — búi cỏ tối, búi sáng, hoa dại theo mùa; bản phóng to cho gần người xem & tiền cảnh. */
function meadowTile(ctx: Ctx, r: () => number): string {
  const dk: Pt[] = []
  const lt: Pt[] = []
  const fl: Pt[] = []
  for (let i = 0; i < 15; i += 1) {
    const p: Pt = [12 + (i + r() * 0.7) * 26, 18 + r() * 38]
    dk.push(p)
    if (r() < 0.4) lt.push([p[0] + 7, p[1] + 2])
    if (r() < 0.45) fl.push([p[0] + 4 + r() * 8, p[1] - 4])
  }
  const fc = { xuan: 'tc-f1', ha: 'tc-f2', thu: 'tc-f1', dong: '' }[ctx.season]
  return (
    `<pattern id="tc-mw" width="420" height="60" patternUnits="userSpaceOnUse">${P('tc-gd', mk(dk))}${P('tc-gh', mk(lt))}${fc ? P(fc, mk(fl)) : ''}</pattern>` +
    // pattern kế thừa viết thẻ đóng riêng (không tự đóng "/>"): bộ dò hoạt ảnh trong pattern của lõi khớp tới "</pattern>" kế
    // tiếp, gặp thẻ tự đóng sẽ nuốt nhầm defs module khác và báo sai cho tc-mw2.
    `<pattern id="tc-mw2" href="#tc-mw" patternTransform="translate(130 6)scale(1.8)"></pattern><pattern id="tc-mw3" href="#tc-mw" patternTransform="translate(60 0)scale(2.7)"></pattern>`
  )
}

// Cửa sổ hoa hồng: kính 8 ô (3 màu dịu + 1 ô vỡ), nan đá toả + vòng đá lá-đề (cusp) + vành đá. Ban đêm cùng hình, đổi
// biến màu: kính sáng ấm, đá thành bóng tối.
const ROSE =
  `<g id="tc-rw"><circle r="16" style="fill:var(--ra)"/>` +
  [
    ['rb', '7.46 14.92 7.46 7.46 7.46 14.92'],
    ['rc', '0 7.46 7.46 29.84 7.46 7.46'],
    ['k1', '0 29.84 7.46 22.38'],
  ]
    .map(([v, d]) => `<circle class="tc-o" r="9.5" style="stroke:var(--${v});stroke-width:13;stroke-dasharray:${d}"/>`)
    .join('') +
  `<circle r="4" style="fill:var(--rc)"/><path class="tc-o" style="stroke:var(--rt);stroke-width:1.8" d="M0-4v-12M0 4v12M-4 0h-12M4 0h12M3 3l8 8M-3-3l-8-8M3-3l8-8M-3 3l-8 8M15 0a6 6 0 0 0-4.4 10.6a6 6 0 0 0-10.6 4.4a6 6 0 0 0-10.6-4.4a6 6 0 0 0-4.4-10.6a6 6 0 0 0 4.4-10.6a6 6 0 0 0 10.6-4.4a6 6 0 0 0 10.6 4.4a6 6 0 0 0 4.4 10.6"/>` +
  `<circle class="tc-o" r="17.5" style="stroke:var(--rt);stroke-width:3.5"/></g>`

function defs(ctx: Ctx): string {
  const r = ctx.rng('thap-chuong-defs')
  return (
    `<pattern id="tc-bk" width="20" height="8" patternUnits="userSpaceOnUse"><rect class="r2" width="20" height="8"/>${P('r1', 'M1 1h8v3h-8zM12 5h6v2.5h-6z', O(0.45))}${P('r3', 'M11 1h7v3h-7z', O(0.4))}<path class="tc-mo" d="M0 .5h20M0 4.5h20M10 .5v4M0 4.5v4"/></pattern>` +
    `<pattern id="tc-sc" width="10" height="7" patternUnits="userSpaceOnUse"><path class="tc-mo" d="M0 7a5 5 0 0 1 10 0M-5 3.5a5 5 0 0 1 10 0M5 3.5a5 5 0 0 1 10 0"/>${P('hl', 'M2 6a3 3 0 0 1 3-2v1a2 2 0 0 0-2 1z')}</pattern>` +
    `<pattern id="tc-fs" width="92" height="24" patternUnits="userSpaceOnUse">${P('hl', 'M12 2h22v9h-22zM50 14h24v9h-24z')}${P('sh', 'M37 2h17v9h-17zM2 14h20v9h-20zM76 2h14v9h-14z')}<path class="tc-mo" d="M0 1h92M0 12.5h92M10 1l-2 11M35 1l1 11M55 1l-1 11M75 1v11M24 13l1 11M48 13l-1 11M76 13l1 11"/><path class="tc-o" style="stroke:var(--m2);stroke-width:1.8;opacity:.7" d="M0 12.5h31M55 1l-1 11M24 13l1 11M62 1h26M76 13l1 9"/>${P('m2', 'M7 11h6v3h-6zM33 0h5v2h-5zM22 11h4v3h-4zM73 3h3v5h-3z')}</pattern>` +
    `<pattern id="tc-fs2" href="#tc-fs" patternTransform="scale(1.5 1.4)"></pattern>` +
    bookTile(r) +
    `<pattern id="tc-rt" width="12" height="9" patternUnits="userSpaceOnUse"><rect class="r2" width="12" height="9"/>${P('r1', 'M0 0h5v7h-5zM6 4h5v4h-5z', O(0.5))}<path class="tc-mo" d="M0 8.5h12M5.5 0v8.5M11.5 0v8.5"/></pattern>` +
    // Vết thời gian trên tường: vệt ố tối & sáng chảy dọc, vết nứt, đốm rêu
    `<pattern id="tc-gr" width="110" height="130" patternUnits="userSpaceOnUse">${P('k1', 'M14 0l4 74 4-74zM70 34l3 52 5-52zM96 0l2 34 3-34z', O(0.1))}${P('w3', 'M40 58l2 40 3-40z', O(0.3))}${P('z2', 'M60 8l-4 10 5 6-6 12m7-22l8 4M20 92l6 9-3 8 5 7m-4-15l-7 4', O(0.6))}${P('m2', 'M8 122h3v2h-3zM90 70h2v3h-2zM44 20h2v2h-2zM100 112h3v2h-3z', O(0.7))}</pattern>` +
    `<path id="tc-gp" d="M-5 0q0-7-4-12q6 5 6 12zM-1 0q-1-9 2-15q0 9 2 15zM3 0q1-6 7-9q-4 5-4 9z"/><path id="tc-fw" d="M-4 0a2 2 0 1 0 .1 0zM0-3a2 2 0 1 0 .1 0zM1 2a1.6 1.6 0 1 0 .1 0z"/><path id="tc-lv" d="M0 0q4-6 11-2q-4 5-11 2z"/>` +
    MKR('kl', `<g id="tc-la">${LV('l3', 'rotate(-70)scale(1.3)')}${LV('l2', 'translate(-1 -2)rotate(-76)scale(1.05)')}${LV('l4', 'rotate(108)scale(.85)')}</g>`) +
    MKR('ka', `${LV('l2', 'rotate(-38)scale(.7)')}${LV('l3', 'rotate(140)scale(.6)')}`) +
    MKR('kb', `${LV('l3', 'rotate(62)')}${LV('l2', 'translate(-1 1)rotate(56)scale(.8)')}`) +
    MKR('ks', `<use href="#tc-la"/>${P('f3', 'M3-8a1.6 1.6 0 1 0 .1 0z')}`) +
    MKR('kw', P('b3', 'M0 0q1-3 4-4q0 3-4 4z')) +
    MKR('kp', `${P('l3', 'M0 0q2-2 3-7q-3 2-3 7z')}${P('l4', 'M0 0q2 2 3 6q-3-2-3-6z')}`) +
    MKR('kq', P('l3', 'M0 0q2-2 2-6q-2 2-2 6zM0 0q2 2 2 5q-2-2-2-5z')) +
    MKR('kg', `<use href="#tc-gp" class="g3"/>`, false) +
    MKR('kd', `<use href="#tc-gp" class="g4" transform="scale(1.4)"/>`, false) +
    MKR('kh', `<use href="#tc-gp" class="g1"/>`, false) +
    ['1', '2', '3'].map(k => MKR('k' + k, `<use href="#tc-fw" class="f${k}"/>`, false)).join('') +
    meadowTile(ctx, r) +
    ROSE +
    fernDef(r) +
    shapeDefs(ctx) +
    `<radialGradient id="tc-gl"><stop offset="0" style="stop-color:var(--g1)" stop-opacity=".75"/><stop offset="1" style="stop-color:var(--g1)" stop-opacity="0"/></radialGradient>`
  )
}

// ───────────────────────── Mặt trời: bóng đổ theo giờ thật ─────────────────────────
type Sun = { k: number; c: number; dx: number; dy: number }
/** Hướng bóng (cảnh nhìn về phía nam: sáng bóng ngả phải, trưa ngả về phía người xem, chiều ngả trái). */
function sunOf(ctx: Ctx): Sun {
  const u = clamp((ctx.vn.hourF - 6) / 12, 0, 1)
  const cloud = { quang: 1, it: 0.85, vua: 0.55, nhieu: 0.18, 'u-am': 0 }[ctx.cur.cloud]
  const k = clamp((ctx.daylight - 0.2) * 1.6, 0, 1) * cloud * (ctx.cur.precip === 'khong' ? 1 : 0.2)
  const L = clamp(0.3 / Math.max(ctx.sunAlt, 0.05), 0.35, 3)
  const c = Math.cos(Math.PI * u)
  return { k, c, dx: c * L, dy: (Math.sin(Math.PI * u) * 0.3 + 0.05) * L }
}
/** Bóng đổ của một khối cao h, rộng w (đáy ở y=0, cục bộ), thuôn về đỉnh, dài tối đa `cap`. Mặt đất nhìn ngang bị nén
 *  theo phối cảnh (ty × 0,3); quanh trưa (|cos| < 0,15) bóng thu lại thành vệt dẹt dưới chân. */
function cast(sun: Sun, w: number, h: number, taper: number, cap: number): string {
  if (sun.k < 0.05) return ''
  const o = O(n0(sun.k * 22) / 100)
  if (Math.abs(sun.c) < 0.15) return `<ellipse class="k1" cy="2" rx="${n0(w * 0.8)}" ry="6"${o}/>`
  const s = Math.min(1, cap / Math.hypot(sun.dx * h, sun.dy * h * 0.3))
  const tx = sun.dx * h * s
  const ty = sun.dy * h * s * 0.3
  return P('k1', rp([[-w / 2, 0], [w / 2, 0], [(w / 2) * taper + tx, ty], [(-w / 2) * taper + tx, ty]]), o)
}

// ───────────────────────── Tháp chuông ─────────────────────────
function tower(ctx: Ctx, sun: Sun, snow: boolean, lite: boolean): { svg: string; glow: string; shadow: string } {
  const r = ctx.rng('thap-chuong-thap')
  const sy = (y: number) => n0(y + (-221 - y) * 0.04) // mặt bên lùi về tầm mắt (y cục bộ -221)
  const side = (x0: number, x1: number, yb: number, yt: number, xb1 = x1, xt0 = x0) => rp([[x0, yb], [xt0, yt], [x1, sy(yt)], [xb1, sy(yb)]])
  const pS = side(52, 80, 2, -44)
  const shS = side(38, 62, -44, -214, 62, 36)
  const c1S = side(40, 64, -214, -226)
  const csS = rp([[38, -226], [38, -304], [50, sy(-304)], [54, -296], [60, -293], [60, sy(-226)]])
  const c2S = rp([[42, -304], [42, -316], [57, -315], [63, -309], [66, sy(-304)]])
  const belS = side(36, 58, -316, -394)
  const c3S = rp([[40, -394], [40, -404], [52, -403], [56, -398], [62, sy(-394)]])
  const shaftF = 'M-62-44l4-170h94l2 170z'
  const stageF = 'M-64-226v-78h102v78z'
  const { a, out } = acc()
  let s = `<ellipse class="ao" cx="6" cy="2" rx="104" ry="8"/>`
  // Khối: bệ đá, thân vữa vàng, tầng đồng hồ đá, lầu chuông gạch, các gờ; vết thời gian; dựng khối sáng trái / tối phải
  a('s3', pS + csS + 'M-50 7h76l3 6h-82z')
  a('s2', 'M-80 2v-40l6-6h126v46z' + stageF + 'M50-404h12l-2-7-4 3-3-5-3 4z' + c1S + c2S + c3S)
  a('w1', shaftF)
  a('w2', shS)
  a('url(#tc-bk)', 'M-60-316v-78h96v78z' + belS + (lite ? '' : lump(r, -44, -78, 14, 20) + lump(r, 18, -170, 12, 15)))
  if (!lite) a('url(#tc-gr)', shaftF + stageF)
  a('hl', 'M-60-46l3-166h17l-3 166z', 0.35)
  a('sh', 'M9-44l-2-170h29l2 170z')
  a('s1', 'M-80-38l6-6h126v5H-76zM-68-214l2-12h106v12zM-72-304l2-12h112v12zM-68-394l2-10h106v10zM-46 2h68l3 5h-74zM-44-318h62v-5h-62z')
  a('k1', pS + shS + csS + belS + (lite ? '' : 'M-74-38h126v6h-126zM-58-214h94v6h-94zM-64-304h102v6h-102zM-60-394h96v6h-96z'), 0.28)
  if (!lite) a('tc-q1', 'M-59-48l4-164M34-46l-1-166M-57-318v-74M33-318v-74')
  s += out()
  if (ctx.wet > 0.15) s += P('wetsheen', shaftF)
  // Chóp nhọn ngói đồng xanh rỉ (vảy cá), mép mái võng; sườn phải sụp lộ rui
  s += U('tc-sp', 'p2') + `<use href="#tc-sp" fill="url(#tc-sc)"/>` + P('k1', SPS, O(0.35))
  a('hl', 'M-52-420l44-130-30 130z')
  // lỗ tối: cửa vòm, vòm lầu chuông, lỗ chóp, ô cửa mái
  a('k1', 'M-34 2v-96a22 22 0 0 1 44 0v96zM-40-322v-30a27 27 0 0 1 54 0v30zM42-326v-26q5-10 10 0v26z')
  a('k2', 'M24-446l8-5 6 8 2 13-5 6-8-6z')
  a('b2', 'M-33 2v-96a21 21 0 0 1 21-21V2z')
  a('b1', 'M8 2v-94l-7-7V-2zM-40-379h54v-4h-54z')
  if (!lite) a('tc-vs', 'M-38-94a26 26 0 0 1 52 0M-44-352a31 31 0 0 1 62 0')
  s += out() + P('tc-sk', 'M-24-322v-28a16 16 0 0 1 32 0v28z')
  // Cửa sổ hoa hồng: đá chạm + kính màu dịu
  s += `<circle class="s3" cx="-12" cy="-160" r="22"/><use href="#tc-rw" x="-12" y="-160" class="tc-rd"/>`
  // Mặt đồng hồ: viền đá, vành đồng, mặt kem ngả màu có sáng/tối, vạch giờ kiểu số La Mã, gỉ đồng chảy, vết nứt.
  // Giờ thật: kim phút 3600 s, kim giờ 43200 s; pha theo thời gian tuyệt đối, +210° = UTC+7.
  s += T(
    -13,
    -265,
    `<circle class="s3" r="35"/><circle class="x1" r="32"/><circle class="p3" r="28"/>` +
      (lite
        ? ''
        : P('hl', 'M-26-4a26 26 0 0 1 30-22a30 30 0 0 0-30 22z', ' style="opacity:.5"') +
          P('sh', 'M26 4a26 26 0 0 1-30 22a30 30 0 0 0 30-22z') +
          P('p2', 'M-3 28h6l1 20-3 32-3-32z', O(0.4)) +
          P('z2', 'M9-25l-3 8 4 5-5 9')),
  )
  // #tc-cf (vạch giờ, lớp sáng đêm gọi lại bằng <use>) phải TĨNH: kim quay nằm ngoài, vẽ lại tại mỗi nơi dùng mặt đồng hồ
  // (bản sao <use> của cây con có hoạt ảnh không lên compositor). Cùng tâm translate, cùng thứ tự vẽ: vạch → kim → chốt.
  const kim = T(
    -13,
    -265,
    `<g transform="rotate(210)">${P('k1 tc-hh', 'M-3 4L0-15l3 19z', ` style="animation-delay:${ctx.ph(43200)}"`)}</g>${P('k1 tc-mh', 'M-2 5L0-23l2 28z', ` style="animation-delay:${ctx.ph(3600)}"`)}<circle class="x1" r="3"/>`,
  )
  s += `<g id="tc-cf" transform="translate(-13 -265)"><circle class="tc-o tc-ck" r="23"/><circle class="tc-o tc-cq" r="23"/></g>` + kim
  // Quả chuông đồng (lắc khi gió mạnh)
  const amp = n0(clamp((ctx.cur.wind - 0.3) * 16, 0, 9))
  const bell =
    P('b1', 'M-8-7h16v3h-16zM-4-4h8v4h-8z') +
    P('x1', 'M-5 0c-6 0-6 7-6 13c0 10-3 15-8 19h38c-5-4-8-9-8-19c0-6 0-13-6-13zM-20 31h40l1 4h-42z') +
    (lite ? '' : P('k1', 'M2 1c6 1 7 7 7 12c0 10 3 15 7 19H2z', O(0.3)) + P('tc-rl', 'M8 31q3 13-2 23'))
  s += T(-13, -376, amp > 0 ? `<g class="tc-bl" style="--a:${amp};animation-delay:${ctx.ph(6.6)}">${bell}</g>` : bell)
  // Cột thu lôi + gà gió
  s += P('tc-fn', 'M-8-548v-36') + `<circle class="x1" cx="-8" cy="-560" r="4"/>`
  s += `<g class="sw4">${P('k2', 'M-14-586c0-6 4-9 8-7l2-4 2 3-2 2c2 3 0 6-4 6z')}</g>`
  // Rêu: đệm trên mặt mọi gờ (mặt bên khuất nắng), chân tháp; vệt rêu chảy dưới gờ (dồn phải)
  s += mossU('tc-mT')
  if (!lite) a('m3', drips(r, [[54, 78, -44, 2, 34], [-56, 40, -208, 3, 70], [22, 36, -298, 1, 38]]), 0.45)
  if (snow) {
    a('tc-sn', 'M-76-46h128M-66-228h106M-70-318h112M-66-406h106')
    a('w3', 'M-8-550l-24 70 6-6 6 8 6-9 6 10 6-8 6 7 5-2zM-8-550l17 70 5-6 7 6z')
  }
  // Thường xuân: bò từ chân trái lên lầu chuông, toả nhánh; một dây bên mặt khuất nắng; dây rủ khỏi gờ
  const vr = ctx.rng('thap-chuong-day-thap')
  if (!lite) {
    ivy(a, vr, ctx.season, -72, 2, 15, -1.45, 0.9, 13, ([x, y]) => [clamp(x, y < -40 ? -60 : -80, -24), Math.max(y, -396)], 2)
    ivy(a, vr, ctx.season, 66, 2, 7, -1.62, 0.6, 10, ([x, y]) => [clamp(x, 38, 66), y], 0)
    ivy(a, vr, ctx.season, 22, -222, 4, 1.5, 0.6, 8, p => p, 0)
  }
  s += out()

  // Ban đêm: kính màu sáng ấm (đá thành bóng tối), cửa hé ánh nến, mặt đồng hồ sáng
  let g = `<circle cx="-12" cy="-160" r="40" fill="url(#gw)" opacity=".5"/><use href="#tc-rw" x="-12" y="-160" class="tc-rn"/>`
  g += P('e1', 'M-12 2v-117q16 3 20 21V2z', O(0.5))
  g += `<circle cx="-13" cy="-265" r="56" fill="url(#gw)"/><circle class="e2" cx="-13" cy="-265" r="28" opacity=".6"/><use href="#tc-cf"/>` + kim
  return { svg: T(TX, TY, s, '', SKEW), glow: T(TX, TY, g, '', SKEW), shadow: T(TX, TY, cast(sun, 150, 590, 0.1, 300)) }
}

// ───────────────────────── Cầu thang xoắn lên khoảng không ─────────────────────────
const SR = 40 // bán kính thang
const SN = 14 // bậc mỗi vòng
const SDA = (Math.PI * 2) / SN
const SRISE = 9
const SSTEPS = SN * 2
const SA0 = 0.15
const SQ = (ang: number, rad: number, h: number): Pt => [rad * Math.sin(ang), -h + 0.36 * rad * Math.cos(ang)]
/** Hình học thang xoắn: bậc nêm phía trước/sau trụ, cột con, tay vịn (tách đoạn trước/sau). Thuần, dùng cho cả defs lẫn mảnh. */
function stairGeo(): { bk: Pt[][]; fr: Pt[][]; bal: Pt[][]; rail: [boolean, Pt[]][] } {
  const [R, dA, Q] = [SR, SDA, SQ]
  const bk: Pt[][] = []
  const fr: Pt[][] = []
  const bal: Pt[][] = []
  const rail: [boolean, Pt[]][] = []
  for (let i = 0; i < SSTEPS; i += 1) {
    const a = SA0 + i * dA
    const b = a + dA * 0.9
    const m = (a + b) / 2
    const h = 12 + i * SRISE
    const f = Math.cos(m) > 0
    ;(f ? fr : bk).push([Q(m, 5, h), Q(a, R, h), Q(b, R, h)])
    if (f && i % 3 === 1) bal.push([Q(m, R - 2, h), Q(m, R - 2, h + 17)])
    const p = Q(m, R - 2, h + 17)
    const last = rail[rail.length - 1]
    if (!last || last[0] !== f) rail.push([f, last ? [last[1][last[1].length - 1] as Pt, p] : [p]])
    else if (i % 2 || Math.abs(Math.cos(m)) < 0.5) last[1].push(p)
  }
  return { bk, fr, bal, rail }
}
function stair(ctx: Ctx, sun: Sun, snow: boolean, lite: boolean): { svg: string; glow: string } {
  const [R, dA, Q, steps, a0, rise] = [SR, SDA, SQ, SSTEPS, SA0, SRISE]
  const { bk, bal, rail } = stairGeo()
  const railD = (f: boolean) => mp(rail.filter(q => q[0] === f).map(q => q[1]), false)
  const top = 12 + steps * rise
  // Bóng, đế; bậc phía sau trụ (nhạt) + tay vịn sau; trụ giữa cắt ở chiếu nghỉ trên cùng
  let s = cast(sun, 24, 340, 0.6, 40) + `<ellipse class="ao" cy="1" rx="50" ry="8"/><ellipse class="s2" cy="-3" rx="36" ry="7"/>`
  if (!lite) s += P('s3', mp(bk), O(0.6)) + P('tc-xr', railD(false), O(0.6))
  s += P('s3', `M-5-4V${-top - 30}h10V-4z`) + (lite ? '' : P('hl', `M-5-4V${-top - 30}h3V-4z`) + P('k1', `M2-4V${-top - 30}h3V-4z`, O(0.25)))
  // Bậc phía trước: mặt bậc nêm (s1) + cổ bậc (bản lệch xuống, s3) + rêu viền bậc; cột con + tay vịn
  s += U('tc-tr', 's3', ' y="5"') + U('tc-tr', 's1') + (lite ? '' : U('tc-tr', 'tc-ma')) + (snow ? U('tc-tr', 'w3', ' y="-1"') : '')
  s += P('tc-xr', (lite ? '' : mp(bal, false)) + railD(true))
  // Chiếu nghỉ + đèn lồng treo trên tay đỡ
  s += `<ellipse class="s3" cy="${-top + 3}" rx="17" ry="7"/><ellipse class="s1" cy="${-top}" rx="16" ry="6"/>`
  s += P('tc-fn', `M4-${top + 26}h16v5`) + P('k2', `M16-${top + 21}h8v2h-8zM17-${top + 10}h6v2h-6z`) + P('a1', `M17-${top + 19}h6v9h-6z`)
  // Các bậc cuối đã rời cầu thang, nối tiếp cung xoắn bay lên trời: nhỏ dần, mờ dần; tận cùng là khung cửa gỗ giữa trời
  const nf = lite ? 4 : 5
  const grp = ['', '']
  let end: Pt = [0, -top]
  for (let j = 1; j <= nf + 1; j += 1) {
    const k = 1 - j * 0.06
    const an = a0 + (steps + j * 1.6) * dA
    const Rr = R * (1 + j * 0.06)
    const h = top + 16 + j * 15 + j * j * 0.8
    const w = dA * 1.15 * k
    if (j > nf) end = Q(an + w / 2, Rr * 0.8, h)
    else grp[j <= nf / 2 + 0.5 ? 0 : 1] += mp([[Q(an, Rr * 0.5, h), Q(an, Rr, h), Q(an + w, Rr, h), Q(an + w, Rr * 0.5, h)]])
  }
  grp.forEach((tp, i) => {
    const inner = (lite || i ? '' : P('s3', tp, ' transform="translate(0 5)"')) + P('s2', tp) + (snow ? P('w3', tp, ' transform="translate(0 -1)"') : '')
    s += `<g class="bob" style="animation-delay:${ctx.ph(10.4, 'tc-st' + i)}"${i ? O(0.5) : ''}>${inner}</g>`
  })
  // khung cửa đứng giữa trời: trong cửa là một bầu trời khác (xanh huyền ảo)
  const door = P('e4', 'M-5 0v-19h10v19z', O(0.4))
  s += T(end[0], end[1], P('b2', 'M-8 0v-22h16v22h-3v-19h-10v19z') + door + P('s1', 'M-10 0h20l-2 3h-16z'), O(0.6))
  let g = T(end[0], end[1], `<circle cy="-10" r="22" fill="url(#gg)"/>${door}`)
  g += `<g class="fl"><circle cx="20" cy="${-top - 14}" r="30" fill="url(#gw)"/>${P('e1', `M17-${top + 19}h6v9h-6z`)}</g>`
  return { svg: T(SX, SY, s), glow: T(SX, SY, g) }
}

// ───────────────────────── Thư viện cổ bỏ ngỏ + cây mọc xuyên mái ─────────────────────────
function library(ctx: Ctx, sun: Sun, snow: boolean, rain: boolean, lite: boolean): { svg: string; glow: string; canopy: string; shadow: string } {
  const r = ctx.rng('thap-chuong-thu-vien')
  const nz = ctx.noise('thap-chuong-tuong-tv')
  const { a, out } = acc()
  let s = `<ellipse class="ao" cy="3" rx="215" ry="8"/>`
  // Lòng thư viện (tối) + phòng trong sâu hút bên phải, dầm gãy; kệ sách, thang trượt, sàn gỗ, thân cây mọc từ sàn
  s += U('tc-in', 'w2') + U('tc-in', 'k1', O(0.42))
  a('k2', 'M164-18v-118q15-18 30 0v118z')
  a('k1', 'M170-18v-110q9-11 18 0v110z', 0.55)
  a('sh', 'M164-18v-118l7 4v114zM-58-200h256v10h-256z')
  a('b1', 'M-50-22v-174h72v174zM30-22v-174h72v174zM110-22v-158h52v158z')
  a('b2', 'M-53-196h78v-6h-78zM27-196h78v-6h-78zM-58-14l2-10h254l2 10zM134-16l6-64 3-80 2-102h15l-3 102 2 80 9 64zM92-58h22v-3h-22zM198-154l8 5-34 136-8-2zM134-16q-10 2-22 11h9q5-6 13-7zM160-16q12 1 24 9l-9 1q-6-6-15-6z')
  a('url(#tc-bs)', 'M-46-26v-164h64v164zM34-26v-164h64v164zM114-26v-148h44v148z')
  a('k1', 'M-58-200l256 4v60q-120-10-256 6zM153-16l1-144 6-102-3 102 2 80 9 64zM206-149l-34 136-3-1 33-136z', 0.3)
  a('hl', 'M140-20l3-60 2-80 2-100h2l-2 100-2 80-3 60zM198-154l2 1-34 136-2-1z')
  // Ghế bành nhung đỏ bạc màu, bàn đèn đọc sách, chồng sách dưới sàn, trang giấy rơi; rễ loe bẩy lệch tấm sàn
  if (!lite) {
  a('s2', 'M100-17l16-6 3 7-16 4z')
  a('p1', 'M36-24v-14h50v14zM42-38v-32q19-10 38 0v32zM34-26v-20q0-6 6-6t6 6v20zM76-26v-20q0-6 6-6t6 6v20zM108-18h22v-4h-22z')
  a('hl', 'M36-27v-19q0-4 4-4v23z')
  a('tc-bt', 'M95-58l-2 40M111-58l2 40')
  a('x2', 'M99-61h8v-3h-8z')
  a('p2', 'M96-77l3-9h8l3 9zM-40-18h26v-5h-26zM110-22h18v-4h-18z')
  a('p3', 'M-37-23h22v-4h-22z')
  a('w3', 'M0-20l12-3 12 3-1 3-11-2-11 2zM52-15l8-2 1 3-8 2z')
  }
  // Bóng tán cây đổ lên kệ (ngày nắng)
  if (sun.k > 0.2 && !lite) a('k1', lump(r, 110, -160, 90, 34, 6), n0(sun.k * 20) / 100)
  s += out()
  // Sách bay lơ lửng (dreamcore)
  s += T(12, -128, `<g class="bob">${P('p1', 'M-15-2l15 3 15-3-1 3-14 3-14-3z')}${P('w3', 'M0 0l-14-3 1-9 13 3z')}${P('p3', 'M0 0l14-3-1-9-13 3z')}</g>`)
  // Nắng rọi xiên qua mái sập (theo hướng mặt trời) + bụi bay chậm trong vệt nắng
  if (sun.k > 0.3 && ctx.daylight > 0.5 && !lite) {
    const k = sun.c >= 0 ? 1 : -1
    const t = k > 0 ? 6 : 150
    s += P('hl', rp([[t - 26, -254], [t + 30, -254], [t + 30 + k * 86, -18], [t - 6 + k * 86, -18]]) + rp([[t + 42, -254], [t + 64, -254], [t + 64 + k * 80, -18], [t + 50 + k * 80, -18]]), ' style="opacity:.15"')
    const pts: Pt[][] = []
    for (let i = 0; i < 7; i += 1) {
      const u = 0.1 + ((i * 0.37) % 0.82)
      const p: Pt = [t + 14 + k * 86 * u + (i % 3) * 9, -254 + 236 * u]
      pts.push([p, p])
    }
    s += `<g class="tc-dm" style="animation-delay:${ctx.ph(26, 'tc-dm')}">${P('tc-dt', mp(pts, false))}</g>`
  }
  // Tường trước bên trái còn đứng (vữa vàng): vết thời gian, mảng gạch lộ theo nhiễu, vệt ố nước; cạnh vỡ lộ lõi gạch
  s += U('tc-lw', 'w1')
  if (!lite) {
  s += `<use href="#tc-lw" fill="url(#tc-gr)"/>`
  const cand: [number, number, number][] = []
  for (let y = -184; y < -30; y += 26)
    for (let x = -194; x < -60; x += 28) {
      const p: Pt = [x + (r() - 0.5) * 14, y + (r() - 0.5) * 12]
      if (p[0] > -184 && p[0] < -96 && p[1] > -196) continue
      cand.push([p[0], p[1], fbm(nz, p[0] / 60, p[1] / 60, 3)])
    }
  cand.sort((p, q) => q[2] - p[2])
  a('url(#tc-bk)', cand.slice(0, 3).map(([x, y]) => lump(r, x, y, 9 + r() * 7, 6 + r() * 5, 5)).join(''))
  a('w3', mp([[[-158, -58], [-153, -18], [-146, -58]]]), 0.3)
  }
  a('sh', 'M-204-200h162v14h-162z')
  a('hl', 'M-204-20v-178h8v178z')
  s += out() + (lite ? '' : P('tc-o tc-be', rp(EDGE, false), ' transform="translate(4 2)"'))
  // Cửa sổ vòm kính vỡ
  a('k1', 'M-168-60v-72a28 28 0 0 1 56 0v72z')
  s += out() + (lite ? '' : P('tc-sk', 'M-138-114v-34h24v14l-10-6-6 18z', O(0.55)))
  a('tc-mu', 'M-140-60v-96M-168-110h56')
  if (!lite) a('tc-vs', 'M-172-132a32 32 0 0 1 64 0')
  a('s1', 'M-174-58h68v-5h-68zM-172-176h64v-13h-64zM-204-14h408v-3h-408zM-20 2h150l4 6h-158z')
  // Móng tường chạy suốt, đá vụn chỗ tường đổ, bậc lên
  a('s2', 'M-204 2v-16h408V2z' + (lite ? '' : lump(r, 42, -16, 15, 7, 5) + lump(r, 98, -18, 13, 6, 5)))
  a('s3', 'M-26 8h164l4 7h-172z')
  // Mái ngói còn lại (trái), phần phải chỉ còn rui + đòn nóc gãy
  a('url(#tc-rt)', rp([[-218, -200], [-198, -264], [-40, -264], [-30, -250], [-44, -236], [-34, -222], [-46, -210], [-40, -200]]))
  a('k1', 'M-218-200l20-64h8l-20 64z', 0.2)
  a('s3', 'M-200-264h162v-6h-162z')
  if (snow) {
    a('tc-sn', 'M-198-266h158M-216-202h174')
    a('w3', 'M-198-264h158l4 7-12 3-14-2-16 5-20-3-18 4-20-3-20 4-22-3-14 3z')
  }
  a('tc-br', 'M-24-200l4-62M6-198l4-64M50-198l2-38M76-198l4-64M180-196l3-44')
  a('tc-bw', 'M-40-263l100 2 36 17')
  s += out() + (lite ? '' : `<text class="k2 tc-tx" x="-140" y="-179" opacity=".6">THƯ VIỆN</text>`)
  // Rêu: mái, bậu cửa, mép tường vỡ, nóc kệ, móng (bên phải khuất nắng dày hơn) + vệt rêu chảy
  s += mossU('tc-mL')
  if (!lite) a('m3', drips(r, [[-200, -50, -186, 2, 56], [152, 204, -60, 2, 40]]), 0.45)
  // Thường xuân phủ tường trái (rẽ nhánh), dây rủ từ mái, mẩu tường phải
  const vr = ctx.rng('thap-chuong-day-tv')
  if (!lite) {
    ivy(a, vr, ctx.season, -200, 0, 14, -1.5, 0.9, 12, ([x, y]) => [clamp(x, -204, -60), Math.max(y, -198)], 2)
    ivy(a, vr, ctx.season, -96, -200, 4, 1.6, 0.5, 8, p => p, 0)
    ivy(a, vr, ctx.season, 202, 0, 7, -1.7, 0.7, 8, ([x, y]) => [clamp(x, 152, 204), y], 0)
  }
  s += out()

  // Tán cây: 8 chùm lá chồng nhau, mép xù (viền chấm tròn + lá marker), 4 sắc độ, lỗ thủng thấy trời, cành rủ vào phòng
  const cr = ctx.rng('thap-chuong-tan')
  const br = 'M152-262l-20-36-34-24-36-8M152-262l8-50-10-40 8-36M154-262l32-34 36-16 30 6M132-298l-10-46-18-26'
  const droop = 'M126-300q-26 12-36 50M150-270q-4 24-22 40'
  let c = P('tc-bw', br) + (lite ? '' : P('tc-bt', droop))
  if (ctx.season !== 'dong' && lite) c += U('tc-cn', 'l4', ' x="4" y="6"') + U('tc-cn', 'l3')
  else if (ctx.season !== 'dong') {
    c += U('tc-cn', 'l4 tc-q4', ' x="4" y="6"') + U('tc-cn', 'l3 tc-q3')
    c += P('l2 tc-q2', CL.slice(1, 4).map(([x, y, w, h]) => lump(cr, x - w * 0.22, y - h * 0.3, w * 0.62, h * 0.5, 5, 0.75, 0.4)).join(''))
    c += P(snow ? 'w3' : 'l1', lump(cr, 136, -400, 12, 7, 5))
    c += P('tc-sk', lump(cr, 132, -352, 8, 6, 5) + lump(cr, 192, -340, 7, 5, 4))
    c += U('tc-cn', 'tc-le') + P('tc-ia', droop)
    if (ctx.season === 'xuan') c += P('tc-f1', mk(CL.flatMap(([x, y, w, h]) => [0, 1].map(i => [x + (cr() - 0.5) * w * 1.2, y + (cr() - 0.5) * h - i * 6] as Pt))))
  } else {
    c += P('tc-ivw', br) + (snow ? P('tc-sn', br, ' transform="translate(0 -3)"') : '')
  }
  let canopy = `<g class="sw4">${c}</g>`
  if (ctx.season === 'thu' && !lite) canopy += `<path class="l2 tc-lf" style="animation-delay:${ctx.ph(15, 'tc-lf')}" d="M80-300q4-5 8 0q-4 5-8 0z"/>`

  // Ban đêm: đèn đọc sách vẫn sáng (cho một người đọc vắng mặt), sách bay ánh xanh, cửa sổ hắt ánh
  let g = `<g class="fl"><circle cx="103" cy="-74" r="52" fill="url(#gw)"/>${P('e1', 'M97-77l3-8h6l3 8z', O(0.9))}${P('e1', 'M96-77h14l12 58H84z', O(0.16))}</g>`
  g += `<circle cx="24" cy="-136" r="34" fill="url(#gg)" opacity=".55"/>`
  g += P('e1', 'M-166-62v-46h24v46zM-138-114v-34h24v34z', O(0.2))
  return { svg: T(LX, LY, s), glow: T(LX, LY, g), canopy: T(LX, LY, canopy), shadow: T(LX, LY, cast(sun, 410, 260, 0.9, 120)) }
}

// ───────────────────────── Sân lát đá, lối mòn & đá bước ─────────────────────────
/** Viền sân lát (đường cong mềm) + 4 đá bước to dần theo phối cảnh — hình lặp, định nghĩa trong defs. */
function courtDefs(ctx: Ctx): string {
  const nz = ctx.noise('thap-chuong-san')
  const r = ctx.rng('thap-chuong-san-co')
  const pts: Pt[] = []
  for (let x = 13110; x <= 13790; x += 170) pts.push([x - CX, ground(x) - CY + 3])
  for (let x = 13790; x >= 13110; x -= 100) pts.push([x - CX, 62 + fbm(nz, x / 120, 0.5, 2) * 34 - 26 * Math.exp(-(((x - 13790) / 60) ** 2)) - 30 * Math.exp(-(((x - 13110) / 50) ** 2))])
  let st = ''
  for (const [x, y, w, h] of [[-146, 98, 32, 8], [-150, 134, 44, 10], [-126, 182, 56, 13], [-164, 244, 70, 16]] as const) st += lump(r, x, y, w, h, 7, 0.74, 0.36)
  return `<path id="tc-co" d="${sp(pts, true)}"/><clipPath id="tc-cp"><use href="#tc-co"/></clipPath><path id="tc-ss" d="${st}"/>`
}
function courtyard(ctx: Ctx, snow: boolean, lite: boolean): string {
  let s = U('tc-co', 's2') + `<g clip-path="url(#tc-cp)">${F('url(#tc-fs)', 'M-300-10h700v44h-700z')}${F('url(#tc-fs2)', 'M-300 34h700v70h-700z')}</g>`
  if (lite) return T(CX, CY, s + U('tc-co', 'tc-g') + U('tc-ss', 's2') + (snow ? U('tc-co', 'w3', O(0.75)) : ''))
  // Lối mòn đất từ cửa tháp xuống phía người xem; cỏ mềm lấn vào sân (không còn "thảm" elip)
  s += P('d1', rp([[-156, 70], [-132, 70], [-118, 150], [-128, 230], [-120, 300], [-214, 300], [-196, 220], [-176, 140]]), O(0.35))
  s += `<ellipse fill="url(#tc-gl)" cx="292" cy="64" rx="66" ry="16"/>`
  s += U('tc-co', 'tc-g')
  // Đá bước to dần theo phối cảnh, viền rêu
  s += U('tc-ss', 'tc-mb', O(0.8)) + U('tc-ss', 's3', ' y="3"') + U('tc-ss', 's2') + U('tc-ss', 'hl', ' x="-2" y="-2"')
  // Vũng nước sau mưa phản chiếu trời
  if (ctx.wet > 0.25) {
    s += `<g opacity="${n0(clamp(ctx.wet, 0, 1) * (4 + 6 * ctx.daylight)) / 10}">${P('a3', 'M14 50a46 6 0 1 0 92 0a46 6 0 1 0-92 0M220 44a30 4 0 1 0 60 0a30 4 0 1 0-60 0')}${P('a1', 'M24 48h50v2h-50zM230 43h36v1h-36z')}</g>` + U('tc-co', 'wetsheen')
  }
  if (ctx.season === 'thu') s += P('tc-lt', 'M-260 20L380 40M-200 70L300 90')
  if (snow) s += U('tc-co', 'w3', O(0.75)) + U('tc-ss', 'w3', ' y="-2"')
  return T(CX, CY, s)
}

/** Đồng cỏ (lớp 3, một khúc [x0, x1], toạ độ thế giới để ô cỏ khớp nhau): mảng sáng mềm + hai dải cỏ (xa nhỏ, gần to). */
function meadow(ctx: Ctx, x0: number, x1: number): string {
  const r = ctx.rng('thap-chuong-co')
  const w = x1 - x0
  let s = ''
  for (let i = 0; i < 3; i += 1) {
    const y = 830 + r() * 90
    const k = (y - 780) / 170
    s += `<ellipse fill="url(#tc-gl)" cx="${n0(x0 + (w / 3) * (i + 0.2 + 0.6 * r()))}" cy="${n0(y)}" rx="${n0(100 + 110 * k)}" ry="${n0(10 + 18 * k)}"/>`
  }
  return s + F('url(#tc-mw)', `M${x0} 792h${w}v66h-${w}z`) + F('url(#tc-mw2)', `M${x0} 850h${w}v150h-${w}z`)
}

// ───────────────────────── Đồng hồ mặt trời (bóng kim theo giờ thật) ─────────────────────────
function sundial(ctx: Ctx, sun: Sun, snow: boolean, lite: boolean): string {
  const { a, out } = acc()
  a('s3', 'M-32 2l2-8h60l2 8zM-15-52h30v-5h-30z')
  a('s2', 'M-30-6l4-4h52l4 4zM-9-10q-6-14 0-22q-7-10 0-20h18q7 10 0 20q6 8 0 22z')
  if (!lite) a('hl', 'M-9-10q-6-14 0-22q-7-10 0-20h4v42z')
  let s = cast(sun, 30, 70, 0.6, 60) + `<ellipse class="ao" cy="2" rx="40" ry="6"/>` + out() + `<ellipse class="s3" cy="-56" rx="31" ry="9"/><ellipse class="s1" cy="-59" rx="30" ry="8"/>`
  if (!lite) a('tc-tk', 'M-23-58a23 6 0 0 0 46 0')
  if (sun.k > 0.05) {
    const L = Math.hypot(sun.dx, sun.dy) || 1
    const ex = (sun.dx / L) * 25
    const ey = (sun.dy / L) * 8
    a('k1', `M0-59L${J([n0(ex - 1.5), n0(-59 + ey)])}L${J([n0(ex + 1.5), n0(-59 + ey)])}Z`, n0(sun.k * 55) / 100)
  }
  a('x1', 'M-1-59v-15l13 14z')
  if (snow) a('w3', 'M-26-61a26 5 0 1 0 52 0a26 5 0 1 0-52 0')
  return s + out() + (lite ? '' : mossU('tc-mS'))
}

/** Khóm dương xỉ (lớp 3 hoặc 4) đung đưa theo gió. */
const fern = (x: number, y: number, k: number, sw: string, flip = false) =>
  `<g class="${sw}">` + T(x, y, (k < 1.4 ? `<ellipse class="ao" cy="2" rx="${n0(40 * k)}" ry="${n0(5 * k)}"/>` : '') + `<use href="#tc-fe" transform="scale(${flip ? -k : k} ${k})"/>`) + '</g>'

// ───────────────────────── Tiền cảnh lớp 4 (hai góc dưới) ─────────────────────────
function foreground(ctx: Ctx): { left: string; right: string } {
  const r = ctx.rng('thap-chuong-tien-canh')
  const { a, out } = acc()
  // Góc trái: mặt đồng hồ đá vỡ nằm lẫn trong cỏ, khóm dương xỉ, cỏ cao
  a('tc-mb', 'M2-4l20 8 28 2')
  a('tc-ma', 'M4-7l18 8 24 2')
  let L = out()
  L += T(
    30,
    -8,
    `<ellipse class="s3" cy="6" rx="62" ry="17"/><ellipse class="s2" rx="62" ry="17"/><ellipse class="tc-o tc-tk" rx="50" ry="12"/>` +
      P('x1', 'M-2 0l-30-7 2-2 30 7z'),
  )
  L += fern(150, 26, 1.5, 'sw2') + F('url(#tc-mw3)', 'M-240 -6h480v60h-480z')
  // Góc phải: tảng đá mòn rêu phủ phía sau chồng sách cũ, dương xỉ, cỏ cao
  a('s2', lump(r, 24, -14, 54, 32, 7, 0.82, 0.26))
  a('p2', 'M-130 4h96l4-16h-96z')
  a('w3', 'M-124-1h84l2-7h-84zM-112-27l66-3 1-6-66 3zM-100-44h44l1-5h-44z')
  a('p1', 'M-122-12l86-4 2-15-86 4z')
  a('r2', 'M-112-31h70l1-13h-70z')
  a('p3', 'M-104-44h52l2-10h-52z')
  a('tc-mb', 'M-104-55h54M-12-38q34-12 70 2')
  a('tc-ma', 'M-100-58h44M-6-41q30-10 58 2')
  const R = out() + fern(80, 28, 1.6, 'sw3', true) + F('url(#tc-mw3)', 'M-200 -6h420v60h-420z')
  return { left: T(17620, 952, L), right: T(18930, 952, R) }
}

// ───────────────────────── Dựng vùng ─────────────────────────
function build(ctx: Ctx): BuildOut {
  const lite = ctx.detail === 'lite'
  const snow = ctx.cur.precip === 'tuyet'
  const rain = ctx.cur.precip !== 'khong' && ctx.cur.precip !== 'tuyet'
  const sun = sunOf(ctx)
  const dim = ctx.daylight < 0.97
  const pieces: Piece[] = []
  const add = (x0: number, x1: number, prio: number, svg: string, glow?: string, layer: Layer = 3) => {
    pieces.push(glow && dim ? { layer, x0, x1, prio, svg, glow } : { layer, x0, x1, prio, svg })
  }
  if (!lite) add(12660, 14370, 4, meadow(ctx, 12660, 14370))
  add(13080, 13820, 7, courtyard(ctx, snow, lite))
  const tw = tower(ctx, sun, snow, lite)
  const lb = library(ctx, sun, snow, rain, lite)
  add(13080, 13820, 6, tw.shadow + lb.shadow)
  const st = stair(ctx, sun, snow, lite)
  add(12960, 13080, 7, st.svg, st.glow)
  add(13160, 13340, 9, tw.svg, tw.glow)
  add(13680, 14110, 8, lb.svg, lb.glow)
  add(13950, 14180, 8, lb.canopy)
  add(13530, 13620, 6, T(13575, 772, sundial(ctx, sun, snow, lite)))
  // Bãi cỏ nhỏ giữa sân (mèo ngủ xuân/hạ): mảng cỏ mềm hoà vào nền, viền búi cỏ, vài cụm hoa
  const gr = ctx.rng('thap-chuong-bai-co')
  let gp = `<ellipse fill="url(#tc-gl)" rx="66" ry="15"/>` + P('tc-g', mk(row(gr, -50, 50, 7, 9, 7)))
  if (ctx.season !== 'dong') gp += P(ctx.season === 'ha' ? 'tc-f2' : 'tc-f3', mk([[-32, -6], [30, -6], [43, -1], [-44, 0]]))
  add(13360, 13520, 5, T(13440, 790, gp))
  // Khóm dương xỉ giữa đồng cỏ
  if (!lite) {
    add(13030, 13150, 3, fern(13090, 858, 1, 'sw1'))
    add(13930, 14060, 3, fern(13995, 852, 1.1, 'sw3', true))
  }
  // Tiền cảnh lớp 4 ở hai góc dưới
  if (!lite) {
    const fg = foreground(ctx)
    add(17380, 17860, 2, fg.left, undefined, 4)
    add(18720, 19120, 2, fg.right, undefined, 4)
  }

  const spots: Spot[] = [
    { kind: 'cat', layer: 3, x: 13440, y: 787, s: 1 },
    { kind: 'cat-shelter', layer: 3, x: LX + 61, y: LY - 40, s: 0.9 },
    { kind: 'perch', layer: 3, x: n0(TX - 58 + 404 * SKT), y: TY - 404 },
    { kind: 'perch', layer: 3, x: n0(TX + 10 + 317 * SKT), y: TY - 317 },
    { kind: 'perch', layer: 3, x: LX - 120, y: LY - 264 },
    { kind: 'butterflies', layer: 3, x: 13100, y: 820 },
    { kind: 'fireflies', layer: 3, x: 14000, y: 800, w: 260 },
  ]
  return { pieces, spots, defs: defs(ctx), css: CSS }
}

export const region: Region = {
  id: 'thap-chuong',
  name: 'Tháp chuông',
  x0: 12600,
  x1: 14400,
  shots: [{ id: 'thap-chuong', name: 'Tháp chuông', x: 13540, y: 476, zoom: 1 }],
  build,
}
