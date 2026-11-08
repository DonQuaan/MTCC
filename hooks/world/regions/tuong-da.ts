// KHỐI (tuong-da · cận mặt): 4 mảng — trời sáng phía trên · ĐỒI CỎ trung-tối một khối liền (vai & thân người khổng lồ nằm dưới cỏ)
//   · MẶT TƯỢNG đá xám ấm ở 1/3 trái là tiêu điểm DUY NHẤT (tương phản vừa, nửa chìm trong cỏ, tóc là chính sườn đồi) · cỏ tối
//   tiền cảnh hai góc đáy. Giữa khung chỉ còn sườn cỏ mềm + mỏm vai đá thấp; bàn tay ngửa nằm ở 1/3 phải là vật phụ, thấp.
// KHỐI (nhin-dao-bay): trời rộng (đảo bay thuộc tầng giữa) · sườn đồi + đầu tượng góc trái dưới · tay đá, cột đổ đáy phải · cỏ tối mép đáy.
// Vùng 6 · NGƯỜI KHỔNG LỒ ĐÁ (x 9000–10800). Câu chuyện: đầu & vai một người khổng lồ đá cổ nằm nghiêng ngủ trong lòng đồi.
// Mặt KHÔNG có đường viền: hốc mắt, mí nhắm, sống mũi, môi, gò má dựng bằng MẶT PHẲNG sáng–tối theo nguồn sáng thật (sáng: mặt
// trời trái → mặt hướng lên sáng; chiều: phải → má phải sáng). Thời gian: mép sứt, khe nứt có cây mọc, vệt địa y, rêu chảy theo
// đường nước. Tóc = chính sườn cỏ trùm lên vòm đầu (hoa dại mọc trên đó), chân tóc là viền rêu dày đổ bóng xuống trán.
// Vai: mỏm đá thấp lộ khỏi cỏ, cây con nghiêng. Bàn tay ngửa nằm trên cỏ, ngón cong khum (hai ngón gãy), tổ chim trên ngón,
// lòng tay khô dưới ngón cong = chỗ mèo trú mưa. Bậc đá cổ có mặt đứng, mặt bên, bậc sứt; đèn đá; cột gãy, trống cột đổ.
// Đêm: khe nứt & mí mắt rỉ sáng rất mờ (.e4), thở 9 s. Mùa đổi MẢNG: xuân hoa phủ tóc · hạ cỏ cao, tán đậm · thu lá đỏ, tán thưa
// · đông cành trơ, sương muối mép trên. Tuyết: dải tuyết theo mép đồi, mép dưới nhiễu fbm theo x thế giới (liền giữa các mảnh).
import { fbm, ground, n0, toLayer, type Pt } from '../util'
import type { Ctx, Piece, Region, Spot } from '../types'

// ───────────── hình học ─────────────
/** Gốc & tư thế đầu: mặt dựng thẳng ở hệ cục bộ (y xuống), xoay để đỉnh đầu ngả trái–lên. */
const HX = 9690
const HY = 452
const HA = -36
const HK = 0.92
const CA = Math.cos((HA * Math.PI) / 180)
const SA = Math.sin((HA * Math.PI) / 180)
/** Điểm cục bộ của đầu → toạ độ tương đối gốc (HX, HY). */
const T = (x: number, y: number): Pt => [HK * (x * CA - y * SA), HK * (x * SA + y * CA)]
/** Mặt đồi: vai & thân người khổng lồ nằm dưới lớp cỏ (gò sau đầu, đổ dài về phía bàn tay). */
const hill = (x: number) => ground(x) - 150 * Math.exp(-(((x - 9930) / (x < 9930 ? 230 : 330)) ** 2))
/** Bàn tay: gốc (thế giới) giữa lòng bàn tay trên mặt đồi. */
const QX = 10500

// ───────────── chuỗi gọn ─────────────
/** Nối số: chỉ chèn dấu cách trước số không âm. */
function J(v: number[]): string {
  let s = ''
  for (let i = 0; i < v.length; i += 1) {
    const x = v[i] as number
    s += (i && x >= 0 ? ' ' : '') + x
  }
  return s
}
const xy = (x: number, y: number) => J([n0(x), n0(y)])
/** Số gọn: tối đa 1 chữ số thập phân, bỏ số 0 đầu ("0.5" → ".5"). */
const fm = (v: number) => {
  const r = Math.round(v * 10) / 10
  const s = String(Object.is(r, -0) ? 0 : r)
  return s.replace(/^(-?)0\./, '$1.')
}
const NARG: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }
/** Path bất kỳ (M L H V C S Q T A Z, hoa/thường) → toàn lệnh tương đối, bỏ chữ lệnh lặp: số nhỏ, gọn ký tự. */
function rel(d: string): string {
  const tk = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)/g) ?? []
  let i = 0
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  let cmd = ''
  let last = ''
  let out = ''
  while (i < tk.length) {
    const t = tk[i] as string
    if (/[A-Za-z]/.test(t)) {
      cmd = t
      i += 1
      if (cmd === 'Z' || cmd === 'z') {
        out += 'z'
        cx = sx
        cy = sy
        last = 'z'
        continue
      }
    }
    const up = cmd.toUpperCase()
    const abs = cmd === up
    const n = NARG[up] ?? 2
    const v: number[] = []
    for (let k = 0; k < n; k += 1) v.push(Number(tk[i + k]))
    i += n
    let o: number[]
    if (up === 'H') {
      const x = abs ? (v[0] as number) : cx + (v[0] as number)
      o = [x - cx]
      cx = x
    } else if (up === 'V') {
      const y = abs ? (v[0] as number) : cy + (v[0] as number)
      o = [y - cy]
      cy = y
    } else if (up === 'A') {
      o = v.slice(0, 5)
      const x = abs ? (v[5] as number) : cx + (v[5] as number)
      const y = abs ? (v[6] as number) : cy + (v[6] as number)
      o.push(x - cx, y - cy)
      cx = x
      cy = y
    } else {
      o = v.map((q, k) => (abs ? q - (k % 2 ? cy : cx) : q))
      cx += o[n - 2] as number
      cy += o[n - 1] as number
    }
    const lc = up.toLowerCase()
    if (up === 'M') {
      sx = cx
      sy = cy
    }
    const s = o.map(fm)
    const body = s.map((x, k) => (k && x[0] !== '-' ? ' ' : '') + x).join('')
    if (lc === last && lc !== 'm') out += ((s[0] as string)[0] === '-' ? '' : ' ') + body
    else out += lc + body
    last = up === 'M' ? 'l' : lc
    if (up === 'M') cmd = abs ? 'L' : 'l'
  }
  return out
}
const P = (c: string, d: string, a = '') => (d ? `<path${c ? ` class="${c}"` : ''} d="${rel(d)}"${a}/>` : '')
const G = (tr: string, inner: string, a = '') => (inner ? `<g transform="${tr}"${a}>${inner}</g>` : '')
const R0 = (p: Pt): Pt => [n0(p[0]), n0(p[1])]
/** Hình có id, màu kế thừa từ nhóm (để <use> sao chép đổi được màu: tuyết, vân rêu). */
const idp = (c: string, id: string, d: string) => `<g class="${c}"><path id="td-${id}" d="${rel(d)}"/></g>`

/** Đường cong mượt qua các điểm (q tương đối qua trung điểm, số nguyên). */
function sp(pts: Pt[], close = false): string {
  const R = pts.map(R0)
  const a = R[0]
  if (!a) return ''
  let [cx, cy] = a
  let d = `M${J(a)}`
  let q = ''
  for (let i = 1; i < R.length - 1; i += 1) {
    const p = R[i] as Pt
    const nx = R[i + 1] as Pt
    const mx = n0((p[0] + nx[0]) / 2)
    const my = n0((p[1] + nx[1]) / 2)
    const v = [p[0] - cx, p[1] - cy, mx - cx, my - cy]
    q += (q && (v[0] as number) >= 0 ? ' ' : '') + J(v)
    cx = mx
    cy = my
  }
  if (q) d += `q${q}`
  const z = R[R.length - 1] as Pt
  if (R.length > 1) d += `l${J([z[0] - cx, z[1] - cy])}`
  return d + (close ? 'Z' : '')
}
/** Vòng kín mượt (đá, cụm rêu): đi qua trung điểm các cạnh. */
function loop(pts: Pt[]): string {
  const R = pts.map(R0)
  const n = R.length
  const mid = (i: number): Pt => {
    const p = R[i % n] as Pt
    const q = R[(i + 1) % n] as Pt
    return [n0((p[0] + q[0]) / 2), n0((p[1] + q[1]) / 2)]
  }
  let [cx, cy] = mid(n - 1)
  let d = `M${J([cx, cy])}q`
  for (let i = 0; i < n; i += 1) {
    const p = R[i] as Pt
    const m = mid(i)
    const v = [p[0] - cx, p[1] - cy, m[0] - cx, m[1] - cy]
    d += (i && (v[0] as number) >= 0 ? ' ' : '') + J(v)
    ;[cx, cy] = m
  }
  return `${d}Z`
}
function bl(cx: number, cy: number, rx: number, ry: number, r: () => number, lumps = 8, rough = 0.2): string {
  const ph = r() * 6.28
  const pts: Pt[] = []
  for (let i = 0; i < lumps; i += 1) {
    const a = (i / lumps) * Math.PI * 2
    const k = 1 + rough * (Math.sin(a * 2 + ph) * 0.6 + (r() - 0.5))
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return loop(pts)
}
/** Chuỗi chấm (nét dài 0, đầu tròn) bằng m tương đối. */
function dots(c: string, pts: Pt[]): string {
  let d = ''
  let px = 0
  let py = 0
  pts.forEach((p, i) => {
    const [x, y] = R0(p)
    d += `${i ? `m${J([x - px, y - py])}` : `M${J([x, y])}`}h0`
    px = x
    py = y
  })
  return P(c, d)
}
const anim = (ctx: Ctx, period: number, key: string) => ` style="animation-delay:${ctx.ph(period, key)}"`
// x/y bằng 0 là mặc định của <use> → bỏ (tiết kiệm ký tự trong trần ký tự).
const XY = (x: number, y: number) => { const a = String(n0(x)); const b = String(n0(y)); return (a === '0' || a === '-0' ? '' : ` x="${a}"`) + (b === '0' || b === '-0' ? '' : ` y="${b}"`) }
const use = (id: string, x: number, y: number, a = '') => `<use href="#td-${id}"${XY(x, y)}${a}/>`

// ───────────── thân thuôn: ngón tay, lọn tóc, cẳng tay ─────────────
type Limb = { c: Pt[]; n: Pt[]; w: number[]; tip: Pt }
function limb(c: Pt[], w: number[], tk = 0.8): Limb {
  const m = c.length - 1
  const n = c.map((_, i) => {
    const a = c[Math.max(0, i - 1)] as Pt
    const b = c[Math.min(m, i + 1)] as Pt
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    return [-dy / l, dx / l] as Pt
  })
  const e = c[m] as Pt
  const q = n[m] as Pt
  const wm = (w[m] as number) * tk
  return { c, n, w, tip: [e[0] + q[1] * wm, e[1] - q[0] * wm] }
}
/** Điểm lệch khỏi đường giữa k phần bề rộng (1 = phía A). */
const off = (L: Limb, k: number): Pt[] =>
  L.c.map((p, i) => {
    const q = L.n[i] as Pt
    const w = (L.w[i] as number) * k
    return [p[0] + q[0] * w, p[1] + q[1] * w]
  })
const shape = (L: Limb) => sp([...off(L, 1), L.tip, ...off(L, -1).reverse()], true)
/** Dải một phía: từ mép (k = ±1) vào trong còn k·(1 − f). */
const band = (L: Limb, k: number, f: number) => sp([...off(L, k), L.tip, ...off(L, k * (1 - f)).reverse()], true)

/** Phía hướng về nguồn sáng (+1 = phía A): sáng từ trái–trên, chiều từ phải–trên. */
const litSide = (L: Limb, am: boolean) => (L.n.reduce((s, q) => s + (am ? -0.6 : 0.6) * q[0] - 0.8 * q[1], 0) >= 0 ? 1 : -1)
/** Đa giác kín → vòng mượt với mép sứt mịn (nhiễu fbm vuông góc từng cạnh). */
function rough(base: Pt[], amp: number, nz: (x: number, y: number) => number, sub = 2): string {
  const pts: Pt[] = []
  const n = base.length
  for (let i = 0; i < n; i += 1) {
    const a = base[i] as Pt
    const b = base[(i + 1) % n] as Pt
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    for (let j = 0; j < sub; j += 1) {
      const x = a[0] + (dx * j) / sub
      const y = a[1] + (dy * j) / sub
      const k = fbm(nz, x / 37, y / 37, 3) * amp * 2
      pts.push([x + (dy / l) * k, y - (dx / l) * k])
    }
  }
  return loop(pts)
}
const o = (v: number) => ` style="opacity:${fm(v)}"`
/** Hình tĩnh định nghĩa trong defs (mặt tượng) → <use> gọn trong svg. */
const U = (id: string, c = '', v = 1) => `<use href="#td-${id}"${c ? ` class="${c}"` : ''}${v < 1 ? o(v) : ''}/>`
/** Đường gãy → chia nhỏ, đẩy vuông góc theo nhiễu fbm (mép bờ rêu / cỏ gồ ghề). */
function wob(base: Pt[], amp: number, nz: (x: number, y: number) => number, sub = 3): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < base.length - 1; i += 1) {
    const a = base[i] as Pt
    const b = base[i + 1] as Pt
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    for (let j = 0; j < sub; j += 1) {
      const x = a[0] + (dx * j) / sub
      const y = a[1] + (dy * j) / sub
      const k = i && fbm(nz, x / 23, y / 23, 3) * amp * 2
      out.push([x + (dy / l) * k, y - (dx / l) * k])
    }
  }
  out.push(base[base.length - 1] as Pt)
  return out
}

type Flags = {
  night: boolean
  rain: boolean
  heavy: boolean
  snow: boolean
  wet: number
  lite: boolean
  frost: boolean
  /** Độ đậm sương sớm (đông, 0..1). */
  rime: number
  late: boolean
  lean: number
  /** Hệ số chiều cao cỏ theo mùa. */
  gh: number
  /** Nguồn sáng bên trái (trước 12 h; đêm: trăng trên cao, coi như sáng). */
  am: boolean
}

/** Chỏm tuyết (hoặc sương muối) cho một hình có id: bản sao dịch lên, đặt TRƯỚC hình gốc → chỉ lộ ở mép trên. */
function cap(f: Flags, id: string, dx = 0, dy = -6): string {
  if (f.snow) return `<use href="#td-${id}" class="p3"${XY(dx * 1.4, dy * 1.4)}/>`
  if (f.rime > 0) return `<use href="#td-${id}" class="f3"${XY(dx / 2.5, dy / 2.5)}${o(0.35 + f.rime * 0.45)}/>`
  return ''
}
/** Mặt cỏ có id + vân cỏ. */
function turf(id: string, d: string, f: Flags): string {
  // tuyết: phủ kín mặt cỏ (không chỉ viền) · đêm: cỏ chìm tối hơn đá → mặt tượng tách khỏi đồi dưới trăng
  return idp('g2', id, d) + (f.lite || f.snow ? '' : `<use href="#td-${id}" fill="url(#td-pg)"/>`) + (f.snow ? U(id, 'p3', f.night ? 0.36 : 0.66) : f.night ? U(id, 'k1', 0.3) : '')
}
/** Sáng–tối theo sườn đồi: một dải chuyển màu chung theo x THẾ GIỚI (bí danh theo gốc mảnh) → không lộ mép giữa các mảnh. */
const shade = (id: string, k: number) => `<use href="#td-${id}" fill="url(#td-h${k || 's'})"/>`
/** Đáy bám mặt đất lõi (+40) từ x = b lùi về a. */
function base(b: number, a: number, ox: number, oy: number): string {
  let d = ''
  for (let x = b; x > a - 59; x -= 80) d += `L${xy(Math.max(x, a) - ox, ground(Math.max(x, a)) + 40 - oy)}`
  return d
}
/** Khối đồi trong [a, b] (tương đối gốc ox, oy), đáy chìm dưới mặt đất lõi. */
function mound(a: number, b: number, ox: number, oy: number): string {
  const top: Pt[] = []
  for (let x = a; x < b; x += 80) top.push([x - ox, hill(x) - oy])
  top.push([b - ox, hill(b) - oy])
  return `${sp(top) + base(b, a, ox, oy)}Z`
}
/** Dải tuyết / sương muối dọc mép đồi [a, b]: mép dưới nhiễu theo x THẾ GIỚI → liền giữa các mảnh, không khía. */
function frostTop(f: Flags, nz: (x: number, y: number) => number, a: number, b: number, ox: number, oy: number): string {
  if (!f.snow && !f.rime) return ''
  const top: Pt[] = []
  let bot = ''
  for (let x = b; x > a - 59; x -= 60) {
    const X = Math.max(x, a)
    top.unshift([X - ox, hill(X) - oy - 2])
    bot += `L${xy(X - ox, hill(X) - oy + (f.snow ? 22 : 5) + fbm(nz, X / 70, 0.5, 3) * (f.snow ? 44 : 12))}`
  }
  return P(f.snow ? 'p3' : 'f3', `${sp(top) + bot}Z`, f.snow ? '' : o(0.3 + f.rime * 0.3))
}
/** Dải cỏ viền dọc đường y(x), nghiêng theo dốc. */
function fringe(a: number, b: number, y: (x: number) => number, step = 150): string {
  let s = ''
  const w = step >= 140 ? 160 : 80
  for (let x = a; x < b; x += step) {
    const y0 = y(x)
    const k = (y(x + w) - y0) / w
    const q = Math.abs(k)
    s += use((w > 80 ? 'gS' : 'gs') + (q < 0.12 ? '' : (k > 0 ? 1 : 2) + (q > 0.4 ? 'b' : '')), x, y0 + 2)
  }
  return s
}

// ───────────── 1. ĐẦU (tiêu điểm) ─────────────
// Hệ cục bộ dựng thẳng; sau khi xoay: "trên" cục bộ = trên–trái thế giới, "phải" cục bộ = phải hơi lên.
const EAR = 'M140-40C164-54 176-20 170 12C166 42 172 76 158 98C148 110 136 102 138 84Z'
// Mặt dựng bằng 3 tầng phẳng (không đường viền): FS bóng (hốc mắt dưới gờ mày, sườn mũi khuất, dưới mũi, dưới môi, má quay đi,
// gầm cằm) · FH sáng (gờ mày, sống mũi, gò má, mí trên phồng, môi trên, đỉnh cằm) · FK nếp sâu (kẽ mi nhắm cong xuống, khe môi
// có khoé, lỗ mũi). PR/PL: mặt nghiêng phải/trái đổi vai theo nguồn sáng sáng/chiều.
const FS =
  'M-22 34C-8 46 10 46 24 34C16 54-14 54-22 34ZM-32 100C-10 116 14 116 36 100C18 124-14 124-32 100ZM-62 146C-20 166 32 164 72 142C42 172-30 176-62 146Z'
const FH =
  'M-128-58C-100-90-38-92-6-68C-40-76-94-74-128-58ZM12-68C44-92 106-88 136-56C106-74 44-78 12-68Z' +
  'M-7-62C-6-30-6 0-11 24C-4 20 3 20 7 22C3 0 3-30 3-62Z' +
  'M-34 70C-14 62 14 62 36 70C16 75-14 75-34 70ZM-28 90C-10 97 12 97 30 90C14 99-12 99-28 90ZM-32 128C-12 118 16 118 36 128C16 134-12 134-32 128Z'
const FK =
  'M-100-34C-82-17-46-17-24-36C-44-24-82-23-100-34ZM24-36C44-17 82-18 102-30C82-23 44-24 24-36Z' +
  'M-34 80C-16 84 0 83 2 82C6 83 20 84 36 80C20 89-16 89-34 80ZM-37 79c-3 2-3 6 0 7c-1-2-1-5 0-7ZM39 79c3 2 3 6 0 7c1-2 1-5 0-7ZM-15 40c4-4 9-4 11 0c-3 2-8 2-11 0ZM5 41c3-4 8-4 11 0c-3 2-8 2-11 0Z'
const PR = 'M4-56C8-24 14 6 24 30L8 34C6 8 4-24 2-56ZM40 0C80-4 120 4 142-24C152 20 142 64 120 100C98 130 58 150 14 158C66 132 100 98 108 56C112 30 90 10 40 0ZM134-58C148-40 152-10 148 10C142-12 140-36 130-54Z'
const PL = 'M-6-56C-10-24-16 6-26 30L-12 34C-8 8-6-24-4-56ZM-128-20C-138 22-130 64-106 104C-122 58-120 20-114 0Z'
/** Khe nứt (khối đặc thuôn) & đường giữa (đêm rỉ sáng). */
const CRK = 'M28-124l-4 14 3 12-5 13 3 0 5-12-1-12 3-15ZM146 6l-8 16 2 12-7 14 1 14-6 10 3 0 7-10 0-14 7-14-2-12 7-16ZM-128 30l10 4 8 10 10 8 3 10-2 1-5-9-10-8-8-10-7-3Z'
const CRC = 'M28-124l-4 14 3 12-5 13M145 8l-7 16 1 12-6 14 0 14-5 10M-127 32l9 5 8 10 10 8 3 10'
const LID = 'M-104-32C-84-17-44-17-20-36M20-34C42-17 86-17 106-28'
/** Chân tóc (cục bộ, trái → phải): viền rêu dày rủ xuống trán. */
const HAIRLINE: Pt[] = [[-150, -36], [-136, -78], [-100, -110], [-52, -122], [0, -130], [52, -124], [104, -106], [146, -78], [172, -40]]
/** Khối đá mặt: trán rộng, gò má lệch, cằm dài thon xuống (không đĩa tròn); quai hàm chìm trong đất. */
const FACE: Pt[] = [[-124, 62], [-140, -10], ...HAIRLINE.slice(0, 8), [160, -44], [152, 22], [140, 86], [108, 134], [56, 166], [4, 180], [-50, 170], [-98, 130]]

function headPiece(ctx: Ctx, f: Flags): Piece {
  const nz = ctx.noise('td-da')
  const S = ctx.season
  const gy = (x: number) => ground(HX + x) - HY
  // ── sườn cỏ sau đầu = tóc: một khối liền với đồi, trùm qua vòm đầu rồi đổ về vai
  // mép tóc–đồi: dáng dài lệch (dốc đứng phía trán, đuôi tóc trải dài xuống trái), mép gồ nhiễu fbm như bờ rêu, không vòm tròn
  const crest = wob([[-600, gy(-600)], [-540, gy(-540) - 10], [-470, gy(-470) - 50], [-420, 130], [-366, 62], [-316, -4], [-270, -70], [-226, -124], [-180, -168], [-120, -204], [-40, -216], [40, -198], [100, -156], [152, -80], [214, hill(HX + 214) - HY]], f.lite ? 5 : 10, nz, 2)
  let w = cap(f, 'tb') + turf('tb', `${sp(crest) + base(HX + 214, HX - 600, HX, HY)}Z`, f) + (f.lite || f.rain ? '' : shade('tb', 0))
  // khối tóc tròn đầy: đỉnh bắt sáng phía nguồn, chân sau gáy chìm tối (gradient tròn, không mép)
  if (!f.snow && !f.rain) w += `<ellipse cx="${f.am ? -120 : -20}" cy="-176" rx="130" ry="36" fill="url(#td-rh)"${o(f.night ? 0.2 : 0.36)}/><ellipse cx="-340" cy="70" rx="210" ry="140" fill="url(#td-rs)"${o(0.45)}/>`
  // lọn tóc rêu: rãnh tối chạy song song mép lưng, đuôi cuộn ở chân đồi — tóc chảy xuống chứ không phải mũ
  if (!f.snow) {
    const lk = (a: number, b: number, d: number) => crest.slice(a, b).map(([x, y]) => [x + d * 0.55, y + d] as Pt)
    w += P('td-km', sp(lk(8, 23, 30)) + sp(lk(4, 18, 66)) + (f.lite ? '' : sp(lk(11, 21, 98))), o(f.night ? 0.35 : 0.5)) + (f.lite ? '' : P('td-kr', sp(lk(6, 20, 46)), o(0.35)))
  }
  if (!f.night && !f.lite && !f.snow) w += P('td-kr', sp(f.am ? crest.slice(7, 20) : crest.slice(17, 27)))
  const flw = !f.night && (S === 'xuan' || S === 'ha' || S === 'thu' || f.late)
  if (flw) w += P('td-kfl', sp(crest.slice(8, 23).map(([x, y]) => [x + 12, y + 24] as Pt)), S === 'xuan' ? ' style="stroke-width:34"' : '')

  // ── mặt đá xoay: khối sứt mép, địa y, mặt phẳng sáng–tối, khe nứt, rêu theo vệt nước, vòm cỏ & viền rêu chân tóc
  let h = `${cap(f, 'fa', 3, -5)}<g class="td-gt"><path id="td-fa" d="${rel(rough(FACE, 4, nz, f.lite ? 1 : 2))}"/></g>${U('ea', 'td-gt')}${f.lite ? '' : P('sh', 'M146-20C158-24 162 0 158 20C156 40 160 64 152 80C146 60 150 20 146-20Z', o(0.4))}`
  if (!f.lite) h += '<use href="#td-fa" fill="url(#td-pl)"/>'
  // mặt quay đi khỏi nguồn sáng tối hẳn một nửa → khối tròn của đầu; đêm: trăng trên cao rọi sáng trán & gò má (tách khỏi đồi tối)
  h += U('pr', f.am ? 'sh' : 'hl', f.am ? 0.24 : 0.32) + U('pq', 'sh', f.am ? 0.16 : 0.34) + U('fs', 'sh', f.night ? 0.5 : 0.44) + U('fh', 'hl', f.night ? 0.4 : f.am ? 0.4 : 0.3) + U('fo') + U('fp', '', f.am ? 1 : 0.7) + U('fk', 'k1', 0.62)
  // má trái vỡ một mảng: mặt vỡ phẳng, mép trên bắt sáng; sứt nhỏ ở thái dương & cằm
  h += P('s3', `M-104 14l10-11 13 3 9-1 8 13-9 9-13 0-11 4Z${f.lite ? '' : 'M150-20l8 6-2 10-8 2ZM-60 150l12-4 8 6-4 6Z'}`, o(0.7)) + U('ck', 'k1', 0.5)
  if (!f.lite) {
    h += P('z3', 'M-104 14l10-11 13 3 9-1M27-124l-4 14 3 12M144 8l-7 16 1 12')
    // rêu đọng nơi khuất & mặt trên (gờ mày, nếp mũi–má, dưới môi) rồi chảy theo vệt nước xuống trái–dưới thế giới
    h += P('m2', 'M-24 42q-16 12-22 30q2 2 4 0q6-14 18-26ZM-22 102q12 9 28 4q-4 8-14 8q-10 0-14-12Z', o(0.9))
    h += P('td-km', 'M150-70q-16 30-40 56M50-122q-12 22-30 44M-40-122q-14 22-34 44') + P('td-kn', 'M110-14q-14 26-36 52M20-78q-8 14-22 30M-74-78q-12 18-30 34')
  }
  if (f.wet > 0.15 && !f.lite) h += '<use href="#td-fa" class="wetsheen"/>'
  // chân tóc: viền rêu mỏng đứt quãng đổ bóng xuống trán; phía trên là chính sườn cỏ (không có "mũ")
  if (!f.lite) h += P('sh', sp([...HAIRLINE, ...[...HAIRLINE].reverse().map(([x, y]) => [x - 4, y + 20] as Pt)], true), o(0.34))
  const fr = HAIRLINE.map(([x, y]) => [x, y - 7] as Pt)
  h += P('m2', rough([...fr, ...[...HAIRLINE].reverse().map(([x, y]) => [x, y + 5] as Pt)], 5, nz, f.lite ? 1 : 2), o(0.55))
  if (!f.lite) h += dots('td-q3', HAIRLINE.slice(1, 8).map(([x, y], i) => [x + 6, y - (i % 2 ? 6 : 10)] as Pt))
  if (f.frost) h += P(f.snow ? 'p3' : 'f3', 'M-124-62C-100-86-40-90-8-70C-40-80-92-80-124-62ZM14-70C44-90 104-86 132-60C104-76 46-78 14-70Z', f.snow ? '' : o(0.3 + f.rime * 0.4))

  // ── chăn cỏ phía trước: cằm & quai hàm chìm vào đất; bóng mờ nơi chạm cỏ
  const rim: Pt[] = []
  for (let x = -300; x < -150; x += 50) rim.push([x, gy(x) - 1])
  for (const p of [[-132, 70], [-104, 116], [-56, 146], [0, 154], [58, 140], [104, 108], [138, 72]] as Pt[]) rim.push(T(p[0], p[1]))
  rim.push([176, hill(HX + 176) - HY + 10], [214, hill(HX + 214) - HY + 6])
  const sh = rim.slice(5, 11)
  let front = f.lite ? '' : P('k1', sp([...sh.map(([x, y]) => [x, y - 14] as Pt), ...[...sh].reverse()].filter((_, i) => i % 2 === 0), true), o(0.18))
  front += cap(f, 'm0') + turf('m0', `${sp(rim) + base(HX + 214, HX - 300, HX, HY)}Z`, f) + (f.lite ? '' : shade('m0', 0))
  const rimY = (x: number) => {
    for (let i = 1; i < rim.length; i += 1) {
      const a = rim[i - 1] as Pt
      const b = rim[i] as Pt
      if (x <= b[0]) return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0] || 1)
    }
    return (rim[rim.length - 1] as Pt)[1]
  }
  front += fringe(-252, 200, rimY, f.lite ? 230 : 160)
  // cây mọc trong khe nứt (thẳng đứng theo thế giới), bụi cỏ & cây con & dương xỉ trên đỉnh đồi-tóc
  let top = use('gu', 112, -72) + use('gu', -79, 94) + use('gu', -214, -100) + (f.lite ? '' : use('gu', 110, -146))
  if (S === 'ha' && !f.night) top += use('fc', 114, -70)
  let sprout = P('td-kt', 'M-40-220q-6-16 2-34q6-8 4-16', ' stroke-width="3"')
  if (S !== 'dong') sprout += P(S === 'thu' ? 'l3' : 'l1', 'M-36-254q-16-10-22 2q12 8 22-2Zm2-14q12-12 20-2q-10 8-20 2Z')
  else if (f.late) sprout += dots('td-kp', [[-46, -256], [-32, -268]])
  const svg =
    G(`translate(${HX} ${HY})`, w) +
    G(`translate(${HX} ${HY})rotate(${HA})scale(${HK})`, h) +
    G(`translate(${HX} ${HY})`, `${front + top}<g class="sw2">${sprout}</g>${f.lite ? '' : `<g class="sw1">${use('fe', -170, -160)}</g>`}`)
  // ── đêm: khe nứt & mí mắt rỉ sáng rất mờ như đang mơ, bụi sáng bay lên
  let glow = ''
  if (f.night) {
    glow = G(`translate(${HX} ${HY})rotate(${HA})scale(${HK})`, `<g class="td-gw"${anim(ctx, 9, 'td-gw')}>${P('td-kh', CRC)}${P('td-kx', CRC + LID)}</g>`)
    if (!f.lite) {
      let motes = ''
      for (const [i, [x, y]] of ([[20, -110], [-120, 40]] as Pt[]).entries()) {
        const [wx, wy] = T(x, y)
        motes += P('td-kz td-mo', `M${xy(wx, wy)}h0`, anim(ctx, 13, `td-mo${i}`))
      }
      glow += G(`translate(${HX} ${HY})`, motes)
    }
  }
  return { layer: 3, x0: HX - 600, x1: HX + 220, prio: 9, svg, glow }
}

// ───────────── 2. VAI (đỉnh gò): mỏm đá thấp lộ khỏi cỏ, rêu trên lưng, cây con nghiêng ─────────────
function shoulderPiece(ctx: Ctx, f: Flags): Piece {
  const r = ctx.rng('td-vai')
  const nz = ctx.noise('td-vai')
  const S = ctx.season
  const ox = 9960
  const oy = 430
  const hy = (x: number) => hill(ox + x) - oy
  let s = turf('m1', mound(9860, 10330, ox, oy), f) + (f.lite ? '' : shade('m1', 1)) + frostTop(f, ctx.noise('td-tuyet'), 9860, 10300, ox, oy)
  // mỏm đá (cơ vai) dâng khỏi cỏ rồi chìm dần về phía tay; chân bị cỏ phủ
  s += `${cap(f, 'vd')}<g class="td-gt"><path id="td-vd" d="${rel(rough([[-110, hy(-110) + 12], [-96, hy(-96) - 6], [-60, -28], [-10, -32], [44, -26], [96, hy(96) - 6], [130, hy(130) + 12]], 3, nz, f.lite ? 2 : 3))}"/></g>`
  if (!f.lite) s += '<use href="#td-vd" fill="url(#td-pl)"/>'
  s += P('hl', f.am ? 'M-108-14C-92-30-60-36-24-38C-60-32-88-24-104-8Z' : 'M10-38C50-34 84-20 104-2C80-14 50-28 10-38Z', o(0.2)) + P('sh', f.am ? 'M40-26C80-14 106-2 120 14L60 20C66 0 56-14 40-26Z' : 'M-110-8C-104-22-84-30-60-34C-80-22-92-6-94 14Z', o(0.22))
  // rêu đóng trên lưng đá, rủ giọt theo vệt nước
  s += P('td-gm', 'M-100-14c8-14 34-20 58-18c12-6 38-6 52 2c-8 6-16 2-24 6c-8 2-12 0-20 4c-10 2-14-2-24 2c-14 2-22 2-30 4c-6 2-8 2-12 0Z')
  if (!f.lite) s += P('td-kn', 'M-60-26q-6 12-4 22M8-30q4 12 2 20') + dots('td-kq', [[-80, -20], [-40, -32], [6, -34]])
  if (f.frost) s += P(f.snow ? 'p3' : 'f3', 'M-104-14c10-14 36-18 60-18c14-6 40-4 52 2c-30 2-80 4-112 16Z', f.snow ? '' : o(0.6))
  // lá đỏ mùa thu trên vai
  if (S === 'thu') {
    let lv = ''
    for (let i = 0; i < (f.lite ? 2 : 4); i += 1) {
      const x = -90 + r() * 260
      lv += `M${xy(x, Math.min(hy(x), -40 + Math.abs(x) * 0.2) - 6 + r() * 6)}q${xy(3 + r() * 3, -4)} ${xy(8, r() * 4 - 2)}q-4 4-8 0`
    }
    s += P('l3', lv)
  }
  // cây con nghiêng, tán lệch 3 cụm (không tròn), mọc ở sườn phải vai
  const tx = 132
  const ty = n0(hy(tx) - 4)
  let tree = P('td-kt', 'M0 0C2-16-6-28-2-44C0-52 8-58 14-66M-2-40C-10-46-16-48-24-48', ' stroke-width="4"')
  if (S !== 'dong') {
    const k = S === 'thu' ? 0.7 : 1
    const crown = bl(-18, -52, 19 * k, 10 * k, r, 11, 0.45) + bl(14, -70, 15 * k, 11 * k, r, 10, 0.42) + (S === 'thu' ? '' : bl(26, -54, 10, 7, r, 8, 0.4))
    tree += P(S === 'ha' ? 'l3' : S === 'thu' ? 'l4' : 'l2', crown) + P(S === 'thu' ? 'l3' : 'l1', bl(-24, -58, 9 * k, 6 * k, r, 7, 0.3) + bl(8, -76, 8 * k, 5 * k, r, 7, 0.3), o(0.85))
    if (S === 'xuan') tree += dots('td-kp', [[-14, -60], [16, -78], [26, -58]])
  } else if (f.late) tree += dots('td-kp', [[-22, -48], [14, -66], [-6, -40]])
  if (f.snow) tree += P('p3', 'M-24-49l14-1-1 2-13 1ZM8-58l8-6v2l-7 6Z')
  s += G(`translate(${tx} ${ty})`, `<g class="sw4">${tree}</g>${P('ao', 'M-14 3a14 3 0 0 0 28 0Z')}`)
  if (S === 'thu' && !f.lite) s += P('l3 td-lv', `M${xy(tx + 10, ty - 70)}q4-5 9 0q-4 5-9 0`, anim(ctx, 12, 'td-lv0'))
  s += fringe(150, 380, x => hy(x) - 1, f.lite ? 300 : 150) + fringe(-130, 140, x => hy(x) + (Math.abs(x) < 110 ? -2 : -1), f.lite ? 270 : 135)
  if (!f.lite) s += `<g class="sw1">${use('gu', 300, hy(300) + 2)}</g>`
  return { layer: 3, x0: 9840, x1: 10340, prio: 8, svg: G(`translate(${ox} ${oy})`, s) }
}

// ───────────── 3. BÀN TAY NGỬA NẰM TRÊN CỎ: cẳng tay chui khỏi sườn, ngón cong khum (hai ngón gãy), tổ chim trên ngón ─────────────
/** Ngón: đường giữa, bề rộng, độ thuôn đầu (nhỏ = gãy cụt). Sau → trước: út gãy, áp út, giữa gãy, trỏ, cái. */
const FING: [Pt[], number[], number][] = [
  [[[106, -30], [128, -56], [140, -72]], [13, 12, 11], 0.1],
  [[[88, -38], [112, -76], [124, -104], [120, -118]], [15, 15, 14, 12], 0.7],
  [[[64, -42], [84, -88], [94, -122], [88, -138]], [17, 17, 16, 13], 0.7],
  [[[40, -44], [50, -88], [52, -118], [44, -130]], [17, 17, 15, 12], 0.7],
  [[[-22, -40], [-26, -66], [-16, -90], [-2, -100]], [17, 15, 13, 11], 0.7],
]
/** Tổ chim nằm giữa lòng bàn tay ngửa, giữa ngón cái và các ngón khum. */
const NEST: Pt = [14, -48]

function handPiece(ctx: Ctx, f: Flags): Piece {
  const S = ctx.season
  const nz = ctx.noise('td-tay')
  const ox = 10470
  const oy = 592
  const hy = (x: number) => hill(ox + x) - oy
  let w = turf('m2', mound(10290, 10780, ox, oy), f) + (f.lite ? '' : shade('m2', 2)) + frostTop(f, ctx.noise('td-tuyet'), 10300, 10780, ox, oy)
  const ax = QX - ox
  const ay = n0(hy(ax))
  // ── bàn tay (hệ riêng, gốc trên mặt cỏ giữa lòng bàn tay)
  let s = P('ao', 'M-214 8C-120-4 40-4 112 6C40 16-120 16-214 8Z', o(0.5))
  s += `${cap(f, 'ca')}<g class="td-gt"><path id="td-ca" d="${rel(rough([[-216, 12], [-204, -14], [-160, -32], [-100, -40], [-56, -40], [-24, -46], [-20, 12]], 2.5, nz, 2))}"/></g>`
  if (!f.lite) s += '<use href="#td-ca" fill="url(#td-pl)"/>'
  if (!f.lite) s += P('hl', 'M-200-8C-180-26-140-36-100-40C-70-42-46-42-26-46C-46-38-70-36-100-34C-140-30-176-20-200-8Z', o(0.3)) + P('td-gm', 'M-170-26c20-12 50-14 70-10c-14 2-26 2-36 6c-12 2-22 2-34 4Z')
  const fing = FING.map(([c, wd, tk]) => limb(c, wd, tk))
  const fin = (L: Limb, i: number) => {
    const k = litSide(L, f.am)
    let t = `<use href="#td-f${i}" class="k1" x="4" y="2"${o(0.36)}/><g class="td-gt"><path id="td-f${i}" d="${rel(shape(L))}"/></g>${f.lite ? '' : P('hl', band(L, k, 0.42), o(0.22))}`
    if (FING[i]?.[2] === 0.1) {
      const e = L.c[L.c.length - 1] as Pt
      const q = L.n[L.n.length - 1] as Pt
      const wv = L.w[L.w.length - 1] as number
      t += P('s4', `M${xy(e[0] + q[0] * wv, e[1] + q[1] * wv)}q${xy(-q[0] * wv + q[1] * 5, -q[1] * wv - q[0] * 5)} ${xy(-2 * q[0] * wv, -2 * q[1] * wv)}Z`) + P('z3', `M${xy(e[0] + q[0] * wv, e[1] + q[1] * wv)}l${xy(-2 * q[0] * wv, -2 * q[1] * wv)}`)
    }
    return t
  }
  s += fin(fing[0] as Limb, 0) + fin(fing[1] as Limb, 1) + fin(fing[2] as Limb, 2) + fin(fing[3] as Limb, 3)
  // lòng bàn tay: mép gần (gò bàn tay), lõm khum về phía ngón; đốm khô dưới ngón cong (chỗ mèo trú mưa)
  s += cap(f, 'pt', 0, -5) + idp('td-gt', 'pt', 'M-34-44C-4-40 30-34 60-42C80-46 98-36 106-18L108 12L-34 12Z')
  s += P('hl', 'M-32-44C-4-40 30-34 58-41C30-30-4-34-32-44Z', o(0.3)) + P('ao', 'M-8-40a28 5 0 1 0 56 0a28 5 0 1 0-56 0Z', o(f.rain ? 0.6 : 0.35))
  s += fin(fing[4] as Limb, 4)
  // khớp ngón (nếp ngang mờ), rêu đóng trên đốt & lòng tay
  if (!f.lite) s += P('sh', 'M44-90q8 3 15 0M84-90q8 3 15-1M110-80q7 3 13-1M-31-66q8 3 14-1', ' style="fill:none;stroke:var(--k1);stroke-width:3;opacity:.25"') + P('td-gm', 'M-30-6c16-6 50-8 80-2c-26 0-56 0-80 2ZM84-128c6-10 18-12 22-4c-8-2-16 0-22 4ZM42-124c6-6 14-6 18 0c-6-1-12-1-18 0Z') + dots('td-kq', [[-6, -10], [30, -8]])
  // tổ chim nằm trong khe hai ngón cong: đan cành, vành sáng, theo mùa (xuân trứng · hạ đầu chim non · thu lá · đông trống)
  let nest = P('d2', 'M-24-2a25 5 0 1 0 50 0a25 5 0 1 0-50 0Z')
  if (S === 'xuan') nest += dots('td-ku', [[-8, -5], [3, -6], [12, -4]])
  else if (S === 'ha') nest += dots('td-kk', [[-6, -7], [9, -8]])
  nest += P('b2', 'M-27-1q2 18 28 18q26 0 28-18q-28 7-56 0Z') + P('td-kb', `M-24 4q25 8 50 0${f.lite ? '' : 'M-18 10q19 6 38 0M-28-3l9 3M24-2l8-5M-12-2l-6 14M14-1l4 13'}`) + P('td-kd', 'M-27-1q28 8 56 0')
  if (S === 'thu') nest += P('l3', 'M8-2q8-8 18-2q-9 6-18 2Z')
  if (f.snow || f.frost) nest += P(f.snow ? 'p3' : 'f3', 'M-28-2q28 6 56 0q-28 10-56 0Z', f.snow ? '' : o(0.6))
  s += G(`translate(${NEST[0]} ${NEST[1]})`, nest)
  w += G(`translate(${ax} ${ay})`, s)
  // cỏ phủ chân cẳng tay nơi nó chui ra khỏi sườn, cỏ viền
  w += fringe(-250, -150, x => hy(x) - 2, f.lite ? 160 : 80) + fringe(-60, 300, x => hy(x) - 1, f.lite ? 300 : 150)
  // đầu ngón giữa gãy rơi trên cỏ (mặt gãy tối), cột đá gãy ngọn & trống cột đổ ở mép phải
  const gx = 150
  if (!f.lite) w += G(`translate(${gx} ${n0(hy(gx) + 6)})rotate(-8)`, P('ao', 'M-18 2h40l-4 3h-34Z') + P('td-gt', 'M-16 2c-3-8-2-16 3-20h24c6 2 9 10 6 20Z') + P('s4', 'M-16 2c-5-6-5-14 3-20c4 6 4 14-3 20Z') + P('hl', 'M-10-16h20c2 2 4 4 4 6h-22Z', o(0.3)))
  const px = 252
  let c = P('ao', 'M-28 0h58l-4 4h-50Z') + cap(f, 'cl', 0, -5) + idp('td-gt', 'cl', 'M-16 0V-96l6-8 6 5 5-10 7 6 6-2V0Z') + P(f.am ? 'sh' : 'hl', 'M6 0V-98l8-2V0Z', o(0.3)) + P('z2', 'M-8-94V-4M0-96V-4', o(0.5))
  if (!f.lite) c += P('td-gm', 'M-18-96c6-14 26-16 34-2c-8-4-14 2-20 0c-6-2-10 4-14 2ZM-16-16c0-20 6-40 2-60c6 14 6 40 6 60Z')
  w += `${G(`translate(${px} ${n0(hy(px))})`, c)}<use href="#td-col" transform="translate(${xy(214, hy(214) + 6)})rotate(12)"/>`
  // bãi cỏ phẳng cạnh bàn tay (mèo ngủ xuân/hạ)
  const cx = 180
  w += `<g class="sw3">${use('gu', cx - 58, hy(cx - 58) + 4)}</g>`
  if ((S !== 'dong' || f.late) && !f.night) w += use('fc', 120, hy(120) + 6) + (f.lite ? '' : use('fc', 196, hy(196) + 8))
  if (f.rain) w += P('a2', `M${cx - 20} ${n0(hy(cx - 20) + 6)}a18 3 0 1 0 36 0a18 3 0 1 0-36 0Z`) + (f.lite || f.heavy ? '' : P('a1 rip', `M${cx - 8} ${n0(hy(cx - 8) + 6)}a8 2 0 1 0 16 0a8 2 0 1 0-16 0Z`, ' opacity=".7"'))
  if (f.heavy && !f.lite) w += P('a1 td-dr', `M${xy(ax - 4, ay - 116)}c-2 3-2 6 0 6s2-3 0-6Z`, anim(ctx, 1.7, 'td-dr2'))
  return { layer: 3, x0: 10280, x1: 10790, prio: 8, svg: G(`translate(${ox} ${oy})`, w) }
}

// ───────────── 4. BẬC ĐÁ CỔ (mặt bậc, mặt đứng, mặt bên; bậc sứt), ĐÈN ĐÁ, BIỂN ─────────────
function stepsPiece(ctx: Ctx, f: Flags): Piece {
  const S = ctx.season
  const ox = 9460
  const oy = 720
  const gy = (x: number) => ground(ox + x) - oy
  const n = f.lite ? 5 : 8
  const st: { x: number; y: number; sx: number; sy: number }[] = []
  let Y = 84
  for (let i = 0; i < n; i += 1) {
    const k = i / (n - 1)
    const sy = (17 - 8 * k) / 12
    if (i) {
      const p = st[i - 1] as { y: number; sy: number }
      Y = p.y - 10 * p.sy - 12 * sy + 1.5
    }
    st.push({ x: -34 + 104 * k ** 1.15 + Math.sin(k * 5.2) * 6, y: Y, sx: (128 - 76 * k) / 100, sy })
  }
  const f2 = (v: number) => (Math.round(v * 100) / 100).toString().replace(/^(-?)0\./, '$1.')
  let s = [...st].reverse().map((q, i) => `<use href="#td-${i % 3 === 1 ? 'sb' : 'st'}" transform="translate(${xy(q.x, q.y)})scale(${f2(q.sx)} ${f2(q.sy)})"/>`).join('')
  const top = st[n - 1] as { x: number; y: number; sx: number }
  const tw = top.sx * 100
  s += P('g2', `M${xy(top.x - tw * 0.56, top.y + 6)}q${xy(tw * 0.4, -16)} ${xy(tw * 0.8, -13)}q${xy(12, 4)} ${xy(tw * 0.34, 15)}Z`, ' opacity=".9"')
  if (!f.lite) for (const [i, q] of st.entries()) if (i % 4 === 1) s += use('gu', q.x + (i % 8 === 1 ? -50 : 50) * q.sx, q.y + 12 * q.sy)
  s += fringe(-150, -50, x => gy(x) - 1, 150)
  if (S === 'thu') s += P('l3', st.filter((_, i) => i % 3 === 0).map(q => `M${xy(q.x - 8, q.y - 6)}q4-5 9-1q-4 4-9 1Z`).join(''))
  // đèn đá (đế, cột, hộp lửa, mái cong rêu) bên trái bậc giữa
  const lx = -104
  const ly = n0(gy(lx) + 36)
  const L = (y: number) => ly + y
  let lan = P('ao', `M-18 ${L(0)}a18 4 0 1 0 36 0a18 4 0 1 0-36 0Z`) + P('s3', `M-14 ${L(0)}h28l-3-8h-22ZM2 ${L(-8)}h3v-26h-3ZM6 ${L(-34)}h6v-20h-6ZM-20 ${L(-53)}q4-2 6-6h28q2 4 6 6l-3 2h-34Z`)
  lan += P('s2', `M-5 ${L(-8)}h10v-26h-10ZM-12 ${L(-34)}h24v-20h-24Z`) + cap(f, 'lr', 0, -4) + idp('s2', 'lr', `M-10 ${L(-59)}q10-10 20 0Z`) + P('k1', `M-5 ${L(-37)}h10v-13h-10Z`)
  if (!f.lite) lan += P('td-gm', `M-16 ${L(-58)}q6-6 16-4q10-2 14 4q-14-2-30 0Z`)
  s += G(`translate(${lx} 0)`, lan)
  // bát hương nhỏ trên bậc gần trên cùng: vẫn có người đến thắp
  if (!f.lite) {
    const q = st[n - 2] as { x: number; y: number; sx: number; sy: number }
    const bx = n0(q.x + q.sx * 14)
    const by = n0(q.y - 4 * q.sy)
    s += P('d1', `M${bx - 7} ${by}q7 4 14 0l-2-6h-10Z`) + P('z2', `M${bx - 3} ${by - 6}l-1-12M${bx} ${by - 6}v-14M${bx + 3} ${by - 6}l2-11`)
  }
  // biển gỗ "suỵt… người đang ngủ" cạnh bậc dưới
  const bx = 78
  const by = 82
  let sign = P('b1', `M-2 ${by}v-30h4v30Z`) + P('b2', `M-31 ${by - 44}h60l1 20h-62Z`)
  sign += `<text class="k2 td-tx"><tspan x="-28" y="${by - 35}">suỵt…</tspan><tspan x="-28" y="${by - 27}">người đang ngủ</tspan></text>`
  if (f.snow) sign += P('p3', `M-32 ${by - 45}h62v3h-62Z`)
  s += G(`translate(${bx} 0)rotate(-5 0 ${by})`, sign)
  s += `<g class="sw3">${use('gu', -104, 96)}</g>${f.lite ? '' : `<g class="sw2">${use('gu', 104, 92)}</g>`}`
  if ((S === 'xuan' || S === 'ha') && !f.night) s += use('fc', -116, 100)
  let glow = ''
  if (f.night) glow = G(`translate(${ox + lx} ${oy})`, `<ellipse cy="${L(-44)}" rx="48" ry="42" fill="url(#gw)" class="fl"/>${P('e1 fl', `M-5 ${L(-37)}h10v-13h-10Z`)}`)
  return { layer: 3, x0: ox - 150, x1: ox + 140, prio: 7, svg: G(`translate(${ox} ${oy})`, s), glow }
}

// ───────────── 5. ĐỒNG CỎ TRƯỚC MẶT: chỉ là mảng — bóng đầu tượng, dải tối theo đường đồng mức, dương xỉ ở đáy ─────────────
function meadowPiece(ctx: Ctx, f: Flags): Piece {
  const r = ctx.rng('td-dong')
  const S = ctx.season
  const ox = 10050
  const oy = 600
  const gy = (x: number) => ground(ox + x) - oy
  let s = f.night || f.rain ? '' : P('k1', f.am ? 'M-266 8c60-4 140 6 210 26c26 8 30 20 8 22c-70 2-160-14-218-36c-14-6-14-12 0-12Z' : 'M-300 30c-40 4-90 14-130 26c-16 6-10 12 8 12c50-2 100-14 130-28c10-6 4-12-8-10Z', o(0.07))
  // vân cỏ phủ bãi phẳng của lõi → đất không còn là dải màu phẳng (giữa khung: chỉ vân, không thêm mảng sáng–tối)
  if (!f.snow) s += P('', `M-340 ${n0(gy(-340) + 40)}L340 ${n0(gy(340) + 40)}V420H-340Z`, ' fill="url(#td-pg)"')
  s += `<g class="sw4">${use('fe', -250, gy(-250) + 150)}</g><g class="sw1">${use('fe', 250, gy(250) + 160)}</g>`
  const fl = S === 'xuan' ? 4 : S === 'ha' ? 3 : S === 'thu' || f.late ? 2 : 0
  if (!f.night) for (let i = 0; i < fl; i += 1) {
    const x = -300 + r() * 600
    s += use('fc', x, gy(x) + 150 + r() * 60)
  }
  return { layer: 3, x0: 9750, x1: 10360, prio: 5, svg: G(`translate(${ox} ${oy})`, s) }
}

// ───────────── 6. TIỀN CẢNH (lớp 4): khóm cỏ to, tối, ít chi tiết, vào từ hai góc đáy ─────────────
function frontPieces(ctx: Ctx, f: Flags): Piece[] {
  if (f.lite) return []
  const out: Piece[] = []
  const r = ctx.rng('td-tien')
  for (const [k, x3, y] of [[0, 9560, 700], [1, 10450, 706]] as [number, number, number][]) {
    const x = n0(toLayer(x3, 4))
    // khóm lau tối: gò thấp + lá mảnh hai sắc (lá sau nhạt hơn, ngả sương) → mép mềm, không mảng đặc cứng
    let d = `M-80 150C-60 120-10 114 40 118C80 122 110 134 130 150Z`
    let e = ''
    for (let i = 0; i < 7; i += 1) {
      const bx = i * 24 - 70 + r() * 10
      const h = (i % 2 ? 60 : 90) + r() * 80
      const lx = (f.lean + (i - 3) * 0.14) * h
      const bl = `M${xy(bx - 4, 130)}Q${xy(bx + lx * 0.3, 78 - h * 0.6)} ${xy(bx + lx, 126 - h)}Q${xy(bx + lx * 0.3 + 3, 78 - h * 0.5)} ${xy(bx + 5, 130)}Z`
      if (i % 2) e += bl
      else d += bl
    }
    out.push({ layer: 4, x0: x - 120, x1: x + 150, prio: 2, svg: G(`translate(${x} ${y})`, `<g class="sw4">${P(k ? 'l3' : 'g3', e, o(0.75))}${P(k ? 'l4' : 'g4', d, o(0.92))}</g>`) })
  }
  return out
}

// ───────────── defs & css ─────────────
const grad = (id: string, a: string, b: string, c: string) =>
  `<linearGradient id="td-${id}" x2="0" y2="1"><stop offset="0" style="stop-color:var(--${a})"/><stop offset=".5" style="stop-color:var(--${b})"/><stop offset="1" style="stop-color:var(--${c})"/></linearGradient>`
const stop = (at: string, c: string, a: number) => `<stop offset="${at}" style="stop-color:var(--${c})" stop-opacity="${fm(a)}"/>`

function defs(ctx: Ctx, f: Flags): string {
  const r = ctx.rng('td-defs')
  const S = ctx.season
  // dải cỏ viền 80 đơn vị (ngọn tối + ngọn sáng), cao theo mùa, nghiêng theo gió
  let a = ''
  let b = ''
  for (let i = 0; i < 17; i += 1) {
    const x = i * 4.8 + r() * 2
    const h = (5 + r() * 10) * f.gh
    const lx = (f.lean + (r() - 0.5) * 0.7) * h
    const s = `M${xy(x, 0)}q${xy(lx * 0.2, -h * 0.6)} ${xy(lx, -h)}`
    if (i % 3 === 1) b += s
    else a += s
  }
  let c = ''
  let d = ''
  for (let i = 0; i < 7; i += 1) {
    const x = (i - 3) * 3
    const h = (12 + r() * 10) * f.gh
    const lx = (f.lean + (i - 3) * 0.13) * h
    const s = `M${xy(x, 0)}q${xy(lx * 0.15, -h * 0.6)} ${xy(lx, -h)}`
    if (i % 3 === 1) d += s
    else c += s
  }
  // vân cỏ: cụm 3 ngọn rải lệch trong ô 190×110
  let e = ''
  let g = ''
  for (let i = 0; i < 14; i += 1) {
    const x = (i * 53 + r() * 30) % 190
    const y = (i * 37 + r() * 20) % 110
    const h = (5 + r() * 4) * f.gh
    const lx = f.lean * h * 0.6
    const t = `M${xy(x, y)}q${xy(lx * 0.3 - 1, -h * 0.6)} ${xy(lx - 3, -h * 0.85)}M${xy(x + 1, y)}q${xy(lx * 0.2, -h * 0.6)} ${xy(lx + 1, -h)}`
    if (i % 4 === 3) g += t
    else e += t
  }
  // địa y & rỗ đá (ô 70×58): đốm gỉ nhạt, đốm sáng, lỗ rỗ tối — tương phản thấp
  const md: Pt[] = []
  for (let i = 0; i < 12; i += 1) md.push([(i * 23 + r() * 14) % 70, (i * 17 + r() * 12) % 58])
  // hoa phủ tóc (ô 72×58)
  const nf = S === 'xuan' ? 9 : S === 'ha' ? 5 : 3
  let p1 = ''
  let p2 = ''
  for (let i = 0; i < nf; i += 1) {
    const x = n0((i * 29 + r() * 18) % 72)
    const y = n0((i * 23 + r() * 16) % 58)
    const s = `M${x} ${y}h0m4 2h0m-3 3h0`
    if (S === 'xuan' ? i % 3 === 2 : i % 2 === 1) p2 += s
    else p1 += s
  }
  const fA = S === 'ha' ? 'f3' : 'f1'
  const fB = S === 'xuan' ? 'f3' : S === 'ha' ? 'f2' : 'f1'
  const fe = 'M0 0q-6-20-26-30M0 0q-2-24 6-40M0 0q8-14 26-18M0 0q-12-10-30-8'
  const flw = !f.night && (S === 'xuan' || S === 'ha' || S === 'thu' || f.late)
  // sáng–tối sườn đồi theo x thế giới (9400 → 10700): sườn hướng nắng sáng nhẹ, sườn khuất tối dần
  const hs = f.am ? [stop('0', 'g1', 0.22), stop('.42', 'g1', 0), stop('.55', 'k1', 0), stop('1', 'k1', 0.24)] : [stop('0', 'k1', 0.24), stop('.42', 'k1', 0), stop('.6', 'g1', 0), stop('1', 'g1', 0.2)]
  // bậc đá: mặt bậc (sáng), mặt đứng, mặt bên phải (phối cảnh nhìn từ phải), rêu góc trong, mép sứt
  const side = f.am ? 's3' : 's1'
  const stp =
    '<g id="td-st">' +
    P('s3', 'M-50 0h100v12h-100Z') + P('s2', 'M-50 0l6-10h100l-6 10Z') + P(side, 'M50 0l6-10v13l-6 9Z') + P('s1', 'M-50 0h100l1-2h-100Z', o(0.8)) +
    P('k1', 'M-50 9h100v3h-100Z', o(0.18)) + P('td-gm', 'M-52 12c2-6 8-7 13 0ZM36 12c3-5 9-6 14 0ZM-46-8l10-2-4 3Z') +
    (f.snow ? P('p3', 'M-49-1l6-10h98l-5 10Z', o(0.9)) : f.rime > 0 ? P('f3', 'M-50 0l6-10h100l-6 10Z', o(0.45)) : '') +
    (f.wet > 0.2 ? P('wetsheen', 'M-50 0l6-10h100l-6 10Z') : '') + '</g>' +
    `<g id="td-sb"><use href="#td-st"/>${P('s4', 'M-50-1l18 0-7 10-11 3Z')}${P('z3', 'M-50-1h18')}</g>`
  return (
    grad('gm', 'm1', 'm2', 'm3') +
    grad('gt', 's1', 's2', 's3') +
    `<linearGradient id="td-hs" gradientUnits="userSpaceOnUse" x1="-290" x2="1010" y2="0">${hs.join('')}</linearGradient>` +
    `<linearGradient id="td-h1" href="#td-hs" x1="-560" x2="740"/><linearGradient id="td-h2" href="#td-hs" x1="-1070" x2="230"/>` +
    `<g id="td-gs">${f.snow ? '' : P('td-kg', a) + P('td-kl', b)}</g>` +
    `<g id="td-gS"><use href="#td-gs"/><use href="#td-gs" x="80"/></g>` +
    [14, -14, 30, -30].map((dd, i) => ['gs', 'gS'].map(q => `<use id="td-${q}${1 + (i % 2)}${i > 1 ? 'b' : ''}" href="#td-${q}" transform="rotate(${dd})"/>`).join('')).join('') +
    `<g id="td-gu">${P('td-kg', c)}${P('td-kl', d)}</g>` +
    `<g id="td-fc">${P('td-kg', 'M0 0q-2-6-4-10M0 0q1-7 4-12M0 0v-7', ' style="stroke-width:1.2"')}${dots(S === 'ha' ? 'td-ky' : 'td-kp', [[-4, -11], [4, -13], [0, -8]])}</g>` +
    `<g id="td-fe">${P('td-kfe', fe)}${P('td-kfe', 'M0 0q4-18 20-26M0 0q-8-16-22-18', ' style="stroke:var(--l2)"')}</g>` +
    (f.lite ? '' : `<pattern id="td-pg" width="190" height="110" patternUnits="userSpaceOnUse">${P('td-kg', e, ' opacity=".7"')}${P('td-kl', g, ' opacity=".7"')}</pattern>`) +
    (f.lite ? '' : `<pattern id="td-pl" width="70" height="58" patternUnits="userSpaceOnUse">${dots('td-q1', md.slice(0, 5))}${dots('td-q2', md.slice(5, 9))}${dots('td-q3', md.slice(9))}</pattern>`) +
    (flw ? `<pattern id="td-pf" width="72" height="58" patternUnits="userSpaceOnUse">${P(`td-kc0 ${fA}`, p1)}${P(`td-kc0 ${fB}`, p2)}</pattern>` : '') +
    stp +
    `<path id="td-ea" d="${rel(EAR)}"/><path id="td-pr" d="${rel(PR)}"/><path id="td-pq" d="${rel(PL)}"/><path id="td-fs" d="${rel(FS)}"/><path id="td-fh" d="${rel(FH)}"/><path id="td-fk" d="${rel(FK)}"/><path id="td-ck" d="${rel(CRK)}"/>` +
    // mảng mềm (gradient tròn, không mép): hốc mắt dưới gờ mày, má quay đi · mí trên phồng, gò má bắt sáng
    `<radialGradient id="td-rs">${stop('0', 'k1', 0.42)}${stop('1', 'k1', 0)}</radialGradient><radialGradient id="td-rh">${stop('0', 'p3', 0.5)}${stop('1', 'p3', 0)}</radialGradient>` +
    `<g id="td-fo" fill="url(#td-rs)"><ellipse cx="-60" cy="-40" rx="66" ry="34"/><ellipse cx="64" cy="-38" rx="66" ry="34"/><ellipse cx="${f.am ? 118 : -112}" cy="40" rx="40" ry="80"/></g>` +
    `<g id="td-fp" fill="url(#td-rh)"><ellipse cx="-62" cy="-44" rx="38" ry="13"/><ellipse cx="62" cy="-42" rx="38" ry="13"/><ellipse cx="-70" cy="8" rx="44" ry="20"/><ellipse cx="74" cy="6" rx="44" ry="20"/><ellipse cx="0" cy="-96" rx="90" ry="26"/></g>` +
    `<g id="td-col">${cap(f, 'cd', 0, -4)}<g class="td-gt"><path id="td-cd" d="M-24 0v-22h44V0Z"/></g><ellipse cx="-24" cy="-11" rx="6" ry="11" class="s3"/><path class="z2" d="M-10-22V0M4-22V0" opacity=".5"/><path class="td-gm" d="M-14-22c8-6 20-6 30 0Z"/><path class="ao" d="M-28 0h52l-4 3h-46Z"/></g>`
  )
}

const CSS =
  `[class*=td-k]{fill:none;stroke-linecap:round;stroke-linejoin:round}.td-gm{fill:url(#td-gm)}.td-gt{fill:url(#td-gt)}` +
  `.td-kg{stroke:var(--g3);stroke-width:2.2}.td-kl{stroke:var(--g1);stroke-width:1.7}.td-kr{stroke:var(--g1);stroke-width:5;opacity:.45}` +
  `.td-km{stroke:var(--m2);stroke-width:5;opacity:.45}.td-kn{stroke:var(--m3);stroke-width:2.5;opacity:.35}` +
  `.td-kd{stroke:var(--b3);stroke-width:3}.td-tx{font:7.5px serif;opacity:.72}.td-kt{stroke:var(--b2)}.td-kx{stroke:var(--e4);stroke-width:1.4;opacity:.45}.td-kh{stroke:var(--e4);stroke-width:7;opacity:.12}` +
  `.td-kb{stroke:var(--b1);stroke-width:1.6}.td-kfe{stroke:var(--l3);stroke-width:7;stroke-dasharray:1.6 2.6}` +
  `.td-kfl{stroke:url(#td-pf);stroke-width:20}` +
  `.td-kp,.td-ky,.td-kq,.td-kz,.td-kk,.td-ku,.td-kc0,.td-q1,.td-q2,.td-q3{fill:none;stroke-linecap:round;stroke-width:4.5}.td-kp{stroke:var(--f1)}.td-ky{stroke:var(--f2)}.td-kq{stroke:var(--m1);stroke-width:4;opacity:.8}` +
  `.td-kc0.f1{stroke:var(--f1)}.td-kc0.f2{stroke:var(--f2)}.td-kc0.f3{stroke:var(--f3)}.td-q1{stroke:var(--x1);stroke-width:7;opacity:.16}.td-q2{stroke:var(--f3);stroke-width:5;opacity:.18}.td-q3{stroke:var(--k1);stroke-width:2;opacity:.25}` +
  `.td-ku{stroke:var(--p3);stroke-width:5;opacity:.7}.td-kz{stroke:var(--e4);stroke-width:2.6;opacity:.7}.td-kk{stroke:var(--d1);stroke-width:6}` +
  `.td-gw{animation:td-gw 9s ease-in-out infinite}@keyframes td-gw{0%,100%{opacity:.55}50%{opacity:1}}` +
  `.td-mo{animation:td-mo 13s ease-in-out infinite}@keyframes td-mo{0%{transform:translate(0,0);opacity:0}30%{opacity:.6}100%{transform:translate(16px,-90px);opacity:0}}` +
  `.td-dr{animation:td-dr 1.7s ease-in infinite}@keyframes td-dr{0%{transform:translateY(0);opacity:0}20%{opacity:.9}100%{transform:translateY(40px);opacity:0}}` +
  `.td-lv{transform-box:fill-box;transform-origin:center;animation:td-lv 12s linear infinite}@keyframes td-lv{0%{transform:translate(0,0)rotate(0);opacity:0}8%{opacity:1}100%{transform:translate(70px,150px)rotate(400deg);opacity:0}}`

// ───────────── vùng ─────────────
export const region: Region = {
  id: 'tuong-da',
  name: 'Người khổng lồ đá',
  x0: 9000,
  x1: 10800,
  shots: [
    { id: 'tuong-da', name: 'Gương mặt người khổng lồ đá', x: 10040, y: 424, zoom: 1.1 },
    { id: 'nhin-dao-bay', name: 'Nhìn lên đảo bay', x: 9980, y: 340, zoom: 0.9 },
  ],
  build(ctx: Ctx) {
    const p = ctx.cur.precip
    const lite = ctx.detail === 'lite'
    const h = ctx.vn.hourF
    const dong = ctx.season === 'dong'
    const f: Flags = {
      night: ctx.daylight < 0.66,
      rain: p === 'phun' || p === 'mua' || p === 'mua-to',
      heavy: p === 'mua' || p === 'mua-to',
      snow: p === 'tuyet',
      wet: ctx.wet,
      lite,
      frost: dong,
      rime: dong && p !== 'tuyet' && h > 4.5 && h < 10.5 ? (h > 6.5 && h < 9.5 ? 1 : 0.4) : 0,
      late: dong && ctx.seasonT > 0.78,
      lean: 0.12 + ctx.cur.wind * 0.45,
      gh: ctx.season === 'ha' ? 1.5 : dong ? 0.7 : 1,
      am: h < 12 || ctx.daylight < 0.66,
    }
    const pieces: Piece[] = [
      headPiece(ctx, f),
      stepsPiece(ctx, f),
      shoulderPiece(ctx, f),
      handPiece(ctx, f),
      ...(lite ? [] : [meadowPiece(ctx, f)]),
      ...frontPieces(ctx, f),
    ]
    const hy = n0(hill(QX))
    const spots: Spot[] = [
      { kind: 'cat', layer: 3, x: 10650, y: n0(hill(10650)), s: 1 },
      // khoảng khô dưới các ngón nghiêng chìa ra (che mưa thật), cạnh mép bàn tay
      { kind: 'cat-shelter', layer: 3, x: QX + 132, y: n0(hill(QX + 132)) - 2, s: 0.8 },
      { kind: 'perch', layer: 3, x: QX + NEST[0], y: hy + NEST[1] - 6 },
      { kind: 'perch', layer: 3, x: 10090, y: n0(hill(10090) - 76) },
      { kind: 'butterflies', layer: 3, x: 9560, y: n0(ground(9560) - 40), w: 220 },
      { kind: 'fireflies', layer: 3, x: 10560, y: n0(hill(10560) - 30), w: 260 },
      { kind: 'fireflies', layer: 3, x: 9440, y: n0(ground(9440) - 30), w: 200 },
    ]
    return { pieces, spots, defs: defs(ctx, f), css: CSS }
  },
}
