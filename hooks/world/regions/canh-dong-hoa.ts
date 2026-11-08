// KHỐI (cảnh canh-dong-hoa, x 15290 · z 1.1) — 4 mảng: trời sáng (lõi) · đồng xa + gò cối xay chìm sương (sáng-vừa) · mặt đồng
// giữa trung tính, MỘT dải hoa theo mùa chảy chéo từ góc phải-dưới lên chân cửa (đường dẫn mắt, gần: bông rõ; xa: vệt màu mịn)
// · khung tiền cảnh tối ở hai góc đáy. Tiêu điểm DUY NHẤT ở 1/3 trái: cánh cửa gỗ mảnh trên gò thấp, khe cửa (mùa đối diện) là
// điểm sáng nhất; một khóm cỏ thấp lệch phải (không còn bụi hạt đậu), trị độ sát nền; cửa phủ màn sương cho tiêu điểm trầm; đồng gần có vệt nắng/trũng tối mềm theo phía mặt trời. Đã bỏ: cặp bụi đối xứng, rào + nón, radio, chong chóng, khoai môn,
// 4 dải cỏ răng cưa song song, chữ nhật sương mép cứng. Chi tiết = mép cỏ có cấp bậc (khóm cao xen quãng trơn), vân cỏ, vân hoa.
// Ánh sáng theo mặt trời thật: sáng từ trái (trước 12h), chiều từ phải — viền sáng/bóng của cửa, gò, bụi, cối xay lật theo.
import type { Ctx, Piece, Region, Spot } from '../types'
import { clamp, fbm, ground, n0, n1, smooth, type Pt } from '../util'

const X0 = 14400
const X1 = 16200
const DX = 15020 // tâm cửa
const FB = 752 // chân khung cửa (đỉnh gò)
const DS = 1.1
const SHOT = { x: 15290, y: 575, z: 1.1 }

// ───────────── chuỗi path gọn ─────────────
const J = (a: number[], f = n0) =>
  a
    .map(v => f(v))
    .map((v, i) => (i && v >= 0 ? ' ' : '') + String(v).replace(/^(-?)0\./, '$1.'))
    .join('')
const P = (c: string, d: string, a = '') => `<path class="${c}" d="${d}"${a}/>`
const G = (x: number, y: number, inner: string, a = '') => `<g transform="translate(${n0(x)} ${n0(y)})"${a}>${inner}</g>`
const U = (id: string, x: number, y: number, a = '') => `<use href="#cdh-${id}" x="${n0(x)}" y="${n0(y)}"${a}/>`

function pl(pts: Pt[], z = true): string {
  const q = pts.map(([x, y]) => [n0(x), n0(y)] as Pt)
  const f = q[0]
  if (!f) return ''
  let [cx, cy] = f
  const rest: number[] = []
  for (const [x, y] of q.slice(1)) {
    rest.push(x - cx, y - cy)
    cx = x
    cy = y
  }
  return `M${J(f)}l${J(rest)}${z ? 'z' : ''}`
}

function sr(pts: Pt[], z = false): string {
  const q = pts.map(([x, y]) => [n0(x), n0(y)] as Pt)
  const f = q[0]
  if (!f) return ''
  if (q.length < 3) return pl(q, z)
  let [cx, cy] = f
  const a: number[] = []
  for (let i = 1; i < q.length - 1; i += 1) {
    const [px, py] = q[i] as Pt
    const [nx, ny] = q[i + 1] as Pt
    const mx = n0((px + nx) / 2)
    const my = n0((py + ny) / 2)
    a.push(px - cx, py - cy, mx - cx, my - cy)
    cx = mx
    cy = my
  }
  const [lx, ly] = q[q.length - 1] as Pt
  return `M${J(f)}q${J(a)}l${J([lx - cx, ly - cy])}${z ? 'z' : ''}`
}

function bb(cx: number, cy: number, rx: number, ry: number, r: () => number, lumps = 7, rough = 0.2): string {
  const pts: Pt[] = []
  const ph = r() * 6.283
  const am = [r() * rough, r() * rough, r() * rough]
  for (let i = 0; i < lumps; i += 1) {
    const t = (i / lumps) * 6.283
    const k = 1 + (am[0] as number) * Math.sin(t * 2 + ph) + (am[1] as number) * Math.sin(t * 3 + ph * 1.7) + (am[2] as number) * (r() - 0.5)
    pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k])
  }
  pts.push(pts[0] as Pt, pts[1] as Pt)
  return sr(pts, true)
}

const cu = (x: number, y: number, w: number, h: number) => `M${J([x, y])}q${J([w * 0.1, -h * 1.1, w * 0.5, -h])}q${J([w * 0.42, -h * 0.1, w * 0.5, h])}z`
function lf(x: number, y: number, dx: number, dy: number): string {
  const px = -dy * 0.36
  const py = dx * 0.36
  return `M${J([x, y])}q${J([dx / 2 + px, dy / 2 + py, dx, dy])}q${J([-dx / 2 - px, -dy / 2 - py, -dx, -dy])}z`
}
function blade(x: number, y: number, h: number, w: number, lean: number, f = n1): string {
  return `M${J([x - w, y], f)}q${J([w * 0.8 + lean * 0.3, -h * 0.55, w + lean, -h], f)}q${J([w * 0.5 - lean * 0.7, h * 0.5, w - lean, h], f)}z`
}
/** Bụi cỏ nhiều sắc độ (gốc tối, ngọn sáng); `fr` = viền sương muối trên ngọn. */
function tuft(r: () => number, n: number, wd: number, h: number, tones: string[], bw: number, fr = false): string {
  const by: string[][] = tones.map(() => [])
  let fs = ''
  for (let i = 0; i < n; i += 1) {
    const x = (r() - 0.5) * wd * (i < n / 2 ? 1 : 0.65)
    const hh = h * (0.45 + 0.55 * r()) * (i < n / 3 ? 1.1 : 0.9)
    const lean = (r() - 0.42) * hh * 0.75
    const k = Math.min(tones.length - 1, Math.floor((i / n) * tones.length))
    ;(by[k] as string[]).push(blade(x, 0, hh, bw * (0.7 + r() * 0.6), lean, n0))
    if (fr && i % 2) fs += `M${J([x + lean, -hh])}l${J([-lean * 0.3, hh * 0.3])}`
  }
  return by.map((ds, i) => (ds.length ? P(tones[i] as string, ds.join('')) : '')).join('') + (fs ? P('z3', fs) : '')
}
const pickW = (r: () => number, ids: string[], w: number[]) => {
  let t = r() * w.reduce((a, b) => a + b, 0)
  for (let i = 0; i < ids.length; i += 1) {
    t -= w[i] ?? 0
    if (t <= 0) return ids[i] as string
  }
  return ids[ids.length - 1] as string
}
const anim = (cls: string, ctx: Ctx, per: number, off: number) => `class="${cls}" style="--a:-${((((ctx.now / 1000 + off) % per) + per) % per).toFixed(1)}"`
/** Bezier bậc 3. */
const bz = (p: Pt[], t: number): Pt => {
  const u = 1 - t
  const [a, b, c, d] = p as [Pt, Pt, Pt, Pt]
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t] as const
  return [a[0] * k[0] + b[0] * k[1] + c[0] * k[2] + d[0] * k[3], a[1] * k[0] + b[1] * k[1] + c[1] * k[2] + d[1] * k[3]]
}

type Bin = { svg: string[]; glow: string[] }
type Inst = [number, number, string]
type Pt3 = [number, number, number]

function build(ctx: Ctx) {
  const S = ctx.season
  const lite = ctx.detail === 'lite'
  const R = (k: string) => ctx.rng(`canh-dong-hoa-${k}`)
  const day = ctx.daylight
  const wind = ctx.cur.wind
  const cloud = ctx.cur.cloud
  const raining = ctx.cur.precip === 'mua' || ctx.cur.precip === 'mua-to' || ctx.cur.precip === 'phun'
  const snow = ctx.cur.precip === 'tuyet'
  const wet = ctx.wet > 0.25 || raining
  const dong = S === 'dong'
  const frost = dong && (ctx.vn.hourF < 9.5 || ctx.vn.hourF > 19)
  const sunny = day > 0.3 && !raining && !snow && (cloud === 'quang' || cloud === 'it' || cloud === 'vua')
  /** phía nắng: −1 = trái (sáng), +1 = phải (chiều). */
  const sx = ctx.vn.hourF < 12 ? -1 : 1
  const O = ({ xuan: 'thu', ha: 'dong', thu: 'xuan', dong: 'ha' } as const)[S]
  // bảng hoa mùa: nền vệt màu · hoa chính · hoa phụ/đốm · nhuỵ · bông lau · ngọn cỏ
  const FA = { xuan: 'f3', ha: 'e1', thu: 'f1', dong: 'd1' }[S]
  const FB2 = { xuan: 'f1', ha: 'f2', thu: 'f3', dong: 'b3' }[S]
  const FC = S === 'xuan' ? 'e1' : 'b2'
  const PLU = { xuan: 'l1', ha: 'b3', thu: 'f3', dong: 'p3' }[S]
  const TIP = dong ? 'b3' : 'g1'

  // ═════════════ DEFS ═════════════
  const rd = R('defs')
  let defs = ''
  defs += `<g id="cdh-ta">${tuft(rd, 9, 26, 24, ['g4', 'g3', TIP], 1.3, frost)}</g>`
  defs += `<g id="cdh-tb">${tuft(rd, 14, 48, 48, ['g4', 'g3', 'g2', TIP], 1.8)}${dong ? tuft(rd, 5, 44, 54, ['d1'], 1.2) : ''}</g>`
  defs += `<g id="cdh-tf">${tuft(rd, 12, 140, 130, ['g4', 'l4', 'g3'], 4)}</g>`
  const flowers = (n: number, wd: number, h: number, rr: number, petals: boolean) => {
    let st = ''
    let heads = ''
    let acc = ''
    let ctr = ''
    for (let i = 0; i < n; i += 1) {
      const x = n0((rd() - 0.5) * wd)
      const hh = n0(h * (0.5 + rd() * 0.5))
      const tx = x + n0((rd() - 0.5) * h * 0.35)
      st += `M${J([x, 0])}q${J([(tx - x) * 0.1, -hh * 0.6, tx - x, -hh])}`
      const rad = rr * (0.75 + rd() * 0.5)
      const head = bb(tx, -hh, rad, rad * 0.72, rd, petals ? 7 : 5, petals ? 0.45 : 0.2)
      if (i % 3 === 2) acc += head
      else heads += head
      if (petals && !dong) ctr += `M${J([tx - 1, -hh - 1])}h2v2h-2z`
    }
    return P('cdh-st', st) + P(FA, heads) + (acc ? P(FB2, acc) : '') + (ctr ? P(FC, ctr) : '')
  }
  defs += `<g id="cdh-fa">${flowers(5, 20, 24, 2.6, false)}</g>`
  defs += `<g id="cdh-fb">${flowers(6, 34, 46, 4.4, true)}</g>`
  {
    let pt = ''
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * 6.283 + 0.3
      pt += lf(Math.cos(a) * 2, Math.sin(a) * 1.6, Math.cos(a) * 10, Math.sin(a) * 8)
    }
    defs += `<g id="cdh-fx">${P('cdh-pe', 'M0 60q-4-30 2-58')}${dong ? P('b3', 'M-5 0q5-9 10 0-5 6-10 0z') : P(FA, pt) + P('hl', pt) + P(FC, 'M-3 0a3 2.6 0 1 0 6 0 3 2.6 0 1 0-6 0z')}</g>`
  }
  // lau: 3 thân cong, bông lông vũ rủ xuôi gió
  {
    let st = ''
    let pm = ''
    for (let i = 0; i < 3; i += 1) {
      const x = (i - 1) * 6
      const h = 66 + i * 9 - (i === 1 ? 0 : 8)
      const tx = x + 10 + i * 3
      st += `M${J([x, 0])}q${J([2, -h * 0.6, tx - x, -h])}`
      for (let k = 0; k < 6; k += 1) {
        const L = (S === 'thu' ? 18 : 14) * (1 - Math.abs(k - 3) * 0.12)
        const a = -1.25 + k * 0.34
        pm += `M${J([tx, -h + k * 1.3])}q${J([Math.cos(a) * L * 0.6, Math.sin(a) * L * 0.6 - 4, Math.cos(a) * L, Math.sin(a) * L + L * 0.55])}`
      }
    }
    defs += `<g id="cdh-ld">${P('cdh-st', st)}<path class="cdh-pl" d="${pm}"/></g>`
  }
  // cụm (symbol TĨNH); chỉ cây chủ lắc qua <g> bọc ngoài <use>
  const CL: [string, boolean, [string, number, number, number][]][] = [
    ['n0', false, [['tb', -14, 0, 1.1], ['tb', 10, 3, 0.8], ['fa', 0, 4, 1.25]]],
    ['n1', true, [['tb', -6, 0, 1], ['fb', 8, 2, 1.3], ['ta', -16, 4, 1.2]]],
    ['n2', true, [['ld', -10, 0, 1.2], ['ld', 6, 3, 1.5], ['tb', -2, 5, 0.9]]],
    ['n3', false, [['fb', -10, 0, 1.2], ['fa', 8, 2, 1.4], ['fb', 16, 3, 0.9], ['ta', 0, 4, 1.2]]],
    ['n4', true, [['tb', -10, 0, 1.5], ['ld', 6, 2, 1.15], ['fb', -2, 4, 1]]],
    ['s0', false, [['ta', 0, 0, 1]]],
    ['s1', false, [['fa', 0, 0, 1]]],
    ['s2', false, [['tb', 0, 0, 0.85]]],
  ]
  const SW = new Map<string, [string, number]>()
  for (const [id, tall, parts] of CL) {
    const inner = parts.map(([s, x, y, k]) => (k === 1 ? U(s, x, y) : `<use href="#cdh-${s}" transform="translate(${x} ${y})scale(${k})"/>`)).join('')
    SW.set(id, [tall ? 'cdh-w' : 'cdh-v', n1(rd() * 2.5)])
    defs += `<g id="cdh-${id}">${inner}</g>`
  }
  for (let i = 0; i < 4; i += 1) defs += `<g id="cdh-m${i}"><use href="#cdh-n${i}" transform="scale(.6)"/></g>`

  // ô hoa văn: vân cỏ (149×36, tương phản thấp) · thảm đốm hoa (97×31)
  const rp = R('pat')
  {
    const t: string[] = ['', '']
    for (let i = 0; i < 6; i += 1) {
      const bx = 6 + rp() * 137
      const by = 12 + rp() * 24
      for (let k = 0; k < 3; k += 1) {
        const h = 5 + rp() * 6
        const ln = (k - 0.9 + (rp() - 0.5) * 0.8) * h * 0.42
        ;(t[k % 2] as string) += blade(bx + k * 1.4 - 1.4, by, h, 0.55 + rp() * 0.4, ln)
      }
    }
    defs += `<pattern id="cdh-pg" width="149" height="36" patternUnits="userSpaceOnUse">${P('g4', t[0] as string, ' opacity=".35"')}${P(dong ? 'b3' : 'g2', t[1] as string, ' opacity=".4"')}</pattern>`
    let fa = ''
    let fb = ''
    let hl = ''
    for (let c = 0; c < 11; c += 1) {
      const cx = rp() * 90 + 3
      const cy = rp() * 22 + 5
      for (let i = 0; i < 4; i += 1) {
        const x = cx + (rp() - 0.5) * 9
        const y = cy + (rp() - 0.5) * 5
        const rr = 1.3 + rp() * 1.2
        const s = `M${J([x, y], n1)}a${n1(rr)} ${n1(rr * 0.75)} 0 1 0 .1 0z`
        if (c % 3 === 2) fb += s
        else fa += s
        if (i === 0) hl += `M${J([x - rr * 0.4, y - rr * 0.6], n1)}h.8v.8h-.8z`
      }
    }
    defs += `<pattern id="cdh-pf" width="97" height="31" patternUnits="userSpaceOnUse">${P(dong ? 'w3' : FA, fa)}${P(FB2, fb)}${P('w3', hl)}</pattern>`
  }
  // ô kế thừa (href) viết thẻ đóng tường minh (bộ dò hiddenAnim của lõi không nhận <pattern …/> tự đóng)
  ;[0.7, 1.25, 2.2].forEach((s, i) => (defs += `<pattern id="cdh-q${i}" href="#cdh-pf" x="${i * 31}" patternTransform="scale(${s})"></pattern>`))
  ;[1, 1.6, 2.4].forEach((s, i) => (defs += `<pattern id="cdh-r${i}" href="#cdh-pg" x="${i * 41}" patternTransform="scale(${s})"></pattern>`))
  const lg = (id: string, y1: number, y2: number, stops: [number, string, number?][]) =>
    `<linearGradient id="cdh-${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y1}" x2="0" y2="${y2}">${stops.map(([f, c, o]) => `<stop offset="${f}" style="stop-color:var(--${c})"${o === undefined ? '' : ` stop-opacity="${o}"`}/>`).join('')}</linearGradient>`
  defs += lg('fg', 764, 1040, [[0, 'g2'], [0.3, 'g2'], [1, 'g3']])
  // thân 3 lớp đồng: xa ngả sương, giữa trung tính, gần tối dần xuống
  defs += lg('G0', 778, 850, [[0, 'g2'], [1, 'g3']]) + lg('G1', 812, 960, [[0, 'g2'], [0.5, 'g2'], [1, 'g3']]) + lg('G2', 905, 1040, [[0, 'g3'], [0.5, 'g4'], [1, 'g4']])
  defs += lg('hz', 772, 846, [[0, 'haze', 0.5], [1, 'haze', 0]])
  defs += lg('kn', 752, 856, [[0, 'g1'], [0.5, 'g2'], [1, 'g3']])
  const rg = (id: string, c: string, o: number) => `<radialGradient id="cdh-${id}"><stop offset="0" style="stop-color:var(--${c})" stop-opacity="${o}"/><stop offset="1" style="stop-color:var(--${c})" stop-opacity="0"/></radialGradient>`
  defs += rg('vl', dong ? 'b3' : 'g1', 0.32) + rg('vd', 'g4', 0.3)
  defs += lg('hv', -166, 10, [[0, 'haze', 0.42], [1, 'haze', 0.22]])
  // ánh sáng ngang mặt đồng gần: phía nắng sáng ấm, phía kia lạnh tối (lật theo giờ)
  defs += `<linearGradient id="cdh-sl" gradientUnits="userSpaceOnUse" x1="${SHOT.x - sx * 760}" x2="${SHOT.x + sx * 760}" y1="0" y2="0"><stop offset="0" style="stop-color:var(--g4)" stop-opacity=".32"/><stop offset=".55" style="stop-color:var(--g4)" stop-opacity="0"/><stop offset="1" style="stop-color:var(--g1)" stop-opacity="${sunny ? 0.3 : 0.12}"/></linearGradient>`
  defs += `<radialGradient id="cdh-cg"><stop offset="0" style="stop-color:var(--k1)" stop-opacity=".4"/><stop offset="1" style="stop-color:var(--k1)" stop-opacity="0"/></radialGradient>`
  const GP = { dong: [[0, 'k2'], [0.55, 'x2'], [1, 's1']], ha: [[0, 'e3'], [0.7, 'w3'], [1, 'w1']], thu: [[0, 'x2'], [0.55, 'e1'], [1, 'p1']], xuan: [[0, 'e3'], [0.6, 'w3'], [1, 'w1']] }[O] as [number, string][]
  defs += `<linearGradient id="cdh-gp" x2="0" y2="1">${GP.map(([f, c]) => `<stop offset="${f}" style="stop-color:var(--${c})"/>`).join('')}</linearGradient>`

  // ── 3 LỚP ĐỒNG: mép trên gợn nhiễu; khóm lá CÓ CẤP BẬC (cụm cao theo nhiễu, xen quãng trơn); hai đầu vùng chìm về mặt đất lõi
  const env = (x: number) => smooth(X0, X0 + 200, x) * (1 - smooth(X1 - 200, X1, x))
  const vc = (x: number) => (x - SHOT.x) / 727 // −1..1 theo bề ngang khung chính
  const ROLL: { y: (x: number) => number; st: number; sp: number }[] = [
    { y: x => 786 + 7 * Math.sin(x / 260), st: 22, sp: 5 },
    { y: x => 842 + (x - 15200) * 0.035 - 18 * smooth(14700, 15100, x) * (1 - smooth(15100, 15400, x)), st: 12, sp: 16 },
    { y: x => 968 - 64 * vc(x) ** 2 + (x > SHOT.x ? 12 : 0) * smooth(SHOT.x, SHOT.x + 300, x), st: 15, sp: 34 },
  ]
  const rollY = ROLL.map(({ y }, i) => {
    const nz = ctx.noise(`cdh-roll${i}`)
    return (x: number) => {
      const e = env(x)
      return (y(x) + (6 + i * 5) * fbm(nz, x / 230, 0.4 + i, 3) * 2.4) * e + (ground(x) + 58) * (1 - e)
    }
  })
  ROLL.forEach(({ st, sp }, i) => {
    const y = rollY[i] as (x: number) => number
    const r = R(`roll${i}`)
    const nz = ctx.noise(`cdh-tufts${i}`)
    const pts: Pt[] = []
    const step = lite ? st * 1.8 : st
    for (let x = X0; x < X1 - 4; x += step * (0.7 + r() * 0.6)) {
      const yy = y(x)
      const c = clamp(fbm(nz, x / 140, i, 2) * 3.2 + 0.25, 0, 1) * env(x)
      const a = sp * c ** 1.4 * (0.45 + 0.55 * r())
      if (a > 2.5) {
        const ln = (r() - 0.35) * a * 0.5
        pts.push([x - 2, yy], [x + ln, yy - a], [x + 2, yy])
      } else pts.push([x, yy])
    }
    pts.push([X1, y(X1)])
    defs += `<path id="cdh-B${i}" d="${pl(pts, false)}V1120H${X0}z"/>`
  })
  /** Một lớp: bóng tiếp xúc hắt lên lớp sau · viền sáng mép trên · thân gradient · vân cỏ. */
  const roll = (i: number) => {
    const fr = frost && i < 2
    const rim = snow || fr ? 'w3' : 'g1'
    const ro = snow ? 0.9 : fr ? 0.45 : (sunny ? [0.4, 0.35, 0.3] : [0.22, 0.2, 0.18])[i]
    let s = (i ? `<use href="#cdh-B${i}" class="k1" opacity="${i === 2 ? 0.2 : 0.12}" y="-8"/>` : '') + `<use href="#cdh-B${i}" class="${rim}" opacity="${ro}"/><use href="#cdh-B${i}" fill="url(#cdh-G${i})" y="${snow ? 4 : 2}"/>`
    if (!(lite && i === 0)) s += `<use href="#cdh-B${i}" fill="url(#cdh-r${i})" y="2"/>`
    if (snow) s += `<use href="#cdh-B${i}" class="w3" opacity="${[0.8, 0.78, 0.6][i]}" y="5"/>`
    else if (fr) s += `<use href="#cdh-B${i}" class="w3" opacity=".22" y="3"/>`
    if (i) s += `<use href="#cdh-B${i}" fill="url(#cdh-sl)" y="2"/>`
    return s
  }
  // mặt đồng nền
  {
    const pts: Pt[] = []
    for (let x = X0; x < X1; x += 150) pts.push([x, ground(x) + 3])
    pts.push([X1, ground(X1) + 3])
    defs += `<path id="cdh-fd" d="${sr(pts)}L${X1} 1120L${X0} 1120z"/>`
  }
  // DẢI HOA (đường dẫn mắt): ribbon trên mặt đất theo bezier; nửa bề ngang w(t) hẹp dần về xa, mép gợn nhiễu
  const nzr = ctx.noise('cdh-drift')
  const ribbon = (p: Pt[], w0: number, w1: number, t0: number, t1: number, k: number, n: number) => {
    const L: Pt[] = []
    const Rr: Pt[] = []
    for (let j = 0; j <= n; j += 1) {
      const t = t0 + ((t1 - t0) * j) / n
      const [x, y] = bz(p, t)
      const [x2, y2] = bz(p, Math.min(1, t + 0.02))
      const [x1, y1] = bz(p, Math.max(0, t - 0.02))
      const dx = x2 - x1
      const dy = y2 - y1
      const m = Math.hypot(dx, dy) || 1
      const w = (w0 + (w1 - w0) * t ** 0.8) * k
      const a = w * (1 + 0.55 * fbm(nzr, t * 7, 1 + k, 2) * 2)
      const b = w * (1 + 0.55 * fbm(nzr, t * 7, 5 + k, 2) * 2)
      L.push([x - (dy / m) * a, y + (dx / m) * a * 0.45])
      Rr.push([x + (dy / m) * b, y - (dx / m) * b * 0.45])
    }
    return sr([...L, ...Rr.reverse(), L[0] as Pt], true)
  }
  /** Mảng hoa (drift): chuỗi khối hữu cơ dẹt theo mặt đất dọc bezier, có quãng hở theo nhiễu, gần to xa nhỏ. */
  const drift = (key: string, p: Pt[], w0: number, w1: number, t0: number, t1: number, n: number) => {
    const r = R(key)
    let d = ''
    let e = ''
    for (let k = 0; k < n; k += 1) {
      const t = t0 + ((t1 - t0) * (k + r() * 0.6)) / n
      if (fbm(nzr, t * 9, key.length, 2) < -0.12) continue
      const [x, y] = bz(p, t)
      const w = (w0 + (w1 - w0) * t ** 0.8) * (0.55 + r() * 0.6)
      const cx = x + (r() - 0.5) * w * 0.8
      const cy = y + (r() - 0.5) * w * 0.12
      const h = w * (0.2 + r() * 0.1)
      d += bb(cx, cy, w, h, r, 7, 0.35)
      // quầng màu mềm của mảng (gradient tan dần → không mép cứng): xa đọc thành vệt màu, gần làm nền cho bông
      e += `<ellipse cx="${n0(cx)}" cy="${n0(cy)}" rx="${n0(w * 1.25)}" ry="${n0(h * 1.6)}"/>`
    }
    return [d, `<g fill="url(#cdh-dg)">${e}</g>`] as const
  }
  const DT = snow ? 'w3' : { xuan: 'f3', ha: 'e1', thu: 'f2', dong: 'b3' }[S]
  defs += `<radialGradient id="cdh-dg"><stop offset="0" style="stop-color:var(--${DT})" stop-opacity="${dong ? 0.3 : 0.42}"/><stop offset="1" style="stop-color:var(--${DT})" stop-opacity="0"/></radialGradient>`
  const DR: [Pt[], number, number][] = [
    [[[16010, 1036], [15640, 958], [15330, 878], [15078, 838]], 135, 14],
    [[[14470, 1012], [14600, 936], [14760, 896], [14905, 872]], 95, 12],
    [[[15430, 800], [15600, 790], [15780, 796], [15960, 790]], 13, 9],
  ]

  // ═════════════ CSS ═════════════
  const millDur = n0(clamp(28 - wind * 24, 4, 28))
  const base = (p: number) => (((ctx.now / 1000) % p) + 2 * p).toFixed(1)
  let css =
    `.cdh-st{fill:none;stroke:var(--${dong ? 'b3' : 'g3'});stroke-width:1.3;stroke-linecap:round}.cdh-pe{fill:none;stroke:var(--${dong ? 'b2' : 'g4'});stroke-width:3.4;stroke-linecap:round}.cdh-pl{fill:none;stroke:var(--${PLU});stroke-width:${S === 'thu' ? 1.9 : 1.6};stroke-linecap:round;opacity:.72}` +
    `.cdh-w,.cdh-v{transform-origin:0 0;animation:cdh-w 4.4s ease-in-out infinite alternate}.cdh-v{animation:cdh-v 3.5s ease-in-out infinite alternate}` +
    `@keyframes cdh-w{from{transform:rotate(calc(-1deg - var(--wind)*1.5deg))}to{transform:rotate(calc(1.5deg + var(--wind)*7deg))}}` +
    `@keyframes cdh-v{from{transform:rotate(calc(-.7deg - var(--wind)*1deg))}to{transform:rotate(calc(1deg + var(--wind)*4deg))}}` +
    `.cdh-ml{transform-box:fill-box;transform-origin:50% 50%;animation:spin ${millDur}s linear infinite}` +
    `.cdh-mo{animation:cdh-mo 12s linear infinite}@keyframes cdh-mo{from{transform:translate(0,0);opacity:0}15%{opacity:1}to{transform:translate(34px,-120px);opacity:0}}` +
    `.cdh-pt{transform-box:fill-box;animation:cdh-pt 14s linear infinite}@keyframes cdh-pt{from{transform:translate(0,0) rotate(0);opacity:0}10%{opacity:1}75%{opacity:.9}to{transform:translate(calc(150px + var(--wind)*260px),-50px) rotate(520deg);opacity:0}}` +
    `.cdh-cs{animation:cdh-cs 90s linear infinite}@keyframes cdh-cs{from{transform:translateX(-900px)}to{transform:translateX(1500px)}}`
  if (O === 'dong') css += `.cdh-sf{animation:cdh-sf 11s linear infinite}@keyframes cdh-sf{from{transform:translate(0,0);opacity:0}15%{opacity:1}to{transform:translate(calc(50px + var(--wind)*70px),44px);opacity:0}}`
  if (!raining && !snow && wind > 0.2 && (S === 'thu' || S === 'ha'))
    css += `.cdh-fz{animation:cdh-fz 19s linear infinite}@keyframes cdh-fz{from{transform:translate(0,0);opacity:0}12%{opacity:.9}50%{transform:translate(calc(120px + var(--wind)*240px),-60px)}85%{opacity:.8}to{transform:translate(calc(260px + var(--wind)*520px),-34px);opacity:0}}`

  // ═════════════ NGĂN VẼ: tầng × khúc x ═════════════
  // 0 nền · 1 vật xa · 2 đồng xa + sương · 3 gò cửa · 4 đồng giữa · 5 hoa & cụm giữa · 6 đồng gần · 7 hoa & cụm gần
  const BX = [X0, 14850, 15300, 15750, X1]
  const PR = [6, 5, 6, 9, 6, 5, 6, 4]
  const bins: Bin[][] = PR.map(() => BX.slice(0, -1).map(() => ({ svg: [], glow: [] })))
  const wide: string[][] = PR.map(() => [])
  const binOf = (x: number) => clamp(BX.findIndex((b, i) => x >= b && x < (BX[i + 1] ?? 1e9)), 0, 3)
  const put = (stg: number, x: number, s: string, glow = '') => {
    const b = (bins[stg] as Bin[])[binOf(x)] as Bin
    b.svg.push(s)
    if (glow) b.glow.push(glow)
  }
  const W = (stg: number, s: string) => (wide[stg] as string[]).push(s)
  const extra: Piece[] = []
  const spots: Spot[] = []

  // ── 0 NỀN ──
  W(0, `<use href="#cdh-fd" fill="url(#cdh-fg)"/>` + (snow ? `<use href="#cdh-fd" class="w3" opacity=".6"/>` : ''))

  // ── 1 VẬT XA: gò + cối xay gió (chìm sương, viền sáng theo phía nắng) ──
  {
    const mx = 15905
    const pts: Pt[] = []
    for (let x = 15440; x <= 16280; x += 70) pts.push([x, Math.min(ground(x) + 8, 711 + ((x - mx) / 340) ** 2 * 60)])
    const bot = [16280, 16000, 15720, 15440].map(x => `L${x} ${n0(ground(x) + 48)}`).join('')
    defs += `<path id="cdh-md" d="${sr(pts)}${bot}z"/>`
    put(1, mx, `<use href="#cdh-md" class="${snow ? 'w3' : 'g2'}"/><use href="#cdh-md" fill="url(#cdh-r0)"/><use href="#cdh-md" class="g1" opacity=".3" transform="translate(${sx * 4} 3)"/>`)
    const my = 714
    // thân: mặt hướng nắng sáng, mặt kia tối (lật theo giờ)
    const lit = sx < 0 ? 'M-22 0l8-84h9l-4 84z' : 'M22 0l-8-84h-9l4 84z'
    const dk = sx < 0 ? 'M9 0l5-84 8 84z' : 'M-9 0l-5-84-8 84z'
    let m = P('ao', 'M-34 2q34-8 68 0-34 5-68 0z') + P('b2', 'M-22 0l8-84h28l8 84z') + P('hl', lit) + P('sh', dk)
    m += P('k2', 'M-7 0v-14q7-8 14 0v14z') + P('b1', 'M-5-56h10v11h-10z')
    m += P('r2', 'M-19-82q19-34 38 0z') + P('hl', sx < 0 ? 'M-19-82q8-24 19-27v27z' : 'M19-82q-8-24-19-27v27z') + P('m2', cu(-18, -81, 20, 4)) + P('m3', cu(-24, 1, 18, 6))
    if (snow) m += P('w3', 'M-19-82q19-36 38 0q-19-7-38 0z')
    const blade4 = `<path class="p3" d="M2 9h11v54h-11z"/><path class="b1" d="M-1 4h3v60h-3z"/>`
    defs += `<g id="cdh-bl">${blade4}</g>`
    m += `<g transform="translate(0 -88)"><g ${anim('cdh-ml', ctx, millDur, 3)}>${[20, 110, 200, 290].map(a => `<use href="#cdh-bl" transform="rotate(${a})"/>`).join('')}<circle class="b1" r="5"/></g></g>`
    put(1, mx, G(mx, my, m, ' opacity=".85"'), G(mx, my, `<circle fill="url(#gw)" cy="-50" r="30"/><path class="e2" d="M-5-56h10v11h-10z"/>`))
    spots.push({ kind: 'perch', layer: 3, x: mx, y: my - 110, s: 0.6 })
    // vệt hoa xa trên sườn đồng (màu mịn, không bông)
    const [fp, f0, f1] = DR[2] as [Pt[], number, number]
    const d = ribbon(fp, f0, f1, 0, 1, 1, lite ? 6 : 10)
    if (!dong || !snow) put(1, 15700, P(DT, d, ' opacity=".3"') + (lite ? '' : `<path fill="url(#cdh-q0)" opacity=".7" d="${d}"/>`))
  }

  // ── 2 ĐỒNG XA + dải sương bám mép (thuôn về 0 ở hai đầu vùng → không mép cứng) ──
  W(2, roll(0))
  {
    const y0 = rollY[0] as (x: number) => number
    const top: Pt[] = []
    const bot: Pt[] = []
    for (let x = X0; x <= X1; x += 120) {
      const e = env(x) ** 1.5
      top.push([x, y0(x) - 6 * e])
      bot.push([x, y0(x) + 58 * e])
    }
    W(2, `<path fill="url(#cdh-hz)" d="${sr([...top, ...bot.reverse(), top[0] as Pt], true)}"/>`)
  }

  // ── 3 GÒ + BỤI + CÁNH CỬA ──
  {
    const rb = R('bush')
    const kt = (x: number) => FB + 104 * (0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.abs(x - DX) / 250)))
    const kn: Pt[] = []
    for (let x = DX - 250; x <= DX + 250; x += 42) kn.push([x, kt(x)])
    let kb = `<path fill="url(#cdh-kn)" d="${sr(kn)}V880H${DX - 250}z"/>`
    // viền sáng phía nắng của gò, bóng lạnh phía kia (lưỡi liềm mỏng bám đỉnh)
    const side = (sg: number) => kn.filter(([x]) => (x - DX) * sg > 10 && Math.abs(x - DX) < 230)
    const cres = (pts: Pt[], d: number) => pl([...pts.map(([x, y]) => [x, y - 0.5] as Pt), ...pts.slice().reverse().map(([x, y]) => [x, y + d * (1 - ((x - DX) / 230) ** 2)] as Pt)])
    kb += P(snow || frost ? 'w3' : 'hl', cres(side(sx), 5), ` opacity="${sunny ? 1 : 0.5}"`) + P('sh', cres(side(-sx), 8))
    if (!lite) kb += `<path fill="url(#cdh-r1)" d="${sr(kn)}V880H${DX - 250}z"/>`
    kb += P('m2', cu(DX - 90, 790, 54, 7)) + P('m1', cu(DX - 78, 787, 24, 4))
    if (snow) kb += P('w3', cres(kn.filter(([x]) => Math.abs(x - DX) < 200), 10), ' opacity=".85"')
    // MỘT khóm cỏ thấp lệch phải-sau cửa (không còn bụi hạt đậu): mép là ngọn cỏ gãy, trị độ sát nền, chỉ chân hơi tối
    const bx = DX + 150
    const by = 800
    let bush = P('ao', `M${bx - 70} ${by + 6}q70-12 140 0-70 8-140 0z`, ' opacity=".3"')
    {
      const pts: Pt[] = []
      for (let i = 0; i <= 22; i += 1) {
        const t = i / 22
        const x = bx - 78 + t * 156
        const h = 22 * Math.sin(Math.PI * t) ** 0.7 * (i % 2 ? 0.55 + rb() * 0.25 : 1 + rb() * 0.35)
        pts.push([x + (i % 2 ? (rb() - 0.3) * 6 : 0), by + 4 - h])
      }
      pts.push([bx + 78, by + 6], [bx - 78, by + 6])
      const mound = pl(pts)
      const tone = dong ? 'd1' : S === 'thu' ? 'g3' : 'g2'
      bush += P(tone, mound, ' opacity=".6"') + P(snow || frost ? 'w3' : 'g1', bb(bx + sx * 22, by - 8, 40, 7, rb, 6, 0.4), ` opacity="${snow ? 0.7 : sunny ? 0.35 : 0.18}"`)
    }
    put(3, DX, bush + kb)
    spots.push({ kind: 'cat-shelter', layer: 3, x: bx - 30, y: by + 8, s: 1 })

    // CÁNH CỬA (gốc = chân khung; khung gỗ MẢNH đứng trơ trọi, không mái; khe = bầu trời mùa đối diện)
    let d = P('ao', 'M-64 7q64-10 128 0-64 9-128 0z')
    d += P('s3', 'M-54 6l4-7h104l6 7-4 4h-106z') + P('s2', 'M-50-1h104l-3 3h-98z') + P('m2', cu(-56, 9, 22, 4) + cu(34, 9, 24, 4))
    if (sunny) {
      const s = sx < 0 ? 1 : -1 // bóng đổ ngược phía nắng, về phía người xem
      const L = clamp(36 / Math.max(ctx.sunAlt, 0.15), 36, 200)
      const q = (a: number, b: number, v0: number, v1: number): Pt[] => [[a + s * L * v0, 2 + L * 0.36 * v0], [b + s * L * v0, 2 + L * 0.36 * v0], [b + s * L * v1, 2 + L * 0.36 * v1], [a + s * L * v1, 2 + L * 0.36 * v1]]
      d += P('k1', pl(q(-42, -36, 0, 1)) + pl(q(36, 42, 0, 1)) + pl(q(-42, 42, 0.95, 1)), ` opacity="${(0.28 * clamp(day, 0, 1) * (cloud === 'vua' ? 0.55 : 1)).toFixed(2)}"`)
    }
    const LS = {
      dong: P('s1', 'M0-36q16-12 36-14v50h-36z') + P('w3', 'M0-14q18-4 36-2v16h-36z') + P('k2', 'M20-22l4-15 4 15zM27-19l3-10 3 10z'),
      ha: `<circle class="e2" cx="24" cy="-118" r="4"/>` + P('e4', 'M0-34q18-12 36-10v44h-36z', ' opacity=".7"') + P('e4', 'M0-13q18-4 36-2v15h-36z'),
      thu: `<circle class="e2" cx="22" cy="-40" r="8"/>` + P('e1', 'M0-30q18-10 36-8v38h-36z', ' opacity=".85"') + P('x1', 'M0-12q18-4 36-2v14h-36z'),
      xuan: P('e4', 'M0-34q18-12 36-10v44h-36z', ' opacity=".6"') + P('e4', 'M0-13q18-4 36-2v15h-36z') + P('p1', 'M14-31a4 3 0 1 0 .1 0zM27-27a3 2 0 1 0 .1 0z', ' opacity=".7"'),
    }[O]
    if (O === 'dong') defs += `<path id="cdh-lt" class="e2" d="M8-134h2v2h-2zM28-112h1.6v1.6h-1.6zM12-92h1.4v1.4h-1.4zM30-72h1.4v1.4h-1.4z"/>`
    defs += `<g id="cdh-ls">${LS}</g>`
    const ls = `<use href="#cdh-ls"/>` + (O === 'dong' ? `<g class="tw"><use href="#cdh-lt"/></g>` : '')
    d += `<path fill="url(#cdh-gp)" d="M-36-150h72v150h-72z"/>${ls}`
    // khung gỗ mảnh: 2 trụ + lanh tô mỏng sứt; viền sáng phía nắng, bóng phía kia
    d += P('b2', 'M-42 0v-152h6v152zM36 0v-152h6v152zM-48-158l2-6h40l3 2 3-2h46l2 6z')
    const rimL = sx < 0 ? -42 : -37.5
    const rimR = sx < 0 ? 36 : 40.5
    d += P('hl', `M${rimL} 0v-152h1.5v152zM${rimR} 0v-152h1.5v152zM-48-164h96v2h-96z`) + P('hl', `M${rimL} 0v-152h1.5v152zM${rimR} 0v-152h1.5v152z`)
    d += P('sh', `M${sx < 0 ? -37.5 : -42} 0v-152h1.5v152zM${sx < 0 ? 40.5 : 36} 0v-152h1.5v152zM-36-152h72v4h-72z`)
    // cánh mở về phía người xem (bản lề trụ trái), thấy độ dày, sơn đỏ bạc tróc lộ gỗ
    d += P('k1', 'M-36 0l32 8 6 4-36-10z', ' opacity=".3"') + P('b2', 'M-36-150l32-9v168l-32-8z') + P('p1', 'M-36-146l32-8v80l-32 4zM-36-50l32-2v50l-32-4z', ' opacity=".32"') + P('b3', 'M-4-159l4 1v166l-4 1z')
    d += P(sx > 0 ? 'hl' : 'sh', 'M-36-150l32-9v168l-32-8z')
    d += P('hl', 'M-36-124l32-6v6l-32 6zM-36-26l32 4v6l-32-4zM-34-32l28-90v8l-26 86z') + P('sh', 'M-36-118l32-6v2l-32 6zM-36-20l32 4v2l-32-4z')
    if (!lite) d += P('z2', 'M-26-153v158M-16-156v162', ' opacity=".3"')
    d += P('b1', 'M-20-142a5 7 0 1 1-.1 0z') + P('e2', 'M-20-140a3.6 5 0 1 1-.1 0z', ' opacity=".85"') + `<circle class="x1" cx="-9" cy="-70" r="2.2"/>`
    // rêu: chân trụ, mũ rêu trên lanh tô rủ xuống
    d += P('m2', cu(-50, 1, 16, 12) + cu(34, 1, 14, 9) + cu(4, -164, 30, 4)) + P('m1', cu(-50, -164, 40, 5) + 'M-44-160q2 10 1 15 2-7 4-15z')
    if (snow) d += P('w3', 'M-50-164q4-5 50-5t50 5q-50-3-100 0zM-54 0q54-6 108 0-54 2-108 0z')
    if (frost) d += P('w3', 'M-52-1h104l-2 2h-100z', ' opacity=".6"')
    if (!lite) {
      const ri = R('ivy')
      let lv = ''
      const nLeaf = dong ? 2 : 5
      for (let i = 0; i < nLeaf; i += 1) {
        const t = i / nLeaf
        lv += lf(39 + Math.sin(t * 9) * 4, -t * 150, (i % 2 ? 1 : -1) * (6 + ri() * 3), -3 + ri() * 6)
      }
      d += P('z2', 'M39 2q7-30-2-60q-6-36 3-80', ' opacity=".5"') + P(dong ? 'd1' : 'l3', lv)
    }
    // mùa bên kia rò ra bậc thềm
    d += P(O === 'dong' ? 'e3' : 'e2', 'M-2 0h37l42 34h-80z', ' opacity=".18"')
    d += { dong: P('w3', 'M-1 1h37l4 3h-42z', ' opacity=".6"'), ha: P('e4', 'M-1 1h37l4 3h-42z', ' opacity=".55"'), thu: P('x1', lf(6, 4, 7, -2) + lf(22, 6, -6, -3)), xuan: P('w3', 'M8 3h2v1h-2zM20 5h2v1h-2zM30 2h2v1h-2z') }[O]
    let fx = ''
    let motes = ''
    if (!lite) {
      motes += `<circle ${anim('cdh-mo e2', ctx, 12, 0)} cx="14" cy="-40" r="1.6"/>`
      if (O === 'dong') for (let i = 0; i < 2; i += 1) fx += `<circle ${anim('cdh-sf w3', ctx, 11, i * 3.7)} cx="${8 + i * 10}" cy="${-108 + i * 34}" r="1.5"/>`
      else if (!raining && !snow) for (let i = 0; i < 2; i += 1) fx += `<path ${anim(`cdh-pt ${{ ha: 'f2', xuan: i ? 'p1' : 'w3', thu: i ? 'e1' : 'x1' }[O]}`, ctx, 14, i * 4.7)} d="M18 ${-34 - i * 40}q3-3 6 0-3 3-6 0z"/>`
    }
    // màn sương phủ cả cửa: hạ tương phản & bão hoà để tiêu điểm TRẦM (giữa khung phải yên)
    d += `<path fill="url(#cdh-hv)" d="M-42-158h84v158h-84zM-48-164h96v6h-96z"/>`
    const doorGlow =
      `<circle fill="url(#gw)" cx="16" cy="-70" r="60" opacity=".55"/><ellipse fill="url(#gw)" cx="30" cy="30" rx="90" ry="16" opacity=".6"/><path fill="url(#cdh-gp)" opacity=".55" d="M0-150h36v150h-36z"/>${ls}` +
      `<path fill="url(#gw)" d="M-2 0h37l70 40h-110z"/><path class="e2" d="M-20-140a3.6 5 0 1 1-.1 0z"/>` + motes
    const tf = `<g transform="translate(${DX} ${FB})scale(${DS})">`
    put(3, DX, tf + d + fx + '</g>', tf + doorGlow + '</g>')
    spots.push({ kind: 'butterflies', layer: 3, x: DX + 40, y: FB - 40, w: 260 })
    spots.push({ kind: 'perch', layer: 3, x: DX - 30, y: FB - 178, s: 0.6 })
  }

  // ── 4 ĐỒNG GIỮA ──
  W(4, roll(1))
  // vân mảng lớn của mặt đồng: vệt nắng sáng & trũng tối mềm (tương phản thấp) — không thêm vật
  if (!snow && !lite) {
    let v = ''
    for (const [x, y, w] of [[14720, 902, 260], [15380, 924, 330], [15930, 896, 230]] as Pt3[]) v += `<ellipse fill="url(#cdh-vl)" cx="${x}" cy="${y}" rx="${w}" ry="${n0(w * 0.14)}" opacity="${sunny ? 0.7 : 0.35}"/>`
    for (const [x, y, w] of [[15060, 952, 300], [15700, 958, 250]] as Pt3[]) v += `<ellipse fill="url(#cdh-vd)" cx="${x}" cy="${y}" rx="${w}" ry="${n0(w * 0.13)}" opacity=".5"/>`
    W(4, v)
  }

  // cụm theo ngưỡng nhiễu, rải theo độ sâu (spread lớn → không thành hàng)
  const nzd = ctx.noise('cdh-dense')
  const CX = 14955
  const CY = 862
  const catGrass = S === 'xuan' || S === 'ha'
  const placeRow = (key: string, yOf: (x: number) => number, spread: number, ids: string[], wts: number[], singles: string[], boost: (x: number) => number, gap: number) => {
    const r = R(key)
    const out: Inst[] = []
    for (let x = X0 + 24; x < X1 - 24; x += gap * (0.7 + r() * 0.6)) {
      const dn = fbm(nzd, x / 260, key.length * 1.3, 3) * 2.6 + boost(x)
      if (dn < -0.3) continue
      for (let j = 0; j < (dn > 0.6 ? 2 : 1); j += 1) {
        const xx = x + j * (r() - 0.5) * 40
        const y = yOf(xx) + r() * spread
        if (Math.abs(xx - CX) < 80 && Math.abs(y - CY) < 26) continue
        if (dn > 0.15) out.push([xx, y, pickW(r, ids, wts)])
        else if (r() < 0.35) out.push([xx, y, singles[Math.floor(r() * singles.length)] as string])
      }
    }
    return out
  }
  const sway = (id: string, x: number, y: number) => {
    const sw = SW.get(id)
    if (!sw) return U(id, x, y)
    const [cls, o] = sw
    const a = n1((x - X0) / 225) * 0.93 + o - Number(base(cls === 'cdh-w' ? 8.8 : 7))
    return G(x, y, `<g class="${cls}" style="--a:${a.toFixed(3)}"><use href="#cdh-${id}"/></g>`)
  }
  const emit = (stg: number, list: Inst[], hero: Set<Inst> = new Set()) => {
    const byB = new Map<number, Inst[]>()
    for (const it of list) byB.set(binOf(it[0]), [...(byB.get(binOf(it[0])) ?? []), it])
    for (const items of byB.values()) put(stg, (items[0] as Inst)[0], items.sort((a, b) => a[1] - b[1]).map(it => (hero.has(it) ? sway(it[2], it[0], it[1]) : U(it[2], it[0], it[1]))).join(''))
  }
  const NW = { xuan: [2, 3, 0.4, 2.5, 0.6], ha: [2, 2.5, 0.8, 2.5, 0.8], thu: [1.5, 0.8, 4, 0.8, 2.5], dong: [4, 0.2, 3, 0.2, 1.5] }[S]
  const MW = { xuan: [3, 3, 0.4, 2.5], ha: [3, 2.5, 0.8, 2.5], thu: [2.5, 1, 3.5, 0.8], dong: [4, 0.2, 3, 0.2] }[S]
  const ry = (i: number) => rollY[i] as (x: number) => number
  /** bông thật trong phần gần của dải hoa (mật độ theo độ sâu). */
  const heads = (key: string, p: Pt[], w0: number, w1: number, t1: number, n: number, ids: string[]) => {
    const r = R(key)
    const out: Inst[] = []
    for (let i = 0; i < n; i += 1) {
      const t = (r() * r()) * t1
      const [x, y] = bz(p, t)
      const w = (w0 + (w1 - w0) * t ** 0.8) * (r() * 1.6 - 0.8)
      out.push([x + w, y + w * 0.12, ids[Math.floor(r() * ids.length)] as string])
    }
    return out
  }

  // ── 5 DẢI HOA (phần giữa/xa) + khoảnh cỏ mèo + cụm trên đồng giữa + diều ──
  {
    const [p0, a0, b0] = DR[0] as [Pt[], number, number]
    const [p1, a1, b1] = DR[1] as [Pt[], number, number]
    for (const [p, a, b, x] of [[p0, a0, b0, 15500], [p1, a1, b1, 14700]] as [Pt[], number, number, number][]) {
      const [dd, de] = drift(`dm${x}`, p, a, b, 0.3, 1, lite ? 6 : 14)
      defs += `<path id="cdh-dm${x}" d="${dd}"/>`
      put(5, x, de + (snow ? `<use href="#cdh-dm${x}" class="w3" opacity=".25"/>` : `<use href="#cdh-dm${x}" fill="url(#cdh-q1)"/>`))
    }
    const rc = R('cat')
    if (catGrass) {
      let g = ''
      for (let i = 0; i < 7; i += 1) {
        const a = (i / 7) * 6.283 + rc() * 0.3
        g += lf(CX + Math.cos(a) * 16, CY + Math.sin(a) * 4, Math.cos(a) * (28 + rc() * 12), Math.sin(a) * (6 + rc() * 3) + 1.5)
      }
      put(5, CX, P('g2', g, ' opacity=".7"'))
    } else if (snow || frost) put(5, CX, P('w3', bb(CX, CY, 34, 6, rc, 6, 0.2), ` opacity="${snow ? 0.6 : 0.4}"`))
    spots.push({ kind: 'cat', layer: 3, x: CX, y: CY, s: 1 })

    emit(5, placeRow('mid', x => ry(1)(x) + 4, 46, ['m0', 'm1', 'm2', 'm3'], MW, ['s0', 's1'], x => (x < DX && x > DX - 230 ? 0.4 : 0) + (x < 14700 || x > 15800 ? 0.3 : x > DX ? -0.45 : -0.2), lite ? 180 : 90))

    // diều: chỉ khi có gió (hạ/thu, ngày, khô ráo) — cọc giữa đồng, dây chéo lên trời phải
    const fly = (S === 'ha' || S === 'thu') && wind > 0.3 && day > 0.5 && !raining && !snow
    if (fly) {
      const kx = 15560
      const ky = 900
      const ex = 190
      const ey = -560
      const kite = P('p3', 'M0-26l20 19-20 29-20-29z') + P('p1', 'M0-26v19h-20zM0-7h20l-20 29z') + P('sh', 'M0-26l20 19-20 29z') + P('z2', 'M0-26v48M-20-7h40', ' opacity=".7"')
      const tail = `<g transform="translate(${ex} ${ey + 22})"><g ${anim('cdh-tl', ctx, 3.4, 1)}><path class="cdh-rb" d="M0 0q-10 20 4 40t-6 44q-8 22 6 44t-4 40"/></g></g>`
      let k = P('ao', 'M-10 0q10-5 20 0-10 4-20 0z') + P('b2', 'M-3 0l1-40h4l1 40z')
      k += `<g ${anim('cdh-k', ctx, 16, 2)}><path class="cdh-str" d="M0-30Q${n0(ex * 0.72)} ${n0(ey * 0.33)} ${ex} ${ey + 20}"/>${tail}${G(ex, ey, kite)}</g>`
      css += `.cdh-str{fill:none;stroke:var(--p3);stroke-width:.8;opacity:.8}.cdh-rb{fill:none;stroke:var(--p1);stroke-width:1.8;stroke-linecap:round}.cdh-k{animation:cdh-k 8s ease-in-out infinite alternate}@keyframes cdh-k{from{transform:rotate(-2deg)}to{transform:rotate(calc(1deg + var(--wind)*3deg))}}.cdh-tl{animation:cdh-tl 1.7s ease-in-out infinite alternate}@keyframes cdh-tl{from{transform:rotate(-7deg)}to{transform:rotate(9deg)}}`
      put(5, kx, G(kx, ky, k))
    }
    if (!lite && sunny && cloud !== 'quang') put(5, 15300, `<ellipse ${anim('cdh-cs', ctx, 90, 0)} fill="url(#cdh-cg)" cx="14900" cy="890" rx="430" ry="70" opacity=".4"/>`)
  }

  // ── 6 ĐỒNG GẦN ──
  W(6, roll(2))
  // vân mảng lớn của đồng gần: một vệt nắng phía mặt trời, hai trũng tối mềm phía kia — chuyển sắc theo đồi, không thêm vật
  if (!snow) {
    const e = (g: string, x: number, y: number, rx: number, ry: number, o: number) => `<ellipse fill="url(#cdh-${g})" cx="${n0(x)}" cy="${y}" rx="${rx}" ry="${ry}" opacity="${o}"/>`
    W(6, e('vl', SHOT.x + sx * 420, 1000, 340, 40, sunny ? 1 : 0.45) + e('vd', SHOT.x - sx * 380, 1022, 400, 46, 1) + e('vd', SHOT.x + sx * 80, 1060, 520, 40, 0.8))
  }

  // ── 7 DẢI HOA (phần gần, bông thật) + cụm gần + bông bay ──
  {
    const [p0, a0, b0] = DR[0] as [Pt[], number, number]
    const [p1, a1, b1] = DR[1] as [Pt[], number, number]
    for (const [p, a, b, x] of [[p0, a0, b0, 15800], [p1, a1, b1, 14560]] as [Pt[], number, number, number][]) {
      const [dd, de] = drift(`dn${x}`, p, a, b, 0, 0.42, lite ? 3 : 8)
      defs += `<path id="cdh-dn${x}" d="${dd}"/>`
      put(7, x, de.replace('<g ', '<g opacity=".55" ') + (snow ? `<use href="#cdh-dn${x}" class="w3" opacity=".25"/>` : `<use href="#cdh-dn${x}" fill="url(#cdh-q2)"/>`))
    }
    const fl = dong ? ['s2', 's0'] : S === 'thu' ? ['s1', 'n2', 'n3'] : ['s1', 'n3', 's1']
    const hs = [...heads('h0', p0, a0, b0, 0.45, lite ? 6 : 17, fl), ...heads('h1', p1, a1, b1, 0.45, lite ? 3 : 8, fl)]
    const nearL = placeRow('near', x => ry(2)(x) + 4, 40, ['n0', 'n1', 'n2', 'n3', 'n4'], NW, ['s2', 's0', 's1'], x => (x < 14720 || x > 15820 ? 0.6 : Math.abs(x - SHOT.x) < 300 ? -0.5 : 0), lite ? 170 : 76)
    const all = [...nearL, ...hs]
    const best = new Map<number, Inst>()
    for (const it of nearL) {
      const sl = Math.floor((it[0] - X0) / 180)
      if (SW.has(it[2]) && it[1] > (best.get(sl)?.[1] ?? 0)) best.set(sl, it)
    }
    const n7 = (bins[7] as Bin[]).map(b => b.svg.length)
    emit(7, all, new Set(best.values()))
    if (wet) (bins[7] as Bin[]).forEach((b, i) => { const k = n7[i] as number; if (b.svg.length > k) b.svg.splice(k, b.svg.length - k, `<g opacity=".55">${b.svg.slice(k).join('')}</g>`) })
    if (!lite && !raining && !snow && wind > 0.2 && (S === 'thu' || S === 'ha')) {
      const rz = R('fluff')
      let dots = ''
      for (let i = 0; i < 6; i += 1) dots += `M${J([14500 + rz() * 1500, 760 + rz() * 160])}h2.4v2.4h-2.4z`
      put(7, 15200, `<path ${anim('cdh-fz f3', ctx, 19, 0)} d="${dots}"/>`)
    }
  }

  // ── lớp 4: khung tối ở hai góc dưới (cỏ + một ngọn hoa/lau), chừa giữa & chỗ mèo ──
  if (!lite) {
    const rf4 = R('fore')
    const b4 = SHOT.x * 1.35
    for (const xs of [[10, 300], [1360, 1590]]) {
      let fg = ''
      for (const sxp of xs) {
        const x = n0(b4 + (sxp - 800) / SHOT.z)
        const y = n0(1050 + rf4() * 24)
        fg += U('tf', x, y)
        if (sxp === 300 || sxp === 1360) fg += S === 'thu' || dong ? `<use href="#cdh-ld" transform="translate(${x + 20} ${y - 10}) scale(1.45)" opacity=".42"/>` : `<use href="#cdh-fx" transform="translate(${x + 26} ${y - 120}) scale(1.6)"/>`
      }
      extra.push({ layer: 4, x0: n0(b4 + ((xs[0] as number) - 800) / SHOT.z) - 120, x1: n0(b4 + ((xs[1] as number) - 800) / SHOT.z) + 120, prio: 2, svg: fg })
    }
  }

  spots.push({ kind: 'fireflies', layer: 3, x: 14950, y: 840, w: 420 })
  spots.push({ kind: 'fireflies', layer: 3, x: 15650, y: 860, w: 420 })
  spots.push({ kind: 'butterflies', layer: 3, x: 15560, y: 880, w: 300 })

  const pieces: Piece[] = []
  PR.forEach((prio, s) => {
    const w = wide[s] as string[]
    if (w.length) pieces.push({ layer: 3, x0: X0 - 80, x1: X1 + 80, prio: 6, svg: w.join('') })
    ;(bins[s] as Bin[]).forEach((b, i) => {
      if (!b.svg.length && !b.glow.length) return
      const p: Piece = { layer: 3, x0: (BX[i] as number) - 150, x1: (BX[i + 1] as number) + 150, prio, svg: b.svg.join('') }
      if (b.glow.length) p.glow = b.glow.join('')
      pieces.push(p)
    })
  })
  pieces.push(...extra)
  css += `[style^="--a:"]{animation-delay:calc(var(--a)*1s - var(--t)*1s)}`
  return { pieces, spots, defs, css }
}

export const region: Region = {
  id: 'canh-dong-hoa',
  name: 'Cánh đồng hoa',
  x0: X0,
  x1: X1,
  shots: [{ id: 'canh-dong-hoa', name: 'Cánh đồng hoa', x: SHOT.x, y: SHOT.y, zoom: SHOT.z }],
  build,
}
