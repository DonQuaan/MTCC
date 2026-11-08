// Hồ sen — mặt hồ lặng soi bóng trời. Tiêu điểm: cầu đá vòm rêu + liễu già nghiêng từ bờ đông + đèn đá đầu cầu (1/3 phải);
// ông lão câu cá trên thuyền nan lùi về 1/3 trái, dây câu thả ra mặt hồ trống.
// KHỐI: (1) trời sáng, trên ~55% · (2) bờ xa + lũy tre xa chìm sương che chân cầu cạn: dải sáng-vừa, mép trên gãy mịn, chân tan
//  vào sương · (3) mặt hồ soi trời: mảng sáng lớn giữa–dưới, KHÔNG vật — chỉ vân gợn tương phản thấp & dải sáng tối mềm của trời ·
//  (4) cụm tiêu điểm 1/3 phải (vừa–tối): cầu vòm + bóng khép thành vòng tròn, liễu buông từng chùm sợi, đèn đá ấm dưới liễu lúc tối
//  · (5) khung tối-vừa (không đen): bờ cỏ trái tối dần về góc + đầm sen ở góc trái-dưới (lớp 3, chừa khoảng hở quanh thuyền),
//  lá sen/lau mép đáy và vài sợi liễu mờ góc trên trái (lớp 4) pha theo ánh sáng môi trường.
//  Mùa đổi mảng: xuân lá non lơ thơ, sương sớm dày · hạ liễu dày, sen nở hồng (tiêu điểm phụ góc trái dưới) · thu nắng thấp phía
//  tây hắt ấm lên mặt cầu, liễu thưa ngả vàng, lá sen úa rách, gương sen · đông liễu trơ cành, cọng khô gãy gập, mặt hồ bạc lạnh.
//  Nắng: trái trước 12h, phải sau 12h. Đêm: cầu chìm tối, vệt trăng vỡ dưới trăng, đèn thuyền + đèn đá in vệt sáng vỡ theo gợn.
//  Mưa: vòng gợn, bóng soi tan. Sương: 2 dải mỏng ở 2 độ sâu (chân cầu cạn, sườn xa) + màn sương bờ xa — tách tầng, giữa yên.
//  Bờ trái: đá rêu xếp lớp mép nước, mũi đất & vũng phá đường chéo. Duyên rìa phải: bến đá rêu 3 bậc dưới đèn đá (đêm: quầng + vệt dài).
import type { Ctx, Piece, Region, Spot } from '../types'
import { fbm, ground, smooth, type Pt } from '../util'

const WL = 812 // mặt hồ (bờ xa)
const R = (v: number) => Math.round(v) || 0

/** Nối số nguyên gọn nhất cho path (dấu âm tự làm dấu ngăn). */
function J(a: readonly number[]): string {
  let o = ''
  for (const v of a) {
    const r = R(v)
    o += o !== '' && r >= 0 ? ` ${r}` : String(r)
  }
  return o
}
const o2 = (v: number) => String(Math.round(v * 100) / 100).replace(/^(-?)0\./, '$1.')

const AR: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, q: 4, c: 6, a: 7, t: 2, s: 4 }
/** Thu gọn path: mỗi đoạn chọn dạng tuyệt đối hay tương đối (cái nào ngắn hơn), bỏ chữ lệnh lặp lại. */
function mn(d: string): string {
  const tk = d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+)/g)
  if (!tk) return d
  let i = 0
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  let cmd = ''
  let last = ''
  let out = ''
  const fmt = (a: number[]) => {
    let o = ''
    for (const v of a) {
      const t = o2(v)
      o += o !== '' && t[0] !== '-' ? ` ${t}` : t
    }
    return o
  }
  while (i < tk.length) {
    const t = tk[i] as string
    if (/[a-zA-Z]/.test(t)) {
      cmd = t
      i += 1
      if (t === 'z' || t === 'Z') {
        out += 'z'
        last = 'z'
        x = sx
        y = sy
      }
      continue
    }
    const lc = cmd.toLowerCase()
    const n = AR[lc] ?? 2
    const a = tk.slice(i, i + n).map(Number)
    i += n
    const rel = cmd === lc
    const abs = a.slice()
    const isX = (k: number) => (lc === 'h' ? true : lc === 'v' ? false : lc === 'a' ? k === 5 : k % 2 === 0)
    const isP = (k: number) => lc !== 'a' || k >= 5
    if (rel) for (let k = 0; k < n; k += 1) if (isP(k)) abs[k] = (abs[k] ?? 0) + (isX(k) ? x : y)
    const rv = abs.map((v, k) => (isP(k) ? v - (isX(k) ? x : y) : v))
    const A = fmt(abs)
    const B = fmt(rv)
    const useRel = B.length <= A.length
    const L = useRel ? lc : lc.toUpperCase()
    const body = useRel ? B : A
    out += L === last && lc !== 'm' ? (body[0] === '-' ? body : ` ${body}`) : L + body
    last = L
    if (lc === 'h') x = abs[0] ?? x
    else if (lc === 'v') y = abs[0] ?? y
    else {
      x = abs[n - 2] ?? x
      y = abs[n - 1] ?? y
    }
    if (lc === 'm') {
      sx = x
      sy = y
      cmd = rel ? 'l' : 'L'
    }
  }
  return out
}

/** Gấp khúc, toạ độ tương đối. */
function rl(pts: Pt[], z = false): string {
  const P = pts.map(p => [R(p[0]), R(p[1])] as Pt)
  const f = P[0]
  if (!f) return ''
  const rel: number[] = []
  for (let i = 1; i < P.length; i += 1) {
    const a = P[i - 1] as Pt
    const b = P[i] as Pt
    rel.push(b[0] - a[0], b[1] - a[1])
  }
  return `M${J(f)}${rel.length ? `l${J(rel)}` : ''}${z ? 'z' : ''}`
}

/** Cong mượt qua điểm (Q qua trung điểm), toạ độ tương đối. */
function rq(pts: Pt[], z = false): string {
  const P = pts.map(p => [R(p[0]), R(p[1])] as Pt)
  const f = P[0]
  if (!f) return ''
  if (P.length < 3) return rl(pts, z)
  let c = f
  const q: number[] = []
  for (let i = 1; i < P.length - 1; i += 1) {
    const p = P[i] as Pt
    const n = P[i + 1] as Pt
    const m: Pt = [R((p[0] + n[0]) / 2), R((p[1] + n[1]) / 2)]
    q.push(p[0] - c[0], p[1] - c[1], m[0] - c[0], m[1] - c[1])
    c = m
  }
  const L = P[P.length - 1] as Pt
  return `M${J(f)}q${J(q)}l${J([L[0] - c[0], L[1] - c[1]])}${z ? 'z' : ''}`
}

/** Điểm trên đường cong bậc hai. */
const qpts = (a: Pt, b: Pt, c: Pt, n: number): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const u = 1 - t
    return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]] as Pt
  })

const P = (c: string, d: string, a = '') => (d ? `<path class="${c}" d="${mn(d)}"${a}/>` : '')
const op = (v: number) => (v >= 0.995 ? '' : ` opacity="${o2(v)}"`)
const U = (id: string, x: number, y: number, a = '') => `<use href="#${id}" x="${R(x)}" y="${R(y)}"${a}/>`
/** Đặt symbol có tỉ lệ (f<0 lật ngang, v = hệ số co dọc; v<0 lật dọc = bóng soi). */
const UM = (id: string, x: number, y: number, s: number, f = 1, a = '', v = 1) => `<use href="#${id}" transform="matrix(${o2(s * f)} 0 0 ${o2(s * v)} ${R(x)} ${R(y)})"${a}/>`
/** Bóng soi: lật ngược quanh mặt nước y. CHỈ cho phần tử có cây con TĨNH. */
const MIR = (id: string, y: number, o: number) => `<use href="#${id}" transform="matrix(1 0 0 -1 0 ${R(2 * y)})"${op(o)}/>`
/** Bóng soi của vật có phần động: gộp phép đặt matrix(s 0 0 s e f) với phép lật quanh mặt nước y (phần động bọc <g class> bên trong). */
const MIRT = (y: number, s: number, e: number, f: number) => `matrix(${o2(s)} 0 0 ${o2(-s)} ${R(e)} ${R(2 * y - f)})`
/** Nét (stroke): màu theo class, bề dày theo lớp hs-w0..5. */
const SW: [number, string][] = [[1, 'hs-w0'], [1.4, 'hs-w1'], [1.9, 'hs-w2'], [2.6, 'hs-w3'], [3.6, 'hs-w4'], [99, 'hs-w5']]
const S = (c: string, w: number, d: string, a = '') => (d ? `<path class="${c} ${(SW.find(s => w < s[0]) ?? [0, 'hs-w5'])[1]}" d="${mn(d)}"${a}/>` : '')
/** Đặt symbol: dời + xoay + co. */
const T = (id: string, x: number, y: number, rot: number, s: number) => `<use href="#${id}" transform="translate(${R(x)} ${R(y)})rotate(${R(rot)})scale(${o2(s)})"/>`

type It = { x0: number; x1: number; prio: number; svg: string; glow?: string; z?: number }
/** Bộ màu lá sen theo mùa: [thân, sáng, tối, gân]. */
type LC = readonly [string, string, string, string]

/** Lá sen nổi: đĩa tròn nằm trên nước nhìn xiên, KHÔNG khía; mép gợn (rách khi tàn), vành xa bắt sáng, mép gần đổ bóng, rốn + gân toả. */
function flatDef(id: string, r: () => number, c: LC, tears: number, rough: number): string {
  const ph = r() * 6.28
  const tr = Array.from({ length: tears }, () => r() * 6.28)
  const pts: Pt[] = []
  for (let i = 0; i < 14; i += 1) {
    const a = (i / 14) * 6.283
    let k = 1 + 0.06 * Math.sin(a * 3 + ph) + 0.04 * Math.sin(a * 5 + ph * 2) + (r() - 0.5) * rough
    for (const t of tr) {
      const d = Math.abs((((a - t) % 6.283) + 9.425) % 6.283 - 3.14)
      if (d < 0.32) k *= 0.55 + d * 1.4
    }
    pts.push([Math.cos(a) * 30 * k, Math.sin(a) * 8.5 * k])
  }
  const body = rq([...pts, pts[0] as Pt, pts[1] as Pt], true)
  const fp = pts.slice(8, 14)
  const rim = rq([...fp, ...fp.slice().reverse().map(([x, y]) => [x * 0.84, y * 0.5 + 0.5] as Pt)], true)
  let vn = ''
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * 6.28 + r() * 0.9
    vn += `M1 0l${J([Math.cos(a) * 21, Math.sin(a) * 6])}`
  }
  return `<g id="${id}"><path class="sh" transform="translate(0 1.6)" d="${mn(body)}"/>${P(c[0], body)}${P(c[1], rim, op(0.85))}${S('hs-vn', 0.7, vn)}${P(c[3], 'M0 0a2 1 0 1 0 1 0z', op(0.7))}</g>`
}

/** Lá sen vươn (chiếc ô nông nhìn xiên): mặt trên sáng ở vành xa, lòng tối quanh rốn, gân toả; dưới vành gần lộ mặt dưới (sâu `dp`)
 *  có gân nhạt. `dr` làm một bên gục, `tears` vết rách. Gốc (0,0) = tâm vành; cuống gắn ở (0, ry·.6 + dp). */
function cupDef(id: string, r: () => number, c: LC, ry: number, dp: number, dr: number, tears: number): string {
  const ph = r() * 6.28
  const tr = Array.from({ length: tears }, () => 0.4 + r() * 2.4)
  const N = 16
  const pts: Pt[] = []
  for (let i = 0; i < N; i += 1) {
    const a = (i / N) * 6.283
    let k = 1 + 0.05 * Math.sin(a * 4 + ph) + 0.04 * Math.sin(a * 7 + ph * 1.6)
    for (const t of tr) {
      const d = Math.abs(a - t)
      if (d < 0.28) k *= 0.6 + d * 1.4
    }
    const x = Math.cos(a) * 31 * k
    pts.push([x, Math.sin(a) * ry * k + (x > 0 ? dr * (x / 31) ** 2 * 12 : 0)])
  }
  const top = rq([...pts, pts[0] as Pt, pts[1] as Pt], true)
  const near = pts.slice(0, N / 2 + 1)
  const under = rq([...near, ...near.slice().reverse().map(([x, y]) => [x * 0.95, y + dp * (1 - (x / 31) ** 2) + 1] as Pt)], true)
  const far = pts.slice(N / 2 + 2, N - 1)
  const hl = rq([...far, ...far.slice().reverse().map(([x, y]) => [x * 0.8, y * 0.35] as Pt)], true)
  const cy = ry * 0.25
  let vn = ''
  for (let i = 0; i < 7; i += 1) {
    const p = pts[(i * 2 + 9) % N] as Pt
    vn += `M0 ${R(cy)}l${J([p[0] * 0.84, p[1] * 0.84 - cy])}`
  }
  let vu = ''
  if (dp > 5) for (let i = 1; i < 8; i += 2) vu += `M0 ${R(ry * 0.6 + dp)}L${J(near[i] as Pt)}`
  return (
    `<g id="${id}">${P(c[2], under)}${S('z3', 0.7, vu, op(0.3))}${P(c[0], top)}${P(c[2], `M-15 ${R(cy)}a15 ${R(ry * 0.42) || 1} 0 1 0 1 0z`, op(0.28))}` +
    `${P(c[1], hl, op(0.9))}${S('hs-vn', 0.7, vn)}${P(c[3], `M-2 ${R(cy)}a2 1 0 1 0 1 0z`)}${tears ? S('hs-d2', 1, rl(pts.slice(1, 6)), op(0.5)) : ''}</g>`
  )
}

/** Dải thon: sợi liễu rủ (L>0) hay lá lau vươn (L<0) — gốc rộng w tại (x,y), hai mép cong theo b, ngọn nhọn lệch ln. */
const rib = (x: number, y: number, w: number, L: number, ln: number, b: number) =>
  `M${J([x - w / 2, y])}Q${J([x - w / 2 + b, y + L * 0.5, x + ln, y + L])}Q${J([x + w / 2 + b * 0.6, y + L * 0.45, x + w / 2, y])}z`
/** Điểm trên cung bậc hai [đầu, điều khiển, cuối]. */
const qp = (b: readonly [Pt, Pt, Pt], t: number): Pt => {
  const u = 1 - t
  return [u * u * b[0][0] + 2 * u * t * b[1][0] + t * t * b[2][0], u * u * b[0][1] + 2 * u * t * b[1][1] + t * t * b[2][1]]
}
function build(ctx: Ctx) {
  const SE = ctx.season
  const lite = ctx.detail === 'lite'
  /** Lớp chi tiết phụ (vân): bỏ ở bản lite. */
  const D = (v: string) => (lite ? '' : v)
  const pr = ctx.cur.precip
  const heavy = pr === 'mua-to'
  const rain = pr === 'mua' || heavy
  const wetAny = rain || pr === 'phun'
  const shower = rain && ctx.cur.isShower && !heavy
  const snow = pr === 'tuyet'
  const wind = ctx.cur.wind
  const dl = ctx.daylight
  const night = dl < 0.6
  const day = dl > 0.45
  const hF = ctx.vn.hourF
  const sleep = hF >= 23 || hF < 4.6
  const am = hF < 12 // nắng từ trái (đông) buổi sáng, từ phải (tây) buổi chiều
  const reflO = (heavy ? 0.3 : rain ? 0.42 : pr === 'phun' ? 0.7 : 1) * (1 - wind * 0.25)
  const ha = SE === 'ha'
  const thu = SE === 'thu'
  const dong = SE === 'dong'
  const xuan = SE === 'xuan'
  const nz = ctx.noise('hs-tuyet')
  /** Nắp (tuyết, rêu) men theo đường trên, mép dưới gợn theo nhiễu. */
  const cap = (pts: Pt[], th: number) =>
    rq([...pts.map(([x, y]) => [x, y - 1.5] as Pt), ...pts.slice().reverse().map(([x, y]) => [x, y + th * Math.max(0.3, 0.6 + fbm(nz, x / 6, y / 6, 2) * 1.6)] as Pt)], true)

  const under: It[] = []
  const refl: It[] = []
  const streak: It[] = []
  const objs: It[] = []
  const fx: It[] = []
  const fg: Piece[] = []

  // ───────────── defs ─────────────
  let defs =
    `<linearGradient id="hs-wg" gradientUnits="userSpaceOnUse" x1="0" y1="812" x2="0" y2="1130"><stop offset="0" style="stop-color:var(--a1)"/><stop offset=".42" style="stop-color:var(--a2)"/><stop offset="1" style="stop-color:var(--a3)"/></linearGradient>` +
    `<linearGradient id="hs-hz" gradientUnits="userSpaceOnUse" x1="0" y1="722" x2="0" y2="814"><stop offset="0" style="stop-color:var(--haze)" stop-opacity="0"/><stop offset="1" style="stop-color:var(--haze)" stop-opacity=".8"/></linearGradient>`
  const LC: LC = xuan ? ['l2', 'l1', 'l3', 'l4'] : ha ? ['l3', 'l2', 'l4', 'l4'] : thu ? ['l4', 'l3', 'd2', 'k2'] : ['b1', 'b2', 'k1', 'k2']
  const lr = ctx.rng('hs-la')
  defs += flatDef('hs-F0', lr, LC, thu ? 1 : 0, thu || dong ? 0.22 : 0.06) + flatDef('hs-F1', lr, LC, thu || dong ? 2 : 0, thu || dong ? 0.3 : 0.1)
  if (!dong) defs += cupDef('hs-C0', lr, LC, 8.5, 3, thu ? 0.6 : 0.2, thu ? 2 : 1) + cupDef('hs-C1', lr, LC, 4.5, 11, thu ? 1.3 : 0.35, thu ? 1 : 0)
  if (ha)
    defs +=
      `<g id="hs-fl"><path class="f1" d="M0 0C-9-5-15-17-11-26C-5-19-2-9 0 0ZM0 0C9-5 15-17 11-26C5-19 2-9 0 0Z"/><path class="sh" d="M0 0C9-5 15-17 11-26C5-19 2-9 0 0Z"/><path class="w1" d="M-5-9h10l-2 4h-6z"/><path class="f1" d="M0 0C-6-8-6-21 0-30C6-21 6-8 0 0ZM0 2C-12 0-19-9-18-17C-9-13-3-6 0 2ZM0 2C12 0 19-9 18-17C9-13 3-6 0 2Z"/><path class="hl" d="M0 0C-6-8-6-21 0-30C-2-20-2-9 0 0ZM0 2C-12 0-19-9-18-17C-12-12-5-5 0 2Z"/><path class="p1" opacity=".35" d="M0-30l-2 5h4zM-18-17l3 4 2-3zM18-17l-3 4-2-3z"/></g>` +
      `<g id="hs-bd"><path class="f1" d="M0 0C-7-4-8-14 0-23C8-14 7-4 0 0Z"/><path class="hl" d="M0 0C-7-4-8-14 0-23C-3-14-3-5 0 0Z"/><path class="p1" opacity=".4" d="M0-23l-3 6h6z"/><path class="l3" d="M0 1C-6 0-7-4-5-7L0-3 5-7C7-4 6 0 0 1Z"/></g>`
  if (xuan) defs += `<g id="hs-yl"><path class="l2" d="M0 0Q-6-9-2-22Q5-14 4-2Z"/><path class="l1" d="M-1-3Q-5-11-2-21Q0-12 1-3Z"/></g>`
  if (!xuan) {
    const pc = ha ? ['l3', 'l2', 'k2'] : thu ? ['b2', 'b3', 'k1'] : ['b1', 'b2', 'k1']
    defs += `<g id="hs-pd"><path class="${pc[0]}" d="M-8-9H8L3 1H-3Z"/><path class="${pc[1]}" d="M-8-9C-4-12 4-12 8-9C4-7-4-7-8-9Z"/><path class="${pc[2]}" opacity=".75" d="M-4-10h2v2h-2zM0-11h2v2h-2zM3-10h2v2h-2zM-1-8h2v1h-2z"/></g>`
  }
  const plume = thu ? 'w3' : dong ? 'b3' : ha ? 'l1' : ''
  defs +=
    `<g id="hs-rd"><path class="hs-q4 hs-w3" d="M0 0q-3-20-13-36M2 0q2-24 9-46M-2 0q-8-14-21-22"/><path class="hs-q3 hs-w2" d="M3 0q10-12 23-18M0 0q0-28-3-56M1 0q6-18 3-38"/>${plume ? `<path class="${plume}" d="M-3-56q-6-10-2-22q5 9 2 22zM11-46q-2-12 4-20q2 10-4 20z"/>` : ''}</g>` +
    `<g id="hs-k0"><path class="ao" d="M-13 1h26l-3 3h-20z"/><path class="s3" d="M-12 1q-1-6 5-8q6-3 11 0q5 3 7 8z"/><path class="s2" d="M-10-2q1-5 6-6q5-2 9 1q-6 0-9 2z"/><path class="m2" d="M-6-7q5-3 10-1l-3 2q-3-1-7-1z"/></g>`

  // ───────────── 1. Mặt nước: bờ đông là đường cong nhiễu có mũi đất (gốc liễu) và một vũng nhỏ ─────────────
  const ne = ctx.noise('hs-dong')
  const east: Pt[] = []
  for (let y = 812; y <= 1180; y += 23)
    east.push([8788 + (y - 812) * 0.34 - 42 * Math.exp(-(((y - 832) / 16) ** 2)) + 18 * Math.exp(-(((y - 940) / 20) ** 2)) + 10 * fbm(ne, y / 40, 2.2, 2), y])
  defs +=
    `<path id="hs-wp" d="${mn(rq([[7400, 812], [8700, 812], ...east, [7236, 1180], [7300, 990]], true))}"/>` +
    // màn nước: bóng soi tan dần theo độ sâu (xa mép nước → màu nước nuốt bóng)
    `<linearGradient id="hs-rv" gradientUnits="userSpaceOnUse" x1="0" y1="814" x2="0" y2="1100"><stop offset="0" style="stop-color:var(--a1)" stop-opacity="0"/><stop offset=".33" style="stop-color:var(--a2)" stop-opacity=".45"/><stop offset=".62" style="stop-color:var(--a2)" stop-opacity=".72"/><stop offset="1" style="stop-color:var(--a3)" stop-opacity=".9"/></linearGradient>`
  under.push({ x0: 7230, x1: 8930, prio: 9, svg: `<use href="#hs-wp" fill="url(#hs-wg)"/>` })

  // ───────────── 2. Bờ xa: rặng cây mép trên gãy mịn, chân tan vào sương; cụm cây cao sau cầu & liễu; lạch nước dưới vòm ─────────────
  {
    const nb = ctx.noise('hs-bo')
    const yB = (x: number) => 810 - 5 * (fbm(nb, x / 70, 1.3, 2) + 0.5)
    const hump = (x: number) =>
      44 * Math.exp(-(((x - 8262) / 58) ** 2)) + 72 * Math.exp(-(((x - 8640) / 110) ** 2)) + 40 * Math.exp(-(((x - 7452) / 56) ** 2)) + 16 * Math.exp(-(((x - 7900) / 90) ** 2)) - 18 * Math.exp(-(((x - 8420) / 38) ** 2))
    const yT = (x: number) => yB(x) - 4 - 12 * Math.max(0, fbm(nb, x / 40, 4.2, 3) + 0.25) - Math.max(0, hump(x)) - 2.6 * fbm(nb, x / 6, 8.8, 2)
    const xs: number[] = []
    for (let x = 7400; x < 8800; x += x > 7640 && x < 8170 ? (lite ? 44 : 30) : lite ? 20 : 13) xs.push(x)
    xs.push(8800)
    // hai đầu rặng cây vuốt thoải xuống mặt nước (không còn mép đứng)
    const can = `${rl(xs.map(x => [x, 812 - (812 - yT(x)) * Math.min(1, (x - 7392) / 70)] as Pt))}V813H7400z`
    const sp: Pt[] = []
    for (let x = 7400; x <= 8800; x += 50) sp.push([x, yB(x)])
    const hzO = Math.min(1, 0.72 + ctx.cur.fog * 0.3 + (xuan && hF < 10 ? 0.18 : 0) + (dong ? 0.12 : 0))
    // lũy tre làng bên kia hồ: các bụi ngọn cong nghiêng, có khe hở, chìm sâu trong sương — che chân cầu cạn cho nó lùi hẳn ra sau
    const tr = ctx.rng('hs-tre')
    const cl: Pt[] = []
    for (let c = 7404; c < 7990; c += 46 + 40 * tr()) cl.push([c, tr() < 0.18 ? 0 : 36 + 52 * tr()])
    const tre = (x: number) =>
      cl.reduce((h, [c, H]) => {
        const u = (x - c) / (30 + H * 0.5)
        return Math.abs(u) < 1 ? Math.max(h, H * (1 - u * u) ** 0.6 * (1 + 0.3 * u)) : h
      }, 0) * Math.max(0, Math.min(1, (x - 7382) / 60))
    const tb: Pt[] = []
    for (let x = 7380; x <= 8000; x += lite ? 16 : 8) tb.push([x, 812 - tre(x) - (tre(x) > 6 ? 3 * fbm(nb, x / 7, 6.1, 2) + 1.5 : 0)])
    defs += `<path id="hs-cn" d="${mn(can)}"/><path id="hs-tb" d="${mn(`${rl(tb)}V813H7380z`)}"/>` +
      `<linearGradient id="hs-hb" gradientUnits="userSpaceOnUse" x1="0" y1="722" x2="0" y2="812"><stop offset="0" style="stop-color:var(--haze)" stop-opacity="${o2(Math.min(0.9, 0.5 + ctx.cur.fog * 0.3))}"/><stop offset="1" style="stop-color:var(--haze)" stop-opacity=".94"/></linearGradient>`
    // sương chỉ phủ trong bóng rặng cây (dùng lại chính path) → không có mép chữ nhật
    const fb = `<g id="hs-fb"><use href="#hs-tb" class="l4"/><use href="#hs-tb" fill="url(#hs-hb)"/><use href="#hs-cn" class="l4"/>${P('g3', `${rq(sp)}V813H7400z`)}${P('a1', 'M8372 813q48-10 96 0z')}<use href="#hs-cn" fill="url(#hs-hz)"${op(hzO)}/></g>`
    defs += fb
    objs.push({ x0: 7378, x1: 8810, prio: 7, z: 811, svg: `<use href="#hs-fb"/>` })
    refl.push({ x0: 7378, x1: 8810, prio: 7, svg: MIR("hs-fb", WL, 0.72 * reflO) })
    // ba dải sương mỏng ở ba độ sâu (xa nhạt-lạnh, gần mỏng): nuốt chân cầu cạn, tách tầng bờ xa với mặt nước; mép gợn nhiễu, hai đầu vuốt nhọn
    defs += `<linearGradient id="hs-fz" x2="0" y2="1"><stop offset="0" style="stop-color:var(--haze)" stop-opacity="0"/><stop offset=".55" style="stop-color:var(--haze)" stop-opacity=".8"/><stop offset="1" style="stop-color:var(--haze)" stop-opacity="0"/></linearGradient>`
    const band = (a: number, b: number, yc: number, th: number, k: number) => {
      const up: Pt[] = []
      const dn: Pt[] = []
      for (let x = a; x <= b; x += lite ? 130 : 105) {
        const t = (x - a) / (b - a)
        const e = Math.sin(Math.PI * t) ** 0.7
        up.push([x, yc - th * e * (0.6 + 0.5 * (fbm(nb, x / 160, k, 2) + 0.5))])
        dn.push([x, yc + th * 0.7 * e * (0.7 + 0.4 * (fbm(nb, x / 120, k + 3, 2) + 0.5))])
      }
      return rq([...up, ...dn.reverse()], true)
    }
    const fO = Math.min(1, 0.72 + ctx.cur.fog * 0.4) * (0.45 + 0.55 * dl)
    objs.push({
      x0: 7200, x1: 8930, prio: 7, z: 811.5,
      svg: ([[7190, 8250, 752, 50, 1, 1], [7560, 8930, 726, 13, 5, 0.55]] as const).map(([a, b, y, t, k, o]) => `<path fill="url(#hs-fz)" d="${mn(band(a, b, y, t, k))}"${op(o * fO)}/>`).join(''),
    })
    if (ctx.cur.fog > 0.35) {
      defs += `<radialGradient id="hs-ms"><stop offset="0" style="stop-color:var(--haze)" stop-opacity=".8"/><stop offset="1" style="stop-color:var(--haze)" stop-opacity="0"/></radialGradient>`
      fx.push({ x0: 7400, x1: 8700, prio: 3, svg: `<ellipse fill="url(#hs-ms)" cx="7760" cy="816" rx="330" ry="44"${op(ctx.cur.fog * 0.6)}/><ellipse fill="url(#hs-ms)" cx="8380" cy="824" rx="300" ry="38"${op(ctx.cur.fog * 0.5)}/>` })
    }
  }

  // ───────────── 3. TIÊU ĐIỂM: cầu đá vòm rêu (tâm 8420) — mặt nắng / mặt khuất theo giờ, lòng vòm tối, vành cuốn, lan can, rêu đọng ─────────────
  {
    const BX = 8420
    defs += `<path id="hs-bb" d="M-160 2V-8Q0-182 160-8V2H62A62 62 0 0 0-62 2Z"/>`
    const rt = (x: number) => {
      const t = (x + 160) / 320
      return -16 - 348 * t * (1 - t)
    }
    const top = (a: number, b: number, st: number) => {
      const o: Pt[] = []
      for (let x = a; x <= b; x += st) o.push([x, rt(x) + 1])
      return o
    }
    // ánh vàng giờ nắng xiên (chỉ khi có nắng trực tiếp) hắt lên nửa cầu phía mặt trời; đêm: cả cầu chìm tối cùng trời
    const sunny = !wetAny && ctx.cur.cloud !== 'nhieu' && ctx.cur.cloud !== 'u-am'
    const gold = sunny ? smooth(0.3, 0.5, dl) * (1 - smooth(0.62, 0.92, dl)) : 0
    const dim = 1 - smooth(0.12, 0.62, dl)
    const half = am ? 'M0-95Q-80-95-160-8V2H-62A62 62 0 0 1 0-62Z' : 'M0-95Q80-95 160-8V2H62A62 62 0 0 0 0-62Z'
    // rêu loang: mảng bất quy tắc dựng từ nhiễu, đọng ở chân cầu (ẩm), góc cuốn và kẽ đá
    const nm = ctx.noise('hs-reu')
    const moss = (cx: number, cy: number, rx: number, ry: number) =>
      rq(Array.from({ length: 8 }, (_, i) => {
        const t = (i / 8) * 6.283
        const k = 0.75 + fbm(nm, cx / 9 + Math.cos(t), cy / 9 + Math.sin(t), 2) * 1.1
        return [cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k] as Pt
      }), true)
    const br =
      `<g id="hs-br" transform="translate(${BX} 812)"><use href="#hs-bb" class="s2"/>` +
      (gold > 0.02 ? P('e1', half, op(0.3 * gold)) : '') +
      // chân đá sẫm ẩm (mép trên gợn), vệt nước loang dưới lan can, mạch đá thưa
      P('s3', 'M-160 2V-21q14-5 28-1t28 0 26 4 18 2l-8 16zM62 2l2-14q12 3 24-2t28-3 26-3 18 1V2z', op(0.55)) +
      D(S('hs-k2', 1.4, 'M-124-38q1 10 0 20M-100-56q-1 14 1 28M-56-82q1 8 0 14M54-82q1 9-1 16M98-58q2 14 0 28M128-36q-1 10 0 18', op(0.14))) +
      D(S('z2', 0.8, 'M-150-30h20M-122-41h18M-140-52h16M-108-62h14M-150-6h14M-84-70h12M100-30h20M124-42h18M106-54h16M120-64h12M136-6h14M76-72h10', op(0.2))) +
      // nắng một phía: viền sáng mép lan can + cuốn đá phía nguồn sáng; phía kia gờ lan can đổ bóng mảnh
      S(gold > 0.3 ? 'hs-wm' : 'z3', 1.4, am ? 'M-160-18Q-80-104 0-104M-67 0A67 67 0 0 1-30-58' : 'M0-104Q80-104 160-18M67 0A67 67 0 0 0 30-58', op(0.8 * (1 - 0.8 * dim))) +
      S('z2', 1, am ? 'M10-94Q80-94 158-8' : 'M-10-94Q-80-94-158-8', op(0.35)) +
      // lòng vòm: mặt trong khuất + bóng tối đọng dưới gầm (dày ở đỉnh vòm)
      P('s4', 'M62 2A62 62 0 0 0 0-62A54 60 0 0 1 52 2Z', op(0.75)) +
      P('k1', 'M-62 2A62 62 0 0 1 62 2h-5A57 50 0 0 0-57 2z', op(0.34)) +
      D(`<path class="hs-vs" d="M-67 2A67 67 0 0 1 67 2"/>`) +
      P('s1', 'M-6-71h12l-1 10h-10z') +
      `<path class="hs-pt" d="M-160-12Q0-186 160-12"${dim > 0.02 ? op(1 - 0.55 * dim) : ''}/>` +
      D(`<path class="hs-po" d="M-160-12Q0-186 160-12"/>`) +
      // mép lan can mòn: viền sáng đứt quãng, vài vết sứt
      `<path class="z3 hs-ww" d="M-158-16Q0-190 158-16"${op(Math.max(0.4, 0.75 * (1 - 0.8 * dim)))}/>` +
      D(P('s4', 'M-118-50l5 2 3-4zM-52-89l6 1 2-4zM34-92l5-1-3-3zM102-62l4 3 2-5z', op(0.5))) +
      // rêu: mặt lan can phía khuất, mảng loang chân cầu & góc cuốn, nhỏ giọt theo vệt nước, viền tảo sát mặt nước
      D(P('m2', cap(top(-36, 158, 14), 4))) +
      P('m2', moss(-128, -12, 22, 7) + moss(118, -14, 26, 8) + D(moss(-66, -10, 9, 9) + moss(70, -36, 7, 11)) + moss(-20, -80, 10, 4), op(0.7)) +
      D(P('m3', moss(-124, -6, 12, 4) + moss(124, -8, 14, 4) + moss(66, -18, 5, 7), op(0.6))) +
      P('m3', 'M-160-5q50-4 98 0v7h-98zM62-5q50-4 98 0v7h-98z', op(0.6)) +
      D(S('hs-m3', 1.4, 'M96-58q2 9 0 18M118-44q-1 7 1 13M138-30q1 6 0 10M-132-30q1 6 0 11M-4-62q1 5 0 8M-90-56q-1 7 0 12')) +
      D(P('m2', 'M-6-71q6-4 12 0l-2 4q-4-2-8 0z')) +
      D(S('hs-g2', 1.2, 'M-160-8l-3-9M-154-8l1-10M-147-8l4-8M156-8l3-9M149-8l-2-10')) +
      (wetAny ? P('wetsheen', 'M-150-18Q0-188 150-18l0-4Q0-192-150-22z') : '') +
      (snow ? P('w3', `${cap(top(-160, 160, 16).map(([x, y]) => [x, y - 2] as Pt), 6)}M-160 2h26v-5h-26zM134 2h26v-5h-26zM-66 0q4-5 10-4l-2 4zM56-4q6-1 10 4h-8z`) : '') +
      (dim > 0.02 ? `<use href="#hs-bb" class="k1"${op(0.52 * dim)}/>` : '') +
      `</g>`
    defs += br
    objs.push({ x0: BX - 162, x1: BX + 162, prio: 9, z: 812, svg: `<use href="#hs-br"/>` })
    refl.push({ x0: BX - 162, x1: BX + 162, prio: 8, svg: `${MIR('hs-br', WL, 0.62 * reflO)}<use href="#hs-bb" class="sh" transform="matrix(1 0 0 -1 ${BX} 812)"/>` })
    // đèn đá đầu cầu dưới gốc liễu: ai đó vẫn thắp mỗi tối — nguồn sáng ấm ở rìa phải, ngoài cột giữa
    const LX = 8604
    const lit = night
    defs +=
      `<g id="hs-dd"><path class="s3" d="M-10 0h20l-2-5h-16z"/><path class="s2" d="M-4-5h8l-1-13h-6z"/><path class="s3" d="M-9-18h18v-3h-18z"/>` +
      `<path class="s2" d="M-7-21h14v-11h-14z"/><path class="${lit ? 'e2' : 'k2'}" d="M-3-23h6v-7h-6z"/><path class="s3" d="M-14-31q7-1 14-8q7 7 14 8z"/>` +
      `<path class="s2" d="M-2-39h4l-2-5z"/>${P(am ? 'hl' : 'sh', am ? 'M-7-21h4v-11h-4zM-4-5h3v-13h-3z' : 'M3-21h4v-11h-4zM1-5h3v-13h-3z')}` +
      `${P('m2', 'M-14-31q7-1 14-8q7 7 14 8l-3 1q-6-2-11-7q-5 5-11 7zM-10 0h7l-1-4h-4z', op(0.85))}${D(P('m1', 'M-6-36l3-2 2 1-3 2z'))}` +
      (snow ? P('w3', 'M-14-32q7-1 14-8q7 7 14 8l-2 2q-6-2-12-7q-6 5-12 7zM-9-21h18v-2h-18z') : '') +
      (dim > 0.02 ? `<path class="k1" d="M-10 0h20l-2-5h-12v-13h-3v-3h-3v-11h-3l-1 1q-4 0-10 2z"${op(0.4 * dim)}/>` : '') +
      `</g>`
    const lg = lit
      ? `<circle fill="url(#gw)" cx="${LX}" cy="785" r="34"/><circle fill="url(#gw)" cx="${LX}" cy="790" r="78" opacity=".3"/><ellipse fill="url(#gw)" cx="${LX}" cy="880" rx="26" ry="84" opacity=".55"/>${P('e1', `M${LX - 3}-785h6v-7h-6z`.replace('-785', ' 785'))}` +
        // vệt sáng vỡ dưới đèn: các nét ngang ngắn dần, lệch theo gợn (thay cho bóng chữ "I")
        S('hs-gl', 1.6, `M${LX - 6} 830h12M${LX - 1} 837h7M${LX - 10} 846h11M${LX + 1} 853h9M${LX - 7} 864h6M${LX - 13} 876h15M${LX + 3} 889h8M${LX - 6} 905h20M${LX - 16} 924h12M${LX + 2} 948h14`, op(0.7))
      : undefined
    objs.push({ x0: LX - 16, x1: LX + 16, prio: 7, z: 813, svg: U('hs-dd', LX, 813), glow: lg })
    // bến đá rêu dưới chân đèn: ba bậc phiến đá lệch nhau bước xuống nước — nơi ông lão neo thuyền mỗi tối
    objs.push({
      x0: LX - 34, x1: LX + 30, prio: 7, z: 813.2,
      svg: P('s3', `M${LX - 22} 814l2-3h40l3 4v4h-45zM${LX - 31} 823l3-3h34l2 3v4h-39zM${LX - 20} 832l2-2h26l2 2v3h-30z`) +
        P('s2', `M${LX - 20} 811h40l1 2h-43zM${LX - 28} 820h34l1 2h-37zM${LX - 18} 830h26l1 1h-28z`, op(night ? 0.5 : 0.9)) +
        P('m2', `M${LX - 22} 815q8-3 13 1q6 3 10-1v3h-23zM${LX - 31} 825q7-2 12 1l2 2h-14zM${LX + 2} 824q4-2 7 0v3h-7z`, op(0.85)) +
        P('ao', `M${LX - 33} 827h42v1h-42zM${LX - 22} 835h31v1h-31z`, op(0.5)) +
        (snow ? P('w3', `M${LX - 20} 811h40l1 2h-43zM${LX - 28} 820h34l1 2h-37z`) : ''),
    })
    refl.push({ x0: LX - 16, x1: LX + 16, prio: 5, svg: MIR('hs-dd', 812, 0.5 * reflO).replace('<use href="#hs-dd"', `<use href="#hs-dd" x="${LX}"`).replace(`matrix(1 0 0 -1 0 1624)`, `matrix(1 0 0 -1 0 1626)`) })
  }

  // ───────────── 4. Liễu già bờ đông (gốc 8772,830): thân nghiêng rêu, cành vòm; sợi rủ dài ngắn khác nhau, 3 lớp sắc độ, gió lắc ─────────────
  {
    const WX = 8772
    const WY = 830
    const wr = ctx.rng('hs-lieu')
    const LB: [Pt, Pt, Pt][] = [
      [[-38, -170], [-100, -238], [-208, -206]],
      [[-42, -186], [-96, -272], [-178, -262]],
      [[-30, -150], [-6, -242], [54, -250]],
      [[-26, -120], [-82, -162], [-152, -146]],
    ]
    const ld = (b: [Pt, Pt, Pt]) => `M${J(b[0])}Q${J([...b[1], ...b[2]])}`
    const dens = (lite ? 0.55 : 1) * (xuan ? 0.7 : thu ? 0.62 : 1)
    const lenK = xuan ? 0.58 : thu ? 0.8 : 1
    const wK = thu ? 0.7 : xuan ? 0.8 : 1
    const kS = xuan ? 0.8 : thu ? 0.74 : 1
    const yc = xuan ? ['l3', 'l2', 'l1'] : ha ? ['l4', 'l3', 'l2'] : thu ? ['l3', 'l2', 'l1'] : ['b1', 'b2', 'b3']
    // tán MỘT khối lệch: phía gốc cao, phía ngọn cành (trái) buông thấp; mép trên búi lá gợn nhiễu, mép dưới là các thùy rủ sâu nông
    const nw = ctx.noise('hs-vom')
    const UP: Pt[] = [[34, -204], [26, -232], [4, -252], [-26, -266], [-62, -274], [-100, -272], [-136, -264], [-168, -248], [-194, -226], [-214, -198], [-226, -166], [-232, -134]]
    const dome = (sc: number, ox: number, oy: number, k: number) => {
      const c: Pt = [-96, -200]
      // mép búi lá: chêm 2 điểm giữa mỗi đoạn, nhô/lõm theo nhiễu (rìa lá gãy mịn thay vì cung trơn)
      const tp: Pt[] = []
      UP.forEach(([x, y], i) => {
        const n = UP[i + 1]
        for (let j = 0; j < (n ? 3 : 1); j += 1) {
          const f = j / 3
          const px = n ? x + (n[0] - x) * f : x
          const py = n ? y + (n[1] - y) * f : y
          const d = 1 + 0.06 * fbm(nw, i * 0.7 + f + k, k, 2) + (j === 1 ? 0.045 : j === 2 ? -0.01 : 0.015) * (0.6 + wr())
          tp.push([c[0] + (px - c[0]) * sc * d + ox, c[1] + (py - c[1]) * sc * d + oy])
        }
      })
      const L0 = tp[tp.length - 1] as Pt
      const R0 = tp[0] as Pt
      // mép dưới tan thành tua lá thon (dài ở phía ngọn cành, ngắn sát gốc) xen khe xẻ ngược vào tán — không còn viền "mũ nấm"
      const at = (f: number): Pt => [L0[0] + (R0[0] - L0[0]) * f, L0[1] + (R0[1] - L0[1]) * f]
      let cur: Pt = [R(L0[0]), R(L0[1])]
      let bt = ''
      const seg = (c: Pt, e: Pt) => {
        const E: Pt = [R(e[0]), R(e[1])]
        bt += `q${J([R(c[0]) - cur[0], R(c[1]) - cur[1], E[0] - cur[0], E[1] - cur[1]])}`
        cur = E
      }
      const nT = lite ? 10 : 15
      for (let i = 0; i < nT; i += 1) {
        const fm = (i + 0.5 + (wr() - 0.5) * 0.5) / nT
        const m = at(fm)
        const len = (12 + 34 * (1 - fm) * (0.5 + 0.9 * (fbm(nw, fm * 9, 3 + k, 2) + 0.5)) + 12 * wr()) * sc
        const tip: Pt = [m[0] + (wr() - 0.5) * 7 * sc, m[1] + len]
        const b = at((i + 1) / nT)
        const nb: Pt = i === nT - 1 ? R0 : [b[0], b[1] - (2 + 10 * wr()) * sc]
        seg([cur[0] + (tip[0] - cur[0]) * 0.15, cur[1] + (tip[1] - cur[1]) * 0.75], tip)
        seg([nb[0] - (nb[0] - tip[0]) * 0.15, nb[1] + (tip[1] - nb[1]) * 0.7], nb)
      }
      return `${rq(tp) + bt}z`
    }
    // tán thưa (xuân, thu): lỗ thủng dựng từ nhiễu để trời/nắng xuyên qua (evenodd), không còn tấm thảm đặc
    let hole = ''
    if (thu)
      for (const [hx, hy, L] of [[-60, -226, 46], [-136, -214, 40], [-24, -238, 30], [-104, -250, 34], [-174, -186, 38], [-84, -196, 26]] as const)
        hole += rib(-96 + (hx + 96) * kS, -200 + (hy + 200) * kS, 7 + 5 * wr(), L * kS, (wr() - 0.5) * 6, (wr() - 0.5) * 5)
    const back = dong ? '' : dome(kS, 0, 0, 0) + hole
    const front = dong ? '' : dome(kS * 0.7, am ? -16 : 8, -4, 3)
    const DX = -96
    const DY = -200
    const DR = 130 * kS
    const lit = am ? 'translate(-4 -4)' : 'translate(4 -4)'
    const rb = ['', '']
    let lay = ''
    let tex = ''
    let tex2 = ''
    if (dong) {
      // đông: cành trơ; sợi cành con mọc RA TỪ các cành vòm (không phải rèm nét dọc): dài dần về ngọn cành, khoảng hở không đều,
      // đầu sợi cong theo đà cành rồi mới rủ, vài sợi chẽ đôi
      for (const [bi, nS] of [[0, 7], [1, 5], [3, 4], [2, 3]] as const) {
        const b = LB[bi] as [Pt, Pt, Pt]
        for (let i = 0; i < (lite ? Math.ceil(nS / 2) : nS); i += 1) {
          const t = 0.3 + (0.68 * (i + 0.2 + 0.6 * wr())) / nS
          const [x, y] = qp(b, t)
          const dir = Math.sign(b[2][0] - b[0][0]) || -1
          const L = Math.min(-14 - y, (18 + 96 * t * t) * (0.55 + 0.6 * wr()))
          if (L < 10) continue
          const ox = dir * (3 + 8 * wr())
          lay += `M${J([x, y])}c${J([ox, L * 0.1, ox * 0.6 + (wr() - 0.5) * 4, L * 0.5, ox * 0.4 + (wr() - 0.5) * 6, L])}`
          if (wr() < 0.35) lay += `M${J([x + ox * 0.5, y + L * 0.35])}q${J([dir * 4, L * 0.2, dir * (2 + 4 * wr()), L * 0.4])}`
        }
      }
    } else {
      const n = Math.round(24 * dens)
      for (let i = 0; i < n; i += 1) {
        const f = (i + 0.2 + 0.6 * wr()) / n
        const x = DX - DR + f * DR * 1.7
        const y = DY + 10 + (1 - f) * 60 * kS + wr() * 14
        const L = Math.max(26, Math.min(-12 - y, (56 + 128 * (1 - f)) * lenK * (0.5 + 0.7 * wr())))
        rb[i % 2] += rib(x, y, (i % 2 ? 4.5 : 5.5) * wK * (0.8 + 0.5 * wr()), L, (wr() - 0.4) * 12, (wr() - 0.5) * 8)
        if (wr() < 0.6) {
          const L2 = Math.min(-12 - y, L * (0.95 + 0.5 * wr()))
          lay += `M${J([x + (wr() - 0.5) * 8, y - 6])}q${J([(wr() - 0.5) * 12, L2 * 0.55, (wr() - 0.35) * 10, L2])}`
        }
      }
      // vân trong tán: nét rủ ngắn tương phản thấp (lá buông chứ không phải khối phẳng)
      for (let i = 0; i < (lite ? 0 : 16); i += 1) {
        const x = DX - DR * 0.85 + ((i + wr()) / 16) * DR * 1.6
        const y = DY - 58 * kS + Math.abs(x - DX + 20) * 0.22 + wr() * 18
        const L = 22 + 40 * wr() + (x < DX ? 24 : 0)
        const d = `M${J([x, y])}q${J([(wr() - 0.5) * 5, L * 0.5, (wr() - 0.5) * 8, L])}`
        if (i % 2) tex += d
        else tex2 += d
      }
    }
    const wo =
      (front ? `<path id="hs-wf" d="${front}"/>` : '') +
      `<g id="hs-wo">` +
      P('b1', 'M-24 6C-10-40-30-104-48-176L-30-180C-16-110 0-54 22 6Z') +
      P('b2', am ? 'M-24 6C-10-40-30-104-48-176L-42-178C-26-108-10-46-12 6Z' : 'M10 6C-4-50-18-108-34-179L-30-180C-16-110 0-54 22 6Z', op(0.9)) +
      D(S('z2', 0.8, 'M-8-10q-6-40-18-84M2-24q-6-44-20-104M-24-110q-6-30-16-60', op(0.35))) +
      D(P('m2', 'M-30-180C-17-118-6-76 6-40L1-40C-10-78-21-118-35-179Z', op(0.85))) +
      P('b1', 'M-36 6q12-14 26-8q-2 6 6 8zM12 6q10-10 22-2z') +
      D(P('m2', 'M-36 6q12-12 24-6q-12 0-16 6zM14 6q10-8 18-1z')) +
      S('hs-n1', 4.5, ld(LB[0] as [Pt, Pt, Pt]) + (dong ? ld(LB[2] as [Pt, Pt, Pt]) : '')) +
      S('hs-n1', 2.6, ld(LB[1] as [Pt, Pt, Pt]) + ld(LB[3] as [Pt, Pt, Pt])) +
      (dong || xuan ? S('hs-n1', 1.2, 'M-120-226q-12-16-26-20M-160-214q-8-18-24-22M-80-250q4-16 16-24M10-238q8-14 22-18M-110-156q-6-14-18-18') : '') +
      P(yc[0] ?? 'l4', back, (hole ? ' fill-rule="evenodd"' : '') + (xuan ? op(0.75) : thu ? op(0.62) : '')) +
      (front ? `${D(`<use href="#hs-wf" class="${yc[2] ?? 'l2'}" transform="${lit}" opacity=".55"/>`)}<use href="#hs-wf" class="${yc[1] ?? 'l3'}"${xuan || thu ? op(0.82) : ''}/>` : '') +
      S('hs-q4', 2.2, tex, op(0.45)) +
      S('hs-y2', 1.2, tex2, op(0.6)) +
      (snow && !lite ? S('hs-sn', 2, 'M-40-174Q-100-242-206-210M-44-190Q-96-276-176-266M-30-156Q-6-246 52-254') : '') +
      `</g>`
    const wa = ['hs-wv', 'hs-wv hs-wv2', 'hs-wv hs-wv3']
    const body = [P(yc[0] ?? 'l4', rb[0] ?? ''), P(yc[1] ?? 'l3', rb[1] ?? ''), S('hs-y2', dong ? 1.1 : 1.5, lay)]
    defs += wo + body.map((b, k) => (b ? `<g id="hs-v${k}">${b}</g>` : '')).join('')
    const vu = [0, 1, 2].map(k => (body[k] ? `<g class="${wa[k]}"><use href="#hs-v${k}"/></g>` : ''))
    // bóng soi đứng yên (gợn nước đã làm nó rung) — tiết kiệm 3 phần tử động
    const vs = [0, 1, 2].map(k => (body[k] ? `<use href="#hs-v${k}"/>` : ''))
    objs.push({ x0: WX - 215, x1: WX + 60, prio: 8, z: 830, svg: `<g transform="translate(${WX} ${WY})">${vu[0]}<use href="#hs-wo"/>${vu[1]}${vu[2]}<path class="ao" d="M-34 4h64v3h-64z"/></g>` })
    refl.push({ x0: WX - 215, x1: WX + 60, prio: 6, svg: `<g transform="matrix(1 0 0 -1 ${WX} ${2 * 826 - WY})"${op(0.42 * reflO)}>${vs[0]}<use href="#hs-wo"/>${vs[1]}${vs[2]}</g>` })
  }

  // ───────────── 5. Thuyền nan + ông lão câu cá (7532, 888, cỡ .85) — lùi về 1/3 trái, dây câu thả ra mặt hồ trống ─────────────
  {
    const BX = 7532
    const BY = 888
    const BS = 0.85
    const coat = wetAny
    const hat =
      P('w1', 'M-44-94L-70-68Q-44-62-16-70Z') +
      D(P(am ? 'hl' : 'sh', am ? 'M-44-94L-70-68L-59-66Z' : 'M-44-94L-16-70Q-28-65-37-64Z')) +
      (snow && !lite ? P('w3', cap([[-45, -95], [-56, -82], [-70, -69]], 3) + cap([[-70, -69], [-44, -63], [-16, -71]], 2)) : '')
    const head = P('w2', 'M-37-70h9q3 5 1 10l-3 2h-6z') + P('k2', 'M-40-70h14v3h-14z', op(0.55)) + D(P('f3', 'M-31-60q3 7-1 12q-2-6-5-10z')) + hat
    const torso = coat
      ? P('b1', 'M-68-18L-62-56Q-46-66-30-58L-22-18l-4-5-4 5-4-5-4 5-4-5-4 5-4-5-4 5-4-5-4 5-4-5z') + D(S('hs-n2', 1, 'M-64-44q16 5 33-2M-66-32q18 5 40-2M-62-54q12 4 26-2', op(0.8)))
      : P('d2', 'M-64-20C-68-42-60-58-46-60C-36-60-30-52-28-42L-24-20Z') + D(P('d1', 'M-60-52C-56-58-50-60-46-60C-52-56-55-50-57-44Z') + P('sh', 'M-64-20C-67-34-64-42-60-46C-61-34-58-26-54-20Z'))
    const arm = (hx: number, hy: number) => P(coat ? 'b1' : 'd2', `M-46-55Q-30-46${J([hx, hy - 1])}l1 7Q-30-38-44-45Z`) + P('w2', `M${J([hx, hy - 1])}q5-1 6 3q-1 4-5 3z`)
    let man = ''
    let rod = ''
    if (heavy) {
      man = torso + head
      rod = `${S('hs-n3', 1.8, 'M-10-28C40-60 100-74 150-66')}<path class="hs-ln" d="M150-66Q153-50 154-30"/>`
    } else if (shower) {
      man = torso + arm(-16, -48) + head
      rod = `${S('hs-n3', 1.8, 'M-24-30C-16-80-20-118-34-152')}<path class="hs-ln" d="M-34-152q6 16 3 36"/>`
    } else if (sleep) {
      man = `${torso}<g transform="rotate(22 -42 -56)">${head}</g>`
      rod = `${S('hs-n3', 1.8, 'M-24-26C30-56 92-68 150-58')}<path class="hs-ln" d="M150-58Q152-44 153-30"/>`
    } else {
      man = torso + arm(-12, -42) + head
      rod = `${S('hs-n3', 1.8, 'M-24-30C30-84 100-106 152-94')}<path class="hs-ln" d="M152-94Q155-62 156-30"/>`
    }
    const bt =
      `<g id="hs-bt">` +
      D(S('hs-n2', 2.4, 'M-58-40L-150 2') + P('b2', 'M-140-3l-26 10 4 3 24-8z')) +
      P('k2', 'M-114-28Q-56-34 0-28Q58-34 116-30Q62-14 0-17Q-60-14-114-28ZM100-56h9l-1 3h-7z') +
      man +
      D(P('b3', 'M2-18q-2-11 8-13q11 2 9 13z') + P('b2', 'M4-32h12l-1-3h-10z')) +
      S('hs-n1', 1.5, 'M100-26l4-28') +
      P(night ? 'e2' : 'p1', 'M101-53h8l-1 9h-6z', op(night ? 1 : 0.85)) +
      rod +
      P('b2', 'M-114-28Q-60-14 0-17Q62-14 116-30Q106-14 94-2Q50 5 0 5Q-50 5-96-2Q-106-14-114-28Z') +
      D(P('b3', 'M-114-28Q-60-14 0-17Q62-14 116-30l-3 6Q62-9 0-12Q-60-9-111-22Z')) +
      P('b1', 'M-104-10Q-50-1 0-1Q50-1 102-11Q97-6 94-2Q50 5 0 5Q-50 5-96-2Q-100-6-104-10ZM114-30l7-9 2 2-6 8zM-112-28l-7-9-2 2 6 8z') +
      D(S('z3', 1.1, 'M-114-28Q-60-14 0-17Q62-14 116-30', op(0.8))) +
      (wetAny && !lite ? P('wetsheen', 'M-110-26Q-60-13 0-16Q62-13 114-28l-1 3Q62-10 0-13Q-60-10-108-23z') : '') +
      (snow ? P('w3', cap(qpts([-114, -29], [0, -4], [116, -31], 5), 2.5)) : '') +
      `</g>`
    defs += bt
    const wl = BY + 5 * BS
    const gx = R(BX + 105 * BS)
    const gy = R(BY - 48 * BS)
    const glow = night
      ? `<circle fill="url(#gw)" cx="${gx}" cy="${gy}" r="24" class="fl"/><ellipse fill="url(#gw)" cx="${gx}" cy="${R(2 * wl - gy + 14)}" rx="16" ry="44" opacity=".35"/>${P('e1', `M${J([gx - 3, gy - 4])}h6l-1 8h-4z`)}` +
        // bóng đèn trên nước: vệt sáng vỡ theo gợn (nét ngang lệch nhau, thưa dần), không còn khối bầu dục chữ "I"
        S('hs-gl', 1.2, `M${J([gx - 5, 2 * wl - gy - 16])}h9M${J([gx - 2, 2 * wl - gy - 7])}h6M${J([gx - 7, 2 * wl - gy + 9])}h11M${J([gx - 1, 2 * wl - gy + 27])}h5`, op(0.55)) +
        D(S('hs-gl hs-t1', 1.3, `M${J([gx - 9, 2 * wl - gy - 1])}h14M${J([gx - 3, 2 * wl - gy + 17])}h9M${J([gx - 11, 2 * wl - gy + 36])}h16`))
      : undefined
    const sil = 'M-114-28Q0-36 116-30Q106-14 94-2Q0 8-96-2Q-106-14-114-28ZM-68-20L-62-56Q-46-66-30-58L-22-20ZM-44-94L-70-68Q-44-62-16-70Z'
    refl.push({ x0: BX - 140, x1: BX + 140, prio: 7, svg: `<g transform="${MIRT(wl, BS, BX, BY)}"><g class="bob"><use href="#hs-bt"${op(0.45 * reflO)}/><path class="sh" d="${mn(sil)}"/></g></g>` })
    objs.push({
      x0: BX - 140, x1: BX + 140, prio: 8, z: 888,
      svg: `<ellipse class="ao" cx="${BX}" cy="${R(wl + 1)}" rx="104" ry="3"/><g transform="matrix(${BS} 0 0 ${BS} ${BX} ${BY})"><g class="bob"><use href="#hs-bt"/></g></g>${heavy || shower ? '' : `<ellipse class="z3 rip" cx="${R(BX + 156 * BS)}" cy="${R(BY - 26 * BS)}" rx="11" ry="2.4"/>`}`,
      glow,
    })
  }

  // ───────────── 6. Bờ cỏ trái (bờ gần, che sườn ruộng bậc thang): đỉnh bờ gãy mịn, sườn tối dần về chân, mép bùn, đá rêu, lau ─────────────
  let catY = 706
  {
    const nl = ctx.noise('hs-btr')
    const gr = ctx.rng('hs-co')
    // đỉnh bờ: rìa cỏ răng cưa không đều (ngọn cỏ in lên nền đồi xa)
    const tp: Pt[] = []
    for (let x = 7184, i = 0; x <= 7428; x += lite ? 14 : 6, i += 1)
      tp.push([x + (i % 2 ? gr() * 2 : 0), Math.min(ground(x), 812) - 1 - (i % 2 ? 1.5 + 6 * Math.max(0, fbm(nl, x / 9, 1.7, 2) + 0.3) * (0.5 + gr()) : 0.5)])
    catY = R(Math.min(ground(7276), 812) - 3)
    const sh: Pt[] = []
    for (let y = 812; y <= 1180; y += 23) sh.push([7428 - 182 * ((y - 812) / 368) ** 0.72 - 14 * fbm(nl, y / 40, 5.5, 2) - 7 * Math.exp(-(((y - 884) / 12) ** 2)) + 34 * Math.exp(-(((y - 944) / 34) ** 2)) - 22 * Math.exp(-(((y - 1036) / 30) ** 2)) + 16 * Math.exp(-(((y - 1110) / 26) ** 2)), y])
    // đá rêu xếp lớp ở mép nước (to dần về gần): khối tối, mặt trên hứng sáng phía nguồn, rêu phủ mép trên gãy vụn, chân ướt sẫm
    let rk = ''
    let rl2 = ''
    let rm = ''
    for (const [i, w0] of (lite ? [[6, 1.2], [12, 1.1]] : [[3, 0.8], [6, 1.25], [8, 0.7], [12, 1.1]]) as [number, number][]) {
      const p = sh[i] as Pt
      if (!p) continue
      const w = (16 + (p[1] - 812) / 5.5) * w0
      const h = w * (0.42 + 0.2 * gr())
      const cx = p[0] + w * 0.15
      const top: Pt[] = []
      for (let j = 0; j <= 6; j += 1) {
        const a = Math.PI + (j / 6) * Math.PI
        const k = 0.8 + 0.35 * (fbm(nl, cx / 11 + j * 0.6, p[1] / 13, 2) + 0.5)
        top.push([cx + Math.cos(a) * w * (0.9 + 0.1 * k), p[1] + 3 + Math.sin(a) * h * k])
      }
      rk += rl([...top, [cx + w * 0.9, p[1] + 5], [cx - w * 0.9, p[1] + 5]], true)
      const lt = am ? top.slice(0, 4) : top.slice(3)
      rl2 += rl([...lt, ...lt.slice().reverse().map(([x, y]) => [x + (cx - x) * 0.3, y + h * 0.16] as Pt)], true)
      rm += cap(top.slice(1, 6).filter((_, j) => j !== 1), 2 + w * 0.1)
    }
    defs += `<path id="hs-lb" d="${mn(`${rl(tp) + rq(sh).replace('M', 'L')}H7120Q7150 900 7184 ${R(tp[0]?.[1] ?? 680)}z`)}"/>`
    // ba sắc độ theo độ dốc: vai bờ thoải hứng sáng trời (sáng) · sườn (thân) · chân bờ dốc sát nước (tối)
    const crestB = tp.filter(p => p[0] < 7384 && p[0] % 3 < 1.5)
    const shoulder = `${rq(crestB) + rl(crestB.slice().reverse().map(([x, y]) => [x - 6, y + 22 + 16 * (fbm(nl, x / 30, 3.3, 2) + 0.5) + (x - 7184) * 0.06] as Pt)).replace('M', 'L')}z`
    const band = `${rq(sh) + rq(sh.slice().reverse().map(([x, y]) => [x - 16 - (y - 812) * 0.14 - 26 * (fbm(nl, y / 45, 9, 2) + 0.4), y] as Pt)).replace('M', 'L')}z`
    // búi cỏ trên sườn: to dần về gần, hai sắc độ tương phản thấp
    let tuft = ''
    let tuft2 = ''
    for (let i = 0; i < (lite ? 0 : 8); i += 1) {
      const y = 740 + i * 42 + gr() * 14
      const xr = sh.reduce((a, p) => (Math.abs(p[1] - y) < Math.abs(a[1] - y) ? p : a), sh[0] as Pt)[0]
      const xl = 7186
      const x = xl + gr() * Math.max(8, xr - xl - 14)
      if (y < ground(x) + 10) continue
      const s = 0.55 + (y - 740) / 260
      const t = `M${J([x, y])}l${J([-4 * s, -9 * s])}M${J([x + 3 * s, y])}l${J([0, -12 * s])}M${J([x + 6 * s, y])}l${J([5 * s, -8 * s])}`
      if (i % 2) tuft += t
      else tuft2 += t
    }
    // vân cỏ mịn: nét ngắn mảnh, tương phản rất thấp, dày & to dần về chân bờ (chi tiết bằng vân, không thêm vật)
    let ht = ''
    let ht2 = ''
    for (let i = 0; i < (lite ? 0 : 14); i += 1) {
      const y = 712 + 360 * gr() ** 0.8
      const xr = sh.reduce((a, p) => (Math.abs(p[1] - y) < Math.abs(a[1] - y) ? p : a), sh[0] as Pt)[0]
      const x = 7186 + gr() * Math.max(6, xr - 7196)
      if (y < ground(x) + 5) continue
      const s = 0.5 + (y - 712) / 300
      const t = `M${J([x, y])}l${J([(gr() - 0.6) * 3 * s, -(4 + 4 * gr()) * s])}`
      if (i % 3) ht += t
      else ht2 += t
    }
    // mép bờ sát nước: cỏ rủ chờm ra mặt hồ + búi rêu, phá đường chéo sắc (to & dày dần về gần)
    let fr = ''
    let fr2 = ''
    for (let i = 1; i < sh.length - 1; i += lite ? 5 : 4) {
      const [x, y] = sh[i] as Pt
      const s = 0.7 + (y - 812) / 220
      const n = 3 + Math.round(gr() * 2)
      for (let j = 0; j < n; j += 1) {
        const yy = y - 14 * gr() * s
        const t = `M${J([x - 3 - 4 * gr(), yy])}q${J([(5 + 6 * gr()) * s, -(3 + 5 * gr()) * s, (9 + 8 * gr()) * s, (2 + 7 * gr()) * s])}`
        if (j % 2) fr += t
        else fr2 += t
      }
    }
    let fl = ''
    for (let i = 0; i < (lite ? 2 : 6); i += 1) {
      const x = 7192 + i * 34 + gr() * 14
      fl += `M${J([x, Math.min(ground(x), 806) + 4 + gr() * 22])}h3v3h-3z`
    }
    const reeds = [0.32, 0.55, 0.8].map((t, i) => {
      const p = sh[Math.round(t * (sh.length - 1))] as Pt
      return UM('hs-rd', p[0] + 6, p[1] + 2, 0.8 + t * 0.9, i % 2 ? -1 : 1)
    })
    const lb =
      `<use href="#hs-lb" class="g3"/>` +
      D(P('g2', shoulder, op(0.55))) +
      `<use href="#hs-lb" class="${am ? 'sh' : 'hl'}"/>` +
      P('g4', band, op(0.72)) +
      D(S('hs-g4', 1, ht, op(0.55)) + S('hs-g1', 0.9, ht2, op(0.42)) + S('hs-g2', 1.3, tuft, op(0.7)) + S('hs-g4', 1.5, tuft2, op(0.75))) +
      S(am ? 'hs-g1' : 'hs-g2', 1.1, rl(tp.slice(0, -5)), op(am ? 0.75 : 0.4)) +
      S('hs-k2', 2.2, rq(sh), op(0.45)) +
      `<use href="#hs-lb" fill="url(#fgg)" opacity=".45"/>` +
      P('s3', rk) + P('s2', rl2, op(0.5)) + P('m2', rm, op(0.85)) +
      S('hs-g4', 1.4, fr2, op(0.9)) + S('hs-g2', 1.1, fr, op(0.6)) +
      D(S('z3', 1, rq(sh.slice(0, 9).map(([x, y]) => [x + 4, y + 2] as Pt)), op(0.3))) +
      U('hs-k0', (sh[3] as Pt)[0] + 4, (sh[3] as Pt)[1]) +
      D(UM('hs-k0', (sh[9] as Pt)[0] + 8, (sh[9] as Pt)[1], 1.7)) +
      (lite ? '' : P(xuan ? 'f1' : ha ? 'f2' : 'f3', fl)) +
      (snow ? P('w3', cap(tp.filter((_, i) => i % 3 === 0).slice(0, -2), 3)) : '')
    // Mép trái bờ (7120–7184) đứng thẳng: nhìn từ ruộng bậc thang nó lộ thành VẠCH ĐỨNG vì bờ có lớp sáng/tối & sương riêng khác đất
    // nền + sương của ruộng bên dưới. Cho cả bờ TRONG SUỐT DẦN về mép trái (mask tĩnh, 7184→7290) để đất & sương bên dưới hiện qua.
    defs +=
      `<linearGradient id="hs-lg2" gradientUnits="userSpaceOnUse" x1="7184" x2="7290" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>` +
      `<mask id="hs-lm" maskUnits="userSpaceOnUse" x="7090" y="480" width="440" height="740"><rect x="7090" y="480" width="440" height="740" fill="url(#hs-lg2)"/></mask>`
    objs.push({ x0: 7180, x1: 7440, prio: 6, z: 815, svg: `<g mask="url(#hs-lm)">${lb}</g>` })
    objs.push({ x0: 7230, x1: 7440, prio: 4, z: 1000, svg: (reeds[0] ?? '') + (reeds[1] ?? '') + (lite ? '' : `<g class="sw3">${reeds[2]}</g>`) })
    // bờ đông: mép bùn + viền cỏ + đá + lau (chủ yếu hiện khi camera lia sang tuong-da)
    objs.push({
      x0: 8740, x1: 8935, prio: 3, z: 829,
      svg: P('g3', rq([...east.map(([x, y]) => [x + 3, y] as Pt), [8936, 1180], [8936, 812]], true)) + S('hs-d2', 4, rq(east.map(([x, y]) => [x + 2, y] as Pt))) + U('hs-k0', (east[4] as Pt)[0] + 10, (east[4] as Pt)[1]) + UM('hs-rd', (east[7] as Pt)[0] + 6, (east[7] as Pt)[1], 1.2, -1) + D(UM('hs-rd', (east[11] as Pt)[0] + 8, (east[11] as Pt)[1], 1.5)),
    })
  }

  // ───────────── 7. Đầm sen: hai quần thể ở mép (gần trái-dưới to & nghiêng, xa phải nhỏ), chuỗi lá nổi nhỏ dần men bờ trái ─────────────
  {
    const stem = dong ? 'hs-n1' : thu ? 'hs-n2' : 'hs-q4'
    /** Một quần thể sen, gốc (0,0) = mặt nước giữa quần thể. Trả [lá nổi, phần vươn]. */
    const bed = (key: string, W: number, nF: number, nU: number): [string, string] => {
      const r = ctx.rng(key)
      const fl: [number, string][] = []
      for (let i = 0; i < nF; i += 1) {
        const y = -10 + r() * 26
        fl.push([y, UM(`hs-F${i % 2}`, (r() * 2 - 1) * W, y, 0.72 + ((y + 10) / 26) * 0.5 + r() * 0.16, r() < 0.5 ? -1 : 1, '', 0.95)])
      }
      fl.sort((a, b) => a[0] - b[0])
      let st = ''
      let st2 = ''
      let up = ''
      for (let i = 0; i < nU; i += 1) {
        const x = -W * 0.85 + ((i + 0.3 + 0.4 * r()) * 1.7 * W) / nU
        const hh = ((i * 0.618 + r() * 0.3) % 1)
        const h = (ha && key === 'hs-senA' && x > 0 ? 1 - (0.5 * x) / W : 1) * (ha ? 46 + 64 * hh : xuan ? 16 + 20 * hh : thu ? 34 + 44 * hh : 26 + 40 * hh)
        const tx = x + (r() - 0.5) * 22
        const rot = (r() - 0.5) * 22
        if (dong) {
          // cọng khô gãy gập, đài sen khô cúi đầu
          const b = (r() - 0.5) * 8
          const k = 0.45 + r() * 0.25
          const fx2 = (r() < 0.5 ? -1 : 1) * (10 + r() * 16)
          st += `M${J([x, 0])}l${J([b, -h * k])}l${J([fx2 * 0.3, -h * (1 - k) * 0.6])}`
          st2 += `M${J([x + b + fx2 * 0.3, -h * k - h * (1 - k) * 0.6])}l${J([fx2, h * 0.22])}`
          if (i % 2 === 0) up += T('hs-pd', x + b + fx2 * 1.3, -h * k - h * (1 - k) * 0.6 + h * 0.22 + 4, fx2 > 0 ? 150 : -150, 0.8)
          continue
        }
        if (thu && i % 3 === 2) {
          // cọng gãy mang gương sen gục
          st += `M${J([x, 0])}q${J([(r() - 0.5) * 8, -h * 0.4, tx - x, -h * 0.7])}l${J([14, 10])}`
          up += T('hs-pd', tx + 16, -h * 0.7 + 14, 130, 1)
          continue
        }
        st += `M${J([x, 0])}q${J([(r() - 0.5) * 10, -h * 0.5, tx - x, -h])}`
        if (ha && i % 3 === 1) up += T('hs-fl', tx, -h, rot * 0.5, 0.95 + r() * 0.2)
        else if (ha && i % 4 === 3) up += T('hs-bd', tx, -h, rot * 0.4, 0.9)
        else if (xuan && i % 2) up += T('hs-yl', tx, -h + 2, rot, 1)
        else {
          const c1 = i % 2 === 0
          const s = (xuan ? 0.5 : 0.62) + r() * 0.62
          up += T(c1 ? 'hs-C1' : 'hs-C0', tx, -h - (c1 ? 13 : 8) * s, rot * (c1 ? 1.2 : 0.7), s)
        }
      }
      return [fl.map(f => f[1]).join(''), S(stem, 2.2, st) + S(stem, 1.2, st2) + up]
    }
    const isU = lite ? 0.55 : 1
    const A = bed('hs-senA', 118, lite ? 5 : 8, Math.round((ha ? 7 : xuan ? 4 : 6) * isU))
    const B = bed('hs-senB', 84, lite ? 3 : 6, Math.round((ha ? 5 : xuan ? 3 : 4) * isU))
    // hạ: cọng vươn cao → dời quần thể sang trái & hạ thấp để chừa khoảng hở quanh thuyền + bóng ông lão
    const AX = ha ? 7404 : 7452
    const AY = ha ? 1084 : 1056
    const AS = ha ? 1.3 : 1.55
    const BX = 8652
    const BY = 968
    const BS = 1.05
    const ice = dong && !lite ? S('z3', 1, 'M-40 4q40 6 80 0M-70-2q20 3 36 1', op(0.45)) : ''
    objs.push({ x0: AX - 200, x1: AX + 200, prio: 5, z: 1040, svg: `<g transform="matrix(${AS} 0 0 ${AS} ${AX} ${AY})">${A[0]}${ice}<g class="sw2">${A[1]}</g></g>` })
    objs.push({ x0: BX - 100, x1: BX + 100, prio: 5, z: 960, svg: `<g transform="matrix(${-BS} 0 0 ${BS} ${BX} ${BY})"><g opacity=".72">${B[0]}</g><g class="sw4"><g id="hs-uB">${B[1]}</g></g></g>` })
    if (!lite) refl.push({ x0: BX - 100, x1: BX + 100, prio: 4, svg: `<g transform="matrix(${-BS} 0 0 ${-BS} ${BX} ${BY})"${op(0.32 * reflO)}><g class="sw4"><use href="#hs-uB"/></g></g>` })
    // chuỗi lá nổi nhỏ dần men bờ trái (phối cảnh: gần to, xa dẹt)
    const chain: [number, number, number][] = [[7432, 948, 0.85], [7408, 896, 0.62], [7446, 858, 0.48], [7476, 832, 0.36], [7520, 822, 0.3]]
    objs.push({ x0: 7390, x1: 7540, prio: 3, z: 830, svg: (lite ? chain.slice(1, 4) : chain).map(([x, y, s], i) => UM(`hs-F${i % 2}`, x, y, s, i % 2 ? -1 : 1, '', 0.85)).join('') })
  }

  // ───────────── 8. Vệt gợn (cắt bóng, tô lại màu nước) + vệt loá: mỗi hàng là một nét dài, mẫu nét đứt không đều ─────────────
  {
    const sr = ctx.rng('ho-sen-gon')
    const nE = Math.round((lite ? 4 : 7) * (1 + wind * 0.3) * (heavy ? 1.45 : rain ? 1.3 : 1))
    const er = ['', '']
    for (let i = 0; i < nE; i += 1) {
      const y = 816 + ((i + sr() * 0.8) / nE) ** 1.35 * 262
      er[y < 900 ? 0 : 1] += `M${J([7380 + sr() * 420, y])}H8830`
    }
    const gr = ctx.rng('hs-glint')
    const gl = ['', '', '']
    const nG = dl < 0.3 ? 0 : lite || heavy ? 3 : rain ? 4 : 8
    for (let i = 0; i < nG; i += 1) gl[i % 3] += `M${J([7420 + gr() * 500, 818 + (i / nG) ** 1.3 * 250 + (gr() - 0.5) * 6])}H8800`
    const gO = [0.2, 0.3, 0.42].map(v => v * (rain ? 0.5 : 1) * (0.25 + 0.75 * dl))
    // vân mặt nước: các hàng gợn rất mảnh tương phản thấp (|ΔL*| < 4), thưa dần về gần — chất liệu mà không thành vật
    const vr = ctx.rng('hs-van')
    const vt = ['', '']
    for (let i = 0; i < (lite ? 0 : 18); i += 1) {
      const y = 818 + ((i + vr() * 0.7) / 18) ** 1.4 * 280
      const x = 7400 + vr() * 300
      vt[i % 2] += `M${J([x, y])}H${R(8800 - vr() * 300)}`
    }
    if (dong) defs += `<linearGradient id="hs-sv" gradientUnits="userSpaceOnUse" x1="0" y1="812" x2="0" y2="980"><stop offset="0" style="stop-color:var(--w3)" stop-opacity=".3"/><stop offset="1" style="stop-color:var(--w3)" stop-opacity="0"/></linearGradient>`
    const tex = (dong ? `<use href="#hs-wp" fill="url(#hs-sv)"/>` : '') + P('hs-rp', vt[0] ?? '') + P('hs-rp hs-rk', vt[1] ?? '')
    streak.push({
      x0: 7390, x1: 8830, prio: 5,
      svg: `<g class="hs-er">${P('hs-sh', er[0] ?? '')}${P('hs-sh hs-sh2 hs-en', er[1] ?? '')}</g><use href="#hs-wp" fill="url(#hs-rv)"/>${tex}${gl.map((d, i) => P(`hs-wt${i === 2 && day && !rain ? ' hs-t2' : ''}`, d, op(gO[i] ?? 0.2))).join('')}`,
    })
  }

  // ───────────── 9. Trăng soi: vệt sáng vỡ ngay dưới vị trí trăng (cùng công thức với trời), mặt gương ⇒ y bóng = 2·chân trời − y trăng ─────────────
  {
    const D2R = Math.PI / 180
    const LAT = 21.03 * D2R
    const p = ctx.moonPhase
    const illum = (1 - Math.cos(2 * Math.PI * p)) / 2
    const lam = (2 * Math.PI * (ctx.vn.doy - 80)) / 365.2422
    const dec = Math.asin(Math.sin(23.44 * D2R) * Math.sin(lam + 2 * Math.PI * p))
    const at = (h0: number): [number, number, number] => {
      const h = ((((h0 + 12) % 24) + 24) % 24) - 12
      const s = Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(h * 15 * D2R)
      return [800 + h * 110, 500 - 440 * s, s]
    }
    const ha0 = hF + 0.85 / 15 - 12 - p * 24
    const m1 = at(ha0)
    const m2 = at(ha0 + (ctx.span / 3600) * 0.966)
    const mB = illum * smooth(-0.03, 0.12, m1[2]) * (1 - dl)
    const mx = (m1[0] + m2[0]) / 2 + 7200
    const my = (m1[1] + m2[1]) / 2
    if (mB > 0.15 && !rain && my < 480 && mx > 7420 && mx < 8780) {
      const yc = Math.min(1060, Math.max(826, 1100 - my))
      const gr = ctx.rng('hs-trang')
      const g = ['', '']
      const n = lite ? 6 : 12
      for (let i = 0; i < n; i += 1) {
        const y = 816 + (yc + 60 - 816) * ((i + gr() * 0.7) / n) ** 0.8
        const w = (4 + (y - 812) * 0.09) * (0.5 + gr()) * (1 - Math.min(0.8, Math.abs(y - yc) / 260))
        g[i % 2] += `M${J([mx - w + (gr() - 0.5) * (3 + (y - 812) * 0.05), y])}h${R(2 * w) || 1}`
      }
      fx.push({
        x0: mx - 60, x1: mx + 60, prio: 4, svg: '',
        glow: `<ellipse fill="url(#gc)" cx="${R(mx)}" cy="${R((816 + yc) / 2 + 20)}" rx="30" ry="${R((yc - 816) / 2 + 50)}"${op(0.35 * mB)}/>${S('hs-mg hs-t1', 1.5, g[0] ?? '', op(0.7 * mB))}${S('hs-mg hs-t2', 1.5, g[1] ?? '', op(0.55 * mB))}`,
      })
    }
  }

  // ───────────── 10. Hiệu ứng: chuồn chuồn hè, mưa rơi mặt hồ ─────────────
  if (ha && dl > 0.6 && !rain) {
    defs += `<g id="hs-dy"><path class="w3" opacity=".6" d="M5 0C3-6 4-9 6-9S8-4 5 0M9 0C10-6 12-8 14-8S13-3 9 0M5 0C3 5 4 8 6 8S8 4 5 0M9 0C10 5 12 7 14 7S13 3 9 0"/><path class="p1" d="M0-1H17L18 0 17 1H0Z"/><circle class="p1" r="2"/></g>`
    fx.push({ x0: 7520, x1: 7700, prio: 7, svg: `<g class="hs-df"><use href="#hs-dy" transform="translate(7590 972)rotate(-8)"/></g>` })
  }
  if (wetAny) {
    const rr = ctx.rng('ho-sen-mua')
    let s = ''
    const n = lite ? 2 : pr === 'phun' ? 3 : 4
    for (let i = 0; i < n; i += 1) {
      const y = 826 + rr() ** 0.9 * 260
      const w = 4 + (y - WL) / 20
      s += `<ellipse class="z3 hs-rr hs-d${i % 6}" cx="${R(7440 + rr() * 1320)}" cy="${R(y)}" rx="${R(w)}" ry="${R(w / 4) || 1}"/>`
    }
    fx.push({ x0: 7430, x1: 8770, prio: 3, svg: s })
  }

  // ───────────── 11. Tiền cảnh (lớp 4): lá sen / lau sậy đen mép đáy, cành liễu tối rủ từ góc trên trái ─────────────
  {
    // toạ độ lớp 4 = màn hình + (10000, 128) ở khung ho-sen
    // lá sen sát mắt (nhìn từ dưới-bên): vành gợn bắt sáng trời, mặt dưới tối có gân toả nhạt hơn
    defs += `<g id="hs-Q"><path class="l4" d="M-44 0q7-6 14-2t14-3 14 2 14-3 14 2 14-1Q38 13 0 18Q-38 13-44 0Z"/><path class="a2" opacity=".42" d="M-44 0q7-6 14-2t14-3 14 2 14-3 14 2 14-1Q38 13 0 18Q-38 13-44 0Z"/><path class="hs-q3 hs-w2" opacity=".7" d="M0 17l-32-15M0 17l-15-17M0 17l2-18M0 17l19-16M0 17l34-13"/><path class="z3" opacity=".55" d="M-44 0q7-6 14-2t14-3 14 2 14-3 14 2 14-1"/></g>`
    const leftL = dong
      ? S('hs-q4', 3, 'M10060 1140l-6-96l18-30M10150 1140l4-70l-22-26M10210 1140l-2-50') + P('l4', 'M10064 1010l10-6 4 10-10 4zM10126 1040l6-8 8 6-6 8z')
      : S('hs-q4', 3, 'M10070 1140q-6-28-10-44M10222 1140q2-10 0-14M10132 1140q-2-60 0-104M10010 1140q0-70-10-110') +
        T('hs-Q', 10000, 1000, -34, 1.3) + T('hs-Q', 10062, 1052, -12, thu ? 1.95 : 2.25) + T('hs-Q', 10220, 1100, 10, 1.65) +
        (ha ? P('l3', 'M10132 1036c-7-4-8-15 0-25c8 10 7 21 0 25z') : thu ? T('hs-pd', 10132, 1034, 160, 1.7) : '') +
        S('hs-q4', 2, 'M10030 1140q-4-50-22-90M10250 1140q8-40 28-64')
    fg.push({ layer: 4, x0: 9990, x1: 10300, prio: 3, svg: `<g class="sw4"><g opacity=".86">${leftL}</g></g>` })
    const rightR =
      P('l3', rib(11470, 1140, 7, -120, -30, -10) + rib(11500, 1140, 6, -136, 14, 6) + rib(11536, 1140, 7, -90, 34, 12) + rib(11566, 1140, 6, -104, -18, -8) + rib(11596, 1140, 5, -72, 20, 6), op(0.9)) +
      P('l4', rib(11486, 1140, 5, -96, 26, 8) + rib(11550, 1140, 5, -72, -22, -6)) +
      (dong ? '' : S('hs-q4', 1.6, 'M11514 1140q2-50 0-104M11440 1140q-4-40-2-88') + P('b1', 'M11510 1028q4-2 8 0v20q-4 2-8 0zM11436 1042q3-2 7 0v17q-3 2-7 0z'))
    if (!lite || ha) fg.push({ layer: 4, x0: 11380, x1: 11640, prio: 2, svg: `<g class="sw2">${rightR}</g>${dong ? '' : `<g class="sw4">${S('hs-q4', 3, 'M11566 1140q4-26 0-40')}${T('hs-Q', 11560, 1096, 9, 1.7)}</g>`}` })
  }

  // ───────────── Ghép mảnh theo thứ tự vẽ (xa → gần) ─────────────
  objs.sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
  const pieces: Piece[] = []
  const pack = (items: It[]) => {
    let cur: (It & { n: number }) | undefined
    const flush = () => {
      if (cur) pieces.push({ layer: 3, x0: R(cur.x0) - 2, x1: R(cur.x1) + 2, prio: cur.prio, svg: cur.svg, ...(cur.glow ? { glow: cur.glow } : {}) })
      cur = undefined
    }
    for (const it of items) {
      if (cur && cur.prio === it.prio && Math.max(cur.x1, it.x1) - Math.min(cur.x0, it.x0) <= 720) {
        cur.x0 = Math.min(cur.x0, it.x0)
        cur.x1 = Math.max(cur.x1, it.x1)
        cur.svg += it.svg
        if (it.glow) cur.glow = (cur.glow ?? '') + it.glow
        cur.n += 1
      } else {
        flush()
        cur = { ...it, n: 1 }
      }
    }
    flush()
  }
  pack(under)
  pack(refl)
  pack(streak)
  pack(objs)
  pack(fx)
  pieces.push(...fg)

  const spots: Spot[] = [
    { kind: 'cat', layer: 3, x: 7276, y: catY, s: 0.5 },
    { kind: 'cat-shelter', layer: 3, x: 8752, y: 832, s: 0.5 },
    { kind: 'lantern-water', layer: 3, x: 7880, y: 900, w: 420 },
    { kind: 'lantern-water', layer: 3, x: 8250, y: 1006, w: 360, s: 1.3 },
    { kind: 'perch', layer: 3, x: 8420, y: 709 },
    { kind: 'fireflies', layer: 3, x: 7300, y: 760, w: 180 },
    { kind: 'fireflies', layer: 3, x: 8660, y: 760, w: 200 },
    { kind: 'butterflies', layer: 3, x: 7260, y: 690, w: 140 },
  ]

  const yC = xuan ? ['l3', 'l2', 'l1'] : ha ? ['l4', 'l3', 'l2'] : thu ? ['l3', 'l2', 'l1'] : ['b1', 'b2', 'b3']
  const dash = dong ? 'none' : thu ? '3 2.8 2 3.6 4 2.4' : xuan ? '3 2 2 2.4 4 1.8' : '4 1.4 2.5 1 6 1.8 3 1.2'
  const css =
    `.hs-q3,.hs-q4,.hs-n1,.hs-n2,.hs-n3,.hs-k1,.hs-k2,.hs-ln,.hs-er,.hs-wt,.hs-vn,.hs-m3,.hs-g1,.hs-g2,.hs-g4,.hs-d2,.hs-gl,.hs-mg,.hs-sn,.hs-y2,.hs-vs,.hs-pt,.hs-po,.hs-wm{fill:none;stroke-linecap:round}` +
    `.hs-w0{stroke-width:.8px}.hs-w1{stroke-width:1.2px}.hs-w2{stroke-width:1.6px}.hs-w3{stroke-width:2.2px}.hs-w4{stroke-width:3px}.hs-w5{stroke-width:4.5px}` +
    `.hs-q3{stroke:var(--l3)}.hs-q4{stroke:var(--l4)}.hs-n1{stroke:var(--b1)}.hs-n2{stroke:var(--b2)}.hs-n3{stroke:var(--b3)}.hs-k1{stroke:var(--k1)}.hs-k2{stroke:var(--k2)}.hs-m3{stroke:var(--m3)}.hs-g1{stroke:var(--g1)}.hs-g2{stroke:var(--g2)}.hs-g4{stroke:var(--g4)}.hs-d2{stroke:var(--d2)}.hs-sn{stroke:var(--w3)}` +
    `.hs-ln{stroke:var(--k2);stroke-width:.6px;opacity:.7}.hs-vn{stroke:var(--${LC[3]});opacity:.4}.hs-gl,.hs-wm{stroke:var(--e1)}.hs-ww{stroke-dasharray:46 7 20 4 64 9 28 5}.hs-mg{stroke:var(--w3)}` +
    `.hs-er{stroke:url(#hs-wg);stroke-width:1.8px;stroke-dasharray:28 90 14 150 46 70 20 120 34 60}.hs-en{stroke-width:2.8px;stroke-dasharray:60 120 26 190 90 80 36 150}.hs-rp{fill:none;stroke:var(--w3);stroke-width:1.4px;opacity:.13;stroke-dasharray:46 20 90 30 14 34 64 24}.hs-rk{stroke:var(--k2);opacity:.09;stroke-dasharray:30 40 70 18 22 50}.hs-wt{stroke:var(--w3);stroke-width:1.3px;stroke-dasharray:60 260 140 380 40 300 210 340}` +
    // liễu: chuỗi lá li ti (nét đứt không đều), 3 sắc độ; đông chỉ còn cành trơ mảnh
    `.hs-y2{stroke-dasharray:${dash};stroke:var(--${yC[2]})}` +
    `.hs-vs{stroke:var(--s4);stroke-width:10px;stroke-dasharray:.8 15.7;opacity:.3;stroke-linecap:butt}.hs-pt{stroke:var(--s2);stroke-width:8px;stroke-linecap:butt}.hs-po{stroke:var(--s3);stroke-width:11px;stroke-dasharray:2.5 34;stroke-linecap:butt;opacity:.55}` +
    `@keyframes hs-sh{from{transform:translateX(-4px)}to{transform:translateX(5px)}}.hs-sh{animation:hs-sh 6.5s ease-in-out infinite alternate;animation-delay:${ctx.ph(13, 'hs-sh')}}.hs-sh2{animation-duration:8.9s;animation-delay:${ctx.ph(17.8, 'hs-sh2')}}` +
    `@keyframes hs-tw{50%{opacity:.15}}.hs-t1{animation:hs-tw 3.8s ease-in-out infinite;animation-delay:${ctx.ph(3.8, 'hs-t1')}}.hs-t2{animation:hs-tw 5.3s ease-in-out infinite;animation-delay:${ctx.ph(5.3, 'hs-t2')}}` +
    `@keyframes hs-wv{from{transform:skewX(-1.2deg)}to{transform:skewX(calc(1.6deg + var(--wind)*6deg))}}.hs-wv{transform-box:fill-box;transform-origin:50% 0;animation:hs-wv 5.6s ease-in-out infinite alternate;animation-delay:${ctx.ph(11.2, 'hs-wv')}}.hs-wv2{animation-duration:4.3s;animation-delay:${ctx.ph(8.6, 'hs-wv2')}}.hs-wv3{animation-duration:6.9s;animation-delay:${ctx.ph(13.8, 'hs-wv3')}}` +
    (ha && dl > 0.6 && !rain
      ? `@keyframes hs-df{0%,38%{transform:translate(0,0)}46%{transform:translate(26px,-9px)}52%,80%{transform:translate(31px,-6px)}90%{transform:translate(8px,3px)}}.hs-df{animation:hs-df 9s ease-in-out infinite;animation-delay:${ctx.ph(9, 'hs-df')}}`
      : '') +
    (wetAny
      ? `@keyframes hs-rr{from{transform:scale(.15);opacity:.85}to{transform:scale(1.3);opacity:0}}.hs-rr{transform-box:fill-box;transform-origin:50% 50%;animation:hs-rr 1.7s ease-out infinite}` +
        [0, 1, 2, 3, 4, 5].map(i => `.hs-d${i}{animation-delay:${ctx.ph(1.7, `hs-d${i}`)}}`).join('')
      : '')

  return { pieces, spots, defs, css }
}

export const region: Region = {
  id: 'ho-sen',
  name: 'Hồ sen',
  x0: 7200,
  x1: 9000,
  shots: [{ id: 'ho-sen', name: 'Hồ sen', x: 8000, y: 600, zoom: 1 }],
  build,
}
