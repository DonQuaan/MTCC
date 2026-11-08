// Vùng GA CŨ (x 0–1800) — "Ga Rêu", ga xép đầu tuyến, cột cây số Km 0 của thế giới. Cảnh "nhà" camera về mỗi tuần.
// Câu chuyện: không còn chuyến nào dừng ở đây, vậy mà đồng hồ ga vẫn chạy đúng giờ thật, bảng ga vẫn được ai đó thay ngày &
// tiết khí mỗi sáng, chiếc ô đỏ vẫn chờ trên ghế, cây chổi tre vẫn dựng cạnh cửa. Đúng bốn giờ ghi trên bảng phấn, đèn tín hiệu
// bật xanh, dây điện rung khẽ và MỘT ĐOÀN TÀU BÓNG MỜ lướt qua không dừng rồi tan vào sương ("chuyến tàu không ai đợi").
// Đường nhánh tách ra cong về phía người xem, chìm vào cỏ dại; cuối nhánh là trụ chắn gỉ và một toa tàu cũ lún nửa thân,
// mái rêu thành bãi cỏ nhỏ, đêm đêm cửa sổ toa vẫn sáng. Máy bán hàng tự động sáng xanh giữa bụi cỏ.
// Ánh sáng theo mặt trời thật: sáng nắng từ trái (đông), chiều từ phải (tây); bóng đổ chiếu theo giờ, hoàng hôn có viền nắng.
// Gọn ký tự: gom nét theo class (một <path>/class, lệnh m tương đối); độ dày nét / độ mờ / độ trễ hoạt ảnh / kiểu chữ là class
// CSS sinh theo lần vẽ; pattern cho chất liệu (ngói, gạch, đá, tà vẹt, rêu); <use> cho cụm cỏ, hoa, lon nước, cửa sổ sáng.
import type { Piece, Region, Spot } from '../types'
import { clamp, esc, ground } from '../util'

type Pt = [number, number]

const F = (...v: number[]): string => {
  let s = ''
  v.forEach((n, i) => {
    const t = String(Math.round(n))
    s += i > 0 && t[0] !== '-' ? ` ${t}` : t
  })
  return s
}
const rd = (p: Pt): Pt => [Math.round(p[0]), Math.round(p[1])]
const R = (x: number, y: number, w: number, h: number) => `M${F(x, y)}h${F(w)}v${F(h)}h${F(-w)}z`
const P = (pts: Pt[]): string => {
  const r = pts.map(rd)
  const d: number[] = []
  for (let i = 1; i < r.length; i += 1) d.push((r[i] as Pt)[0] - (r[i - 1] as Pt)[0], (r[i] as Pt)[1] - (r[i - 1] as Pt)[1])
  return `M${F(...(r[0] as Pt))}l${F(...d)}z`
}
/** Đường cong mượt qua các điểm (q tương đối qua trung điểm). */
const S = (pts: Pt[], close = false): string => {
  const r = pts.map(rd)
  if (r.length < 3) return P(r)
  let cur = r[0] as Pt
  const nums: number[] = []
  for (let i = 1; i < r.length - 1; i += 1) {
    const p = r[i] as Pt
    const m = rd([(p[0] + (r[i + 1] as Pt)[0]) / 2, (p[1] + (r[i + 1] as Pt)[1]) / 2])
    nums.push(p[0] - cur[0], p[1] - cur[1], m[0] - cur[0], m[1] - cur[1])
    cur = m
  }
  const last = r[r.length - 1] as Pt
  return `M${F(...(r[0] as Pt))}q${F(...nums)}l${F(last[0] - cur[0], last[1] - cur[1])}${close ? 'z' : ''}`
}
const E = (cx: number, cy: number, rx: number, ry: number) =>
  `M${F(cx - rx, cy)}a${F(rx, ry)} 0 1 0 ${F(2 * rx)} 0a${F(rx, ry)} 0 1 0 ${F(-2 * rx)} 0z`
/** Gò/đệm: đáy phẳng ở y, đỉnh gợn (bụi, cỏ, tuyết). */
const U = (x: number, y: number, w: number, h: number, r: () => number, n = 4): string => {
  const pts: Pt[] = [[x, y]]
  for (let i = 0; i <= n; i += 1) {
    const u = (i + 0.5) / (n + 1)
    pts.push([x + w * u, y - h * Math.sin(Math.PI * u) * (0.65 + r() * 0.55)])
  }
  pts.push([x + w, y])
  return S(pts, true)
}
/** Đệm rêu hữu cơ: đáy ở y, lưng gợn không đều; drip > 0 → vài tua rủ dưới đáy (theo vệt nước). */
const MO = (x: number, y: number, w: number, h: number, r: () => number, drip = 0): string => {
  const n = Math.max(2, Math.round(w / 20))
  const pts: Pt[] = [[x, y]]
  for (let i = 1; i < n; i += 1) pts.push([x + (w * i) / n + (r() - 0.5) * 4, y - h * (0.55 + r() * 0.6) * Math.sqrt(Math.sin((Math.PI * i) / n))])
  pts.push([x + w, y])
  if (drip) {
    const k = Math.max(1, Math.round(w / 45))
    for (let i = k; i > 0; i -= 1) {
      const c = x + (w * (i - 0.5)) / k + (r() - 0.5) * 6
      pts.push([c + 3, y], [c, y + drip * (0.5 + r() * 0.8)], [c - 3, y])
    }
  }
  return S(pts, true)
}
/** Chấm cọ nối tiếp (nét tròn đầu): [x, y, dx?, dy?][] → "M x y l… m… l…" tương đối; dx=dy=0 → chấm tròn. */
const D = (list: number[][]): string => {
  let d = ''
  let cx = 0
  let cy = 0
  list.forEach(([x = 0, y = 0, dx = 0, dy = 0], i) => {
    const X = Math.round(x)
    const Y = Math.round(y)
    const A = Math.round(dx)
    const B = Math.round(dy)
    d += i === 0 ? `M${F(X, Y)}` : `m${F(X - cx, Y - cy)}`
    d += B === 0 ? `h${F(A)}` : A === 0 ? `v${F(B)}` : `l${F(A, B)}`
    cx = X + A
    cy = Y + B
  })
  return d
}
/** Nhiều chùm lá toả từ các điểm (nét tròn đầu), nối tiếp tương đối. tip: [x, y, số lá, góc đầu, góc cuối, dài]. */
const fans = (tips: number[][], r: () => number): string => {
  let d = ''
  let px = 0
  let py = 0
  tips.forEach(([x = 0, y = 0, n = 3, a0 = -3, a1 = 0, len = 10], k) => {
    const X = Math.round(x)
    const Y = Math.round(y)
    d += k === 0 ? `M${F(X, Y)}` : `m${F(X - px, Y - py)}`
    for (let i = 0; i < n; i += 1) {
      const a = a0 + ((a1 - a0) * (i + 0.5)) / n + (r() - 0.5) * 0.25
      const l = len * (0.75 + r() * 0.4)
      const dx = Math.round(Math.cos(a) * l)
      const dy = Math.round(Math.sin(a) * l)
      d += `l${F(dx, dy)}${i < n - 1 ? `m${F(-dx, -dy)}` : ''}`
      if (i === n - 1) {
        px = X + dx
        py = Y + dy
      }
    }
  })
  return d
}
/** Cành thon (khối kín): gốc (x,y) rộng w0 → ngọn (x2,y2) rộng w1, cong theo pháp tuyến một đoạn `bend`. */
const limb = (x: number, y: number, x2: number, y2: number, w0: number, w1: number, bend = 0): string => {
  const l = Math.hypot(x2 - x, y2 - y)
  const nx = -(y2 - y) / l
  const ny = (x2 - x) / l
  const mx = (x + x2) / 2 + nx * bend
  const my = (y + y2) / 2 + ny * bend
  const wm = (w0 + w1) / 4
  const a = rd([x + (nx * w0) / 2, y + (ny * w0) / 2])
  const b = rd([x2 + (nx * w1) / 2, y2 + (ny * w1) / 2])
  const c = rd([x2 - (nx * w1) / 2, y2 - (ny * w1) / 2])
  const e = rd([x - (nx * w0) / 2, y - (ny * w0) / 2])
  return `M${F(...a)}q${F(mx + nx * wm - a[0], my + ny * wm - a[1], b[0] - a[0], b[1] - a[1])}l${F(c[0] - b[0], c[1] - b[1])}q${F(mx - nx * wm - c[0], my - ny * wm - c[1], e[0] - c[0], e[1] - c[1])}z`
}

/** Tên class cho độ dày nét / độ mờ (CSS sinh theo lần vẽ). */
const zName = (w: string) => `ga-z${w.replace('.', '_')}`
const oName = (o: string) => `ga-o${o.replace('.', '')}`

/**
 * Gom nét theo khoá; thứ tự vẽ = 'ao' trước hết, rồi các khoá theo lần đầu xuất hiện, cuối cùng 'sh' và 'hl' (dựng khối phủ lên).
 *  'b2' → class b2 · 'k1~.35' → kèm độ mờ · 'sh|2' → bucket riêng cùng class · 'ga-ms' → khối tô pattern rêu
 *  '~m2~4' → nét tròn đầu màu m2 dày 4 · '~m2~4~.6' → kèm độ mờ · '~b2~9~~b' → đầu nét bằng (tà vẹt).
 */
class Pa {
  private k: string[] = []
  private m = new Map<string, { d: string; z: Pt | null }>()
  private n = 0
  constructor(private Z: Set<string>) {}
  p(key: string, d: string): this {
    if (!d) return this
    let b = this.m.get(key)
    if (!b) {
      b = { d: '', z: null }
      this.m.set(key, b)
      this.k.push(key)
    }
    for (const sub of d.split(/(?=M)/)) {
      const mm = /^M(-?\d+) ?(-?\d+)/.exec(sub)
      if (mm && b.z) b.d += `m${F(Number(mm[1]) - b.z[0], Number(mm[2]) - b.z[1])}${sub.slice(mm[0].length)}`
      else b.d += sub
      b.z = mm && sub.endsWith('z') ? [Number(mm[1]), Number(mm[2])] : null
    }
    return this
  }
  r(s: string): this {
    if (!s) return this
    this.n += 1
    const key = `\u0000${this.n}`
    this.m.set(key, { d: s, z: null })
    this.k.push(key)
    return this
  }
  get s(): string {
    const late = ['sh', 'hl']
    const keys = [...this.k.filter(k => k === 'ao'), ...this.k.filter(k => k !== 'ao' && !late.includes(k)), ...late.filter(k => this.m.has(k))]
    return keys
      .map(key => {
        const b = this.m.get(key) as { d: string; z: Pt | null }
        if (key[0] === '\u0000') return b.d
        const base = key.split('|')[0] as string
        let cls: string
        if (base[0] === '~') {
          const [, c = '', w = '1', o, bt] = base.split('~')
          this.Z.add(`z${w}`)
          cls = `ga-${c} ${zName(w)}`
          if (o) {
            this.Z.add(`o${o}`)
            cls += ` ${oName(o)}`
          }
          if (bt) cls += ' ga-bt'
        } else {
          const [c = '', o] = base.split('~')
          cls = c
          if (o) {
            this.Z.add(`o${o}`)
            cls += ` ${oName(o)}`
          }
        }
        return `<path class="${cls}" d="${b.d}"/>`
      })
      .join('')
  }
}

const pad = (n: number) => String(n).padStart(2, '0')
/** Giờ tàu trên bảng phấn (phút trong ngày, giờ VN). Đèn tín hiệu xanh 3 phút trước; đoàn tàu bóng mờ lướt qua đúng giờ. */
const TIMES = [5 * 60 + 40, 11 * 60 + 15, 17 * 60 + 50, 22 * 60 + 5]

const PB = 744 // mép sau sân ga
const PF = 773 // mép trước mặt sân ga
const PD = 800 // chân thành sân ga
const PL0 = 330
const PL1 = 1440
const CK: Pt = [600, 627] // tâm đồng hồ ga
const LAMP: Pt = [1214, 663] // bóng đèn đường
const POSTS = [404, 640, 836, 1052]
const CAR = 1384 // mép trái toa tàu cũ trên đường nhánh
const CW = 246 // dài toa
const STROKES = ['m1', 'm2', 'm3', 'l1', 'l2', 'l3', 'g1', 'g3', 's1', 's2', 's3', 's4', 'k1', 'k2', 'x1', 'x2', 'p1', 'p3', 'w3', 'f1', 'f2', 'f3', 'd1', 'd2', 'r2', 'r3', 'a1', 'e1', 'e2', 'e4', 'b1', 'b2', 'b3']

/** defs theo phía nắng (sunL: nắng từ trái). Cụm cỏ/hoa/dải đồng cỏ sinh tất định, không đổi theo thời tiết. */
/** defs tĩnh của vùng + `meadow`: một bản dải đồng cỏ tiền cảnh đặt tại chỗ (khóm lắc gió bọc <g> ngoài <use>). */
function makeDefs(rng: (k: string) => () => number, sunL: boolean, snow: boolean): { defs: string; meadow: string } {
  const hx = sunL ? -3 : 1
  const sx = sunL ? 1 : -3
  const pl = 'M-5 0h3l2-268h-2z'
  const pr = 'M2 0h3l1-268h-2z'
  // cụm cỏ: khóm nhỏ sau – to trước
  const r = rng('ga-cum')
  let cl = ''
  for (const [id, n, w] of [['c1', 8, 90], ['c2', 6, 60], ['c3', 9, 120]] as const) {
    const t: [number, number, string][] = []
    for (let i = 0; i < n; i += 1) {
      const k = r()
      t.push([Math.round((r() - 0.5) * w), Math.round(r() * 10 - 5), k < 0.35 ? 't' : k < 0.75 ? 'T' : 'U'])
    }
    t.sort((p, q) => p[1] - q[1])
    cl += `<g id="ga-${id}">${t.map(([x, y, s]) => `<use href="#ga-${s}" x="${x}" y="${y}"/>`).join('')}</g>`
  }
  // dải đồng cỏ tiền cảnh (dày ở góc x≈0, thưa dần về 700); dùng thuận bên trái, lật gương bên phải
  const m: [number, number, string][] = []
  for (let i = 0; i < 13; i += 1) {
    const u = r()
    m.push([Math.round(10 + u * u * 660), Math.round(884 + r() * 126), ['c1', 'c2', 'c3', 'c4', 'c5'][Math.floor(r() * 5)] as string])
  }
  m.sort((p, q) => p[1] - q[1])
  // Nội dung được <use> tham chiếu phải TĨNH: khóm thứ 2 (lắc gió, sw1) và khóm đầu (vẽ trước nó) đặt tại chỗ,
  // sw1 nằm trên <g> bọc ngoài <use>; 11 khóm còn lại (vẽ sau, tĩnh) gom vào ga-mL. Giữ nguyên thứ tự vẽ.
  const mu = ([x, y, id]: [number, number, string]) => `<use href="#ga-${id}" x="${x}" y="${y}"/>`
  const meadow = `<g id="ga-mL">${m.slice(2).map(mu).join('')}</g>`
  const mw = `${mu(m[0] as [number, number, string])}<g class="sw1">${mu(m[1] as [number, number, string])}</g><use href="#ga-mL"/>`
  // cụm lá đại (sứ) ở ngọn cành: lá thuôn hai đầu toả lên
  const lv = (a: number, l: number, w: number) => {
    const tx = Math.cos(a) * l
    const ty = Math.sin(a) * l
    const nx = -Math.sin(a) * w
    const ny = Math.cos(a) * w
    return `M0 0q${F(tx / 2 + nx, ty / 2 + ny, tx, ty)}q${F(-tx / 2 - nx, -ty / 2 - ny, -tx, -ty)}z`
  }
  const dg = Math.PI / 180
  const lc =
    `<g id="ga-lc"><path class="l3" d="${[-170, -128, -62, -14].map(a => lv(a * dg, 19, 5)).join('')}"/>` +
    `<path class="l2" d="${[-148, -98, -38].map(a => lv(a * dg, 15, 4)).join('')}"/><path class="hl" d="${lv(-98 * dg, 13, 1)}"/></g><use id="ga-lC" href="#ga-lc" transform="scale(-1 1)"/>`
  // lon nước 3 màu xen kẽ (mỗi kệ lệch pha) + vạch kệ — dùng hai lần: ban ngày & sau kính sáng ban đêm
  const can = (c: string, s0: number) => `<path class="ga-${c} ga-bt ga-z11" stroke-dasharray="6 18" d="${[0, 1, 2].map(row => `M${1503 + ((s0 + row * 8) % 24)} ${657 + row * 19}H1543`).join('')}"/>`
  const defs =
    `<pattern id="ga-ng" width="11" height="9" patternUnits="userSpaceOnUse" x="1" y="595"><path class="r1" d="M3 0h5v7q-2.5 3-5 0z"/><path class="r3" d="M3 7q2.5 3 5 0v2H3z"/><path class="hl" d="M${sunL ? 3 : 7} 0h1v8h-1z"/></pattern>` +
    (snow ? `<pattern id="ga-ns" width="11" height="9" patternUnits="userSpaceOnUse" x="1" y="595"><path class="w3" d="M2 0h7v2q-3.5 3-7 0z"/></pattern>` : '') +
    `<pattern id="ga-bk" width="34" height="29" patternUnits="userSpaceOnUse" y="${PB}"><path class="z2" opacity=".42" d="M0 8H34M0 17H34M0 0v8M17 0v8M8 8v9M25 8v9M3 17v12M20 17v12"/></pattern>` +
    `<pattern id="ga-bl" width="23" height="13" patternUnits="userSpaceOnUse"><path class="s3" d="M1 3l4-2 4 1-1 3-5 1zM12 8l5-1 3 2-2 3-5-1z"/><path class="s4" d="M8 9h3l1 3-4 1zM16 1l4 1-1 3-3-1z"/><path class="s2" d="M3 8l3-1 2 2-3 2z"/></pattern>` +
    `<pattern id="ga-b2" href="#ga-bl" patternTransform="translate(9 5) scale(1.1 .9)"/>` +
    `<pattern id="ga-sl" width="27" height="52" patternUnits="userSpaceOnUse" y="806"><path class="ao" d="M5 3h12l4 49H8z"/><path class="b2" d="M3 0h10l4 50H6z"/><path class="b1" d="M${sunL ? 11 : 3} 0h2l4 50h-3z"/><path class="b3" d="M${sunL ? 3 : 11} 0h2l2 50H${sunL ? 6 : 14}z" opacity=".6"/><path class="k2" d="M2 4h13v3H2zM5 37h13v3H5z"/></pattern>` +
    `<pattern id="ga-s1" href="#ga-sl" patternTransform="translate(11 0) scale(1.04 1)"/><pattern id="ga-s2" href="#ga-sl" patternTransform="translate(19 0) scale(.96 1)"/><pattern id="ga-s3" href="#ga-sl" patternTransform="translate(6 0) scale(1.02 1)"/>` +
    `<pattern id="ga-st" width="80" height="27" patternUnits="userSpaceOnUse" y="${PF + 5}"><path class="z2" opacity=".45" d="M0 11H80M22 0v11M62 0v11M5 11v16M44 11v16"/><path class="hl" d="M0 0h80v2H0zM0 11h80v2H0z"/></pattern>` +
    `<pattern id="ga-rf" width="30" height="11" patternUnits="userSpaceOnUse" y="679"><path class="b1" d="M0 0h3v11H0z"/></pattern>` +
    `<pattern id="ga-cg" width="6" height="5" patternUnits="userSpaceOnUse" y="657"><path class="k2" opacity=".55" d="M0 0h2v5H0z"/></pattern>` +
    // rêu: thân m2, đốm sáng m1 & hõm m3 (3 sắc độ trong một lần tô)
    `<pattern id="ga-ms" width="12" height="8" patternUnits="userSpaceOnUse"><path class="m2" d="M0 0h12v8H0z"/><path class="m3" d="M3 5h3v2H3zM9 1h2v2H9zM0 3h1v2H0z"/><path class="m1" d="M1 2h2v1H1zM6 3h2v1H6zM10 6h1v1h-1zM4 0h1v1H4z"/></pattern>` +
    `<g id="ga-t"><path class="g4" d="M-7 0q7-5 14 0z"/><path class="g3" d="M-5 0q-2-8-8-15q8 6 12 15zM-2 0q1-12 3-22q1 11 2 22zM1 0q4-7 10-12q-5 7-6 12zM-3 0q-2-7-3-13q4 6 3 13z"/><path class="g1" d="M-2 0q1-12 3-22q-1 12 0 22zM2 0q4-7 9-12q-5 6-7 12z"/></g>` +
    `<g id="ga-T"><use href="#ga-t" transform="scale(1.25 1.7)"/></g><g id="ga-U"><use href="#ga-t" transform="scale(1.8 2.4)"/></g>` +
    cl +
    `<use id="ga-c4" href="#ga-c1" transform="scale(-1 1)"/><use id="ga-c5" href="#ga-c3" transform="scale(-1 1)"/>` +
    meadow +
    lc +
    `<g id="ga-fw"><path class="ga-g3 ga-z1_3" d="M0 0q-2-8-6-14M0 0q1-9 0-17M1 0q3-7 6-12M2 0q5-4 9-7"/><path class="ga-f1 ga-z5" d="M-6-14h0M6-12h0"/><path class="ga-f2 ga-z4" d="M0-17h0M11-7h0"/><path class="ga-f3 ga-z2_6" d="M-2-9h0M4-15h0M8-5h0M-6-14h0M6-12h0"/></g>` +
    `<g id="ga-R"><path class="ga-d2 ga-z1_3" d="M0 0q2-30 6-50M6-64l1-6"/><path class="ga-b1 ga-z5" d="M6-50l2-13"/><path class="d1" d="M1 0q-6-16-15-25q11 7 17 25z"/></g>` +
    `<radialGradient id="ga-csg"><stop offset=".5" style="stop-color:var(--k1)" stop-opacity=".15"/><stop offset="1" style="stop-color:var(--k1)" stop-opacity="0"/></radialGradient>` +
    // bóng tiếp xúc mép mềm dưới bụi lau sát ống kính (lớp 4): đậm ở tâm (dưới mép khung), tan hẳn ra mọi phía
    `<radialGradient id="ga-l4s"><stop offset="0" style="stop-color:var(--k1)" stop-opacity=".4"/><stop offset=".6" style="stop-color:var(--k1)" stop-opacity=".2"/><stop offset="1" style="stop-color:var(--k1)" stop-opacity="0"/></radialGradient>` +
    `<g id="ga-po"><path class="x2" d="M-3 0h6v94h-6z"/><path class="hl" d="M${hx} 0h2v94h-2z"/><path class="sh" d="M${sx} 0h2v94h-2z"/><path class="s3" d="M-5 86h10v9h-10z"/><path class="hl" d="M-5 86h10v2h-10z"/><path class="ga-k" d="M-15 1q12 0 15 13q3-13 15-13"/></g>` +
    `<g id="ga-pl"><path class="ga-k1 ga-z5" opacity=".3" d="M-12-1h24"/><path class="b2" d="M-5 0h10l1-268h-6zM-22-258h48v5h-48z"/><path class="b3" d="${sunL ? pl : pr}"/><path class="sh" d="${sunL ? pr : pl}M-22-253h48v2h-48z"/><path class="ga-s1 ga-z4" d="M-15-266v-2m16-7v-2m18 11v-2"/><path class="x2" d="M-4-136h8v10h-8z"/><path class="ga-ms" d="M-9 1q0-8 5-7q3-6 7-1q5-2 6 8z"/></g>` +
    `<g id="ga-cn">${can('p1', 0) + can('p3', 8) + can('x2', 16)}</g><path id="ga-sf" d="${R(1500, 663, 44, 3) + R(1500, 682, 44, 3) + R(1500, 701, 44, 3)}"/>` +
    `<path id="ga-cw" class="ga-bt ga-z20" stroke-dasharray="22 12" d="M${CAR + 12} 851h${CW - 44}"/>`
  return { defs, meadow: mw }
}

const CSS =
  `text[class^=ga-h]{font-family:Arial,Helvetica,sans-serif;font-weight:700}` +
  `.ga-h1{font-size:16px;letter-spacing:3px;opacity:.82}.ga-h2{font-size:7.2px;letter-spacing:.3px;opacity:.7}.ga-h3{font-size:4.6px;opacity:.55;text-anchor:end}.ga-h1,.ga-h2,.ga-h5,.ga-h8{text-anchor:middle}` +
  `.ga-h4{font-size:4.6px;fill:var(--s1);opacity:.78}.ga-h5{font-size:7px;fill:var(--k2);opacity:.42}.ga-h6{font-size:4.4px;fill:var(--p3);opacity:.85;text-anchor:middle}.ga-h7{font-size:6px;fill:var(--p3);opacity:.55}.ga-h8{font-size:11px;fill:var(--k2);opacity:.8}` +
  `path[class^=ga-],.ga-br{fill:none;stroke-linecap:round;stroke-linejoin:round}path.ga-bt,.ga-bt{stroke-linecap:butt}path.ga-ms{fill:url(#ga-ms);stroke:none}path.ga-fb{fill:url(#ga-bl)}path.ga-fB{fill:url(#ga-b2)}path.ga-fk{fill:url(#ga-bk)}` +
  STROKES.map(c => `.ga-${c}{stroke:var(--${c})}`).join('') +
  `.ga-w{stroke:var(--k2);stroke-width:.9}.ga-k{stroke:var(--k2);stroke-width:2}` +
  `.ga-y{stroke-dasharray:24 14 31 12 18 17 27 13}.ga-dt{stroke-dasharray:1 7 2 11 1 5}.ga-dm{stroke-dasharray:1 9 3 6 1 14 2 5 1 11 4 8 1 17}.ga-ld{stroke-dasharray:1 11}.ga-tw{stroke-dasharray:17 11}.ga-pw{stroke-dasharray:2 9 3 14}.ga-sk{stroke-dasharray:1 15}.ga-sd{stroke-dasharray:14 13}` +
  `.ga-tk{fill:none;stroke:var(--k2);stroke-width:2.2;stroke-dasharray:1.2 4.56}` +
  // kim đồng hồ quay quanh tâm mặt đồng hồ (toạ độ người dùng), giờ/phút/giây thật
  `.ga-hh,.ga-mm,.ga-ss{transform-box:view-box;transform-origin:${CK[0]}px ${CK[1]}px;animation:ga-rot 3600s linear infinite;stroke:var(--k1)}` +
  `.ga-hh{stroke-width:2.4;animation-duration:43200s}.ga-mm{stroke-width:1.5}.ga-ss{stroke:var(--p1);stroke-width:.7;animation-duration:60s;animation-timing-function:steps(60)}` +
  `.ga-mo{transform-box:view-box;transform-origin:0 0;animation:ga-rot 2.3s linear infinite;stroke:var(--p3)}@keyframes ga-rot{to{transform:rotate(360deg)}}` +
  `.ga-sw{transform-box:fill-box;transform-origin:50% 0;animation:ga-sw 4.6s ease-in-out infinite alternate}` +
  `@keyframes ga-sw{from{transform:rotate(calc(-1deg - var(--wind)*5deg))}to{transform:rotate(calc(1deg + var(--wind)*5deg))}}` +
  // dây điện võng thở theo gió (gốc ở đầu cột: điểm treo đứng yên)
  `.ga-ws{transform-box:view-box;transform-origin:0 505px;animation:ga-ws 7.9s ease-in-out infinite alternate}@keyframes ga-ws{to{transform:scaleY(calc(1.004 + var(--wind)*.012))}}` +
  `path.ga-dr{fill:var(--a1)}.ga-dr{animation:ga-dr 1.1s linear infinite}@keyframes ga-dr{from{transform:translateY(0);opacity:0}12%{opacity:1}to{transform:translateY(86px);opacity:.2}}` +
  `.ga-hu{animation:ga-hu 9.7s steps(1) infinite}@keyframes ga-hu{0%{opacity:1}88%{opacity:.55}89%{opacity:1}91%{opacity:.75}92%{opacity:1}}` +
  // bóng mây trôi qua đồng cỏ · lá rơi theo gió
  // Bóng mây chỉ đi trong vùng: tâm từ x −430 tới 1370 (mép phải elip chạm 1800 đúng lúc mờ hẳn), hiện dần rồi tan dần, nghỉ
  // 44% chu kỳ (khoảng trống giữa hai đám mây). Trước đây nó trượt tới 2760 và bị nền cỏ Làng Ngói (vẽ sau, đặc) cắt thành
  // đường dọc ở x 1800 mỗi khi camera lia qua ranh giới.
  `.ga-cs{animation:ga-cs 150s linear infinite}@keyframes ga-cs{0%{transform:translateX(-1290px);opacity:0}9%,47%{opacity:1}56%,to{transform:translateX(510px);opacity:0}}` +
  `.ga-lf{transform-box:fill-box;transform-origin:50% 50%;animation:ga-lf 11s linear infinite}@keyframes ga-lf{from{transform:none;opacity:0}8%,86%{opacity:1}to{transform:translate(calc(-30px - var(--wind)*110px),200px) rotate(620deg);opacity:0}}` +
  // tín hiệu & chuyến tàu bóng mờ (chỉ kích hoạt khi giờ tàu rơi vào cửa sổ vẽ)
  `.ga-g{opacity:0}@keyframes ga-on{0%,to{opacity:1}}@keyframes ga-of{0%,to{opacity:0}}` +
  `@keyframes ga-tn{0%{transform:translateX(-200px);opacity:0}14%,64%{opacity:1}to{transform:translateX(2800px);opacity:0}}@keyframes ga-wv{50%{transform:translateY(1.2px)}}`

export const region: Region = {
  id: 'ga-cu',
  name: 'Ga cũ',
  x0: 0,
  x1: 1800,
  shots: [{ id: 'ga-cu', name: 'Ga Rêu', x: 900, y: 520, zoom: 1 }],
  build(ctx) {
    const pr = ctx.cur.precip
    const snow = pr === 'tuyet'
    // có tuyết thì cảnh mặc áo đông (kể cả khi ép thời tiết trái mùa)
    const se = snow ? 'dong' : ctx.season
    const lite = ctx.detail === 'lite'
    const night = ctx.daylight < 0.6
    const rain = pr === 'mua' || pr === 'mua-to'
    const wet = ctx.wet > 0.25 || rain || pr === 'phun'
    const ha = se === 'ha'
    const dong = se === 'dong'
    const thu = se === 'thu'
    const xuan = se === 'xuan'
    const ph = ctx.ph
    const hF = ctx.vn.hourF
    const cl = ctx.cur.cloud
    // ── nắng thật: sáng từ trái (đông), chiều từ phải (tây). kx = độ ngả bóng ngang / đơn vị chiều cao ──
    const sunny = ctx.sunAlt > 0.02 && cl !== 'u-am' && !rain && ctx.cur.fog < 0.6
    const shK = sunny ? (cl === 'nhieu' ? 0.5 : 1) : 0
    const sunL = !sunny || hF < 12.3
    const kx = clamp((12.3 - hF) * 0.14, -0.8, 0.8)
    const golden = sunny && cl !== 'nhieu' && (hF > 15.6 || hF < 7.8)
    // defs tĩnh (hàm thuần: rng mới theo khoá) — dựng trước để mục G đặt được dải đồng cỏ tại chỗ
    const md = makeDefs(ctx.rng, sunL, snow)
    const Z = new Set<string>(['z11', 'z1.3', 'z5', 'z4', 'z2.6', 'z20']) // nét dùng trong defs
    const pa = () => new Pa(Z)
    const zc = (w: string) => {
      Z.add(`z${w}`)
      return zName(w)
    }
    const oc = (o: string) => {
      Z.add(`o${o}`)
      return oName(o)
    }
    // độ trễ hoạt ảnh từng phần tử → CSS (liền mạch qua các lần vẽ lại)
    let css = CSS
    let nd = 0
    const dl = (period: number, key = '', delay = ph(period, key)) => {
      nd += 1
      css += `.ga-n${nd}{animation-delay:${delay}}`
      return `ga-n${nd}`
    }
    /** dải sáng / tối ở mép hướng nắng / khuất nắng của hộp [x, x+w]; viền nắng chiều lúc hoàng hôn. */
    const Lx = (x: number, w: number, s: number) => (sunL ? x : x + w - s)
    const Kx = (x: number, w: number, s: number) => (sunL ? x + w - s : x)
    const box = (a: Pa, x: number, y: number, w: number, h: number, hs = 2, ss = 3) => {
      a.p('hl', R(Lx(x, w, hs), y, hs, h)).p('sh', R(Kx(x, w, ss), y, ss, h))
      if (golden) a.p('~e1~1.6~.5', `M${F(sunL ? x + 0.8 : x + w - 0.8, y)}v${F(h)}`)
    }
    // ── giờ tàu: khoảng cách (giây) từ đầu cửa sổ tới lúc tàu qua ──
    const nowS = ctx.vn.h * 3600 + ctx.vn.mi * 60 + ctx.vn.s
    const offs = TIMES.map(t => ((((t * 60 - nowS) % 86400) + 129600) % 86400) - 43200)
    const train = offs.find(o => o > -40 && o < ctx.span + 5)
    const sig = offs.find(o => o - 180 < ctx.span && o + 32 > 0)
    if (sig !== undefined) {
      const d = `${Math.round(sig - 180)}s - var(--t)*1s`
      css += `.ga-g{animation:ga-on 212s linear;animation-delay:calc(${d})}.ga-r{animation:ga-of 212s linear;animation-delay:calc(${d})}`
    }
    if (train !== undefined) css += `.ga-tn{animation:ga-tn 32s linear both;animation-delay:calc(${Math.round(train)}s - var(--t)*1s)}.ga-wv{animation:ga-wv .4s 55 linear;animation-delay:calc(${Math.round(train + 6)}s - var(--t)*1s)}`

    const pieces: Piece[] = []
    const add = (x0: number, x1: number, prio: number, svg: string, glow = '', layer: 3 | 4 = 3) =>
      pieces.push(glow ? { layer, x0, x1, prio, svg, glow } : { layer, x0, x1, prio, svg })
    const wireY = (x: number) => {
      const t = (x - 249) / (1693 - 249)
      return (1 - t) * (1 - t) * 499 + 2 * t * (1 - t) * 600 + t * t * 503
    }

    // Đạo cụ tĩnh (không đổi theo giờ/thời tiết, chỉ theo phía nắng) → <g> trong defs, đặt bằng <use>.
    let pdefs = ''
    const prop = (id: string, s: string) => {
      pdefs += `<g id="ga-${id}">${s}</g>`
      return `<use href="#ga-${id}"/>`
    }

    // ════════ A. HẬU CẢNH: dây điện võng, gò cỏ, cây đại (sứ) cành thon, cột điện, đèn tín hiệu, bụi cây cao bên phải ════════
    {
      const r = ctx.rng('ga-dai')
      const a = pa()
      const w = `<path class="ga-w ga-ws" d="M233 508Q100 536-20 524M249 499Q100 526-20 512M233 508Q970 614 1677 512M249 499Q970 600 1693 503M267 508Q970 612 1711 512"/>`
      a.r(`${train !== undefined ? `<g class="ga-wv">${w}</g>` : w}<path class="ga-w" d="M254 538Q330 590 398 652M1693 524L1762 778"/>`)
      a.p('g4', U(-20, 806, 380, 44, r, 5))
      // cây đại: thân xám, cành mọng chẻ đôi, thon dần; mặt sáng về phía nắng, rêu ở nách cành
      const L: [number, number, number, number, number, number, number][] = [
        [338, 774, 334, 690, 16, 12, -3],
        [334, 692, 300, 640, 11, 8, 4],
        [336, 692, 372, 632, 11, 8, -5],
        [300, 642, 268, 598, 8, 5.5, 3],
        [301, 642, 306, 596, 7, 5, -2],
        [269, 600, 250, 572, 5.5, 4, 2],
        [372, 634, 410, 588, 8, 5.5, -4],
        [372, 634, 362, 584, 6.5, 4.5, 2],
        [410, 590, 436, 560, 5.5, 4, -2],
        [336, 722, 298, 704, 7, 4.5, 3],
      ]
      const sx = sunL ? -1 : 1
      const tr = pa()
      tr.p('ao', E(338, 774, 22, 4)).p('s3', L.map(q => limb(...q)).join(''))
      tr.p('s2', L.slice(0, 3).map(([x, y, x2, y2, w0, w1, b]) => limb(x + (sx * w0) / 3.2, y, x2 + (sx * w1) / 3.2, y2, w0 * 0.32, w1 * 0.3, b)).join(''))
      tr.p('sh', L.slice(0, 2).map(([x, y, x2, y2, w0, w1, b]) => limb(x - (sx * w0) / 3.4, y, x2 - (sx * w1) / 3.4, y2, w0 * 0.28, w1 * 0.25, b)).join(''))
      tr.p('ga-ms', MO(326, 694, 18, 6, r) + MO(292, 645, 14, 4, r) + MO(364, 636, 14, 4, r) + MO(320, 775, 32, 9, r))
      a.r(prop('pT', tr.s))
      const tips: number[][] = [[250, 572], [306, 596], [436, 560], [362, 584], [298, 704], [270, 600], [410, 589]]
      if (dong) {
        // đông: trơ cành, u mắt cành và chồi ngủ ở ngọn
        a.p('~s4~3', D([[331, 731], [318, 662], [356, 652], [388, 612]])).p('~s2~4.5', D(tips)).p('~l3~2.2', D(tips.map(([x = 0, y = 0]) => [x + 1, y - 4])))
      } else {
        a.r(tips.map(([x = 0, y = 0], i) => `<use href="#ga-l${i % 2 ? 'C' : 'c'}" x="${x}" y="${y}"/>`).join(''))
        const nf = ha ? 3 : xuan ? 2 : thu ? 1 : 0
        const fl: number[][] = []
        for (const [x = 0, y = 0] of tips.slice(0, 5)) for (let j = 0; j < nf; j += 1) fl.push([x + (r() - 0.5) * 18, y - 6 - r() * 10])
        a.p(`~${xuan ? 'f1' : 'f3'}~4.6`, D(fl))
      }
      // cột điện đầu tuyến + đèn tín hiệu đường sắt (đỏ; xanh 3 phút trước giờ tàu) + hộp rơ-le + thang
      const sg = pa()
      sg.p('~k1~4~.3', 'M120 799h44').p('x2', R(122, 778, 22, 20) + R(146, 634, 4, 165)).r(`<path class="ga-x1 ga-bt ga-ld ${zc('6')}" d="M154 652V790"/>`)
      sg.p('k1', 'M136 638q0-4 4-4h16q4 0 4 4v38q0 4-4 4h-16q-4 0-4-4z').p('k2', 'M139 643q9-9 18 0zm0 20q9-9 18 0z').p('~k2~11', 'M148 649h0m0 20h0').p('ga-ms', MO(118, 800, 30, 7, r))
      box(sg, 122, 778, 22, 20, 4, 5)
      sg.p('hl', R(137, 636, 2, 42))
      a.r(`<use href="#ga-pl" x="248" y="776"/>${prop('pS', sg.s)}<path class="ga-p1 ga-r ${zc('11')}" d="M148 649h0"/><path class="ga-e4 ga-g ${zc('11')}" d="M148 669h0"/>`)
      // bụi cây sau máy bán hàng: nhiều u, đốm lá sáng không đều về phía nắng; che kín mép làng xa
      const rb = ctx.rng('ga-bui')
      const bu = pa()
      // tán = cụm vòm tròn chồng nhau (mép gợn như mây lá); mảng sáng ở nửa trên phía nắng
      const O = (l: number[][]) => l.map(([x = 0, y = 0, q = 0]) => ((X: number, Y: number, Q: number) => `M${X - Q} ${Y}a${Q} ${Q} 0 1 0 ${2 * Q} 0a${Q} ${Q} 0 1 0 ${-2 * Q} 0`)(Math.round(x), Math.round(y), Math.round(q))).join('')
      // hai vòm cuối & thân dưới thu về ≤ 1800 ở mọi y > 760: vùng bên cạnh vẽ mặt đất (cỏ/tuyết) từ ground−2 ĐÈ lên sau
      const body = [[1530, 760, 32], [1582, 740, 52], [1642, 730, 62], [1704, 737, 55], [1758, 748, 44], [1780, 738, 30], [1600, 676, 44], [1668, 650, 52], [1732, 686, 40], [1632, 608, 34]]
      // mảng sáng hình trăng khuyết: vòm sáng lệch về phía nắng rồi khoét lại bằng vòm thân lệch ngược
      const top = (sunL ? [6, 7, 9, 1] : [8, 7, 9, 3]).map(i => body[i] as number[])
      bu.p('l3', R(1494, 760, 264, 32) + O(body)).p('l2', O(top.map(([x = 0, y = 0, q = 0]) => [x + sx * q * 0.16, y - q * 0.16, q * 0.84])))
      bu.p('l3|c', O(top.map(([x = 0, y = 0, q = 0]) => [x - sx * q * 0.1, y + q * 0.12, q * 0.9])))
      const sp: number[][] = []
      for (let i = 0; i < 9; i += 1) sp.push([(sunL ? 1566 : 1654) + rb() * 96, 640 + rb() * 100])
      bu.p('~l2~11', D(sp.slice(0, 5))).p('~l1~7', D(sp.slice(4))).p('k1~.25', E(1652, 793, 144, 5))
      let tu = `${prop('pB', bu.s)}<use href="#ga-pl" x="1692" y="780"/>`
      for (let i = 0; i < (lite ? 2 : 4); i += 1) {
        const u = `<use href="#ga-T" x="${Math.round(1650 + i * 36 + rb() * 10)}" y="${Math.round(781 + rb() * 4)}"/>`
        tu += i ? u : `<g class="sw3">${u}</g>` // class động trên <g> bọc ngoài, không đặt thẳng lên <use>
      }
      a.r(tu)
      if (snow) a.p('w3', `${tips.map(([x = 0, y = 0]) => U(x - 6, y + 2, 12, 5, r, 2)).join('')}M136 636q0-3 4-3h16q4 0 4 3zM121 777h24v-3h-24zM224 519h50v-4h-50z${U(1566, 646, 96, 12, rb, 3)}${U(1676, 606, 80, 10, rb, 2)}M1668 519h50v-4h-50z`)
      add(-20, 1820, 6, a.s, `<circle class="ga-r" cx="148" cy="649" r="40" fill="url(#gw)"/><g class="ga-g"><circle cx="148" cy="669" r="44" fill="url(#gg)"/><path class="ga-e4 ${zc('10')}" d="M148 669h0"/></g>`)
    }

    // ════════ B. NHÀ GA: tường vôi vàng ố, mái ngói âm dương rêu phong, đầu hồi 1931 có đồng hồ chạy giờ thật ════════
    {
      const r = ctx.rng('ga-nha')
      const a = pa()
      const h = pa() // thân nhà tĩnh → defs
      const [cx, cy] = CK
      h.p('w1', `${R(392, 640, 408, 104)}M562 662V606q38-48 76 0v56z`).p('w2~.7', P([[418, 660], [426, 660], [424, 712], [420, 700]]) + P([[688, 660], [695, 660], [693, 716], [690, 704]]) + P([[400, 728], [420, 716], [540, 718], [566, 728]]))
      h.p('w2', P([[456, 699], [480, 697], [484, 708], [470, 714], [458, 711]])).p('s3', R(392, 726, 408, 18))
      h.p('w3', `M412 728V707q0-11 20-11t20 11v21z${R(574, 688, 52, 56)}${R(555, 602, 16, 4)}${R(629, 602, 16, 4)}M566 603q34-42 68 0l-2 2q-32-39-64 0z`).p('b2', R(650, 696, 62, 34)).p('p3', R(728, 698, 50, 32))
      h.p('p2', R(578, 692, 20, 52) + R(603, 692, 19, 52) + R(716, 698, 12, 32) + R(778, 698, 12, 32))
      h.p('k2', `M416 727V708q0-8 16-8t16 8v19z${R(732, 701, 42, 26)}`).p('k1', R(598, 692, 5, 52) + R(653, 699, 56, 28))
      h.p('p3|m', R(752, 701, 2, 26) + R(732, 713, 42, 2)).p('s1', R(408, 726, 48, 3) + R(726, 730, 54, 3))
      // vệt nước chảy dưới bậu cửa & dưới mũ đầu hồi; song cửa sổ vòm; bảng phấn giờ tàu
      h.p('~k2~3~.2', 'M738 734v9m22-9v7m-330-6v8M574 607v20m52-20v14').p('~x1~1.5', 'M422 702v24m10-26v26m10-24v24')
      h.r(`<text class="ga-h4" x="656" y="706">GIỜ TÀU</text><text class="ga-h4" x="656" y="715">05:40 11:15</text><text class="ga-h4" x="656" y="723">17:50 22:05</text>`)
      // chổi tre dựng cạnh cửa (ai đó vẫn quét sân mỗi sáng)
      h.p('~b3~1.8', 'M549 743l17-56').p('~d2~1.2', 'M544 743l7-14m-4 14l5-14m-1 14l3-14m3 14l1-14')
      // mái ngói (hai nửa), bờ nóc, viên ngói lệch/sứt/khác màu
      const roof = P([[368, 650], [392, 606], [398, 595], [562, 597], [562, 652]]) + P([[638, 597], [794, 595], [800, 606], [824, 650], [638, 652]])
      h.p('r2', roof).r(`<path fill="url(#ga-ng)" d="${roof}"/>`)
      const odd: number[][] = []
      for (let i = 0; i < 26; i += 1) {
        const left = i % 2 === 0
        const c = Math.floor(r() * (left ? 14 : 13))
        const j = Math.floor(r() * 5)
        const x = (left ? 401 : 643) + c * 11 + 5 + (r() - 0.5) * 2
        if (x <= (left ? 556 : 790) - j * 3) odd.push([x, 598 + j * 9 + r() * 2, 0, 3])
      }
      h.p('~r3~4.6', lite ? '' : D(odd)).p('~r3~8', 'M388 593q87-7 174-5m76 0q87-2 174 5').p('r3', 'M388 594q-8-1-11-11q7 4 13 5zM808 594q8-1 11-11q-7 4-13 5z')
      // rêu hữu cơ: đệm dày trên bờ nóc, chân ống khói, kẽ giữa mái & đầu hồi, mép ngói khuất nắng; tua rủ theo vệt nước
      for (const [x = 0, y = 0, w = 0, hh = 0, dr = 0] of [[418, 598, 54, 7, 0], [520, 596, 40, 6, 3], [686, 600, 72, 8, 0], [436, 614, 24, 6, 0], [540, 652, 24, 8, 5], [634, 652, 26, 9, 6],[sunL ? 742 : 380, 652, 58, 6, 7], [sunL ? 380 : 742, 652, 30, 4, 4], [584, 582, 32, 4, 0]])
        if (!lite || w > 50) h.p('ga-ms', MO(x, y, w, hh, r, dr))
      h.p('m1~.75', MO(430, 593, 26, 4, r) + MO(700, 594, 34, 4, r) + MO(526, 592, 18, 3, r))
      // ống khói lò (ai đó vẫn ở đây), năm xây, mặt đồng hồ
      h.p('x2', R(442, 586, 9, 41)).p('k2|c', P([[437, 587], [456, 587], [452, 580], [441, 580]])).r(`<text class="ga-h5" x="600" y="606">1931</text>`)
      h.p('~k2~32', `M${cx} ${cy}h0`).p('~p3~27', `M${cx} ${cy}h0`).r(`<circle class="ga-tk" cx="${cx}" cy="${cy}" r="11"/>`)
      // dựng khối theo hướng nắng: đầu mái, nửa đầu hồi, mép tường, ống khói
      const endL = P([[368, 650], [398, 595], [430, 596], [404, 651]])
      const endR = P([[794, 595], [824, 650], [784, 651], [766, 596]])
      const gL = 'M562 662V606q8-11 16-17v73z'
      const gR = 'M638 662V606q-8-11-16-17v73z'
      h.p('sh', `${R(370, 640, 452, 20) + R(581, 697, 14, 43) + R(606, 697, 13, 43) + (sunL ? endR + gR : endL + gL)}M613 620a13.5 13.5 0 0 1-20 18q14 0 20-18z`)
      h.p('hl', `${R(392, 726, 408, 2) + (sunL ? endL + gL : endR + gR)}M590 617a13 13 0 0 1 15-4q-11 1-15 9z${P([[734, 726], [748, 703], [754, 703], [740, 726]])}`)
      box(h, 392, 640, 408, 104, 10, 14)
      box(h, 442, 586, 9, 41, 3, 4)
      if (golden) h.p('~e1~2~.45', sunL ? 'M369 649l30-55M563 660V606' : 'M823 649l-30-55M637 660V606')
      a.r(h.s)
      // phần sống: cửa sổ lên đèn, cỏ trên mái lắc gió, kim đồng hồ chạy giờ thật, tuyết
      if (night) a.p('e2', `M416 727V708q0-8 16-8t16 8v19z${R(732, 701, 42, 26)}`).p('p3|m', R(752, 701, 2, 26) + R(732, 713, 42, 2))
      if (!lite) a.r(`<use href="#ga-t" x="532" y="592"/>`)
      const hd = `calc(-${((ctx.now / 1000 + 25200) % 43200).toFixed(1)}s - var(--t)*1s)`
      a.r(`<path class="ga-hh ${dl(43200, '', hd)}" d="M${cx} ${cy + 2}v-9"/><path class="ga-mm ${dl(3600)}" d="M${cx} ${cy + 3}v-14"/><path class="ga-ss ${dl(60)}" d="M${cx} ${cy + 3}v-15"/><circle class="k1" cx="${cx}" cy="${cy}" r="1.4"/>`)
      if (snow) {
        a.r(`<path fill="url(#ga-ns)" d="${roof}"/>`)
        a.p('w3', `M568 600q32-38 64 0q-32-33-64 0z${S([[386, 592], [500, 582], [562, 584], [562, 596], [410, 601]], true)}${S([[638, 584], [700, 582], [810, 592], [790, 601], [638, 596]], true)}${R(437, 576, 19, 5)}${R(555, 599, 16, 4)}${R(629, 599, 16, 4)}M368 650l12-20 12 18zM824 650l-12-20-12 18z`)
        a.p('~w3~2', D([[380, 652, 0, 7], [404, 652, 0, 4], [790, 652, 0, 8], [812, 651, 0, 5]]))
      }
      const glow = night
        ? `<circle cx="753" cy="714" r="62" fill="url(#gw)"/><circle cx="432" cy="716" r="40" fill="url(#gw)" opacity=".7"/><path class="e2" opacity=".85" d="${R(732, 701, 42, 26)}M416 727V708q0-8 16-8t16 8v19z"/><path class="k1" d="${R(752, 701, 2, 26)}m-20 12h42v2h-42z"/>` +
          `<path class="e1" opacity=".7" d="${R(599, 693, 3, 50)}"/><circle cx="${cx}" cy="${cy}" r="27" fill="url(#gw)"/><circle class="e1" cx="${cx}" cy="${cy}" r="13" opacity=".35"/>`
        : ''
      add(360, 830, 9, a.s, glow)
    }

    // ════════ C. SÂN GA (gạch lún, thành đá rêu, dốc có khối, lá thu dồn góc) + ĐƯỜNG RAY (tà vẹt lệch pha, thay/mục/thiếu, cỏ kẽ đá) ════════
    {
      const r = ctx.rng('ga-san')
      const a = pa()
      const s = pa() // sân & ray tĩnh → defs
      const top = R(PL0, PB, PL1 - PL0, PF - PB)
      s.p('ao', R(284, PD - 3, 1202, 6)).p('d1', top + P([[PL0, PB], [PL0, PD], [290, PD], [290, 772]]) + P([[PL1, PB], [PL1, PD], [1480, PD], [1480, 772]])).r(`<path class="ga-fk" d="${top}"/>`)
      s.p('sh|r', P([[PL0, PF], [PL0, PD], [290, PD]]) + P([[PL1, PF], [PL1, PD], [1480, PD]]))
      s.p('ga-ms', MO(292, PD, 34, 6, r) + MO(1446, PD, 30, 5, r) + MO(PL0 + 2, PB + 4, 16, 3, r) + MO(1414, PB + 4, 22, 3, r))
      s.p('~d2~6', D([[512, 766, 16], [1012, 761, 40], [1234, 765, 22]])).r(`<path class="ga-p3 ga-y ${zc('2')} ${oc('.55')}" d="M340 768H1428"/>`)
      s.p('s2', R(PL0, PF, PL1 - PL0, 5)).p('s1', R(PL0, PF, PL1 - PL0, 1.5)).p('s3', R(PL0, PF + 5, PL1 - PL0, PD - PF - 5))
      s.r(`<path fill="url(#ga-st)" d="${R(PL0, PF + 5, PL1 - PL0, PD - PF - 5)}"/><path class="ga-m2 ga-dm ${zc('3.5')}" d="M332 777H1438"/><path class="ga-m2 ga-dt ${zc('1.4')}" d="M340 752H1432M352 761H1420"/>`)
      const dr: number[][] = []
      for (let i = 0; i < 6; i += 1) dr.push([PL0 + 30 + r() * (PL1 - PL0 - 60), PF + 6, 0, 6 + r() * 12])
      s.p('~m3~2.6', D(dr)).p('hl', P([[290, 772], [PL0, PB], [PL0, PB + 3], [290, 775]]) + P([[1480, 772], [PL1, PB], [PL1, PB + 3], [1480, 775]]))
      // đường ray: nền đá; mỗi đoạn một nhịp tà vẹt (pattern lệch pha, co giãn); đầu phải lẫn vào cỏ
      s.p('d2', `M60 801H1560q26 10 40 0q30 26 40 68H52q14-20-8-40q16-14 16-28z`)
      const segs: [number, string, string, number, number][] = [[56, 'sl', 'fb', 0, 1], [380, 's1', 'fB', 11, 1.04], [760, 's2', 'fb', 19, 0.96], [1150, 's3', 'fB', 6, 1.02]]
      const sw: number[][][] = [[], [], [], []]
      segs.forEach(([sx, sl, bl, tx, sc], i) => {
        const ex = i + 1 < segs.length ? (segs[i + 1] as [number, string, string, number, number])[0] : 1640
        const s0 = i === 0 ? sx + 14 : sx
        s.r(`<path class="ga-${bl}" d="${R(sx, 801, ex - sx, 68)}"/><path fill="url(#ga-${sl})" d="${R(s0, 806, Math.min(ex, 1600) - s0, 52)}"/>`)
        // tà vẹt thay (gỗ mới b3 / bê tông s2), mục (k2 gãy đôi), thiếu (lấp đá d2) — đúng chỗ tà vẹt của pattern
        for (let j = 0; j < 3; j += 1) {
          const k = Math.floor(((ex - sx) / 27 / sc) * (0.1 + r() * 0.8)) + Math.ceil((sx - tx) / 27 / sc)
          const x = tx + sc * (8 + 27 * k)
          if (x > Math.min(ex, 1590) || x < s0) continue
          const t = (i + j * 3) % 4
          ;(sw[t] as number[][]).push([x, 807, 3.5, t === 2 ? 22 : 48])
        }
      })
      if (!lite) s.p('~b3~10~~b', D(sw[0] as number[][])).p('~s2~11~~b', D(sw[1] as number[][])).p('~k2~10~~b', D(sw[2] as number[][])).p('~d2~14~~b', D(sw[3] as number[][]))
      s.p('k1~.35', R(36, 817, 1604, 2) + R(36, 853, 1604, 3)).p('x1', R(36, 812, 1664, 5) + R(36, 846, 1624, 7)).p('x2', R(36, 811, 1664, 2) + R(36, 845, 1624, 2.4))
      // ray gần bị nhổ: đầu ray cong vểnh lên lẫn vào cỏ; cỏ trong kẽ đá dày ở hai đầu tuyến, thưa giữa
      s.p('~x1~6', 'M1660 849q12-2 20-14').p('~x2~2', 'M1660 846q12-2 20-14')
      let tu = `<use href="#ga-c2" x="58" y="866"/><use href="#ga-c1" x="70" y="828"/><use href="#ga-c4" x="1626" y="826"/>`
      for (let i = 0; i < 12; i += 1) {
        const u = r()
        const x = i % 2 ? 40 + u * u * 520 : 1740 - u * u * 520
        tu += `<use href="#ga-${r() < 0.5 ? 't' : 'T'}" x="${Math.round(x)}" y="${Math.round(r() < 0.5 ? 808 + r() * 6 : 848 + r() * 14)}"/>`
      }
      if (!lite) s.r(tu)
      a.r(s.s)
      // phần sống: ướt, mưa, lá thu, hoa xuân/hạ dọc mép ray, sương muối / tuyết
      if (wet) a.p('a2', E(1032, 761, 30, 4) + E(1245, 765, 19, 3) + E(700, 770, 22, 2)).p('wetsheen', top + R(36, 811, 1664, 2) + R(36, 845, 1624, 2.4))
      if (rain) a.r(`<ellipse class="z3 rip" cx="1028" cy="761" rx="9" ry="2"/><ellipse class="z3" opacity=".5" cx="702" cy="770" rx="7" ry="1.5"/>`)
      if (thu || (dong && !snow)) {
        const lv: number[][][] = [[], [], []]
        const at: [number, number, number, number][] = [[860, 760, 112, 4], [394, 742, 30, 3], [770, 742, 30, 3], [PL0 + 10, PB + 6, PL1 - PL0 - 20, 22], [1180, 762, 40, 4], [60, 816, 1400, 34]]
        at.forEach(([x, y, w, h], k) => {
          for (let i = 0; i < (thu ? ([9, 6, 5, 9, 4, 11][k] as number) : 2); i += 1) (lv[i % 3] as number[][]).push([x + r() * w, y + r() * h, (r() - 0.5) * 6, (r() - 0.5) * 3])
        })
        a.p('~l1~3.2', D(lv[0] as number[][])).p('~l3~3.2', D(lv[1] as number[][])).p('~f1~3', D(lv[2] as number[][]))
      }
      if (xuan || ha) {
        let fw = ''
        for (let i = 0; i < (xuan ? 11 : 5); i += 1) fw += `<use href="#ga-fw" x="${Math.round(40 + ((i + r()) * 1560) / (xuan ? 11 : 5))}" y="${Math.round(872 + r() * 6)}"/>`
        a.r(fw)
      }
      if (snow) a.p('w3~.85', R(PL0, PB, PL1 - PL0, 7) + R(PL0, PF, PL1 - PL0, 2) + P([[290, 772], [PL0, PB], [PL0, PB + 6], [290, 776]]) + P([[1480, 772], [PL1, PB], [PL1, PB + 6], [1480, 776]]) + R(36, 803, 1604, 3) + R(36, 809, 1664, 2) + R(36, 843, 1624, 2)).r(`<path class="ga-w3 ga-bt ga-sd ${zc('5')} ${oc('.8')}" d="M36 832H1600"/>`)
      else if (dong) a.p('~w3~1~.6', 'M36 811H1700M36 845H1660')
      add(0, 1800, 8, a.s)
    }

    // ════════ D. BÓNG ĐỔ theo giờ: cột hiên, đèn, bảng ga, máy bán hàng, cột điện, gốc cây (kéo dài lúc chiều) ════════
    if (shK && !lite) {
      const m = (yb: number, q: number) => `matrix(1 0 ${(-kx).toFixed(2)} ${q} ${Math.round(kx * yb)} ${Math.round((1 - q) * yb)})`
      const posts = POSTS.map(x => R(x - 3, 679, 6, 94)).join('')
      const lampSign = R(1188, 648, 4, 118) + P([[1190, 640], [1226, 650], [1226, 660], [1202, 660]]) + R(1290, 688, 110, 48) + R(1300, 694, 5, 73) + R(1386, 694, 5, 73)
      const ground0 = R(1494, 636, 64, 135) + R(1689, 512, 6, 268) + R(1670, 520, 48, 5) + R(245, 508, 6, 268) + R(226, 518, 48, 5) + R(330, 690, 15, 84) + E(338, 620, 60, 50)
      add(100, 1760, 6, `<g class="k1" opacity="${(0.36 * shK).toFixed(2)}"><path transform="${m(773, 0.16)}" d="${posts}"/><path transform="${m(766, 0.16)}" d="${lampSign}"/><path transform="${m(774, 0.035)}" d="${ground0}"/></g>`)
    }

    // ════════ E. TIỀN SÂN: ghế gỗ + ô đỏ bỏ quên + va li, MÁI HIÊN, ĐÈN ĐƯỜNG, BẢNG TÊN GA (ngày & tiết khí thật), MÁY BÁN HÀNG ════════
    {
      const a = pa()
      const r = ctx.rng('ga-hien')
      const [lx, ly] = LAMP
      const gy = Math.round(ground(1530)) + 6
      // ghế, va li, ô đỏ dựng nghiêng
      const g = pa()
      g.p('~k1~5~.3', 'M856 763h116m4 0h26').p('ga-k', 'M864 720v42m6-16v16m93-42v42m-6-16v16M860 736q5-6 14-2m93 2q-5-6-14-2')
      g.p('b2', R(858, 722, 112, 5) + R(858, 730, 112, 5) + R(856, 745, 116, 3)).p('b3', R(856, 741, 116, 4) + R(858, 722, 112, 1.5) + R(858, 730, 112, 1.5))
      g.p('b1', R(858, 726, 112, 1.2) + R(858, 734, 112, 1.2) + R(856, 748, 116, 1.5) + R(977, 733, 24, 29)).p('ga-ms', MO(856, 763, 12, 4, r))
      const ax: Pt = [853, 765]
      const L = Math.hypot(16, 43)
      const prof: Pt[] = [[0, 0], [0.35, 4.2], [0.7, 5.4], [1, 1.5]]
      const side = (k: number) => prof.map(([u, w]) => [ax[0] + 16 * u + (43 / L) * w * k, ax[1] - 43 * u + (16 / L) * w * k] as Pt)
      g.p('p1', S([...side(1), ...side(-1).reverse()], true)).p('~k2~2.2', 'M869 722l5-12q3-6 8-2q3 4-1 7M983 732v-5h12v5')
      g.p('sh', R(940, 722, 30, 13) + R(946, 741, 26, 7) + S([ax, ...side(sunL ? -1 : 1).slice(1)], true)).p('hl', S([ax, ...side(sunL ? 0.8 : -0.8).slice(1)], true) + R(977, 744, 24, 2))
      box(g, 977, 733, 24, 29, 3, 6)
      a.r(prop('pG', g.s))
      if (dong && !snow) a.p('~w3~1.2~.7', 'M858 722h112m-112 8h112m-114 11h116M1291 687h108M1203 650h22')
      if (snow) a.p('~w3~3', 'M860 721h108m-108 8h108m-110 11h80M978 732h22M1290 686h110M1205 649h20M1190 637h4')
      // mái hiên tôn gỉ: bóng đổ phủ tường dưới hiên + sàn dưới hiên (ngả theo nắng; dịu khi âm u) — phủ cả ghế & ô
      const X0 = 352
      const W = 716
      const k = kx * 90 * shK
      a.r(`<path class="k1" opacity="${(0.16 + 0.12 * shK).toFixed(2)}" d="${P([[392, 690], [800, 690], [800, 712 + 14 * shK], [392, 712 + 14 * shK]])}${P([[X0 + 4 + k, PB], [X0 + W + k, PB], [X0 + W + k * 0.5, PF - 5], [X0 + 4 + k * 0.5, PF - 5]])}"/>`)
      const c = pa()
      const under = R(X0 + 4, 679, W - 8, 11)
      const edge = R(X0, 657, W, 5)
      c.p('k2~.92', under).r(`<path fill="url(#ga-rf)" d="${under}"/>`).p('b2', R(X0 + 4, 688, W - 8, 2) + R(X0, 662, W, 11)).p('x1', edge).r(`<path fill="url(#ga-cg)" d="${edge}"/>`)
      c.p('b3', R(X0, 662, W, 2)).p('b1', R(X0, 670, W, 3)).p('x2', R(X0 - 2, 673, W + 4, 6) + R(1060, 679, 6, 89) + R(1060, 766, 12, 5))
      c.p('ga-ms', MO(X0 + 24, 658, 40, 5, r, 5) + MO(552, 658, 46, 6, r, 7) + MO(872, 658, 30, 4, r, 4) + MO(1012, 658, 44, 6, r, 8)).p('~l3~2.6', fans([[471, 673, 4, -2.6, -0.6, 13], [902, 673, 3, -2.4, -0.8, 10]], r))
      c.r(POSTS.map(x => `<use href="#ga-po" x="${x}" y="679"/>`).join(''))
      c.p('sh', R(X0 - 2, 677, W + 4, 2)).p('hl', R(X0 - 2, 673, W + 4, 1.5))
      box(c, 1060, 679, 6, 89, 2, 2)
      if (golden) c.p('~e1~1.6~.5', `M${X0} 663h${W}${POSTS.map(x => `M${x + (sunL ? -2 : 2)} 690v82`).join('')}`)
      a.r(`${prop('pC', c.s)}<g class="ga-sw ${dl(9.2, 'ga-den')}"><path class="ga-w" d="M948 690v10"/><path class="p2" d="M940 700h16l5 8h-26z"/><path class="p3" d="M935 707h26v2h-26z"/></g>`)
      // đèn đường + bảng tên ga
      const l = pa()
      l.p('~k1~5~.3', 'M1180 765h20m92 2h16m70 0h16').p('s3', P([[1182, 765], [1198, 765], [1196, 753], [1184, 753]])).p('k2', P([[1187, 754], [1193, 754], [1192, 648], [1188, 648]])).p('~k2~2.6', 'M1190 650q0-12 12-12t12 12')
      l.p('p2', P([[1207, 650], [1221, 650], [1226, 659], [1202, 659]])).p('p3', R(1202, 658, 24, 2)).p('b2', R(1300, 694, 5, 73) + R(1386, 694, 5, 73))
      l.p('k2|b', R(1290, 688, 110, 48)).p('p3|b', R(1293, 691, 104, 42)).p('w2~.45', R(1293, 716, 104, 17) + R(sunL ? 1380 : 1293, 691, 17, 42)).p('z2~.55', 'M1300 718.5H1390').p('ga-ms', MO(1290, 690, 22, 3, r) + MO(1182, 754, 14, 3, r))
      l.p('hl', R(1184, 753, 12, 1.5) + P(sunL ? [[1207, 650], [1211, 650], [1207, 659], [1202, 659]] : [[1217, 650], [1221, 650], [1226, 659], [1221, 659]]))
      box(l, 1188, 650, 4, 104, 1.5, 1.5)
      box(l, 1300, 736, 5, 31, 1.5, 2)
      box(l, 1386, 736, 5, 31, 1.5, 2)
      if (golden) l.p('~e1~1.6~.5', sunL ? 'M1290 689v46' : 'M1400 689v46')
      a.r(prop('pL', l.s)).p(`~${night ? 'e1' : 's1'}~6`, `M${lx} ${ly}h0M948 711h0`)
      a.r(`<g class="k2"><text class="ga-h1" x="1345" y="713">GA RÊU</text><text class="ga-h2" x="1345" y="726.5">${pad(ctx.vn.d)}.${pad(ctx.vn.mo)} · ${esc(ctx.tietKhi.toUpperCase())}</text>${lite ? '' : `<text class="ga-h3" x="1390" y="732">Làng Ngói ›</text>`}</g>`)
      // máy bán hàng tự động: thân xanh ngọc bạc, ô kính sáng, lon nước, rêu bò lên hông
      const v = pa()
      const vs = P([[1558, 640], [1572, 644], [1572, gy - 8], [1558, gy - 6]])
      v.p('~k1~4~.3', `M1490 ${gy - 5}h86`).p('s2', R(1486, gy - 4, 96, 8))
      v.p('p2', R(1494, 640, 64, gy - 646) + vs).p('k2', R(1492, 636, 68, 5) + P([[1560, 636], [1573, 641], [1572, 644], [1558, 641]]) + R(1498, 647, 48, 61)).p('e3', R(1500, 649, 44, 57))
      v.r(`<use href="#ga-cn"/><use href="#ga-sf" class="k2"/>`)
      v.p('x2', R(1548, 650, 8, 70) + R(1502, gy - 30, 38, 3)).p('k1', R(1550, 660, 3, 8) + R(1502, gy - 27, 38, 10)).p('e4', R(1550, 674, 4, 3)).p('p1~.8', R(1494, 714, 54, 6))
      v.r(`<text class="ga-h6" x="1521" y="719">nước mát</text>`).p('ga-ms', MO(1492, gy - 4, 26, 9, r) + MO(1555, gy - 5, 18, 24, r))
      v.p('sh', vs + R(1494, gy - 14, 64, 8)).p('hl', P([[1500, 706], [1520, 649], [1530, 649], [1510, 706]]) + R(1486, gy - 4, 96, 1.5))
      box(v, 1494, 640, 64, gy - 646, 3, 10)
      a.r(prop('pV', v.s))
      // ổ cỏ thấp (bãi nằm của mèo) cạnh máy: khối cỏ + lá + bóng chân; thu khô, đông sương phủ
      a.p('ao', E(1616, gy + 8, 36, 3)).p(thu ? 'd1' : 'g2', U(1584, gy + 8, 64, 9, r, 4))
      a.p(`~${thu ? 'd2' : 'g1'}~1.6`, fans([[1592, gy + 6, 3, -2.6, -1.2, 9], [1612, gy + 4, 4, -2.4, -0.8, 11], [1634, gy + 6, 3, -2.2, -0.9, 9]], r))
      if (dong) a.p('w3~.7', U(1586, gy + 6, 60, 6, r, 3))
      if (snow) {
        a.p('w3', `${S([[X0 - 4, 658], [X0 + 200, 648], [X0 + 480, 650], [X0 + W + 4, 647], [X0 + W + 4, 658]], true)}M940 700h16l-2-3h-12z${R(1491, 631, 70, 6)}${P([[1560, 632], [1574, 638], [1574, 642], [1560, 637]])}`)
        // nhũ băng dưới máng xối
        a.p('~w3~2', D(Array.from({ length: 14 }, (_, i) => [X0 + 20 + i * 50 + ((i * 17) % 23), 680, 0, 4 + ((i * 7) % 9)])))
      }
      if (rain) {
        // giọt nước nhỏ từ máng xối xuống mép sân (hai nhịp so le) + vệt ướt dọc mép
        const dd = (o: number) => Array.from({ length: 7 }, (_, i) => `M${F(X0 + 30 + i * 104 + o, 680)}q-2.4 6 0 7q2.4-1 0-7z`).join('')
        a.r(`<path class="ga-dr" d="${dd(0)}M1063 682q-2.4 6 0 7q2.4-1 0-7z"/><path class="ga-dr ${dl(1.1, 'ga-dr')}" d="${dd(52)}"/>`)
        a.p('~a1~2~.5', `M${X0 + 10} 772h${W - 20}`)
      }
      const g0 = `<circle cx="1522" cy="684" r="150" fill="url(#gc)"/><ellipse cx="1526" cy="${gy + 12}" rx="130" ry="24" fill="url(#gc)"/>`
      const glow = night
        ? g0 +
          `<circle cx="${lx}" cy="${ly}" r="88" fill="url(#gw)"/><ellipse cx="${lx}" cy="765" rx="58" ry="10" fill="url(#gw)"/><circle cx="948" cy="712" r="48" fill="url(#gw)"/><ellipse cx="948" cy="760" rx="70" ry="11" fill="url(#gw)"/><path class="ga-e1 ${zc('6')}" d="M${lx} ${ly}h0M948 711h0"/>` +
          `<g transform="translate(${lx} ${ly + 2}) scale(1 .55)"><path class="ga-mo ${zc('3')} ${dl(2.3, 'ga-m1')}" d="M12 0h0m-29 6h0m30 12h0"/></g>` +
          `<path class="e3 ga-hu" opacity=".32" d="${R(1500, 649, 44, 57)}"/><use href="#ga-cn" opacity=".8"/><use href="#ga-sf" class="k2" opacity=".6"/><path class="e3" opacity=".5" d="${R(1502, 649, 6, 57)}"/>` +
          `<path class="e3" opacity=".16" d="${R(1689, 600, 3, 180)}${R(1588, gy + 2, 70, 6)}"/><g transform="translate(1522 646) scale(1 .5)"><path class="ga-mo ${zc('2.6')} ${dl(2.3, 'ga-m2')}" d="M14 0h0m-31 8h0m26 14h0m-6-30h0"/></g>`
        : g0
      add(348, 1660, 8, a.s, glow)
    }

    // ════════ F. CHUYẾN TÀU KHÔNG AI ĐỢI: đoàn tàu bóng mờ lướt qua đúng giờ trên bảng phấn rồi tan vào sương ════════
    if (train !== undefined) {
      const body =
        'M-150 768h108q14 0 14 20t-14 20h-108zM-170 742h52v66h-52zM-58 744h14v24h-14zM-62 740h22v5h-22zM-104 768a10 10 0 0 1 20 0zM-30 808l20 24h-26zM-226 770h54v50h-54zM-172 808h166v14h-166z' +
        R(-424, 752, 190, 72) + 'M-428 754q99-16 198 0z' + R(-620, 752, 190, 72) + 'M-624 754q99-16 198 0z'
      const win = `<path class="ga-bt ga-tw ${zc('18')}" d="M-410 774h168M-606 774h168M-164 756h16"/>`
      add(-800, 2800, 7, `<g class="ga-tn"><path class="s1" opacity=".36" d="${body}"/><g class="ga-k2" opacity=".2">${win}</g></g>`, night ? `<g class="ga-tn"><g class="ga-e2" opacity=".55">${win}</g></g>` : '')
    }

    // ════════ G. TIỀN CẢNH: đường nhánh cong chìm vào cỏ, TOA TÀU CŨ lún nửa thân, trụ chắn gỉ, tay bẻ ghi; đồng cỏ rải ngẫu nhiên,
    //            xe goòng đổ nghiêng, vũng nước, đá rêu, Km 0, hoa theo mùa, tuyết, bóng mây trôi ════════
    {
      const r = ctx.rng('ga-co')
      const a = pa() // đồng cỏ (ưu tiên 6: tiền cảnh giữa khung, giữ khi ngân sách chung căng)
      const b = pa() // đạo cụ kể chuyện: nhánh, toa, goòng (ưu tiên 6)
      // nền cỏ có nhịp: dải ven ray sáng, gợn tối phía dưới (không còn mảng phẳng).
      // Ranh giới x 1800: Làng Ngói vẽ nền cỏ đặc riêng (khớp dải lõi +58/+190) ĐÈ lên sau → mọi lớp phủ mặt đất của ga phải tự
      // trả về đúng nền lõi trước 1800, không thì thành đường cắt dọc khi camera lia sang. Dải sáng thon dần thành mũi ở 1770;
      // gợn tối lặn xuống dưới mép dải g4 lõi (ground+190 ≈ 954) từ ~1680, ở đó g4 phủ g4 nên không còn thấy.
      a.p('g2~.55', S([[0, 868], [520, 876], [1000, 872], [1400, 879], [1610, 875], [1770, 868]], true))
      a.p('g4~.5', S([[0, 1020], [0, 940], [180, 930], [400, 948], [620, 930], [900, 950], [1150, 932], [1450, 948], [1620, 946], [1730, 962], [1800, 980], [1800, 1020]], true))
      if (snow) {
        // mặt tuyết gợn, bóng hõm, ngọn cỏ khô nhô lên, vết chân mèo. Đáy kéo tới 1120 để zoom xa không lộ cạnh dưới.
        // Ranh giới x 1800 theo hợp đồng dải lõi (Làng Ngói dựng tuyết đúng như vậy ở mép trái): tuyết phủ từ ground−2, bóng s1 .32
        // từ +58, bóng sâu từ +190. Trong ga tuyết chỉ phủ đồng cỏ dưới ray (từ 872), nên trong 1580–1800 mép trên tuyết dâng dần
        // lên mặt đất (vùi đầu ray cụt, chân bụi cây) và bóng .32 hiện dần theo một sườn tuyết chéo. Lấn 6 đơn vị dưới mép Làng Ngói
        // để hai mép khử răng cưa không để lộ vạch sáng.
        const gb = Math.round(ground(1800))
        // đụn tuyết cuối tuyến: lưng gợn từng ngấn (không phải một đường cong trơn), gờ sáng dọc lưng đụn
        const bank: Pt[] = [[1590, 874], [1640, 868], [1664, 852], [1680, 855], [1702, 826], [1718, 816], [1742, 795], [1758, 798], [1780, 777], [1806, gb - 2]]
        a.p('w3', S([[0, 1120], [0, 872], [0, 872], [300, 877], [600, 870], [900, 880], [1200, 872], [1500, 878], ...bank, [1806, gb - 2], [1806, 1120]], true))
        a.p('hl', S([...bank.slice(1), ...bank.slice(1).map(([x, y]) => [x - 2, y + 5] as Pt).reverse()], true))
        a.p('s1~.55', S([[0, 1120], [0, 960], [500, 948], [1000, 962], [1400, 950], [1620, 958], [1730, 955], [1806, gb + 190], [1806, gb + 190], [1806, 1120]], true))
        a.p('s1~.32', S([[1480, 1120], [1586, 992], [1680, 900], [1750, 846], [1806, gb + 58], [1806, gb + 58], [1806, 1120]], true))
        const dt: number[][] = []
        for (let i = 0; i < 14; i += 1) dt.push([r() * 1780, 880 + r() * 120, (r() - 0.5) * 6, -6 - r() * 10])
        a.p('~d2~1.4', D(dt)).r(`<path class="ga-k2 ga-bt ga-pw ${zc('3')} ${oc('.3')}" d="M720 990q200-50 380-70t300-24"/>`)
      }
      // đường nhánh, tay bẻ ghi, trụ chắn (tĩnh → defs)
      const d = pa()
      const far = S([[1110, 812], [1250, 822], [1330, 850], [1410, 872], [1660, 874]])
      const near = S([[1150, 846], [1270, 860], [1344, 888], [1420, 906], [1660, 908]])
      d.p('d2', S([[1100, 810], [1250, 818], [1330, 846], [1410, 866], [1640, 868], [1660, 920], [1416, 918], [1336, 898], [1262, 872], [1150, 858], [1130, 848]], true))
      d.r(`<path class="ga-fB" d="${S([[1150, 840], [1262, 866], [1336, 892], [1416, 912], [1640, 912], [1630, 872], [1410, 870], [1330, 852], [1250, 826], [1160, 818]], true)}"/>`)
      const sl: number[][] = []
      for (let i = 0; i < 6; i += 1) {
        if (i === 3) continue
        const x = 1190 + i * 34 + r() * 6
        const t = (x - 1150) / 260
        sl.push([x, 820 + t * 44, 7 + t * 9, 36 + t * 6])
      }
      d.p('~b2~9~~b', D(sl)).p('~b1~3~~b', D(sl.map(([x = 0, y = 0, dx = 0, dy = 0]) => [x + (sunL ? 3 : -3), y, dx, dy]))).p('~x1~5', far + near)
      d.p('~k1~4~.3', 'M1104 887h34M1636 914h34').p('x1', R(1108, 876, 26, 10) + R(1640, 878, 6, 36) + R(1662, 880, 6, 32)).p('~x1~2.4', 'M1121 877l14-28').p('~p1~7', 'M1136 847h0')
      d.p('p1', R(1634, 884, 40, 9)).p('p3~.8', 'M1640 884h8l-6 9h-8zm16 0h8l-6 9h-8z').p('ga-ms', MO(1632, 914, 44, 10, r)).p('hl', R(1108, 876, 26, 2))
      box(d, 1640, 878, 6, 36, 2, 2)
      b.r(prop('pD', d.s))
      // toa tàu cũ (hơi nghiêng vì lún): sơn xanh ngọc bạc, sọc kem, cửa sổ tối/sáng đêm, mái rêu thành bãi cỏ, gỉ sét
      const t = `transform="rotate(-2 ${CAR + 120} 900)"`
      const c = pa()
      c.p('ao', E(CAR + 122, 906, 136, 7)).p('k2', R(CAR + 10, 890, CW - 20, 12)).p('p2', `M${CAR} 822h${CW}v74h${-CW}z`).p('s3', `M${CAR - 7} 824q${CW / 2 + 7}-28 ${CW + 14} 0z`)
      c.p('p3', R(CAR, 866, CW, 6)).p('k1', R(CAR + CW - 18, 834, 12, 56)).p('x1~.65', MO(CAR + 40, 896, 54, 16, r) + MO(CAR + 150, 896, 44, 12, r))
      c.p('ga-ms', MO(CAR - 4, 824, CW + 8, 15, r, 10) + MO(CAR + 210, 896, 30, 24, r)).p('m1~.7', MO(CAR + 30, 816, 100, 6, r))
      c.r(`<use href="#ga-c2" x="${CAR + 70}" y="814"/><use href="#ga-T" x="${CAR + 176}" y="816"/><text class="ga-h7" x="${CAR + 14}" y="884">TOA SỐ 7</text>`)
      c.p('sh', R(CAR, 874, CW, 22) + R(Kx(CAR, CW, 12), 822, 12, 52)).p('hl', R(CAR, 822, CW, 2) + R(Lx(CAR, CW, 4), 824, 4, 42))
      if (golden) c.p('~e1~2~.5', `M${sunL ? CAR + 1 : CAR + CW - 1} 826v40M${CAR + 20} 814q100-16 200 2`)
      b.r(`<g ${t}>${prop('pR', c.s)}<use href="#ga-cw" class="ga-${night ? 'e2' : 'k2'}"/>${xuan || ha ? `<use href="#ga-fw" x="${CAR + 120}" y="812"/>` : ''}${snow ? `<path class="w3" d="M${CAR - 9} 824q${CW / 2 + 9}-38 ${CW + 18} 0q-6-6-12-5q-100-12-${CW - 30} 0q-6 0-12 5z${R(CAR + 12, 864, 180, 3)}"/>` : ''}</g>`)
      // cỏ dại nuốt nhánh & chân toa; dải đồng cỏ (dày hai góc, thưa giữa: trái thuận, phải lật gương)
      if (snow) b.p('w3', S([[1100, 809], [1250, 817], [1330, 845], [1410, 865], [1642, 866], [1642, 876], [1410, 875], [1330, 857], [1250, 829], [1100, 819]], true) + U(CAR - 12, 908, CW + 24, 14, r, 6)).p('~d2~1.4', D([[1288, 846, -3, -9], [1374, 872, 2, -11], [CAR + 60, 904, -2, -10], [CAR + 190, 906, 3, -9]]))
      else b.r(`<use href="#ga-c2" x="1270" y="878"/><g class="sw2"><use href="#ga-c1" x="1360" y="902"/></g><use href="#ga-c3" x="${CAR + 40}" y="914"/><use href="#ga-c5" x="${CAR + 160}" y="918"/><use href="#ga-c3" x="1690" y="924"/>`)
      // Bản lật gương lùi về 1705 (không còn ở 1800): cụm dày nhất kết thúc so le ở 1730–1764, rồi ba khóm nhỏ thưa dần tới ~1790
      // → mật độ cỏ tan về 0 trước ranh giới thay vì bị nền Làng Ngói cắt ngang thành vạch dọc.
      a.r(snow ? `<use href="#ga-c1" x="90" y="930"/><use href="#ga-c4" x="1680" y="960"/>` : `${md.meadow}<g transform="matrix(-1 0 0 1 1705 0)">${md.meadow}</g><use href="#ga-T" x="1752" y="986"/><use href="#ga-t" x="1772" y="944"/><use href="#ga-t" x="1778" y="1004"/>`)
      if (thu && !lite) a.r(`<use href="#ga-R" x="210" y="890"/><use href="#ga-R" x="490" y="892"/><use href="#ga-R" x="1030" y="890"/>`)
      // xe goòng đổ nghiêng (sàn gỗ dựng xiên, bánh sắt, rêu mọc qua nan), cột cây số Km 0, đá rêu (tĩnh → defs)
      const hc = pa()
      hc.p('ao', E(560, 936, 62, 5)).r(`<g transform="rotate(-14 560 930)"><path class="b2" d="M512 906h96v14h-96z"/><path class="b3" d="M512 906h96v3h-96z"/><path class="ga-b1 ga-bt ga-sk ${zc('2')}" d="M514 913h94"/><path class="x2" d="M520 920h80v5h-80z"/><path class="ga-x1 ${zc('18')}" d="M534 931h0M586 931h0"/><path class="ga-k2 ${zc('12')}" d="M534 931h0M586 931h0"/><path class="ga-x1 ${zc('5')}" d="M534 931h0M586 931h0"/><path class="ga-ms" d="M510 907q20-9 40-3q14-6 30 1q-30 3-70 2z"/></g><use href="#ga-c2" x="600" y="944"/><use href="#ga-T" x="548" y="938"/>`)
      hc.r(`<g transform="rotate(-3 210 902)"><path class="ga-k1 ${zc('5')} ${oc('.3')}" d="M198 903h28"/><path class="w3" d="M200 902v-24q0-12 12-12t12 12v24z"/><path class="p1" d="M200 880v-2q0-12 12-12t12 12v2z"/><path class="sh" d="M${sunL ? 218 : 206} 902v-25q0-8 ${sunL ? '-6-11q12 1 12 12v24z' : '6-11q-12 1-12 12v24z'}"/><text class="ga-h8" x="212" y="897">0</text><path class="ga-ms" d="M199 903q2-6 7-5q3-4 7 0q6-2 9 5z"/></g>`)
      hc.p('~k1~4~.3', 'M806 969h34').p('~s3~18', 'M813 960h14').p('~s2~6', 'M811 957h6').p('ga-ms', MO(806, 957, 20, 6, r))
      b.r(hc.s)
      // hoa theo mùa, vũng nước (soi trời; đêm hắt ánh đèn)
      const nf = lite || snow ? 3 : xuan ? 20 : ha ? 10 : thu ? 6 : 3
      const fl: number[][][] = [[], []]
      for (let i = 0; i < nf; i += 1) (fl[i % 2] as number[][]).push([r() * 1770, 884 + r() * 110])
      a.p(`~${ha ? 'f2' : 'f1'}~4.4`, D(fl[0] as number[][])).p('~f3~3.4', D(fl[1] as number[][]))
      if (wet) a.p('a2', E(980, 904, 40, 5) + E(1214, 958, 26, 4)).p('hl', E(972, 903, 18, 1.5))
      if (rain) a.r(`<ellipse class="z3 rip ${dl(3.4, 'ga-v1')}" cx="984" cy="904" rx="12" ry="2"/><ellipse class="z3" opacity=".5" cx="1210" cy="958" rx="9" ry="1.6"/>`)
      // bóng mây trôi qua đồng cỏ (nắng có mây) · lá rơi mùa thu
      if (sunny && cl !== 'quang' && !lite) a.r(`<ellipse class="ga-cs ${dl(150, 'ga-cs1')}" cx="860" cy="930" rx="430" ry="100" fill="url(#ga-csg)"/>`)
      if (thu && !lite && !rain) a.r(`<path class="l1 ga-lf ${dl(11, 'ga-lf1')}" d="M300 600q4-4 8 0q-4 4-8 0z"/><path class="l3 ga-lf ${dl(14, 'ga-lf2')}" style="animation-duration:14s" d="M396 586q4-4 8 0q-4 4-8 0z"/>`)
      const glowB = night ? `<g ${t}><circle cx="${CAR + 120}" cy="852" r="112" fill="url(#gw)" opacity=".55"/><use href="#ga-cw" class="ga-e2" opacity=".8"/></g>` : ''
      const glowA = wet && night ? `<ellipse cx="984" cy="905" rx="34" ry="3" fill="url(#gw)"/><path class="e1" opacity=".35" d="${E(980, 905, 9, 1.4)}"/>` : ''
      add(0, 1800, 6, a.s, glowA)
      add(180, 1700, 6, b.s, glowB)
    }

    // ════════ H. LỚP 4 (sát ống kính): bụi lau to mờ góc trái dưới, cột hàng rào gỗ nghiêng bên phải ════════
    if (!lite) {
      const r = ctx.rng('ga-l4')
      let bl = ''
      for (let i = 0; i < 13; i += 1) {
        const x = 380 + i * 22 + r() * 12
        const h = 60 + r() * 80
        const lean = (r() - 0.35) * 60
        // chân lá kéo thẳng xuống 1064 (dưới mép khung ở mọi zoom của cảnh): cả bụi lắc quanh đáy tới ~5° khi gió mạnh vẫn không lộ đáy lá
        bl += `M${F(x - 4, 1064)}v-40q${F(lean * 0.3, -h * 0.6, lean, -h)}q${F(-lean * 0.5 + 5, h * 0.5, 8, h)}v40z`
      }
      pdefs += `<path id="ga-pE" d="${bl}"/>`
      const a = pa()
      a.r(`<use href="#ga-pE" class="${thu || dong ? 'd2' : 'g4'} ${oc('.85')}"/>`)
      if (thu || ha) a.p('~s1~6~.55', 'M470 880l6-20m60 6l8-22m70 22l4-18')
      // Mặt đất dưới chân lau là đồ TĨNH, đứng ngoài nhóm lắc gió: bóng tiếp xúc elip gradient mép mềm (thay mảng chữ nhật cạnh cứng
      // từng lắc theo gió). Tuyết: đụn tuyết gợn phủ chân lau, hai đầu lặn dưới mép khung, gờ sáng trên lưng đụn, bóng chân lau phủ nhẹ.
      const ao = `<ellipse cx="505" cy="1052" rx="300" ry="88" fill="url(#ga-l4s)"${snow ? ' opacity=".5"' : ''}/>`
      let fg = ''
      if (snow) {
        const top: Pt[] = [[330, 1024], [384, 994], [446, 1000], [508, 984], [576, 996], [642, 988], [702, 1006], [748, 1040]]
        const sd = pa()
        sd.p('w3', S([[286, 1100], ...top, [786, 1100]], true)).p('hl', S([...top, ...top.map(([x, y]) => [x + 3, y + 7] as Pt).reverse()], true))
        fg = sd.s + ao
      }
      add(200, 800, 5, `${snow ? '' : ao}<g class="sw4">${a.s}</g>${fg}`, '', 4)
      const f = pa()
      f.p('b2', P([[1918, 1024], [1934, 1024], [1950, 876], [1936, 874]])).p(sunL ? 'b3' : 'b1', P([[1928, 1024], [1934, 1024], [1950, 876], [1945, 875]])).p(sunL ? 'b1' : 'b3', P([[1918, 1024], [1922, 1024], [1938, 874], [1936, 874]]))
      f.p('~x1~1.2', 'M1940 900q-40 30-80 26m80-6q-40 16-90 12').p('ga-ms', MO(1930, 880, 20, 6, r)).r(`<use href="#ga-U" x="1926" y="1030"/><use href="#ga-T" x="1900" y="1032"/>`)
      add(1840, 1990, 5, prop('pF', f.s) + (snow ? `<path class="w3" d="M1934 875l17 2-2 5-15-3z"/>` : ''), '', 4)
    }

    const spots: Spot[] = [
      { kind: 'cat', layer: 3, x: 1614, y: Math.round(ground(1530)) + 10 },
      { kind: 'cat-shelter', layer: 3, x: 912, y: 761 },
      { kind: 'perch', layer: 3, x: 1010, y: Math.round(wireY(1010)) },
      { kind: 'perch', layer: 3, x: 640, y: Math.round(wireY(640)) },
      { kind: 'perch', layer: 3, x: 706, y: 586 },
      { kind: 'perch', layer: 3, x: CAR + 130, y: 812 },
      { kind: 'smoke', layer: 3, x: 446, y: 578 },
      { kind: 'fireflies', layer: 3, x: 1650, y: 730, w: 220 },
      { kind: 'fireflies', layer: 3, x: 60, y: 770, w: 240 },
      { kind: 'butterflies', layer: 3, x: 520, y: 860, w: 300 },
    ]
    // độ dày nét / độ mờ dùng trong lần vẽ này → CSS
    for (const k of Z) css += k[0] === 'z' ? `.${zName(k.slice(1))}{stroke-width:${k.slice(1)}}` : `.${oName(k.slice(1))}{opacity:${k.slice(1)}}`
    // lite: chỉ giữ lõi (nhà ga, sân & ray, tiền sân): bỏ hậu cảnh, tiền cảnh, lớp 4, bóng đổ (prio ≤ 6)
    return { pieces: lite ? pieces.filter(p => p.prio > 6) : pieces, spots, defs: md.defs + pdefs, css }
  },
}
