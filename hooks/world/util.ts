// Công cụ dùng chung: số, ngẫu nhiên, nhiễu, đường cong, màu, toạ độ lớp, địa hình.
import type { Layer } from './types'

// ───────────────────────── Khung nhìn & lớp ─────────────────────────
export const VW = 1600
export const VH = 1000
/** Camera y tham chiếu: ở cy = CY0 mọi lớp dùng chung hệ y (y=760 hiện ở ~3/4 màn hình khi zoom 1). */
export const CY0 = 520
/** Bề ngang thế giới (lớp 3). */
export const WORLD_W = 18000
export const LAYER_F: Record<Layer, number> = { 0: 0.06, 1: 0.18, 2: 0.45, 3: 1, 4: 1.35 }

/** Đổi x thế giới (lớp 3) sang x của lớp `layer`: điểm đó sẽ nằm đúng sau/trước vị trí thế giới ấy khi camera nhìn tới. */
export const toLayer = (x3: number, layer: Layer) => x3 * LAYER_F[layer]
export const fromLayer = (xl: number, layer: Layer) => xl / LAYER_F[layer]

// ───────────────────────── Số ─────────────────────────
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
/** Làm tròn số nguyên (để SVG gọn). */
export const n0 = (v: number) => Math.round(v)
/** Một chữ số thập phân, bỏ ".0". */
export const n1 = (v: number) => {
  const r = Math.round(v * 10) / 10
  return Object.is(r, -0) ? 0 : r
}

// ───────────────────────── Ngẫu nhiên & nhiễu ─────────────────────────
export function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function rng(seed: number | string): () => number {
  let a = (typeof seed === 'string' ? hash(seed) : seed) | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Chọn ngẫu nhiên trong khoảng. */
export const range = (r: () => number, a: number, b: number) => a + (b - a) * r()
export const pick = <T>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length) % list.length] as T

/** Nhiễu Perlin 2D, ~[-0.5, 0.5]. */
export function makeNoise(seed: number | string): (x: number, y: number) => number {
  const rand = rng(seed)
  const perm = new Uint8Array(512)
  const base = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const t = base[i] as number
    base[i] = base[j] as number
    base[j] = t
  }
  for (let i = 0; i < 512; i += 1) perm[i] = base[i & 255] as number
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const grad = (hh: number, x: number, y: number) => {
    const g = hh & 7
    const u = g < 4 ? x : y
    const v = g < 4 ? y : x
    return ((g & 1) === 0 ? u : -u) + ((g & 2) === 0 ? v : -v)
  }
  return (x, y) => {
    const xi = Math.floor(x) & 255
    const yi = Math.floor(y) & 255
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)
    const u = fade(xf)
    const v = fade(yf)
    const p = (i: number) => perm[i] as number
    const aa = p(p(xi) + yi)
    const ab = p(p(xi) + yi + 1)
    const ba = p(p(xi + 1) + yi)
    const bb = p(p(xi + 1) + yi + 1)
    const x1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf))
    const x2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1))
    return (x1 + v * (x2 - x1)) * 0.5
  }
}

export function fbm(noise: (x: number, y: number) => number, x: number, y: number, octaves = 4): number {
  let sum = 0
  let amp = 1
  let freq = 1
  let norm = 0
  for (let o = 0; o < octaves; o += 1) {
    sum += amp * noise(x * freq, y * freq)
    norm += amp
    amp *= 0.5
    freq *= 2.03
  }
  return sum / norm
}

// ───────────────────────── Đường cong ─────────────────────────
export type Pt = [number, number]

/** Đa giác/đường gấp khúc thẳng: "M x y L x y …" (số nguyên). */
export function poly(points: Pt[], closed = false): string {
  if (points.length === 0) return ''
  const d = 'M' + points.map(p => `${n0(p[0])} ${n0(p[1])}`).join('L')
  return closed ? d + 'Z' : d
}

/** Đường cong mượt qua các điểm (Q với trung điểm). */
export function smoothPath(points: Pt[], closed = false): string {
  const first = points[0]
  if (first === undefined) return ''
  if (points.length < 3) return poly(points, closed)
  let d = `M${n0(first[0])} ${n0(first[1])}`
  for (let i = 1; i < points.length - 1; i += 1) {
    const p = points[i] as Pt
    const q = points[i + 1] as Pt
    d += `Q${n0(p[0])} ${n0(p[1])} ${n0((p[0] + q[0]) / 2)} ${n0((p[1] + q[1]) / 2)}`
  }
  const last = points[points.length - 1] as Pt
  d += `L${n0(last[0])} ${n0(last[1])}`
  return closed ? d + 'Z' : d
}

/** Khối hữu cơ (tán lá, đá, bụi): vòng kín méo bằng nhiễu. */
export function blob(cx: number, cy: number, rx: number, ry: number, r: () => number, lumps = 9, rough = 0.18): string {
  const pts: Pt[] = []
  const phase = r() * Math.PI * 2
  const amps = Array.from({ length: 3 }, () => r() * rough)
  for (let i = 0; i < lumps; i += 1) {
    const a = (i / lumps) * Math.PI * 2
    const k = 1 + (amps[0] as number) * Math.sin(a * 2 + phase) + (amps[1] as number) * Math.sin(a * 3 + phase * 1.7) + (amps[2] as number) * (r() - 0.5)
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  pts.push(pts[0] as Pt, pts[1] as Pt)
  return smoothPath(pts, true)
}

/** Đường viền trên (sống núi / mặt đất) từ hàm y(x) → khối kín xuống tới `bottom`. */
export function ridgeFill(x0: number, x1: number, step: number, y: (x: number) => number, bottom: number): string {
  const pts: Pt[] = []
  for (let x = x0; x <= x1 + 0.001; x += step) pts.push([x, y(x)])
  return smoothPath(pts) + `L${n0(x1)} ${n0(bottom)}L${n0(x0)} ${n0(bottom)}Z`
}

export function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ───────────────────────── Màu ─────────────────────────
export function oklch(L: number, C: number, h: number): string {
  const hr = (h * Math.PI) / 180
  const a = C * Math.cos(hr)
  const b = C * Math.sin(hr)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return (
    '#' +
    lin
      .map(x => {
        const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(x, 0), 1 / 2.4) - 0.055
        return Math.round(clamp(v, 0, 1) * 255)
          .toString(16)
          .padStart(2, '0')
      })
      .join('')
  )
}

/** Trộn hai màu hex. */
export function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16))
  return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i] as number, t)).toString(16).padStart(2, '0')).join('')
}

// ───────────────────────── Địa hình lớp 3 (liên tục toàn thế giới) ─────────────────────────
// Mỗi vùng rộng 1800. Hồ: mặt nước y=812 trong [7450, 8750]. Biển: mặt nước y=862 từ x=17350.
export const LAKE = { x0: 7450, x1: 8750, y: 812 }
export const SEA = { x0: 17350, y: 862 }

const groundNoise = makeNoise('dat-the-gioi')
/** Cao độ mặt đất (y, càng nhỏ càng cao) tại x thế giới. Liên tục, đã tính các nét lớn của từng vùng. */
export function ground(x: number): number {
  const n = fbm(groundNoise, x / 900, 0.37, 3) * 46
  let y = 766 + n
  // cay-da: gò thấp đỉnh ~4500
  y -= 70 * Math.exp(-(((x - 4520) / 520) ** 2))
  // ruong-bac-thang: sườn dâng dần từ 5400 lên ~610 ở 7000 rồi đổ xuống hồ
  y -= 165 * smooth(5450, 6900, x) * (1 - smooth(7000, 7420, x))
  // ho-sen: lòng hồ
  y += 120 * smooth(7300, 7520, x) * (1 - smooth(8680, 8900, x))
  // tuong-da: đồi lớn đỉnh ~9900 (đầu tượng đá nằm trong đồi)
  y -= 205 * Math.exp(-(((x - 9900) / 620) ** 2))
  // thap-chuong: cao nguyên 12900–14100
  y -= 64 * smooth(12650, 12950, x) * (1 - smooth(14050, 14400, x))
  // vach-hai-dang: vách dâng tới ~620 ở 16900 rồi dựng đứng xuống biển ở ~17320
  y -= 150 * smooth(16200, 16900, x) * (1 - smooth(17260, 17330, x))
  y += 210 * smooth(17280, 17360, x)
  return y
}
