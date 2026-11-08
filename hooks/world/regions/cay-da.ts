// Vùng "Cây đa cổ thụ" (x 3600–5400): cây đa nghìn năm trên gò thấp ở 1/3 trái — thân to nhiều múi xoắn, rễ phụ buông thành rèm
// (một rễ đã hoá trụ), tán rộng thấp xoè ngang đóng khung góc trên-trái, mép tán gãy thành chùm lá. Dưới gốc: miếu nhỏ đèn dầu,
// xích đu treo cành trái, hai đèn lồng giấy; bãi cỏ thoải xuống phải là chỗ mèo ngủ.
//
// KHỐI (cảnh cay-da · camera x 4700, zoom .95 → khung thế giới x 3858–5542, y −56–996):
//  1. TÁN — mảng tối lớn nhất, đóng khung góc TRÊN-TRÁI: mép dưới võng ở y≈330 bên trái, vén dần lên chạm mép khung trên ở ≈60% bề ngang.
//  2. THÂN + gò + miếu ở 1/3 trái (thân ≈19%, miếu ≈34%) — cụm tiêu điểm duy nhất, tương phản mạnh nhất; xích đu & rễ trụ lùi về mép trái.
//  3. TRỜI + đồng xa (của lõi) chiếm giữa & phải — mảng sáng, để trống cho khung chat.
//  4. SƯỜN CỎ thoải xuống phải (vừa, mềm; chỉ có vân cỏ tương phản thấp, lối đất nhạt) — bãi mèo ≈77%.
//  5. TIỀN CẢNH lớp 4: hai bụi cỏ tối ở góc dưới trái/phải (≈5% diện tích).
// Đã bỏ (rối, kiểu icon): chòi gỗ, diều, ô lò cò, ghế đá + ấm + nón, bậc ván, khăn đỏ, ốc sên, cú, các "gối mây" lá đóng dấu.
// Chi tiết dồn vào VÂN & MÉP: mép tán rách nhiều cấp (thuỳ cụm lá → vỏ sò lá), cụm lá chồng lấn có bụng tối, viền sáng phía mặt trời,
// múi thân xoắn có khe tối, rêu & dương xỉ trong khe, vỏ rễ trụ.
// Mùa: xuân lộc xanh non trên đỉnh cụm · hạ tán dày sâu · thu phần lớn xanh ô-liu + vài cụm vàng, lá rơi & thảm lá · đông tán thưa
// lộ khung cành, tuyết đọng mặt trên cành/mái/cụm lá, tuyết phủ liền mặt đất chừa vòng khô dưới tán.
import type { BuildOut, Ctx, Layer, Piece, Region, Spot } from '../types'
import { ground } from '../util'

type P = [number, number]
type Sp = [number, number, number]
type Rnd = () => number

// ───────────── path gọn: số nguyên, toạ độ tương đối ─────────────
const R = Math.round
const nm = (v: number) => {
  const r = R(v)
  return r === 0 ? '0' : String(r)
}
const J = (a: number[]) => {
  let s = ''
  for (const v of a) {
    const t = nm(v)
    s += s && t[0] !== '-' ? ` ${t}` : t
  }
  return s
}
const n1 = (v: number) => Math.round(v * 10) / 10
const f2 = (v: number) => String(Math.round(v * 100) / 100).replace(/^(-?)0\./, '$1.')
const J1 = (a: number[]) => a.map(v => String(n1(v))).join(' ').replace(/ -/g, '-')
const rp = (p: P[]): P[] => p.map(([x, y]) => [R(x), R(y)])
const mid = (a: P, b: P): P => [R((a[0] + b[0]) / 2), R((a[1] + b[1]) / 2)]

/** Đường cong kín mượt (đi qua trung điểm, điểm điều khiển là đỉnh). */
function sc(pts: P[]): string {
  const q = rp(pts)
  const n = q.length
  if (n < 3) return ''
  const st = mid(q[n - 1] as P, q[0] as P)
  let cur = st
  const o: number[] = []
  for (let i = 0; i < n; i += 1) {
    const c = q[i] as P
    const m = mid(c, q[(i + 1) % n] as P)
    o.push(c[0] - cur[0], c[1] - cur[1], m[0] - cur[0], m[1] - cur[1])
    cur = m
  }
  return `M${J(st)}q${J(o)}z`
}
/** Đường cong hở mượt từ điểm đầu tới điểm cuối. */
function so(pts: P[]): string {
  const q = rp(pts)
  const n = q.length
  const f = q[0] as P
  if (n < 3) {
    const l = q[n - 1] as P
    return `M${J(f)}l${J([l[0] - f[0], l[1] - f[1]])}`
  }
  let cur = f
  const o: number[] = []
  for (let i = 1; i < n - 1; i += 1) {
    const c = q[i] as P
    const m = i === n - 2 ? (q[n - 1] as P) : mid(c, q[i + 1] as P)
    o.push(c[0] - cur[0], c[1] - cur[1], m[0] - cur[0], m[1] - cur[1])
    cur = m
  }
  return `M${J(f)}q${J(o)}`
}
/** Đa giác/gấp khúc tương đối. */
function pl(pts: P[], close = true): string {
  const q = rp(pts)
  const o: number[] = []
  for (let i = 1; i < q.length; i += 1) {
    const a = q[i - 1] as P
    const b = q[i] as P
    o.push(b[0] - a[0], b[1] - a[1])
  }
  return `M${J(q[0] as P)}l${J(o)}${close ? 'z' : ''}`
}
/** Điểm của một khối hữu cơ. */
function bp(cx: number, cy: number, rx: number, ry: number, r: Rnd, n: number, rough: number): P[] {
  const ph = r() * 6.283
  const a1 = r() * rough
  const a2 = r() * rough
  const pts: P[] = []
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * 6.2832
    const k = 1 + a1 * Math.sin(2 * a + ph) + a2 * Math.sin(3 * a + ph * 1.7) + rough * 0.7 * (r() - 0.5)
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return pts
}
const blob = (cx: number, cy: number, rx: number, ry: number, r: Rnd, n = 9, rough = 0.2) => sc(bp(cx, cy, rx, ry, r, n, rough))
/** Mép rách (rêu, tuyết, thảm lá): khối có mép răng cưa nhỏ. */
const rag = (cx: number, cy: number, rx: number, ry: number, r: Rnd, n = 14, rough = 0.3) =>
  pl(bp(cx, cy, rx, ry, r, n, rough).map(([x, y], i) => [x + (i % 2 ? 0 : (x - cx) * 0.12), y + (i % 2 ? 0 : (y - cy) * 0.3)] as P))

/** Nhiều chiếc lá (x, y, dài, rộng, góc) gộp một path. */
function leaves(list: [number, number, number, number, number][]): string {
  let d = ''
  let px = 0
  let py = 0
  for (const [x, y, len, w, a] of list) {
    const X = R(x)
    const Y = R(y)
    const ex = R(Math.cos(a) * len)
    const ey = R(Math.sin(a) * len)
    const nx = -Math.sin(a) * w
    const ny = Math.cos(a) * w
    const c1 = [R((Math.cos(a) * len) / 2 + nx), R((Math.sin(a) * len) / 2 + ny)]
    const c2 = [R((Math.cos(a) * len) / 2 - nx) - ex, R((Math.sin(a) * len) / 2 - ny) - ey]
    d += `${d ? `m${J([X - px, Y - py])}` : `M${J([X, Y])}`}q${J([c1[0] as number, c1[1] as number, ex, ey])}q${J([c2[0] as number, c2[1] as number, -ex, -ey])}z`
    px = X
    py = Y
  }
  return d
}

/** Cành thuôn: thân kín + mép trên + mép dưới. */
function limbGeo(sp: Sp[]) {
  const n = sp.length
  const A: P[] = []
  const B: P[] = []
  let dl: P = [1, 0]
  for (let i = 0; i < n; i += 1) {
    const p = sp[i] as Sp
    const a = sp[Math.max(0, i - 1)] as Sp
    const b = sp[Math.min(n - 1, i + 1)] as Sp
    let dx = b[0] - a[0]
    let dy = b[1] - a[1]
    const L = Math.hypot(dx, dy) || 1
    dx /= L
    dy /= L
    let nx = dy
    let ny = -dx
    if (-ny + nx * 0.6 < ny - nx * 0.6) {
      nx = -nx
      ny = -ny
    }
    A.push([p[0] + nx * p[2], p[1] + ny * p[2]])
    B.push([p[0] - nx * p[2], p[1] - ny * p[2]])
    dl = [dx, dy]
  }
  const last = sp[n - 1] as Sp
  const tip: P = [last[0] + dl[0] * last[2] * 2.2, last[1] + dl[1] * last[2] * 2.2]
  return { shape: [...A, tip, ...[...B].reverse()], top: A, bot: B }
}
/** y mép dưới của cành tại x. */
function under(sp: Sp[], x: number): number {
  for (let i = 1; i < sp.length; i += 1) {
    const a = sp[i - 1] as Sp
    const b = sp[i] as Sp
    if ((x - a[0]) * (x - b[0]) <= 0) {
      const t = (x - a[0]) / (b[0] - a[0] || 1)
      return a[1] + (b[1] - a[1]) * t + (a[2] + (b[2] - a[2]) * t) * 0.8
    }
  }
  const l = sp[sp.length - 1] as Sp
  return l[1] + l[2]
}
/** Nội suy tuyến tính trên bảng [x, y] tăng dần theo x. */
function lin(tab: P[], x: number): number {
  for (let i = 1; i < tab.length; i += 1) {
    const a = tab[i - 1] as P
    const b = tab[i] as P
    if (x <= b[0]) return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0] || 1)
  }
  return (tab[tab.length - 1] as P)[1]
}

/** Mép rách NHIỀU CẤP dọc một đường gấp khúc ("ngoài" = pháp tuyến (−ty, tx)): thuỳ cụm lá rộng 110–230 võng ra ngoài,
 *  giữa hai thuỳ là khe lõm; trên mỗi thuỳ là vỏ sò lá cỡ chênh nhau 12–34. Trả lệnh `q…` tương đối, bắt đầu ở điểm đầu. */
function ragEdge(line: P[], r: Rnd, lob: [number, number], dep: [number, number], bul: number): string {
  const seg: number[] = [0]
  for (let i = 1; i < line.length; i += 1) {
    const a = line[i - 1] as P
    const b = line[i] as P
    seg.push((seg[i - 1] as number) + Math.hypot(b[0] - a[0], b[1] - a[1]))
  }
  const L = seg[seg.length - 1] as number
  const at = (s: number): [number, number, number, number] => {
    let i = 1
    while (i < line.length - 1 && (seg[i] as number) < s) i += 1
    const a = line[i - 1] as P
    const b = line[i] as P
    const l = (seg[i] as number) - (seg[i - 1] as number) || 1
    const t = (s - (seg[i - 1] as number)) / l
    const tx = (b[0] - a[0]) / l
    const ty = (b[1] - a[1]) / l
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, -ty, tx]
  }
  const o: number[] = []
  let cur: P = [R((line[0] as P)[0]), R((line[0] as P)[1])]
  let s = 0
  while (s < L - 1) {
    let s1 = Math.min(L, s + lob[0] + r() * (lob[1] - lob[0]))
    if (L - s1 < lob[0] * 0.5) s1 = L
    const dp = dep[0] + r() * (dep[1] - dep[0])
    let u = 0
    while (u < 1) {
      const u1 = Math.min(1, u + (12 + r() * 22) / (s1 - s))
      const [x, y, nx, ny] = at(s + (s1 - s) * u1)
      const off = dp * Math.sin(Math.PI * u1) ** 0.6
      const p: P = [R(x + nx * off), R(y + ny * off)]
      const [mx, my, mnx, mny] = at(s + (s1 - s) * (u + u1) * 0.5)
      const mo = dp * Math.sin(Math.PI * (u + u1) * 0.5) ** 0.6 + bul * (0.5 + r()) * Math.min(1.6, ((u1 - u) * (s1 - s)) / 20)
      o.push(R(mx + mnx * mo) - cur[0], R(my + mny * mo) - cur[1], p[0] - cur[0], p[1] - cur[1])
      cur = p
      u = u1
    }
    s = s1
  }
  return `q${J(o)}`
}
/** Cụm lá: khối bầu dục mép vỏ sò (mỗi đoạn phồng ra ngoài), bất đối xứng. */
function lump(cx: number, cy: number, rx: number, ry: number, r: Rnd, n = 9): string {
  const pts = bp(cx, cy, rx, ry, r, n, 0.16).map(([x, y]) => [R(x), R(y)] as P)
  let cur = pts[0] as P
  const o: number[] = []
  for (let i = 1; i <= n; i += 1) {
    const p = pts[i % n] as P
    const mx = (cur[0] + p[0]) / 2
    const my = (cur[1] + p[1]) / 2
    const k = 0.22 + r() * 0.2
    o.push(R(mx + (mx - cx) * k * (rx / Math.hypot(mx - cx, my - cy) || 0) * 0.35) - cur[0], R(my + (my - cy) * k * 1.2) - cur[1], p[0] - cur[0], p[1] - cur[1])
    cur = p
  }
  return `M${J(pts[0] as P)}q${J(o)}z`
}

// ───────────── bố cục (toạ độ thế giới, lớp 3) ─────────────
const TX = 4190 // tâm gốc đa (đỉnh gò)
const FY = 412 // chạc
const hump = (x: number) => 30 * Math.exp(-(((x - TX) / 300) ** 2))
/** Mặt gò. */
const gy = (x: number) => ground(x) - hump(x)
const BY = (x: number) => gy(x) + 7
const SX = 4440 // miếu, sát rễ nổi bên phải
const SY = R(gy(SX) + 16)
const CATX = 5150 // bãi cỏ mèo ngủ
// Mép dưới tán (x → y): võng thấp bên trái, vén lên chạm mép khung trên bên phải.
const UB: P[] = [[3600, 318], [3800, 330], [4000, 336], [4200, 322], [4360, 282], [4470, 228], [4560, 152], [4630, 56], [4676, -70], [4700, -300]]
const ybot = (x: number) => lin(UB, x)
// Cành [x, y, nửa dày]
const LL: Sp[] = [[4140, 432, 44], [4040, 394, 36], [3930, 378, 30], [3820, 386, 25], [3700, 372, 20], [3620, 356, 14]]
const LU: Sp[] = [[4160, 422, 46], [4110, 336, 36], [4030, 262, 27], [3950, 206, 19], [3870, 170, 13]]
const LM: Sp[] = [[4220, 416, 44], [4246, 330, 34], [4290, 252, 25], [4350, 196, 17], [4420, 160, 12]]
const LR: Sp[] = [[4250, 428, 42], [4350, 384, 33], [4430, 336, 26], [4480, 280, 20], [4520, 210, 15], [4550, 140, 11], [4570, 70, 8]]
const LR2: Sp[] = [[4470, 292, 15], [4530, 226, 11], [4570, 160, 8], [4596, 96, 5], [4606, 50, 3]]
const ROOTS: Sp[][] = [
  [[TX - 120, 668, 30], [TX - 196, 706, 21], [TX - 262, 728, 13], [TX - 330, 742, 6], [TX - 372, 748, 2]],
  [[TX + 110, 676, 26], [TX + 168, 702, 18], [TX + 216, 712, 10], [TX + 246, 716, 3]],
]

// ───────────── dựng ─────────────
const LIMIT = 13500
const GX = '<g class="cd-gr cd-gx">'
const GX_LEN = GX.length + '</g>'.length
const cost = (p: Piece) => p.svg.length + (p.glow?.length ?? 0) + 8 - GX_LEN * (p.svg.split(GX).length - 1)
function build(ctx: Ctx): BuildOut {
  const size = (ps: Piece[]) => ps.reduce((a, p) => a + cost(p), 0)
  const lite = ctx.detail === 'lite'
  // thu/đông bỏ được nhiều vật (hoa, đốm nắng…) nên dư chỗ cho vân tán; 
  const cap = lite ? 7600 : LIMIT + (ctx.season === 'thu' ? 800 : ctx.season === 'dong' ? 100 : 0)
  let trim = lite ? 2 : 0
  let out = buildAt(ctx, trim)
  while (size(out.pieces) > cap && trim < 3) {
    trim += 1
    out = buildAt(ctx, trim)
  }
  let n = size(out.pieces)
  if (n > cap) {
    const drop = new Set<Piece>()
    for (const p of [...out.pieces].sort((a, b) => a.prio - b.prio)) {
      if (n <= cap || p.prio >= 8) break
      drop.add(p)
      n -= cost(p)
    }
    out = { ...out, pieces: out.pieces.filter(p => !drop.has(p)) }
  }
  return out
}

function buildAt(ctx: Ctx, trim: number): BuildOut {
  const lite = ctx.detail === 'lite'
  const S = ctx.season
  const W = ctx.cur
  const day = ctx.daylight
  const night = day < 0.6
  const dark = day < 0.4
  const snow = W.precip === 'tuyet'
  const sunny = day > 0.55 && (W.cloud === 'quang' || W.cloud === 'it' || W.cloud === 'vua') && W.precip === 'khong'
  const tet = S === 'dong' && ctx.seasonT > 0.78
  const ram = Math.abs(ctx.moonPhase - 0.5) < 0.05
  const mung1 = ctx.moonPhase < 0.035 || ctx.moonPhase > 0.965
  const trungThu = ram && ((ctx.vn.mo === 9 && ctx.vn.d >= 6) || (ctx.vn.mo === 10 && ctx.vn.d <= 9))
  const dong = S === 'dong'
  const thu = S === 'thu'
  /** Mặt trời phía nào: sáng ở trái (đông), chiều ở phải (tây). */
  const sx = ctx.vn.hourF < 12.5 ? -1 : 1
  const r = ctx.rng('cd-build')

  const pieces: Piece[] = []
  const add = (x0: number, x1: number, prio: number, svg: string, glow = '', layer: Layer = 3) => {
    if (svg || glow) pieces.push(glow ? { layer, x0, x1, prio, svg, glow } : { layer, x0, x1, prio, svg })
  }
  // màu lá theo mùa (sáng → tối); đêm pha mực
  const FT = thu ? ['m1', 'm2', 'm3', 'g4'] : ['l1', 'l2', 'l3', 'l4']
  const FA = S === 'xuan' ? ['g1', 'l2', 'l3'] : thu ? ['l1', 'm2', 'm3'] : null
  const col = (v: string, q: number) => (dark ? `color-mix(in srgb,var(--${v}) ${q}%,var(--k1))` : night ? `color-mix(in srgb,var(--${v}) ${q + 22}%,var(--k1))` : `var(--${v})`)
  const c0 = col(FT[0] as string, 60)
  const c3 = col(FT[3] as string, 52)

  // ═════ defs ═════
  const st = (o: string, c: string, op = '') => `<stop offset="${o}" style="stop-color:${c}"${op ? ` stop-opacity="${op}"` : ''}/>`
  const lg = (id: string, dir: string, s: string) => `<linearGradient id="${id}" ${dir}>${s}</linearGradient>`
  const kx = sx < 0 ? '' : 'x1="1" x2="0"'
  const fdir = sx < 0 ? 'x1=".3" x2=".6" y2="1"' : 'x1=".7" x2=".4" y2="1"'
  let defs =
    lg('cd-k', kx, st('0', 'var(--b3)') + st('.3', 'var(--b2)') + st('.78', 'var(--b1)') + st('1', 'var(--k2)')) +
    lg('cd-kv', 'x2="0" y2="1"', st('0', 'var(--b3)') + st('.4', 'var(--b2)') + st('1', 'var(--b1)')) +
    lg('cd-f0', fdir, st('0', c0) + st('.5', col(FT[1] as string, 56)) + st('1', c3)) +
    lg('cd-f1', fdir, st('0', col(FT[1] as string, 56)) + st('.55', col(FT[2] as string, 54)) + st('1', c3)) +
    lg('cd-f2', fdir, st('0', col(FT[2] as string, 54)) + st('.65', c3) + st('1', c3)) +
    (FA && !snow ? lg('cd-fy', fdir, st('0', col(FA[0] as string, 60)) + st('.5', col(FA[1] as string, 56)) + st('1', col(FA[2] as string, 52))) : '') +
    lg('cd-md', 'x2="0" y2="1"', st('0', 'var(--g2)', '.9') + st('.5', 'var(--g3)', '.5') + st('1', 'var(--g3)', '0')) +
    `<radialGradient id="cd-ao">${st('0', 'var(--k1)', '.5')}${st('1', 'var(--k1)', '0')}</radialGradient>`
  // Vân hạt (tương phản rất thấp): lá trong tán, cỏ trên sườn, thớ vỏ — chi tiết mịn thay cho vật vụn.
  const pat = (id: string, w: number, h: number, body: string) => `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${body}</pattern>`
  const sk = (v: string, wd: number, d: string) => `<path style="fill:none;stroke:var(--${v});stroke-width:${wd};stroke-linecap:round" d="${d}"/>`
  defs +=
    pat('cd-pg', 134, 58, sk('g1', 1.4, 'M3 8l1-5M17 20l-1-6M29 10l2-5M41 24l-1-5M9 27l1-4M47 6l1-4M66 15l1-5M79 40l-1-5M95 12l2-5M108 30l-1-4M121 8l1-5M58 50l1-4M88 54l-1-4M127 44l1-5M36 46l1-4') + sk('g4', 1.4, 'M12 14l1-5M35 18l-1-5M24 28l1-4M72 28l1-5M101 46l-1-5M116 20l1-4M50 36l1-4M5 50l1-4'))
  // Nét cọ lá: 2 dấu cụm lá bất quy tắc (6–8 lá cỡ & hướng chênh nhau, rủ xuống) — đóng lên tán thay cho vân lặp đều.
  {
    const dr = ctx.rng('cd-dab')
    for (let v = 0; v < 2; v += 1) {
      const L: [number, number, number, number, number][] = []
      for (let k = 0; k < 7 + v; k += 1) {
        // chùm lá rủ: lá bầu rộng chồng lấn, toả hình quạt xuống dưới
        const a = 3.4 + dr() * 2.6
        const rr = 3 + dr() * 16
        const len = 11 + dr() * 11
        L.push([Math.cos(a) * rr * 1.3, Math.sin(a) * rr * 0.5, len, len * (0.36 + dr() * 0.14), 0.9 + (k / (7 + v)) * 1.4 + (dr() - 0.5) * 0.5])
      }
      defs += `<path id="cd-d${v}" d="${leaves(L)}"/>`
    }
  }
  const grain = !lite && !night && W.precip !== 'mua' && W.precip !== 'mua-to'
  if (grain) {
    const gq = ctx.rng('cd-hat')
    const A: [number, number, number, number, number][] = []
    const B: [number, number, number, number, number][] = []
    for (let k = 0; k < 22; k += 1) (k % 3 ? A : B).push([gq() * 170, gq() * 120, 4 + gq() * 5, 1.6 + gq() * 1.4, 0.6 + gq() * 2])
    defs += pat('cd-pl', 170, 120, `<path style="fill:${c0}" d="${leaves(A)}"/><path style="fill:${c3}" d="${leaves(B)}"/>`)
  }
  defs += `<radialGradient id="cd-hi">${st('0', 'var(--g1)', '.5')}${st('1', 'var(--g1)', '0')}</radialGradient><radialGradient id="cd-mh">${st('0', 'var(--haze)', '.9')}${st('.6', 'var(--haze)', '.5')}${st('1', 'var(--haze)', '0')}</radialGradient>`
  if (snow) defs += `<linearGradient id="cd-sn" gradientUnits="userSpaceOnUse" x1="3600" x2="5600">${st('0', col('w3', 78), '0')}${st('.06', col('w3', 78), '.9')}${st('.92', col('w3', 78), '.9')}${st('1', col('w3', 78), '0')}</linearGradient><radialGradient id="cd-dry">${st('0', 'var(--g3)', '.75')}${st('.6', 'var(--g3)', '.4')}${st('1', 'var(--g3)', '0')}</radialGradient>`
  // Bóng tán: mép dưới rách nhiều cấp + vài lỗ trời gần mép; làm clip cho cụm lá bên trong.
  {
    const er = ctx.rng('cd-mep')
    const line: P[] = []
    for (let x = 3600; x <= 4680; x += 70) line.push([x, ybot(x)])
    line.push([4700, -300])
    const d = `M3600 318${ragEdge(line, er, lite ? [170, 260] : [110, 230], [14, 34], lite ? 5 : 7)}L4700-330L3600-330z`
    defs += `<path id="cd-sil" fill-rule="evenodd" clip-rule="evenodd" d="${d}"/><clipPath id="cd-cp"><use href="#cd-sil"/></clipPath>`
  }
  // Rèm rễ phụ: 3 dáng, mỗi dáng 4–6 sợi bện, dày 0,6–2 (sợi già dày, sợi non mảnh), dài chênh tới 3 lần.
  {
    const rr = ctx.rng('cd-rem')
    for (let v = 0; v < 3; v += 1) {
      let s = ''
      for (let k = 0; k < 4 + v; k += 1) {
        const x = k * 4.5 + rr() * 3
        const len = 60 + 210 * rr() ** 1.3
        const b = (k % 2 ? 1 : -1) * (3 + rr() * 6)
        const w = 0.6 + rr() * 1.5
        s += `M${J1([x - w, 0])}q${J1([b + w, len * 0.55, 0.3 * b + w * 0.6, len])}l${n1(w * 0.5)} 0q${J1([0.7 * b, -len * 0.45, w * 1.4 - 0.3 * b, -len])}z`
      }
      defs += `<path id="cd-r${v}" d="${s}"/>`
    }
  }
  const blade = (x: number, h: number, lean: number): string => `M${J([x - 2, 0])}q${J([lean * 0.4 + 1, -h * 0.6, lean + 2, -h])}q${J([-lean * 0.5 + 1, h * 0.45, 2 - lean, h])}z`
  defs += `<g id="cd-gs"><path class="g3" d="${blade(-6, 15, -7)}${blade(3, 18, 4)}${blade(9, 12, 8)}"/><path class="g1" d="${blade(-2, 13, -3)}${blade(5, 10, 6)}"/></g>`
  defs += `<g id="cd-fw"><path class="z2" d="M0 0q1-6 0-11"/><circle cy="-12" r="2.6"/></g>`
  defs += `<g id="cd-ms"><path class="m3" d="${rag(1, 1, 12, 4.6, r, 12, 0.4)}"/><path class="m2" d="${rag(-2, -1, 8, 2.8, r, 10, 0.4)}"/></g>`
  if (thu || (dong && ctx.seasonT < 0.4)) {
    const a: [number, number, number, number, number][] = []
    const b: [number, number, number, number, number][] = []
    for (let k = 0; k < 8; k += 1) (k % 2 ? a : b).push([r() * 44 - 22, r() * 8 - 4, 9 + r() * 4, 3.2, r() * 6.28])
    defs += `<g id="cd-lt"><path class="${thu ? 'l1' : 'd1'}" d="${leaves(a)}"/><path class="${thu ? 'm2' : 'd2'}" d="${leaves(b)}"/></g>`
  }
  defs += `<g id="cd-ln"><path class="k2" d="M-5 0h10v3h-10zM-4 26h8v3h-8z"/><ellipse cy="14" rx="11" ry="12"/><path class="sh" d="M1 2a11 12 0 0 1 0 24z"/><ellipse class="hl" cx="-5" cy="11" rx="3" ry="6"/><path class="cd-ts" d="M0 29v11"/></g>`

  // ═════ css ═════
  let css =
    `.cd-bk{fill:${col(FT[2] as string, 54)}}.cd-rim{fill:none;stroke:${c0};stroke-width:9;opacity:${night ? 0.25 : 0.6}}.cd-dl{fill:${c0};opacity:.7}.cd-dd{fill:${c3};opacity:.55}.cd-bl{fill:none;stroke:var(--b3);stroke-width:1.4;stroke-linecap:round;opacity:.5}.cd-ar{fill:none;stroke:var(--b2);stroke-width:5;stroke-linecap:round}` +
    `.cd-tw{fill:none;stroke:var(--b1);stroke-width:3.4;stroke-linecap:round}.cd-tx{fill:none;stroke:var(--b1);stroke-width:1.8;stroke-linecap:round}` +
    `.cd-rp{fill:none;stroke:var(--b3);stroke-width:1.6}.cd-ts{fill:none;stroke:var(--p1);stroke-width:1.6}.cd-in{fill:none;stroke:var(--p1);stroke-width:1.1}` +
    `.cd-hg,.cd-sw{transform-box:fill-box;transform-origin:50% 0}.cd-gr{transform-box:fill-box;transform-origin:50% 100%}.cd-fa{transform-box:fill-box;transform-origin:50% 50%}` +
    `@keyframes cd-hg{from{transform:rotate(calc(-.5deg - var(--wind)*1.4deg))}to{transform:rotate(calc(.6deg + var(--wind)*2.4deg))}}` +
    `@keyframes cd-sw{from{transform:rotate(calc(-1.2deg - var(--wind)*5deg))}to{transform:rotate(calc(1.4deg + var(--wind)*6deg))}}` +
    `@keyframes cd-gr{from{transform:skewX(calc(2deg + var(--wind)*3deg))}to{transform:skewX(calc(-3deg - var(--wind)*10deg))}}` +
    `@keyframes cd-dp{from{opacity:.35}to{opacity:1}}` +
    `@keyframes cd-fa{0%{transform:translate(0,0) rotate(0);opacity:0}8%{opacity:1}50%{transform:translate(calc(var(--wind)*50px + 16px),160px) rotate(200deg)}88%{opacity:1}100%{transform:translate(calc(var(--wind)*110px - 4px),330px) rotate(380deg);opacity:0}}` +
    `.cd-gx{animation:cd-gr 3.3s ease-in-out infinite alternate;animation-delay:${ctx.ph(6.6, 'cd-gx')}}`
  let ai = 0
  const anim = (name: string, dur: number) => {
    const c = `cd-a${ai}`
    ai += 1
    css += `.${c}{animation:${name} ${+dur.toFixed(1)}s ease-in-out infinite alternate;animation-delay:${ctx.ph(dur * 2, c)}}`
    return c
  }

  // ═════ A. Mặt đất: gò, bóng tán mềm, vòng đất trơ, lối đất nhạt xuống phải, bãi mèo, thảm lá / tuyết ═════
  {
    const top: P[] = []
    for (let x = 3600; x <= 4840; x += 80) top.push([x, gy(x) + 1])
    const bot: P[] = []
    for (let x = 4840; x >= 3600; x -= 160) bot.push([x, ground(x) + 2 + hump(x) * 2.2])
    let s = `<path fill="url(#cd-md)" d="${so(top)}${pl(bot, false).replace(/^M/, 'L')}z"/>`
    // viền nắng trên đỉnh gò, phía mặt trời
    const rim = top.filter(([x]) => (sx < 0 ? x < TX + 60 : x > TX - 60)).map(([x, y]) => [x, y + 3] as P)
    if (!night && !snow) s += `<path style="fill:none;stroke:var(--g1);stroke-width:5;stroke-linecap:round" opacity=".35" d="${so(rim)}"/>`
    // bóng tán trên đất: elip toả mềm, không có mép cắt
    s += `<ellipse fill="url(#cd-ao)" cx="${TX + 60}" cy="${R(gy(TX) + 26)}" rx="${sunny ? 640 : 560}" ry="${sunny ? 74 : 60}" opacity="${sunny ? 1 : 0.7}"/>`
    if (!snow) s += `<path class="d1" opacity=".55" d="${blob(TX + 70, gy(TX) + 26, 250, 20, r, 13, 0.18)}"/>`
    // bãi cỏ mèo ngủ: một mảng sáng mềm
    if (!snow) s += `<path class="g1" opacity=".5" d="${blob(CATX, ground(CATX) + 4, 96, 13, r, 11, 0.2)}"/>`
    // thảm lá thu (vàng đất, mềm) — dày phía khuất gió
    const nLeaf = lite || snow ? 0 : R((thu ? 6 + 5 * ctx.seasonT : dong && ctx.seasonT < 0.4 ? 3 : 0) * (trim ? 0.6 : 1))
    if (nLeaf) {
      const lr = ctx.rng('cd-thamla')
      let u = ''
      for (let i = 0; i < nLeaf; i += 1) {
        const x = 3980 + lr() * 640
        u += `<use href="#cd-lt" x="${R(x)}" y="${R(gy(x) + 12 + lr() ** 1.5 * 40)}"/>`
      }
      s += `<path class="${thu ? 'l1' : 'd1'}" opacity=".3" d="${blob(TX + 120, gy(TX) + 22, 380, 22, r, 12, 0.22)}"/><g opacity=".85">${u}</g>`
    }
    // tuyết: phủ LIỀN mặt đất cả vùng, vòng khô mờ dưới tán, vết chân trên lối
    if (snow) {
      const sn = ctx.noise('cd-tuyet')
      const pts: P[] = []
      for (let x = 3600; x <= 5600; x += 70) pts.push([x, gy(x) - 2 + sn(x / 90, 0.3) * 4])
      s += `<path fill="url(#cd-sn)" d="${so(pts)}L5600 1100L3600 1100z"/><ellipse fill="url(#cd-dry)" cx="${TX + 40}" cy="${R(gy(TX) + 24)}" rx="330" ry="34"/>`
      let fp = ''
      for (let i = 0; i < 8; i += 1) {
        const t = i / 7
        fp += `M${J([SX + 30 + t * 220 + (i % 2 ? 6 : -6), SY + 26 + t * 110])}h${R(4 + t * 3)}`
      }
      s += `<path style="fill:none;stroke:var(--s3);stroke-width:4;stroke-linecap:round" opacity=".3" d="${fp}"/>`
    }
    if (!lite && !snow && trim < 3) {
      const gt: P[] = []
      for (let x = 3600; x <= 5440; x += 120) gt.push([x, gy(x) + 4])
      s += `<path fill="url(#cd-pg)" opacity="${night ? 0.25 : 0.55}" d="${so(gt)}L5440 1000L3600 1000z"/>`
    }
    // Chuyển tông đất gần: bóng tán kéo dài xuống góc dưới-trái (tối, mềm), một dải nắng rộng tương phản thấp bên phải.
    s += `<ellipse fill="url(#cd-ao)" cx="${TX - 160}" cy="975" rx="720" ry="${sunny ? 150 : 125}" opacity="${sunny ? 1 : 0.75}"/>`
    if (!night && !snow) s += `<ellipse fill="url(#cd-hi)" cx="5060" cy="${R(ground(5060) + 70)}" rx="560" ry="60" opacity="${sunny ? 1 : 0.5}"/>`
    // vũng nước mưa ở tiền cảnh (soi trời, viền sáng mảnh) — ngoài cột giữa
    if (ctx.wet > 0.25 && !snow) {
      const pr = ctx.rng('cd-vung')
      let pd = ''
      for (const [x, y, w] of [[4060, 905, 130], [5400, 935, 95]] as const) {
        pd += blob(x, y, w, w * 0.075, pr, 9, 0.25)
      }
      s += `<path class="a2" opacity="${R(40 + 40 * ctx.wet) / 100}" d="${pd}"/>`
    }
    add(3600, 5440, 6, s)
    if (sunny && !lite && trim < 2) {
      const dr = ctx.rng('cd-dom')
      let dp = ''
      for (let i = 0; i < 6; i += 1) {
        const x = 3920 + dr() * 720
        const y = gy(x) + 10 + dr() * 50
        const a = 6 + dr() * 10
        dp += `M${J([x - a, y])}a${J([a, a * 0.28])} 0 1 0 ${J([a * 2, 0])}a${J([a, a * 0.28])} 0 1 0 ${J([-a * 2, 0])}`
      }
      add(3900, 4660, 4, `<path class="hl ${anim('cd-dp', 4.4)}" opacity=".6" d="${dp}"/>`)
    }
  }

  // ═════ B. Cành: thuôn, khuỷu mềm; mặt trên sáng · dưới tối; rêu dọc mặt trên; đông thêm khung cành con (nằm SAU lá) ═════
  {
    let s = ''
    for (const sp of [LU, LM, LR2]) s += `<path fill="url(#cd-k)" d="${sc(limbGeo(sp).shape)}"/>`
    let moss = ''
    let snowTop = ''
    for (const sp of [LL, LR]) {
      const g = limbGeo(sp)
      s += `<path fill="url(#cd-kv)" d="${sc(g.shape)}"/>`
      const tp = g.top.slice(1, 5)
      const inn = tp.map(([x, y], i) => {
        const q = sp[i + 1] as Sp
        return [x + (q[0] - x) * 0.35, y + (q[1] - y) * 0.35] as P
      })
      moss += pl([...tp.map(([x, y], i) => [x, y + (i % 2 ? 2 : -1)] as P), ...inn.reverse()])
      if (snow) snowTop += `${so(tp.map(([x, y]) => [x, y - 2] as P))}l0 5${so([...tp].reverse().map(([x, y]) => [x, y + 3] as P)).replace(/^M[^q]*/, '')}z`
    }
    s += `<path class="m2" opacity=".85" d="${moss}"/>`
    if (snowTop) s += `<path class="w3" d="${snowTop}"/>`
    // khung cành con: đông lộ rõ (cành cấp 2–3, thuôn, cong), thu vài cành
    if (dong || thu) {
      const tw = ctx.rng('cd-canhnho')
      const d = ['', '']
      const grow = (x: number, y: number, ang: number, len: number, depth: number) => {
        const ex = x + Math.cos(ang) * len
        const ey = y + Math.sin(ang) * len
        d[depth > 1 ? 0 : 1] += `M${J([x, y])}q${J([Math.cos(ang + 0.25) * len * 0.5, Math.sin(ang + 0.25) * len * 0.5, ex - x, ey - y])}`
        if (depth > 1) for (const k of [-1, 1]) grow(ex, ey, ang + k * (0.35 + tw() * 0.35), len * (0.62 + tw() * 0.15), depth - 1)
      }
      const deep = dong && trim < 2 ? 3 : 2
      for (const sp of [LU, LM, LR, LL, LR2]) {
        const a = sp[sp.length - 2] as Sp
        const b = sp[sp.length - 1] as Sp
        grow(b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), 70, deep)
        if (dong && trim < 2) {
          const m = sp[2] as Sp
          grow(m[0], m[1] - m[2], -1.57 + (m[0] < TX ? -0.6 : 0.6) + (tw() - 0.5) * 0.4, 80, 2)
        }
      }
      s += `<path class="cd-tw" d="${d[0]}"/><path class="cd-tx" d="${d[1]}"/>`
    }
    add(3600, 4780, 8, s)
  }

  // ═════ C. Tán: nền bụng tối → cụm lá chồng lấn (sau-trên sáng, trước-dưới tối) → viền sáng phía mặt trời → vân lá; tất cả cắt theo bóng tán ═════
  {
    const cr = ctx.rng('cd-cum')
    const rows = lite ? [0, 2] : [0, 1, 2]
    const lift = [215, 125, 38]
    let g = ''
    const rowsD = ['', '', '']
    const accD = ['', '', '']
    let dl = ''
    let dd = ''
    let caps = ''
    const dab = (x: number, y: number) => `<use href="#cd-d${Math.floor(cr() * 2)}" x="${R(x)}" y="${R(y)}"/>`
    const dabs = !lite && trim < 3
    for (const k of rows) {
      let x = 3600 + cr() * 40
      while (x < 4780) {
        const rx = (lite ? 150 : ([150, 110, 80][k] as number)) + cr() * ([120, 90, 70][k] as number)
        const ry = ([70, 58, 46][k] as number) + cr() * 28
        const cx = x + rx * 0.7
        const cy = ybot(Math.min(cx, 4730)) - (lift[k] as number) + (cr() - 0.5) * 36
        x += rx * (1.12 + cr() * 0.4)
        if (cy + ry < -150) continue
        // đông: tán thưa hẳn — bỏ nhiều cụm, cụm nhỏ lại, lộ khung cành
        if (dong && cr() < (k === 2 ? 0.38 : 0.22)) continue
        const kk = dong ? 0.86 : 1
        const p = lump(cx, cy, rx * kk, ry * kk, cr, lite ? 8 : 10)
        const kq = Math.max(0, k - (cx > 4450 ? 2 : cx > 4300 ? 1 : 0))
        const acc = FA && !snow && k < 2 && cr() < (thu ? 0.24 : 0.32)
        if (acc) accD[kq] += p
        else rowsD[kq] += p
        // tuyết đọng trên lưng cụm lá
        if (snow && cy - ry > -120) {
          const a = rx * kk * 0.6
          const h = ry * kk
          caps += `M${J([cx - a, cy - h * 0.5])}q${J([a * 0.9, -h * 0.58, a * 2, -h * 0.06])}q${J([-a * 0.3, h * 0.05, -a * 0.5, h * 0.16])}q${J([-a * 0.2, -h * 0.1, -a * 0.6, -h * 0.02])}q${J([-a * 0.3, h * 0.12, -a * 0.5, h * 0.06])}q${J([-a * 0.3, -h * 0.1, -a * 0.4, -h * 0.14])}z`
        }
        // nét cọ lá: sáng ở vai cụm phía mặt trời, tối ở bụng cụm phía khuất
        // hàng sau (sáng nhất): nét cọ tông giữa ở bụng; hàng giữa & trước: nét sáng ở vai phía nắng (chồm ra ngoài mép cụm), nét tối ở bụng
        // chùm lá sáng xếp dọc vai cụm phía nắng (chồm qua mép cụm → mép lá nhiều cấp); chùm tối ở bụng phía khuất
        if (dabs && k > 0 && !snow)
          for (let j = 0; j < (k === 1 ? (trim ? 2 : 3) : 1); j += 1) {
            const th = -1.57 + sx * (0.25 + j * 0.42 + cr() * 0.2)
            dl += dab(cx + Math.cos(th) * rx * 0.8, cy + Math.sin(th) * ry * 0.78 + 6)
          }
        if (dabs && k === 2 && trim < 2) dd += dab(cx - sx * rx * (0.1 + cr() * 0.3), cy + ry * (0.35 + cr() * 0.25))
      }
    }
    rowsD.forEach((d, k) => {
      if (d) g += `<path fill="url(#cd-f${k})" d="${d}"/>`
      if (accD[k]) g += `<path fill="url(#cd-fy)" d="${accD[k]}"/>`
    })
    // lá thưa rủ dưới mép tán → mép mềm, không viền cắt
    let edge = ''
    if (!lite)
      for (let x = 3630 + cr() * 30; x < 4650; x += 44 + cr() * 46) if (trim < 3 && cr() < (dong ? 0.3 : 0.48)) edge += dab(x, ybot(x) + 4 + cr() * 16)
    const base = `<use href="#cd-sil" class="cd-bk"${dong ? ' opacity=".5"' : ''}/>`
    const rim = `<use href="#cd-sil" class="cd-rim" transform="translate(${sx < 0 ? 6 : -6} 6)"/>`
    // bụng tán tối hơn vai tán (lớp trong–ngoài)
    const belly = `<ellipse fill="url(#cd-ao)" cx="4040" cy="${dong ? 330 : 310}" rx="560" ry="105"/>`
    add(
      3600,
      4740,
      9,
      `${base}<g clip-path="url(#cd-cp)">${g}${belly}${grain ? `<path fill="url(#cd-pl)" opacity=".45" d="M3600-330h1140v700h-1140z"/>` : ''}${night && !snow ? '' : rim}${dl ? `<g class="cd-dl">${dl}</g>` : ''}${dd ? `<g class="cd-dd">${dd}</g>` : ''}${caps ? `<path style="fill:${col('w3', 80)}" opacity=".7" d="${caps}"/>` : ''}</g>${edge ? `<g class="cd-bk">${edge}</g>` : ''}`,
    )
  }

  // ═════ D. Thân đa: các múi xoắn chữ S, mỗi múi tròn khối riêng (sáng phía mặt trời), khe tối giữa múi; rêu & dương xỉ trong khe ═════
  const tHW = (t: number) => 92 + 8 * Math.sin(t * 3.1) + 116 * Math.exp(-t * 5.4)
  const yAt = (t: number, x: number) => {
    const b = BY(x) + 8
    return b - t * (b - FY)
  }
  {
    const TS = [0, 0.2, 0.42, 0.66, 0.88, 1.06]
    const cxs = (t: number) => TX + 12 * Math.sin(t * 2.4 + 0.6) - 8 * t
    const Lp: P[] = []
    const Rp: P[] = []
    for (const t of TS) {
      const hw = tHW(t) * 1.02
      Lp.push([cxs(t) - hw, yAt(t, cxs(t) - hw)])
      Rp.push([cxs(t) + hw, yAt(t, cxs(t) + hw)])
    }
    let s = `<path class="b1" d="${sc([...Lp, ...[...Rp].reverse()])}"/>`
    const band = (u: (t: number) => number, w: (t: number) => number) => {
      const A: P[] = []
      const B: P[] = []
      for (const t of TS) {
        const hw = tHW(t)
        const xa = cxs(t) + hw * (u(t) - w(t))
        const xb = cxs(t) + hw * (u(t) + w(t))
        A.push([xa, yAt(t, xa)])
        B.push([xb, yAt(t, xb)])
      }
      return { d: sc([...A, ...[...B].reverse()]), A, B }
    }
    // [u đáy, u đỉnh, nửa rộng, pha]
    const STR: [number, number, number, number][] = [[-0.86, -0.56, 0.16, 0.3], [-0.6, -0.16, 0.18, 2.2], [-0.26, 0.18, 0.19, 4.1], [0.12, 0.52, 0.18, 5.3], [0.48, 0.8, 0.16, 1.2], [0.8, 0.96, 0.1, 3.3]]
    let fis = ''
    let fil = ''
    let moss = ''
    const mr = ctx.rng('cd-reuthan')
    STR.forEach(([u0, u1, w, ph], k) => {
      const b = band(
        t => u0 + (u1 - u0) * Math.min(t, 1) + 0.13 * Math.sin(t * 5.2 + ph) * Math.min(1, t * 4),
        t => w * (1 + 0.2 * Math.sin(t * 4.4 + ph)) * (t > 1 ? 0.5 : 1),
      )
      s += `<path fill="url(#cd-k)" d="${b.d}"/>`
      // thớ vỏ: 1 nét dọc mảnh theo thớ xoắn trong mỗi múi (tương phản thấp)
      // vân vỏ XOẮN theo múi, đứt quãng (2 đoạn lệch nhau), không sọc đều
      const at = (f: number, j0: number, j1: number) => so(b.A.slice(j0, j1).map(([x, y], j) => [x + ((b.B[j + j0] as P)[0] - x) * f, y] as P))
      if (!lite) fis += at(0.3 + 0.12 * (k % 2), 0, 4)
      if (!lite && trim < 2) fis += at(0.66 - 0.1 * (k % 3), 2, 6)
      if (!lite && (sx < 0 ? k <= 2 : k >= 3)) fil += at(sx < 0 ? 0.16 : 0.84, 1, 5)
      // rêu trong khe, phía khuất nắng
      if ((sx < 0 ? k >= 3 : k <= 2) && k !== 5) {
        const e = sx < 0 ? b.A : b.B
        const j = 1 + (k % 2)
        const p = e[j] as P
        const q = e[j + 1] as P
        moss += rag((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, 7 + mr() * 4, 26 + mr() * 14, mr, 11, 0.35)
      }
    })
    if (fis) s += `<path class="cd-tx" opacity=".45" d="${fis}"/><path class="cd-bl" d="${fil}"/>`
    // rễ phụ đã quện vào thân: 3 sợi từ chạc bò xuống gốc theo thớ xoắn, mép sáng phía mặt trời
    {
      let ar = ''
      for (const [u, ph] of [[-0.5, 0.4], [0.16, 2.1], [0.62, 3.7]] as const) {
        const pts: P[] = []
        for (const t of [1, 0.74, 0.5, 0.26, 0.02]) {
          const x = cxs(t) + tHW(t) * (u + 0.12 * Math.sin(t * 6 + ph))
          pts.push([x, yAt(t, x)])
        }
        ar += so(pts)
      }
      s += `<path class="cd-ar" d="${ar}"/>`
    }
    // dải vải đỏ buộc quanh thân (tục thờ cây đa), nút & đuôi vải rủ phía khuất nắng
    {
      const t = 0.3
      const c = cxs(t)
      const hw = tHW(t) * 1.02
      const xl = c - hw
      const xr = c + hw
      const yl = yAt(t, xl)
      const yr = yAt(t, xr)
      const kx = c - sx * hw * 0.45
      const ky = (yl + yr) / 2 + 12
      s += `<path class="p1" opacity=".85" d="M${J([xl, yl])}q${J([hw, 16, xr - xl, yr - yl])}l0 9q${J([-hw, 16, xl - xr, yl - yr])}zM${J([kx, ky])}q${J([5, 20, -2, 40])}l7-2q${J([-2, -18, 1, -38])}z"/>`
    }
    const foot: P[] = []
    for (let x = TX - 150, i = 0; x <= TX + 170; x += 32, i += 1) foot.push([x, BY(x) - (i % 2 ? 4 : 10 + mr() * 14)])
    for (let x = TX + 170; x >= TX - 150; x -= 80) foot.push([x, BY(x) + 6])
    s += `<path class="m3" d="${pl(foot)}"/><path class="m2" d="${moss}"/>`
    // chất liệu rêu: chấm lông rêu sáng trên đệm rêu chân thân
    if (!lite && trim < 2) {
      const st2: [number, number, number, number, number][] = []
      for (let i = 0; i < 8; i += 1) {
        const x = TX - 140 + mr() * 300
        st2.push([x, BY(x) - 3 - mr() * 9, 3 + mr() * 3, 1.3, -1.57 + (mr() - 0.5) * 1.6])
      }
      s += `<path class="m1" opacity=".7" d="${leaves(st2)}"/>`
    }
    // hốc cây
    const hx = TX - 34
    const hy = 566
    s += `<path class="b3" opacity=".8" d="M${hx - 14} ${hy + 6}q11-42 28-4q-6 21-28 4z"/><path class="k1" d="M${hx - 10} ${hy + 4}q10-34 21-3q-5 15-21 3z"/>`
    // dương xỉ bám khe chạc (3 lá kép cong)
    if (!lite && trim < 1) {
      const fr: [number, number, number, number, number][] = []
      for (const [a0, len] of [[-2.3, 54], [-1.4, 46], [-0.6, 40]] as const) {
        for (let j = 1; j <= 4; j += 1) {
          const t = j / 5
          const a = a0 + t * 0.9
          const x = TX + 40 + Math.cos(a0) * len * t + Math.cos(a) * 4
          const y = FY + 8 + Math.sin(a0) * len * t + t * t * 18
          const lf = 9 * (1 - t * 0.6)
          fr.push([x, y, lf, 2.4, a - 1.2], [x, y, lf, 2.4, a + 1.2])
        }
      }
      s += `<path class="${dong ? 'm2' : 'l2'}" d="${leaves(fr)}"/>`
    }
    s += `<path style="fill:none;stroke:var(--b3);stroke-width:3;stroke-linecap:round" opacity=".55" d="${so((sx < 0 ? Lp : Rp).slice(0, 5).map(([x, y]) => [x - sx * 4, y] as P))}"/>`
    add(TX - 240, TX + 240, 9, s)
  }

  // ═════ E. Rễ nổi trên gò (mặt trên sáng, rêu, tuyết) + một rễ trụ đã hoá thân phụ ở trái ═════
  {
    let roots = ''
    let moss = ''
    let snowR = ''
    ROOTS.forEach((sp, i) => {
      const g = limbGeo(sp)
      roots += sc(g.shape)
      const tp = g.top.slice(0, 3)
      const inn = tp.map(([x, y], j) => {
        const q = sp[j] as Sp
        return [x + (q[0] - x) * 0.5, y + (q[1] - y) * 0.5] as P
      })
      if (i !== 0 || sx > 0) moss += pl([...tp.map(([x, y], j) => [x, y + (j % 2 ? 2 : -1)] as P), ...inn.reverse()])
      if (snow) snowR += pl([...tp.map(([x, y]) => [x, y - 2] as P), ...[...tp].reverse().map(([x, y]) => [x, y + 3] as P)])
    })
    let s = `<ellipse fill="url(#cd-ao)" cx="${TX}" cy="${R(BY(TX) + 10)}" rx="290" ry="24"/><path fill="url(#cd-kv)" d="${roots}"/><path class="m2" d="${moss}"/>`
    if (snowR) s += `<path class="w3" d="${snowR}"/>`
    // rễ trụ: 3 sợi bện nhập một, chân loe bám đất, rêu chân
    const px = 3905
    const ptop = under(LL, px) - 8
    const pyb = BY(px) + 2
    let o = ''
    for (let j = 0; j < (lite ? 2 : 3); j += 1) {
      const A: P[] = []
      const B: P[] = []
      for (const t of [0, 0.3, 0.65, 1]) {
        const y = ptop + (pyb - ptop) * t
        const cx = px + (j - 1) * 9 * Math.cos(t * 4.2 + j * 2.1) + Math.sin(t * 3 + j) * 4
        const hw = 8 + 9 * Math.exp(-t * 7) + 7 * Math.exp(-(1 - t) * 7)
        A.push([cx - hw, y])
        B.push([cx + hw, y])
      }
      o += sc([...A, ...B.reverse()])
    }
    s += `<ellipse fill="url(#cd-ao)" cx="${px}" cy="${R(pyb + 4)}" rx="50" ry="6"/><path fill="url(#cd-k)" d="${o}"/><use href="#cd-ms" x="${px + 4}" y="${R(pyb - 4)}"/>`
    add(3860, 4460, 8, s)
  }

  // ═════ F. Rèm rễ phụ dưới tán & cành trái (lắc theo nhóm), hai sợi rễ non dài gần chạm đất ═════
  {
    const CUR: [number, number, number, number][] = [
      [3862, ybot(3862) - 8, 2, 1.05],
      [3898, under(LL, 3898) - 8, 0, 0.85],
      [4075, under(LL, 4075) - 8, 1, 0.6],
      [4300, ybot(4300) - 8, 1, 0.7],
      [4384, ybot(4384) - 8, 0, 0.5],
    ]
    const groups = lite ? [[0], [3]] : [[0, 1], [2], [3, 4]]
    let s = ''
    for (const gi of groups) {
      let inner = ''
      for (const i of gi) {
        const [x, y, v, k] = CUR[i] as [number, number, number, number]
        inner += `<use href="#cd-r${v}" class="b2" transform="translate(${R(x)} ${R(y)})scale(1 ${f2(k * (dong ? 0.85 : 1))})"/>`
      }
      s += `<g class="cd-hg ${anim('cd-hg', 5.1 + (gi[0] as number) * 0.7)}">${inner}</g>`
    }
    // rễ non dài: một bên trái, một mảnh nhạt bên phải
    for (const [x, op] of lite ? [] : ([[3842, 1]] as const)) {
      const y = ybot(x) - 8
      const L = BY(x) - 22 - y
      s += `<path class="b2" opacity="${op}" d="M${J([x, y])}q${J([-6, L * 0.5, -1, L])}l1.4 0q${J([-4, -L * 0.45, 3, -L])}z"/>`
    }
    add(3830, 4480, 7, s)
  }

  // ═════ G. Xích đu dây thừng (cành trái) ═════
  {
    const hx = 3975
    const hy = R(under(LL, hx) - 4)
    const seatY = R(BY(hx) - 46)
    const L = seatY - hy
    add(
      hx - 40,
      hx + 40,
      8,
      `<g class="cd-sw ${anim('cd-sw', 4.7)}"><path class="cd-rp" d="M${hx - 21} ${hy}v${L}M${hx + 21} ${hy}v${L}"/>` +
        `<path class="b2" d="M${hx - 28} ${seatY}h56v6h-56z"/><path class="b3" d="M${hx - 28} ${seatY}h56v2h-56z"/>${snow ? `<path class="w3" d="M${hx - 28} ${seatY}q28-5 56 0z"/>` : ''}</g>` +
        `<ellipse fill="url(#cd-ao)" cx="${hx}" cy="${R(BY(hx) + 6)}" rx="40" ry="6"/>`,
    )
  }

  // ═════ H. Đèn lồng giấy (ngày lắc nhẹ; đêm đứng yên, thân sáng + quầng ấm nhỏ; Trung thu: đèn ông sao) ═════
  {
    const LAN: [Sp[], number, number, string][] = [[LL, 4040, 34, 'p1'], [LR, 4335, 40, 'p3']]
    let s = ''
    let gl = ''
    LAN.forEach(([sp, x, len, cls], i) => {
      const y = R(under(sp, x) - 2)
      const ly = y + len
      const star = trungThu && i === 0
      const body = star
        ? `<path class="p1" d="M${x} ${ly - 2}l5 10h11l-9 7 4 11-11-7-11 7 4-11-9-7h11z"/>`
        : `<use href="#cd-ln" class="${cls}" x="${x}" y="${ly}"/>`
      const inner = `<path class="z2" d="M${x} ${y}v${len}"/>${body}`
      s += night ? inner : `<g class="cd-hg ${anim('cd-hg', 3.6 + i * 0.5)}">${inner}</g>`
      if (night) gl += `<circle cx="${x}" cy="${ly + 14}" r="44" fill="url(#gw)" opacity=".8"/><ellipse class="e1" opacity=".75" cx="${x}" cy="${ly + 15}" rx="6" ry="8"/>`
    })
    add(4000, 4550, 7, s, gl)
  }

  // ═════ I. Miếu nhỏ mái cong + đèn dầu + bát hương, nép bên rễ nổi phải ═════
  {
    const y0 = SY
    let s = `<ellipse fill="url(#cd-ao)" cx="4" cy="4" rx="64" ry="10"/><path class="s3" d="M-34 14h68v-6h-68zM-40 0v-12h80v12z"/><path class="s2" d="M-30 8h60v-5h-60zM-43-12h86v-4h-86z"/>`
    s += `<use href="#cd-ms" x="-30" y="-3"/><use href="#cd-ms" x="26" y="12"/>`
    s += `<path class="w1" d="M-28-16v-42h56v42z"/><path class="w2" opacity=".6" d="M10-16v-42h18v42z"/><path class="k1" d="M-11-16v-24q0-8 11-8t11 8v24z"/><path class="p1" opacity=".75" d="M-28-16v-42h5v42zM23-16v-42h5v42z"/>`
    s += `<path class="m3" opacity=".9" d="M-28-16v-9q14-5 28 1t28-2v10z"/><path class="x2" d="M-4-24h8l-2 4h-4z"/><path class="e1" d="M0-32q3 4 0 7q-3-3 0-7z"/>`
    if (tet) s += `<path class="p1" d="M-21-55h4v30h-4zM17-55h4v30h-4z"/>`
    s += `<path class="r3" d="M-48-66q8 9 16 9h64q8 0 16-9q-10 4-20 4h-56q-10 0-20-4z"/><path class="r2" d="M-50-69q10 6 22 6h56q12 0 22-6l-20-15h-60z"/><path class="r1" d="M-30-84h60l8 6h-76z"/>`
    s += `<path class="r3" d="M-34-84q4 4 8 2h52q4 2 8-2v-4h-68z"/><circle class="r2" cy="-92" r="4"/>`
    s += `<path class="m2" d="${rag(-26, -81, 13, 3, r, 11, 0.45)}${rag(18, -70, 16, 2.6, r, 11, 0.45)}"/>`
    const nIn = ram || mung1 ? 5 : 3
    let sticks = ''
    for (let k = 0; k < nIn; k += 1) {
      const dx = (k - (nIn - 1) / 2) * 3
      sticks += `M${J([dx, -19])}l${J([dx * 0.8, -18])}`
    }
    s += `<path class="cd-in" d="${sticks}"/><path class="x1" d="M-9-20q1 8 9 8t9-8z"/>`
    if (ram || mung1 || tet) s += `<path class="p2" d="M22-16h8l-1-9h-6z"/><use href="#cd-fw" class="${tet ? 'f1' : 'f3'}" x="24" y="-24"/><use href="#cd-fw" class="${tet ? 'f1' : 'f2'}" x="28" y="-23"/>`
    if (snow) s += `<path class="w3" d="M-48-70q10 4 22 4h56q12 0 20-5l-18-12h-62z"/>`
    else if (ctx.wet > 0.05) s += `<path class="wetsheen" d="M-46-69q10 5 22 5h56q12 0 20-5l-3-2h-92z"/>`
    // đèn dầu: quầng nhỏ trong miếu + vũng sáng ấm mềm trên đất (không nét sáng nào)
    const lamp = day < 0.78 ? `<circle class="fl" cx="${SX}" cy="${R(y0 - 33)}" r="38" fill="url(#gw)"/><ellipse cx="${SX}" cy="${y0 + 12}" rx="96" ry="20" fill="url(#gw)" opacity=".45"/>` : ''
    add(SX - 70, SX + 70, 8, `<g transform="translate(${SX} ${y0})scale(1.1)">${s}</g>`, lamp)
  }

  // ═════ J. Cỏ & hoa (thưa, tương phản thấp) ═════
  {
    let s = ''
    const T: P[] = [[3880, 0], [4030, 2], [4590, 4], [4720, 2], [4900, 6], [5080, 4], [5210, 2], [5330, 6], [5010, 60], [5280, 120]]
    T.slice(0, lite ? 5 : trim > 1 ? 7 : 10).forEach(([x, dy], i) => {
      const u = `<use href="#cd-gs" x="${x}" y="${R(gy(x) + 6 + dy)}"/>`
      s += i === 3 || i === 5 || i === 7 ? `${GX}${u}</g>` : u
    })
    if (!lite && !dong && !snow) {
      const fc = S === 'xuan' ? 'f1' : S === 'ha' ? 'f2' : 'f3'
      const fr = ctx.rng('cd-hoa')
      let u = ''
      for (let i = 0; i < (thu ? 3 : 5); i += 1) {
        const x = CATX - 70 + fr() * 200
        u += `<use href="#cd-fw" x="${R(x)}" y="${R(ground(x) + 6 + fr() * 14)}"/>`
      }
      s += `<g class="${fc}">${u}</g>`
    }
    add(3860, 5420, 4, s)
  }

  // ═════ K. Lá rơi (thu nhiều, đông ít, hạ gió mạnh lác đác) ═════
  {
    const nFall = lite ? 0 : Math.min(trim > 1 ? 2 : 9, thu ? 4 : dong ? 2 : W.wind > 0.6 ? 2 : 0)
    const fr = ctx.rng('cd-laroi')
    let s = ''
    for (let i = 0; i < nFall; i += 1) {
      const x = 3950 + fr() * 700
      const y = ybot(x) + 20
      const dur = 11 + fr() * 6
      const c = `cd-a${ai}`
      ai += 1
      css += `.${c}{animation:cd-fa ${dur.toFixed(1)}s linear infinite;animation-delay:${ctx.ph(dur, c)}}`
      s += `<path class="${i % 2 ? (thu ? 'm1' : 'd1') : thu ? 'l1' : 'x1'} cd-fa ${c}" d="${leaves([[x, y, 10, 3.4, fr() * 6]])}"/>`
    }
    add(3940, 4680, 3, s)
  }

  // ═════ L. Tiền cảnh lớp 4: hai bụi cỏ tối ở góc dưới (ít chi tiết, vài lá bắt sáng) ═════
  if (!lite && trim < 3) {
    const gr = ctx.rng('cd-tien')
    const big = (x: number, y: number, h: number, lean: number, w: number) => `M${J([x - w, y])}q${J([lean * 0.4, -h * 0.6, lean + w, -h])}q${J([-lean * 0.45 + w * 0.6, h * 0.5, w - lean, h])}z`
    let a = ''
    let b = ''
    for (const [cx, n, hk] of [[5560, 8, 1.5], [7130, 5, 1.1]] as const) {
      for (let k = 0; k < n; k += 1) {
        const x = cx + (k - n / 2) * 30 + gr() * 18
        const blade = big(x, 1045, (120 + gr() * 150) * hk * (1 - Math.abs(k - n / 2) / n), (gr() - 0.45) * 90, 6 + gr() * 6)
        if (k % 3 === 1) a += blade
        else b += blade
      }
    }
    const base = `${blob(5600, 1036, 330, 72, gr, 12, 0.3)}${blob(7170, 1040, 210, 60, gr, 10, 0.3)}`
    add(5420, 7240, 2, `<path class="g4" d="${base}${b}"/><path class="g3" opacity=".8" d="${a}"/>`, '', 4)
  }

  // ═════ M. Sương lớp 2: vài dải sương mềm nằm trên cầu cạn xa → cầu đứt quãng, nhịp vòm không còn đều ═════
  if (!lite) {
    const mr = ctx.rng('cd-suong')
    let m = ''
    for (let i = 0; i < 4; i += 1) {
      const x = 1690 + i * 230 + mr() * 120
      m += `<ellipse cx="${R(x)}" cy="${R(606 + mr() * 22)}" rx="${R(150 + mr() * 100)}" ry="${R(22 + mr() * 12)}"/>`
    }
    add(1560, 2620, 3, `<g fill="url(#cd-mh)" opacity="${dong || W.fog > 0.3 ? 0.9 : 0.75}">${m}</g>`, '', 2)
  }

  // ═════ N. Mưa gần (lớp 4, chỉ hai mép khung): vệt dày & đậm hơn mưa xa của lõi → mưa có tầng ═════
  if (!lite && (W.precip === 'mua' || W.precip === 'mua-to')) {
    const rr = ctx.rng('cd-mua')
    const base: P[] = []
    for (let i = 0; i < (W.precip === 'mua-to' ? 7 : 5); i += 1) base.push([i < 3 ? 5480 + rr() * 560 : 6930 + rr() * 260, rr() * 300])
    let d = ''
    for (let k = 0; k < 5; k += 1) for (const [x, y] of base) d += `M${J([x, y - 360 + k * 300])}l-4 ${R(30 + (x % 13))}`
    css += `.cd-rn{fill:none;stroke:var(--w3);stroke-width:1.8;stroke-linecap:round;opacity:.32;animation:cd-rn .55s linear infinite}@keyframes cd-rn{to{transform:translate(0,300px)}}`
    add(5470, 7200, 3, `<path class="cd-rn" d="${d}"/>`, '', 4)
  }

  // ═════ Điểm cho diễn viên ═════
  const spots: Spot[] = [
    { kind: 'cat', layer: 3, x: CATX, y: R(ground(CATX) + 2), s: 1 },
    { kind: 'cat-shelter', layer: 3, x: TX + 150, y: R(BY(TX + 150) + 6), s: 1 },
    { kind: 'fireflies', layer: 3, x: 4300, y: 580, s: 1, w: 900 },
    { kind: 'butterflies', layer: 3, x: CATX, y: 690, s: 1, w: 320 },
    { kind: 'perch', layer: 3, x: 3800, y: R(under(LL, 3800) - 52), s: 0.9 },
    { kind: 'perch', layer: 3, x: 4400, y: R(under(LR, 4400) - 50), s: 0.9 },
    { kind: 'smoke', layer: 3, x: SX, y: R(SY - 26), s: 0.6 },
  ]
  return { pieces, spots, defs, css }
}

export const region: Region = {
  id: 'cay-da',
  name: 'Cây đa cổ thụ',
  x0: 3600,
  x1: 5400,
  shots: [{ id: 'cay-da', name: 'Cây đa cổ thụ', x: 4700, y: 470, zoom: 0.95 }],
  build,
}
