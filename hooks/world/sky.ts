// TRỜI — bầu trời sống theo giờ thật Việt Nam (Hà Nội 21°B).
// KHỐI (trời chiếm 40–55% khung, nằm ngay sau cột chat → nó quyết định cảm giác "yên"; mọi cảnh đọc thành ≤ 3 mảng):
//  · Cột giữa (x 400–1200 màn hình) = MỘT mảng trời trơn: chỉ gradient, mây xa nhỏ-nhạt ngả màu trời & sương, vân mây ti mảnh.
//    Mây khối lớn tương phản nhất (tầng gần) đặt theo MÀN HÌNH, chỉ ở hai dải mép trái/phải, treo từ mép trên xuống — khung
//    viền tranh, không bao giờ trôi vào cột giữa (hiện ở mép trong, tan trước khi chạm cột giữa).
//  · ho-sen: [1] trời sáng-trơn (đỉnh đậm → chân trời sương) là mảng lớn nhất · [2] hai góc trên có mây gần mềm, bụng ngả màu
//    trời · [3] mặt trời/trăng là tiêu điểm phụ trầm (tiêu điểm chính là thuyền & cầu dưới đáy). Đêm: Ngân Hà tương phản rất
//    thấp, khe bụi rẽ nhánh mép mềm, tan về chân trời.
//  · vach-hai-dang: trời + biển là một mảng sáng liền phía phải; đỉnh hải đăng đâm vào trời ở ~62% → quanh đó chỉ trời trơn;
//    hoàng hôn: đĩa mặt trời là điểm sáng & ấm nhất khung (lỗ khoét nông trên lớp tô + bloom cam ~5 lần bán kính).
//  · canh-dong-hoa: đảo bay 1/3 trái-trên là mảng tối nhất trên trời → mây gần chỉ ló ở mép, xa nhạt; trên cánh cửa chỉ trời trơn.
//  · Mùa/giờ/thời tiết đổi MẢNG: ít/vừa → vài cụm ở mép + mây xa · nhiều → bè mây · u ám/mưa → một tấm vũ tầng mép KHÔNG tuần
//    hoàn, chân tan không đều, 2–3 rèm mưa rộng · sương mù → mây khối tan hết thành màn sương gần như không mép (không cầu
//    vồng, không tấm mây tối) · tuyết đêm → trần mây thấp hắt ánh đèn ấm từ dưới · giờ vàng → bụng mây nhận ánh hồng cam.
//  · Chi tiết = VÂN & MÉP, không thêm vật: múi mây ba cấp cỡ, giá trị theo CẢ KHỐI (đỉnh sáng → thân → bóng đáy → đáy tan hẳn
//    vào không khí, không đáy cắt thẳng), viền nắng phía nguồn sáng cũng tan về đáy; quầng mặt trời tràn lên mây gần; mây ti,
//    vảy cá, sao là VÂN của mảng trời. Phối cảnh không khí: chân trời sáng dần ở mọi điều kiện + một dải mây tầng xa mảnh,
//    nhạt, ấm ngay trên sống núi (đêm gần như tắt). Mây gần chỉ hiện khi đã lộ ≥ nửa khối (không mẩu cụt ở mép khung); trăng
//    tan trước khi chạm mép; ban ngày trăng chỉ mờ ≤ 14% và ngoài cột giữa. Câu chuyện (dreamcore kín đáo): cá Ông bằng mây bơi
//    rất xa trong sương chân trời ở dải PHẢI màn hình (ngoài cột chat), tương phản thấp, chỉ khi mây VỪA, lặng gió, không sương
//    — sớm xuân (mùa cầu ngư) hoặc hiếm ngày khác; không bao giờ lúc mây ít / sương mù.
//  · Ngân sách chuyển động ≤ 24 phần tử ở mọi điều kiện (cuối build có bộ đếm: gộp tầng mây → tắt lấp lánh → bớt sao băng).
import type { Cloud, Ctx, Piece, SkyModule, WeatherSlice } from './types'
import { blob, clamp, fbm, mix, n0, smooth, smoothPath, type Pt } from './util'
import { timeLook } from './palette'

const D2R = Math.PI / 180
const LAT = 21.03 * D2R
const OBL = 23.44 * D2R
/** Chân trời trên màn hình và chiều cao vòm trời: y = HZ − KY·sin(độ cao). HZ ngay dưới sống núi tầng xa. */
const HZ = 500
const SCREEN_CAP = 8950 // ngân sách screen 9000, chừa 50
const CLOUD_CAP = 6980 // tổng svg các mảnh mây ≤ 7000
const DEFS_CAP = 7600 // defs của trời
const TOTAL_CAP = 9380 // screen + defs của trời khi có trường sao
const KY = 440
/** px cho mỗi giờ góc (đông = trái, tây = phải). */
const PXH = 110
const J2000 = 946728000000
/** Giao hội dưới của Kim tinh 24/10/2026 (mốc quỹ đạo tròn). */
const VENUS_IC = 1792843200000

const LV: Record<Cloud, number> = { quang: 0, it: 1, vua: 2, nhieu: 3, 'u-am': 4 }
const CK: Record<Cloud, number> = { quang: 0, it: 0.15, vua: 0.4, nhieu: 0.7, 'u-am': 1 }

// ───────────────────────── tiện ích nhỏ ─────────────────────────
const o2 = (v: number) => {
  const r = Math.round(clamp(v, 0, 1) * 100) / 100
  return r >= 1 ? '1' : r <= 0 ? '0' : String(r).replace(/^0/, '')
}
/** Hai chữ số thập phân, bỏ số 0 đầu ("-.25"). */
const f2 = (v: number) => {
  const r = Math.round(v * 100) / 100
  return String(Object.is(r, -0) ? 0 : r).replace(/^(-?)0\./, '$1.')
}
/** Gọn path: bỏ khoảng trắng trước số âm. */
const P = (d: string) => d.replace(/ -/g, '-')
const wrapH = (h: number) => ((((h + 12) % 24) + 24) % 24) - 12
const sinAlt = (haH: number, dec: number) => Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(haH * 15 * D2R)
/** Chiếu thiên thể (giờ góc, xích vĩ) → màn hình. Trả [x, y, sin độ cao]. */
const at = (haH: number, dec: number): [number, number, number] => {
  const h = wrapH(haH)
  const s = sinAlt(h, dec)
  return [800 + h * PXH, HZ - KY * s, s]
}
const sunDec = (doy: number) => 23.44 * D2R * Math.sin((2 * Math.PI * (284 + doy)) / 365)
const sunHA = (hourF: number) => hourF + (105.85 - 105) / 15 - 12
const daylightOf = (s: number) => smooth(-0.105, 0.105, s)
function ramp(st: [number, string][], v: number): string {
  const f = st[0] as [number, string]
  if (v <= f[0]) return f[1]
  for (let i = 0; i < st.length - 1; i += 1) {
    const a = st[i] as [number, string]
    const b = st[i + 1] as [number, string]
    if (v <= b[0]) return mix(a[1], b[1], (v - a[0]) / (b[0] - a[0]))
  }
  return (st[st.length - 1] as [number, string])[1]
}
const mix4 = (a: string[], b: string[], t: number) => a.map((c, i) => mix(c, b[i] as string, clamp(t, 0, 1)))
const mod = (v: number, m: number) => ((v % m) + m) % m
/** Nhiều chấm sao trong một path: sắp theo x, toạ độ tương đối, mỗi chấm là subpath độ dài 0 (đầu nét tròn vẽ thành chấm). */
function dots(pts: Pt[]): string {
  const q = pts.map(([x, y]) => [n0(x), n0(y)] as Pt).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  let d = ''
  let px = 0
  let py = 0
  q.forEach(([x, y], i) => {
    d += i === 0 ? `M${x} ${y}z` : `m${x - px} ${y - py}z`
    px = x
    py = y
  })
  return P(d)
}

/** Viết lại path tuyệt đối (M L H V Q C A Z) thành tương đối, số nguyên — gọn hơn ~35%. Chỉ M đầu tiên tuyệt đối. */
function rel(d: string): string {
  const tk = d.match(/[MLHVQCAZ]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? []
  let i = 0
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  let cmd = ''
  let out = ''
  const N = () => Number(tk[i++])
  const R = () => Math.round(N())
  while (i < tk.length) {
    const t = tk[i] as string
    if (/[A-Z]/.test(t)) {
      cmd = t
      i += 1
      if (t === 'Z') {
        out += 'z'
        cx = sx
        cy = sy
      }
      continue
    }
    if (cmd === 'M') {
      const x = R()
      const y = R()
      out += out ? `m${x - cx} ${y - cy}` : `M${x} ${y}`
      cx = sx = x
      cy = sy = y
      cmd = 'L'
    } else if (cmd === 'L') {
      const x = R()
      const y = R()
      out += `l${x - cx} ${y - cy}`
      cx = x
      cy = y
    } else if (cmd === 'H') {
      const x = R()
      out += `h${x - cx}`
      cx = x
    } else if (cmd === 'V') {
      const y = R()
      out += `v${y - cy}`
      cy = y
    } else if (cmd === 'Q' || cmd === 'C') {
      const k = cmd === 'Q' ? 2 : 3
      const ps: number[] = []
      for (let j = 0; j < k; j += 1) ps.push(R() - cx, R() - cy)
      out += cmd.toLowerCase() + ps.join(' ')
      cx += ps[ps.length - 2] as number
      cy += ps[ps.length - 1] as number
    } else if (cmd === 'A') {
      const rx = R()
      const ry = R()
      const rot = R()
      const la = R()
      const sw = R()
      const x = R()
      const y = R()
      out += `a${rx} ${ry} ${rot} ${la} ${sw} ${x - cx} ${y - cy}`
      cx = x
      cy = y
    } else i += 1
  }
  return P(out)
}

/** Vòng kín mượt (Q qua trung điểm), viết tương đối. */
function loop(pts: Pt[]): string {
  const q = pts.map(([x, y]) => [n0(x), n0(y)] as Pt)
  const n = q.length
  if (n < 3) return ''
  const mid = (a: Pt, b: Pt): Pt => [n0((a[0] + b[0]) / 2), n0((a[1] + b[1]) / 2)]
  let [cx, cy] = mid(q[n - 1] as Pt, q[0] as Pt)
  let d = `M${cx} ${cy}`
  for (let i = 0; i < n; i += 1) {
    const p = q[i] as Pt
    const m = mid(p, q[(i + 1) % n] as Pt)
    d += `q${p[0] - cx} ${p[1] - cy} ${m[0] - cx} ${m[1] - cy}`
    ;[cx, cy] = m
  }
  return P(`${d}z`)
}

/** Keyframes độ mờ theo các đoạn thời tiết (chuyển 50 s quanh mỗi ranh giới). Trả thuộc tính để gắn vào <g>. */
function fader(name: string, vals: number[], slices: WeatherSlice[], span: number, css: string[]): string {
  const first = vals[0] ?? 0
  if (vals.every(v => Math.abs(v - first) < 0.02)) return first >= 0.99 ? '' : ` opacity="${o2(first)}"`
  const pts: [number, number][] = [[0, first]]
  for (let i = 1; i < slices.length; i += 1) {
    const b = (slices[i] as WeatherSlice).t0
    const a = vals[i - 1] ?? 0
    const c = vals[i] ?? 0
    if (Math.abs(a - c) < 0.02) continue
    pts.push([Math.max(0, b - 25), a], [Math.min(span, b + 25), c])
  }
  pts.push([span, vals[vals.length - 1] ?? 0])
  css.push(
    `.${name}{animation:${name} ${span}s linear forwards;animation-delay:calc(var(--t)*-1s)}@keyframes ${name}{` +
      pts.map(([t, v]) => `${((t / span) * 100).toFixed(1)}%{opacity:${o2(v)}}`).join('') +
      '}',
  )
  return ` class="${name}"`
}

// ───────────────────────── mây: khối dựng từ nhiều múi tròn chồng nhau ─────────────────────────
type C3 = [number, number, number]

/**
 * Đường bao hợp các hình tròn (mỗi đoạn x liền nhau là một subpath riêng — không nối ngang qua khe hở).
 * Mép trên là chuỗi cung (đầu mây). Mép dưới: nếu bị cắt ở clampY thì là đường cong mềm võng xuống vài px theo nhiễu
 * (không phải đường kẻ thước — và sẽ tan dần bằng gradient); nếu không thì là các cung bụng.
 */
function outline(cs: C3[], clampY: number, r?: () => number): string {
  let a = Infinity
  let b = -Infinity
  for (const [cx, , rr] of cs) {
    a = Math.min(a, cx - rr)
    b = Math.max(b, cx + rr)
  }
  type S = { x: number; t: number; ti: number; b: number; bi: number }
  const runs: S[][] = []
  let cur: S[] = []
  for (let x = Math.ceil(a) + 1; x < b - 1; x += 4) {
    let t = Infinity
    let ti = -1
    let bb = -Infinity
    let bi = -1
    for (let i = 0; i < cs.length; i += 1) {
      const [cx, cy, rr] = cs[i] as C3
      const dx = x - cx
      if (dx * dx >= rr * rr) continue
      const q = Math.sqrt(rr * rr - dx * dx)
      if (cy - q < t) {
        t = cy - q
        ti = i
      }
      if (cy + q > bb) {
        bb = cy + q
        bi = i
      }
    }
    if (ti < 0 || t >= clampY - 1) {
      if (cur.length) runs.push(cur)
      cur = []
      continue
    }
    if (bb > clampY) {
      bb = clampY
      bi = -1
    }
    cur.push({ x, t, ti, b: bb, bi })
  }
  if (cur.length) runs.push(cur)
  // bỏ múi chỉ ló ra 1–2 mẫu (≤ 8 px): gộp vào múi liền trước → bớt cung vụn (ký tự) mà dáng không đổi
  const despeck = (ss: S[], key: 'ti' | 'bi') => {
    for (let i = 1; i < ss.length - 1; ) {
      let j = i
      while (j + 1 < ss.length && (ss[j + 1] as S)[key] === (ss[i] as S)[key]) j += 1
      const prev = (ss[i - 1] as S)[key]
      if (j - i < 2 && j < ss.length - 1 && prev !== (ss[i] as S)[key] && (key === 'ti' || prev >= 0)) for (let k = i; k <= j; k += 1) (ss[k] as S)[key] = prev
      i = j + 1
    }
  }
  for (const ss of runs) {
    despeck(ss, 'ti')
    despeck(ss, 'bi')
  }
  const ext = (x: number, dir: number): S | undefined => {
    let best = -1
    let bx = x
    for (let i = 0; i < cs.length; i += 1) {
      const [cx, , rr] = cs[i] as C3
      if ((x - cx) ** 2 >= rr * rr) continue
      const e = cx + dir * rr
      if (dir * (e - bx) > 0) {
        bx = e
        best = i
      }
    }
    const c = cs[best]
    if (!c || c[1] >= clampY - 1) return undefined
    return { x: bx - dir * 0.5, t: c[1], ti: best, b: c[1], bi: best }
  }
  for (const ss of runs) {
    const a0 = ext((ss[0] as S).x, -1)
    const a1 = ext((ss[ss.length - 1] as S).x, 1)
    if (a0) ss.unshift(a0)
    if (a1) ss.push(a1)
  }
  const R = (i: number) => n0((cs[i] as C3)[2])
  // múi không tròn hoàn hảo: cung ellip dẹt/nghiêng theo từng múi (tất định theo chỉ số) → mép mây không thành chuỗi hạt
  const E = (i: number) => {
    const k = Math.sin(i * 12.9898 + cs.length * 0.37) * 43758.5453
    const f = k - Math.floor(k)
    return `${R(i)} ${n0((cs[i] as C3)[2] * (0.74 + 0.22 * f))} ${n0(f * 170 - 85)}`
  }
  let d = ''
  for (const ss of runs) {
    const f = ss[0] as S
    const l = ss[ss.length - 1] as S
    if (ss.length < 2) continue
    d += `M${n0(f.x)} ${n0(f.b)}${n0(f.b) !== n0(f.t) ? `L${n0(f.x)} ${n0(f.t)}` : ''}`
    for (let i = 0; i < ss.length; i += 1) {
      const s = ss[i] as S
      if (ss[i + 1]?.ti !== s.ti) d += `A${E(s.ti)} 0 1 ${n0(s.x)} ${n0(s.t)}`
    }
    if (n0(l.b) !== n0(l.t)) d += `L${n0(l.x)} ${n0(l.b)}`
    let px = l.x
    for (let i = ss.length - 1; i >= 0; i -= 1) {
      const s = ss[i] as S
      if (i > 0 && (ss[i - 1] as S).bi === s.bi) continue
      if (s.bi < 0 && r) {
        const n = Math.max(1, Math.round((px - s.x) / 38))
        const pts: Pt[] = [[px, clampY]]
        for (let k = 1; k < n; k += 1) {
          const u = k / n
          pts.push([px + (s.x - px) * u, clampY + 3 + (r() - 0.35) * 22 + Math.sin(u * Math.PI) * r() * 22])
        }
        pts.push([s.x, clampY])
        d += smoothPath(pts).replace('M', 'L')
      } else d += s.bi < 0 ? `L${n0(s.x)} ${n0(s.b)}` : `A${R(s.bi)} ${R(s.bi)} 0 0 1 ${n0(s.x)} ${n0(s.b)}`
      px = s.x
    }
    d += 'Z'
  }
  return rel(d)
}

/** Một hàng múi mây (đáy hàng ở y = yb). */
type Row = { cs: C3[]; yb: number }
/**
 * Mây tích vẽ tay dựng theo HÀNG MÚI chồng lớp, vẽ từ sau ra trước: hàng đỉnh hẹp nằm cao (lệch về đỉnh mây), hàng vai
 * rộng hơn, hàng chân rộng nhất nằm thấp. Mỗi hàng tự có sáng (đỉnh) – tối (chân) nên chỗ hàng trước đè lên hàng sau hiện
 * ranh khối mềm như nét cọ — không phải một mảng trắng phẳng có đáy xám. Đỉnh lệch (bất đối xứng: một sườn dốc, một sườn
 * thoải), múi to nhỏ xen kẽ theo nhiễu, hai đầu hàng thon. `flat` 0..1: dẹt thành bè (2 hàng). Đáy ~ y=0, cao ~h.
 */
function cumRows(r: () => number, w: number, h: number, flat = 0): Row[] {
  const pk = 0.24 + r() * 0.52
  const ea = 0.55 + r() * 0.6
  const eb = 0.55 + r() * 1.0
  const prof = (u: number) => clamp(u < pk ? (u / pk) ** ea : ((1 - u) / (1 - pk)) ** eb, 0, 1)
  const top = (u: number) => h * (flat * 0.4 + (1 - flat * 0.4) * (0.22 + 0.78 * prof(clamp(u, 0, 1))))
  const nR = flat > 0.4 ? 2 : 3
  const rows: Row[] = []
  for (let k = 0; k < nR; k += 1) {
    const t = k / (nR - 1)
    const base = h * (1 - t) * (nR === 3 ? 0.42 : 0.3)
    const cap = h * (1 - t * (nR === 3 ? 0.58 : 0.46))
    const uc = 0.5 + (pk - 0.5) * (1 - t) * 0.9
    const half = ((nR === 3 ? [0.18, 0.31, 0.45] : [0.28, 0.46])[k] as number) * (0.9 + r() * 0.16)
    const cs: C3[] = []
    for (let u = uc - half * 0.94; u < uc + half * 0.94; ) {
      const s = Math.max(0, 1 - ((u - uc) / half) ** 2)
      const ht = base + (Math.min(top(u), cap) - base) * s ** 0.3 * (0.78 + r() * 0.42)
      // ba cấp cỡ múi: múi lớn (lệch cỡ mạnh) · múi nhỏ · múi con trên vai → nhịp mép không đều như chuỗi hạt
      const big = r() < 0.55
      const rr = Math.max(6, (cap - base) * (big ? 0.3 + r() * 0.38 : 0.1 + r() * 0.12))
      const x = (u - 0.5) * w
      cs.push([x, rr - ht, rr])
      // múi con lấm tấm trên vai múi lớn (súp lơ) → mép trên gãy mịn, không thành chuỗi cung đều
      if (big && r() < 0.6) {
        const a = (-150 + r() * 120) * D2R
        cs.push([x + Math.cos(a) * rr * 0.78, rr - ht + Math.sin(a) * rr * 0.78, rr * (0.26 + r() * 0.2)])
      }
      const gap = ht - 2 * rr - base
      if (gap > 2) cs.push([x + (r() - 0.5) * rr * 0.6, -(base + gap / 2), gap / 2 + rr * 0.7])
      u += (rr * (0.6 + r() * 0.6)) / w
    }
    rows.push({ cs, yb: -base })
  }
  return rows
}

/** Dải mây tầng tích ở xa: một hàng múi nhỏ cỡ lệch nhau, nhấp nhô thấp, hai đầu thon. */
function strato(r: () => number, w: number): C3[] {
  const cs: C3[] = []
  for (let x = -w / 2; x < w / 2; ) {
    const u = 1 - Math.abs(x / (w / 2)) ** 2
    const rr = (16 + r() * 30) * (0.45 + 0.55 * u)
    cs.push([x, -rr * 0.35 - r() * 12 * u, rr])
    x += rr * (0.8 + r() * 0.7)
  }
  return cs
}

/** Tháp mây giông (vũ tích): cột súp lơ thu hẹp dần lên cao, nghiêng nhẹ theo gió tầng trên. Đe mây vẽ riêng (TOWER_ANVIL). */
function towerCb(r: () => number): C3[] {
  const cs: C3[] = []
  for (let i = 0; i < 6; i += 1) cs.push([-170 + i * 66 + (r() - 0.5) * 16, -34 - r() * 10, 50 + r() * 16])
  for (let k = 1; k <= 7; k += 1) {
    const y = -48 - k * 50
    const half = 120 - k * 9
    const cx = k * 9 - 10
    for (let j = 0; j < 3; j += 1) {
      const u = j / 2 - 0.5
      cs.push([cx + u * half * 1.5 + (r() - 0.5) * 22, y + Math.abs(u) * 26 + (r() - 0.5) * 16, half * (0.36 + r() * 0.24)])
    }
  }
  // đỉnh toả xuôi gió thành đe mây bằng chính các múi (dày phía gió thổi tới, mỏng dần về đuôi) — không có "mũ nấm" tách rời
  for (let k = 0; k < 7; k += 1) cs.push([20 + k * 46 + (r() - 0.5) * 14, -430 + k * 7 + (r() - 0.5) * 10, (46 - k * 4.5) * (0.85 + r() * 0.3)])
  return cs
}

/**
 * Cá Ông (cá voi) bằng mây, bơi về phía phải: dáng thanh (dài ~7 lần cao), đầu tròn, lưng thoải, cuống đuôi mảnh, đuôi
 * chẻ; vây ngực dài kiểu cá voi lưng gù. Vẽ thuận chiều kim đồng hồ (trùng chiều đường bao múi mây). Đáy ~ y=0.
 */
const WHALE_BODY =
  'M205-40C205-26 185-16 150-12C80-4-40-4-120-12C-160-16-190-20-214-24C-232-14-252-6-276-1C-266-12-252-22-238-29' +
  'C-250-36-262-46-272-60C-252-58-232-48-212-32C-195-31-175-33-150-38C-40-62 60-76 120-74C170-72 200-62 205-40Z'
const WHALE_FIN = 'M80-14C72 6 40 26 2 34C28 18 46 2 52-12Z'

// ───────────────────────── bầu trời đêm: danh mục sao sáng (RA giờ, Dec °, cấp sao, màu) ─────────────────────────
// màu: 0 trắng · 1 trắng xanh · 2 vàng nhạt · 3 cam · 4 đỏ cam
const BRIGHT: [number, number, number, number][] = [
  [6.752, -16.72, -1.46, 1], [6.399, -52.7, -0.74, 0], [14.261, 19.18, -0.05, 3], [18.616, 38.78, 0.03, 1], [5.278, 46, 0.08, 2],
  [5.242, -8.2, 0.13, 1], [7.655, 5.22, 0.34, 0], [5.919, 7.41, 0.5, 4], [1.629, -57.24, 0.46, 1], [19.846, 8.87, 0.76, 0],
  [4.599, 16.51, 0.86, 3], [16.49, -26.43, 0.96, 4], [13.42, -11.16, 0.97, 1], [7.755, 28.03, 1.14, 3], [22.961, -29.62, 1.16, 0],
  [20.69, 45.28, 1.25, 0], [10.14, 11.97, 1.35, 1], [6.977, -28.97, 1.5, 1], [7.577, 31.89, 1.58, 0], [22.137, -46.96, 1.7, 1],
  // sao Cày (thắt lưng Lạp Hộ) + vai, chân
  [5.419, 6.35, 1.64, 1], [5.604, -1.2, 1.69, 1], [5.679, -1.94, 1.77, 1], [5.533, -0.3, 2.2, 1], [5.796, -9.67, 2.1, 1],
  // sao Thần Nông (Bọ Cạp): đầu, thân, đuôi móc câu
  [16.006, -22.62, 2.3, 1], [16.09, -19.81, 2.6, 1], [16.353, -25.59, 2.9, 1], [16.598, -28.22, 2.8, 1], [16.836, -34.29, 2.3, 3],
  [16.864, -38.05, 3, 1], [16.91, -42.36, 3.6, 3], [17.202, -43.24, 3.3, 2], [17.622, -43, 1.9, 2], [17.793, -40.13, 3, 2],
  [17.708, -39.03, 2.4, 1], [17.56, -37.1, 1.62, 1], [17.512, -37.3, 2.7, 1],
  // Nhân Mã (ấm trà) — nơi Ngân Hà sáng nhất
  [18.403, -34.38, 1.85, 0], [18.921, -26.3, 2.05, 1], [18.35, -29.83, 2.7, 0], [18.466, -25.42, 2.8, 2], [19.043, -29.88, 2.6, 0],
  [18.761, -26.99, 3.2, 0], [19.116, -27.67, 3.3, 2],
  // Bắc Đẩu (gáo)
  [11.062, 61.75, 1.8, 2], [11.031, 56.38, 2.4, 0], [11.897, 53.69, 2.4, 0], [12.257, 57.03, 3.3, 0], [12.9, 55.96, 1.8, 0],
  [13.399, 54.93, 2.3, 0], [13.792, 49.31, 1.9, 1],
]
// Tua Rua (Thất Tỷ Muội): phóng ×3 quanh tâm để đọc được ở cỡ màn hình.
const PLEIADES: [number, number, number][] = [
  [3.791, 24.105, 2.9], [3.819, 24.053, 3.6], [3.747, 24.113, 3.7], [3.763, 24.367, 3.9], [3.772, 23.948, 4.2], [3.753, 24.467, 4.3], [3.82, 24.14, 5],
]
const STAR_COL = ['#ffffff', '#d6e4ff', '#fff2cc', '#ffd6a6', '#ffb894']
// Mưa sao băng: [ngày trong năm đỉnh, RA điểm phát xạ, Dec]
const SHOWERS: [number, number, number][] = [[4, 15.3, 49], [112, 18.1, 34], [126, 22.5, -1], [224, 3.2, 58], [294, 6.3, 16], [321, 10.2, 22], [348, 7.5, 33]]

/** Xích đạo thiên hà → (RA giờ, Dec rad). */
function gal(l: number, b: number): [number, number] {
  const aG = 192.85948 * D2R
  const dG = 27.12825 * D2R
  const lN = 122.93192 * D2R
  const L = l * D2R
  const B = b * D2R
  const sd = Math.sin(B) * Math.sin(dG) + Math.cos(B) * Math.cos(dG) * Math.cos(lN - L)
  const ra = aG + Math.atan2(Math.cos(B) * Math.sin(lN - L), Math.cos(dG) * Math.sin(B) - Math.sin(dG) * Math.cos(B) * Math.cos(lN - L))
  return [mod(ra / D2R / 15, 24), Math.asin(sd)]
}

/** Độ giãn Kim tinh (độ, dương = phía đông mặt trời → sao Hôm) theo hai quỹ đạo tròn. */
function venusElong(now: number): number {
  const t = (now - VENUS_IC) / 864e5
  const e = (2 * Math.PI * t) / 365.256
  const v = (2 * Math.PI * t) / 224.701
  const ex = Math.cos(e)
  const ey = Math.sin(e)
  const vx = 0.723 * Math.cos(v) - ex
  const vy = 0.723 * Math.sin(v) - ey
  return Math.atan2(-ex * vy + ey * vx, -ex * vx - ey * vy) / D2R
}

// ───────────────────────── màu mây theo giờ ─────────────────────────
// [bụng (tối nhất, ngả lạnh), thân, phía sáng, viền] — luôn tối → sáng; hướng sáng do gradient đảm nhận.
const CL_NIGHT = ['#121a30', '#26304e', '#36426a', '#3e4a74']
const CL_TWI = ['#584874', '#8c6c90', '#f4a48e', '#ffc08c']
const CL_GOLD = ['#a08cae', '#ecc8b4', '#fff2da', '#ffd27e']
const CL_DAY = ['#93a0c0', '#e0e6f1', '#fffcf4', '#ffffff']
const SUNC: [number, string][] = [[-0.08, '#ff5a3a'], [0, '#ff7840'], [0.06, '#ffaa58'], [0.16, '#ffd88e'], [0.32, '#fff1c8'], [0.6, '#fffaec']]

export const sky: SkyModule = {
  build(ctx: Ctx) {
    const T = ctx.now / 1000
    const span = ctx.span
    const hrs = span / 3600
    const lite = ctx.detail === 'lite'
    const dl = ctx.daylight
    const lvl = LV[ctx.cur.cloud]
    const lvls = ctx.weather.map(w => LV[w.cloud])
    const lvMax = Math.max(lvl, ...lvls)
    const lvMin = Math.min(lvl, ...lvls)
    const raining = (p: string) => p === 'phun' || p === 'mua' || p === 'mua-to'
    const look = timeLook(ctx.vn.hourF, CK[ctx.cur.cloud], dl, ctx.vn.doy)
    const css: string[] = []
    const defs: string[] = []
    let scr = ''
    const stp = (o: number, c: string, a = 1) => `<stop offset="${o2(o)}" stop-color="${c}"${a < 1 ? ` stop-opacity="${o2(a)}"` : ''}/>`
    // Trường sao dựng sau cùng: chừa một ô trong screen, cuối build mới điền vào — tỉa sao mờ cho vừa ngân sách.
    const STAR_SLOT = '<!--skSao-->'
    let starG: ((keep: number) => string) | null = null

    // ── Mặt trời ──
    const dS = sunDec(ctx.vn.doy)
    const haS = sunHA(ctx.vn.hourF)
    const [sx, sy, sS] = at(haS, dS)
    const [sx2, sy2, sS2] = at(haS + hrs, dS)
    const dl2 = daylightOf(sS2)
    const sunDeg = Math.asin(clamp(sS, -1, 1)) / D2R
    const sunDeg2 = Math.asin(clamp(sS2, -1, 1)) / D2R
    const sunCol = ramp(SUNC, sS)

    // ── Mặt trăng ──
    const p = ctx.moonPhase
    const illum = (1 - Math.cos(2 * Math.PI * p)) / 2
    const lamS = (2 * Math.PI * (ctx.vn.doy - 80)) / 365.2422
    const decM = Math.asin(Math.sin(OBL) * Math.sin(lamS + 2 * Math.PI * p))
    const haM = haS - p * 24
    const [mx, my, mS] = at(haM, decM)
    const [mx2, my2] = at(haM + hrs * 0.966, decM)
    const moonUp = smooth(-0.03, 0.12, mS)
    const moonB = illum * moonUp * (1 - dl)
    const mxc = (mx + mx2) / 2
    const myc = (my + my2) / 2
    const moonR = 42 * (1 + 0.12 * (1 - smooth(0.04, 0.3, mS)))

    // ── Ánh sáng chính cho mây (hướng & màu). ly > 0: mặt trời dưới chân trời → mây được hắt sáng từ dưới. ──
    let lx = clamp((sx - 800) / 760, -1, 1)
    let ly = clamp(-(sS * 2.4 + 0.1), -1, 0.6)
    if (dl < 0.3 && moonB > 0.15) {
      lx = clamp((mx - 800) / 760, -1, 1)
      ly = -clamp(mS * 1.4 + 0.3, 0.2, 1)
    }
    const ll = Math.hypot(lx, ly) || 1
    lx /= ll
    ly /= ll
    const under = ly > 0.05
    let tones =
      sS <= -0.16
        ? CL_NIGHT
        : sS <= -0.03
          ? mix4(CL_NIGHT, CL_TWI, smooth(-0.16, -0.03, sS))
          : sS <= 0.07
            ? mix4(CL_TWI, CL_GOLD, smooth(-0.03, 0.07, sS))
            : mix4(CL_GOLD, CL_DAY, smooth(0.07, 0.3, sS))
    // trăng sáng soi mây: thân & đỉnh bạc, viền sáng
    tones = mix4(tones, ['#1a2238', '#3e4a72', '#8792ba', '#d4dcf4'], moonB * (1 - dl) * 0.85)
    // bụng mây ăn màu trời (ánh tán xạ từ vòm trời — bóng lạnh)
    tones = [mix(tones[0] as string, look.sky[1], 0.24), mix(tones[1] as string, look.sky[2], 0.08), tones[2] as string, tones[3] as string]
    // xám theo độ phủ / mưa
    const greyK =
      ([0, 0, 0.1, 0.32, 0.55][lvl] as number) + (ctx.cur.precip === 'mua-to' ? 0.4 : ctx.cur.precip === 'mua' ? 0.25 : ctx.cur.precip === 'phun' ? 0.15 : 0)
    const nightGrey = ctx.cur.precip === 'tuyet' ? ['#2a2a3c', '#4a4862', '#585670', '#585670'] : ['#161a28', '#30364e', '#3c4460', '#3c4460']
    const grey = mix4(nightGrey, ['#7b8494', '#c3c8d0', '#dde0e5', '#e6e8eb'], dl)
    tones = mix4(tones, grey, clamp(greyK, 0, 0.85))
    if (ctx.cur.precip === 'mua-to') tones = mix4(tones, ['#3e4452', '#6c7380', '#8a909a', '#8a909a'], 0.35 * dl)
    if (raining(ctx.cur.precip)) tones = [mix(tones[0] as string, tones[1] as string, 0.3), tones[1] as string, mix(tones[2] as string, tones[1] as string, 0.5), tones[3] as string]
    // sương mù: mây chìm vào màn sương (tương phản & bão hoà giảm theo độ dày sương)
    const fogK = clamp((ctx.cur.fog - 0.15) * 0.8, 0, 0.58)
    const foggy0 = ctx.cur.fog > 0.35
    if (fogK > 0) tones = mix4(tones, [look.haze, look.haze, mix(look.haze, '#ffffff', 0.25), mix(look.haze, '#ffffff', 0.4)], fogK)
    // giờ vàng: bụng mây nhận ánh ấm phản xạ (hồng cam), thân ấm lên — mây "thuộc về" mặt trời thấp
    const gold = Math.exp(-(((sS - 0.04) / 0.07) ** 2)) * (1 - clamp(greyK, 0, 1)) * (1 - fogK)
    if (gold > 0.05) tones = [mix(tones[0] as string, '#c88a90', 0.4 * gold), mix(tones[1] as string, '#f6b894', 0.28 * gold), tones[2] as string, mix(tones[3] as string, '#ffc070', 0.3 * gold)]
    const [c0, c1, c2, c3] = tones as [string, string, string, string]

    // ═════════════ MÀN HÌNH ═════════════
    // (Không phủ vân nhiễu lên trời: thớ ngang đọc thành sọc quét/banding. Chất liệu trời đến từ mây, ráng, sao.)
    const deckK = (w: WeatherSlice) => (LV[w.cloud] === 4 ? 1 : LV[w.cloud] === 3 ? (raining(w.precip) ? 0.88 : w.fog > 0.35 ? 0 : 0.32) : 0)
    // ── Ráng chân trời: quầng lớn lệch về phía mặt trời (cam → hồng → tím dịu) + dải sáng hẹp sát chân trời phía mặt trời;
    //    vành Kim tinh & bóng Trái Đất phía đối diện ──
    const twiOf = (deg: number) => Math.exp(-(((deg + 2) / 9) ** 2)) * (1 - CK[ctx.cur.cloud] * 0.35)
    const twi = twiOf(sunDeg)
    const twi2 = twiOf(sunDeg2)
    if (Math.max(twi, twi2) > 0.03) {
      const morning = ctx.vn.hourF < 12
      const hc = morning ? '#ffc890' : '#ff9a62'
      defs.push(
        `<radialGradient id="skHg"><stop offset="0" stop-color="${hc}"/><stop offset=".25" stop-color="${mix(hc, '#ff8a8a', 0.4)}" stop-opacity=".7"/><stop offset=".6" stop-color="${mix(hc, '#c070a0', 0.6)}" stop-opacity=".24"/><stop offset="1" stop-color="#b070a8" stop-opacity="0"/></radialGradient>` +
          `<radialGradient id="skHb"><stop offset="0" stop-color="${mix(hc, '#fff4dc', 0.7)}" stop-opacity=".85"/><stop offset=".45" stop-color="${mix(hc, '#ffe0b0', 0.5)}" stop-opacity=".4"/><stop offset="1" stop-color="#ffc890" stop-opacity="0"/></radialGradient>` +
          (lite ? '' : `<radialGradient id="skBv"><stop offset=".2" stop-color="#f4a6b8" stop-opacity=".55"/><stop offset="1" stop-color="#f4a6b8" stop-opacity="0"/></radialGradient>` +
          `<radialGradient id="skEs"><stop offset=".3" stop-color="#34407a" stop-opacity=".5"/><stop offset="1" stop-color="#34407a" stop-opacity="0"/></radialGradient>`),
      )
      const ox = n0(clamp(1600 - sx, -100, 1700))
      const cx = n0(clamp(sx, -300, 1900))
      const bv = twi * smooth(-8, 0, sunDeg) * (1 - smooth(1, 6, sunDeg))
      // độ mờ đổi thật trong cửa sổ mới gắn hoạt ảnh (keyframes hằng = luồng chính)
      const ho = o2(twi) === o2(twi2) ? ` opacity="${o2(twi)}"` : ' class="skHo"'
      if (ho.startsWith(' class')) css.push(`.skHo{animation:skHo ${span}s linear forwards;animation-delay:calc(var(--t)*-1s)}@keyframes skHo{from{opacity:${o2(twi)}}to{opacity:${o2(twi2)}}}`)
      scr +=
        `<g${ho}><ellipse cx="${cx}" cy="${HZ - 40}" rx="980" ry="380" fill="url(#skHg)"/><ellipse cx="${cx}" cy="${HZ - 14}" rx="760" ry="80" fill="url(#skHb)"/></g>` +
        (bv > 0.03 && !lite
          ? `<ellipse cx="${ox}" cy="${HZ - 80}" rx="1050" ry="120" fill="url(#skBv)" opacity="${o2(bv)}"/><ellipse cx="${ox}" cy="${HZ + 10}" rx="1100" ry="75" fill="url(#skEs)" opacity="${o2(bv)}"/>`
          : '')
    }

    // ── Sao, Ngân Hà, Kim tinh: chỉ khi trời đủ tối ──
    const starVis = (d: number) => 1 - smooth(0.03, 0.5, d)
    const sv0 = starVis(dl)
    const sv1 = starVis(dl2)
    const clearAny = lvMin <= 3
    if (Math.max(sv0, sv1) > 0.02 && clearAny) {
      const lst = mod(18.697374558 + 24.06570982441908 * ((ctx.now - J2000) / 864e5) + 105.85 / 15, 24)
      const dx = n0(PXH * hrs * 1.0027)
      const moonWash = clamp(moonB * 1.1, 0, 0.8)
      const moonOn = moonB > 0.15
      const moonVis = illum > 0.03 && mS > -0.03
      const show = (x: number, y: number, s: number) => s > 0.04 && y < HZ - 18 && y > -10 && x > -12 && x < 1612
      // không vẽ sao sau đĩa trăng & quầng sát đĩa
      const behindMoon = (x: number, y: number) => moonVis && Math.hypot(x - mx, y - my) < moonR * 1.9
      const buckets: Pt[][] = [[], [], [], []]
      const twk: Pt[][] = Array.from({ length: 4 }, () => [])
      const r = ctx.rng('sky-sao')
      const depth = 1 - smooth(-0.3, -0.06, sS) // 0 lúc chạng vạng dân dụng → 1 khi tối hẳn
      // trời nhiều mây: chỉ thấy sao qua khe mây (ít hẳn) — đổi MẢNG, không chỉ mờ đi
      const N = (moonWash > 0.4 || depth < 0.5 ? 620 : 720) * (lite ? 0.5 : 1) * ([1, 0.86, 0.6, 0.42, 0.42][lvl] as number)
      const sLo = Math.sin(-48 * D2R)
      const sHi = Math.sin(72 * D2R)
      for (let i = 0; i < N; i += 1) {
        const ra = r() * 24
        const dec = Math.asin(sLo + (sHi - sLo) * r())
        const m = r()
        const tw = r()
        const [x, y, s] = at(lst - ra, dec)
        if (!show(x, y, s) || behindMoon(x, y)) continue
        let c = m < 0.6 ? 0 : m < 0.87 ? 1 : m < 0.97 ? 2 : 3
        const low = y > HZ - 120
        if (low && c > 0) c -= 1 // khí quyển dày gần chân trời làm mờ
        const dM = moonOn ? Math.hypot(x - mxc, y - myc) : 9999
        if (c === 0 && (depth < 0.5 || moonWash > 0.6 || (moonWash > 0.4 && m < 0.3))) continue // chạng vạng / trăng sáng nuốt sao mờ
        if (c === 1 && (depth < 0.2 || (moonWash > 0.6 && dM < 350))) continue
        // lấp lánh: CHỈ vài ngôi sáng (4 nhóm lệch pha, ≤ 5 sao/nhóm), không sát trăng, không sát chân trời
        if (c >= 2 && tw < 0.45 && dM > 300 && !low) {
          const g = twk[Math.floor(tw / 0.1125)] as Pt[]
          if (g.length < 5) {
            g.push([x, y])
            continue
          }
        }
        ;(buckets[c] as Pt[]).push([x, y])
      }
      // Ngân Hà: dải bụi sao dọc mặt phẳng thiên hà (mật độ dày lên về lõi Nhân Mã) + quầng rất nhạt nhiều lớp mép rách theo
      // nhiễu + 2 vệt bụi tối mảnh (Khe Lớn). Mờ dần về chân trời (tắt quang) và mép trên màn hình. Đỉnh độ mờ ≤ .18.
      const mwVis = sv0 * (1 - smooth(-0.3, -0.12, sS)) * (1 - smooth(0.15, 0.6, moonB)) * ([1, 1, 0.5, 0, 0][lvl] as number)
      const dust: Pt[] = []
      let mw = ''
      if (mwVis > 0.05) {
        const rg = ctx.rng('sky-ngan-ha')
        const nz = ctx.noise('sky-ngan-ha')
        const proj = (l: number, b: number) => {
          const [ra, dec] = gal(l, b)
          return at(lst - ra, dec)
        }
        const lw = (l: number) => mod(l + 180, 360) - 180
        // khe bụi tối: [l đầu, l cuối, b tâm, nửa bề rộng, độ nghiêng] — thân Khe Lớn + các nhánh tẽ ra lệch góc, ngắn dài khác
        // nhau, bề rộng phập phồng theo nhiễu → mạng bụi rẽ nhánh, không phải hai vệt thẳng song song
        const lanes: [number, number, number, number, number][] = [[-8, 74, 1.5, 0.7, 0], [-42, 10, -1.7, 0.45, 0.02], [18, 60, -0.6, 0.32, 0], [6, 38, 1.3, 0.3, -0.07], [34, 66, 1.6, 0.26, 0.06], [-30, -6, -1.4, 0.24, -0.08]]
        const inLane = (l: number, b: number) => lanes.some(([a, z, bc, hw, tl]) => l > a && l < z && Math.abs(b - bc - tl * (l - a) - 1.2 * fbm(nz, l / 18, 7.7, 2)) < hw * 1.3)
        // mở vòng ở chỗ thấp nhất dưới chân trời → không có đường nối giữa trời
        let l0 = -180
        let sMin = 2
        for (let l = -180; l < 180; l += 10) {
          const s = proj(l, 0)[2]
          if (s < sMin) {
            sMin = s
            l0 = l
          }
        }
        const runs: number[][] = []
        let cur: number[] = []
        let px = NaN
        for (let k = 0; k <= 360; k += 8) {
          const l = l0 + k
          const [x, , s] = proj(l, 0)
          const ok = s > -0.07 && x > -420 && x < 2020
          if (!ok || Math.abs(x - px) > 520) {
            if (cur.length > 2) runs.push(cur)
            cur = []
          }
          if (ok) cur.push(l)
          px = x
        }
        if (cur.length > 2) runs.push(cur)
        // mép dải rách theo nhiễu tần thấp, có chỗ thắt gần như mất (không thành khối đều như sườn núi)
        const band = (ls: number[], k: number, jit: number, bc0 = 0, key = 0, tl = 0) => {
          const up: Pt[] = []
          const dn: Pt[] = []
          for (const l of ls) {
            const w = k * (0.7 + 0.6 * Math.exp(-((lw(l) / 48) ** 2)) + 0.25 * Math.exp(-(((lw(l) - 78) / 20) ** 2)))
            const bc = bc0 + tl * (lw(l) - lw(ls[0] as number)) + (tl ? 0.8 * fbm(nz, l / 14 + key, 2.2, 2) : 0)
            const a = proj(l, bc + w * Math.max(0.12, 1 + jit * 2.4 * fbm(nz, l / 24 + key, 0.4, 2)))
            const b = proj(l, bc - w * Math.max(0.12, 1 + jit * 2.4 * fbm(nz, l / 24 + key, 5.3, 2)))
            up.push([a[0], Math.min(a[1], HZ + 40)])
            dn.push([b[0], Math.min(b[1], HZ + 40)])
          }
          return loop([...up, ...dn.reverse()])
        }
        let g0 = ''
        let g1 = ''
        let g2 = ''
        let lane = ''
        let core = ''
        let warm = ''
        for (const run of runs) {
          g0 += band(run, lite ? 12 : 13, 0.7, 0.3, 0)
          g1 += band(run, lite ? 6.5 : 7.5, 0.55, 0.5, 3.1)
          if (!lite) g2 += band(run, 3.6, 0.4, 0.7, 6.2)
          // đám mây sao (Nhân Mã, Khiên, Thiên Nga): đoạn dải đậm hơn, thuôn dài theo mặt phẳng thiên hà
          for (const [a, z, bc] of [[-6, 14, -1.5], [22, 34, -0.5], [66, 86, 1]] as [number, number, number][]) {
            const seg = run.filter(l => lw(l) > a && lw(l) < z)
            if (seg.length > 2) core += band(seg, 3.4, 0.5, bc, a / 7)
          }
          // lõi Nhân Mã ngả ấm (bụi sao già, vàng nhạt) — sát chân trời phía nam
          const cr = run.filter(l => Math.abs(lw(l)) < 26)
          if (cr.length > 2) warm += band(cr, 3, 0.35, -0.6, 9)
          for (const [a, z, bc, hw, tl] of lanes) {
            const seg = run.filter(l => lw(l) > a && lw(l) < z)
            if (seg.length > 2 && !lite) lane += band(seg, hw, 0.95, bc, a, tl)
          }
        }
        // sao sáng hơn rải theo mặt cắt dải (dày ở lõi), tránh khe tối — phá nhịp lặp của hoạ tiết bụi
        for (let i = 0; i < (lite ? 110 : 260); i += 1) {
          const l = rg() < 0.5 ? (rg() + rg() + rg() - 1.5) * 80 : (rg() - 0.5) * 360
          const sig = 2.4 + 3.4 * Math.exp(-((lw(l) / 36) ** 2))
          const b = (rg() + rg() + rg() + rg() - 2) * sig * 1.25
          const [x, y, s] = proj(l, b)
          if (!show(x, y, s) || behindMoon(x, y) || (inLane(lw(l), b) && rg() < 0.8)) continue
          dust.push([x, y])
        }
        // bụi sao li ti: 2 lớp hoạ tiết chấm ngẫu nhiên, ô lệch cỡ & xoay khác nhau → không thấy nhịp lặp; tô vào chính
        // các dải quầng (dải ngoài thưa, dải trong dày) nên mật độ sao dày lên về lõi như thật.
        const pat = (id: string, w: number, h: number, n: number, sw: number, op: number, rot: number) => {
          const q: Pt[] = []
          for (let i = 0; i < n; i += 1) q.push([2 + rg() * (w - 4), 2 + rg() * (h - 4)])
          return `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse" patternTransform="rotate(${rot})"><path stroke="#fff" stroke-linecap="round" stroke-width="${sw}" opacity="${op}" d="${dots(q)}"/></pattern>`
        }
        // quầng mờ 3 lớp + đám mây sao + lõi ấm, LÀM MỀM bằng một lớp nhoè tĩnh (mép tan như ánh sáng, không thành hình khối
        // núi / ống khói); tắt dần về chân trời sớm (tắt quang) để dải không "mọc" từ sống núi. Bụi sao: hoạ tiết chấm phủ cả
        // vùng trời, chỉ hiện qua mặt nạ = chính dải đã nhoè → mật độ sao dày lên mềm về lõi. Khe Lớn: vệt bụi tối mảnh, nhoè nhẹ.
        defs.push(
          `<linearGradient id="skNg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${HZ}"><stop offset="0" stop-color="#c4cdf0" stop-opacity=".3"/><stop offset=".2" stop-color="#c8d0f2"/><stop offset=".5" stop-color="#d0d2ee" stop-opacity=".8"/><stop offset=".72" stop-color="#d6d0e6" stop-opacity=".22"/><stop offset=".86" stop-color="#d6d0e6" stop-opacity="0"/></linearGradient>` +
            `<filter id="skNf" x="-.1" y="-.2" width="1.2" height="1.4"><feGaussianBlur stdDeviation="13"/></filter>` +
            (lane ? `<filter id="skNe"><feGaussianBlur stdDeviation="4.5"/></filter>` : '') +
            pat('skNp', 47, 43, lite ? 10 : 16, 1.3, 0.65, 17) +
            (lite ? '' : pat('skNq', 31, 29, 12, 1.05, 0.6, -23)) +
            `<mask id="skNm"><use href="#skNa" fill="url(#skNg)" filter="url(#skNf)"/></mask>` +
            (lite ? '' : `<mask id="skNn"><use href="#skNb" fill="url(#skNg)" filter="url(#skNf)"/></mask>`),
        )
        const dustR = `<rect width="1600" height="${HZ}"`
        mw =
          `<g fill="url(#skNg)" filter="url(#skNf)"><g opacity=".1"><path id="skNa" d="${g0}"/></g><g opacity=".12"><path id="skNb" d="${g1}"/></g>` +
          (g2 ? `<path opacity=".13" d="${g2}"/>` : '') +
          (core ? `<path opacity=".15" d="${core}"/>` : '') +
          (warm ? `<path fill="#ffdcb4" opacity=".14" d="${warm}"/>` : '') +
          `</g>` +
          `<g mask="url(#skNm)">${dustR} fill="url(#skNp)"/></g>` +
          (lite ? '' : `<g mask="url(#skNn)">${dustR} fill="url(#skNq)"/></g>`) +
          (lane ? `<path fill="#060a1c" opacity=".38" filter="url(#skNe)" d="${lane}"/>` : '')
      }
      // sao sáng có tên + Tua Rua
      const named: Pt[][] = [[], [], [], [], []]
      const big: Pt[][] = [[], [], [], [], []]
      let glints = ''
      const addStar = (ra: number, dec: number, mag: number, col: number) => {
        const [x, y, s] = at(lst - ra, dec)
        if (!show(x, y, s) || behindMoon(x, y)) return
        const ext = y > HZ - 140 ? 0.8 : 0
        const bright = mag + ext < 1.2
        ;((bright ? big : named)[col] as Pt[]).push([x, y])
        if (mag + ext < 0.3) glints += `<use href="#skGl" x="${n0(x)}" y="${n0(y)}" opacity="${o2(0.42 - mag * 0.16)}"/>`
      }
      for (const [ra, dec, mag, col] of BRIGHT) addStar(ra, dec * D2R, mag, col)
      for (const [ra, dec, mag] of PLEIADES) addStar(3.78 + (ra - 3.78) * 3, (24.15 + (dec - 24.15) * 3) * D2R, mag - 0.6, 1)
      // Kim tinh: sao Hôm (chiều, phía tây) / sao Mai (sáng, phía đông)
      const el = venusElong(ctx.now)
      const [vx, vy, vs] = at(haS - el / 15, Math.asin(Math.sin(OBL) * Math.sin(lamS + el * D2R)))
      let venus = ''
      if (vs > 0.02 && sS < 0.03 && show(vx, vy, vs) && Math.abs(el) > 6) {
        const vv = (1 - smooth(0.35, 0.8, dl)) * (lvl <= 2 ? 1 : 0.4)
        venus =
          `<circle cx="${n0(vx)}" cy="${n0(vy)}" r="16" fill="url(#skVg)" opacity="${o2(vv)}"/>` +
          `<path d="M${n0(vx)} ${n0(vy)}z" stroke="#fffbe8" stroke-width="4.6" stroke-linecap="round" opacity="${o2(vv)}"/>` +
          `<use href="#skGl" transform="translate(${n0(vx)} ${n0(vy)}) scale(1.6)" opacity="${o2(vv * 0.6)}"/>`
        defs.push(`<radialGradient id="skVg"><stop offset="0" stop-color="#fff6d8" stop-opacity=".6"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient>`)
      }
      const W = [1.2, 1.7, 2.3, 3.1]
      const O = [0.5, 0.72, 0.88, 1]
      const b0 = buckets[0] as Pt[]
      // keep < 1: giữ đều một phần sao mờ nhất & bụi Ngân Hà (chọn theo tỉ lệ vàng → rải đều, tất định)
      starG = (keep: number) => {
        let st = ''
        const thin = (b: Pt[], k = keep) => (k < 1 ? b.filter((_, i) => (i * 0.618034) % 1 < k) : b)
        const dd = thin(dust, keep * 1.6)
        if (dd.length) st += `<path stroke-width="1.5" opacity=".7" d="${dots(dd)}"/>`
        for (let k = 0; k < 4; k += 1) {
          const b = k === 0 ? thin(b0) : (buckets[k] as Pt[])
          if (b.length) st += `<path${k === 1 ? ' stroke="#dfe8ff"' : k === 2 ? ' stroke="#fff1da"' : ''} stroke-width="${W[k]}" opacity="${O[k]}" d="${dots(b)}"/>`
        }
        twk.forEach((b, k) => {
          if (!b.length) return
          const per = 4.3 + k * 1.7
          st += `<path class="skT" stroke-width="2.4" style="animation-duration:${per.toFixed(1)}s;animation-delay:${ctx.ph(per * 2, `sky-tw${k}`)}" d="${dots(b)}"/>`
        })
        for (let c = 0; c < 5; c += 1) {
          const a = named[c] as Pt[]
          const b = big[c] as Pt[]
          if (a.length) st += `<path stroke="${STAR_COL[c]}" stroke-width="2.6" d="${dots(a)}"/>`
          if (b.length) st += `<path stroke="${STAR_COL[c]}" stroke-width="4" d="${dots(b)}"/>`
        }
        return `<g class="skSt">${mw ? `<g opacity="${o2(mwVis * 0.84)}">${mw}</g>` : ''}<g class="skSs" stroke="#fff">${st}</g>${glints}${venus}</g>`
      }
      if (glints || venus) defs.push('<path id="skGl" fill="#fff" stroke="none" d="M0-8l.6-7.4 7.4 0-7.4.6 0 7.4-.6-7.4-7.4 0 7.4-.6z"/>')
      css.push(
        `.skSt{animation:skSt ${span}s linear forwards;animation-delay:calc(var(--t)*-1s)}@keyframes skSt{from{opacity:${o2(sv0)}}to{opacity:${o2(sv1)};transform:translateX(${dx}px)}}` +
          `.skSs path{fill:none;stroke-linecap:round}.skT{animation:skTw 4s ease-in-out infinite alternate}@keyframes skTw{from{opacity:.68}to{opacity:1}}`,
      )
      scr += STAR_SLOT
    }

    // ── Phối cảnh không khí: trời sáng dần về chân trời ở MỌI điều kiện (cả đêm: ánh trời chân trời) + một dải mây tầng xa
    //    thấp, mảnh, nhạt, ấm hơn trời (lớp xa nhất của mây, tương phản ~10%) — tách vòm trời khỏi sống núi, mở chiều sâu. ──
    {
      const warm = sS > -0.2 ? mix(sunCol, '#ffffff', 0.5) : '#8c94c4'
      const hzC = mix(mix(look.sky[2], '#ffffff', 0.3 * dl + 0.08), warm, 0.22 * (1 - fogK))
      defs.push(`<linearGradient id="skHz" gradientUnits="userSpaceOnUse" x2="0" y1="230" y2="${HZ + 10}">${stp(0.3, hzC, 0) + stp(1, hzC, 0.4)}</linearGradient>`)
      scr += `<rect y="230" width="1600" height="290" fill="url(#skHz)" opacity="${o2(0.45 + 0.4 * dl)}"/>`
      // (giờ ráng: dải "ráng mỡ gà" của mây ti đã làm đúng việc này → không vẽ thêm)
      if (!lite && !foggy0 && lvl < 4 && !raining(ctx.cur.precip) && Math.exp(-(((sS + 0.02) / 0.07) ** 2)) < 0.12) {
        const rh = ctx.rng('sky-chan-troi')
        let d = ''
        for (let i = 0; i < (lite ? 4 : 7); i += 1) {
          const L = 260 + rh() * 460
          const x = -120 + ((i + rh() * 0.8) / (lite ? 4 : 7)) * 1720 - L / 2
          const y = 350 + rh() * 56
          const th = 2.5 + rh() * 6
          d += `M${n0(x)} ${n0(y)}q${n0(L * (0.35 + rh() * 0.3))} ${n0(-th * 2)} ${n0(L)} ${n0(rh() * 6 - 3)}q${n0(-L * 0.5)} ${n0(th)} ${n0(-L)} 0z`
        }
        scr += `<path fill="${mix(hzC, '#ffffff', 0.25 * dl)}" opacity="${o2((0.07 + 0.31 * dl) * (1 - 0.5 * CK[ctx.cur.cloud]))}" d="${P(d)}"/>`
      }
    }

    // ── Cầu vồng: đối diện mặt trời, bán kính 42°, cầu vồng phụ 51°, dải tối Alexander giữa hai cung ──
    // Chỉ ở đoạn khô ngay sau mưa (hoặc mưa rào bóng mây khi trời còn hở nắng); không bao giờ giữa cơn mưa dầm/mưa to.
    {
      let rained = ctx.wet > 0.3
      const vals = ctx.weather.map(w => {
        const rainNow = raining(w.precip)
        let v = 0
        if (!rainNow && rained && LV[w.cloud] <= 3) v = LV[w.cloud] === 3 ? 0.65 : 1
        else if (rainNow && w.isShower && w.precip === 'mua' && LV[w.cloud] <= 2) v = 0.6
        if (rainNow) rained = true
        return v
      })
      const sunOk = dl > 0.5 && sS > 0.02 && sunDeg < 40 && ctx.cur.fog < 0.3
      const str = smooth(0.3, 0.75, Math.max(ctx.wet, ctx.weather.some(w => raining(w.precip)) ? 1 : 0))
      if (sunOk && vals.some(v => v > 0) && str > 0) {
        const cx = n0(clamp(1600 - sx, 150, 1450))
        const cy = HZ + KY * Math.sin(sunDeg * D2R)
        const top = HZ - KY * Math.sin((42 - sunDeg) * D2R)
        const R = cy - top
        const R2 = R * 1.26
        const st = (rho: number, c: string, o: number) => `<stop offset="${(rho / 1.26).toFixed(3)}" stop-color="${c}" stop-opacity="${o}"/>`
        defs.push(
          `<radialGradient id="skRb" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${n0(cy)}" r="${n0(R2)}">` +
            st(0.8, '#fff', 0) + st(0.94, '#fff', 0.07) + st(0.955, '#9a7cff', 0.16) + st(0.966, '#6aa6ff', 0.26) + st(0.977, '#7ee09a', 0.3) +
            st(0.987, '#ffe27a', 0.32) + st(0.995, '#ffa65e', 0.3) + st(1.003, '#ff6f5e', 0.22) + st(1.016, '#20304e', 0.06) + st(1.17, '#20304e', 0.07) +
            st(1.19, '#ff7a66', 0.09) + st(1.205, '#ffe08a', 0.1) + st(1.22, '#7edc9a', 0.09) + st(1.235, '#7a9cff', 0.07) + st(1.26, '#7a9cff', 0) +
            `</radialGradient>`,
        )
        const att = fader('skRbF', vals.map(v => v * str), ctx.weather, span, css)
        scr += `<g${att}><circle cx="${cx}" cy="${n0(cy)}" r="${n0(R2)}" fill="url(#skRb)"/></g>`
      }
    }

    // Lỗ khoét mềm trên lớp tô màu (multiply) đúng chỗ đĩa trăng & đĩa mặt trời thấp (xem dưới): lớp tô hoàng hôn chặn trần độ
    // sáng → không khoét thì đĩa chỉ nhỉnh hơn trời, đọc thành "nhật thực". Lỗ mặt trời NÔNG & mềm (≤ 34%, mép tan ×2.6 bán
    // kính): khi nằm sau sống núi chỉ thành vệt chói rất nhẹ trên sống núi, không lộ đĩa núi chưa tô.
    const holes: string[] = []
    const hole = (id: string, cx: number, cy: number, r0: number, r1: number, k: number) => {
      const t0 = r0 / r1
      defs.push(
        `<radialGradient id="${id}"><stop offset="${(t0 - 0.03).toFixed(2)}" stop-color="${mix('#ffffff', '#000000', k)}"/>` +
          `<stop offset="${(t0 + (1 - t0) * 0.4).toFixed(2)}" stop-color="${mix('#ffffff', '#000000', k * 0.3)}"/><stop offset="1" stop-color="#fff"/></radialGradient>`,
      )
      holes.push(`<circle cx="${n0(cx)}" cy="${n0(cy)}" r="${n0(r1)}" fill="url(#${id})"/>`)
    }
    // ── Mặt trời: đĩa NHỎ luôn là điểm sáng nhất khung (lõi gần trắng, chỉ vành ngả đỏ khi sát chân trời) + quầng rộng mềm;
    //    tia nắng xuyên mây khi thấp ──
    if (Math.max(sS, sS2) > -0.07) {
      const veil = ([1, 1, 0.8, 0.4, 0.1][lvl] as number) * (1 - clamp(ctx.cur.fog, 0, 1) * 0.4)
      const low = 1 - smooth(0.02, 0.28, sS)
      // quầng: SÁNG hơn nền trời (kem → vàng ấm → tắt), không phải màu cam tối hơn trời chiều
      defs.push(
        `<radialGradient id="skSg"><stop offset="0" stop-color="#fffbea" stop-opacity=".9"/><stop offset=".2" stop-color="${mix(sunCol, '#fff6e0', 0.6)}" stop-opacity=".5"/><stop offset=".55" stop-color="${mix(sunCol, '#ffe8c0', 0.3)}" stop-opacity=".14"/><stop offset="1" stop-color="${sunCol}" stop-opacity="0"/></radialGradient>` +
          `<radialGradient id="skSh"><stop offset="0" stop-color="${mix(sunCol, '#fff3d6', 0.55 - 0.3 * low)}" stop-opacity="${o2(0.46 + 0.14 * low)}"/><stop offset=".3" stop-color="${sunCol}" stop-opacity="${o2(0.14 + 0.1 * low)}"/><stop offset="1" stop-color="${sunCol}" stop-opacity="0"/></radialGradient>`,

      )
      let rays = ''
      const rayVals = ctx.weather.map(w => (LV[w.cloud] >= 1 && LV[w.cloud] <= 3 && !raining(w.precip) ? (LV[w.cloud] === 3 ? 0.7 : 1) : 0))
      if (!lite && sS > -0.04 && sS < 0.32 && rayVals.some(v => v > 0)) {
        const rr = ctx.rng('sky-tia')
        const fan = (n: number) => {
          let d = ''
          for (let i = 0; i < n; i += 1) {
            const a = (-172 + rr() * 164) * D2R
            const w = (0.6 + rr() * 2.2) * D2R
            const L = 1500
            d += `M0 0L${n0(Math.cos(a - w) * L)} ${n0(Math.sin(a - w) * L)}L${n0(Math.cos(a + w) * L)} ${n0(Math.sin(a + w) * L)}Z`
          }
          return P(d)
        }
        defs.push(`<radialGradient id="skRy" gradientUnits="userSpaceOnUse" r="1500"><stop offset="0" stop-color="${mix(sunCol, '#ffffff', 0.3)}" stop-opacity=".3"/><stop offset=".45" stop-color="${sunCol}" stop-opacity=".08"/><stop offset="1" stop-color="${sunCol}" stop-opacity="0"/></radialGradient>`)
        const att = fader('skRyF', rayVals, ctx.weather, span, css)
        rays = `<g${att}><g opacity="${o2(0.4 + 0.3 * low)}" fill="url(#skRy)"><path d="${fan(7)}"/></g></g>`
      }
      const moveS = n0(sx2 - sx) !== 0 || n0(sy2 - sy) !== 0
      if (moveS) css.push(`.skSm{animation:skSm ${span}s linear forwards;animation-delay:calc(var(--t)*-1s)}@keyframes skSm{to{transform:translate(${n0(sx2 - sx)}px,${n0(sy2 - sy)}px)}}`)
      const sq = sS < 0.035 ? 0.86 : 1
      const dO = veil * smooth(-0.015, 0.015, sS)
      // bloom sát đĩa (≈ 4–5 lần bán kính, chỉ khi trời đủ hở): lõi kem sáng → vàng ấm → tắt; khi thấp ngả cam đậm
      const bloom = veil > 0.5 && sS > -0.012
      if (bloom)
        defs.push(
          `<radialGradient id="skSw"><stop offset=".25" stop-color="${mix('#ffd890', '#ffa050', low)}" stop-opacity="${o2(0.45 + 0.3 * low)}"/><stop offset="1" stop-color="${sunCol}" stop-opacity="0"/></radialGradient>`,
        )
      if (sunDeg < 14 && veil > 0.5 && dO > 0.3) hole('skGs', (sx + sx2) / 2, (sy + sy2) / 2, 17 + Math.hypot(sx2 - sx, sy2 - sy) / 2, 50, 0.34 * dO)
      // đĩa: lõi trắng ngà + vành ấm hơn chút (chỉ vành ngả màu khi sát chân trời) — luôn sáng nhất khung
      scr +=
        `<g transform="translate(${n0(sx)} ${n0(sy)})"><g${moveS ? ' class="skSm"' : ''}>` +
        `<circle r="${n0(460 + low * 220)}" fill="url(#skSh)" opacity="${o2((0.55 + low * 0.4) * (0.5 + veil * 0.5))}"/>` +
        rays +
        `<circle r="${n0(120 + low * 50 + (1 - veil) * 70)}" fill="url(#skSg)" opacity="${o2(0.4 + 0.6 * veil)}"/>` +
        (veil > 0.15 && sS > -0.012
          ? `<g opacity="${o2(dO)}">${bloom ? `<circle r="${n0(72 + 26 * low)}" fill="url(#skSw)" opacity="${o2(0.6 + 0.4 * low)}"/>` : ''}<ellipse rx="19" ry="${n0(19 * sq)}" fill="${mix(sunCol, '#ffffff', 0.8)}"/><ellipse rx="15" ry="${n0(15 * sq)}" fill="#fffef6"/></g>`
          : '') +
        `</g></g>`
    }

    // ── Mặt trăng: đúng pha, phía sáng hướng về mặt trời; biển trăng mờ gợi cây đa & chú Cuội ──
    // Trăng không bao giờ bị mép khung cắt (đĩa khuyết ở góc đọc thành lỗi): tan dần khi tiến sát mép, tắt hẳn trước khi chạm.
    // Ban ngày: chỉ còn bóng mờ ≤ 14% và CHỈ ngoài cột giữa (x 25–75%) — giữa khung là mảng trời trơn.
    const mNight = 1 - dl
    const mDayK = smooth(0.25, 0.7, dl)
    const mEdge = Math.min(mx, mx2, 1600 - mx, 1600 - mx2)
    const mVis =
      (mNight + mDayK * 0.14 * (1 - CK[ctx.cur.cloud] * 0.8) * (1 - mNight) * smooth(0, 160, Math.abs(mxc - 800) - 400 - moonR)) *
      smooth(moonR * 1.25, moonR * 3, mEdge)
    if (illum > 0.03 && Math.max(mS, at(haM + hrs, decM)[2]) > -0.03 && o2(mVis) !== '0') {
      const R = moonR
      const low = 1 - smooth(0.03, 0.25, mS)
      const night = mNight
      // vị trí tương đối của mặt trời so với trăng (không cuộn qua nửa đêm)
      const rel0 = (p < 0.5 ? p * 24 : p * 24 - 24) * PXH
      const th = Math.atan2(HZ - KY * sS - my, rel0)
      const tR = Math.abs(Math.cos(2 * Math.PI * p)) * R
      const tx = R * Math.sin(th)
      const ty = -R * Math.cos(th)
      const lit = P(
        `M${tx.toFixed(1)} ${ty.toFixed(1)}A${R.toFixed(1)} ${R.toFixed(1)} 0 0 1 ${(-tx).toFixed(1)} ${(-ty).toFixed(1)}` +
          `A${tR.toFixed(1)} ${R.toFixed(1)} ${(th / D2R).toFixed(0)} 0 ${illum < 0.5 ? 0 : 1} ${tx.toFixed(1)} ${ty.toFixed(1)}Z`,
      )
      const mc0 = mix('#fffdf2', '#ffd9a0', low * 0.8)
      const mc1 = mix('#ece2c6', '#e8a868', low * 0.8)
      const dayK = mDayK
      const vis = mVis
      defs.push(
        `<clipPath id="skMc"><path d="${lit}"/></clipPath>` +
          `<radialGradient id="skMg" cx=".42" cy=".4" r=".64"><stop offset=".3" stop-color="${mix(mc0, look.sky[1], dayK * 0.35)}"/><stop offset="1" stop-color="${mix(mc1, look.sky[1], dayK * 0.45)}"/></radialGradient>`,
      )
      let halo = ''
      if (night > 0.1) {
        defs.push(
          `<radialGradient id="skMa"><stop offset="0" stop-color="#3e4c8a" stop-opacity=".3"/><stop offset="1" stop-color="#3e4c8a" stop-opacity="0"/></radialGradient>` +
            `<radialGradient id="skMh"><stop offset="0" stop-color="${mc0}" stop-opacity=".6"/><stop offset=".12" stop-color="${mc0}" stop-opacity=".26"/><stop offset=".4" stop-color="${mc0}" stop-opacity=".07"/><stop offset="1" stop-color="${mc0}" stop-opacity="0"/></radialGradient>`,
        )
        // trời quanh trăng sáng hơn (cấu trúc sáng tối cho bầu trời đêm) · quầng rộng · bloom sát đĩa
        halo =
          `<circle r="900" fill="url(#skMa)" opacity="${o2(moonB * 1.25)}"/>` +
          `<circle r="${n0(R * 12)}" fill="url(#skMh)" opacity="${o2((0.25 + 0.75 * illum) * night)}"/>`
        // quầng trăng 22° khi có mây ti mỏng ("quầng thì hạn, tán thì mưa")
        if ((lvl === 1 || lvl === 2) && moonB > 0.35) {
          defs.push(
            `<radialGradient id="skMr"><stop offset=".9" stop-color="#fff" stop-opacity="0"/><stop offset=".94" stop-color="#ffb08a" stop-opacity=".09"/><stop offset=".97" stop-color="#eef2ff" stop-opacity=".12"/><stop offset="1" stop-color="#eef2ff" stop-opacity="0"/></radialGradient>`,
          )
          halo += `<circle r="${n0(KY * Math.sin(22 * D2R))}" fill="url(#skMr)"/>`
        }
        // ánh đất (earthshine): rất mờ, mép mềm (hai vòng)
        if (illum < 0.45) halo += `<g fill="#5c6a9e"><circle r="${n0(R + 2)}" opacity="${o2(0.035 * night)}"/><circle r="${n0(R - 3)}" opacity="${o2(0.04 * night)}"/></g>`
      }
      // Biển trăng (hệ 100 đơn vị, bán kính 50) theo bố cục biển trăng thật — chính các biển này dân gian đọc thành cây đa
      // (Mưa + Bão tố: tán lệch trái-trên; Mây + Ẩm: gốc rễ dưới) & chú Cuội (Tĩnh lặng + Trong sáng bên phải). Mép mềm hai lớp,
      // tương phản .12–.16, không có hình vẽ nét.
      const rc = ctx.rng('sky-cuoi')
      // các biển chạm nhau thành MỘT chuỗi mảng rách (không rải đốm, không thành mặt): Mưa + Bão tố (trái — tán đa) →
      // Mây (dưới — gốc) · Trong sáng → Tĩnh lặng → Phong phú (giữa-phải — chú Cuội ngồi) · Nguy hiểm tách riêng sát mép.
      const maria =
        blob(-14, -20, 14, 11, rc, 8, 0.36) + blob(-30, 2, 12, 20, rc, 8, 0.36) + blob(-12, 18, 9, 6, rc, 7, 0.34) + blob(6, -18, 8, 7, rc, 7, 0.3) +
        blob(14, -4, 10, 8, rc, 7, 0.34) + blob(28, 8, 6, 9, rc, 7, 0.3) + blob(36, -12, 5, 4, rc, 6, 0.25)
      const mO = 1 - dayK * 0.6
      // ban ngày đĩa trăng nhạt như mây mỏng: không vẽ biển trăng (không đọc được, tốn ký tự)
      const mar = dayK > 0.5 ? '' :
        `<g transform="rotate(${n0(wrapH(haM) * 5)}) scale(${(R / 50).toFixed(3)})" fill="#9a917e"><g opacity="${o2(0.09 * mO)}"><path id="skMm0" d="${rel(maria)}"/></g>` +
        `<use href="#skMm0" transform="scale(.86)" opacity="${o2(0.07 * mO)}"/><use href="#skMm0" transform="scale(1.1)" opacity="${o2(0.04 * mO)}"/></g>`
      css.push(
        `.skMm{animation:skMm ${span}s linear forwards;animation-delay:calc(var(--t)*-1s)}@keyframes skMm{to{transform:translate(${n0(mx2 - mx)}px,${n0(my2 - my)}px)}}`,
      )
      scr +=
        `<g transform="translate(${n0(mx)} ${n0(my)})" opacity="${o2(vis)}"><g class="skMm">${halo}` +
        `<g clip-path="url(#skMc)"><circle r="${(R + 0.6).toFixed(1)}" fill="url(#skMg)"/>${mar}</g></g></g>`
      // Lớp tô đêm (multiply) phủ cả trời → đĩa trăng chỉ còn ~40% độ sáng. Khoét một lỗ mềm CHỈ vừa đĩa, sâu tối đa 62%
      // (trăng vẫn sáng ~L*80): vật đứng trước trăng vẫn còn phần lớn màu đêm, chỉ sáng nhẹ như ánh trăng hắt (light-wrap),
      // không thành đĩa ban ngày. Mưa / nhiều mây: không khoét (trăng khuất).
      const kM = 0.62 * night * smooth(0.08, 0.32, mS) * (lvl <= 2 && !raining(ctx.cur.precip) ? 1 : 0) * clamp(vis, 0, 1) * (0.4 + 0.6 * illum)
      if (kM > 0.05) {
        const tr = Math.hypot(mx2 - mx, my2 - my) / 2
        hole('skGh', mxc, myc, R + tr, R * 1.24 + tr, kM)
      }
    }
    if (holes.length) {
      defs.push(`<mask id="skGm" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="1000"><rect width="1600" height="1000" fill="#fff"/>${holes.join('')}</mask>`)
      css.push(`.grade,rect[fill="url(#hzg)"]{mask:url(#skGm)}`)
    }

    // ── Sao băng: 1–2 vệt mỗi cửa sổ (đêm quang); đêm mưa sao băng 4 vệt toả ra từ điểm phát xạ ──
    if (Math.max(dl, dl2) < 0.12 && lvl <= 1 && !raining(ctx.cur.precip)) {
      const rm = ctx.rng(`sky-sao-bang-${Math.floor(ctx.now / 60000)}`)
      const lst = mod(18.697374558 + 24.06570982441908 * ((ctx.now - J2000) / 864e5) + 105.85 / 15, 24)
      const sh = SHOWERS.find(([d]) => Math.abs(ctx.vn.doy - d) <= 2)
      const rad = sh ? at(lst - sh[1], sh[2] * D2R) : undefined
      const n = sh && rad && rad[2] > 0 ? 4 : rm() < 0.55 ? 1 : 2
      let met = ''
      for (let i = 0; i < n; i += 1) {
        const x = 160 + rm() * 1280
        const y = 50 + rm() * 300
        let a = (rm() < 0.5 ? 20 + rm() * 45 : 115 + rm() * 45) * D2R
        if (rad && rad[2] > 0) a = Math.atan2(y - rad[1], x - rad[0])
        const delay = (12 + rm() * (span - 24)).toFixed(1)
        const len = n0(110 + rm() * 130)
        met +=
          `<g transform="translate(${n0(x)} ${n0(y)}) rotate(${n0(a / D2R)})"><g class="skMe" style="animation-delay:calc(${delay}s - var(--t)*1s)">` +
          `<path fill="url(#skMt)" d="M${-len} -1.2L0 0 ${-len} 1.2Z"/><circle r="1.5" fill="#fff"/></g></g>`
      }
      defs.push(`<linearGradient id="skMt"><stop offset="0" stop-color="#cfe0ff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>`)
      css.push('.skMe{opacity:0;animation:skMe 1.5s cubic-bezier(.3,.1,.6,1) both}@keyframes skMe{from{transform:translateX(-60px);opacity:0}12%{opacity:.9}70%{opacity:.8}to{transform:translateX(260px);opacity:0}}')
      scr += met
    }

    // ═════════════ LỚP 0: MÂY ═════════════
    const pieces: Piece[] = []
    let mergeCum: (() => void) | null = null
    const X0 = -1300
    const W = 3600
    const V = [0.1, 0.17, 0.27] // px/giây theo tầng: xa (chậm) → gần (nhanh); hằng số để liền mạch qua các lần vẽ lại
    const hasCloud = lvMax >= 1
    const SY = { xuan: 0.9, ha: 1.12, thu: 0.85, dong: 0.74 }[ctx.season]
    const grow = 0.8 + 0.3 * smooth(8, 14.5, ctx.vn.hourF) // mây tích lớn dần về chiều
    const rimOn = sS < 0.14 && (sS > -0.12 || moonB > 0.2) // viền nắng chiều tà / viền bạc dưới trăng
    const drift = (v: number, inner: string) => (inner ? `<g class="skD" style="--dx:${n0(v * span)}px">${inner}</g>` : '')
    const xAt = (u: number, v: number) => X0 + mod(u + v * T, W)
    css.push(`.skD{animation:skD ${span}s linear forwards;animation-delay:calc(var(--t)*-1s)}@keyframes skD{to{transform:translateX(var(--dx))}}`)
    const gx = (v: number) => o2(0.5 + v * 0.5)
    const lg = (id: string, stops: string) => `<linearGradient id="${id}" x1="${gx(lx)}" y1="${gx(ly)}" x2="${gx(-lx)}" y2="${gx(-ly)}">${stops}</linearGradient>`
    const vg = (id: string, stops: string, attr = '') => `<linearGradient id="${id}" x2="0" y2="1"${attr}>${stops}</linearGradient>`

    /**
     * Một khối mây (định nghĩa một lần, đặt nhiều lần bằng <use>), vẽ từng HÀNG MÚI từ sau ra trước:
     *  · thân hàng: gradient DỌC theo khung của chính hàng — đỉnh sáng → chân tối ngả lạnh → mép đáy tan dần vào trời;
     *    hàng trước đè chân tối của hàng sau → ranh khối mềm (súp lơ) chứ không phải tấm trắng có đáy xám kẻ thước;
     *  · phủ sáng theo HƯỚNG nguồn sáng (sáng: trái, chiều: phải, dưới chân trời: hắt từ dưới), tắt dần về phía khuất;
     *  · lông mềm: chính đường bao, nét rộng mờ cùng gradient → mép không cắt giấy;
     *  · viền nắng (giờ vàng / dưới trăng): bản sao lệch 3 px về phía nguồn sáng nằm DƯỚI hàng → lưỡi liềm sáng mảnh.
     */
    const sym = (id: string, rows: Row[], o: { fill?: string; lit?: boolean; feather?: number } = {}) => {
      const fill = o.fill ?? 'url(#skB)'
      let s = `<g id="${id}" fill="${fill}"${!lite && o.feather ? ` stroke="${fill}" stroke-width="${o.feather}" stroke-opacity=".28" stroke-linejoin="round"` : ''}>`
      rows.forEach((row, k) => {
        const pid = id + 'abc'.charAt(k)
        if (rimOn && o.lit !== false && !lite) s += `<use href="#${pid}" fill="url(#skRm)" x="${n0(lx * 3)}" y="${n0(ly * 3)}"/>`
        s += `<path id="${pid}" d="${outline(row.cs, row.yb)}"/>`
        if (o.lit !== false) s += `<use href="#${pid}" fill="url(#skLt)"/>`
      })
      return `${s}</g>`
    }
    if (hasCloud) {
      const far = (c: string, k: number) => mix(c, look.haze, k)
      // nén giá trị: thân & bụng mây ngả về màu trời phía sau (nền yên, không mảng trắng gắt); chỉ phía bắt sáng giữ sáng
      const skyB = mix(look.sky[0], look.sky[1], 0.5)
      const b1 = mix(c1, skyB, 0.27)
      const b0 = mix(c0, skyB, 0.32)
      // Giá trị theo CẢ KHỐI (toạ độ của hình, đáy y = 0, đỉnh ≤ −170), không theo từng hàng: đỉnh sáng → thân → bóng đáy →
      // đáy TAN hẳn vào không khí (không còn mép đáy cắt thẳng, không có viền tối). Ranh múi giữa các hàng do lớp phủ sáng
      // theo hướng nguồn (skLt, theo từng hàng) vẽ ra → ba cấp sáng–vừa–tối trong một khối.
      const ug = (stops: string) => `<linearGradient id="skB" gradientUnits="userSpaceOnUse" x2="0" y1="-170" y2="6">${stops}</linearGradient>`
      defs.push(
        (under
          ? ug(stp(0, mix(b1, b0, 0.55)) + stp(0.5, b1) + stp(0.8, mix(b1, c2, 0.5)) + stp(0.9, mix(b1, c2, 0.5), 0.75) + stp(1, mix(b1, c2, 0.5), 0))
          : ug(stp(0, mix(c2, b1, 0.3)) + stp(0.42, b1) + stp(0.72, mix(b1, b0, 0.7)) + stp(0.86, b0, 0.7) + stp(1, b0, 0))) +
          // viền nắng: bản sao lệch về phía nguồn sáng, TAN về đáy như thân mây (không lộ đáy sáng cắt thẳng dưới bụng tan)
          (rimOn && !lite ? `<linearGradient id="skRm" href="#skB">${stp(0.55, c3) + stp(0.85, c3, 0)}</linearGradient>` : '') +
          lg('skLt', stp(0, c2, 0.82) + stp(0.42, c2, 0.34) + stp(0.8, c2, 0)) +
          vg('skLf', stp(0, far(mix(c1, c2, 0.5), 0.38)) + stp(0.6, far(c1, 0.48)) + stp(0.9, far(mix(c1, c0, 0.4), 0.5), 0.7) + stp(1, far(mix(c1, c0, 0.4), 0.5), 0.2)),
      )
    }

    // Mây ti: các sợi lông chim mảnh, cong, đầu móc, góc & dài khác nhau, rất nhạt; trời quang chỉ phảng phất (ngày).
    {
      const vals = ctx.weather.map(w => (raining(w.precip) ? 0 : ([dl > 0.5 ? 0.35 : 0, 1, 0.75, 0, 0][LV[w.cloud]] as number)))
      if (vals.some(v => v > 0)) {
        const rc = ctx.rng('sky-may-ti')
        const stretch = 1 + ctx.cur.wind * 0.7
        let d = ''
        // mỗi vạt mây ti = 4–7 thấu kính mảnh chồng nhau, dài ngắn lệch, cùng uốn theo một cung nhẹ — như một nét cọ khô
        // (chỗ chồng dày hơn → thớ sợi), không phải các vạch song song đều nhau.
        const nC = lite ? 3 : ctx.season === 'thu' ? 5 : 4
        for (let i = 0; i < nC; i += 1) {
          const x = xAt(((i + rc() * 0.7) / nC) * W, 0.3)
          const y = 40 + rc() * 190
          const ang = (-9 + rc() * 13) * D2R
          const arc = (rc() < 0.5 ? -1 : 1) * (0.25 + rc() * 0.35)
          const k = (lite ? 2 : 3) + Math.floor(rc() * 4)
          const span0 = (160 + rc() * 260) * stretch
          for (let j = 0; j < k; j += 1) {
            const u0 = rc() * 0.55
            const L = span0 * (0.3 + rc() * 0.6)
            const t = 5 + rc() * 8
            const o = (rc() - 0.5) * 16
            const px0 = x + Math.cos(ang) * span0 * u0 - Math.sin(ang) * o
            const py0 = y + Math.sin(ang) * span0 * u0 + Math.cos(ang) * o + arc * span0 * (u0 - 0.5) ** 2
            const a1 = ang + arc * (u0 - 0.2)
            const ex = Math.cos(a1) * L
            const ey = Math.sin(a1) * L + arc * L * 0.18
            const bw = arc * L * 0.12
            d += `M${n0(px0)} ${n0(py0)}q${n0(ex * 0.45)} ${n0(ey * 0.45 - t + bw)} ${n0(ex)} ${n0(ey)}q${n0(-ex * 0.5)} ${n0(-ey * 0.5 + t * 0.6 + bw)} ${n0(-ex)} ${n0(-ey)}z`
          }
        }
        // mây ti ở rất cao còn bắt nắng sau khi mặt trời đã lặn: ráng hồng cam
        const glowK = Math.exp(-(((sS + 0.02) / 0.07) ** 2)) * (lvl <= 2 ? 1 : 0.4)
        const ciCol = mix(mix(c2, c1, 0.25), mix(sunCol, '#ff9ab4', 0.45), glowK * 0.85)
        let rang = ''
        if (glowK > 0.12 && !lite) {
          // "ráng mỡ gà": vài dải mây mỏng nằm ngang sát chân trời, bụng hắt đỏ, độ dài & độ dày lệch nhau
          let d2 = ''
          for (let i = 0; i < 6; i += 1) {
            const L = 220 + rc() * 520
            const th = 3 + rc() * 6
            const x0 = X0 + mod(rc() * W + 0.12 * T, W)
            const y0 = 330 + rc() * 140
            d2 += `M${n0(x0)} ${n0(y0)}q${n0(L * 0.45)} ${n0(-th)} ${n0(L)} ${n0(rc() * 8 - 4)}q${n0(-L * 0.5)} ${n0(th * 0.8)} ${n0(-L)} 0z`
          }
          rang = `<path fill="${mix(sunCol, '#ff7a8c', 0.35)}" opacity="${o2(0.42 * glowK)}" d="${P(d2)}"/>`
        }
        const att = fader('skFc', vals, ctx.weather, span, css)
        pieces.push({
          layer: 0,
          x0: X0,
          x1: X0 + W + 500,
          prio: 4,
          svg: drift(
            0.3,
            `<g${att}><g fill="${ciCol}"><g stroke="${ciCol}" stroke-width="5" opacity="${o2(0.05 + 0.05 * glowK)}"><path id="skCi" d="${P(d)}"/></g>` +
              `<use href="#skCi" opacity="${o2(0.1 + 0.14 * glowK)}"/></g>${rang}</g>`,
          ),
        })
      }
    }

    // Mây vảy cá (trung tích) về đêm trời ít mây: những mảng vảy li ti lúc dày lúc thưa theo nhiễu (không hàng lối đều),
    // ô lệch cỡ, chỉ sáng ở phía trăng.
    if (dl < 0.3 && ctx.weather.some(w => LV[w.cloud] === 1 && !raining(w.precip))) {
      const ra = ctx.rng('sky-vay-ca')
      const nz = ctx.noise('sky-vay-ca')
      const vals = ctx.weather.map(w => (LV[w.cloud] === 1 && !raining(w.precip) ? 1 : 0))
      const cells: [string, string] = ['', '']
      const pos = [[0, 0], [0, 0]]
      const cx0 = ra() * W
      for (let row = 0; row < 7; row += 1) {
        const y0 = 140 + row * (15 + ra() * 8)
        for (let i = 0; i < 22; i += 1) {
          const u = cx0 + (i - 11) * (34 + ra() * 14) + (row % 2) * 17
          const dens = fbm(nz, u / 260, row / 3.2, 2) + 0.28 - Math.abs(row - 3) * 0.06 - Math.abs(i - 11) * 0.012
          if (dens < 0.1 || ra() < 0.15) continue
          const x = X0 + mod(u + (ra() - 0.5) * 14 + 0.17 * T, W)
          const y = y0 + Math.sin(i * 0.6 + row) * 4 + (ra() - 0.5) * 6
          const L = n0(1 + ra() * 5 + dens * 6)
          const k = dens > 0.3 ? 0 : 1
          const pp = pos[k] as number[]
          cells[k] += cells[k] ? `m${n0(x) - (pp[0] as number)} ${n0(y) - (pp[1] as number)}h${L}` : `M${n0(x)} ${n0(y)}h${L}`
          pos[k] = [n0(x) + L, n0(y)]
        }
      }
      const att = fader('skFk', vals, ctx.weather, span, css)
      const mo = 0.16 + 0.2 * moonB
      pieces.push({
        layer: 0,
        x0: X0,
        x1: X0 + W,
        prio: 4,
        svg: drift(
          0.17,
          `<g${att}><g fill="none" stroke-linecap="round" opacity="${o2(mo)}" stroke="#7a87ae"><g stroke-width="13"><path id="skAk" d="${P(cells[0])}"/></g>` +
            (cells[1] ? `<path stroke-width="8" d="${P(cells[1])}"/>` : '') +
            `<use href="#skAk" x="${n0(lx * 3)}" y="${n0(ly * 3)}" stroke="#b8c2e4" stroke-width="6"/></g></g>`,
        ),
      })
    }

    // Mây tầng (u ám / mưa): MỘT tấm phủ liền. Chân mây là chuỗi cuộn nặng (cung lồi xuống, cỡ lệch theo nhiễu) bắt viền sáng
    // mảnh từ dải trời sáng ở xa; một hàng cuộn tối thứ hai lùi sâu phía trên tạo LỚP (chiều sâu), vài mảng mây mỏng sáng
    // hơn. Mưa: chân mây nâng cao → lộ dải trời sáng sau màn mưa ở chân trời, rèm mưa (virga) xiên theo gió rủ từ chân mây.
    // Tuyết đêm: chân mây hắt ánh tuyết (quầng xám ấm sát chân mây).
    const wet = (w: WeatherSlice) => raining(w.precip)
    // Sương mù dày: mây khối tan hết vào MỘT màn sương tầng gần như không mép (vài quầng sáng mềm rất rộng, trôi chậm).
    const foggy = ctx.cur.fog > 0.35
    if (foggy) {
      const rv = ctx.rng('sky-man-suong')
      let d = ''
      for (let i = 0; i < (lite ? 3 : 5); i += 1) d += `<ellipse cx="${n0(xAt(rv() * W, V[0] as number))}" cy="${n0(230 + rv() * 170)}" rx="${n0(460 + rv() * 420)}" ry="${n0(46 + rv() * 54)}"/>`
      defs.push(`<radialGradient id="skMs">${stp(0, mix(look.haze, '#ffffff', 0.4), 0.46) + stp(0.55, mix(look.haze, '#ffffff', 0.2), 0.2) + stp(1, look.haze, 0)}</radialGradient>`)
      pieces.push({ layer: 0, x0: X0, x1: X0 + W + 900, prio: 6, svg: drift(V[0] as number, `<g fill="url(#skMs)">${d}</g>`) })
    }
    const rainy = ctx.weather.some(wet)
    const by = rainy ? 392 : 372
    if (lvMax >= 3 && ctx.weather.some(w => deckK(w) > 0)) {
      const nz = ctx.noise('sky-tang')
      const off = 0.08 * T
      const nb = (x: number, k: number, oc = 3) => fbm(nz, (x - off) / 520 + k, k * 1.7, oc) * 2
      // mép chân mây vũ tầng: KHÔNG tuần hoàn — nhiễu nhiều quãng (sóng dài võng sâu + gợn ngắn lệch) với bước lấy mẫu lệch
      // ngẫu nhiên → chân mây chỗ sà thấp chỗ rách lên, không có hàng múi đều như diềm (vẽ từ phải sang trái)
      const rl = ctx.rng('sky-tang-cuon')
      const edgeOf = (y0: number, amp: number, k: number) => {
        const pts: Pt[] = []
        for (let x = 2600; x > -1560; x -= lite ? 150 + rl() * 120 : 80 + rl() * 80) pts.push([x, y0 + amp * (nb(x, k) * 1.2 + 0.5 * fbm(nz, (x - off) / 150 + k, k * 2.3, 2) * 2)])
        pts.push([-1500, y0 + amp * nb(-1500, k)])
        return smoothPath(pts).replace('M', 'L')
      }
      const cover = rel(`M-1500 -400H2600${edgeOf(by, 34, 0.3)}Z`)
      const by2 = by - 92
      const rolls = rel(`M-1500 ${by2 - 150}H2600${edgeOf(by2, 30, 3.4)}Z`)
      const snow = ctx.weather.some(w => w.precip === 'tuyet')
      // tông riêng của tấm mây: mưa → chân mây sẫm nặng hơn hẳn trời (đủ "sức nặng" làm nguồn mưa); tuyết đêm → tấm mây
      // sáng hơn trời đêm quang (hắt ánh tuyết), hơi ấm.
      const rk = rainy ? (ctx.weather.some(w => w.precip === 'mua-to') ? 1 : 0.8) : 0
      const sk = snow ? 0.75 * (1 - dl) : 0
      const d0 = mix(mix(c0, mix('#1c2030', '#4a5162', dl), 0.55 * rk), '#14142a', sk)
      const d1 = mix(mix(c1, mix('#30344a', '#848c9b', dl), 0.45 * rk), '#4e4c6a', sk)
      const d2 = mix(c2, '#dcd4e2', sk)
      // tuyết đêm: tấm mây được hắt sáng TỪ DƯỚI (đỉnh trời tối, chân mây sáng, mép cuộn bắt sáng) — ngược với trời mưa ngày
      const up = sk > 0.2
      defs.push(
        (up
          ? vg('skOv', stp(0, d0) + stp(0.45, mix(d0, d1, 0.5)) + stp(0.75, d1) + stp(0.93, mix(d1, d2, 0.75)) + stp(1, d2)) + vg('skRl', stp(0, d0, 0) + stp(0.55, d0, 0.4) + stp(0.86, d2, 0.42) + stp(1, d2, 0.12))
          : vg('skOv', stp(0.3, mix(d1, d2, 0.22)) + stp(0.72, d1) + stp(0.9, mix(d1, d0, 0.45)) + stp(0.96, mix(d1, d0, 0.6), 0.8) + stp(1, mix(d1, d0, 0.5), 0.3)) + vg('skRl', stp(0, d0, 0) + stp(0.72, d0, 0.42) + stp(0.9, d0, 0.6) + stp(1, d0, 0.4))) +
          vg('skRh', stp(0, d2, 0) + stp(0.55, mix(d2, '#ffdcb0', 0.6), 0.9) + stp(1, d2, 0)) +
          `<radialGradient id="skRg">${stp(0, snow ? mix(d2, '#ffe2c0', 0.4) : d2, snow ? 0.6 : 0.26) + stp(1, d2, 0)}</radialGradient>`,
      )
      const vals = ctx.weather.map(deckK)
      const att = fader('skFa', vals, ctx.weather, span, css)
      // mảng mây mỏng sáng hơn (chỗ thưa) — to, mềm, ít
      const rb = ctx.rng('sky-tang-thua')
      let thin = ''
      // chỗ mây mỏng: quầng sáng mềm không viền (gradient tròn), to & thưa — không thành hình thấu kính
      for (let i = 0; i < (lite ? 2 : 3); i += 1)
        thin += `<ellipse cx="${n0(-1300 + mod(rb() * 3600 + off, 3600))}" cy="${n0(110 + rb() * 170)}" rx="${n0(240 + rb() * 220)}" ry="${n0(60 + rb() * 50)}"/>`
      // tuyết đêm: chân mây hắt ánh tuyết dưới đất (quầng xám ấm mỏng sát chân mây)
      // trần mây thấp hắt ánh đèn làng & tuyết: quầng ấm nhạt sát chân mây
      const glow = snow ? `<ellipse cx="400" cy="${by}" rx="2300" ry="170" fill="url(#skRh)"/>` : ''
      let virga = ''
      if (rainy) {
        const rv = ctx.rng('sky-rem-mua')
        const lean = 30 + ctx.cur.wind * 120
        let d = ''
        let d2 = ''
        // 2–3 rèm mưa rộng, rủ từ đúng chỗ chân mây sà thấp; mỗi rèm = lõi đậm hẹp + vạt nhạt rộng → mép tan, không thành sọc
        for (let i = 0; i < (lite ? 2 : 3); i += 1) {
          const x = -1300 + mod(((i + 0.2 + rv() * 0.6) / 3) * 3600 + off, 3600)
          const w = 150 + rv() * 220
          const y0 = by + 34 * nb(x + w / 2, 0.3) * 1.2 - 16
          const L = 190 + rv() * 120
          const sl = lean * (L / 270)
          d += `M${n0(x + w * 0.2)} ${n0(y0)}h${n0(w * 0.6)}l${n0(sl - w * 0.1)} ${n0(L)}h${n0(-w * 0.4)}z`
          d2 += `M${n0(x)} ${n0(y0 - 6)}h${n0(w)}l${n0(sl + w * 0.15)} ${n0(L * 1.1)}h${n0(-w * 1.2)}z`
        }
        // rèm mưa XA: hẹp, ngắn, nhạt, ngả màu sương, sát chân trời — tầng thứ hai sau các rèm gần → mưa có chiều sâu
        let d3 = ''
        for (let i = 0; i < (lite ? 0 : 6); i += 1) {
          const x = -1300 + mod(rv() * 3600 + off, 3600)
          const w = 40 + rv() * 70
          const L = 70 + rv() * 60
          d3 += `M${n0(x)} ${n0(by + 44 + rv() * 20)}h${n0(w)}l${n0(lean * 0.3)} ${n0(L)}h${n0(-w * 1.3)}z`
        }
        d2 += d3
        defs.push(vg('skVr', stp(0, d0, 0.62) + stp(0.55, d0, 0.3) + stp(1, d0, 0)))
        const va = fader('skFg', ctx.weather.map(w => (w.precip === 'mua-to' ? 1 : w.precip === 'mua' ? 0.85 : w.precip === 'phun' ? 0.5 : 0)), ctx.weather, span, css)
        virga = `<g${va} fill="url(#skVr)"><path d="${P(d)}"/>${d2 ? `<path opacity=".4" d="${P(d2)}"/>` : ''}</g>`
      }
      pieces.push({
        layer: 0,
        x0: -1500,
        x1: 2600,
        prio: 5,
        svg: drift(
          0.08,
          `<g${att}>${virga}<use href="#skDk" fill="none" stroke="${mix(d1, d0, 0.5)}" stroke-width="40" opacity=".1"/><g fill="url(#skOv)"><path id="skDk" d="${cover}"/></g>` +
            (thin ? `<g fill="url(#skRg)">${thin}</g>` : '') +
            `<path fill="url(#skRl)" d="${rolls}"/>` +
            `<use href="#skDk" fill="none" stroke="${mix(d2, look.haze, 0.3)}" stroke-width="2.5" opacity="${snow ? '.3' : '.24'}"/>${glow}</g>`,
        ),
      })
    }

    // Mây tích & bè mây theo MẢNG: ít = vài cụm nhỏ dẹt (mây đẹp trời) · vừa = thêm cụm to, khối cao ở tầng gần · nhiều =
    // bè mây tầng tích dẹt rộng (các cụm nhỏ tan vào bè) · u ám = chỉ tấm mây tầng. Tầng xa nhỏ, dẹt, nhạt, ngả màu sương;
    // tầng gần lớn, tương phản nhất: theo màn hình, chỉ ở hai dải mép (xem dưới). Chỉ định nghĩa hình nào thật sự được đặt trong cửa sổ này.
    if (hasCloud) {
      type Shp = { id: string; w: number; make: () => string }
      // một hình dải mây xa (lật gương khi đặt → đủ dạng mà chỉ tốn một định nghĩa)
      const strips: Shp[] = [0].map(i => {
        const rs = ctx.rng(`sky-hinh-S${i}`)
        const w = 560 + rs() * 120
        const cs = strato(rs, w)
        return { id: `skS${i}`, w, make: () => sym(`skS${i}`, [{ cs, yb: 0 }], { fill: 'url(#skLf)', lit: false, feather: 6 }) }
      })
      // 4 hình mây: A0 tích nhỏ dẹt (mây đẹp trời) · A1 tích vừa · A2 tích lớn cao · A3 bè mây tầng tích (2 hàng, dẹt)
      const cums: Shp[] = ([[460, 130, 0.2], [380, 190, 0], [520, 250, 0], [640, 170, 0.6]] as [number, number, number][]).map(([w, h, fl], i) => {
        const rows = cumRows(ctx.rng(`sky-hinh-A${i}`), w, h, fl)
        return { id: `skA${i}`, w, make: () => sym(`skA${i}`, rows, { feather: 6 }) }
      })
      const used = new Set<Shp>()
      const rp = ctx.rng('sky-dat-may')
      type Inst = { tier: number; depth: number; s: string }
      const inst: Inst[] = []
      const use = (id: string, x: number, y: number, sx: number, sy: number, sk: number, op = '') =>
        `<use href="#${id}" transform="matrix(${f2(sx)} 0 ${f2(sx * Math.tan(sk * D2R))} ${f2(sy)} ${n0(x)} ${n0(y)})"${op ? ` opacity="${op}"` : ''}/>`
      // [tầng mây(tier), tầng sâu, số cụm, y0, y1, cỡ0, cỡ1, kéo ngang, ép dọc, số khối tối đa, hình từ, hình đến, độ mờ]
      const PLAN: [number, number, number, number, number, number, number, number, number, number, number, number, number][] = [
        [1, 0, 5, 352, 428, 0.45, 0.85, 1, 0.6, 1, 0, 0, 0.42],
        [1, 1, 3, 300, 362, 0.36, 0.55, 1, 0.78, 2, 0, 1, 0.44],
        [1, 2, 3, 112, 200, 0.85, 1.2, 1, 0.95, 2, 0, 1, 1],
        [2, 0, 2, 412, 462, 0.75, 1.05, 1.2, 0.58, 1, 0, 0, 0.6],
        [2, 1, 2, 304, 362, 0.46, 0.64, 1, 0.84, 2, 0, 1, 0.5],
        [2, 2, 2, 130, 210, 0.9, 1.15, 1, 1, 2, 1, 2, 1],
        [3, 0, 2, 408, 455, 0.9, 1.25, 1.3, 0.55, 2, 0, 0, 0.6],
        [3, 1, 2, 322, 382, 0.6, 0.8, 1.2, 0.72, 2, 3, 3, 0.62],
        [3, 2, 2, 140, 222, 1, 1.25, 1.15, 0.8, 2, 2, 3, 1],
      ]
      // mỗi tầng mây hiện theo MẢNG của mức mây (không cộng dồn: trời nhiều mây thì các cụm nhỏ tan vào bè)
      const show: number[][] = [[0, 1, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, 0]]
      const tierOn = (t: number) => ctx.weather.some(w => ((show[t - 1] as number[])[LV[w.cloud]] as number) > 0)
      for (const [tier, depth, count, y0, y1, s0, s1, kx, ky, nmMax, h0, h1, op] of PLAN) {
        if (depth === 2) continue
        const fam = depth === 0 ? strips : cums
        for (let i = 0; i < count; i += 1) {
          const ax = ((i + 0.15 + rp() * 0.7) / count) * W + tier * 397 + depth * 211
          const yb = y0 + rp() * (y1 - y0)
          const sc = (s0 + rp() * (s1 - s0)) * (depth && tier < 3 ? grow : 1)
          const nm = 1 + Math.floor(rp() * nmMax)
          const sk = (rp() - 0.5) * 8
          const lr = rp()
          const skip = (lite && lr < 0.4) || !tierOn(tier) || foggy
          const mid = Math.floor(nm / 2)
          const masses: [number, string][] = []
          let off = 0
          for (let k = 0; k < nm; k += 1) {
            const sh = fam[h0 + Math.floor(rp() * (h1 - h0 + 1))] as Shp
            const s = sc * (k === mid ? 1 : 0.55 + rp() * 0.25)
            const sx = s * kx * (0.9 + rp() * 0.25) * (depth === 0 && rp() < 0.5 ? -1 : 1)
            const sy = s * ky * (depth === 0 ? 1 : SY) * (0.85 + rp() * 0.3)
            const dy = (k === mid ? 0 : 6 + rp() * 16) * (depth ? 1 : 0.4)
            masses.push([k === mid ? 1 : 0, use(sh.id, xAt(ax + off, V[depth] as number), yb + dy, sx, sy, sk + (rp() - 0.5) * 3, op < 1 ? o2(op) : '')])
            off += 0.5 * sh.w * sx
            if (!skip) used.add(sh)
          }
          if (skip) continue
          masses.sort((a, b) => a[0] - b[0])
          inst.push({ tier, depth, s: masses.map(m => m[1]).join('') })
        }
      }
      // Tầng GẦN (mây khối lớn, tương phản nhất) đặt theo MÀN HÌNH — lớp trời hầu như không trượt theo camera (f = 0.06) nên
      // không mất gì — và CHỈ trong hai dải mép trái/phải: cột chat giữa (x 400–1200) chỉ còn trời trơn & mây xa nhạt. Mỗi
      // cụm có vòng đời 43–55 phút theo thời gian tuyệt đối (liền mạch qua các lần vẽ lại): dải phải sinh ở mép trong rồi trôi
      // dần ra mép khung; dải trái trôi từ mép khung vào, tan trước khi chạm cột giữa. Hiện/tan dần ở hai đầu vòng đời.
      // Dải trái: trượt vào từ ngoài mép (không cần hiện dần), TAN dần trước cột giữa. Dải phải: HIỆN dần ở mép trong, trượt hẳn
      // ra ngoài khung. Hai đầu vòng đời (7% ≥ span/Lt) luôn vô hình (ngoài khung hoặc độ mờ 0) → cửa sổ vắt qua lúc tái
      // sinh bỏ qua được mà không giật.
      // + chỉ hiện khi đã lộ ≥ ~half khối trong khung: không bao giờ còn một mẩu mây cụt (đọc thành đĩa/viên thuốc) ở mép khung
      const life = (q: number, z: number, hw: number) =>
        smooth(0.45, 0.8, clamp((z ? 400 - 460 * q : 460 * q - 60) / (2 * hw), 0, 1)) * (z ? smooth(0.07, 0.2, q) : 1 - smooth(0.8, 0.93, q))
      const nearCss: string[] = []
      PLAN.filter(q => q[1] === 2).forEach(([tier, , count, y0, y1, s0, s1, kx, ky, nmMax, h0, h1, op]) => {
        for (let i = 0; i < count; i += 1) {
          const zone = (i + tier) % 2
          rp()
          const Lt = 2600 // cùng vòng đời & cùng bề rộng dải (460 px) → mọi cụm cùng tốc độ trôi: dùng chung MỘT keyframes
          const ph0 = rp()
          const yb = y0 + rp() * (y1 - y0)
          const sc = (s0 + rp() * (s1 - s0)) * (tier < 3 ? grow : 1)
          const nm = 1 + Math.floor(rp() * nmMax)
          const sk = (rp() - 0.5) * 8
          const lr = rp()
          const mid = Math.floor(nm / 2)
          const ms: { k: number; sh: Shp; ox: number; dy: number; sx: number; sy: number; sk: number }[] = []
          let off = 0
          for (let k = 0; k < nm; k += 1) {
            const sh = cums[h0 + Math.floor(rp() * (h1 - h0 + 1))] as Shp
            const s = sc * (k === mid ? 1 : 0.55 + rp() * 0.25)
            const sx = s * kx * (0.9 + rp() * 0.25)
            const sy = s * ky * SY * (0.85 + rp() * 0.3)
            ms.push({ k: k === mid ? 1 : 0, sh, ox: off, dy: k === mid ? 0 : 6 + rp() * 16, sx, sy, sk: sk + (rp() - 0.5) * 3 })
            off += 0.5 * sh.w * sx
          }
          // mọi rp() đã rút xong → bỏ qua ở đây không làm lệch chuỗi ngẫu nhiên của cụm sau
          const a0 = ms[0] as (typeof ms)[0]
          const aZ = ms[ms.length - 1] as (typeof ms)[0]
          const L0 = -a0.sh.w * a0.sx * 0.5
          const R0 = aZ.ox + aZ.sh.w * aZ.sx * 0.5
          const hw = (R0 - L0) / 2
          const xa = zone ? 1200 + hw : -hw - 60
          const xb = zone ? 1660 + hw : 400 - hw
          const pA = mod(T / Lt + ph0, 1)
          const pB = mod((T + span) / Lt + ph0, 1)
          const fa = o2(life(pA, zone, hw) * op)
          const fb = o2(life(pB, zone, hw) * op)
          if ((lite && lr < 0.4) || !tierOn(tier) || foggy || pB < pA || (fa === '0' && fb === '0') || xb <= xa) continue
          for (const m of ms) used.add(m.sh)
          const x0 = xa + (xb - xa) * pA - L0 - hw
          // mọi cụm cùng trôi trong MỘT nhóm skG; chỉ cụm đang hiện/tan mới thêm một phần tử đổi độ mờ (keyframes riêng)
          let an = fa !== '1' ? ` opacity="${fa}"` : ''
          if (fa !== fb) {
            an = ` class="skGf" style="animation-name:skG${nearCss.length}"`
            nearCss.push(`@keyframes skG${nearCss.length}{from{opacity:${fa}}to{opacity:${fb}}}`)
          }
          ms.sort((a, b) => a.k - b.k)
          inst.push({ tier, depth: 3, s: `<g${an}>${ms.map(m => use(m.sh.id, x0 + m.ox, yb + m.dy, m.sx, m.sy, m.sk)).join('')}</g>` })
        }
      })
      let whaleS = ''
      // Câu chuyện: cá Ông bằng mây bơi rất XA trong lớp sương chân trời (dreamcore kín đáo) — chỉ trời đẹp ít/vừa mây, ban
      // ngày, LẶNG GIÓ; mùa xuân (mùa lễ cầu ngư) về mỗi sớm lặng gió 6:40–10:30, mùa khác hiếm (≈ 1/8 số ngày, ghé 1–2 giờ).
      // Tương phản thấp (~20%): thân ngả màu sương, mép tan thành sợi; không vòi phun, không viền nét.
      const wr = ctx.rng(`sky-ca-ong-${ctx.vn.y}-${ctx.vn.doy}`)
      const spr = ctx.season === 'xuan'
      const whaleDay = spr || wr() < 0.13
      const wh0 = spr ? 6.6 : 8.3 + wr() * 7
      const wDur = spr ? 3.9 : 1.1 + wr() * 0.7
      const wo = (h: number) => smooth(wh0, wh0 + 0.3, h) * (1 - smooth(wh0 + wDur - 0.3, wh0 + wDur, h))
      const wA = wo(ctx.vn.hourF)
      const wB = wo(ctx.vn.hourF + hrs)
      const whaleVals = ctx.weather.map(w => (LV[w.cloud] === 2 && !raining(w.precip) && w.fog < 0.35 && w.wind <= 0.35 && dl > 0.45 ? 1 : 0))
      const wK = 0.6
      if (whaleDay && o2(Math.max(wA, wB) * wK) !== '0' && whaleVals.some(v => v > 0)) {
        const rw = ctx.rng('sky-ca-ong-hinh')
        let tw = ''
        for (let i = 0; i < (lite ? 2 : 4); i += 1) {
          const L = 60 + rw() * 90
          tw += `M-262 ${n0(-36 + i * 11 + rw() * 6)}q${n0(-L * 0.5)} ${n0(-4 + rw() * 8)} ${n0(-L)} ${n0(rw() * 12 - 6)}q${n0(L * 0.55)} ${n0(3)} ${n0(L)} ${n0(3)}z`
        }
        const far = (c: string, k: number) => mix(c, look.haze, k)
        defs.push(
          vg('skWf', stp(0, far(mix(c2, c1, 0.3), 0.42)) + stp(0.55, far(c1, 0.5)) + stp(1, far(mix(c1, c0, 0.5), 0.52), 0.3)) +
            `<g id="skW" fill="url(#skWf)" stroke="url(#skWf)" stroke-linejoin="round"><path id="skWo" stroke-width="12" stroke-opacity=".18" d="${rel(WHALE_BODY)}"/>` +
            `<path opacity=".8" d="${rel(WHALE_FIN)}"/><path opacity=".45" stroke="none" d="${P(tw)}"/></g>`,
        )
        const att = fader('skFw', whaleVals, ctx.weather, span, css)
        const op = (v: number) => o2(v * wK)
        css.push(op(wA) !== op(wB) ? `.skWv{animation:skWv ${span}s linear forwards;animation-delay:calc(var(--t)*-1s)}@keyframes skWv{from{opacity:${op(wA)}}to{opacity:${op(wB)}}}` : `.skWv{opacity:${op(wA)}}`)
        // tầng xa, theo MÀN HÌNH ở dải phải (x 1210–1455: ngoài cột chat, không chạm mép khung), nằm trên dải mây tầng chân
        // trời, nửa thân lẫn vào một vạt mây xa → như hiện ra từ sương
        whaleS = `<g${att}><g class="skWv"><use href="#skW" transform="matrix(.5 0 0 .44 1350 352)"/>${use('skS0', 1420, 372, 0.62, 0.5, 0, '.7')}</g></g>`
        used.add(strips[0] as Shp)
      }
      // Tháp mây giông chân trời: mùa hạ (và đầu thu) buổi trưa–chiều, khi trời đã vừa mây trở lên.
      let tower: { def: string; q: Inst } | null = null
      if ((ctx.season === 'ha' || (ctx.season === 'thu' && ctx.seasonT < 0.4)) && ctx.vn.hourF > 10.5 && ctx.vn.hourF < 19.6 && !raining(ctx.cur.precip) && lvl < 4 && lvMax >= 2) {
        // tháp ở xa sau núi: nhỏ, nhạt, ngả màu sương — một nét kể chuyện mùa hạ, không phải tiêu điểm
        tower = {
          def: sym('skCb', [{ cs: towerCb(ctx.rng('sky-giong')), yb: 0 }], { feather: 6 }),
          q: { tier: 2, depth: 0, s: `<use href="#skCb" transform="matrix(.62 0 0 .64 ${n0(xAt(600, V[0] as number))} 530)" opacity=".58"/>` },
        }
        inst.push(tower.q)
      }
      // Định nghĩa hình mây đã dùng; defs của trời giữ ≤ DEFS_CAP. Thiếu chỗ: bỏ dần hình mây tích chỉ số cao → dải S1 (lần đặt
      // của nó mượn hình liền trước: mây vẫn đủ, chỉ ít dạng hơn) → tháp giông.
      const made = new Map<Shp, string>()
      for (const sh of [...strips, ...cums]) if (used.has(sh)) made.set(sh, sh.make())
      const tail = (ctx.weather.some(wet) ? 120 : 0) + (ctx.weather.some(w => LV[w.cloud] === 4 || wet(w)) ? 140 : 0)
      const defsLen = () => defs.reduce((a, d) => a + d.length, 0) + [...made.values()].reduce((a, d) => a + d.length, 0) + (tower ? tower.def.length : 0) + tail
      const cap = lite ? DEFS_CAP * 0.55 : DEFS_CAP
      const fold = (fam: Shp[]) => {
        for (let i = fam.length - 1; i > 0 && defsLen() > cap; i -= 1) {
          const sh = fam[i] as Shp
          if (!made.has(sh)) continue
          const to = fam.slice(0, i).reverse().find(c => made.has(c)) ?? (fam[0] as Shp)
          if (!made.has(to)) made.set(to, to.make())
          made.delete(sh)
          for (const q of inst) q.s = q.s.split(`href="#${sh.id}"`).join(`href="#${to.id}"`)
        }
      }
      fold(cums)
      fold(strips)
      if (tower && defsLen() > cap) {
        inst.splice(inst.indexOf(tower.q), 1)
        tower = null
      }
      for (const d of made.values()) defs.push(d)
      if (tower) defs.push(tower.def)
      const att = [1, 2, 3].map(t => fader(`skF${t}`, ctx.weather.map(w => (show[t - 1] as number[])[LV[w.cloud]] as number), ctx.weather, span, css))
      if (nearCss.length) css.push(`.skGf{animation:skGf ${span}s linear forwards;animation-delay:calc(var(--t)*-1s)}`, ...nearCss)
      // tầng gần lên MÀN HÌNH (sau mặt trời/trăng → mây che được đĩa), mờ theo tầng mây như các tầng khác
      let nearG = ''
      for (let t = 1; t <= 3; t += 1) {
        const g = tierOn(t) ? inst.filter(q => q.depth === 3 && q.tier === t).map(q => q.s).join('') : ''
        if (g) nearG += att[t - 1] ? `<g${att[t - 1]}>${g}</g>` : g
      }
      scr += whaleS
      if (nearG) {
        scr += drift(460 / 2600, nearG)
        // quầng mặt trời tràn LÊN mây gần (tán sáng trong không khí ẩm): mây phía mặt trời sáng & ấm lên, nhất là lúc thấp
        const lowS = 1 - smooth(0.02, 0.28, sS)
        if (sS > -0.03 && lvl <= 2) scr += `<circle cx="${n0(sx)}" cy="${n0(sy)}" r="${n0(300 + 160 * lowS)}" fill="url(#skSg)" opacity="${o2(0.2 + 0.3 * lowS)}"/>`
      }
      const cumP: Piece[] = []
      const grp = (depths: number[]) => {
        let inner = ''
        for (let t = 1; t <= 3; t += 1) {
          if (!tierOn(t)) continue
          const g = inst.filter(q => depths.includes(q.depth) && q.tier === t).map(q => q.s).join('')
          if (g) inner += att[t - 1] ? `<g${att[t - 1]}>${g}</g>` : g
        }
        return inner + inst.filter(q => depths.includes(q.depth) && q.tier === 0).map(q => q.s).join('')
      }
      for (let depth = 0; depth < 3; depth += 1) {
        const inner = grp([depth])
        if (!inner) continue
        const pc: Piece = { layer: 0, x0: X0, x1: X0 + W + 700, prio: 5 + depth, svg: drift(V[depth] as number, inner) }
        pieces.push(pc)
        cumP.push(pc)
      }
      // Vượt ngân sách chuyển động (cửa sổ chuyển mức mây + sao + trăng…): gộp ba tầng sâu thành MỘT nhóm trôi, mờ theo tầng
      // mây (≤ 1 + 3 phần tử thay vì ≤ 3 + 9). Hiếm; đổi tốc độ trôi chỉ lệch ≤ 18 px lúc vẽ lại.
      if (cumP.length > 1)
        mergeCum = () => {
          for (const pc of cumP) pieces.splice(pieces.indexOf(pc), 1)
          pieces.push({ layer: 0, x0: X0, x1: X0 + W + 700, prio: 7, svg: drift(V[1] as number, grp([0, 1, 2])) })
        }
    }

    // Màn mưa ở xa: dải hơi nước dưới chân mây → chân trời mờ sau màn mưa (không phủ lên tấm mây — giữ khối chân mây).
    if (rainy) {
      const vals = ctx.weather.map(w => (w.precip === 'mua-to' ? 0.8 : w.precip === 'mua' ? 0.6 : w.precip === 'phun' ? 0.45 : 0))
      defs.push(vg('skVl', stp(0, c1, 0) + stp(0.5, c1, 0.6) + stp(1, c1, 0)))
      const att = fader('skFv', vals, ctx.weather, span, css)
      pieces.push({ layer: 0, x0: -1500, x1: 2600, prio: 6, svg: `<g${att}><path fill="url(#skVl)" d="M-1500 ${by - 70}H2600V${by + 190}H-1500Z"/></g>` })
    }

    // Mây vụn thấp (fractus) chạy nhanh dưới trời u ám / mưa: mảnh rách thuôn dài, mờ.
    {
      const vals = ctx.weather.map(w => (LV[w.cloud] === 4 || wet(w) ? 1 : 0))
      if (!lite && vals.some(v => v > 0)) {
        const rf = ctx.rng('sky-vun')
        let d = ''
        for (let i = 0; i < (lite ? 3 : 5); i += 1) {
          const x = xAt(((i + rf() * 0.6) / 5) * W, 0.45)
          const y = by + 16 + rf() * 56
          const L = 90 + rf() * 110
          d += blob(x, y, L, 8 + rf() * 7, rf, 8, 0.42)
        }
        defs.push(vg('skFr2', stp(0, mix(c1, c0, 0.4)) + stp(1, c0, 0.3)))
        const att = fader('skFf', vals, ctx.weather, span, css)
        pieces.push({ layer: 0, x0: X0, x1: X0 + W + 300, prio: 3, svg: drift(0.45, `<g${att}><path fill="url(#skFr2)" opacity=".5" d="${rel(d)}"/></g>`) })
      }
    }

    // Ngân sách tổng các mảnh mây ≤ 7000: thừa thì bỏ mảnh ưu tiên thấp nhất (vụn mây → mây ti/vảy cá), lớn trước.
    let cloudLen = pieces.reduce((a, q) => a + q.svg.length, 0)
    while (cloudLen > CLOUD_CAP) {
      const low = pieces.reduce((m, q) => (q.prio < m.prio || (q.prio === m.prio && q.svg.length > m.svg.length) ? q : m))
      if (low.prio > 4) break
      pieces.splice(pieces.indexOf(low), 1)
      cloudLen -= low.svg.length
    }
    if (starG) {
      // trần CHUNG screen + defs của trời (đêm quang: sao lấp đầy chỗ còn lại, defs Ngân Hà ăn bớt phần sao mờ)
      const room = Math.min(SCREEN_CAP, TOTAL_CAP - defs.join('').length) - (scr.length - STAR_SLOT.length)
      let keep = 1
      let g = starG(keep)
      while (g.length > room && keep > 0.03) {
        keep *= 0.8
        g = starG(keep)
      }
      scr = scr.replace(STAR_SLOT, g)
    }
    // Ngân sách chuyển động (≤ 25/vùng, chừa 1) ở MỌI điều kiện: đếm phần tử mang lớp có hoạt ảnh; thừa thì gộp tầng mây
    // → tắt lấp lánh (sao đứng yên) → bớt sao băng.
    const cssAll = css.join('')
    const animK = new Set([...cssAll.matchAll(/\.(sk[A-Za-z0-9]+)\{[^}]*animation/g)].map(m => m[1] as string))
    const nAnim = () => {
      let c = 0
      for (const s of [scr, ...pieces.map(q => q.svg)]) for (const m of s.matchAll(/class="([^"]*)"/g)) if ((m[1] as string).split(' ').some(k => animK.has(k))) c += 1
      return c
    }
    const LIM = 24
    let nA = nAnim()
    if (nA > LIM && mergeCum) {
      ;(mergeCum as () => void)()
      nA = nAnim()
    }
    for (; nA > LIM && scr.includes('class="skT"'); nA -= 1) scr = scr.replace(/ class="skT"( stroke-width="[^"]*") style="[^"]*"/, '$1')
    for (; nA > LIM && scr.includes('class="skMe"'); nA -= 1) scr = scr.replace(/<g transform="[^"]*"><g class="skMe"[\s\S]*?<\/g><\/g>/, '')
    return { screen: scr, pieces, defs: defs.join(''), css: cssAll }
  },
}
