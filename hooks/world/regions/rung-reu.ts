// Vùng "Rừng rêu" (x 10800–12600). Một khoảng rừng cổ thụ nhìn như gian giữa một thánh đường: hai thân khổng lồ phủ rêu làm
// khung hai bên, vòm tán khép phía trên chừa một ô trời (thấy đảo bay xa), giữa là bức tường rừng xa tan trong sương sáng
// (ba tầng thân cây nhạt dần), tia nắng xiên mềm theo đúng phía mặt trời, nền rêu & con suối nhỏ dưới đáy.
// Câu chuyện: một BỐT ĐIỆN THOẠI đỏ bạc màu đứng dưới vòm rễ cổ thụ trái như một cái miếu, rêu nuốt chân, dây leo vắt mái,
// ống nghe vẫn lủng lẳng trên dây xoắn; con suối sinh ra dưới vòm rễ cây phải, đổ qua gờ đá; đêm về nấm phát sáng dưới các
// vòm rễ, đèn trong bốt tự sáng, đôi mắt cú thức trong hốc cây.
//
// KHỐI (rung-reu): trời sáng ở ô vòm giữa-trên (đảo bay lệch phải) · tường rừng xa trong sương = mảng sáng-vừa giữa khung ·
//   nền rêu vừa ở đáy · khung tối: vòm tán + cổ thụ trái (≤15% ngang) / phải (≤12%) + rễ & dương xỉ tối góc dưới.
//   Tiêu điểm trầm: bốt điện thoại dưới vòm rễ trái (x≈25%, y≈70%); giữa khung chỉ có sương, tia nắng và thân xa tương phản thấp.
// KHỐI (nhin-dao-bay, vùng này chỉ góp mép phải): tán cổ thụ đầu rừng rủ từ mép trên (mép gãy thành chùm lá, lỗ trời, viền
//   sáng phía nắng) + thân tối ở góc phải; mép tán không vượt x≈1260 màn hình nên không che đảo bay i1.
import { clamp, ground, lerp, smooth, type Pt } from '../util'
import type { BuildOut, Ctx, Layer, Piece, Region, Spot } from '../types'

const X0 = 10800
const X1 = 12600
const SHOT = { id: 'rung-reu', name: 'Rừng rêu', x: 11640, y: 505, zoom: 1.08 }

// ───────────────────────── số & đường gọn ─────────────────────────
const R = Math.round
const at = <T>(a: readonly T[], i: number): T => a[i] as T
const f2 = (v: number): string => {
  const r = Math.round(v * 100) / 100
  return r === 0 ? '0' : String(r).replace(/^(-?)0\./, '$1.')
}
/** Dãy số nguyên; dấu trừ làm luôn dấu ngăn. */
const J = (a: number[]): string =>
  a
    .map(v => String(R(v) || 0))
    .join(' ')
    .replace(/ -/g, '-')

/** Đường gấp khúc tương đối (số nguyên). */
function pl(p: Pt[], close = false): string {
  if (p.length < 2) return ''
  const a = at(p, 0)
  let x = R(a[0])
  let y = R(a[1])
  const out: number[] = []
  for (let i = 1; i < p.length; i += 1) {
    const c = at(p, i)
    const cx = R(c[0])
    const cy = R(c[1])
    if (cx === x && cy === y) continue
    out.push(cx - x, cy - y)
    x = cx
    y = cy
  }
  return `M${J([R(a[0]), R(a[1])])}l${J(out)}${close ? 'z' : ''}`
}
/** Đường cong kín mượt (Q qua trung điểm), toạ độ tương đối. */
function cz(p: Pt[]): string {
  const n = p.length
  const q = (i: number) => at(p, ((i % n) + n) % n)
  const mid = (i: number): Pt => [(q(i)[0] + q(i + 1)[0]) / 2, (q(i)[1] + q(i + 1)[1]) / 2]
  const s = mid(n - 1)
  let x = R(s[0])
  let y = R(s[1])
  const out: number[] = []
  for (let i = 0; i < n; i += 1) {
    const c = q(i)
    const e = mid(i)
    out.push(R(c[0]) - x, R(c[1]) - y, R(e[0]) - x, R(e[1]) - y)
    x = R(e[0])
    y = R(e[1])
  }
  return `M${J([R(s[0]), R(s[1])])}q${J(out)}z`
}
/** Đường cong hở mượt qua các điểm, toạ độ tương đối. */
function co(p: Pt[]): string {
  if (p.length < 3) return pl(p)
  const a = at(p, 0)
  let x = R(a[0])
  let y = R(a[1])
  const out: number[] = []
  for (let i = 1; i < p.length - 1; i += 1) {
    const c = at(p, i)
    const nx = at(p, i + 1)
    const e: Pt = i < p.length - 2 ? [(c[0] + nx[0]) / 2, (c[1] + nx[1]) / 2] : nx
    out.push(R(c[0]) - x, R(c[1]) - y, R(e[0]) - x, R(e[1]) - y)
    x = R(e[0])
    y = R(e[1])
  }
  return `M${J([R(a[0]), R(a[1])])}q${J(out)}`
}
/** Điểm i của đường tâm + pháp tuyến đơn vị hướng LÊN. */
function nrm(c: Pt[], i: number): [number, number, number, number] {
  const p = at(c, i)
  const a = at(c, Math.max(0, i - 1))
  const b = at(c, Math.min(c.length - 1, i + 1))
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  let nx = (b[1] - a[1]) / l
  let ny = -(b[0] - a[0]) / l
  if (ny > 0) {
    nx = -nx
    ny = -ny
  }
  return [p[0], p[1], nx, ny]
}
/** Ống thon dọc đường tâm (rễ, suối): đa giác kín. `shift` dời lên (+)/xuống (−) theo nửa bề rộng. */
function snake(c: Pt[], w: (t: number) => number, shift = 0): Pt[] {
  const A: Pt[] = []
  const B: Pt[] = []
  c.forEach((_, i) => {
    const [px, py, nx, ny] = nrm(c, i)
    const hw = w(i / (c.length - 1)) / 2
    const ox = px + nx * hw * shift
    const oy = py + ny * hw * shift
    A.push([ox + nx * hw, oy + ny * hw])
    B.push([ox - nx * hw, oy - ny * hw])
  })
  return [...A, ...B.reverse()]
}
/** Đường song song với đường tâm, lệch k·nửa bề rộng (k>0 phía trên). */
const offs = (c: Pt[], w: (t: number) => number, k: number): Pt[] =>
  c.map((_, i) => {
    const [px, py, nx, ny] = nrm(c, i)
    const hw = (w(i / (c.length - 1)) / 2) * k
    return [px + nx * hw, py + ny * hw] as Pt
  })
/** matrix() gọn: dịch, co giãn (s âm = lật), xoay độ. */
const mx = (x: number, y: number, s = 1, sy = Math.abs(s), deg = 0): string => {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const n = Math.sin(a)
  return `matrix(${[s * c, s * n, -sy * n, sy * c].map(f2).join(' ')} ${R(x)} ${R(y)})`
}
const use = (id: string, x: number, y: number, s = 1, sy = Math.abs(s), deg = 0, extra = '') =>
  s === 1 && sy === 1 && deg === 0 ? `<use href="#rr-${id}" x="${R(x)}" y="${R(y)}"${extra}/>` : `<use href="#rr-${id}" transform="${mx(x, y, s, sy, deg)}"${extra}/>`
/** Chấm tròn (nét đầu tròn, dài 0). */
const dots = (p: Pt[]) => {
  let d = ''
  let x = 0
  let y = 0
  p.forEach(([a, b], i) => {
    d += i ? `m${J([R(a) - x, R(b) - y])}h0` : `M${J([R(a), R(b)])}h0`
    x = R(a)
    y = R(b)
  })
  return d
}
/** Trộn hai biến màu của bảng màu (k% màu a). */
const cm = (a: string, b: string, k: number) => `color-mix(in oklab,var(--${a}) ${R(k)}%,var(--${b}))`

/** Làm tròn góc đường gấp khúc (Chaikin). */
function chaikin(p: Pt[], n = 2): Pt[] {
  let q = p
  for (let k = 0; k < n; k += 1) {
    const o: Pt[] = [at(q, 0)]
    for (let i = 0; i < q.length - 1; i += 1) {
      const a = at(q, i)
      const b = at(q, i + 1)
      o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75])
    }
    o.push(at(q, q.length - 1))
    q = o
  }
  return q
}
/** Lấy điểm cách đều theo chiều dài cung. */
function resample(p: Pt[], step: number): Pt[] {
  const out: Pt[] = [at(p, 0)]
  let carry = 0
  for (let i = 0; i < p.length - 1; i += 1) {
    const a = at(p, i)
    const b = at(p, i + 1)
    const L = Math.hypot(b[0] - a[0], b[1] - a[1])
    let d = step - carry
    while (d <= L) {
      out.push([a[0] + ((b[0] - a[0]) * d) / L, a[1] + ((b[1] - a[1]) * d) / L])
      d += step
    }
    carry = L - (d - step)
  }
  out.push(at(p, p.length - 1))
  return out
}
/**
 * Mép tán bằng CHÙM LÁ phân cấp: chùm (1–3 bướu con cong bậc hai, khe giữa bướu con nông) nối nhau bằng khe sâu; cộng
 * thêm độ rủ lớn `big` (chùm rủ thấp). Đường cong q (4 số/bướu) — rẻ hơn và tròn mép hơn gấp khúc. Đoạn nằm trên mọi
 * khung (y < −260) vẽ thẳng. Trả path (mở, tương đối) + mẫu mép (điểm, pháp tuyến ngoài) để đặt lỗ trời & chấm lá.
 */
function leafPath(base: Pt[], amp: (p: Pt, s: number) => number, r: () => number, big: (s: number, p: Pt) => number): { d: string; pts: Pt[]; sm: [number, number, number, number][] } {
  const p = resample(chaikin(base), 4)
  const N = p.length
  const ix = (s: number) => clamp(Math.round(s / 4), 0, N - 1)
  const nAt = (i: number): Pt => {
    const a = at(p, Math.max(0, i - 3))
    const b = at(p, Math.min(N - 1, i + 3))
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]
  }
  const off = (s: number, o: number): Pt => {
    const i = ix(s)
    const c = at(p, i)
    const [nx, ny] = nAt(i)
    const O = o + big(s, c)
    return [c[0] + nx * O, c[1] + ny * O]
  }
  const total = (N - 1) * 4
  const st = off(0, 0)
  let cur: Pt = [R(st[0]), R(st[1])]
  const pts: Pt[] = [cur]
  const sm: [number, number, number, number][] = []
  let out = `M${J(cur)}`
  let cmd = ''
  let buf: number[] = []
  const go = (k: string, v: number[]) => {
    if (k !== cmd) {
      if (buf.length) out += cmd + J(buf)
      buf = []
      cmd = k
    }
    buf.push(...v)
  }
  let s = 0
  while (s < total - 1) {
    const c0 = at(p, ix(s))
    if (c0[1] < (c0[0] < 11100 ? -240 : -110)) {
      // ngoài mọi khung (nhin-dao-bay thấy tới y≈−215 ở đầu trái): đi thẳng, bước lớn
      const e = off(Math.min(total, s + 120), 0)
      go('l', [R(e[0]) - cur[0], R(e[1]) - cur[1]])
      cur = [R(e[0]), R(e[1])]
      pts.push(cur)
      s += 120
      continue
    }
    const A = amp(c0, s)
    const lobeW = A * (1.8 + r() * 2.5)
    const D = A * (0.3 + r() * 0.9)
    const nSub = 1 + Math.floor(r() * 3)
    const [nx, ny] = nAt(ix(s))
    sm.push([cur[0], cur[1], nx, ny])
    const s0 = s
    for (let k = 0; k < nSub; k += 1) {
      const ws = Math.min((lobeW / nSub) * (0.7 + r() * 0.6), total - s)
      if (ws < 2) break
      const b = s + ws
      const endO = k === nSub - 1 ? r() * A * 0.1 : D * (0.12 + r() * 0.3)
      const pk = off(s + ws * (0.4 + r() * 0.2), D * (0.78 + r() * 0.3) + (r() < 0.2 ? A * 0.25 : 0))
      const e = off(b, endO)
      const cx = 2 * pk[0] - (cur[0] + e[0]) / 2
      const cy = 2 * pk[1] - (cur[1] + e[1]) / 2
      const ex = R(e[0])
      const ey = R(e[1])
      go('q', [R(cx) - cur[0], R(cy) - cur[1], ex - cur[0], ey - cur[1]])
      cur = [ex, ey]
      pts.push(pk, cur)
      s = b
    }
    if (s === s0) s = total
  }
  if (buf.length) out += cmd + J(buf)
  return { d: out, pts, sm }
}

/** Vòng kín méo (đá, chùm lá rủ, lỗ trời). */
function blobPts(cx: number, cy: number, rx: number, ry: number, r: () => number, n = 8, rough = 0.22): Pt[] {
  const ph = r() * 6.283
  const a1 = r() * rough
  const out: Pt[] = []
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * 6.283
    const k = 1 + a1 * Math.sin(2 * a + ph) + (r() - 0.5) * rough
    out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return out
}

/** Mép dưới vòm tán (đường gốc, chưa có chùm lá). Hai đầu vươn lên quá mép trên của MỌI cảnh (y < −300) → không có cạnh dọc. */
const CANB: Pt[] = [
  [10630, -440], [10642, -300], [10672, -160], [10716, -10], [10772, 140], [10836, 262], [10906, 352], [10990, 404], [11086, 430],
  [11180, 430], [11260, 404], [11316, 340], [11370, 262], [11420, 186], [11480, 120], [11550, 70], [11640, 56], [11730, 34],
  [11820, 24], [11910, 32], [12000, 50], [12090, 76], [12180, 108], [12270, 138], [12350, 156], [12430, 154],
  [12505, 120], [12570, 58], [12622, -40], [12658, -180], [12680, -320], [12690, -440],
]
const T1X = 10970
const T2X = 12392

// ───────────────────────── thư viện hình (defs) ─────────────────────────
function makeDefs(ctx: Ctx, sd: number, low: number, HZ: string, G: string, GD: string): string {
  const r = ctx.rng('rr-defs')
  // c rỗng → điểm dừng lấy currentColor (màu đặt MỘT lần trên gradient qua style="color:…"; luật CSS [id^=rr-] stop)
  const stop = (o: number, c: string, a = 1) => `<stop offset="${f2(o)}"${c ? ` style="stop-color:${c}"` : ''}${a < 1 ? ` stop-opacity="${f2(a)}"` : ''}/>`
  const lg = (id: string, attrs: string, stops: string, col = '') => `<linearGradient id="rr-${id}"${attrs}${col ? ` style="color:${col}"` : ''}>${stops}</linearGradient>`
  const rg = (id: string, col: string, stops: string) => `<radialGradient id="rr-${id}" style="color:${col}">${stops}</radialGradient>`
  // mặt trời trái (sd<0): sáng 1/5 trái → thân → bóng → tối sâu phía phải; chiều thì lật
  const side = (st: [number, string][]) => (sd < 0 ? st : st.map(([o, c]) => [f2(1 - o), c] as [number | string, string]).reverse()).map(([o, c]) => stop(Number(o), c)).join('')
  const tg = side([
    [0.16, cm('b3', 'm2', 58)],
    [0.4, cm('b2', 'm3', 55)],
    [0.68, cm('m3', 'k1', 60)],
    [0.88, cm('k1', 'm3', 58)],
  ])
  const sk = side([
    [0.2, 'var(--m2)'],
    [0.5, cm('m2', 'm3', 45)],
    [0.85, cm('m3', 'k1', 70)],
  ])
  // lá dương xỉ kép: sống cong, lá chét hẹp so le, dài nhất ở 1/3 dưới, ngắn dần tới ngọn
  const P = (t: number): Pt => [34 * t * t, -100 * t + 8 * t * t]
  const f1 = (v: number) => f2(Math.round(v * 10) / 10)
  const J1 = (a: number[]) => a.map(f1).join(' ').replace(/ -/g, '-')
  // sống: đúng đường cong bậc 2 của P (điểm điều khiển (0,-50)), thon dần về ngọn
  let fd = 'M-2.4 0Q-1.2-50 34-92Q1.2-50 2.4 0z'
  const N = 9
  for (let i = 1; i <= N; i += 1) {
    for (const s of [-1, 1]) {
      const t = (i - (s > 0 ? 0.5 : 0)) / (N + 1)
      const [x, y] = P(t)
      const [x2, y2] = P(t + 0.01)
      const tl = Math.hypot(x2 - x, y2 - y)
      const ux = (x2 - x) / tl
      const uy = (y2 - y) / tl
      const len = 25 * Math.sin(Math.PI * (0.12 + 0.88 * t)) * (1 - 0.3 * t) + 2
      const w = 2.6 * (1 - t * 0.5)
      // lá chét: mọc vuông góc rồi cong dần về phía ngọn (gân giữa là đường cong bậc 2), hai mép phình nhẹ
      const px = -uy * s
      const py = ux * s
      const mX = x + px * len * 0.62
      const mY = y + py * len * 0.62
      const tX = x + px * len + ux * len * 0.5
      const tY = y + py * len + uy * len * 0.5
      const b1: Pt = [x - ux * w, y - uy * w]
      fd += `M${f1(b1[0])} ${f1(b1[1])}q${J1([mX - ux * w * 1.5 - b1[0], mY - uy * w * 1.5 - b1[1], tX - b1[0], tY - b1[1]])}q${J([mX + ux * w * 1.2 - tX, mY + uy * w * 1.2 - tY, x + ux * w - tX, y + uy * w - tY])}z`
    }
  }
  // vân vỏ: rãnh ngắn dọc, lệch hàng, dài ngắn khác nhau trên ô rộng (lặp không lộ thành mã vạch)
  let bark = ''
  {
    // rãnh vỏ dài, cong nhẹ, có chạc rẽ ngắn — đọc thành thớ vỏ xoắn, không thành mã vạch
    const g = ctx.rng('rr-bark2')
    for (let i = 0; i < 6; i += 1) {
      const l = 36 + g() * 80
      const x = R(((i + 0.2 + g() * 0.6) * 64) / 6)
      const y = R(g() * (156 - l))
      const b = (g() - 0.5) * 9
      bark += `M${x} ${y}q${J([b, l / 2, b * 0.3, l])}`
      if (g() < 0.6) bark += `M${R(x + b * 0.5)} ${R(y + l * (0.3 + g() * 0.4))}l${J([(g() - 0.5) * 10, 10 + g() * 12])}`
    }
  }
  // vân "vẽ tay" (thay lưới chấm đều): ô 160×112 xoay lệch trục, mảng lá = mũ cong dẹt sáng cỡ 12–64 chồng nhau (độ đục thấp → loang như nét cọ),
  // rải theo cụm (2–4 nét chồng nhau quanh một tâm, thưa–dày không đều), nét dẹt dài cong lệch → đọc thành nét cọ lá, không thành chấm bi
  let grain = ''
  {
    const g = ctx.rng('rr-grain2')
    for (let c = 0; c < 4; c += 1) {
      const cx = g() * 160
      const cy = g() * 112
      const n = 2 + Math.floor(g() * 3)
      for (let i = 0; i < n; i += 1) {
        const w = 12 + g() ** 1.2 * 52
        const x = R(cx + (g() - 0.5) * 50)
        const y = R(cy + (g() - 0.5) * 30)
        const h = w * (0.12 + g() * 0.2)
        const t = (g() - 0.5) * w * 0.6
        grain += `M${x} ${y}q${J([w * (0.3 + g() * 0.4), -h * 2 + t / 2, w, t])}q${J([-w / 2, t / 2 - h * 0.6, -w, -t])}z`
      }
    }
  }
  const fr = (s: number, deg: number, flip = false, x = 0) => `<use href="#rr-fd" transform="${mx(x, 0, flip ? -s : s, s, deg)}"/>`
  // đá: khối sứt mẻ đáy phẳng, mặt trên sáng, nắp rêu lệch về phía khuất (lật theo nắng ở chỗ dùng)
  const sp = blobPts(0, -11, 22, 12, r, 9, 0.3).map(([x, y]) => [x, Math.min(y, 1)] as Pt)
  const hm = (c: string, k: number) => `color-mix(in oklab,${HZ} ${k}%,var(--${c}))`
  const k1 = 'var(--k1)'
  return (
    lg('tg', '', tg) +
    lg('sk', '', sk) +
    // tường sương xa: ngọn tan lên trời từ y≈90 (đảo bay & đồi lõi chìm dần vào sương, không có chân trời cứng)
    lg('wl', ' gradientUnits="userSpaceOnUse" x2="0" y1="90" y2="800"', stop(0, '', 0) + stop(0.22, '', 0.55) + stop(0.45, '', 0.9) + stop(0.7, hm('l3', 84)) + stop(1, HZ), hm('l3', 75)) +
    lg('tb', ' x2="0" y2="1"', stop(0, '', 0) + stop(0.4, '') + stop(0.85, hm('b1', 75)) + stop(1, '', 0.6), hm('b1', 80)) +
    lg('mg', ' x2="0" y2="1"', stop(0, '', 0) + stop(0.5, '', 0.85) + stop(1, '', 0), HZ) +
    lg('fg', ' gradientUnits="userSpaceOnUse" x2="0" y1="752" y2="980"', stop(0, `color-mix(in oklab,${G} 45%,${HZ})`) + stop(0.25, `color-mix(in oklab,${G} 76%,${HZ})`) + stop(0.55, G) + stop(1, GD)) +
    // khối mềm: thân cây (tối dưới tán & ở chân), gò rêu (đỉnh sáng, chân tối), bóng tiếp xúc tròn mềm, đá (sáng trên → tối dưới)
    lg('tv', ' x2="0" y2="1"', stop(0, '', 0.5) + stop(0.38, '', 0) + stop(0.78, '', 0) + stop(1, '', 0.32), k1) +
    lg('cu', ' x2="0" y2="1"', stop(0, 'var(--m1)', 0.75) + stop(0.3, 'var(--m1)', 0) + stop(0.58, '', 0.3) + stop(1, '', 0), k1) +
    rg('lg', cm('m1', 'e2', 40), stop(0, '', 0.75) + stop(1, '', 0)) +
    lg('sg', ' x2="0" y2="1"', stop(0.1, 'var(--s2)') + stop(1, 'var(--s4)')) +
    // tán: phần cao (mỏng, nắng lọt) sáng & ngả sương, chùm rủ thấp tối dần — phá "tấm" phẳng
    lg('cv', ' gradientUnits="userSpaceOnUse" x2="0" y1="-220" y2="330"', stop(0, '', 0.5) + stop(0.5, '', 0.12) + stop(1, '', 0), hm('l3', 45)) +
    lg('cf', ' gradientUnits="userSpaceOnUse" x2="0" y1="20" y2="420"', stop(0, '', 0) + stop(1, '', 0.62), HZ) +
    rg('hv', ctx.daylight < 0.3 ? `color-mix(in oklab,var(--s2) 40%,${HZ})` : `color-mix(in oklab,var(--e2) 22%,${HZ})`, stop(0.15, '', 0.72) + stop(1, '', 0)) + rg('ag', k1, stop(0.25, '', 0.55) + stop(1, '', 0)) +
    // gò rêu (đơn vị rx 100 · ry 20): khối mềm + túm cỏ mảnh ở mép trên (nét không co giãn theo phép biến hình)
    `<g id="rr-cs"><path fill="url(#rr-cu)" d="${cz([...[-100, -72, -44, -14, 18, 46, 74, 100].map((x, i) => [x, (i % 7 ? -15 * Math.sin((Math.PI * (x + 100)) / 200) ** 0.6 : 0) - (i % 2) * 5 * r()] as Pt), [96, 14], [-96, 14]])}"/><path class="rr-tu" vector-effect="non-scaling-stroke" d="${[-62, -30, 4, 38, 66]
      .map((x, i) => `M${J([x, 2 - 15 * Math.sin((Math.PI * (x + 100)) / 200) ** 0.6])}l${J([-3 - (i % 2), -8 - (i % 3) * 2])}m${J([4 + (i % 2), 8 + (i % 3) * 2])}l${J([1, -11])}m${J([0, 11])}l${J([4, -7])}`)
      .join('')}"/></g>` +
    `<pattern id="rr-tx" width="160" height="112" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)"><path class="rr-px" d="${grain}"/></pattern>` +
    `<pattern id="rr-tk" width="64" height="160" patternUnits="userSpaceOnUse"><path class="rr-pk" d="${bark}"/></pattern>` +
    lg('ry', ' x2="0" y2="1"', [0, 0.18, 0.7, 1].map((o, i) => stop(o, '', at([0, 0.62, 0.26, 0.03], i))).join(''), low > 0.05 ? cm('e2', 'e1', 100 - low * 50) : 'var(--e2)') +
    lg('mr', ' x2="0" y2="1"', stop(0, '', 0) + stop(0.3, '', 0.32) + stop(1, '', 0), 'var(--e3)') +
    lg('bg', ' x2="0" y2="1"', stop(0, '', 0.92) + stop(0.5, '', 0.5) + stop(1, '', 0.14), 'var(--e2)') +
    // mép vùng: mặt nạ alpha mờ dần hai đầu (nền rêu, tuyết) để rừng tan vào đồng cỏ của lõi, không lộ đường cắt dọc
    lg('eg', ' gradientUnits="userSpaceOnUse" x1="10700" x2="12700"', `<stop offset="0" stop-opacity="0"/><stop offset=".12"/><stop offset=".88"/><stop offset="1" stop-opacity="0"/>`) +
    `<mask id="rr-ek" maskUnits="userSpaceOnUse" x="10600" y="-500" width="2200" height="2000" style="mask-type:alpha"><rect x="10600" y="-500" width="2200" height="2000" fill="url(#rr-eg)"/></mask>` +
    `<path id="rr-fd" d="${fd}"/>` +
    `<g id="rr-fn">${fr(0.62, -62, true, -4)}${fr(0.8, -32, true)}${fr(1, -6)}${fr(0.9, 22)}${fr(0.66, 50, false, 5)}</g>` +
    `<g id="rr-st"><ellipse fill="url(#rr-ag)" cx="3" cy="1" rx="30" ry="7"/><path fill="url(#rr-sg)" d="${cz(sp)}"/><path class="s2" d="${cz(blobPts(-6, -14, 13, 6, r, 7, 0.3))}"/>` +
    `<path class="sh" d="${cz(blobPts(9, -5, 12, 6, r, 7))}"/><path class="m2" d="${cz(blobPts(8, -19, 12, 4, r, 7, 0.4))}"/><path class="wetsheen" d="${cz(blobPts(-6, -16, 10, 3, r, 6))}"/></g>` +
    `<g id="rr-mu"><path class="rr-ms" d="M-1 0l1-12h2l1 12zM8 0v-7h2v7zM-9 0l1-6h2v6z"/><path class="rr-mc" d="M-6-11q7-11 14 0zM5-6q4-7 9 0zM-12-5q4-6 9 0z"/></g>`
  )
}

// ───────────────────────── dựng vùng ─────────────────────────
type It = { L: Layer; z: number; x0: number; x1: number; p: number; s: string; g: string }

function build(ctx: Ctx): BuildOut {
  const lite = ctx.detail === 'lite'
  const S = ctx.season
  const W = ctx.cur
  const hr = ctx.vn.hourF
  const day = ctx.daylight
  const rain = W.precip === 'mua' || W.precip === 'mua-to' || W.precip === 'phun'
  const snow = W.precip === 'tuyet'
  const clear = W.cloud === 'quang' || W.cloud === 'it'
  const xuan = S === 'xuan'
  const ha = S === 'ha'
  const thu = S === 'thu'
  const dong = S === 'dong'
  // MỘT nguồn sáng: sáng mặt trời bên trái (đông), chiều bên phải (tây); nắng thấp → ấm, tia nằm hơn
  const sd = hr < 12.5 ? -1 : 1
  const low = Math.max(smooth(15.6, 17.6, hr), 1 - smooth(6.2, 8.2, hr))
  // tia nắng: độ đậm nhóm ngoài làm tròn 2 số lẻ — dưới .01 thì KHÔNG vẽ (tránh <g opacity="0"> chứa hoạt ảnh)
  const rayK0 = day > 0.4 && clear && !rain && !snow ? clamp((day - 0.4) * 3, 0, 1) * (W.cloud === 'quang' ? 1 : 0.85) : 0
  const rayO = Math.round(rayK0 * (xuan ? 30 : 36)) / 100
  const rayK = rayO >= 0.01 ? rayK0 : 0
  const moonK = day < 0.25 && clear && !rain && !snow ? clamp(1 - Math.abs(ctx.moonPhase - 0.5) * 4, 0, 1) : 0
  const rimK = day > 0.4 && !rain ? (clear ? 0.6 : 0.25) * (1 + low * 0.4) : 0
  const glowOn = day < 0.95
  const frost = dong && (hr < 9.5 || hr > 18)
  const mistK = clamp(0.5 + W.fog * 0.45 + (xuan ? 0.16 : 0) + (hr < 9 ? 0.12 : 0) + (rain ? 0.1 : 0), 0, 1)
  const gy = (x: number) => ground(x)
  const rnd = (key: string) => ctx.rng(`rr-${key}`)
  const nz = ctx.noise('rr-n')
  const op = (o: number) => ` opacity="${f2(o)}"`
  // màu sương: mưa → xám lục lạnh (bỏ ánh hồng của haze chiều); nền rêu theo mùa (thu vàng rơm/nâu ấm, đông xám bạc)
  const HZ = rain ? 'color-mix(in oklab,var(--haze) 58%,var(--m3))' : 'var(--haze)'
  const ch = (c: string, k: number) => `color-mix(in oklab,var(--${c}) ${k}%,${HZ})`
  const G = thu ? cm('l1', 'd1', 50) : dong ? cm('m2', 's2', 70) : 'var(--m2)'
  const GD = thu ? cm('d2', 'k1', 62) : cm('m3', 'k1', 56)
  const its: It[] = []
  const add = (z: number, x0: number, x1: number, p: number, s: string, g = '', L: Layer = 3) => {
    if (s || (glowOn && g)) its.push({ L, z, x0: R(x0), x1: R(x1), p, s, g: glowOn ? g : '' })
  }
  // chuyển động riêng: lớp CSS (pha liền mạch), đếm ≤ 25; keyframes chỉ in khi có dùng
  const cssX: string[] = []
  const kf = new Set<string>()
  let anim = 0
  const can = (n = 1) => anim + n <= 25
  const ani = (k: string, rule: string, period: number, key: string): string => {
    anim += 1
    kf.add(k)
    const c = `rr-a${anim}`
    cssX.push(`.${c}{animation:rr-${k} ${rule};animation-delay:${ctx.ph(period, `rr-${key}`)}}`)
    return c
  }
  const mv = (key: string, fx: number, fy: number, d: number) => {
    const c = ani('mv', `${f2(d)}s linear infinite`, d, key)
    cssX.push(`.${c}{--fx:${R(fx)}px;--fy:${R(fy)}px}`)
    return c
  }

  // ── 1. Chiều sâu: tường sương xa (che đồi & cầu cạn của lõi; ngọn tan dần lên trời, không có chân trời cứng),
  //       3 tầng thân nhạt dần (C mờ nhất, B ngọn tan trong sáng, A sát hai cổ thụ), 2 dải sương ──
  const band = (x0: number, x1: number, y: number, step: number) => {
    const p: Pt[] = []
    for (let x = x0; x <= x1 + 1; x += step) {
      const u = (x - x0) / (x1 - x0)
      p.push([x, lerp(y, 800, 1 - Math.sqrt(Math.sin(Math.PI * clamp(u, 0, 1)))) + nz(x / 90, 4.2) * 26])
    }
    return pl([...p, [x1, 806], [x0, 806]], true)
  }
  {
    const r = rnd('far')
    const top: Pt[] = []
    for (let x = 12320; x >= 11100; x -= lite ? 240 : 120) top.push([x, 105 + nz(x / 260, 7.1) * 60])
    add(1, 11090, 12330, 6, `<path fill="url(#rr-wl)" d="${co([...top, [11100, 105]])}L11100 800L12320 800z"/>`)
    // thân xa: ngọn mảnh tan vào sương, thon dần, gốc loe thành bạnh (2 nấc); tô gradient dọc (ngọn trong suốt → thân → chân)
    const ft = (x: number, w: number, y0: number, lean: number) => {
      const y1 = gy(x) + 4
      const ym = lerp(y0, y1, 0.55)
      return pl(
        [
          [x + lean - w * 0.22, y0],
          [x + lean * 0.45 - w * 0.52, ym],
          [x - w * 0.92, y1 - 64],
          [x - w * 1.35, y1 - 20],
          [x - w * 2.6, y1],
          [x + w * 2.3, y1],
          [x + w * 1.3, y1 - 22],
          [x + w * 0.92, y1 - 64],
          [x + lean * 0.45 + w * 0.52, ym],
          [x + lean + w * 0.22, y0],
        ],
        true,
      )
    }
    // tầng C (xa nhất, gần như tan): nhóm đôi & lẻ, khoảng cách không đều
    const tc: [number, number, number][] = [
      [11318, 6, -8],
      [11868, 5, 9],
      [11934, 4, -12],
    ]
    add(1.1, 11300, 12250, 5, `<path fill="url(#rr-tb)"${op(0.3)} d="${(lite ? tc.filter((_, i) => i % 2) : tc).map(([x, w, l]) => ft(x, w, 250, l)).join('')}"/>`)
    add(1.2, 11120, 12300, 5, `<path fill="url(#rr-mg)"${op(mistK)} d="${band(11120, 12300, 590, lite ? 120 : 70)}"/>`)
    // tầng B: mỗi thân một độ mờ (xa–gần lẫn lộn), hai thân có chạc cành
    const tb: [number, number, number, number][] = [
      [11474, 14, -20, 0.62],
      [11990, 17, -12, 0.74],
      [11712, 10, 24, 0.42],
    ]
    let s = ''
    let br = ''
    ;(lite ? tb.slice(0, 2) : tb).forEach(([x, w, l, o], i) => {
      s += `<path fill="url(#rr-tb)"${op(o)} d="${ft(x, w, 130, l)}"/>`
      if (i < 2 && !lite) {
        const y = 290 + r() * 90
        const k = l > 0 ? 1 : -1
        br += `M${R(x + l * 0.7)} ${R(y)}q${J([k * 10, -20, k * (26 + r() * 18), -(44 + r() * 26)])}`
      }
    })
    add(1.3, 11430, 12130, 5, s + (br ? `<path class="rr-tw" style="stroke:${ch('b1', 20)};stroke-width:4;opacity:.6" d="${br}"/>` : ''))
    // màn sương mỏng trước đảo bay (tầng giữa) → đảo lùi xa, giữa khung không có tiêu điểm tương phản
    add(1.5, 11560, 12190, 4, `<ellipse fill="url(#rr-hv)" cx="11872" cy="240" rx="320" ry="220"/>`)
    // màn sương xa sáng hơn một nấc (đêm: lam xám ánh trăng) phủ ngọn tầng C — tách tầng xa khỏi tầng giữa, không thêm vật
    add(1.15, 11100, 12340, 4, `<ellipse fill="url(#rr-hv)"${op(day < 0.3 ? 0.7 : 0.18 + mistK * 0.2)} cx="11720" cy="380" rx="620" ry="170"/>`)
    add(1.4, 11150, 11280, 6, `<path class="rr-t1" d="${ft(11212, 25, 360, -8)}"/>`)
  }

  let moundS = ''
  // ── 2. Nền rừng: thảm rêu (gradient sương xa → rêu → tối gần), vũng nắng, chấm rêu tương phản thấp, lá rụng ──
  {
    const r = rnd('floor')
    const top: Pt[] = []
    for (let x = 10700; x <= 12700; x += lite ? 90 : 60) top.push([x, gy(x) - 3 + nz(x / 40, 3.3) * 7])
    // vân rêu: mẫu chấm tĩnh tương phản thấp phủ cả thảm (rẻ hơn rải chấm từng cái)
    add(2, 10700, 12700, 9, `<g mask="url(#rr-ek)"><g fill="url(#rr-fg)"><path id="rr-fl" d="${pl([...top, [12700, 1110], [10700, 1110]], true)}"/></g>${lite ? '' : `<use href="#rr-fl" fill="url(#rr-tx)" opacity="${dong ? '.14' : '.22'}"/>`}</g>`)
    add(2.2, 11230, 12160, 4, `<path fill="url(#rr-mg)"${op(mistK * 0.7)} d="${band(11230, 12160, 712, lite ? 140 : 80)}"/>`)
    // gò rêu: mảng giá trị lớn mềm (đỉnh sáng, chân tối — gradient), dồn hai bên & đáy; giữa cột chat chỉ có gò thấp, rộng,
    // mờ. Mép trên gò có túm cỏ mềm. Không phải vật mới: là nhịp sáng–tối của chính thảm rêu.
    let s = ''
    const cu: [number, number, number, number][] = [
      [10900, 900, 240, 34],
      [11190, 958, 260, 40],
      [11520, 988, 240, 30],
      [11910, 978, 230, 32],
      [12240, 935, 260, 40],
      [12520, 885, 200, 30],
      [11660, 884, 280, 18],
    ]
    ;(lite ? cu.slice(0, 4) : cu).forEach(([x, y, rx, ry], i) => {
      s += `<use href="#rr-cs" transform="${mx(x, y, (i % 2 ? -rx : rx) / 100, ry / 20)}"${i === 6 ? op(0.5) : ''}/>`
    })
    // vũng bóng mềm dưới hai mép tán (tiền cảnh): nhịp giá trị tối–vừa trên thảm rêu, giữa khung không đụng
    for (const [x, y, rx, ry] of lite ? [[11000, 985, 400, 70]] : [[11000, 985, 400, 70], [12320, 995, 360, 64]])
      s += `<ellipse fill="url(#rr-ag)" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" opacity=".9"/>`
    // vũng nắng lốm đốm dưới tán (chỉ khi nắng): cụm elip dẹt hai bên & nơi tia chạm đất, giữa khung rất nhạt
    if (rayK > 0 || (day > 0.55 && clear && !rain)) {
      const c = sd < 0 ? [11420, 11070] : [12110, 12340]
      const k = 0.55 + rayK * 0.45
      for (const cx of c)
        for (let j = 0; j < 1; j += 1) {
          const y = 850 + r() * 125
          const w = (50 + r() * 70) * (0.7 + (y - 780) / 300)
          s += `<ellipse fill="url(#rr-lg)" cx="${R(cx + (r() - 0.5) * 200)}" cy="${R(y)}" rx="${R(w)}" ry="${R(w * 0.2 + 3)}"${op(k)}/>`
        }
    }
    if (thu || dong) {
      const lt: Pt[] = []
      for (let i = 0; i < (lite ? 4 : 6); i += 1) {
        const x = lerp(10950, 12400, r())
        lt.push([x, Math.abs(x - 11640) < 380 ? lerp(890, 990, r()) : lerp(780, 980, r())])
      }
      s += `<path class="rr-tf" style="stroke:var(--${thu ? 'l2' : 'd1'});stroke-width:4;opacity:.45" d="${dots(lt)}"/>`
    }
    if (xuan && !lite) {
      const fl: Pt[] = []
      for (let i = 0; i < 9; i += 1) fl.push([r() < 0.5 ? lerp(10980, 11320, r()) : lerp(12000, 12380, r()), lerp(800, 960, r())])
      s += `<path class="rr-tf" style="stroke:var(--f3);stroke-width:3.2;opacity:.6" d="${dots(fl)}"/>`
    }
    moundS = s
    if (snow) {
      const a: Pt[] = []
      const b: Pt[] = []
      for (let x = 10720; x <= 12680; x += lite ? 180 : 140) {
        const under = Math.max(Math.exp(-(((x - T1X) / 300) ** 2)), Math.exp(-(((x - T2X) / 260) ** 2)))
        a.push([x, gy(x) - 5])
        b.push([x, gy(x) + 14 + (1 - under) * (60 + nz(x / 60, 8) * 50)])
      }
      add(2.3, 10700, 12700, 7, `<g mask="url(#rr-ek)"><path class="w3"${op(0.85)} d="${pl([...a, ...b.reverse()], true)}"/></g>`)
    }
    if (ctx.wet > 0.25) add(2.3, 11600, 12280, 5, `<path class="a1"${op(0.55)} d="M11560 806a34 6 0 1 0 68 0a34 6 0 1 0-68 0M12210 800a26 5 0 1 0 52 0a26 5 0 1 0-52 0"/>`)
  }

  // ── 3. Tia nắng xiên từ ô vòm (đúng phía mặt trời) + vũng nắng nơi tia chạm đất · ánh trăng đêm rằm ──
  const mag = Math.min(0.46, lerp(0.12, 0.5, clamp(Math.abs(hr - 12.3) / 4.6, 0, 1)) + 0.15 * low)
  const slant = -sd * mag
  // nguồn sáng lệch hẳn về phía mặt trời: sáng lọt khe tán trái xuống bốt điện thoại, chiều lọt cạnh cổ thụ phải xuống
  // nguồn suối → chùm tia không cắt cột chat (x 25–75% màn hình)
  const sx0 = sd < 0 ? 11200 : 12410
  const sh0: [number, number][] = lite
      ? [
          [20, 62],
          [110, 40],
        ]
      : [
          [-10, 30],
          [56, 60],
          [150, 38],
        ]
  const shafts = sh0.map(([dx, w]) => [sx0 - sd * dx, w] as [number, number])
  // tia bắt đầu ngay dưới mép tán phía nắng (đỉnh gradient sáng nhất rơi vào phần NHÌN THẤY, không bị tán che)
  const yT = sd < 0 ? 380 : 150
  const ray = (k: number) =>
    shafts
      .map(([x, w]) => {
        const xb = x + slant * (775 - yT)
        const ww = w * k
        return pl(
          [
            [x - ww / 2, yT],
            [x + ww / 2, yT],
            [xb + ww * 0.85, 775],
            [xb - ww * 0.85, 775],
          ],
          true,
        )
      })
      .join('')
  if (rayK > 0) {
    const pools = shafts
      .slice(0, lite ? 1 : 3)
      .map(([x, w]) => {
        const xb = x + slant * (775 - yT)
        return `M${R(xb - w)} ${R(gy(xb) + 16)}a${R(w)} 9 0 1 0 ${R(w * 2)} 0a${R(w)} 9 0 1 0-${R(w * 2)} 0`
      })
      .join('')
    let motes = ''
    if (!lite && can()) {
      const r = rnd('mote')
      const m: Pt[] = []
      for (let i = 0; i < 5; i += 1) {
        const t = 0.5 + r() * 0.45
        const [x, w] = at(shafts, i % shafts.length)
        m.push([x + slant * (775 - yT) * t + (r() - 0.5) * w * 1.6, yT + (775 - yT) * t])
      }
      motes = `<g class="${mv('mt', 20 + slant * 40, 50, 19)}"><path class="rr-tf" style="stroke:var(--w3);stroke-width:2.2;opacity:.5" d="${dots(m)}"/></g>`
    }
    const br = can() ? ` class="${ani('ry', '17s ease-in-out infinite alternate', 34, 'ry')}"` : ''
    const xs = shafts.flatMap(([x]) => [x, x + slant * (775 - yT)])
    add(2.5, Math.min(...xs) - 120, Math.max(...xs) + 120, 6, `<g${op(rayO)}><g${br}><path fill="url(#rr-ry)" d="${ray(2.2)}"${op(0.4)}/><path fill="url(#rr-ry)" d="${ray(1)}"/></g><path class="rr-lp"${op(0.3)} d="${pools}"/>${motes}</g>`)
  }
  // tia sáng tĩnh mờ khi sương / xuân mà không có tia động (không hoạt ảnh → không tốn ngân sách chuyển động)
  if (rayK === 0 && day > 0.45 && !rain && !snow && (W.fog > 0.3 || xuan)) add(2.5, Math.min(sx0, sx0 + slant * 400) - 260, Math.max(sx0, sx0 + slant * 400) + 260, 3, `<path fill="url(#rr-ry)"${op(0.16)} d="${ray(1.8)}"/>`)
  if (moonK > 0.02) add(2.5, Math.min(sx0, sx0 + slant * 400) - 150, Math.max(sx0, sx0 + slant * 400) + 250, 3, '', `<path fill="url(#rr-mr)"${op(moonK * 0.5)} d="${ray(1.4)}"/>`)

  // ── 4. Suối: nguồn dưới vòm rễ cây phải → dòng trên → gờ đá → thác 3 dải cong + bọt → vũng → dòng dưới ra tiền cảnh ──
  {
    const up: Pt[] = [
      [12048, 765],
      [12005, 777],
      [11962, 790],
      [11928, 804],
      [11908, 818],
    ]
    const lo: Pt[] = [
      [11902, 852],
      [11868, 873],
      [11815, 903],
      [11765, 942],
      [11730, 990],
      [11714, 1036],
    ]
    const loW = (t: number) => lerp(36, 132, t) * (1 + 0.14 * Math.sin(t * 7 + 1))
    let s = `<path class="rr-wa" d="${cz(snake(up, t => lerp(10, 30, t)))}${cz(snake(lo, loW))}M11872 852a32 9 0 1 0 64 0a32 9 0 1 0-64 0"/>`
    if (!lite) {
      // phản chiếu ô trời: vệt sáng đứt đoạn theo dòng; bờ rêu lổn nhổn (chấm), không viền liền
      let wr = ''
      for (let i = 0; i < 4; i += 1) {
        const t = 0.18 + i * 0.2
        const k = Math.min(lo.length - 2, Math.floor(t * (lo.length - 1)))
        const a = at(lo, k)
        const b = at(lo, k + 1)
        const u = t * (lo.length - 1) - k
        const w = loW(t) * (0.2 + 0.12 * Math.sin(i * 2.3))
        wr += `M${R(lerp(a[0], b[0], u) + Math.sin(i * 1.7) * loW(t) * 0.2 - w / 2)} ${R(lerp(a[1], b[1], u))}q${J([w / 2, -2 - t * 3, w, 0])}`
      }
      s += `<path class="rr-wr" d="${wr}"/>`
    }
    // thác: ba dải nước cong (không phải chữ nhật), môi bọt trên gờ, bọt & bụi nước ở chân
    s +=
      `<path class="rr-wf" style="stroke-width:3.4" d="M11893 816q-6 18-3 36M11905 817q1 17-2 35M11917 816q7 17 4 36"/>` +
      `<path class="w3"${op(0.72)} d="M11878 856q6-10 16-6q8-9 18-2q10-5 16 4q8 2 4 7q-28 6-54-3z"/><ellipse class="hl" cx="11906" cy="842" rx="30" ry="12"/>`
    if (can()) s += `<g class="${mv('wf', 0, 26, 1.3 * (rain ? 0.7 : 1))}"><path class="rr-wf" style="stroke:var(--w3)" d="M11899 818v7M11910 820v6M11903 828v6"/></g>`
    if (!lite && can()) {
      anim += 1
      s += `<ellipse class="rr-wf rip" cx="11904" cy="856" rx="16" ry="4"/>`
    }
    add(3, 11700, 12060, 8, s)
    const fl = sd > 0 ? -1 : 1
    add(
      3.2,
      11640,
      12010,
      6,
      use('st', 11872, 822, fl, 1.1) +
        use('st', 11938, 820, -0.8 * fl, 0.8) +
        (lite ? '' : use('st', 11790, 896, 0.8 * fl, 0.7) + use('st', 11640, 960, 1.3 * fl, 1.1)),
    )
  }

  // ── 5. Cổ thụ: viền gợn, gốc loe thành bạnh rễ, khối sáng–tối theo nắng, vân vỏ gập khúc, rêu váy chân + rêu chảy theo
  //       vệt nước từ chạc, viền sáng phía nắng, hốc cây ──
  type Tr = { hw: (y: number) => number; xl: (y: number) => number; xr: (y: number) => number; g: number }
  const trunk = (k: string, cx: number, hw0: number, fl: number, z: number, hole: boolean, lo = lite): Tr => {
    const n = ctx.noise(`rr-t${k}`)
    const r = rnd(`t${k}`)
    const g = gy(cx)
    const hw = (y: number) => hw0 * (1 + (0.1 * (y - 300)) / 400) + fl * smooth(540, g + 12, y) ** 2
    const xl = (y: number) => cx - hw(y) + n(y / 150, 1.3) * 24 + n(y / 40, 3.1) * 6
    const xr = (y: number) => cx + hw(y) + n(y / 150, 5.7) * 24 + n(y / 40, 8.3) * 6
    const ys = lo ? [-140, 200, 450, 620, 700] : [-140, 200, 420, 560, 650, 700]
    const L = xl(g)
    const Rr = xr(g)
    const toes: Pt[] = [
      [L - 16, g + 5],
      [lerp(L, Rr, 0.17), g - 42],
      [lerp(L, Rr, 0.33), g + 7],
      [lerp(L, Rr, 0.52), g - 56],
      [lerp(L, Rr, 0.68), g + 6],
      [lerp(L, Rr, 0.84), g - 40],
      [Rr + 16, g + 5],
    ]
    const outline = cz([...ys.map(y => [xl(y), y] as Pt), ...toes, ...ys.map(y => [xr(y), y] as Pt).reverse()])
    const id = `rr-f${k}`
    // vân vỏ: rãnh gập khúc dọc theo độ cong thân, toả ra theo bạnh rễ; gờ sáng lệch về phía nắng (bản sao <use> dời 4px)
    let fs = ''
    const nF = lo ? 3 : 4
    for (let i = 0; i < nF; i += 1) {
      const u = -0.86 + (1.72 * (i + 0.2 + r() * 0.6)) / nF
      const y0 = 330 + r() * 150
      const y1 = g - 70 - r() * 110
      const p: Pt[] = []
      for (let y = y0; y < y1; y += 70 + r() * 40) p.push([cx + u * hw(y) + n(y / 70, i * 1.7) * 14, y])
      p.push([cx + u * hw(y1), y1])
      if (p.length > 1) fs += pl(p)
    }
    // áo rêu phía KHUẤT nắng (ẩm): ôm mép thân, mép trong lổn nhổn với lưỡi rêu chảy xuống theo vệt nước; phía nắng để lộ
    // vỏ sáng + viền sáng. Sáng: khuất = phải; chiều: khuất = trái.
    const ms = -sd
    const edge = (y: number) => (ms > 0 ? xr(y) : xl(y)) - ms * 3
    const ysM = lo ? [370, 500, 640] : [370, 450, 530, 610, 670]
    const inner: Pt[] = []
    ysM.forEach((y, j) => {
      const k = 0.34 + n(y / 70, 11.3) * 0.5
      inner.push([edge(y) - ms * hw(y) * k, y])
      if (j % 2 && !lo) inner.push([edge(y) - ms * hw(y) * (k - 0.1), y + 34 + r() * 40], [edge(y) - ms * hw(y) * (k - 0.2), y + 20])
    })
    const mantle = cz([...ysM.map(y => [edge(y), y] as Pt), [edge(g - 100), g - 100], ...inner.reverse()])
    // váy rêu chân thân: mép trên lổn nhổn, lưỡi rêu leo theo sống bạnh; đáy bám theo bạnh (khe giữa bạnh để lộ nền)
    const yT = (x: number) => g - 118 + n(x / 45, 4.4) * 34 - 46 * Math.max(0, Math.cos(((x - cx) / (Rr - L)) * 11)) * (lo ? 0.5 : 1)
    const skTop: Pt[] = []
    const xa = xl(g - 110) + 10
    const xb = xr(g - 110) - 10
    for (let x = xa; x <= xb; x += lo ? 50 : 48) skTop.push([x, yT(x)])
    skTop.push([xb, yT(xb)])
    const skirt = cz([[xl(g - 40) - 2, g - 40], ...skTop, [xr(g - 40) + 2, g - 40], ...toes.slice().reverse()])
    const sun = skTop.filter(p => (p[0] - cx) * sd > -hw(g) * 0.2)
    const rim: Pt[] = []
    const sky: Pt[] = []
    for (let y = 370; y <= g - 90; y += lo ? 110 : 75) {
      rim.push([(sd < 0 ? xl(y) : xr(y)) - sd * 3, y])
      if (y < g - 140) sky.push([(sd < 0 ? xr(y) : xl(y)) + sd * 4, y])
    }
    // bóng tiếp xúc: đốm tròn mềm (gradient) nằm SAU thân — chỉ lộ quanh các bạnh rễ, không thành dải xám mép thẳng
    let s =
      `<ellipse fill="url(#rr-ag)" cx="${R(cx + sd * 20)}" cy="${R(g + 4)}" rx="${R((Rr - L) * 0.66)}" ry="26"/>` +
      `<g fill="url(#rr-tg)"><path id="rr-o${k}" d="${outline}"/></g><use href="#rr-o${k}" fill="url(#rr-tv)"/>${lite ? '' : `<use href="#rr-o${k}" fill="url(#rr-tk)" opacity=".26"/>`}` +
      `<g class="rr-bf"><path id="${id}" d="${fs}"/></g><use href="#${id}" class="rr-bh" x="${-sd * 4}"/>` +
      `<path class="m3"${op(0.9)} d="${mantle}"/>` +
      (lite || rain ? '' : `<path class="rr-sr" d="${co(sky)}"/>`) +
      `<path id="rr-k${k}" fill="url(#rr-sk)" d="${skirt}"/>${lite ? '' : `<use href="#rr-k${k}" fill="url(#rr-tx)" opacity=".4"/>`}<path class="rr-mt" d="${co(sun)}"/>` +
      (frost || snow ? `<path class="rr-fr" d="${co(skTop)}"/>` : '') +
      (rimK > 0 ? `<path class="rr-rl" d="${co(rim)}"/>` : '')
    if (hole) {
      const hx = cx + hw(500) * 0.4
      s += `<path class="k1" d="M${R(hx - 12)} 520q-5-44 12-52q17 10 12 52q-12 12-24 0z"/><path class="m2" d="M${R(hx - 17)} 518q17 16 34 0q-4 14-17 16q-13-2-17-16z"/>`
    }
    add(z, L - 30, Rr + 30, 9, s)
    return { hw, xl, xr, g }
  }

  /** Rễ nổi: ống thon phủ rêu trên lưng, sống sáng; rễ vòm có hang tối bên dưới. */
  const root = (z: number, c: Pt[], w0: number, w1: number, arch: boolean, p = 7, hi = true) => {
    const w = (t: number) => lerp(w0, w1, t) * (1 + 0.12 * Math.sin(t * 9))
    let s = ''
    if (arch) {
      const lowE = offs(c, w, -1)
      const f = at(c, 0)
      const l = at(c, c.length - 1)
      s += `<path class="k1"${op(0.6)} d="${co([[f[0], gy(f[0]) + 4], ...lowE.slice(1, -1), [l[0], gy(l[0]) + 4]])}z"/>`
    }
    s +=
      `<path class="rr-rb" d="${cz(snake(c, w))}"/>` + (hi ? `<path class="m2" d="${cz(snake(c, t => w(t) * 0.72, 0.4))}"/>` : '') +
      (arch ? `<path class="rr-mt" d="${co(offs(c, w, 0.86).slice(1, -1))}"/>` : '') +
      ''
    const xs = c.map(q => q[0])
    add(z, Math.min(...xs) - w0, Math.max(...xs) + w0, p, s)
  }

  const t1 = trunk('1', T1X, 140, 105, 12, true)
  trunk('2', T2X, 108, 92, 11, false, true)
  // rễ: T1 phải (vòm sau bốt), T1 trái (thấp, ra đồng cỏ), T1 rễ to bò ra tiền cảnh; T2 trái (vòm nguồn suối), T2 phải
  root(12.5, [
    [11176, 744],
    [11240, 726],
    [11320, 722],
    [11392, 738],
    [11446, 770],
  ], 42, 14, true, 8)
  root(12.5, [
    [10800, 742],
    [10740, 757],
    [10690, 767],
    [10640, 776],
  ], 34, 10, false, 5)
  // rễ bò ra tiền cảnh rồi chui vào gò rêu (vẽ TRƯỚC gò z2.1 → gò che đầu rễ, đọc thành rễ lặn vào rêu)
  root(2.05, [
    [11024, 748],
    [11072, 760],
    [11116, 778],
    [11146, 800],
  ], 40, 12, false, 5)
  root(2.05, [
    [12334, 750],
    [12292, 764],
    [12258, 784],
    [12240, 806],
  ], 34, 10, false, 5)
  add(2.1, 10900, 12500, 5, moundS)
  root(11.5, [
    [12164, 742],
    [12102, 724],
    [12032, 726],
    [11976, 746],
    [11942, 774],
  ], 42, 14, true, 8)

  // ── 6. Bốt điện thoại (tiêu điểm): kính mờ ô vỡ, ống nghe lủng lẳng, rêu nuốt chân, dây leo vắt mái ──
  const bx = 11290
  const by = gy(bx) + 6
  {
    const T = mx(bx, by, 1.06, 1.06, -3)
    const r = rnd('booth')
    const mossTop: Pt[] = []
    for (let x = -31; x <= 31; x += 7) mossTop.push([x, -40 + ((x + 31) / 62) * 24 - r() * 9 - 5 * Math.sin((x + 31) / 8)])
    const vine: Pt[] = [
      [-34, 2],
      [-31, -40],
      [-35, -86],
      [-28, -126],
      [-18, -156],
      [4, -164],
      [24, -156],
      [30, -132],
      [27, -110],
    ]
    let lv = ''
    for (let i = 1; i < vine.length; i += 1) {
      const a = at(vine, i)
      const sdv = i % 2 ? 1 : -1
      if (i % 2 && i < 7) lv += `M${J([a[0], a[1]])}q${J([sdv * 4, -5, sdv * 9, -2])}q${J([-sdv * 4, 5, -sdv * 9, 2])}z`
    }
    const shadeX = sd < 0 ? 18 : -28
    const s =
      `<ellipse fill="url(#rr-ag)" cx="${bx + 6 - sd * 16}" cy="${R(by + 2)}" rx="78" ry="14"/><ellipse class="ao" cx="${bx + 4}" cy="${R(by + 1)}" rx="36" ry="4"/>` +
      `<g transform="${T}"><path class="r3" d="M28-150l9-6v150l-9 6z"/><path class="p1" d="M-28 0v-150h56v150zM-32-149q32-24 64 0l4-7q-36-20-72 1z"/>` +
      `<path class="k2" d="M-22-132h44v118h-44z"/><path class="k1" d="M-22-109h22v23h-22zM0-40h22v26h-22z"/>` +
      `<path class="hl" d="M-22-132h9l-9 18zM-22-60l32-58h9l-41 74z"/><path class="rr-mn" d="M-22-109h44M-22-86h44M-22-63h44M-22-40h44M0-132v118"/>` +
      `<path class="k1"${op(0.62)} d="M-24-147h48v10h-48z"/><text class="p3 rr-tx" x="0" y="-139.5" text-anchor="middle"${op(0.7)}>ĐIỆN THOẠI</text>` +
      `<path class="sh" d="M${shadeX}-150h10V0h-10z"/>` +
      `<path class="m2" d="${pl([...mossTop, [33, 3], [-33, 3]], true)}"/><path class="m1"${op(0.6)} d="M-30-38q10-9 22-3q-8 4-22 3z"/>` +
      `<path class="m2" d="M-30-152q14-14 34-10q16 2 26 12q-30-8-60-2z"/>` +
      `<path class="rr-vn" d="${co(vine)}"/><path class="l2" d="${lv}"/>` +
      (snow ? `<path class="w3" d="M-33-151q33-27 66 0q-33-19-66 0z"/>` : '') +
      `</g>`
    let g = ''
    if (glowOn && day < 0.5) {
      const bz = can() ? ` class="${ani('bz', '9s linear infinite', 9, 'bz')}"` : ''
      g =
        `<g${bz}><g transform="${T}"><path fill="url(#rr-bg)" d="M-22-132h44v118h-44z"/><path class="rr-mn" style="stroke:var(--k1)" d="M-22-109h44M-22-86h44M-22-63h44M-22-40h44M0-132v118"/>` +
        `<circle class="e1" cx="0" cy="-127" r="2.4"/></g><circle cx="${bx}" cy="${R(by - 80)}" r="70" fill="url(#gw)"${op(0.5)}/>` +
        `<ellipse cx="${bx + 14}" cy="${R(by + 5)}" rx="84" ry="13" fill="url(#gw)"${op(0.7)}/></g>`
    }
    add(13.5, bx - 50, bx + 60, 9, s, g)
  }

  // ── 7. Dương xỉ lá kép (mùa đổi: xuân non + mầm cuộn, hạ xanh sâu, thu vàng nâu, đông khô thưa), nấm dưới vòm rễ ──
  {
    const r = rnd('fern')
    const cls = ha ? 'l3' : dong ? 'd1' : thu ? 'l2' : 'l2'
    const ferns: [number, number, number][] = [
      [11196, 6, 1.05],
      [10790, 4, 1.15],
      [12196, 8, 0.95],
      [12000, 44, 0.75],
      [11372, 8, 0.5],
    ]
    let fs = ''
    let sw = 0
    ferns.forEach(([x, dy, sc0], k) => {
      if ((lite && k % 2) || (dong && k > 3)) return
      const sc = (dong ? 0.75 : 1) * sc0 * (r() < 0.5 ? -1 : 1)
      const tr = mx(x, gy(x) + dy, sc, Math.abs(sc) * (dong ? 0.8 : 1))
      if (k < 3 && !lite && sw < 2 && can()) {
        anim += 1
        sw += 1
        fs += `<g transform="${tr}"><g class="sw${2 + k}"><use href="#rr-fn" class="${cls}"/></g></g>`
      } else fs += `<use href="#rr-fn" class="${cls}" transform="${tr}"/>`
    })
    if (xuan) fs += `<path class="rr-tw" style="stroke:var(--l1);stroke-width:2.6" d="M11226 772q-3-12 2-22q6-6 9 0q1 5-4 5M10822 760q-2-10 3-18q5-5 8 0q1 4-3 4M12226 774q-3-11 2-20q5-6 8 0q1 4-3 4"/>`
    add(13.8, 10700, 12620, 6, fs)
    // nấm: dưới vòm rễ & chân thân; thu nhiều hơn, mũ nâu; đêm sáng xanh (glow) + quầng
    const mu: [number, number, number][] = [
      [11352, 768, 1.1],
      [11408, 772, 0.8],
      [12062, 764, 1],
      [12112, 769, 0.75],
      [10860, 763, 1],
    ]
    if (thu) mu.push([12268, 776, 1.2])
    const keep = lite ? mu.slice(0, 3) : snow ? mu.slice(0, 4) : mu
    const tone = thu ? ' style="--mc:var(--b2)"' : ''
    const s = keep.map(([x, y, sc], i) => use('mu', x, y, i % 2 ? -sc : sc, sc, 0, i % 2 && thu ? tone : '')).join('')
    let g = ''
    if (glowOn && day < 0.45) {
      const gp = can() ? ` class="${ani('gp', '7s ease-in-out infinite alternate', 14, 'gp')}"` : ''
      g = `<g${gp}>${keep
        .slice(0, 3)
        .map(([x, y, sc], i) => `<ellipse cx="${x + 2}" cy="${y - 7}" rx="${R(30 * sc)}" ry="${R(19 * sc)}" fill="url(#gg)"/>${use('mu', x, y, i % 2 ? -sc : sc, sc, 0, ' class="rr-mg"')}`)
        .join('')}</g>`
    }
    add(13, 10840, 12290, 6, s, g)
  }

  // ── 8. Vòm tán BA tầng giá trị: SAU (xa, sáng sương) · GIỮA (lục vừa, chùm rủ riêng) · TRƯỚC (gần, tối) — ba nhịp rủ
  //       độc lập nên mép tán tách thành nhiều nhóm sáng/tối chồng nhau, không thành một đường răng cưa đều. Cỡ lá đổi theo
  //       nhiễu dọc mép (đoạn lá li ti xen chùm lớn); viền nắng mềm (2 bản dời) phía mặt trời; lỗ trời nhỏ ở phần tán ngoài
  //       cột chat. Lệch khung: tán trái thấp & dày, tán phải cao & thưa. Mùa đổi MẢNG: hạ dày & thấp, thu thưa & cao, thủng
  //       sáng ở mép, đông trơ cành nhiều lỗ ──
  const dyS = xuan ? -4 : ha ? 10 : thu ? -26 : -64
  {
    const r = rnd('can')
    const nb = ctx.noise('rr-cb')
    const base = CANB.map(([x, y]) => [x, y + (dyS - 26) * smooth(-260, 60, y)] as Pt)
    const thin = dong ? 0.5 : thu ? 0.8 : 1
    const lz = lite ? 1.55 : 1
    // nhịp cỡ lá dọc mép (0.4–1.65×); đầu trái (thấy từ nhin-dao-bay) gọn hơn để không vươn sang đảo i1
    const lobe = (a0: number, k: number) => (p: Pt, s2: number) => a0 * lz * (0.42 + 1.3 * smooth(-0.28, 0.28, nb(s2 / 200, 17 + k))) * (p[0] < 10880 ? 1.25 : p[0] > 11300 && p[0] < 12000 ? 0.8 : 1)
    const edgeK = (p: Pt) => (p[0] < 10860 ? (p[1] < 240 ? 0.7 : 0.9) : p[0] > 11300 && p[0] < 12000 ? 0.75 : 1) * thin
    const cuts = [11330, 12010]
    const bases: Pt[][] = []
    const basesM: Pt[][] = []
    let k0 = 0
    for (const c of [...cuts, 1e9]) {
      const k1 = c > 1e8 ? base.length - 1 : base.findIndex(p => p[0] > c)
      const b = base.slice(Math.max(0, k0 - 1), k1 + 1)
      // đầu khúc nối: mép cong VỒNG LÊN quá mép trên mọi khung, chồng sang khúc bên cạnh — không có cạnh đóng thẳng đứng
      // (tầng chùm dời lên của khúc này đè lên khúc kia chỉ lộ thành ranh một chùm lá, không thành vết cắt)
      const f = at(b, 0)
      const l = at(b, b.length - 1)
      basesM.push(b.slice())
      if (k0 > 0) b.unshift([f[0] - 300, -470], [f[0] - 170, f[1] - 150], [f[0] - 70, f[1] - 26])
      if (c < 1e8) b.push([l[0] + 70, l[1] - 26], [l[0] + 170, l[1] - 150], [l[0] + 300, -470])
      bases.push(b)
      k0 = k1
    }
    const close = (P: { pts: Pt[] }) => `L${R(at(P.pts, P.pts.length - 1)[0])} -470L${R(at(P.pts, 0)[0])} -470z`
    const skyC = rain || snow ? ch('s2', 30) : `color-mix(in oklab,var(--sky1) 55%,${HZ})`
    const allSm: [number, number, number, number][] = []
    // chùm rủ: nửa elip dọc mép (rộng & cao khác nhau), giữa hai chùm là khe sâu; tầng giữa đặt so le với tầng trước
    const clumps = (len: number, n: number, h: number, ph: number) => {
      const cs: [number, number, number][] = []
      for (let i = 0; i < n; i += 1) cs.push([((i + ph + (r() - 0.5) * 0.5) / n) * len, (len / n) * (0.3 + r() * 0.45), h * (0.25 + r() * 0.95)])
      return (s2: number) => {
        let m = 0
        for (const [c, w, hh] of cs) {
          const u = (s2 - c) / w
          if (u * u < 1) m = Math.max(m, hh * (1 - u * u) ** 0.8 * (0.82 + 0.3 * Math.sin(s2 / 19 + c)))
        }
        return m
      }
    }
    bases.forEach((bs, k) => {
      let len = 0
      for (let i = 1; i < bs.length; i += 1) len += Math.hypot(at(bs, i)[0] - at(bs, i - 1)[0], at(bs, i)[1] - at(bs, i - 1)[1])
      const nF = Math.max(2, R(len / 240))
      const cM = clumps(len, Math.max(2, R(len / 210)), 95 * thin, 0)
      const cF = clumps(len, nF, 110 * thin, 0.5)
      // khe sâu giữa các chùm (lõm VÀO trong tán): cả hai tầng cùng lõm → lộ trời/tầng sau, chùm tách hẳn nhau
      const nt: [number, number, number][] = []
      for (let i = 1; i < nF; i += 1) if (r() < 0.75) nt.push([(i / nF) * len + (r() - 0.5) * 40, 26 + r() * 30, 45 + r() * 70])
      const notch = (s2: number) => {
        let m = 0
        for (const [c, w, d] of nt) {
          const u = (s2 - c) / w
          if (u * u < 1) m = Math.max(m, d * (1 - u * u))
        }
        return m
      }
      const M = leafPath(at(basesM, k), lobe(62, k + 5), r, (s2, p) => (12 + cM(s2) - notch(s2) * 0.55) * edgeK(p))
      const F = leafPath(bs, (p, s2) => lobe(47, k + 9)(p, s2) * (dong ? 0.8 : 1), r, (s2, p) => (cF(s2) - notch(s2)) * edgeK(p))
      allSm.push(...F.sm)
      const xs = [...M.pts, ...F.pts].map(q => q[0])
      const x0 = Math.min(...xs)
      const x1 = Math.max(...xs)
      // lỗ trời: cụm 1–3 lỗ nhỏ méo gần mép, chỉ ở phần tán ngoài cột chat (cảnh rung-reu) — thu/đông nhiều hơn
      let hd = ''
      const nH = k === 1 ? 0 : R(3 * (lite ? 0.5 : 1))
      for (let h = 0; h < nH; h += 1) {
        const [x, y, nx, ny] = at(F.sm, 1 + Math.floor(r() * (F.sm.length - 2)))
        if (y < -80 || (x > 11270 && x < 12030)) continue
        const dep = 40 + r() * 170
        const n = r() < 0.4 ? 2 : 1
        for (let j = 0; j < n; j += 1) {
          const hx = x - nx * dep + (r() - 0.5) * 34
          const hy = y - ny * dep + (r() - 0.5) * 24
          const rad = (3.5 + r() * 7) * (dong ? 1.4 : 1) * (j ? 0.55 : 1)
          // lỗ tròn méo lộ trời, chỉ ở phần tán mỏng gần đỉnh (sâu dưới tán dày thì không thủng)
          if (hy < (thu || dong ? 320 : 190) && hy > (hx < 11150 ? -215 : 36)) hd += cz(blobPts(hx, hy, rad * 1.3, rad, r, 4, 0.35))
        }
      }
      let gl = ''
      for (let h = 0; h < 0; h += 1) {
        const [x, y, nx, ny] = at(F.sm, Math.floor(r() * F.sm.length))
        if (y < -200) continue
        const dep = 18 + r() ** 1.6 * 150
        gl += `M${J([x - nx * dep + (r() - 0.5) * 20, y - ny * dep])}l${J([h % 2 ? 7 : -6, 3 + (h % 3) * 2])}`
      }
      const id = `rr-c${k}`
      const im = `rr-n${k}`
      const ty = 5
      const fogE = W.fog > 0.35 || frost
      add(20, x0, x1, 8, `<g class="rr-cb"><path id="${im}" d="${M.d + close(M)}"/></g><use href="#${im}" fill="url(#rr-tv)"/>`)
      add(
        21,
        x0,
        x1,
        8,
        snow || fogE ? '' : `<use href="#${id}" class="rr-cr" transform="translate(${sd * 3} ${ty - 1})"/>`,
      )
      add(
        22,
        x0,
        x1,
        8,
        `<g class="rr-cm"><path id="${id}" d="${F.d + close(F)}"/></g>` +
          // tầng chùm cao hơn = chính mép trước dời lên (& vào trong), sáng dần → tán đọc ra nhiều lớp chùm chồng nhau
          `<use href="#${id}" class="rr-c2" transform="translate(${(1 - k) * 28} -${dong ? 90 : 105}) rotate(${k === 1 ? -1.6 : 2.4} ${R((x0 + x1) / 2)} 0)"/>` +
          (lite ? '' : `<use href="#${id}" class="rr-c3" transform="translate(${(k - 1) * 18} -${dong ? 190 : 225})"/>`) +
          `<use href="#${id}" fill="url(#rr-${fogE ? 'cf' : 'cv'})"/>` +
          (lite ? '' : `<use href="#${id}" fill="url(#rr-tx)" opacity="${dong ? '.18' : '.22'}"/>`) +
          (gl ? `<path class="rr-tf" style="stroke:var(--l3);stroke-width:5;opacity:.34" d="${gl}"/>` : '') +
          (hd ? `<path style="fill:${skyC}" d="${hd}"/>` : '') +
          // sương/tuyết: KHÔNG viền sáng liền (đọc thành đường răng cưa nhạt) — chùm rủ thấp chìm dần vào sương (gradient màu
          // sương theo độ cao, đậm ở mép dưới); tuyết: vệt tuyết mảnh đứt quãng nằm trên mép chùm lá tầng dưới (= mép dưới tầng chùm dời lên)
                    (snow && k === 0 ? `<use href="#${id}" class="rr-sn" transform="translate(28 -${dong ? 87 : 102}) rotate(2.4 ${R((x0 + x1) / 2)} 0)"/>` : ''),
      )
    })
    // đông (và cuối thu): cành trơ mảnh vươn ra khoảng trời
    if (dong || (thu && ctx.seasonT > 0.6)) {
      // cành: gốc khuất trong tán, vươn ra theo pháp tuyến rồi uốn sang một bên; một nhánh rẽ mảnh hơn ở 1/2 cành
      let tw = ''
      let tf = ''
      for (const x of lite ? [11420, 12120] : [11300, 12160, 12300]) {
        let best = at(allSm, 0)
        for (const q of allSm) if (q[1] > 40 && Math.abs(q[0] - x) < Math.abs(best[0] - x)) best = q
        const [cx, cy, nx, ny] = best
        const L = 55 + r() * 60
        const sg = r() < 0.5 ? -1 : 1
        const S: Pt = [cx - nx * 24, cy - ny * 24]
        const C: Pt = [cx + nx * L * 0.4, cy + ny * L * 0.4]
        const E: Pt = [cx + nx * L - ny * sg * L * 0.4, cy + ny * L + nx * sg * L * 0.4]
        tw += `M${J(S)}Q${J([...C, ...E])}`
        const F: Pt = [(S[0] + 2 * C[0] + E[0]) / 4, (S[1] + 2 * C[1] + E[1]) / 4]
        const fl = L * 0.42
        tf += `M${J(F)}q${J([nx * fl * 0.6, ny * fl * 0.6, nx * fl * 0.8 + ny * sg * fl * 0.6, ny * fl * 0.8 - nx * sg * fl * 0.6])}`
      }
      add(22.5, 11250, 12350, 5, `<path class="rr-tw" style="stroke:var(--b2);stroke-width:2.6" d="${tw}"/><path class="rr-tw" style="stroke:var(--b2);stroke-width:1.4" d="${tf}"/>`)
    }
  }

  // ── 10. Mùa & thời tiết động: lá vàng rơi (thu), giọt mưa rỏ từ tán, mắt cú trong hốc (đêm) ──
  if (thu)
    for (let i = 0; i < (rain || lite ? 1 : 2) && can(); i += 1) {
      const d = 14 + i * 4
      const c = ani('lf', `${d}s linear infinite`, d, `lf${i}`)
      cssX.push(`.${c}{--fx:${70 + i * 40}px;--fy:${520 - i * 40}px}`)
      // lá nhỏ, có vệt nhoè chuyển động (bản mờ lệch ngược hướng rơi) thay vì hình lá rõ nét; rơi ở hai mép khung
      const x = i ? 12150 : 11170
      const y = 300 + i * 40
      add(24, x - 20, x + 140, 4, `<g class="rr-lf ${c}"><path class="${i ? 'l2' : 'l1'}" d="M${x} ${y}q3-3 7 0q-3 2-7 0z"/><path class="${i ? 'l2' : 'l1'}" opacity=".3" d="M${x - 5} ${y - 8}q5-2 10 3q-6 0-10-3z"/></g>`)
    }
  if (rain) {
    let s = ''
    for (let i = 0; i < 2 && can(); i += 1) s += `<g class="${mv(`dr${i}`, 0, 380, 1.7 + i * 0.6)}"><path class="rr-wf" d="M${11250 + i * 900} ${360 - i * 100}v10"/></g>`
    add(24, 11240, 12160, 3, s)
  }
  if (glowOn && day < 0.35 && !lite && can()) {
    const hx = T1X + t1.hw(500) * 0.4
    add(12.1, hx - 20, hx + 20, 6, '', `<g class="rr-ey ${ani('bl', '11s linear infinite', 11, 'ey')}"><path class="e1" d="M${R(hx - 7)} 492a3 2 0 1 0 6 0a3 2 0 1 0-6 0M${R(hx + 3)} 492a3 2 0 1 0 6 0a3 2 0 1 0-6 0"/></g>`)
  }

  // ── 11. Tiền cảnh (lớp 4): lá dương xỉ lớn gần như bóng đen ở hai góc dưới ──
  if (!lite) {
    const f4 = (sx: number) => SHOT.x * 1.35 + (sx - 800) / SHOT.zoom
    for (const [sx, y, s, deg] of [
      [70, 1015, 2.7, -16],
      [230, 1040, 1.9, 12],
      [1525, 1020, -2.6, 16],
    ] as [number, number, number, number][]) {
      const x = f4(sx)
      let swc = ''
      if (sx < 100 && can()) {
        anim++
        swc = ' class="sw4"'
      }
      add(30, x - 140 * Math.abs(s), x + 140 * Math.abs(s), 5, `<g transform="${mx(x, y, s, Math.abs(s), deg)}"><g${swc}><use href="#rr-fd" class="rr-fk"/></g></g>`, '', 4)
    }
  }

  // ── Mảnh: gom theo (lớp, tầng z, khúc 700) để lõi cắt được khi camera không tới ──
  const groups = new Map<string, It>()
  for (const it of its) {
    const key = `${it.L}|${Math.floor(it.z)}|${Math.floor((it.x0 + it.x1) / 1400)}`
    const g = groups.get(key)
    if (g) {
      g.x0 = Math.min(g.x0, it.x0)
      g.x1 = Math.max(g.x1, it.x1)
      g.p = Math.max(g.p, it.p)
      g.s += it.s
      g.g += it.g
    } else groups.set(key, { ...it })
  }
  const pieces: Piece[] = [...groups.values()]
    .sort((a, b) => a.z - b.z || a.x0 - b.x0)
    .map(g => ({ layer: g.L, x0: g.x0, x1: g.x1, prio: g.p, svg: g.s, ...(g.g ? { glow: g.g } : {}) }))

  const spots: Spot[] = [
    { kind: 'cat', layer: 3, x: 11214, y: R(gy(11214) + 6), s: 1 },
    { kind: 'fireflies', layer: 3, x: 11700, y: 700, w: 380 },
    { kind: 'fireflies', layer: 3, x: 12160, y: 720, w: 240 },
    { kind: 'butterflies', layer: 3, x: 11520, y: 700, w: 240 },
    { kind: 'perch', layer: 3, x: bx - 4, y: R(by - 168), s: 0.9 },
    { kind: 'perch', layer: 3, x: 12070, y: 692, s: 0.8 },
  ]
  if (rain) spots.push({ kind: 'cat-shelter', layer: 3, x: 11380, y: R(gy(11380) + 2), s: 0.9 })
  if (anim > 25) throw new Error(`rung-reu: ${anim} phần tử chuyển động > 25`)

  // ── CSS: màu dẫn xuất từ bảng màu (color-mix biến palette), nét, hoạt ảnh (chỉ transform/opacity) ──
  const FC = thu ? cm('l3', 'l4', 45) : cm('l4', 'k1', 82)
  const MC = `color-mix(in oklab,${thu ? cm('l2', 'l3', 50) : cm('l3', 'l4', 50)} 76%,${HZ})`
  const rimC = snow ? 'var(--w3)' : frost ? cm('w3', 'l3', 55) : low > 0.1 && rimK > 0 ? cm('l3', 'e1', 100 - low * 45) : cm('l3', 'l4', 60)
  const KF: Record<string, string> = {
    mv: '@keyframes rr-mv{0%{transform:translate(0,0);opacity:0}25%,70%{opacity:1}100%{transform:translate(var(--fx),var(--fy));opacity:0}}',
    ry: '@keyframes rr-ry{from{opacity:1}to{opacity:.7}}',
    hg: '.rr-hg{transform-box:fill-box;transform-origin:50% 0}@keyframes rr-hg{from{transform:rotate(calc(1.2deg + var(--wind)*2deg))}to{transform:rotate(calc(-1.6deg - var(--wind)*4deg))}}',
    lf: '.rr-lf{transform-box:fill-box;transform-origin:50% 50%}@keyframes rr-lf{0%{transform:translate(0,0) rotate(-20deg);opacity:0}10%,82%{opacity:.8}50%{transform:translate(calc(var(--fx)*.5),calc(var(--fy)*.5)) rotate(30deg)}100%{transform:translate(var(--fx),var(--fy)) rotate(-12deg);opacity:0}}',
    bl: '.rr-ey{transform-box:fill-box;transform-origin:50% 50%}@keyframes rr-bl{0%,46%,50%,100%{transform:scaleY(1)}48%{transform:scaleY(.1)}}',
    gp: '@keyframes rr-gp{from{opacity:.6}to{opacity:1}}',
    bz: '@keyframes rr-bz{0%,37%,40%,44%,69%,72%,100%{opacity:1}38%{opacity:.3}42%{opacity:.75}70%{opacity:.5}}',
  }
  const css =
    `[id^=rr-] stop{stop-color:currentColor}.rr-cb{fill:${MC}}.rr-cr{fill:${rimC}}.rr-cm{fill:${FC}}.rr-c2{fill:color-mix(in oklab,${FC} 74%,${MC})}.rr-c3{fill:color-mix(in oklab,${FC} 48%,${MC})}.rr-sr{fill:none;stroke:${ch('a1', 45)};stroke-width:3;opacity:.35}.rr-sn{fill:none;stroke-linejoin:round;stroke:var(--w3);stroke-width:2.6;stroke-dasharray:11 29 5 17 19 43;opacity:.55}` +
    `.rr-t1{fill:${ch('m3', 50)}}.rr-wa{fill:${cm('a2', 'a3', 55)}}.rr-fk{fill:${cm('l4', 'k1', 40)}}` +
    `.rr-rb{fill:${cm('m3', 'b2', 62)}}.rr-lp{fill:${cm('m1', 'e2', 55)}}.rr-pk{fill:none;stroke-linecap:round;stroke:var(--k1);stroke-width:2.5}.rr-px{fill:${snow ? 'var(--w3)' : dong ? 'var(--s2)' : thu ? 'var(--l1)' : 'var(--m1)'}}` +
    `.rr-tu{fill:none;stroke:${thu ? 'var(--l1)' : dong ? 'var(--s2)' : 'var(--m1)'};stroke-width:2;stroke-linecap:round;opacity:.5}.rr-bf,.rr-bh,.rr-rl,.rr-mt,.rr-vn,.rr-wr,.rr-wf,.rr-tw,.rr-tf,.rr-mn,.rr-fr,.rr-ms2{fill:none;stroke-linecap:round;stroke-linejoin:round}` +
    `.rr-bf{stroke:var(--k1);stroke-width:3;opacity:.3}.rr-bh{stroke:var(--m1);stroke-width:2;opacity:.2}` +
    `.rr-rl{stroke:${low > 0.1 ? cm('m1', 'e1', 70) : 'var(--m1)'};stroke-width:3.5;opacity:${f2(Math.min(rimK, 0.8))}}.rr-mt{stroke:var(--m1);stroke-width:4;opacity:.7}.rr-ms2{stroke:var(--m2);stroke-width:11;opacity:.85}` +
    `.rr-vn{stroke:var(--l4);stroke-width:1.8}.rr-wr{stroke:var(--a1);stroke-width:2.5;opacity:.5}.rr-wf{stroke:var(--a1);stroke-width:2.6;opacity:.85}` +
    `.rr-tw{stroke:var(--b1);stroke-width:2.2}.rr-tf{stroke:var(--m1);stroke-width:7;opacity:.2}.rr-mn{stroke:var(--p1);stroke-width:2.6}.rr-fr{stroke:var(--w3);stroke-width:${snow ? 5 : 2.4};stroke-dasharray:${snow ? '60 14 30 9' : '14 22 6 30'};opacity:.7}` +
    `.rr-mc{fill:var(--mc,var(--p3))}.rr-ms{fill:var(--ms,var(--w3))}.rr-mg{--mc:var(--e4);--ms:none}.rr-tx{font:700 6px sans-serif;letter-spacing:.05em}` +
    [...kf].map(k => KF[k] ?? '').join('') +
    cssX.join('')
  return { pieces, spots, defs: makeDefs(ctx, sd, low, HZ, G, GD), css }
}

export const region: Region = { id: 'rung-reu', name: 'Rừng rêu', x0: X0, x1: X1, shots: [SHOT], build }
