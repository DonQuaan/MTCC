// Bốn bản in. Hàm thuần: cùng đầu vào → cùng SVG. Không phụ thuộc engine.

import type { PlateId } from '../types'

export type { PlateId }
export type Detail = 'full' | 'thumb'
export type Journey = { turns: number; folder: string; date: string }

export type Plate = {
  numeral: string
  name: string
  source: string
  accent: string
  render: (journey: Journey, detail: Detail) => string
}

// ───────────────────────── Màu: OKLCH → hex ─────────────────────────
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
        return Math.round(Math.min(1, Math.max(0, v)) * 255)
          .toString(16)
          .padStart(2, '0')
      })
      .join('')
  )
}

// ───────────────────────── Ngẫu nhiên có hạt giống + nhiễu ─────────────────────────
export function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeNoise(seed: number): (x: number, y: number) => number {
  const rand = rng(seed)
  const perm = new Uint8Array(512)
  const base = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const t = base[i] ?? 0
    base[i] = base[j] ?? 0
    base[j] = t
  }
  for (let i = 0; i < 512; i += 1) perm[i] = base[i & 255] ?? 0
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
    const p = (i: number) => perm[i] ?? 0
    const aa = p(p(xi) + yi)
    const ab = p(p(xi) + yi + 1)
    const ba = p(p(xi + 1) + yi)
    const bb = p(p(xi + 1) + yi + 1)
    const x1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf))
    const x2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1))
    return (x1 + v * (x2 - x1)) * 0.5
  }
}

function fbm(noise: (x: number, y: number) => number, x: number, y: number, octaves: number): number {
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

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// ───────────────────────── Khung chung ─────────────────────────
const W = 1600
const H = 1000
const MONO = "'Cascadia Mono','Consolas',ui-monospace,monospace"
const SERIF = "'Palatino Linotype','Book Antiqua',Palatino,Georgia,serif"
const n0 = (v: number) => Math.round(v)

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function frame(detail: Detail, defs: string, body: string): string {
  const size = detail === 'thumb' ? 'width="280" height="175"' : 'width="100%" height="100%"'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" ${size}><defs>${defs}</defs>${body}</svg>`
}

type Pt = [number, number]

function smoothPath(points: Pt[], closed: boolean): string {
  const first = points[0]
  if (first === undefined) return ''
  if (points.length < 3) return `M${points.map(p => `${n0(p[0])} ${n0(p[1])}`).join('L')}`
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

// Ô chú giải dùng chung: dữ kiện thật của phiên, không bịa tỉ lệ hay toạ độ.
function cartouche(x: number, y: number, title: string, j: Journey, unit: string, ink: string, rule: string): string {
  const w = 300
  const h = 84
  return `<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" fill="none" stroke="${rule}" stroke-width="0.75" vector-effect="non-scaling-stroke"/><line x1="14" y1="30" x2="${w - 14}" y2="30" stroke="${rule}" stroke-width="0.5" vector-effect="non-scaling-stroke"/><text x="14" y="21" font-family="${MONO}" font-size="10" letter-spacing="2.6" fill="${ink}" fill-opacity="0.72">${esc(title)}</text><text x="14" y="55" font-family="${SERIF}" font-size="18" fill="${ink}" fill-opacity="0.92">${esc(j.folder)}</text><text x="14" y="73" font-family="${MONO}" font-size="10" letter-spacing="1" fill="${ink}" fill-opacity="0.6">${esc(j.date)} · ${j.turns} ${esc(unit)}</text></g>`
}

// Vị trí các dấu của phiên: tối đa 40 dấu gần nhất, đánh số theo lượt thật.
function journeyMarks(j: Journey): { count: number; firstNumber: number } {
  const count = Math.min(j.turns, 40)
  return { count, firstNumber: j.turns - count + 1 }
}

// ───────────────────────── Bản I — Địa hình ─────────────────────────
const TOPO = {
  ground: oklch(0.175, 0.012, 75),
  line: oklch(0.8, 0.025, 80),
  index: oklch(0.86, 0.03, 80),
  accent: oklch(0.66, 0.16, 35),
}

function marchingSquares(g: Float64Array, nx: number, ny: number, step: number, level: number): Pt[][] {
  const at = (i: number, j: number) => g[j * nx + i] ?? 0
  const hEdge = (i: number, j: number) => (j * nx + i) * 2
  const vEdge = (i: number, j: number) => (j * nx + i) * 2 + 1
  const pos = new Map<number, Pt>()
  const adj = new Map<number, number[]>()
  const place = (id: number) => {
    if (pos.has(id)) return
    const cell = id >> 1
    const i = cell % nx
    const j = Math.floor(cell / nx)
    if ((id & 1) === 0) {
      const a = at(i, j)
      const t = (level - a) / (at(i + 1, j) - a)
      pos.set(id, [(i + t) * step, j * step])
    } else {
      const a = at(i, j)
      const t = (level - a) / (at(i, j + 1) - a)
      pos.set(id, [i * step, (j + t) * step])
    }
  }
  const link = (a: number, b: number) => {
    place(a)
    place(b)
    adj.set(a, [...(adj.get(a) ?? []), b])
    adj.set(b, [...(adj.get(b) ?? []), a])
  }
  for (let j = 0; j < ny - 1; j += 1) {
    for (let i = 0; i < nx - 1; i += 1) {
      const tl = at(i, j)
      const tr = at(i + 1, j)
      const br = at(i + 1, j + 1)
      const bl = at(i, j + 1)
      const idx = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0)
      if (idx === 0 || idx === 15) continue
      const top = hEdge(i, j)
      const bottom = hEdge(i, j + 1)
      const left = vEdge(i, j)
      const right = vEdge(i + 1, j)
      const center = (tl + tr + br + bl) / 4 > level
      switch (idx) {
        case 1: case 14: link(left, bottom); break
        case 2: case 13: link(bottom, right); break
        case 3: case 12: link(left, right); break
        case 4: case 11: link(top, right); break
        case 6: case 9: link(top, bottom); break
        case 7: case 8: link(left, top); break
        case 5:
          if (center) { link(left, top); link(bottom, right) } else { link(top, right); link(left, bottom) }
          break
        case 10:
          if (center) { link(top, right); link(left, bottom) } else { link(left, top); link(bottom, right) }
          break
      }
    }
  }
  const seen = new Set<number>()
  const walk = (start: number) => {
    const chain = [start]
    seen.add(start)
    let cur = start
    for (;;) {
      const nb = (adj.get(cur) ?? []).find(x => !seen.has(x))
      if (nb === undefined) break
      seen.add(nb)
      chain.push(nb)
      cur = nb
    }
    return chain
  }
  const chains: number[][] = []
  for (const [id, nbs] of adj) if (nbs.length === 1 && !seen.has(id)) chains.push(walk(id))
  for (const id of adj.keys()) {
    if (seen.has(id)) continue
    const loop = walk(id)
    loop.push(loop[0] as number)
    chains.push(loop)
  }
  return chains.map(c => c.map(id => pos.get(id) as Pt))
}

function renderTopo(j: Journey, detail: Detail): string {
  const step = detail === 'full' ? 16 : 32
  const levels = detail === 'full' ? 30 : 12
  const noise = makeNoise(hash('dia-hinh'))
  const nx = Math.floor(W / step) + 1
  const ny = Math.floor(H / step) + 1
  const g = new Float64Array(nx * ny)
  let lo = Infinity
  let hi = -Infinity
  for (let y = 0; y < ny; y += 1) {
    for (let x = 0; x < nx; x += 1) {
      const px = (x * step) / W
      const py = (y * step) / H
      // Thung lũng yên tĩnh ở giữa cho chữ; địa hình dâng về hai mép và đáy.
      const edge = Math.max(smooth(0.16, 0.5, Math.abs(px - 0.5)), smooth(0.6, 1.05, py) * 0.85)
      const v = fbm(noise, px * 2.6, py * 1.7, 5) * (0.2 + 0.8 * edge) + 0.42 * edge
      g[y * nx + x] = v
      lo = Math.min(lo, v)
      hi = Math.max(hi, v)
    }
  }
  let minor = ''
  let major = ''
  let labels = ''
  let labelCount = 0
  for (let k = 1; k < levels; k += 1) {
    const level = lo + ((hi - lo) * k) / levels
    const isIndex = k % 5 === 0
    for (const chain of marchingSquares(g, nx, ny, step, level)) {
      if (chain.length < (isIndex ? 3 : 5)) continue
      const first = chain[0] as Pt
      const last = chain[chain.length - 1] as Pt
      const closed = first[0] === last[0] && first[1] === last[1]
      const d = smoothPath(chain, closed)
      if (isIndex) major += d
      else minor += d
      // Số độ cao đặt trên đường cái, tránh vùng giữa.
      if (detail === 'full' && isIndex && chain.length > 40 && labelCount < 12) {
        const mid = Math.floor(chain.length * 0.45)
        const p = chain[mid] as Pt
        if (Math.abs(p[0] / W - 0.5) > 0.22 && p[1] > 40 && p[1] < H - 40) {
          const a = chain[mid - 3] as Pt
          const b = chain[mid + 3] as Pt
          let angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
          if (angle > 90) angle -= 180
          if (angle < -90) angle += 180
          labels += `<text x="${n0(p[0])}" y="${n0(p[1])}" transform="rotate(${n0(angle)} ${n0(p[0])} ${n0(p[1])})" dy="3" text-anchor="middle" font-family="${MONO}" font-size="9" fill="${TOPO.index}" fill-opacity="0.62" stroke="${TOPO.ground}" stroke-width="5" paint-order="stroke">${(k * 20 + 100).toString()}</text>`
          labelCount += 1
        }
      }
    }
  }
  // Lưới chữ thập mỗi 200 đơn vị.
  let grid = ''
  if (detail === 'full') {
    for (let x = 200; x < W; x += 200) {
      for (let y = 200; y < H; y += 200) grid += `M${x - 4} ${y}h8M${x} ${y - 4}v8`
    }
  }
  // Tuyến khảo sát: mỗi lượt một trạm.
  const { count, firstNumber } = journeyMarks(j)
  const route = makeNoise(hash('tuyen'))
  const stations: Pt[] = [[W * 0.19, H * 0.84]]
  for (let i = 1; i <= Math.max(count, 1); i += 1) {
    const t = i / 40
    stations.push([W * (0.19 + 0.75 * t), H * (0.82 + 0.09 * route(i * 0.31, 0.5))])
  }
  let traverse = ''
  if (count > 0) {
    const pts = stations.slice(0, count + 1)
    traverse += `<path d="M${pts.map(p => `${n0(p[0])} ${n0(p[1])}`).join('L')}" fill="none" stroke="${TOPO.accent}" stroke-width="1" stroke-dasharray="5 4" vector-effect="non-scaling-stroke" stroke-opacity="0.85"/>`
    pts.slice(1).forEach((p, i) => {
      traverse += `<path d="M${n0(p[0])} ${n0(p[1] - 6)}l5 9h-10z" fill="${TOPO.ground}" stroke="${TOPO.accent}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`
      if (detail === 'full') {
        traverse += `<text x="${n0(p[0] + 8)}" y="${n0(p[1] - 8)}" font-family="${MONO}" font-size="9" fill="${TOPO.accent}" stroke="${TOPO.ground}" stroke-width="4" paint-order="stroke">${firstNumber + i}</text>`
      }
    })
  }
  const start = stations[0] as Pt
  traverse += `<circle cx="${n0(start[0])}" cy="${n0(start[1])}" r="5" fill="${TOPO.ground}" stroke="${TOPO.accent}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`

  const body =
    `<rect width="${W}" height="${H}" fill="${TOPO.ground}"/>` +
    (grid ? `<path d="${grid}" stroke="${TOPO.line}" stroke-opacity="0.16" stroke-width="0.6" vector-effect="non-scaling-stroke"/>` : '') +
    `<path d="${minor}" fill="none" stroke="${TOPO.line}" stroke-opacity="0.2" stroke-width="0.55" vector-effect="non-scaling-stroke"/>` +
    `<path d="${major}" fill="none" stroke="${TOPO.index}" stroke-opacity="0.42" stroke-width="1" vector-effect="non-scaling-stroke"/>` +
    labels +
    traverse +
    (detail === 'full' ? cartouche(W - 356, 52, 'BẢN ĐỒ KHẢO SÁT', j, 'trạm', TOPO.index, TOPO.line) : '')
  return frame(detail, '', body)
}

// ───────────────────────── Bản II — Sơn mài ─────────────────────────
const LACQUER = {
  deep: oklch(0.15, 0.02, 32),
  lift: oklch(0.2, 0.028, 40),
  cinnabar: oklch(0.45, 0.13, 31),
  gold: oklch(0.78, 0.12, 82),
}

function clipHalfPlane(poly: Pt[], px: number, py: number, nx: number, ny: number): Pt[] {
  // Giữ phần thoả (x - p)·n ≤ 0.
  const out: Pt[] = []
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i] as Pt
    const b = poly[(i + 1) % poly.length] as Pt
    const da = (a[0] - px) * nx + (a[1] - py) * ny
    const db = (b[0] - px) * nx + (b[1] - py) * ny
    if (da <= 0) out.push(a)
    if (da * db < 0) {
      const t = da / (da - db)
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }
  return out
}

function renderLacquer(j: Journey, detail: Detail): string {
  const s = detail === 'full' ? 21 : 46
  const rand = rng(hash('son-mai'))
  const noise = makeNoise(hash('son-mai-doi'))
  const ridge = (x: number) =>
    H * (0.69 + 0.21 * Math.exp(-(((x - W * 0.5) / (W * 0.2)) ** 2)) + 0.07 * fbm(noise, x / 380, 0.3, 3))
  // Hạt Voronoi trên lưới lệch.
  const cols = Math.ceil(W / s) + 2
  const rows = Math.ceil(H / s) + 2
  const sites: Pt[] = []
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) sites.push([(c - 1 + 0.15 + rand() * 0.7) * s, (r - 1 + 0.15 + rand() * 0.7) * s])
  }
  const tones = [
    oklch(0.87, 0.024, 86),
    oklch(0.82, 0.03, 83),
    oklch(0.76, 0.036, 79),
    oklch(0.68, 0.042, 72),
    oklch(0.56, 0.045, 62),
  ]
  const groups: string[] = tones.map(() => '')
  for (let r = 1; r < rows - 1; r += 1) {
    for (let c = 1; c < cols - 1; c += 1) {
      const site = sites[r * cols + c] as Pt
      const depth = site[1] - ridge(site[0])
      if (depth < -10) continue
      if (rand() > smooth(-10, 70, depth)) continue // mép khảm tan dần như thật
      let poly: Pt[] = [
        [site[0] - s * 1.5, site[1] - s * 1.5],
        [site[0] + s * 1.5, site[1] - s * 1.5],
        [site[0] + s * 1.5, site[1] + s * 1.5],
        [site[0] - s * 1.5, site[1] + s * 1.5],
      ]
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          if (dr === 0 && dc === 0) continue
          const o = sites[(r + dr) * cols + (c + dc)]
          if (o === undefined) continue
          const mx = (site[0] + o[0]) / 2
          const my = (site[1] + o[1]) / 2
          poly = clipHalfPlane(poly, mx, my, o[0] - site[0], o[1] - site[1])
          if (poly.length < 3) break
        }
      }
      if (poly.length < 3) continue
      const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length
      const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length
      const gap = detail === 'full' ? 2.1 : 3.6
      // Vỏ trứng nứt: gần nửa số mảnh vỡ đôi theo một đường ngẫu nhiên qua tâm.
      const pieces: Pt[][] = []
      if (detail === 'full' && rand() < 0.45) {
        const ang = rand() * Math.PI
        const nx = Math.cos(ang)
        const ny = Math.sin(ang)
        pieces.push(clipHalfPlane(poly, cx + nx * 0.6, cy + ny * 0.6, -nx, -ny))
        pieces.push(clipHalfPlane(poly, cx - nx * 0.6, cy - ny * 0.6, nx, ny))
      } else pieces.push(poly)
      // Mảnh nằm sâu trong đồi tối hơn (lớp sơn mài mài phủ lên).
      const base = smooth(30, 260, depth) * 2.2
      for (const piece of pieces) {
        if (piece.length < 3) continue
        const px = piece.reduce((a, p) => a + p[0], 0) / piece.length
        const py = piece.reduce((a, p) => a + p[1], 0) / piece.length
        const radius = piece.reduce((a, p) => a + Math.hypot(p[0] - px, p[1] - py), 0) / piece.length
        const k = Math.max(0.15, 1 - gap / radius)
        const shrunk = piece.map(p => `${n0(px + (p[0] - px) * k)} ${n0(py + (p[1] - py) * k)}`)
        const tone = Math.min(4, Math.max(0, Math.round(base + (rand() - 0.5) * 2.4)))
        groups[tone] += `M${shrunk.join('L')}Z`
      }
    }
  }
  const inlay = groups.map((d, i) => (d ? `<path d="${d}" fill="${tones[i]}"/>` : '')).join('')

  // Vàng lá: một đám mảnh vụn góc trên trái.
  const leaf = (cx: number, cy: number, size: number, r: () => number) => {
    const a = r() * Math.PI
    const pts: Pt[] = [0, 1, 2, 3].map(q => {
      const ang = a + (q * Math.PI) / 2 + (r() - 0.5) * 0.5
      const rad = size * (0.55 + r() * 0.35)
      return [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad]
    })
    return `M${pts.map(p => `${n0(p[0])} ${n0(p[1])}`).join('L')}Z`
  }
  let gold = ''
  const leaves = detail === 'full' ? 70 : 20
  // Một mảng vàng lá dán chồng ở lõi, bụi vàng rắc thưa ra xung quanh.
  for (let i = 0; i < leaves; i += 1) {
    const ang = rand() * Math.PI * 2
    const isCore = i < leaves * 0.55
    const dist = isCore ? Math.pow(rand(), 0.9) * 62 : 60 + Math.pow(rand(), 1.4) * 240
    const size = isCore ? 12 + rand() * 14 : 2.5 + rand() * 4
    gold += leaf(W * 0.17 + Math.cos(ang) * dist * 1.5, H * 0.42 + Math.sin(ang) * dist * 0.6, size, rand)
  }
  // Mỗi lượt một mảnh vàng, theo cung từ đám vàng sang vầng son.
  const { count } = journeyMarks(j)
  const trail = rng(hash('vet-vang'))
  let marks = ''
  for (let i = 0; i < count; i += 1) {
    const t = (i + 1) / 41
    const x = W * (0.26 + 0.5 * t) + (trail() - 0.5) * 34
    const y = H * (0.4 - 0.16 * t - 0.08 * Math.sin(t * Math.PI)) + (trail() - 0.5) * 44
    marks += leaf(x, y, 4 + trail() * 6, trail)
  }

  const defs = `<radialGradient id="lac" cx="0.32" cy="0.28" r="0.95"><stop offset="0" stop-color="${LACQUER.lift}"/><stop offset="1" stop-color="${LACQUER.deep}"/></radialGradient>`
  const body =
    `<rect width="${W}" height="${H}" fill="url(#lac)"/>` +
    `<circle cx="${W * 0.81}" cy="${H * 0.24}" r="88" fill="${LACQUER.cinnabar}"/>` +
    `<circle cx="${W * 0.81}" cy="${H * 0.24}" r="94" fill="none" stroke="${LACQUER.gold}" stroke-opacity="0.55" stroke-width="1.2" vector-effect="non-scaling-stroke"/>` +
    inlay +
    `<path d="${gold}" fill="${LACQUER.gold}" fill-opacity="0.92"/>` +
    (marks ? `<path d="${marks}" fill="${LACQUER.gold}"/>` : '') +
    (detail === 'full' ? cartouche(56, 52, 'SƠN MÀI · KHẢM VỎ TRỨNG', j, 'mảnh vàng', LACQUER.gold, LACQUER.gold) : '')
  return frame(detail, defs, body)
}

// ───────────────────────── Bản III — Thiên đồ ─────────────────────────
const ATLAS = {
  ground: oklch(0.165, 0.03, 262),
  grid: oklch(0.78, 0.04, 250),
  star: oklch(0.95, 0.015, 250),
  warm: oklch(0.93, 0.03, 75),
  accent: oklch(0.84, 0.09, 85),
}

function renderAtlas(j: Journey, detail: Detail): string {
  const rand = rng(hash('thien-do'))
  const pole: Pt = [W * 0.06, H * 1.3]
  let grid = ''
  let labels = ''
  for (let r = 360, k = 0; r < 2200; r += 150, k += 1) {
    grid += `<circle cx="${n0(pole[0])}" cy="${n0(pole[1])}" r="${r}"/>`
    if (detail === 'full' && k % 2 === 0) {
      const ang = (-62 * Math.PI) / 180
      const x = pole[0] + Math.cos(ang) * r
      const y = pole[1] + Math.sin(ang) * r
      if (x > 0 && x < W && y > 20 && y < H) {
        labels += `<text x="${n0(x + 6)}" y="${n0(y - 4)}" font-family="${MONO}" font-size="9" fill="${ATLAS.grid}" fill-opacity="0.45">+${90 - k * 6}°</text>`
      }
    }
  }
  let spokes = ''
  for (let a = -90; a <= 0; a += 7.5) {
    const ang = (a * Math.PI) / 180
    spokes += `M${n0(pole[0] + Math.cos(ang) * 360)} ${n0(pole[1] + Math.sin(ang) * 360)}L${n0(pole[0] + Math.cos(ang) * 2300)} ${n0(pole[1] + Math.sin(ang) * 2300)}`
  }
  // Hoàng đạo: một vòng lệch tâm, nét đứt.
  const ecliptic = `<circle cx="${W * 0.72}" cy="${H * 1.9}" r="${H * 1.55}" fill="none" stroke="${ATLAS.grid}" stroke-opacity="0.26" stroke-width="0.8" stroke-dasharray="6 5" vector-effect="non-scaling-stroke"/>`
  // Dải Ngân Hà: một đường cong; sao dày quanh nó.
  const band = (x: number) => H * 0.08 + (x / W) * H * 0.62 + Math.sin(x / 260) * 40
  const total = detail === 'full' ? 950 : 220
  const tiny: string[] = []
  let bright = ''
  for (let i = 0; i < total; i += 1) {
    let x = rand() * W
    let y = rand() * H
    if (rand() < 0.45) {
      x = rand() * W
      const spread = (rand() + rand() + rand() - 1.5) * 120
      y = band(x) + spread
    }
    const calm = Math.abs(x / W - 0.5) < 0.22 && y > H * 0.25 && y < H * 0.85
    if (calm && rand() < 0.55) continue
    const u = rand()
    const r = 0.5 + 2.7 * u ** 7
    const warm = rand() < 0.22
    if (r < 1.1) tiny.push(`M${n0(x)} ${n0(y)}h.01`)
    else {
      const fill = warm ? ATLAS.warm : ATLAS.star
      bright += `<circle cx="${n0(x)}" cy="${n0(y)}" r="${(r * 3.2).toFixed(1)}" fill="${fill}" fill-opacity="0.06"/><circle cx="${n0(x)}" cy="${n0(y)}" r="${r.toFixed(1)}" fill="${fill}"/>`
    }
  }
  const dust = `<path d="${tiny.join('')}" stroke="${ATLAS.star}" stroke-opacity="0.7" stroke-width="${detail === 'full' ? 1.6 : 4}" stroke-linecap="round"/>`
  const glow = `<path d="M0 ${n0(band(0))}${Array.from({ length: 17 }, (_, i) => `L${i * 100} ${n0(band(i * 100))}`).join('')}" fill="none" stroke="${ATLAS.grid}" stroke-opacity="0.05" stroke-width="190" stroke-linecap="round" filter="url(#mist)"/>`

  // Chòm sao của phiên: điểm cách đều tối thiểu, nối theo láng giềng gần nhất.
  const { count, firstNumber } = journeyMarks(j)
  const cr = rng(hash('chom-sao'))
  const cand: Pt[] = []
  for (let tries = 0; cand.length < 40 && tries < 4000; tries += 1) {
    const p: Pt = [W * (0.6 + cr() * 0.34), H * (0.07 + cr() * 0.42)]
    if (cand.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > 46)) cand.push(p)
  }
  const order: Pt[] = []
  let cur: Pt = [W * 0.62, H * 0.45]
  const pool = [...cand]
  while (pool.length > 0) {
    let best = 0
    pool.forEach((p, i) => {
      const bp = pool[best] as Pt
      if (Math.hypot(p[0] - cur[0], p[1] - cur[1]) < Math.hypot(bp[0] - cur[0], bp[1] - cur[1])) best = i
    })
    cur = pool.splice(best, 1)[0] as Pt
    order.push(cur)
  }
  const mine = order.slice(0, count)
  let constellation = ''
  if (mine.length > 1) {
    constellation += `<path d="M${mine.map(p => `${n0(p[0])} ${n0(p[1])}`).join('L')}" fill="none" stroke="${ATLAS.accent}" stroke-opacity="0.6" stroke-width="0.9" vector-effect="non-scaling-stroke"/>`
  }
  mine.forEach((p, i) => {
    constellation += `<circle cx="${n0(p[0])}" cy="${n0(p[1])}" r="6" fill="none" stroke="${ATLAS.accent}" stroke-opacity="0.45" stroke-width="0.8" vector-effect="non-scaling-stroke"/><circle cx="${n0(p[0])}" cy="${n0(p[1])}" r="2.6" fill="${ATLAS.accent}"/>`
    if (detail === 'full') {
      constellation += `<text x="${n0(p[0] + 9)}" y="${n0(p[1] + 3)}" font-family="${MONO}" font-size="9" fill="${ATLAS.accent}" fill-opacity="0.8">${firstNumber + i}</text>`
    }
  })

  const defs = `<filter id="mist" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>`
  const body =
    `<rect width="${W}" height="${H}" fill="${ATLAS.ground}"/>` +
    glow +
    `<g fill="none" stroke="${ATLAS.grid}" stroke-opacity="0.13" stroke-width="0.55" vector-effect="non-scaling-stroke">${grid}<path d="${spokes}"/></g>` +
    labels +
    ecliptic +
    dust +
    bright +
    constellation +
    (detail === 'full' ? cartouche(56, H - 136, 'THIÊN ĐỒ · CHÒM SAO PHIÊN NÀY', j, 'sao', ATLAS.star, ATLAS.grid) : '')
  return frame(detail, defs, body)
}

// ───────────────────────── Bản IV — Giấy dó ─────────────────────────
const PAPER = {
  ground: oklch(0.935, 0.016, 85),
  fibre: oklch(0.8, 0.025, 80),
  ink: oklch(0.3, 0.012, 75),
  seal: oklch(0.55, 0.17, 30),
}

function renderPaper(j: Journey, detail: Detail): string {
  const rand = rng(hash('giay-do'))
  const noise = makeNoise(hash('nui'))
  // Xơ giấy dó: sợi mảnh, dài, ngẫu nhiên.
  let fibres = ''
  const fibreCount = detail === 'full' ? 170 : 0
  for (let i = 0; i < fibreCount; i += 1) {
    const x = rand() * W
    const y = rand() * H
    const len = 14 + rand() * 46
    const a = rand() * Math.PI
    const bend = (rand() - 0.5) * 30
    fibres += `M${n0(x)} ${n0(y)}q${n0(Math.cos(a) * len * 0.5 - Math.sin(a) * bend)} ${n0(Math.sin(a) * len * 0.5 + Math.cos(a) * bend)} ${n0(Math.cos(a) * len)} ${n0(Math.sin(a) * len)}`
  }
  // Năm lớp núi, xa nhạt gần đậm, chân núi tan vào sương.
  const layers = 5
  let defs = `<filter id="far" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>`
  let mountains = ''
  let strokes = ''
  const stepX = detail === 'full' ? 10 : 25
  for (let k = 0; k < layers; k += 1) {
    const L = 0.83 - k * 0.115
    const tone = oklch(L, 0.01, 78)
    const base = H * (0.5 + k * 0.085)
    const amp = H * (0.09 + k * 0.035)
    const ridgeAt = (x: number) => {
      const px = x / W
      const shape = 0.22 + 1.9 * Math.abs(px - 0.5) ** 1.25 // giữa trũng, chừa khoảng trống
      const lean = 1.3 - 0.7 * px // khối núi chính dồn về trái
      const ridged = 1 - Math.abs(fbm(noise, px * (2.2 + k * 0.6) + k * 7.1, k * 3.3, 5) * 2)
      return base - amp * shape * lean * ridged ** 1.6
    }
    const pts: Pt[] = []
    for (let x = -20; x <= W + 20; x += stepX) pts.push([x, ridgeAt(x)])
    const top = Math.min(...pts.map(p => p[1]))
    // Mực đậm ở sống núi, loang xuống rồi tan hẳn vào sương trước lớp kế tiếp.
    defs += `<linearGradient id="mist${k}" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${n0(top)}" y2="${n0(base + H * 0.03)}"><stop offset="0" stop-color="${tone}"/><stop offset="1" stop-color="${PAPER.ground}"/></linearGradient>`
    const d = `M${pts.map(p => `${n0(p[0])} ${n0(p[1])}`).join('L')}L${W + 20} ${H + 20}L-20 ${H + 20}Z`
    mountains += `<path d="${d}" fill="url(#mist${k})"${k < 2 ? ' filter="url(#far)"' : ''}/>`
    // Nét chấm phá (cun) dọc sống núi của hai lớp gần.
    if (detail === 'full' && k === layers - 1) {
      for (let i = 1; i < pts.length - 1; i += 1) {
        if (rand() > 0.22) continue
        const p = pts[i] as Pt
        const q = pts[i + 1] as Pt
        const slope = (q[1] - p[1]) / stepX
        if (Math.abs(slope) < 0.25) continue // chỉ chấm phá trên sườn dốc
        const len = 6 + rand() * 12
        const side = slope > 0 ? -1 : 1
        strokes += `M${n0(p[0])} ${n0(p[1] + 3)}q${n0(side * len * 0.2)} ${n0(len * 0.5)} ${n0(side * len * 0.7)} ${n0(len)}`
      }
    }
  }
  // Mỗi lượt một cánh chim mực, bay thành đàn thưa ở trời trái.
  const { count } = journeyMarks(j)
  const fr = rng(hash('dan-chim'))
  let birds = ''
  for (let i = 0; i < count; i += 1) {
    const t = i / 40
    const x = W * (0.1 + 0.32 * t) + (fr() - 0.5) * 60
    const y = H * (0.14 + 0.16 * t * t) + (fr() - 0.5) * 50
    const s = 5 + fr() * 4
    birds += `M${n0(x - s)} ${n0(y - s * 0.3)}q${n0(s * 0.5)} ${n0(-s * 0.35)} ${n0(s)} ${n0(s * 0.35)}q${n0(s * 0.5)} ${n0(-s * 0.7)} ${n0(s)} ${n0(-s * 0.35)}`
  }
  // Con dấu son, chu văn: số lượt thật.
  const sx = W * 0.86
  const sy = H * 0.12
  const sealEdge: Pt[] = []
  for (let i = 0; i < 4; i += 1) {
    const corner: Pt = [[0, 0], [52, 0], [52, 52], [0, 52]][i] as Pt
    const next: Pt = [[52, 0], [52, 52], [0, 52], [0, 0]][i] as Pt
    for (let t = 0; t < 1; t += 0.2) {
      sealEdge.push([sx + corner[0] + (next[0] - corner[0]) * t + (rand() - 0.5) * 1.6, sy + corner[1] + (next[1] - corner[1]) * t + (rand() - 0.5) * 1.6])
    }
  }
  const seal =
    `<path d="M${sealEdge.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}Z" fill="${PAPER.seal}"/>` +
    `<rect x="${sx + 4}" y="${sy + 4}" width="44" height="44" fill="none" stroke="${PAPER.ground}" stroke-width="1.2"/>` +
    `<text x="${sx + 26}" y="${sy + 31}" text-anchor="middle" font-family="${SERIF}" font-size="${j.turns > 99 ? 15 : 21}" font-weight="700" fill="${PAPER.ground}">${j.turns}</text>` +
    `<text x="${sx + 26}" y="${sy + 43}" text-anchor="middle" font-family="${MONO}" font-size="7" letter-spacing="1.5" fill="${PAPER.ground}">LƯỢT</text>`
  const caption =
    detail === 'full'
      ? `<text x="${sx + 52}" y="${sy + 74}" text-anchor="end" font-family="${SERIF}" font-size="15" fill="${PAPER.ink}" fill-opacity="0.78">${esc(j.folder)}</text><text x="${sx + 52}" y="${sy + 92}" text-anchor="end" font-family="${MONO}" font-size="10" letter-spacing="1" fill="${PAPER.ink}" fill-opacity="0.55">${esc(j.date)}</text>`
      : ''
  const body =
    `<rect width="${W}" height="${H}" fill="${PAPER.ground}"/>` +
    (fibres ? `<path d="${fibres}" fill="none" stroke="${PAPER.fibre}" stroke-opacity="0.2" stroke-width="0.5" vector-effect="non-scaling-stroke"/>` : '') +
    mountains +
    (strokes ? `<path d="${strokes}" stroke="${PAPER.ink}" stroke-opacity="0.12" stroke-width="1" stroke-linecap="round" vector-effect="non-scaling-stroke"/>` : '') +
    (birds ? `<path d="${birds}" fill="none" stroke="${PAPER.ink}" stroke-opacity="0.8" stroke-width="1.3" stroke-linecap="round" vector-effect="non-scaling-stroke"/>` : '') +
    seal +
    caption
  return frame(detail, defs, body)
}

// ───────────────────────── Danh mục ─────────────────────────
export const PLATES: Record<PlateId, Plate> = {
  'dia-hinh': {
    numeral: 'I',
    name: 'Địa hình',
    source: 'Bản đồ khắc đồng: đường đồng mức, tuyến khảo sát',
    accent: TOPO.accent,
    render: renderTopo,
  },
  'son-mai': {
    numeral: 'II',
    name: 'Sơn mài',
    source: 'Tranh sơn mài: khảm vỏ trứng, vàng lá, vầng son',
    accent: LACQUER.gold,
    render: renderLacquer,
  },
  'thien-do': {
    numeral: 'III',
    name: 'Thiên đồ',
    source: 'Atlas sao cổ: lưới xích vĩ, Ngân Hà, cấp sáng',
    accent: ATLAS.accent,
    render: renderAtlas,
  },
  'giay-do': {
    numeral: 'IV',
    name: 'Giấy dó',
    source: 'Thuỷ mặc trên giấy dó: núi trong sương, dấu son',
    accent: PAPER.seal,
    render: renderPaper,
  },
}

export const PLATE_IDS = Object.keys(PLATES) as PlateId[]

export function bars(tools: Record<string, number>, accent: string, muted: string): string | undefined {
  const rows = Object.entries(tools)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 6)
  if (rows.length === 0) return undefined
  const max = rows[0]?.[1] ?? 1
  const rowH = 22
  const width = 280
  const labelW = 92
  const barMax = 150
  let body = ''
  rows.forEach(([tool, count], i) => {
    const y = i * rowH
    const w = Math.max(2, Math.round((count / max) * barMax))
    body += `<text x="0" y="${y + 14}" font-family="${MONO}" font-size="11" fill="${muted}">${esc(tool.slice(0, 13))}</text><rect x="${labelW}" y="${y + 7}" width="${w}" height="6" fill="${i === 0 ? accent : muted}" fill-opacity="${i === 0 ? 1 : 0.55}"/><text x="${width}" y="${y + 14}" text-anchor="end" font-family="${MONO}" font-size="11" fill="${muted}" style="font-variant-numeric:tabular-nums">${count}</text>`
  })
  const h = rows.length * rowH
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}"><line x1="${labelW}" y1="0" x2="${labelW}" y2="${h}" stroke="${muted}" stroke-opacity="0.4" stroke-width="1"/>${body}</svg>`
}
