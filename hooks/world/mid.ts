// KHỐI (lớp xa+giữa là phông của mọi cảnh → mảng lớn mềm, tương phản thấp, ngả sương):
//  ho-sen: trời sáng · núi L1 nhạt ngả sương · đồi L2 vừa (cầu cạn chìm trong sương ở thung, rail khuất sau đồi) · mặt hồ L3.
//  nhin-dao-bay: trời · đảo bay (tiêu điểm phụ phải-trên, bụng đá tối ấm, thác tan vào dải sương) · đồi L2 vừa · L3 tối.
//  ga-cu: trời · cây đa thần = MỘT khối tán vòm nhạt trên chân trời trái (cùng sắc độ núi xa) · đồi L2 · nhà ga L3 tiêu điểm.
//  canh-dong-hoa: trời · núi L1 · đồi L2 + cầu cạn chỉ ở thung trái, nhạt · đồng hoa L3; đảo bay nhỏ góc trên-trái.
//  Chiều sâu: 3 tầng núi xa (Z mờ nhất ám màu trời → A → tháp đá B), mỗi tầng có dải sương ở chân; cầu cạn ám màu đồi (tương phản trụ/vòm ≈ −45%).
//  Bỏ/gộp: dãy vòm cầu thành nền đắp/hầm (đồi trước nâng), bỏ dây leo cầu & sắc trụ, bỏ cầu vồng bán nguyệt, lùm tròn → dải rừng nhiễu.
// TẦNG XA (lớp 1) + TẦNG GIỮA (lớp 2) cho cả bề ngang thế giới.
//  Lớp 1 — hai tầng núi pha màu trời theo giờ (phối cảnh khí quyển): dãy núi cao (đỉnh lệch: sườn trái thoải, sườn phải dốc)
//    và rặng tháp đá vôi. Mỗi ngọn có mặt nắng trái / mặt khuất phải ngăn bởi gờ gãy khúc (cắt theo chính khối núi),
//    tuyết bám sống núi chảy thành ngón theo khe, viền ráng chiều / viền trăng. Chùa tháp trên đỉnh cao nhất, lối mòn,
//    thác bạc trong hốc vách, trường thành cổ, cây đa thần ở chân trời phía ga cũ.
//  Lớp 2 — đồi xa rừng thưa, đồi trước có rừng thành mảng & khoảng trống, thông mọc cụm; ĐƯỜNG SẮT sống theo địa hình:
//    qua thung lũng là cầu cạn hai tầng vòm, qua sườn là vòm thấp / nền đắp, gặp đồi thì chui hầm (cửa hầm đá rêu).
//    Ga tránh "Ga Mây" có đường tránh: hai đoàn tàu chung một chu kỳ, chỉ gặp nhau ở ga (tàu hơi nước nằm đường tránh,
//    ô tô ray đỗ sân ga). Nhánh cũ gãy vươn lên trời, ray chơi vơi trỏ về đảo bay. Ba làng thắp đèn, biển xa.
//    Ba đảo bay lệch khỏi khoảng nghỉ: bụng đá sứt mẻ có nhũ đá, rêu tràn mép & chảy vệt phía khuất nắng, bó rễ đung đưa,
//    thác nhiều dải chảy từ khe mép đảo tan thành sương trôi theo gió (cầu vồng nhỏ buổi sáng).
import { clamp, fbm, lerp, mix, smooth, type Pt } from './util'
import { paletteCss, timeLook } from './palette'
import type { Ctx, MidModule, Piece, Spot } from './types'


const R = (v: number) => Math.round(v) || 0
const f2 = (v: number) => v.toFixed(2).replace(/^(-?)0\./, '$1.')
const L1X: [number, number] = [-1240, 4840]
const L2X: [number, number] = [-1300, 9700]
const DECK = 606
/** Nhịp cầu (trụ ở bội số của SW). */
const SW = 40
/** Đồi trước che đường sắt (đường chui hầm): [tâm, nửa rộng, đỉnh y] (lớp 2). */
const HILL: [number, number, number][] = [
  [-830, 620, 526],
  [-50, 150, 562],
  [1135, 300, 548],
  [2565, 290, 544],
  [4040, 400, 536],
  [4740, 360, 572],
  [5640, 320, 544],
  [6060, 150, 558],
  [7620, 300, 532],
]
/** Thung lũng: cầu vượt cao hai tầng vòm. */
const VAL: [number, number, number][] = [
  [380, 300, 774],
  [1735, 300, 770],
  [3300, 330, 794],
  [5240, 170, 744],
  [6440, 230, 770],
]
/** Ga tránh (lớp 2): hai tàu chỉ gặp nhau ở đây. */
const XS = 7130
const LOOP: [number, number] = [XS - 235, XS + 300]
/** Chu kỳ chung hai tàu (s), tốc độ đều, quãng hãm/lấy đà. */
const TP = 600
const V = 31
const DB = 120
/** Tàu A (hơi nước): trái → phải, dừng đường tránh. Tàu B (ô tô ray): phải → trái, dừng sân ga. */
const TA = { x0: -1500, stop: XS + 150, x1: 7700, dwell: 40 }
const TB = { x0: 7700, stop: XS - 175, x1: -1500, dwell: 30 }
const SIG = 330
const PAGODA = 430
const CAVE = 650
/** Nhánh cũ gãy: [x đầu, y đầu, x gãy, y gãy] (lớp 2). */
const SP: [number, number, number, number] = [4746, 590, 4964, 542]

const bell = (x: number, c: number, w: number) => {
  const d = Math.abs(x - c) / w
  return d >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * d)
}

/** Ghép số nguyên cho path: chỉ chèn dấu cách trước số không âm. */
function J(a: number[]): string {
  let s = ''
  for (let i = 0; i < a.length; i += 1) {
    const v = R(a[i] as number)
    s += (i > 0 && v >= 0 ? ' ' : '') + v
  }
  return s
}

/** Đường gấp khúc tương đối. */
function rl(p: Pt[]): string {
  const f = p[0]
  if (!f) return ''
  let x = R(f[0])
  let y = R(f[1])
  const a: number[] = []
  for (let i = 1; i < p.length; i += 1) {
    const q = p[i] as Pt
    const nx = R(q[0])
    const ny = R(q[1])
    if (nx === x && ny === y) continue
    a.push(nx - x, ny - y)
    x = nx
    y = ny
  }
  return `M${J([R(f[0]), R(f[1])])}${a.length ? `l${J(a)}` : ''}`
}

/** Khối kín mềm (Q qua trung điểm), toạ độ tương đối. */
function sm(p: Pt[]): string {
  const n = p.length
  const mid = (i: number): Pt => {
    const a = p[i % n] as Pt
    const b = p[(i + 1) % n] as Pt
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  }
  const m0 = mid(0)
  let cx = R(m0[0])
  let cy = R(m0[1])
  const a: number[] = []
  for (let i = 1; i <= n; i += 1) {
    const c = p[i % n] as Pt
    const m = mid(i)
    const ex = R(m[0])
    const ey = R(m[1])
    a.push(R(c[0]) - cx, R(c[1]) - cy, ex - cx, ey - cy)
    cx = ex
    cy = ey
  }
  return `M${J([R(m0[0]), R(m0[1])])}q${J(a)}z`
}

/** Đường mở mềm (Q qua trung điểm), toạ độ tương đối, bắt đầu bằng M. */
function qo(p: Pt[]): string {
  const f = p[0]
  if (!f) return ''
  let cx = R(f[0])
  let cy = R(f[1])
  const a: number[] = []
  for (let i = 1; i < p.length - 1; i += 1) {
    const c = p[i] as Pt
    const d = p[i + 1] as Pt
    const ex = R((c[0] + d[0]) / 2)
    const ey = R((c[1] + d[1]) / 2)
    a.push(R(c[0]) - cx, R(c[1]) - cy, ex - cx, ey - cy)
    cx = ex
    cy = ey
  }
  const l = p[p.length - 1] as Pt
  return `M${J([R(f[0]), R(f[1])])}${a.length ? `q${J(a)}` : ''}${p.length > 1 ? `l${J([R(l[0]) - cx, R(l[1]) - cy])}` : ''}`
}

/** Độ dài gần đúng của qo(p). */
function qlen(p: Pt[]): number {
  const f = p[0]
  if (!f) return 0
  let L = 0
  let cx = f[0]
  let cy = f[1]
  for (let i = 1; i < p.length - 1; i += 1) {
    const c = p[i] as Pt
    const d = p[i + 1] as Pt
    const ex = (c[0] + d[0]) / 2
    const ey = (c[1] + d[1]) / 2
    let px = cx
    let py = cy
    for (let s = 1; s <= 4; s += 1) {
      const t = s / 4
      const qx = (1 - t) * (1 - t) * cx + 2 * t * (1 - t) * c[0] + t * t * ex
      const qy = (1 - t) * (1 - t) * cy + 2 * t * (1 - t) * c[1] + t * t * ey
      L += Math.hypot(qx - px, qy - py)
      px = qx
      py = qy
    }
    cx = ex
    cy = ey
  }
  const l = p[p.length - 1] as Pt
  return L + Math.hypot(l[0] - cx, l[1] - cy)
}

/** Vòng điểm méo hữu cơ quanh elip. */
function lump(cx: number, cy: number, rx: number, ry: number, r: () => number, n = 8, k = 0.22): Pt[] {
  const ph = r() * 6.283
  const a1 = r() * k
  const a2 = r() * k
  const out: Pt[] = []
  for (let i = 0; i < n; i += 1) {
    const t = (i / n) * 6.283
    const m = 1 + a1 * Math.sin(2 * t + ph) + a2 * Math.sin(3 * t + ph * 1.7) + (r() - 0.5) * k * 0.6
    out.push([cx + Math.cos(t) * rx * m, cy + Math.sin(t) * ry * m])
  }
  return out
}

/** Bảng tra nội suy tuyến tính (hàm địa hình dùng lại hàng nghìn lần → tính một lần). */
function tab(f: (x: number) => number, x0: number, x1: number, step: number): (x: number) => number {
  const n = Math.ceil((x1 - x0) / step) + 2
  const a = new Float64Array(n)
  for (let i = 0; i < n; i += 1) a[i] = f(x0 + i * step)
  return x => {
    const u = clamp((x - x0) / step, 0, n - 1.001)
    const i = Math.floor(u)
    const t = u - i
    return (a[i] as number) * (1 - t) + (a[i + 1] as number) * t
  }
}

/** fbm 1 chiều dạng bảng (mẫu thưa theo bước sóng → nhanh). */
function ntab(n: (x: number, y: number) => number, scale: number, y: number, oct: number, x0: number, x1: number): (x: number) => number {
  return tab(x => fbm(n, x / scale, y, oct), x0, x1, scale / 8)
}

function samp(f: (x: number) => number, x0: number, x1: number, step: number): Pt[] {
  const out: Pt[] = []
  for (let x = x0; x <= x1 + 1e-6; x += step) out.push([x, f(x)])
  return out
}

/** Ramer–Douglas–Peucker. */
function rdp(p: Pt[], eps: number): Pt[] {
  if (p.length < 3) return p
  const keep = new Uint8Array(p.length)
  keep[0] = 1
  keep[p.length - 1] = 1
  const st: [number, number][] = [[0, p.length - 1]]
  while (st.length) {
    const [a, b] = st.pop() as [number, number]
    const A = p[a] as Pt
    const B = p[b] as Pt
    const dx = B[0] - A[0]
    const dy = B[1] - A[1]
    const L = Math.hypot(dx, dy) || 1
    let md = 0
    let mi = -1
    for (let i = a + 1; i < b; i += 1) {
      const Q = p[i] as Pt
      const d = Math.abs(dy * (Q[0] - A[0]) - dx * (Q[1] - A[1])) / L
      if (d > md) {
        md = d
        mi = i
      }
    }
    if (md > eps && mi > 0) {
      keep[mi] = 1
      st.push([a, mi], [mi, b])
    }
  }
  return p.filter((_, i) => keep[i] === 1)
}

/** Cắt đường theo x ∈ [a, b] (nội suy hai đầu). */
function clipX(p: Pt[], a: number, b: number): Pt[] {
  const at = (x: number): Pt => {
    for (let i = 1; i < p.length; i += 1) {
      const q = p[i] as Pt
      const o = p[i - 1] as Pt
      if (q[0] >= x) return [x, o[1] + (q[1] - o[1]) * ((x - o[0]) / (q[0] - o[0] || 1))]
    }
    return [x, (p[p.length - 1] as Pt)[1]]
  }
  const out: Pt[] = [at(a)]
  for (const q of p) if (q[0] > a && q[0] < b) out.push(q)
  out.push(at(b))
  return out
}

/** Gom path theo class giữ thứ tự xuất hiện đầu tiên. */
function painter() {
  const m = new Map<string, string>()
  return {
    p(cls: string, d: string) {
      m.set(cls, (m.get(cls) ?? '') + d)
    },
    out() {
      let s = ''
      for (const [c, d] of m) s += `<path class="${c}" d="${d}"/>`
      return s
    },
  }
}
type Paint = ReturnType<typeof painter>

/** Mái cong đầu đao (đơn vị ×2): thân r2 + bóng dưới diềm r3. */
function roof(P: Paint, cx: number, ye: number, hw: number, h: number) {
  const k = R(hw * 0.45 + 7)
  P.p('r2', `M${J([cx - hw - 7, ye - 7])}q7 7 12 7h${2 * hw - 10}q5 0 12-7l${J([-k, 7 - h])}h${-(2 * hw + 14 - 2 * k)}z`)
  P.p('r3', `M${J([cx - hw + 3, ye])}h${2 * hw - 6}v3h${6 - 2 * hw}z`)
}

// ───────────────────────── Lịch tàu (một chu kỳ TP, hai tàu chung pha) ─────────────────────────
type Key = { t: number; x: number; y: number; tf: string }
const EO = 'cubic-bezier(.33,.67,.67,1)'
const EI = 'cubic-bezier(.33,0,.67,.33)'
/** Chạy đều → hãm tới ga → dừng → lấy đà → chạy đều. `ramps`: đoạn đổi làn [xa, ya, xb, yb] nằm trong đoạn chạy đều. */
function trip(o: { x0: number; stop: number; x1: number; dwell: number }, ramps: [number, number, number, number][]): Key[] {
  const d = Math.sign(o.x1 - o.x0)
  const ks: Key[] = [{ t: 0, x: o.x0, y: 0, tf: 'linear' }]
  let t = 0
  let x = o.x0
  let y = 0
  const run = (to: number, tf: string) => {
    const pts: [number, number][] = []
    for (const [xa, ya, xb, yb] of ramps)
      for (const q of [
        [xa, ya],
        [xb, yb],
      ] as [number, number][])
        if ((q[0] - x) * d > 0 && (to - q[0]) * d > 0) pts.push(q)
    pts.sort((p, q) => (p[0] - q[0]) * d)
    for (const [px, py] of pts) {
      t += Math.abs(px - x) / V
      x = px
      y = py
      ks.push({ t, x, y, tf: 'linear' })
    }
    t += Math.abs(to - x) / V
    x = to
    ks.push({ t, x, y, tf })
  }
  run(o.stop - d * DB, EO)
  t += (2 * DB) / V
  ks.push({ t, x: o.stop, y, tf: 'linear' })
  t += o.dwell
  ks.push({ t, x: o.stop, y, tf: EI })
  t += (2 * DB) / V
  x = o.stop + d * DB
  ks.push({ t, x, y, tf: 'linear' })
  run(o.x1, 'linear')
  return ks
}
const KA = trip(TA, [
  [LOOP[0] - 40, 0, LOOP[0], 4],
  [LOOP[1], 4, LOOP[1] + 40, 0],
])
const KB = trip(TB, [])
const arrive = (ks: Key[], stop: number) => (ks.find(k => k.x === stop) as Key).t
/** Ô tô ray tới ga sau tàu hơi 8 s (tàu hơi đã nằm đường tránh) → lệch pha của B so với A. */
const TB0 = (((arrive(KA, TA.stop) + 8 - arrive(KB, TB.stop)) % TP) + TP) % TP
/** Thời điểm (giây trong lịch của tàu) đầu tàu qua x (trên đoạn chạy đều). */
function when(ks: Key[], x: number): number {
  for (let i = 1; i < ks.length; i += 1) {
    const a = ks[i - 1] as Key
    const b = ks[i] as Key
    if ((x - a.x) * (x - b.x) <= 0 && a.x !== b.x) return a.t + ((x - a.x) / (b.x - a.x)) * (b.t - a.t)
  }
  return 0
}
const kfCss = (name: string, ks: Key[]) =>
  `@keyframes ${name}{` +
  ks.map(k => `${((k.t / TP) * 100).toFixed(2)}%{transform:translate(${R(k.x)}px,${k.y}px)${k.tf === 'linear' ? '' : `;animation-timing-function:${k.tf}`}}`).join('') +
  `100%{transform:translate(${R((ks[ks.length - 1] as Key).x)}px,0)}}`

export const mid: MidModule = {
  build(ctx: Ctx) {
    const lite = ctx.detail === 'lite'
    const out: Piece[] = []
    const spots: Spot[] = []
    const add = (layer: 1 | 2, x0: number, x1: number, prio: number, svg: string, glow?: string) => {
      if (!svg && !glow) return
      const p: Piece = { layer, x0: R(x0), x1: R(x1), prio, svg }
      if (glow) p.glow = glow
      out.push(p)
    }
    const W = ctx.cur
    const S = ctx.season
    const h = ctx.vn.hourF
    const day = ctx.daylight
    const nk = clamp(1 - day * 1.3, 0, 1)
    const night = day < 0.9
    const cloudK = ({ quang: 0, it: 0.15, vua: 0.4, nhieu: 0.7, 'u-am': 1 } as const)[W.cloud]
    const rainy = W.precip === 'mua' || W.precip === 'mua-to' || W.precip === 'phun'
    const snowy = W.precip === 'tuyet'
    const fogK = clamp(0.5 + W.fog * 0.5 + (rainy ? 0.18 : 0) + cloudK * 0.1, 0, 1)
    const gold = cloudK < 0.75 && day > 0.04 && ((h > 15.8 && h < 18.7) || (h > 5.3 && h < 7.4))
    const moon = nk > 0.6
    const rim = gold ? 'mi-rm' : moon ? 'mi-rn' : ''
    const snowLine = snowy ? 486 : S === 'dong' ? 446 : S === 'thu' && ctx.seasonT > 0.62 ? 392 : S === 'xuan' && ctx.seasonT < 0.35 ? 406 : 0
    const islandSnow = snowy || (S === 'dong' && ctx.seasonT > 0.25 && ctx.seasonT < 0.8)
    const fog = (layer: 1 | 2, y: number, op: number) => add(layer, -1600, 9900, 6, `<use href="#mi-fr" y="${y}" opacity="${(op * fogK).toFixed(2)}"/>`)
    // Màu tính sẵn từ bảng màu lõi (cùng màu giờ lúc đầu cửa sổ như compose) → hex ngắn thay cho chuỗi color-mix lồng nhau.
    const pv: Record<string, string> = {}
    for (const m of paletteCss(ctx, timeLook(h, cloudK, day, ctx.vn.doy)).matchAll(/--([a-z0-9]+):(#[0-9a-f]{6})/g)) pv[m[1] as string] = m[2] as string
    const v = (n: string) => pv[n] ?? '#808080'
    /** a p% + b (100−p)%. */
    const mx = (a: string, p: number, b: string) => mix(b, a, clamp(p, 0, 100) / 100)
    const leaf = (l: string, g: string) => (S === 'thu' ? mx(v(l), 30, v(g)) : S === 'dong' ? mx(v(l), 45, v(g)) : v(l))
    pv.mia = mx(v('w3'), 16 * nk, mx(v('k2'), 16 * (1 - nk), mx(v('sky0'), 30, v('sky1'))))
    pv.mib = mx(v('k1'), 24 * nk, mx(v('l4'), 22 * (1 - nk), mx(v('k2'), 26, mx(v('sky0'), 18, v('sky1')))))
    pv.miz = mx(v('mia'), lerp(55, 62, nk), mx(v('sky1'), 50, v('haze')))
    pv.mic = mx(v('l4'), 50, mx(v('k2'), 20, v('sky1')))
    pv.mih = mx(leaf('l3', 'g3'), 50, v('sky1'))
    pv.mih2 = mx(leaf('l4', 'g4'), 56, v('haze'))
    pv.mim = mx(v('g2'), 62, v('sky1'))
    pv.mim2 = mx(v('g3'), 66, v('haze'))
    pv.mif = mx(leaf('l3', 'g3'), 78, v('mim'))
    pv.mif2 = mx(leaf('l4', 'g4'), 72, v('mim2'))
    pv.mivw = mx(v('s2'), lerp(10, 5, nk), mx(v('haze'), 22, v('mih')))
    const tr = ctx.rng('mi-defs')
    const crown = (cls: string, cx: number, cy: number, rx: number, ry: number, n = 6, k = 0.22) => `<path class="${cls}" d="${sm(lump(cx, cy, rx, ry, tr, n, k))}"/>`
    const tree = (id: string, x: number, y: number, sc: number, sw: string) =>
      `<g transform="translate(${R(x)} ${R(y)})${sc !== 1 ? `scale(${sc})` : ''}"><use href="#${id}" class="${sw}"/></g>`
    // đèn đêm: quầng #mi-lp tĩnh dùng chung + ngọn lửa .fl vẽ tại chỗ (<use> không được sao chép phần tử có hoạt ảnh)
    const lamp = (x: number, y: number) => `<use href="#mi-lp" x="${x}" y="${y}"/><circle class="e1 fl" cx="${x}" cy="${y}" r="1.3"/>`
    const clumpId = S === 'dong' ? 'mi-tx' : S === 'xuan' ? 'mi-tc1' : S === 'ha' ? 'mi-tc2' : 'mi-tc'

    // ═════════════ LỚP 1 ═════════════
    // Núi xa = sống nền + các đỉnh là KÝ HIỆU dùng lại (thân lệch, mặt nắng trái / khuất phải có nếp gãy, tuyết bám đỉnh
    // chảy ngón xuống khe — tất cả cắt theo bóng núi ngay trong ký hiệu). Đơn vị ký hiệu: đỉnh (0,0), chân y=100, thân tới 300.
    const nE = ctx.noise('mi-e')
    const env = (x: number) => clamp(0.55 + fbm(nE, x / 1500, 0.43, 2) * 1.8, 0.12, 1)
    const sink = (x: number) => smooth(3050, 3330, x)
    type Shp = { x0: number; x1: number; y: number[] }
    type Inst = { c: number; t: number; sx: number; sy: number; id: string; sh: string; x0: number; x1: number }
    const shp: Record<string, Shp> = {}
    let symDefs = ''
    const peakSym = (id: string, cls: string, f: (x: number) => number, x0: number, x1: number, extra: string) => {
      const ys: number[] = []
      for (let x = x0; x <= x1; x += 3) ys.push(f(x))
      shp[id] = { x0, x1, y: ys }
      const top = rdp(
        ys.map((y, i) => [x0 + i * 3, y] as Pt),
        2.1,
      )
      let dash = ''
      if (rim) {
        let L = 0
        let s1 = -1
        let s2 = 0
        for (let i = 1; i < top.length; i += 1) {
          const a = top[i - 1] as Pt
          const b = top[i] as Pt
          const d = Math.hypot(b[0] - a[0], b[1] - a[1])
          if (s1 < 0 && b[1] < 78) s1 = L
          if (a[1] < 78) s2 = L + d
          L += d
        }
        if (s1 >= 0) dash = ` stroke-dasharray="0 ${R(s1)} ${R(s2 - s1)} 9999"`
      }
      const jr = ctx.rng(id)
      const cr: Pt[] = [
        [0, f(0)],
        [4 + jr() * 6, 24],
        [6 + jr() * 10, 50],
        [22 + jr() * 18, 120],
        [40 + jr() * 30, 300],
      ]
      symDefs +=
        `<g id="${id}"><path id="${id}a" class="${cls}${rim ? ` ${rim}` : ''}"${dash} d="${qo(top)}V300H${x0}Z"/><clipPath id="${id}k"><use href="#${id}a"/></clipPath>` +
        (lite ? '' : `<g clip-path="url(#${id}k)"><path class="mi-lf" d="${rl([[x0 - 4, -40], ...cr, [x0 - 4, 300]])}z"/><path class="mi-df" d="${rl([[x1 + 4, -40], ...cr, [x1 + 4, 300]])}z${extra}"/></g>`) +
        `</g>`
    }
    const snowSym = (id: string, lv: number) => {
      const key = `${id}${lv}`
      if (symDefs.includes(`id="${key}"`)) return key
      const s = shp[id] as Shp
      const f = (x: number) => s.y[clamp(Math.round((x - s.x0) / 3), 0, s.y.length - 1)] as number
      const D = lv === 1 ? 20 : 44
      const nS = ctx.noise(key)
      const at = (x: number): Pt | undefined => {
        const y = f(x)
        const dep = clamp((D - y) * 0.75, 0, 34) * (0.6 + 1.1 * Math.max(0, nS(x / 6.5, 0.7)) + 0.35 * fbm(nS, x / 30, 2.2, 2))
        return dep > 1 ? [x, y + dep] : undefined
      }
      const run: Pt[] = []
      for (let x = 0; x >= s.x0; x -= 4) {
        const q = at(x)
        if (!q) break
        run.unshift(q)
      }
      for (let x = 4; x <= s.x1; x += 4) {
        const q = at(x)
        if (!q) break
        run.push(q)
      }
      if (run.length < 3) return id
      symDefs += `<g id="${key}"><use href="#${id}"/><path class="mi-sn" clip-path="url(#${id}k)" d="${qo(run)}V-40H${R((run[0] as Pt)[0])}Z"/></g>`
      return key
    }
    const silh = (ins: Inst[], ridge: (x: number) => number, x: number) => {
      let y = ridge(x)
      for (const q of ins) {
        if (x < q.x0 || x > q.x1) continue
        const s = shp[q.sh] as Shp
        const i = clamp(Math.round(((x - q.c) / q.sx - s.x0) / 3), 0, s.y.length - 1)
        y = Math.min(y, q.t + q.sy * (s.y[i] as number))
      }
      return y
    }
    const CH1 = 640
    const nC1 = Math.ceil((L1X[1] - L1X[0]) / CH1)
    /** Sống nền theo khúc (viền trăng/nắng chiều chạy mép trên) rồi các đỉnh theo khúc. */
    const tier = (key: string, ridge: (x: number) => number, ins: Inst[], eps: number, prio: number, rimC: string) => {
      const pts = rdp(samp(ridge, L1X[0], L1X[1], 8), eps)
      for (let k = 0; k < nC1; k += 1) {
        const x0 = L1X[0] + k * CH1
        const p = clipX(pts, x0, x0 + CH1 + 1)
        const dash = rimC ? ` stroke-dasharray="${R(qlen(p) - 1)} 9999"` : ''
        add(1, x0 - 8, x0 + CH1 + 9, prio, `<path class="mi-${key}${rimC ? ` ${rimC}` : ''}"${dash} d="${qo(p)}V1100H${x0}Z"/>`)
      }
      for (let k = 0; k < nC1; k += 1) {
        const x0 = L1X[0] + k * CH1
        const grp = ins.filter(q => q.c >= x0 && q.c < x0 + CH1)
        if (!grp.length) continue
        add(
          1,
          Math.min(...grp.map(q => q.x0)),
          Math.max(...grp.map(q => q.x1)),
          prio,
          grp.map(q => `<use href="#${q.id}" transform="matrix(${q.sx.toFixed(1)} 0 0 ${f2(q.sy)} ${R(q.c)} ${R(q.t)})"/>`).join(''),
        )
      }
    }
    // Tầng Z (xa nhất): dãy núi mờ gần như tan vào trời, chỉ là một mép sống mềm; sương ở chân tách nó khỏi tầng A.
    {
      const nZ = ctx.noise('mi-z')
      const ridgeZ = tab((x: number) => {
        const a = fbm(nZ, x / 600, 0.6, 2)
        const b = clamp(1 - Math.abs(nZ(x / 150, 2.1)) * 2.4, 0, 1) ** 1.6
        const v = 486 - (26 + 72 * clamp(0.5 + a * 2.2, 0, 1)) * (0.3 + 0.7 * b)
        return v + (800 - v) * smooth(2900, 3500, x)
      }, L1X[0] - 220, L1X[1] + 220, 6)
      const pz = rdp(samp(ridgeZ, L1X[0], L1X[1], 12), 12)
      for (let x0 = L1X[0]; x0 < L1X[1]; x0 += 2 * CH1) add(1, x0 - 8, x0 + 2 * CH1 + 9, 5, `<path class="mi-z${rim ? ' mi-rz' : ''}"${rim ? ` stroke-dasharray="${R(qlen(clipX(pz, x0, x0 + 2 * CH1 + 1)) - 1)} 9999"` : ''} d="${qo(clipX(pz, x0, x0 + 2 * CH1 + 1))}V1100H${x0}Z"/>`)
      fog(1, 430, 0.62)
    }
    // Tầng A: núi lớn, sườn trái thoải dài, vách phải dựng; ba dáng (thẳng / vai trái / vai phải).
    const nA = ctx.noise('mi-a')
    const RA = [0.4, 0.56, 0.74]
    RA.forEach((ra, s) => {
      peakSym(
        `mi-p${s}`,
        'mi-a',
        x => {
          const d = x / (x < 0 ? 100 : 100 * ra)
          const g = Math.exp(-d * d)
          const sh = s === 1 ? -22 * Math.exp(-(((x + 96) / 36) ** 2)) : s === 2 ? -14 * Math.exp(-(((x - 70 * ra) / 26) ** 2)) : 0
          return 100 * (1 - g) + sh + 40 * smooth(1.5, 2.7, Math.abs(d)) + (3.8 * nA(x / 21 + s * 40, 0.3) + 1.8 * nA(x / 7 + s * 40, 1.9)) * (0.3 + 0.7 * g)
        },
        -270,
        R(270 * ra),
        '',
      )
    })
    const fA1 = ntab(nA, 240, 0.37, 2, L1X[0] - 240, L1X[1] + 240)
    const ridgeA = tab((x: number) => {
      const v = 524 - 26 * (0.5 + fA1(x))
      return v + (790 - v) * sink(x)
    }, L1X[0] - 220, L1X[1] + 220, 4)
    const insA: Inst[] = []
    {
      const ra = ctx.rng('mi-pka')
      for (let c = L1X[0] - 160; c < 3200; c += 150 + ra() * 200) {
        const h = (40 + 156 * env(c)) * (0.45 + 0.55 * ra())
        const wl = 72 + ra() * 90
        const q = ra()
        const s = q < 0.4 ? 0 : q < 0.72 ? 1 : 2
        const sx0 = wl / 100
        const t = Math.max(ridgeA(c - 200 * sx0), ridgeA(c - 100 * sx0), ridgeA(c), ridgeA(c + 120 * (RA[s] as number) * sx0)) + 3 - h
        const lv = snowLine && t < snowLine - 6 ? (t < snowLine - 60 ? 2 : 1) : 0
        const sx = wl / 100
        const sh = `mi-p${s}`
        insA.push({ c, t, sx, sy: h / 100, sh, id: lv ? snowSym(sh, lv) : sh, x0: c - 270 * sx, x1: c + 270 * (RA[s] as number) * sx })
      }
    }
    tier('a', ridgeA, insA, 7.5, 6, rim)
    // Trường thành cổ vắt theo sống dãy núi xa (phía tây), dẫn về ngọn chùa; vọng lâu dọc tường.
    if (!lite) {
      const seg = rdp(samp(x => silh(insA, ridgeA, x) + 3, -150, 400, 10), 1.4)
      let tw = ''
      for (let i = 2; i < seg.length - 1; i += 4) {
        const q = seg[i] as Pt
        tw += `M${J([q[0] - 2, q[1] + 1])}v-6h5v6zm-1-6h7l-3-3z`
      }
      add(1, -160, 410, 4, `<path class="mi-wa" d="${rl(seg)}"/><path class="mi-wtw" d="${tw}"/>`)
    }
    fog(1, 470, 0.78)
    if (cloudK >= 0.4 || W.fog > 0.3) {
      const r = ctx.rng('mi-belt')
      for (let x = L1X[0]; x < L1X[1]; x += 640 + R(r() * 240)) add(1, x - 280, x + 280, 3, `<ellipse class="mi-cd" cx="${x}" cy="${R(450 + r() * 34)}" rx="${R(170 + r() * 110)}" ry="${R(13 + r() * 10)}"/>`)
    }
    // Tầng B: tháp đá vôi (đỉnh bằng, vách phải dựng, rãnh dọc), ba dáng.
    const nB = ctx.noise('mi-b')
    for (let s = 0; s < 3; s += 1) {
      const jr = ctx.rng(`mi-kg${s}`)
      let gr = ''
      for (let i = 0; i < 3; i += 1) gr += `M${R(-30 + jr() * 50)} ${R(14 + jr() * 20)}v${R(40 + jr() * 50)}h${(1.5 + jr() * 2).toFixed(1)}v${-R(30 + jr() * 50)}z`
      peakSym(
        `mi-k${s}`,
        'mi-b',
        x => {
          const d = x / (x < 0 ? 50 : 30)
          const g = 1 / (1 + d ** 4)
          const sh = s === 1 ? 9 * Math.exp(-(((x + 5) / 5) ** 2)) : s === 2 ? -10 * Math.exp(-(((x + 52) / 16) ** 2)) : 0
          return 100 * (1 - g) + sh + 30 * smooth(1.8, 3, Math.abs(d)) + (2.4 * nB(x / 9 + s * 30, 0.3) + 1.2 * nB(x / 4 + s * 30, 1.3)) * (0.3 + 0.7 * g)
        },
        -150,
        90,
        gr,
      )
    }
    const fB2 = ntab(nB, 140, 0.8, 2, L1X[0] - 240, L1X[1] + 240)
    const ridgeB = tab((x: number) => {
      const v = 600 - 16 * (0.5 + fB2(x))
      return v + (800 - v) * sink(x + 50)
    }, L1X[0] - 220, L1X[1] + 220, 4)
    const insB: Inst[] = []
    {
      const kr = ctx.rng('mi-karst')
      const snowB = snowy ? snowLine + 34 : 0
      const put = (c: number, h: number, w: number, s: number) => {
        const k = (w * 1.3) / 50
        const t = Math.max(ridgeB(c - 110 * k), ridgeB(c), ridgeB(c + 60 * k)) + 2 - h
        const lv = snowB && t < snowB - 6 ? (t < snowB - 50 ? 2 : 1) : 0
        const sx = (w * 1.3) / 50
        const sh = `mi-k${s}`
        insB.push({ c, t, sx, sy: h / 100, sh, id: lv ? snowSym(sh, lv) : sh, x0: c - 150 * sx, x1: c + 90 * sx })
      }
      for (let c = -1320; c < 1850; c += 80 + kr() * 130 + smooth(700, 1600, c) * 120) {
        if (Math.abs(c - PAGODA) < 95 || Math.abs(c - CAVE) < 78) continue
        const w = 20 + kr() * 32
        const h = (30 + kr() * 72) * (0.5 + env(c + 900) * 0.7) * (1 - 0.72 * smooth(700, 1700, c))
        const s = Math.floor(kr() * 3)
        if (h > 32) put(c, h, w, s)
      }
      put(PAGODA, 166, 46, 0)
      put(CAVE, 124, 43, 2)
      insB.sort((a, b) => a.c - b.c)
    }
    tier('b', ridgeB, insB, 6, 6, '')
    const yB = (x: number) => silh(insB, ridgeB, x)

    // Chùa tháp bảy tầng trên đỉnh tháp đá cao nhất + lối mòn đứt đoạn + đèn đêm.
    {
      let px = PAGODA
      let py = 999
      for (const q of samp(yB, PAGODA - 24, PAGODA + 24, 2)) if (q[1] < py) [px, py] = q
      px = R(px)
      py = R(py) + 1
      const r = ctx.rng('mi-st')
      const st: Pt[] = [[px - 2, py + 2]]
      for (let i = 0; i < 9; i += 1) st.push([px - 10 - i * 4 + (i % 2 ? 6 : -5) + r() * 3, py + 9 + i * 10 + r() * 3])
      add(1, px - 60, px + 20, 6, `<path class="mi-pst" d="${qo(st)}"/><use href="#mi-pg" x="${px}" y="${py}"/>`, night ? lamp(px, py - 5) : undefined)
    }
    // Thác bạc trong hốc vách (mặt đón nắng của tháp đá có hang).
    {
      const cx = CAVE - 26
      const cy = R(yB(cx) + 16)
      const L = 598 - cy
      add(
        1,
        cx - 30,
        cx + 40,
        5,
        `<path class="mi-cv" d="M${cx - 8} ${cy + 5}q8-11 16 0l3 ${L - 5}h-22z"/><path class="mi-wl" d="M${cx - 2} ${cy + 1}h4l-1 ${L - 2}h-2z"/><ellipse class="mi-ms" cx="${cx}" cy="598" rx="22" ry="6"/>`,
      )
    }
    // Cây đa thần ở chân trời phía tây: MỘT tán vòm liền, mép trên là các múi lá nhiễu (không đĩa rời), đáy phẳng tối;
    // mặt nắng lệch theo giờ, nhiều thân trụ (rễ phụ hoá thân) + rễ phụ mảnh chỉ rủ dưới tán. Đa thường xanh → mùa đông vẫn tán.
    {
      const tx = -420
      const ty = 604
      const nW = ctx.noise('mi-wtree')
      const r = ctx.rng('mi-wtree')
      const RX = 175
      const cy = ty - 112
      const sd = h < 12 ? -1 : 1
      const NT = lite ? 18 : 30
      const topY = (u: number) => {
        const sc = Math.abs(Math.sin(u * 8.2 + 0.7)) ** 0.55
        return cy - 80 * (1 - u * u) ** 0.42 * (0.6 + 0.2 * sc + 0.4 * (fbm(nW, u * 2.1, 0.3, 2) + 0.5)) - 4
      }
      const botY = (u: number) => cy + 22 * (1 - u * u) ** 0.4 + 7 * nW(u * 6, 1.4)
      const tp: Pt[] = []
      for (let k = 0; k <= NT; k += 1) {
        const u = -1 + (2 * k) / NT
        tp.push([tx + u * RX * (1 + 0.04 * nW(u * 3, 2.6)), topY(u)])
      }
      const bt: Pt[] = []
      for (let k = NT - 1; k >= 1; k -= 2) {
        const u = -1 + (2 * k) / NT
        bt.push([tx + u * RX * 0.96, botY(u)])
      }
      const P = painter()
      // thân trụ: thân chính choãi gốc + 3 trụ rễ phụ (to nhỏ khác nhau), chân tan vào sương
      let tr2 = `M${tx - 40} ${ty}c16-10 18-34 16-70l-6-${R(ty - cy - 76)}h${R(48)}l-6 ${R(ty - cy - 76)}c-2 36 0 60 18 70z`
      for (const [u, w] of [
        [-0.66, 6],
        [-0.4, 4],
        [-0.22, 3],
        [0.36, 5],
        [0.6, 3],
      ] as [number, number][]) {
        const x = R(tx + u * RX)
        tr2 += `M${x - w} ${ty}l${R(w * 0.4)}-${R(ty - botY(u) - 2)}h${R(w * 1.2)}l${R(w * 0.4)} ${R(ty - botY(u) - 2)}z`
      }
      P.p('mi-wt', tr2)
      P.p('mi-w1', sm([...tp, ...bt]))
      // mặt nắng: cùng mép trên, dày ~ 45% tán, lệch về phía mặt trời
      const lit: Pt[] = tp.map(([x, y]) => [x + sd * 4, y + 1])
      const lb: Pt[] = []
      for (let k = NT - 1; k >= 1; k -= 2) {
        const q = tp[k] as Pt
        const u = -1 + (2 * k) / NT
        lb.push([q[0] + sd * 4, q[1] + (cy - q[1]) * (0.5 + 0.35 * u * -sd) + 6 * nW(u * 5, 3.1)])
      }
      P.p('mi-w2', sm([...lit, ...lb]))
      if (!lite) {
        // vân lá: vài múi sáng nhỏ trên mặt nắng, độ tương phản thấp
        let hl = ''
        for (let k = 0; k < 5; k += 1) {
          const u = sd * (0.15 + 0.13 * k) - sd * 0.05 + (r() - 0.5) * 0.08
          const q: Pt = [tx + u * RX, topY(u) + 8 + r() * 6]
          hl += sm(lump(q[0], q[1], 14 + r() * 10, 5 + r() * 3, r, 6, 0.25))
        }
        P.p('mi-w3', hl)
        // rễ phụ mảnh: chỉ rủ dưới tán
        let roots = ''
        for (let k = 0; k < 8; k += 1) {
          const u = -0.8 + k * 0.21 + (r() - 0.5) * 0.08
          const y = botY(u) - 2
          roots += `M${R(tx + u * RX)} ${R(y)}v${R((ty - y) * (0.25 + r() * 0.5))}`
        }
        P.p('mi-wr', roots)
      }
      if (snowy) P.p('mi-gs', qo(tp.filter((_, k) => k % 2 === 0).map(([x, y]) => [x, y + 2] as Pt)))
      add(1, tx - RX - 20, tx + RX + 20, 6, P.out())
    }
    fog(1, 540, 0.7)

    // ═════════════ LỚP 2 ═════════════
    const nH = ctx.noise('mi-h')
    const nF = ctx.noise('mi-f')
    const fH = ntab(nH, 270, 0.29, 3, L2X[0] - 300, L2X[1] + 300)
    const fF1 = ntab(nF, 260, 0.83, 2, L2X[0] - 300, L2X[1] + 300)
    const fF2 = ntab(nF, 95, 3.3, 2, L2X[0] - 300, L2X[1] + 300)
    const yH = tab((x: number) => {
      const v = 590 - 58 * (0.5 + fH(x) * 1.5)
      return v + (776 - v) * smooth(7520, 7760, x)
    }, L2X[0] - 20, L2X[1] + 20, 9)
    const yF = tab((x: number) => {
      let v = 624 + fF1(x) * 40
      const dn = fF2(x)
      for (const [c, w, y] of VAL) {
        const b = bell(x, c, w)
        if (b > 0) v = lerp(v, y + dn * 18, b ** 0.7)
      }
      v = lerp(v, 628 + dn * 6, bell(x, XS, 310) ** 0.5)
      for (const [c, w, y] of HILL) {
        const b = bell(x, c, w)
        if (b > 0) v = lerp(v, y + dn * 26, b ** 0.5)
      }
      return v + (800 - v) * smooth(7800, 7850, x)
    }, L2X[0] - 20, L2X[1] + 20, 5)
    const CH2 = 640
    const F0 = -100
    const dr = ctx.rng('mi-dash')
    /** Cụm thông (ký hiệu 3/5/7 cây) nghiêng theo sườn bằng skewY — thân cây vẫn thẳng đứng. */
    const pines = (k: string, x: number, f: (x: number) => number, pr: () => number) => {
      const n = [3, 5, 7][Math.floor(pr() * 3)] as number
      const wc = 7.5 * (n - 1)
      const y0 = f(x)
      return `<use href="#mi-p${k}${n}" transform="matrix(1 ${f2((f(x + wc) - y0) / wc)} 0 1 ${R(x)} ${R(y0)})"/>`
    }

    // Đồi xa (sau đường sắt): rừng chấm, thông cụm thưa.
    {
      const th = rdp(samp(yH, L2X[0], L2X[1], 16), 6)
      const pr = ctx.rng('mi-pnh')
      // mép khúc đặt ở chỗ đồi trước cao hơn đồi xa → nét hàng cây ở mép dọc bị đồi trước che hẳn
      const cut: number[] = [L2X[0]]
      for (let x = L2X[0] + 500; x < L2X[1] - 300; x += 20) if (x - (cut[cut.length - 1] as number) > 500 && yF(x - 8) < yH(x) - 14 && yF(x + 8) < yH(x) - 14) cut.push(x)
      cut.push(L2X[1])
      for (let i = 0; i < cut.length - 1; i += 1) {
        const x0 = cut[i] as number
        const x1 = cut[i + 1] as number
        let pn = ''
        if (!lite)
          for (let x = x0 + pr() * 200; x < x1; x += 260 + pr() * 300) {
            if (pr() < 0.62) continue
            pn += pines('b', x, yH, pr)
          }
        add(2, x0 - 8, x1 + 9, 9, `<path class="mi-h" d="${qo(clipX(th, x0, x1 + 1))}V1100H${x0}Z"/>${pn}`)
      }
    }
    fog(2, 560, 0.6)

    // Biển xa cuối thế giới: chân trời, đảo xa, lóng lánh.
    {
      const r = ctx.rng('mi-sea')
      let gl = ''
      for (let i = 0; i < 8; i += 1) gl += `M${R(7700 + r() * 1900)} ${R(694 + r() * 60)}h${R(6 + r() * 16)}`
      add(2, 7540, 9900, 6, `<rect class="a2" x="7540" y="690" width="2400" height="420"/><rect fill="url(#mi-se)" x="7540" y="690" width="2400" height="90"/><path class="mi-a" d="M8210 691q14-7 30-3 12-6 26 3zM9020 691q20-9 44 0z"/><path class="mi-hz" d="M7540 690h2400"/><path class="mi-gl tw" d="${gl}"/>`)
    }

    // ───────────── 3 ĐẢO BAY ─────────────
    // Bụng đảo là ký hiệu dùng lại (đơn vị x∈[−100,100], mép cỏ y≈0, đáy ~110): đá lệch nhiễu fbm, mép sứt, nhũ đá rủ,
    // mặt nắng/khuất + vân đá + rêu tràn mép (cắt theo bụng), nắp cỏ gợn có viền sáng chỉ chạy mép trên, búi cỏ chìa mép.
    type Bel = { top: (u: number) => number; und: Pt[]; ia: number }
    const bel: Record<string, Bel> = {}
    const belly = (id: string, sk: number, ud: string) => {
      const r = ctx.rng(id)
      const tn = ctx.noise(id)
      const top = (u: number) => -10 * (1 - u * u) + tn(u * 2.6, 0.5) * 4
      const NU = 15
      const und: Pt[] = [[-102, 0]]
      let ia = 0
      let ay = 0
      for (let i = 1; i < NU - 1; i += 1) {
        const u = -1 + (2 * i) / (NU - 1)
        const uu = clamp(u - sk * (1 - u * u), -1, 1)
        let k = Math.max(0, 1 - Math.abs(uu) ** 2.1) ** 0.85 * 0.72
        k *= 0.62 + 0.8 * (fbm(tn, u * 2.3, 1.7, 2) + 0.5) + 0.18 * Math.abs(Math.sin(u * 7.3 + sk * 9))
        const chip = Math.abs(u) > 0.6 && r() < 0.5 ? r() * 5 : 0
        const q: Pt = [u * 100 * (0.97 + r() * 0.05) - Math.sign(u) * chip, 3 + 100 * k + chip * 0.6]
        und.push(q)
        if (q[1] > ay) {
          ay = q[1]
          ia = i
        }
      }
      und.push([102, 0])
      let stal = ''
      for (let j = 0; j < 3; j += 1) {
        const q = und[clamp(Math.round(ia + (j - 1) * 3 + (j === 1 ? 0 : (r() - 0.5) * 2)), 2, NU - 3)] as Pt
        const L = 100 * (0.16 + r() * 0.2) * (j === 1 ? 1.4 : 1)
        const wd = 3 + r() * 3
        stal += `M${J([q[0] - wd, q[1] - 6])}q${J([wd * 0.7, L * 0.45, wd, L])}q${J([wd * 0.15, -L * 0.6, wd, -L])}z`
      }
      const NT = 10
      const tp: Pt[] = []
      for (let i = 0; i <= NT; i += 1) {
        const u = -1 + (2 * i) / NT
        tp.push([u * 101, top(u) + (Math.abs(u) > 0.93 ? 2 : 0)])
      }
      const lo: Pt[] = []
      for (let i = NT; i >= 0; i -= 2.5) {
        const u = -1 + (2 * i) / NT
        lo.push([u * 103, 4 + (tn(u * 5, 3.3) + 0.5) * 4])
      }
      let Lt = 0
      for (let i = 1; i < tp.length; i += 1) Lt += Math.hypot((tp[i] as Pt)[0] - (tp[i - 1] as Pt)[0], (tp[i] as Pt)[1] - (tp[i - 1] as Pt)[1])
      let La = Lt
      const ring = [...tp, ...lo, tp[0] as Pt]
      for (let i = tp.length; i < ring.length; i += 1) La += Math.hypot((ring[i] as Pt)[0] - (ring[i - 1] as Pt)[0], (ring[i] as Pt)[1] - (ring[i - 1] as Pt)[1])
      bel[id] = { top, und, ia }
      symDefs +=
        `<g id="${id}"><path id="${id}u" class="mi-ug" d="${sm(und)}${stal}"/><clipPath id="${id}c"><use href="#${id}u"/></clipPath><g clip-path="url(#${id}c)"><use href="#${ud}"/></g>` +
        `<g class="g2"><path id="${id}g" pathLength="100" d="${sm([...tp, ...lo])}"/></g><use href="#${id}g" class="${islandSnow ? 'mi-gs' : 'mi-gh'}" stroke-dasharray="${R(((Lt - 14) / La) * 100)} 999" y="${islandSnow ? -1 : 1}"/>` +
        `<use href="#mi-tfl" x="-102" y="${R(top(-1) + 4)}"/><use href="#mi-tfr" x="102" y="${R(top(1) + 4)}"/></g>`
    }
    belly('mi-bA', 0.16, 'mi-ud1')
    belly('mi-bB', -0.15, 'mi-ud2')
    type Isl = { k: string; b: string; x: number; y: number; w: number; h: number; fu: number }
    const island = (s: Isl, inner: (top: (u: number) => number) => [string, string]) => {
      const B = bel[s.b] as Bel
      const sx = s.w / 200
      const sy = s.h / 100
      const hw = s.w / 2
      const top = (u: number) => s.y + sy * B.top(u)
      const P = (q: Pt): Pt => [s.x + sx * q[0], s.y + sy * q[1]]
      let svg = `<use href="#${s.b}" transform="translate(${R(s.x)} ${s.y})scale(${sx.toFixed(2)} ${sy.toFixed(2)})"/>`
      // bó rễ treo (15 + 11 sợi) đung đưa theo gió
      const rq = P(B.und[clamp(B.ia + (s.fu > 0 ? -2 : 2), 1, 13)] as Pt)
      const rs = P(B.und[s.fu > 0 ? 3 : 11] as Pt)
      // (use có x/y + transform-box:fill-box quay quanh gốc sai trong Chrome → dịch bằng g bọc ngoài)
      svg += `<g transform="translate(${R(rq[0])} ${R(rq[1] - 10)})"><use href="#mi-rt1" class="mi-hg"/></g><use href="#mi-rt2" x="${R(rs[0])}" y="${R(rs[1] - 6)}"/>`
      // thác: suối cắt qua nắp cỏ rồi đổ từ mép đảo (ký hiệu 3 dải + sương trôi theo gió)
      const fx = R(s.x + s.fu * hw)
      const fy = R(top(s.fu) + 3)
      const sd = s.fu > 0 ? 1 : -1
      if (!islandSnow) svg += `<path class="mi-bk" d="M${R(fx - sd * hw * 0.42)} ${R(top(s.fu - sd * 0.42) + 1)}Q${R(fx - sd * hw * 0.2)} ${R(top(s.fu - sd * 0.2) + 3)} ${fx} ${fy - 1}"/>`
      // (dải nước .mi-f* và sương .mi-p* có hoạt ảnh → vẽ tại chỗ, không qua <use>)
      if (!snowy)
        svg +=
          `<g transform="translate(${fx} ${fy})"><g mask="url(#mi-wm)"><rect class="mi-no" x="-34" y="-26" width="68" height="196"/><path class="mi-f1" d="M0-24q${sd * 4} 90 ${sd * 9} 192"/><path class="mi-f3" d="M2-24q${sd * 9} 80 ${sd * 22} 192"/></g>` +
          `<ellipse class="mi-mb" cx="${sd * 14}" cy="166" rx="72" ry="22"/><ellipse class="mi-p1" cx="${sd * 10}" cy="154" rx="38" ry="13"/></g>` +
          ''
      const [inS, inG] = inner(top)
      svg += inS
      const x0 = Math.min(s.x - hw - 8, sd < 0 ? fx - 54 : 1e9)
      const x1 = Math.max(s.x + hw + 8, sd > 0 ? fx + 100 : -1e9)
      add(2, x0, x1, 8, `<g class="mi-${s.k}">${svg}</g>`, inG ? `<g class="mi-${s.k}">${inG}</g>` : undefined)
      if (cloudK > 0.3 || W.fog > 0.3) {
        const cr2 = ctx.rng(`mi-${s.k}-cl`)
        const cx = R(s.x + (cr2() - 0.5) * s.w * 1.2)
        const rx = R(50 + cr2() * 60)
        add(2, cx - rx - 40, cx + rx + 40, 4, `<ellipse class="mi-mb" cx="${cx}" cy="${R(s.y + s.h * (0.7 + cr2() * 0.7))}" rx="${rx}" ry="${R(8 + cr2() * 6)}"/>`)
      }
    }
    const tuft = (x: number, y: number) => `<use href="#mi-gt" x="${R(x)}" y="${R(y)}"/>`

    // Đảo 1 (lớn nhất, trên người khổng lồ đá — lệch phải khỏi khoảng nghỉ): cổng tam quan cổ.
    island({ k: 'i1', b: 'mi-bA', x: 4860, y: 196, w: 320, h: 136, fu: -0.74 }, top => {
      const gx = 4866
      const gy = R(top(0.02) + 2)
      let s = tree(clumpId, 4740, top(-0.7) + 3, 1.25, 'sw2') + tree('mi-tb', 4962, top(0.6) + 2, 1, 'sw3')
      s += `<use href="#mi-gate" x="${gx}" y="${gy}"/>${tuft(4910, top(0.3) + 3)}${tuft(4810, top(-0.3) + 3)}`
      s += `<path class="s2" d="M4936 ${R(top(0.42) + 2)}v-7h4v7zm-2-7h8l-4-3z"/>`
      return [s, night ? lamp(gx, gy - 17) + lamp(4938, R(top(0.42) - 4)) : '']
    })
    // Đảo 2 (cao, lệch phải ở cảnh rừng rêu): cây cổ thụ, lều ẩn sĩ, đèn lồng treo cành, thang dây buông vào mây.
    island({ k: 'i2', b: 'mi-bB', x: 5470, y: 232, w: 222, h: 108, fu: 0.78 }, top => {
      const hx = 5506
      const hy = R(top(0.33) + 2)
      const lx = 5432
      const ly = R(top(-0.34) - 34)
      let s = tree(clumpId, 5440, top(-0.27) + 4, 2.1, 'sw4')
      s += `<use href="#mi-hut" x="${hx}" y="${hy}"/><path class="mi-ln" d="M${lx} ${ly - 15}v14"/>${night ? '' : `<circle class="p1" cx="${lx}" cy="${ly}" r="1.6"/>`}`
      const ex = R(5470 - 0.5 * 111)
      const ey = R(top(-0.5) + 5)
      s += `<g class="mi-hg"><path class="mi-rp" d="M${ex} ${ey}v66m5-66v66"/><path class="mi-rg" d="M${ex + 2} ${ey + 4}v62"/></g>${tuft(5530, top(0.55) + 3)}`
      return [s, night ? `<use href="#mi-lw" x="${hx + 3}" y="${hy - 2}"/>${lamp(lx, ly)}` : '']
    })
    // Đảo 3 (nhỏ, dạt mép phải ở cảnh tháp chuông): tháp đá cổ, cột vỡ, đèn đá.
    island({ k: 'i3', b: 'mi-bA', x: 6545, y: 246, w: 170, h: 92, fu: 0.8 }, top => {
      const px = 6548
      const py = R(top(0.04) + 2)
      const bx = 6590
      const by = R(top(0.53) + 2)
      let s = tree('mi-tb', 6497, top(-0.56) + 2, 1, 'sw3') + tree(clumpId, 6482, top(-0.74) + 3, 0.7, 'sw2')
      s += `<use href="#mi-stp" x="${px}" y="${py}"/>`
      s += `<path class="s1" d="M${bx - 3} ${by}v-14l2-2 2 3 2-1v14z"/><path class="sh" d="M${bx + 1} ${by}v-13l2-1v14z"/><path class="m2" d="M${bx - 4} ${by}q4-4 8 0z"/><path class="s2" d="M${bx + 14} ${by + 1}v-5h6v5zm-1-5h8l-4-3z"/>${tuft(6470, top(-0.88) + 3)}`
      return [s, night ? lamp(bx + 17, by - 3) : '']
    })

    // ───────────── ĐƯỜNG SẮT theo địa hình ─────────────
    // Phân loại từng nhịp theo độ cao lộ ra trên đồi trước: 0 khuất (hầm) · 1 nền đắp (vòm mù) · 2 một tầng vòm · 3 hai tầng vòm.
    type Run = { a: number; b: number; subs: [number, number, number][] }
    const runs: Run[] = []
    {
      const xs0 = Math.floor(-1400 / SW) * SW
      const ts: number[] = []
      for (let x = xs0; x < 7760; x += SW) {
        const hv = Math.max(yF(x), yF(x + SW / 2), yF(x + SW)) - DECK
        ts.push(hv < -8 ? 0 : hv < 28 ? 1 : hv < 100 ? 2 : 3)
      }
      // làm mượt: nhịp lẻ loi kẹp giữa hai nhịp cùng loại thì theo loại đó (không nhấp nháy loại vòm)
      for (let pass = 0; pass < 2; pass += 1)
        for (let i = 1; i < ts.length - 1; i += 1) {
          const p0 = ts[i - 1] as number
          const p1 = ts[i + 1] as number
          if (p0 && p0 === p1 && ts[i] && ts[i] !== p0) ts[i] = p0
        }
      let cur: Run | undefined
      ts.forEach((t, i) => {
        const x = xs0 + i * SW
        if (!t || (cur && x - cur.a >= 1200)) {
          if (cur) runs.push(cur)
          cur = undefined
        }
        if (!t) return
        if (!cur) cur = { a: x, b: x, subs: [] }
        const last = cur.subs[cur.subs.length - 1]
        if (last && last[2] === t) last[1] = x + SW
        else cur.subs.push([x, x + SW, t])
        cur.b = x + SW
      })
      if (cur) runs.push(cur)
    }
    // Cây sau cầu: cụm tán đứng trên sườn đồi phía sau, mặt cầu che chân.
    {
      const r = ctx.rng('mi-tbk')
      let s = ''
      let a = 1e9
      let b = -1e9
      for (const run of runs) {
        for (let x = run.a + 30 + r() * 120; x < run.b - 20; x += 280 + r() * 340) {
          if (r() < 0.62) continue
          if (x - a > 360) {
            if (s) add(2, a - 40, b + 40, 3, s)
            s = ''
            a = 1e9
            b = -1e9
          }
          const sc = Math.round((0.6 + r() * 0.8) * 20) / 20
          s += tree(clumpId, x, DECK + 8, sc, r() < 0.5 ? 'sw2' : 'sw4')
          if (r() < 0.35) s += tree(clumpId, x + 14 * sc, DECK + 10, Math.round(sc * 14) / 20, 'sw1')
          a = Math.min(a, x)
          b = Math.max(b, x)
          if (b - a > 400) {
            add(2, a - 40, b + 40, 3, s)
            s = ''
            a = 1e9
            b = -1e9
          }
        }
      }
      if (s) add(2, a - 40, b + 40, 3, s)
    }
    // Nhánh cũ gãy: cầu dốc vươn lên từ sau đồi, nhịp cuối sập, ray chơi vơi uốn lên trỏ về đảo bay.
    {
      const [xa, ya, xb, yb] = SP
      const dy = (x: number) => ya + ((yb - ya) * (x - xa)) / (xb - xa)
      let holes = ''
      for (let x = xa + 6; x + 30 <= xb - 10; x += SW) {
        const sy = R(dy(x + 15) + 22)
        holes += `M${x} 700V${sy}a15 15 0 0 1 30 0V700z`
      }
      const wall = `M${xa} 700V${ya}L${xb} ${yb}l3 4-2 5 4 6-3 7 2 9-1 11 3 14V700z`
      const rail: Pt[] = [
        [xa, ya - 1.5],
        [xb - 2, yb - 1.5],
        [xb + 22, yb + 5],
        [xb + 40, yb + 1],
        [xb + 52, yb - 14],
        [xb + 58, yb - 34],
      ]
      const P = painter()
      P.p('s1', `M${xa} ${ya}L${xb} ${yb}v1.4L${xa} ${ya + 1.4}z`)
      P.p('m2', `M${xb - 46} ${R(dy(xb - 46) + 1)}l40-${R((dy(xb - 46) - yb) * 0.9)}l6 3q-3 9-1 18q-4-8-7-9q-4 6-4 14q-3-8-1-14q-12 4-20 2q-6 6-7 14q-2-8 0-13z`)
      P.p('l3', `M${xb - 2} ${yb + 6}q-3 18 1 34q2-16 3-33z`)
      add(
        2,
        xa - 20,
        xb + 64,
        6,
        `<path class="mi-vw" fill-rule="evenodd" d="${wall}${holes}"/>` +
          P.out() +
          `<path class="mi-iv" d="${holes}"/>` +
          `<path id="mi-spr" class="mi-sr1" d="${qo(rail)}"/><use href="#mi-spr" class="mi-sr2" y="1.6"/>` +
          tree(clumpId, xb - 12, yb + 2, 0.5, 'sw3'),
      )
      spots.push({ kind: 'perch', layer: 2, x: xb + 40, y: yb + 1, s: 0.38 })
    }
    // Cầu cạn / nền đắp: ô mẫu theo loại nhịp (vòm thủng nhìn xuyên, lòng vòm tối dần, vòng đá, mặt trụ trái sáng/phải tối);
    // phủ ô mẫu 7 nhịp (tông từng trụ ±6%, rêu gờ cầu, ray & tà vẹt) và ô mẫu 11 nhịp (dây leo, vệt nước) → lệch nhịp, chu kỳ 77 nhịp.
    for (const run of runs) {
      let s = ''
      for (const [a, b, t] of run.subs) s += `<rect class="mi-q${t}" x="${a}" width="${b - a}"/>`
      s += `<rect class="mi-qt" x="${run.a}" width="${run.b - run.a}"/>`
      add(2, run.a - 10, run.b + 10, 7, s)
    }

    // Ga Mây: nền ga rộng, đường tránh (làn gần), sân ga, mái chờ, biển tên ga bạc màu, đèn, tháp nước.
    {
      const y = DECK
      const P = painter()
      P.p('s3', `M${LOOP[0] - 60} ${y}H${LOOP[1] + 60}v7H${LOOP[0] - 60}z`)
      P.p('mi-sl', `M${LOOP[0]} ${y + 4.4}H${LOOP[1]}`)
      P.p('mi-rl', `M${LOOP[0] - 40} ${y - 1.5}L${LOOP[0]} ${y + 3.3}H${LOOP[1]}L${LOOP[1] + 40} ${y - 1.5}`)
      const px = XS - 262
      P.p('s2', `M${px} ${y - 6}h190v4h-190z`)
      // mái chờ
      P.p('w2', `M${XS - 236} ${y - 6}v-14h52v14z`)
      P.p('sh', `M${XS - 196} ${y - 6}v-14h12v14z`)
      P.p('k2', `M${XS - 226} ${y - 6}v-9h8v9zM${XS - 208} ${y - 15}h6v4h-6z`)
      roofSmall(P, XS - 210, y - 20, 30)
      P.p('m2', `M${XS - 242} ${y - 25}q8-4 18-1q-6 2-9 5q-3-3-9-4z`)
      // ghế, chậu hoa, đèn
      P.p('d1', `M${XS - 152} ${y - 6}l1-4h5l1 4z`)
      P.p(S === 'dong' ? 'b2' : 'f1', `M${XS - 150} ${y - 11}q-3-4 1-5q3 1 1 5zm2-1q2-4 4-2q0 3-4 2z`)
      P.p('k2', `M${XS - 98} ${y - 6}v-24h1.4v24zM${XS - 101} ${y - 31}h7v2h-7z`)
      // biển tên ga
      P.p('k2', `M${XS - 258} ${y - 6}v-17h1.2v17zM${XS - 230 + 0} ${y - 6}v-17h1.2v17z`)
      P.p('p3', `M${XS - 261} ${y - 30}h36v9h-36z`)
      const txt = `<text class="mi-tx" x="${XS - 243}" y="${y - 23.4}" text-anchor="middle">GA MÂY</text>`
      add(
        2,
        LOOP[0] - 64,
        LOOP[1] + 64,
        6,
        P.out() + txt,
        night ? `${lamp(XS - 97, y - 29)}<circle fill="url(#gw)" cx="${XS - 222}" cy="${y - 11}" r="9"/><path class="e2" d="M${XS - 225} ${y - 14}h6v5h-6z"/>` : undefined,
      )
    }

    // Cột tín hiệu: đỏ khi có tàu trong khu gian, xanh khi đường thông — khớp lịch hai tàu.
    add(
      2,
      SIG - 20,
      SIG + 20,
      5,
      `<path class="mi-sp" d="M${SIG} ${DECK}v-26"/><path class="k1" d="M${SIG - 3} ${DECK - 34}h6v10h-6z"/><circle class="p1 mi-sr" cx="${SIG}" cy="${DECK - 31}" r="1.6"/><circle class="e4 mi-sg" cx="${SIG}" cy="${DECK - 27}" r="1.6"/>`,
      night ? `<circle class="mi-sr" fill="url(#gw)" cx="${SIG}" cy="${DECK - 31}" r="9"/><circle class="mi-sg" fill="url(#gg)" cx="${SIG}" cy="${DECK - 27}" r="9"/>` : undefined,
    )

    // Hai đoàn tàu. Ô tô ray (làn chính, xa) vẽ trước; tàu hơi (vào đường tránh = làn gần) vẽ sau.
    if (!lite) add(2, -1600, 7800, 6, `<g class="mi-tb"><use href="#mi-rc2" y="${DECK - 1}"/></g>`, night ? `<g class="mi-tb"><use href="#mi-rcw" y="${DECK - 1}"/></g>` : undefined)
    add(
      2,
      -1600,
      7800,
      8,
      `<g class="mi-ta"><use href="#mi-tn" y="${DECK}"/><g class="w3"><circle class="mi-sm" cx="-5" cy="${DECK - 21}" r="3"/><circle class="mi-sm mi-s2" cx="-5" cy="${DECK - 21}" r="3"/><circle class="mi-sm mi-s3" cx="-5" cy="${DECK - 21}" r="3"/></g></g>`,
      night ? `<g class="mi-ta"><use href="#mi-tnw" y="${DECK}"/></g>` : undefined,
    )
    fog(2, 622, 0.66)

    // Đồi trước: nền cỏ sáng, rừng thành mảng (ô mẫu 1330), hàng ngọn cây chấm có khoảng trống, thông mọc cụm.
    {
      const tf = rdp(samp(yF, L2X[0], L2X[1], 12), 5.4)
      const pr = ctx.rng('mi-pnf')
      for (let x0 = L2X[0] + F0; x0 < L2X[1]; x0 += CH2) {
        let pn = ''
        if (!lite)
          for (let x = x0 + pr() * 220; x < x0 + CH2; x += 300 + pr() * 360) {
            if (pr() < 0.6) continue
            pn += pines('a', x, yF, pr)
          }
        add(2, x0 - 12, x0 + CH2 + 12, 9, `<path class="mi-f" clip-path="url(#mi-xc)" style="stroke-dashoffset:${R(dr() * 600)}" d="${qo(clipX(tf, x0 - 20, x0 + CH2 + 20))}V1100H${x0 - 20}Z"/>${pn}`)
      }
    }

    // Cửa hầm đá rêu ở hai mép mỗi đồi che đường.
    {
      const seen: number[] = []
      for (const [c] of HILL) {
        for (const dir of [-1, 1]) {
          let x = c
          while (Math.abs(x - c) < 700 && yF(x) < DECK - 12) x += dir * 2
          if (Math.abs(x - c) >= 700 || x < -1300 || x > 7700 || x === c) continue
          x = R(x - dir * 5)
          if (seen.some(q => Math.abs(q - x) < 60)) continue
          seen.push(x)
          add(2, x - 16, x + 16, 5, `<use href="#mi-po" x="${x}" y="${DECK}"/>`)
        }
      }
    }

    // Ba làng xa (5–9 nóc nhà) trên đồi trước; đêm lên đèn (thưa dần về khuya), khói bếp.
    {
      const lateK = h >= 22.5 || h < 4.5 ? 0.32 : h < 6 ? 0.45 : 0.72
      const village = (key: string, xs: number[], temple: number, tr2: number) => {
        const r = ctx.rng(key)
        const lr = ctx.rng(`${key}-${ctx.vn.h}`)
        let s = ''
        let g = ''
        let lit = 0
        for (const x of xs) {
          const y = R(yF(x) + 3)
          s += `<use href="#${r() < 0.3 ? 'mi-hs2' : 'mi-hs'}" x="${x}" y="${y}"/>`
          if (night && (lr() < lateK || lit < 2) && lit < 4) {
            g += `<use href="#mi-lw" x="${x}" y="${y}"/>`
            lit += 1
          }
        }
        const ty = R(yF(temple) + 3)
        s += `<use href="#mi-tpl" x="${temple}" y="${ty}"/>${tree(clumpId, tr2, yF(tr2) + 3, 1.1, 'sw4')}${tree(clumpId, tr2 + 12, yF(tr2 + 12) + 3, 0.75, 'sw2')}`
        if (night) g += lamp(temple, ty - 3)
        add(2, Math.min(...xs, temple, tr2) - 20, Math.max(...xs, temple, tr2) + 30, 5, s, g || undefined)
        spots.push({ kind: 'smoke', layer: 2, x: (xs[1] as number) + 2, y: R(yF(xs[1] as number) - 7), s: 0.35 })
      }
      village('mi-v1', [1068, 1083, 1099, 1150, 1166, 1184], 1132, 1044)
      village('mi-v2', [3686, 3701, 3717, 3768, 3785, 3801], 3752, 3820)
      village('mi-v3', [5924, 5940, 5957, 5986, 6003, 6021], 5972, 5904)
    }
    spots.push({ kind: 'perch', layer: 2, x: 2216, y: DECK - 1, s: 0.42 }, { kind: 'perch', layer: 2, x: 6620, y: DECK - 1, s: 0.42 })
    fog(2, 690, 0.42)

    // ───────────── defs ─────────────
    const st = (o: string, vv: string, a?: string) => `<stop offset="${o}" stop-color="${v(vv)}"${a ? ` stop-opacity="${a}"` : ''}/>`
    const lg = (id: string, stops: string, attr = 'x2="0" y2="1"') => `<linearGradient id="${id}" ${attr}>${stops}</linearGradient>`
    // kết cấu rừng chấm: tán hai sắc (tối lệch dưới-phải, sáng trên-trái)
    const forest = (id: string, w: number, y0: number, g: string, n: number, rr: number, ya: number, yb: number) => {
      let dk = ''
      let lt = ''
      for (let i = 0; i < n; i += 1) {
        const x = rr + 1 + tr() * (w - 2 * rr - 2)
        const y = ya + (yb - ya) * tr() ** 1.4
        dk += `M${J([x + rr * 0.3, y + rr * 0.35])}h0`
        lt += `M${J([x - rr * 0.15, y - rr * 0.2])}h0`
      }
      return `<pattern id="${id}" width="${w}" height="600" y="${y0}" patternUnits="userSpaceOnUse"><rect width="${w}" height="600" fill="url(#${g})"/><path class="mi-kd" style="stroke-width:${rr * 2}" d="${dk}"/><path class="mi-kl" style="stroke-width:${R(rr * 1.4)}" d="${lt}"/></pattern>`
    }
    // đồi trước: mảng rừng (ô mẫu 1330, mảng cắt mép được lặp hai bên để không lộ đường nối)
    // đồi trước: lùm cây tròn thành từng dải (2 ký hiệu lùm × 9 chỗ trong ô mẫu 1330, lặp hai mép để không lộ đường nối)
    const forestPatches = (() => {
      const r = ctx.rng('mi-fpat')
      const T = 1330
      let sym = ''
      for (let g = 0; g < 2; g += 1) {
        // dải rừng: mép trên gợn theo ngọn cây cao thấp không đều (nhiễu), đáy phẳng thon hai đầu; viền sáng chỉ chạy mép trên
        const nG = ctx.noise(`mi-gv${g}`)
        const Wd = 70 + g * 34
        const Hh = 15 + g * 5
        const ph = r() * 6
        const tp: Pt[] = []
        for (let k = 0; k <= 16; k += 1) {
          const u = -1 + k / 8
          const sc = Math.abs(Math.sin(u * (7 + g * 2) + ph)) ** 0.6
          tp.push([u * Wd, -Hh * (1 - u * u) ** 0.6 * (0.55 + 0.3 * sc + 0.5 * (fbm(nG, u * 2.4, 0.4, 2) + 0.5) * (u < 0.2 ? 1 : 0.6))])
        }
        const bt: Pt[] = []
        for (let k = 15; k >= 1; k -= 2) {
          const u = -1 + k / 8
          bt.push([u * Wd, Hh * 0.3 * (1 - u * u) ** 0.5 + 2 * nG(u * 4, 2.2)])
        }
        const d = sm([...tp, ...bt])
        const hl = qo(tp.slice(2, 10).map(q => [q[0] + 1, q[1] + 2.5] as Pt))
        sym += `<g id="mi-gv${g}"><path fill="url(#mi-pfd)" d="${d}"/><path class="mi-kl" style="stroke-width:3" d="${hl}"/></g>`
      }
      let uses = ''
      for (let i = 0; i < 9; i += 1) {
        const x = R(r() * T)
        const y = R(70 + r() * 200)
        const g = i % 2
        for (const off of [0, -T, T]) if (x + off + 130 > 0 && x + off - 130 < T) uses += `<use href="#mi-gv${g}" x="${x + off}" y="${y}"/>`
      }
      return `${sym}<pattern id="mi-pf" width="${T}" height="600" y="540" patternUnits="userSpaceOnUse"><rect width="${T}" height="600" fill="url(#mi-gm2)"/>${uses}</pattern>`
    })()
    // ô mẫu cầu: tường theo loại nhịp (40) — 1 nền đắp (vòm mù), 2 một tầng vòm, 3 hai tầng vòm; lòng vòm tối dần, vòng đá, mặt trụ
    const y0 = DECK - 12
    const tile = (id: string, w: string, extra: string) => `<pattern id="${id}" width="${SW}" height="250" y="${y0}" patternUnits="userSpaceOnUse">${w}${extra}<path class="hl" opacity=".18" d="M35 30h2.4v220H35z"/><path class="sh" opacity=".3" d="M2.6 30H5v220H2.6z"/></pattern>`
    const bridgeTiles =
      tile('mi-w1', `<rect class="mi-vw" y="12" width="40" height="238"/><path class="mi-bl" d="M6 120V44a14 14 0 0 1 28 0V120z"/><path class="mi-vr" d="M6 44a14 14 0 0 1 28 0"/>`, '') +
      tile('mi-w2', `<path class="mi-vw" fill-rule="evenodd" d="M0 12h40v238H0zM5 250V43a15 15 0 0 1 30 0V250z"/><path class="mi-ig" d="M5 68V43a15 15 0 0 1 30 0V68z"/><path class="mi-vr" d="M5 43a15 15 0 0 1 30 0"/>`, '') +
      tile(
        'mi-w3',
        `<path class="mi-vw" fill-rule="evenodd" d="M0 12h40v238H0zM5 72V43a15 15 0 0 1 30 0V72zM6 250V100a14 14 0 0 1 28 0V250z"/><path class="mi-ig" d="M5 64V43a15 15 0 0 1 30 0V64zM6 124V100a14 14 0 0 1 28 0V124z"/><path class="mi-vr" d="M5 43a15 15 0 0 1 30 0M6 100a14 14 0 0 1 28 0"/><path class="s1" d="M0 72h40v1.4H0z"/><path class="s3" d="M0 73.4h40v3H0z"/>`,
        '',
      )
    // phủ 7 nhịp: tông từng trụ (cột trụ + băng tường trên đỉnh vòm — là tường ở mọi loại nhịp), đá khoá, gờ mặt cầu, rêu, ray & tà vẹt
    const wallPat = (() => {
      const r = ctx.rng('mi-va')
      const T = 7 * SW
      let key = ''
      for (let p = 0; p < 7; p += 1) key += `M${p * SW + 19} 26.5h2.4v4h-2.4z`
      let mossTop = `M0 13h${T}v2`
      for (let x = T; x > 0; x -= 13 + R(r() * 10)) {
        mossTop += `L${x} ${R(15 + r() * 3)}`
        if (r() < 0.28) mossTop += `l-1 ${R(4 + r() * 10)}l-2-${R(3 + r() * 6)}`
      }
      mossTop += `L0 15z`
      let m3 = ''
      for (let i = 0; i < 3; i += 1) {
        const x = R(r() * 7) * SW + (r() < 0.5 ? -4 : 1)
        m3 += `M${x} ${R(50 + r() * 40)}q2 ${R(10 + r() * 20)} 1 ${R(30 + r() * 30)}q-2-${R(14 + r() * 10)}-3-${R(28 + r() * 26)}z`
      }
      return (
        `<pattern id="mi-vt" width="${T}" height="250" y="${y0}" patternUnits="userSpaceOnUse">` +
        `<path class="s1" d="${key}M0 12h${T}v1.3H0z"/><path class="s3" d="M0 16.5h${T}v2.2H0z"/><path class="s4" opacity=".3" d="M0 18.7h${T}v2.2H0z"/>` +
        `<path class="m2" d="${mossTop}"/><path class="m3" opacity=".7" d="${m3}"/><path class="mi-rl" d="M0 10.4h${T}"/><path class="mi-sl" d="M0 11.6h${T}"/></pattern>`
      )
    })()
    const rootsSym = (id: string, n: number, L0: number, L1: number) => {
      const r = ctx.rng(id)
      let a = ''
      let b = ''
      let m = ''
      for (let i = 0; i < n; i += 1) {
        const x = (r() - 0.5) * 34
        const L = L0 + r() * (L1 - L0) * (1 - Math.abs(x) / 34)
        const c = (r() - 0.5) * 12
        const d = `M${J([x, 0])}q${J([c, L * 0.5, c * 0.4 + (r() - 0.5) * 6, L])}`
        if (i % 3 === 2) b += d
        else a += d
        if (r() < 0.4) m += `M${J([x + c * 0.45, L * (0.3 + r() * 0.3)])}h0`
      }
      return `<g id="${id}"><path class="mi-ro" d="${a}"/><path class="mi-ro2" d="${b}"/><path class="mi-rmo" d="${m}"/></g>`
    }
    const gate = (() => {
      const P = painter()
      P.p('s2', 'M-64 2h128l-5-8H-59z')
      P.p('w1" fill-rule="evenodd', 'M-54-6v-32h32v-20h44v20h32v32zM-46-6v-18a7 7 0 0 1 14 0v18zM32-6v-18a7 7 0 0 1 14 0v18zM-11-6v-28a11 11 0 0 1 22 0v28zM-14-67v-14h28v14z')
      P.p('sh', 'M18-6v-52h4v52zM50-6v-32h4v32zM9-67v-14h5v14z')
      P.p('hl', 'M-54-38h4v32h-4zM-22-58h4v20h-4z')
      roof(P, -39, -38, 19, 8)
      roof(P, 39, -38, 19, 8)
      roof(P, 0, -58, 28, 9)
      roof(P, 0, -81, 22, 10)
      P.p('m2', 'M-60-44q10-5 20-2q-8 3-12 7q-4-4-8-5zM20-64q12-5 22-1q-8 2-12 6q-4-4-10-5z')
      P.p('p1', 'M-7-52h14v5H-7zM-3-38h6v7h-6zM-1-91h2v-7h-2z')
      return `<g id="mi-gate" transform="scale(.5)">${P.out()}</g>`
    })()
    const hut = (() => {
      const P = painter()
      P.p('w1', 'M-13 0v-16h26v16z')
      P.p('sh', 'M7 0v-16h6v16z')
      P.p('k2', 'M-9 0v-11h6V0zM2-12h6v5H2z')
      roof(P, 0, -16, 17, 9)
      P.p('m2', 'M-12-21q7-5 13 0z')
      return `<g id="mi-hut" transform="scale(.5)">${P.out()}</g>`
    })()
    const stupa = (() => {
      const P = painter()
      let body = 'M-16 0h32v-6h-32z'
      let slabs = ''
      for (let i = 0; i < 3; i += 1) {
        const bw = 22 - i * 5
        body += `M${J([-bw / 2, -6 - i * 9])}h${bw}v-7h${-bw}z`
        slabs += `M${J([-bw / 2 - 3, -13 - i * 9])}h${bw + 6}v-2h${-bw - 6}z`
      }
      P.p('s2', body)
      P.p('s3', slabs)
      P.p('sh', 'M3-6h8v-7H3zM2-15h6v-7H2zM1-24h4v-7H1z')
      P.p('x1', 'M-1-33v-8h2v8z')
      P.p('m2', 'M-16-1q8-5 16 0zM-11-13q5-4 9 0z')
      return `<g id="mi-stp" transform="scale(.5)">${P.out()}</g>`
    })()
    const temple = (() => {
      const P = painter()
      P.p('w2', 'M-16 0v-12h32v12z')
      P.p('sh', 'M8 0v-12h8v12z')
      roof(P, 0, -12, 20, 9)
      P.p('p1', 'M-3 0v-8h6v8z')
      return `<g id="mi-tpl" transform="scale(.5)">${P.out()}</g>`
    })()
    const pagoda = (() => {
      let body = ''
      let rf = ''
      for (let i = 0; i < 7; i += 1) {
        const bw = R(14 - i * 1.6)
        body += `M${J([-bw / 2, -i * 8])}h${bw}v-6h${-bw}z`
        rf += `M${J([-bw / 2 - 5, -i * 8 - 5])}l3 2h${bw + 4}l3-2-3-2h${-bw + 2}z`
      }
      return `<g id="mi-pg" transform="scale(.5)"><path class="mi-pb" d="${body}M-1-50h2v-12h-2z"/><path class="mi-pr" d="${rf}"/><path class="mi-ps" d="M1-50V0h6v-50z"/></g>`
    })()
    const clump =
      `<g id="mi-tc"><path class="b1" d="M-2 0l1-12-5-5 5 3 1-6 2 6 3-4-3 6 1 12z"/>` +
      crown('l3', -9, -17, 12, 9.5) +
      crown('l3', 8, -20, 11, 9) +
      crown('l3', -1, -28, 10, 8) +
      crown('l2', -11, -20, 8, 6) +
      crown('l2', 5, -24, 7, 5.5) +
      `<path class="hl" d="${sm(lump(-13, -22, 4.6, 3, tr, 5))}${sm(lump(-5, -32, 3.6, 2.4, tr, 5))}"/>` +
      crown('mi-l4', 6, -13, 10, 3.6) +
      `</g>`
    // mặt bụng đảo, hệ đơn vị: x ∈ [−100, 100], mép trên y = 0, đáy ~100
    const ud = (id: string, k: number) =>
      `<g id="${id}"><path class="hl" d="M-110 0h98l${12 + k} 22-${6 + k} 26 10 30-2 34H-110z"/><path class="hl" d="M-110 0h52l-${10 + k} 30-42 14z"/>` +
      `<path class="sh" d="M110 0H-12l${12 + k} 22-${6 + k} 26 10 30-2 34H110z"/><path class="sh" d="M${12 + k} 64l98-50v100H6z"/>` +
      `<path class="mi-sk" d="M-${44 - k} 30l8 2 7 4 8 1M${2 + k} 50l9 3 11-1 8 3M${44 + k} 34l10-1 9 4"/>` +
      `<path class="d2" d="M-110-6h220v10l-18 2-20-1-22 2-20-1-22 1-20-2-22 2-20-1-22 1-20-1-14-1z"/>` +
      `<path class="m2" d="M-110-6h220v15l-14-3-16 2-18-1-12 3-20-2-14 1-18 1-20-2-16 2-22-3-20 1-30-2zM${14 + k} 9q2 10 4 ${18 + k}q2-${9 + k} 4-${18 + k}zM${36 - k} 9q3 14 4 ${28 - k}q2-14 4-${28 - k}zM${60 + k} 9q3 18 5 ${34 + k}q1-17 4-${34 + k}zM82 9q2 12 4 24q1-12 3-24zM-${70 - k} 7q2 5 3 9q1-5 3-9zM-40 7q1 4 3 7q1-4 2-7z"/>` +
      `<path class="m3" d="M${44 + k} 30q3 18 5 38q2-20 3-38zM${70 - k} 26q3 20 4 40q2-20 3-40z"/></g>`
    const defs =
      symDefs +
      // cắt bỏ nét hàng cây ở hai mép dọc của mỗi khúc đồi (khúc rộng CH2+40, giữ lại CH2+24)
      `<clipPath id="mi-xc" clipPathUnits="objectBoundingBox"><rect x="${(8 / (CH2 + 40)).toFixed(4)}" width="${(1 - 16 / (CH2 + 40)).toFixed(4)}" y="-1" height="3"/></clipPath>` +
      `<rect id="mi-fr" class="mi-fg" x="-1600" width="11500" height="640"/>` +
      lg('mi-gh2', st('0', 'mih') + st('1', 'mih2'), 'gradientUnits="userSpaceOnUse" x1="0" y1="16" x2="0" y2="170"') +
      lg('mi-gf2', st('0', 'mif') + st('1', 'mif2'), 'gradientUnits="userSpaceOnUse" x1="0" y1="30" x2="0" y2="220"') +
      lg('mi-gm2', st('0', 'mim') + st('1', 'mim2'), 'gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2="220"') +
      forest('mi-ph', 211, 520, 'mi-gh2', 13, 3, 28, 190) +
      forest('mi-pfd', 263, 540, 'mi-gf2', 13, 5, 30, 300) +
      forestPatches +
      lg('mi-ug', st('0', 's2') + st('.45', 's3') + st('1', 's4')) +
      lg('mi-glf', '<stop offset=".1" stop-color="#fff" stop-opacity=".12"/><stop offset=".37" stop-color="#fff" stop-opacity="0"/>') +
      lg('mi-gdf', st('.1', 'k2', '.11') + st('.37', 'k2', '0')) +
      lg('mi-igg', st('0', 'k1', '.13') + st('1', 'k1', '0')) +
      wallPat +
      bridgeTiles +
      lg('mi-fo', st('0', 'haze', '0') + st('.22', 'haze', '.82') + st('1', 'haze', '.92')) +
      `<radialGradient id="mi-mg">${st('0', 'w3', '.9')}${st('.55', 'haze', '.42')}${st('1', 'haze', '0')}</radialGradient>` +
      // (thác mi-wf* vẽ tại chỗ trong island(); ở đây chỉ còn gradient + mask tĩnh của nó)
      lg('mi-wf', '<stop offset=".08" stop-color="#fff" stop-opacity="0"/><stop offset=".1" stop-color="#fff"/><stop offset=".36" stop-color="#fff" stop-opacity=".85"/><stop offset=".96" stop-color="#fff" stop-opacity="0"/>') +
      `<mask id="mi-wm" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#mi-wf)"/></mask>` +
      lg('mi-se', st('0', 'a1') + st('1', 'a1', '0')) +
      lg('mi-gh', st('0', 'mih') + st('1', 'mih2'), 'gradientUnits="userSpaceOnUse" x1="0" y1="536" x2="0" y2="690"') +
      lg('mi-gfs', st('0', 'mif') + st('1', 'mif2'), 'gradientUnits="userSpaceOnUse" x1="0" y1="570" x2="0" y2="760"') +
      (night ? lg('mi-bm', st('0', 'e1', '.5') + st('1', 'e1', '0'), '') : '') +
      `<g id="mi-tb"><path class="b1" d="M-1 0h2v-5h-2z"/><path class="l3" d="M0-31c-4 6-5 14-4 22 0 3 2 5 4 5s5-2 5-5c0-8-1-16-5-22z"/><path class="l2" d="M0-30c-3 6-4 13-3 20 1 1 2 1 2 0 0-7 1-14 1-20z"/></g>` +
      clump +
      ud('mi-ud1', 0) +
      ud('mi-ud2', 6) +
      (S === 'xuan' ? `<g id="mi-tc1"><use href="#mi-tc"/><path class="mi-b1" d="M-14-22h0M-6-30h0M3-27h0M9-21h0M-8-15h0M1-19h0M7-14h0M-2-25h0M-12-17h0"/></g>` : '') +
      (S === 'ha' ? `<g id="mi-tc2"><use href="#mi-tc"/><path class="mi-b2" d="M-11-24h0M2-29h0M9-19h0M-5-17h0"/></g>` : '') +
      (S === 'dong' ? `<path id="mi-tx" class="mi-bx" d="M0 0v-14l-7-9m7 9 6-11m-6 5v-11m0 4-5-6m11 2 3-4m-15 3-4-3"/>` : '') +
      `<path id="mi-gt" class="mi-gr" d="M-3 0q-1-4-3-6M0 0q0-5 1-8M2 0q2-3 4-4"/>` +
      `<path id="mi-tfr" class="mi-gr" d="M-2-1q4 1 6 6M0-1q5 0 8 3M-1 0q2 3 2 7"/><path id="mi-tfl" class="mi-gr" d="M2-1q-4 1-6 6M0-1q-5 0-8 3M1 0q-2 3-2 7"/>` +
      rootsSym('mi-rt1', 15, 26, 74) +
      rootsSym('mi-rt2', 11, 10, 34) +
      gate +
      hut +
      stupa +
      temple +
      pagoda +
      [3, 5, 7]
        .map(n => {
          let a = ''
          let b = ''
          let cx = 0
          for (let j = 0; j < n; j += 1) {
            const hf = 10 + tr() * 9
            const hb = 8 + tr() * 7
            a += `M${J([cx, 3 - hf])}l${J([-2 - hf * 0.16, hf * 0.55])}h2l${J([-2 - hf * 0.06, hf * 0.45])}h${R(4 + hf * 0.44)}l${J([-2 - hf * 0.06, -hf * 0.45])}h2z`
            b += `M${J([cx, 3 - hb])}l${J([-3 - hb * 0.12, hb])}h${R(6 + hb * 0.24)}z`
            cx += 4 + tr() * 7
          }
          return `<path id="mi-pa${n}" class="mi-pn" d="${a}"/><path id="mi-pb${n}" class="mi-pn2" d="${b}"/>`
        })
        .join('') +
      `<g id="mi-po"><path class="s2" d="M-12 5v-27q12-8 24 0v27z"/><path class="sh" d="M4 5v-28h8v28z"/><path class="k1" d="M-6 3v-12a6 6 0 0 1 12 0v12z"/><path class="s1" d="M-8-16a9 9 0 0 1 16 0" opacity=".6"/><path class="m2" d="M-13-21q13-9 26 0q-4 4-8 2q-4 6-6 0q-6 4-12-2z"/></g>` +
      `<g id="mi-hs"><path class="w1" d="M-5 0v-6h10v6z"/><path class="sh" d="M2 0v-6h3v6z"/><path class="r2" d="M-7-5l3-5h8l3 5z"/><path class="k2" d="M-2 0v-3h2v3z"/></g>` +
      `<g id="mi-hs2"><path class="w2" d="M-7 0v-7h14v7z"/><path class="sh" d="M3 0v-7h4v7z"/><path class="r3" d="M-10-6l4-6h12l4 6z"/><path class="k2" d="M-4-4h2v2h-2zm5 0h2v2H1z"/></g>` +
      // quầng đèn tĩnh; ngọn lửa .fl do lamp() vẽ tại chỗ
      (night ? `<circle id="mi-lp" fill="url(#gw)" r="12"/><g id="mi-lw"><circle fill="url(#gw)" cy="-3" r="11"/><path class="e2" d="M-2-4h3v2h-3z"/></g>` : '') +
      // tàu A: đầu máy hơi nước + toa than + 3 toa khách kem/xanh ngọc (đầu tàu ở x=0, hướng +x)
      `<g id="mi-lc"><path class="k2" d="M-56-12h14v9h-14zm14-8h13v2h-13zm35 6h6v9h-6z"/><path class="p2" d="M-41-18h11v15h-11zm11 4h24v9h-24z"/><path class="hl" d="M-30-14h24v2h-24z"/>` +
      `<path class="k1" d="M-55-12q6-3 12 0zm49-7h3v5h-3zM-7-20h5v1.6h-5z"/><path class="mi-gd" d="M-24-14v9m8-9v9"/><path class="x1" d="M-19-14q0-3 3-3t3 3z"/><path class="s1" d="M-31-5h31v1h-31z"/><path class="p1" d="M-1-6h2v3h-2z"/>` +
      `<path class="mi-wh" d="M-26-2.6h0m6.5 0h0m6.5 0h0M-4-2h0m-48 0h0m6 0h0"/><path class="mi-rd" d="M-26-2.6h13"/></g>` +
      `<g id="mi-cr"><path class="p3" d="M0-15h36v11H0z"/><path class="p2" d="M0-8h36v4H0z"/><path class="k2" d="M-1-15q19-5 38 0z"/><path class="mi-wn" d="M3-11.5h31"/><path class="k1" d="M1-4h34v1.4H1z"/><path class="mi-wh" d="M5-2h0m5 0h0m16 0h0m5 0h0"/></g>` +
      `<g id="mi-tn"><use href="#mi-lc"/><use href="#mi-cr" x="-94"/><use href="#mi-cr" x="-132"/><use href="#mi-cr" x="-170"/></g>` +
      (night ? `<g id="mi-tnw"><path fill="url(#mi-bm)" d="M0-15l80-9v18z"/><circle fill="url(#gw)" cy="-15" r="12"/><circle class="e1" cy="-15" r="1.3"/><path class="mi-gw" d="M-91-11.5h31m7 0h31m7 0h31M-39-14h4"/><rect fill="url(#gw)" x="-174" y="-24" width="120" height="24"/></g>` : '') +
      // tàu B: ô tô ray hai toa đỏ-kem, chạy về bên trái (đầu tàu ở x=0, hướng −x)
      `<g id="mi-rq"><path class="p3" d="M0-14h40v10H0z"/><path class="p1" d="M0-8h40v4H0z"/><path class="k2" d="M0-14q20-4 40 0z"/><path class="mi-wn" d="M3-11h34"/><path class="k1" d="M2-4h36v1.4H2z"/><path class="mi-wh" d="M7-2h0m26 0h0"/></g>` +
      `<g id="mi-rc2"><use href="#mi-rq" x="1"/><use href="#mi-rq" x="43"/><path class="p3" d="M1-14q-4 1-5 6v4h4z"/></g>` +
      (night ? `<g id="mi-rcw"><path class="mi-gw" d="M4-11h34m8 0h34"/><rect fill="url(#gw)" x="-2" y="-22" width="88" height="22"/><circle fill="url(#gw)" cx="-2" cy="-9" r="9"/></g>` : '')

    // ───────────── css ─────────────
    const ph = (p: number, k: string) => `animation-delay:${ctx.ph(p, k)}`
    const delA = ctx.ph(TP, 'mi-tau')
    const delB = delA.startsWith('calc(') ? `calc(${(TB0 - TP).toFixed(1)}s + ${delA.slice(5)}` : delA
    const css =
      `.mi-z{fill:${v('miz')}}.mi-rz{stroke:var(--w3);stroke-width:1;stroke-opacity:.18}.mi-a{fill:${v('mia')}}.mi-b{fill:${v('mib')}}.mi-lf{fill:url(#mi-glf)}.mi-df{fill:url(#mi-gdf)}.mi-sn{fill:var(--w3);opacity:${(0.92 - nk * 0.3).toFixed(2)}}` +
      `.mi-fg{fill:url(#mi-fo)}.mi-l4{fill:var(--l4);opacity:.55}` +
      `.mi-h{fill:url(#mi-ph);stroke:url(#mi-gh);stroke-width:9;stroke-dasharray:0 7 0 9 0 6 0 10 0 7 0 150 0 8 0 6 0 9 0 7 0 11 0 6 0 90;stroke-linecap:round}` +
      `.mi-f{fill:url(#mi-pf);stroke:url(#mi-gfs);stroke-width:13;stroke-dasharray:0 9 0 12 0 7 0 10 0 13 0 8 0 210 0 10 0 7 0 12 0 9 0 120 0 11 0 8 0 9 0 160;stroke-linecap:round}` +
      `.mi-pn{fill:${mx(mx(v('g4'), 60, v('l4')), 70, v('mif'))}}.mi-pn2{fill:${mx(mx(v('g4'), 60, v('l4')), 50, v('mih'))}}` +
      `.mi-pb{fill:${mx(v('w2'), 64, v('mib'))}}.mi-pr{fill:${mx(v('r3'), 68, v('mib'))}}.mi-ps{fill:var(--k1);opacity:.18}.mi-cv{fill:${mx(v('k2'), 15, mx(v('s3'), 30, v('mib')))}}` +
      `.mi-wt{fill:${mx(v('b1'), 26, v('mib'))}}.mi-w1{fill:${mx(v('g4'), 34, v('mib'))}}.mi-w2{fill:${mx(v('g3'), 32, v('mib'))}}.mi-w3{fill:${mx(v('g2'), 26, v('mib'))}}.mi-ug{fill:url(#mi-ug)}` +
      `.mi-kd,.mi-kl{fill:none;stroke-linecap:round}.mi-kd{stroke:var(--l4);opacity:.3}.mi-kl{stroke:${mx(v('l2'), 55, v('mih'))};opacity:.4}.mi-wtw{fill:${mx(v('s1'), 38, v('mia'))}}` +
      `.mi-vw{fill:${v('mivw')}}.mi-q1,.mi-q2,.mi-q3,.mi-qt{y:${DECK - 12}px;height:250px}.mi-q1{fill:url(#mi-w1)}.mi-q2{fill:url(#mi-w2)}.mi-q3{fill:url(#mi-w3)}.mi-qt{fill:url(#mi-vt);opacity:.5}.mi-ig{fill:url(#mi-igg)}.mi-bl{fill:var(--k1);opacity:.12}.mi-iv{fill:url(#mi-igg)}.mi-no{fill:none}.mi-tx{font:700 5.6px sans-serif;fill:var(--k2);opacity:.55;letter-spacing:.6px}` +
      // nét (fill none chung)
      `.mi-pst,.mi-wr,.mi-wa,.mi-rl,.mi-sl,.mi-hz,.mi-gl,.mi-sp,.mi-sk,.mi-ln,.mi-bk,.mi-rp,.mi-rg,.mi-gd,.mi-rd,.mi-wn,.mi-gw,.mi-bx,.mi-gr,.mi-ro,.mi-ro2,.mi-rmo,.mi-gh,.mi-gs,.mi-wh,.mi-b1,.mi-b2,.mi-vr,.mi-sr1,.mi-sr2,.mi-f1,.mi-f3{fill:none;stroke-linecap:round}` +
      `.mi-rm{stroke:var(--e1);stroke-width:1;stroke-opacity:.42;stroke-linecap:round}.mi-rn{stroke:var(--w3);stroke-width:1;stroke-opacity:.3;stroke-linecap:round}` +
      `.mi-pst{stroke:${mx(v('k1'), 14, v('mib'))};stroke-width:.8;stroke-dasharray:2 2.4}.mi-wr{stroke:${mx(v('b1'), 30, v('mib'))};stroke-width:1;opacity:.7}` +
      `.mi-wa{stroke:${mx(v('s1'), 34, v('mia'))};stroke-width:2.4}` +
      `.mi-wl{fill:var(--w3);opacity:.8;animation:mi-wl 3.6s ease-in-out infinite alternate}@keyframes mi-wl{from{opacity:.5}to{opacity:.9}}` +
      `.mi-rl{stroke:var(--x2);stroke-width:1;opacity:.55}.mi-sl{stroke:var(--k2);stroke-width:1.3;stroke-dasharray:1.5 2.5;stroke-linecap:butt;opacity:.4}` +
      `.mi-vr{stroke:var(--s1);stroke-width:2;stroke-dasharray:2.4 1.2;stroke-linecap:butt;opacity:${(0.22 - nk * 0.1).toFixed(2)}}` +
      `.mi-hz{stroke:var(--w3);stroke-width:1;opacity:.5}.mi-gl{stroke:var(--w3);stroke-width:1;opacity:.6}.mi-sp{stroke:var(--k2);stroke-width:1.4}` +
      `.mi-sk{stroke:var(--s4);stroke-width:1;opacity:.55;stroke-dasharray:6 2 3 3}.mi-ln{stroke:var(--k1);stroke-width:.8}.mi-bk{stroke:var(--a1);stroke-width:2;opacity:.8}` +
      `.mi-gh{stroke:var(--g1);stroke-width:2.2}.mi-gs{stroke:var(--w3);stroke-width:5}` +
      `.mi-rp{stroke:var(--b2);stroke-width:.9}.mi-rg{stroke:var(--b2);stroke-width:5;stroke-dasharray:1 5;stroke-linecap:butt}` +
      `.mi-ro{stroke:var(--b2);stroke-width:1.2}.mi-ro2{stroke:var(--b3);stroke-width:.8}.mi-rmo{stroke:var(--m2);stroke-width:3.2}` +
      `.mi-sr1{stroke:var(--x1);stroke-width:1.1}.mi-sr2{stroke:var(--k2);stroke-width:3;stroke-dasharray:1.2 4.4;stroke-linecap:butt}` +
      `.mi-gd{stroke:var(--e1);stroke-width:.8;opacity:.8}.mi-rd{stroke:var(--x2);stroke-width:.9}.mi-wn,.mi-gw{stroke:var(--k2);stroke-width:3;stroke-dasharray:4 2.6;stroke-linecap:butt}.mi-gw{stroke:var(--e2)}.mi-wh{stroke:var(--k1);stroke-width:4.6}` +
      `.mi-bx{stroke:var(--b2);stroke-width:1.3}.mi-gr{stroke:var(--g3);stroke-width:1}.mi-b1,.mi-b2{stroke:var(--f1);stroke-width:2.6}.mi-b2{stroke:var(--f2)}` +
      // chuyển động (độ trễ theo thời gian tuyệt đối → liền mạch qua các lần vẽ lại)
      `.mi-ta,.mi-tb{animation:mi-ta ${TP}s linear infinite;animation-delay:${delA}}.mi-tb{animation-name:mi-tb;animation-delay:${delB}}` +
      kfCss('mi-ta', KA) +
      kfCss('mi-tb', KB) +
      `.mi-sr,.mi-sg{animation:mi-sr ${TP}s step-end infinite;animation-delay:${delA}}.mi-sg{animation-name:mi-sg}` +
      SIG_CSS +
      `.mi-sm{transform-box:fill-box;transform-origin:50% 50%;animation:mi-sm 4.2s linear infinite}.mi-s2{animation-delay:-1.4s}.mi-s3{animation-delay:-2.8s}` +
      `@keyframes mi-sm{from{transform:translate(0,0) scale(.35);opacity:.85}to{transform:translate(calc(-28px - var(--wind)*40px),-24px) scale(2.6);opacity:0}}` +
      `.mi-i1,.mi-i2,.mi-i3{animation:mi-is 21s ease-in-out infinite alternate}@keyframes mi-is{from{transform:translateY(-6px)}to{transform:translateY(6px)}}` +
      `.mi-i1{${ph(42, 'mi-i1')}}.mi-i2{animation-duration:24s;${ph(48, 'mi-i2')}}.mi-i3{animation-duration:18s;${ph(36, 'mi-i3')}}` +
      `.mi-f1,.mi-f3{stroke:var(--w3);stroke-linecap:butt;animation:mi-fa 1s linear infinite}@keyframes mi-fa{to{transform:translateY(24px)}}` +
      `.mi-f1{stroke-width:3.2;stroke-dasharray:16 8;opacity:.8;animation-duration:.85s}.mi-f3{stroke-width:1.4;stroke-dasharray:6 6 10 2;opacity:.55;animation-duration:1.3s}` +
      `.mi-p1{transform-box:fill-box;transform-origin:50% 50%;animation:mi-pa 8s ease-in-out infinite}` +
      `@keyframes mi-pa{0%{transform:translate(0,0) scale(.7);opacity:0}30%{opacity:.9}100%{transform:translate(calc(var(--wind)*52px + 8px),-12px) scale(1.5);opacity:0}}` +
      `.mi-ms,.mi-cd,.mi-p1,.mi-mb{fill:url(#mi-mg)}.mi-mb{opacity:.8}.mi-ms{transform-box:fill-box;transform-origin:50% 50%;animation:mi-ms 7s ease-in-out infinite alternate}@keyframes mi-ms{from{transform:scale(.9);opacity:.5}to{transform:scale(1.14);opacity:.9}}` +
      `.mi-hg{transform-box:fill-box;transform-origin:50% 0;animation:mi-hg 5.6s ease-in-out infinite alternate}@keyframes mi-hg{from{transform:rotate(calc(-1deg - var(--wind)*3deg))}to{transform:rotate(calc(1.5deg + var(--wind)*4deg))}}` +
      `.mi-cd{opacity:${(0.5 + cloudK * 0.4).toFixed(2)};animation:mi-cd 70s ease-in-out infinite alternate;${ph(140, 'mi-cd')}}@keyframes mi-cd{to{transform:translateX(40px)}}`

    return { pieces: out, spots, defs, css }
  },
}

/** Khu gian quanh cột tín hiệu: đỏ khi đầu tàu cách cột < 500 (cộng chiều dài tàu), xanh khi thông. */
const SIG_CSS = (() => {
  const inA: [number, number] = [when(KA, SIG - 500), when(KA, SIG + 500) + 230 / V]
  const inB: [number, number] = [(when(KB, SIG + 500) + TB0) % TP, (when(KB, SIG - 500) + 90 / V + TB0) % TP]
  const pct = (t: number) => ((t / TP) * 100).toFixed(2)
  let red = '0%{opacity:.15}'
  let grn = '0%{opacity:1}'
  for (const [a, b] of [inA, inB].sort((p, q) => p[0] - q[0])) {
    if (b <= a) continue
    red += `${pct(a)}%{opacity:1}${pct(b)}%{opacity:.15}`
    grn += `${pct(a)}%{opacity:.15}${pct(b)}%{opacity:1}`
  }
  return `@keyframes mi-sr{${red}100%{opacity:.15}}@keyframes mi-sg{${grn}100%{opacity:1}}`
})()

/** Mái nhỏ một gian (đơn vị gốc). */
function roofSmall(P: Paint, cx: number, ye: number, hw: number) {
  P.p('r2', `M${cx - hw - 4} ${ye + 1}q4 1 8-1h${2 * hw - 8}q4 2 8 1l-6-7h${-(2 * hw - 4)}z`)
  P.p('r3', `M${cx - hw} ${ye + 1}h${2 * hw}v1.6h${-2 * hw}z`)
}
