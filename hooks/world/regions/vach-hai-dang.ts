// KHỐI (cảnh vach-hai-dang, cx 16770 z .92): 4 mảng — trời sáng (trên) · biển xa sáng-vừa, nhạt dần về chân trời (giữa phải)
// · khối vách đá tối-vừa + sườn cỏ (giữa dưới, chiếm đáy trái→phải) · biển gần sẫm dần về đáy + mỏm đá tối khung góc phải dưới.
// Tiêu điểm DUY NHẤT: tháp đèn trắng ở ~68% bề ngang, sáng nhất khung; nhà giữ đèn lùi (nhỏ, trầm). Bỏ: mỏ neo, vết sạt chữ V,
// sọc đỏ kẹo, sóng giấy dán tường, lưới/thùng ở bến. Chi tiết dồn vào vân đá, gờ đổ bóng, rêu bám gờ, bọt răng cưa chân vách.
// Vùng 10 — Vách hải đăng (x 16200–18000): mũi đất cuối cùng của thế giới.
// Câu chuyện: ngọn hải đăng trắng bạc màu vẫn quét đèn mỗi đêm cho một con thuyền chưa về; ánh đèn soi một vệt ấm dọc
// xuống mặt nước. Ngoài xa, một hải đăng khác trên đảo nhấp nháy trả lời — hai ngọn đèn gọi nhau qua biển; một cánh buồm
// nâu trôi chậm; hải âu lượn quanh tháp; đêm hè sóng vỗ sáng xanh vì phù du phát quang.
// Dọn dải giữa (cột chat): bỏ ghế băng/biển chỉ đường/ống nhòm/cột gió/thúng; cầu thang chỉ còn nét mờ.
// Vách đá: 3 giá trị sáng–tối, tầng nghiêng vát mỏng, thảm rêu loang từ mép trên, rêu đọng gờ; chân vách chìm mềm vào
// nước (mép biển gần tan dần, bóng vách soi xuống nước, bọt răng cưa). Mỏm đá tối khung góc phải dưới = tiền cảnh đậm nhất.
import type { BuildOut, Ctx, Layer, Piece, Region, Spot } from '../types'
import { clamp, fbm, ground, type Pt } from '../util'

const R = Math.round
const SEA = 862 // mặt biển lớp 3
const HZ = 690 // chân trời biển xa (lớp 2)
const LX = 17140 // tâm hải đăng (≈67% bề ngang khung)
const LB = 600 // chân tháp (trên gò)
const LK = 0.86 // tỉ lệ tháp: vách phải cao hơn hẳn thứ nó mang
const LY = LB - R(262 * LK) // tâm đèn
const HX = 16630 // nhà người giữ đèn: góc trái-dưới tường
const FY = 616 // nền nhà (nâng trên kè đá, cao hơn dốc)
const HK = 0.8 // tỉ lệ nhà (lùi về sau tháp)
const SHX = 16840 // tâm khung cảnh: tháp rơi vào ~68% bề ngang
type Pt3 = [number, number, number]

// ───────────── đường nét gọn: số nguyên, toạ độ tương đối ─────────────
function J(v: number[]): string {
  let s = ''
  for (const x of v) {
    const t = String(R(x) || 0)
    s += s && t[0] !== '-' ? ' ' + t : t
  }
  return s
}
const n2 = (v: number) => String(Math.round(v * 100) / 100).replace(/^(-?)0\./, '$1.')
const rp = (p: Pt): Pt => [R(p[0]), R(p[1])]

/** Gấp khúc tương đối. */
function P(pts: Pt[], z = true): string {
  const q = pts.map(rp)
  const f = q[0]
  if (!f || q.length < 2) return ''
  const d: number[] = []
  for (let i = 1; i < q.length; i += 1) {
    const a = q[i - 1] as Pt
    const b = q[i] as Pt
    d.push(b[0] - a[0], b[1] - a[1])
  }
  return `M${J(f)}l${J(d)}${z ? 'z' : ''}`
}

/** Đường mở mượt (q qua trung điểm), toạ độ tương đối. */
function S(pts: Pt[]): string {
  const q = pts.map(rp)
  const f = q[0]
  if (!f || q.length < 3) return P(pts, false)
  let cx = f[0]
  let cy = f[1]
  const d: number[] = []
  for (let i = 1; i < q.length - 1; i += 1) {
    const p = q[i] as Pt
    const n = q[i + 1] as Pt
    const m: Pt = [R((p[0] + n[0]) / 2), R((p[1] + n[1]) / 2)]
    d.push(p[0] - cx, p[1] - cy, m[0] - cx, m[1] - cy)
    cx = m[0]
    cy = m[1]
  }
  const l = q[q.length - 1] as Pt
  return `M${J(f)}q${J(d)}l${J([l[0] - cx, l[1] - cy])}`
}
/** Nối tiếp một đường vào đường trước (bỏ M đầu → L). */
const cont = (d: string) => d.replace('M', 'L')

/** Vòng kín mượt qua các điểm. */
function C(pts: Pt[]): string {
  const q = pts.map(rp)
  const n = q.length
  const at = (i: number) => q[i % n] as Pt
  const mid = (i: number): Pt => {
    const a = at(i)
    const b = at(i + 1)
    return [R((a[0] + b[0]) / 2), R((a[1] + b[1]) / 2)]
  }
  const m0 = mid(0)
  let cx = m0[0]
  let cy = m0[1]
  const d: number[] = []
  for (let i = 1; i <= n; i += 1) {
    const p = at(i)
    const m = mid(i)
    d.push(p[0] - cx, p[1] - cy, m[0] - cx, m[1] - cy)
    cx = m[0]
    cy = m[1]
  }
  return `M${J(m0)}q${J(d)}z`
}

/** Khối hữu cơ đáy phẳng (bụi, ụ cỏ, tảng đá). */
function blob(cx: number, cy: number, rx: number, ry: number, r: () => number, lumps = 6, rough = 0.22): string {
  const pts: Pt[] = []
  const ph = r() * 6.283
  const a1 = r() * rough
  for (let i = 0; i < lumps; i += 1) {
    const a = (i / lumps) * 6.283
    const k = 1 + a1 * Math.sin(a * 2 + ph) + rough * (r() - 0.5) * 0.7
    pts.push([cx + Math.cos(a) * rx * k, Math.min(cy + ry * 0.55, cy + Math.sin(a) * ry * k)])
  }
  return C(pts)
}

/** Gối rêu/ụ cỏ/tán thông: các vòm nối nhau trên mặt phẳng y. */
function humps(x: number, y: number, w: number, h: number, n: number, r: () => number): string {
  let d = `M${J([x, y])}`
  for (let i = 0; i < n; i += 1) {
    const ww = (w / n) * (0.7 + r() * 0.6)
    d += `q${J([ww / 2, -h * (1.2 + r() * 1.2), ww, 0])}`
  }
  return d + 'z'
}

const lerpP = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const stop = (o: number, v: string, op: number) => `<stop offset="${o}" style="stop-color:var(--${v})" stop-opacity="${op}"/>`
const tr = (x: number, y: number, extra = '') => `transform="translate(${R(x)} ${R(y)})${extra}"`
const E = (cls: string, d: string, at = '') => `<path class="${cls}"${at} d="${d}"/>`
const wrapH = (h: number) => ((((h + 12) % 24) + 24) % 24) - 12

/** Cột phản chiếu (nắng/trăng): vạch ngang đứt quãng (nét đứt tạo nhiều đốm sáng), hẹp ở chân trời, rộng dần khi lại gần.
 *  Hàng chẵn/lẻ tách 2 nét để lấp lánh lệch pha. Toạ độ x quanh 0. */
function column(r: () => number, rows: number, y0: number, y1: number, w0: number, w1: number): [string, string] {
  const g: [string, string] = ['', '']
  for (let i = 0; i < rows; i += 1) {
    const t = i / (rows - 1)
    const w = w0 + (w1 - w0) * t
    g[i % 2] += `M${J([(r() - 0.6) * w * 0.4 - w / 2, y0 + (y1 - y0) * t * t])}h${R(w)}`
  }
  return g
}

// Lớp nét (fill:none, đầu tròn) → biến màu bảng.
const STROKES: [string, string][] = [
  ['w', 'w3'], ['s', 's1'], ['k', 'k1'], ['q', 'k2'], ['b', 'b1'], ['c', 'b2'], ['x', 'x1'], ['u', 'm3'],
  ['g', 'g3'], ['p', 'p1'], ['t', 'p3'], ['e', 'e2'], ['o', 'e1'], ['r', 'r3'], ['d', 'd1'], ['y', 'e4'],
]
// Độ dày nét & độ mờ dùng chung (gọn ký tự).
const WIDTHS: [string, number][] = [['1', 1.4], ['2', 2.2], ['3', 3], ['4', 4.5], ['6', 6], ['8', 8]]
const OPAS: [string, number][] = [['O2', 0.22], ['O3', 0.32], ['O5', 0.5], ['O7', 0.72]]

function build(ctx: Ctx): BuildOut {
  const lite = ctx.detail === 'lite'
  const det = !lite
  const se = ctx.season
  const pr = ctx.cur.precip
  const rain = pr === 'mua' || pr === 'mua-to' || pr === 'phun'
  const snow = pr === 'tuyet'
  const wind = clamp(ctx.cur.wind, 0, 1)
  const fog = ctx.cur.fog
  const cloud = ctx.cur.cloud
  const dong = se === 'dong'
  const day = ctx.daylight
  const night = day < 0.72
  const hour = ctx.vn.hourF
  const storm = pr === 'mua-to' || (cloud === 'u-am' && rain)
  // sương muối: sáng sớm / chiều muộn mùa đông, trời khô
  const frost = dong && !snow && !rain && (hour < 9.5 || hour > 16.5)
  const lamp = night || fog >= 0.4 || storm
  const gulls = !night && !storm && !snow
  const parts = lamp && (rain || snow) && !lite
  const plankton = det && se === 'ha' && day < 0.4 && !rain && !snow
  // từ lúc thắp đèn: chi tiết li ti chìm trong bóng tối → bỏ, dành ký tự cho ánh đèn; rêu giữ tới khi tối hẳn
  const fine = det && !night
  const mossy = det && day >= 0.25
  const moss = frost || snow ? 'm3' : 'm2'
  const ha = wrapH(hour + 0.0567 - 12) // giờ góc mặt trời (trời vẽ mặt trời ở x màn hình = 800 + ha·110)
  const side = ha > 0.6 ? 1 : -1 // 1: chiều — nắng hắt từ phía biển (phải)
  const skyK = ({ quang: 1, it: 0.9, vua: 0.55, nhieu: 0.15, 'u-am': 0 } as const)[cloud] * (rain || snow ? 0 : 1) * (1 - fog)
  const gold = ctx.sunAlt > -0.03 && ctx.sunAlt < 0.2 && day > 0.2 && skyK > 0.3
  const rim = gold && side > 0
  const rough = clamp((dong ? 1.5 : 1) * (0.7 + wind * 0.9) * (pr === 'mua-to' ? 1.35 : 1) * (storm ? 1.2 : 1), 0.5, 2.4)
  const boat = fog < 0.55 && !storm && rough < 1.8
  const amp = 4 * rough ** 1.6 // biên độ sóng: ≥4 khi rough=1, ≥12 khi rough≥2
  const rnd = (k: string) => ctx.rng(`vh-${k}`)
  const dl = (p: number, k: string) => `animation-delay:${ctx.ph(p, `vh-${k}`)}`
  // tham số chuyển động (chu kỳ, quãng trôi, pha liền mạch) gom vào CSS: mỗi phần tử chỉ mang một lớp ngắn
  let anim = ''
  let na = 0
  const A = (p: number, key: string, vars = '') => {
    na += 1
    anim += `.vh-${na}{${vars}${dl(p, key)}}`
    return `vh-${na}`
  }
  // lấp lánh của cột phản chiếu: lite giữ hình (vật kể chuyện) nhưng đứng yên
  const TW = (key: string) => (det ? `tw ${A(3.1, key)}` : '')
  const G = ground
  const knoll = (x: number) => 9 * Math.exp(-(((x - LX) / 75) ** 2))
  const surf = (x: number) => G(x) - knoll(x)
  const pieces: Piece[] = []
  const add = (layer: Layer, x0: number, x1: number, prio: number, svg: string, glow = '') =>
    pieces.push(glow ? { layer, x0, x1, prio, svg, glow } : { layer, x0, x1, prio, svg })
  const use = (id: string, cls: string, x: number, y: number, k = 1) => `<use href="#vh-${id}"${cls ? ` class="${cls}"` : ''} ${k === 1 ? `x="${R(x)}" y="${R(y)}"` : tr(x, y, ` scale(${n2(k)})`)}/>`
  const flower = se === 'xuan' ? 'f1' : se === 'ha' ? 'f2' : se === 'thu' ? 'f1' : 'f3'
  const bloom = se === 'xuan' || se === 'ha'
  // cột phản chiếu nằm dưới mặt trời/trăng trên MÀN HÌNH khi camera ngắm cảnh hải đăng (cx 16840, z .92). Lõi không còn biến
  // --cx/--z (camera = transform từng lớp, rẻ hơn nhiều), nên ghim theo vị trí cảnh; camera trôi ±50 thì cột lệch theo, không đáng kể.
  const follow = (f: number, dx: number) => `style="transform:translateX(${R(SHX * f + dx / 0.92)}px)"`
  const sunK = clamp(1.25 - ctx.sunAlt * 1.1, 0.25, 1) * (ctx.sunAlt > -0.02 && day > 0.15 ? 1 : 0) * skyK
  const sunCol = sunK > 0.12 && Math.abs(ha) < 8
  const illum = (1 - Math.cos(ctx.moonPhase * 6.283)) / 2
  const hm = wrapH(ha - ctx.moonPhase * 24)
  const moonCol = day < 0.3 && illum > 0.2 && Math.abs(hm) < 5.5 && skyK > 0.45

  // ───── địa tầng vách: 6 đường ranh nghiêng ~4°; độ dày từng tầng biến thiên riêng → tầng vát mỏng, có chỗ mất hẳn ─────
  const nz = ctx.noise('vh-rk')
  const XS = Array.from({ length: 9 }, (_, i) => 16500 + i * 116)
  const TH = [38, 42, 46, 50, 66]
  const lines: number[][] = [XS.map(x => 662 + (x - 16900) * 0.1 + fbm(nz, x / 300, 0.5, 2) * 30)]
  // mỗi tầng một độ nghiêng riêng (dày dần / vát mỏng về một phía) → không còn là các đường kẻ song song
  TH.forEach((t, k) => lines.push(XS.map((x, i) => ((lines[k] as number[])[i] as number) + Math.max(1.5, t * (1 + (k === 4 ? 0.8 : 1.6) * fbm(nz, x / 260 + k * 3.7, k + 1.5, 2)) + (x - 16900) * (k % 2 ? 0.05 : -0.035)))))
  const lineY = (k: number, x: number) => {
    const ln = lines[k] as number[]
    const i = clamp(Math.floor((x - 16500) / 116), 0, ln.length - 2)
    const a = ln[i] as number
    return a + (((ln[i + 1] as number) - a) * (x - 16500 - i * 116)) / 116
  }
  let foamD = ''
  // nhóm vách vẽ theo toạ độ cục bộ gốc (OX, OY) cho gọn số
  const OX = 16500
  const OY = 600
  // mép biển của vách: mỏm nhô & hốc lõm (không còn là một đường chéo)
  const BUMPS: Pt3[] = [[660, 15, 16], [706, -14, 18], [748, 22, 15], [792, -18, 17], [834, 18, 13], [884, -11, 24]]
  const edgeX = (y: number) =>
    17262 + 74 * clamp((y - 616) / 246, 0, 1) ** 0.8 + Math.max(0, y - SEA) * 0.05 + BUMPS.reduce((a, [c, h, w]) => a + h * Math.exp(-(((y - c) / w) ** 2)), 0) + fbm(nz, y / 23, 3.3, 2) * 12

  // ═════════ 2. Biển xa (lớp 2): chân trời, đảo có hải đăng thứ hai, thuyền buồm, cột nắng/trăng ═════════
  {
    const x0 = 7470
    const x1 = 8700
    let s = `<path fill="url(#vh-fs)" d="M${x0} ${HZ + 3}H${x1}V1100H${x0}z"/>`
    if (se === 'ha' && !storm) s += E('p2', `M${x0} 740H${x1}V1100H${x0}z`, ' opacity=".14"')
    if (dong || storm) s += E('k2', `M${x0} ${HZ + 3}H${x1}V1100H${x0}z`, ` opacity="${storm ? 0.35 : 0.2}"`)
    // dải sương sáng sát chân trời (biển xa ngả màu trời), mép trên sắc, tan dần xuống
    s += `<path fill="url(#vh-hz)" d="M${x0} ${HZ + 2}H${x1}v60H${x0}z"/>`
    if (fog > 0.3) s += `<path style="fill:var(--haze)" opacity="${n2(Math.min(0.85, fog * 0.75))}" d="M${x0} ${HZ - 40}H${x1}V1100H${x0}z"/>`
    let g = ''
    // vệt sóng xa: mảnh, dày, nhạt — càng gần chân trời càng khít (phối cảnh), không trôi
    if (det) {
      const rf = rnd('fw')
      let fw = ''
      for (let i = 0; i < 6; i += 1) {
        const t = (i + 1) / 7
        fw += `M${R(x0 - rf() * 300)} ${R(HZ + 6 + t * t * 160)}H${x1}`
      }
      s += E('vhw', fw, ` stroke-width=".9" stroke-dasharray="${rough > 1.4 ? '6 14 11 25 4 40' : '22 30 48 60 9 51'}" opacity="${rough > 1.4 ? 0.4 : 0.2}"`)
    }
    if (fog < 0.55) {
      // đảo xa nhạt màu, hải đăng thứ hai nhấp nháy trả lời
      if (det) s += E('l4', 'M8330 694q16-14 40-15q30 2 50 15z', ' opacity=".4"') + E('w3', 'M8377 682l1-12h3l1 12z', ' opacity=".7"')
      if (night && det) g += `<g class="vh-bl ${A(5, 'bl')}"><circle cx="8379" cy="664" r="13" fill="url(#gw)"/><circle class="e1" cx="8379" cy="664" r="1.6"/></g>`
      // thuyền buồm nâu trôi chậm; giông bão: thuyền đã về bến
      if (boat)
        s += `<g class="vh-bt"><g ${tr(8130, 706, ' scale(1.15)')}>${E('r2', 'M-3-4l-2-24q9 3 14 13l-1 11zM-14-4v-16q6 2 9 9v7zM10-4l1-11q5 3 6 8l-2 3z')}${E('k2', 'M-17-3h35l-4 5q-14 2-27 0z')}</g></g>`
      if (night && !storm) g += `<circle class="e1" cx="8132" cy="702" r="1.4"/><circle cx="8132" cy="702" r="9" fill="url(#gw)"/>`
    }
    if (sunCol) {
      const [c0, c1] = column(rnd('gl'), lite ? 5 : 8, HZ + 3, 862, 10, 80)
      s += `<g clip-path="url(#vh-fc)"><g ${follow(0.45, ha * 110)} opacity="${n2(sunK)}" class="vhw vh3" stroke-dasharray="4 5 9 4 2 7">${E(`${TW('g0')}`, c0)}${E(`${TW('g1')}`, c1)}</g></g>`
    }
    // cột trăng xa: CHỈ trên mặt biển xa — cắt theo dải biển lộ ra bên phải vách (toạ độ lớp 2 ở khung cảnh), không tràn lên đất
    if (moonCol) g += `<g clip-path="url(#vh-fc)"><g ${follow(0.45, hm * 110)} opacity="${n2(illum * 0.8)}">${E(`vhw vh2 ${TW('tr')}`, column(rnd('tr'), 8, HZ + 3, 862, 8, 64).join(''), ` stroke-dasharray="4 5 9 4 2 7"`)}</g></g>`
    add(2, 7360, x1, 7, s, g)
  }

  // ═════════ 3. Vách đá (lớp 3, gốc nhóm OX/OY): khối răng cưa, tầng nghiêng, gờ có rêu, khe nứt, vết sạt lở ═════════
  {
    const r = rnd('vach')
    const L = (p: Pt): Pt => [p[0] - OX, p[1] - OY]
    const topY = (x: number) => G(x) + 17 + nz(x / 37, 0.5) * 18
    const top: Pt[] = []
    for (let x = 16560; x < 17262; x += 54) top.push([x, topY(x)])
    const edge: Pt[] = []
    for (let y = 616; y <= 1140; y += y < 900 ? 20 : 80) edge.push([edgeX(y), y])
    let s = `<g class="s2"><path id="vh-rkp" d="${P(([[16540, 1140], [16540, 700], ...top, ...edge] as Pt[]).map(L))}"/></g><g clip-path="url(#vh-rk)">`
    // tầng đá: mỗi tầng một sắc (xám, kem, đất, xám lạnh) — các tầng dưới sẫm hơn
    const BAND: [string, number][] = [['s3', 0.45], ['s2', 1], ['d1', 0.34], ['s3', 0.75], ['s4', 0.55], ['s4', 0.95]]
    lines.forEach((ln, k) => {
      if (lite && k % 2) return
      const [c, o] = BAND[k] as [string, number]
      s += `<g class="${c}"${o < 1 ? ` opacity="${n2(o)}"` : ''}><path id="vh-b${k}" d="${P(XS.map((x, i) => L([x, ln[i] as number])), false)}V600H0z"/></g>`
    })
    s += `<path fill="url(#vh-lt)" d="M40 0H920V540H40z"/>` + (det ? `<path fill="url(#vh-gr)" d="M40 0H920V262H40z"/>` : '')
    // mặt vỡ đứng: vài tấm đá lớn nghiêng khác nhau (mặt khuất tối, mặt đón nắng sáng) — vân khối, tương phản thấp
    {
      let fs = ''
      let fl = ''
      for (let i = 0, x = 150 + r() * 40; i < (det ? 6 : 3); i += 1, x += 105 + r() * 60) {
        // tấm vỡ hình nêm: bắt đầu ở một gờ tầng, thuôn dần xuống, dài ngắn khác nhau (không phải sọc đứng)
        const w = 24 + r() * 40
        const k = r() * 30 - 12
        const y0 = lineY(R(r() * 3), x + OX) - OY
        const h = 70 + r() * 150
        const q = P([[x, y0], [x + w, y0 + w * 0.2], [x + w * 0.45 + k, y0 + h], [x + 4 + k * 0.5, y0 + h * 0.8]])
        if (i % 2) fl += q
        else fs += q
      }
      s += E(side > 0 ? 'hl' : 'sh', fs, ' opacity=".4"') + E(side > 0 ? 'sh' : 'hl', fl, ' opacity=".35"')
    }
    const U = (ks: number[]) => ks.filter(k => !lite || !(k % 2)).map(k => `<use href="#vh-b${k}"/>`).join('')
    // gờ: tầng trên nhô ra → bóng đổ xuống tầng dưới; tầng dưới nhô ra → mặt gờ bắt sáng (chiều tà: ánh cam hắt từ biển)
    s += (det ? `<g class="vhk vh6 vhO3" ${tr(0, 5)}>${U([1, 3])}</g>` : '') + `<g class="vhq vhO3">${U([2, 3])}</g>`
    s += `<g class="${rim ? 'vho vh2' : 'vhs vh1'}" opacity="${rim ? '.6' : '.42'}" ${tr(0, 1.5)}>${U([0, 2, 3, 5])}</g>`
    // mặt hướng biển: dải tối (sáng: khuất nắng) hoặc sáng (chiều: đón nắng), bám đúng silhouette
    s += (det ? `<use href="#vh-rkp" class="${side > 0 ? 'vhs' : 'vhk'}" stroke-width="44" opacity=".16"/>` : '') + (rim ? `<use href="#vh-rkp" class="vho vh3" opacity=".55"/>` : '')
    // khe nứt zigzag dài ngắn khác nhau; mép trái bắt sáng
    if (det) {
      const CR: Pt3[] = [[16788, 0, 74], [16990, 1, 108], [16846, 3, 62], [17120, 0, 90], [16700, 2, 70]]
      const cracks = CR.map(([x, k, n]) => {
        const pts: Pt[] = [[x - OX, lineY(k, x) + 3 - OY]]
        for (let y = 0, i = 0; y < n; i += 1) {
          const dy = 9 + r() * 9
          y += dy
          const p = pts[pts.length - 1] as Pt
          pts.push([p[0] + (i % 2 ? 4 : -4) + (r() - 0.5) * 7, p[1] + dy])
        }
        return P(pts, false)
      }).join('')
      s += E('vhq vh1', cracks)
    }
    // rêu: đọng thành mảng trên mặt gờ, dày hơn ở nửa dưới khuất nắng; vệt rêu chảy dọc khe nứt
    if (mossy) {
      let mp = ''
      let drip = ''
      for (const k of [2, 3, 5]) {
        for (let x = 16700 + r() * 50; x < 17330; x += 230 - k * 22 + r() * 90) {
          const y = lineY(k, x) + 1.5
          if (y > SEA - 6 || x > edgeX(y) - 14) continue
          // thảm rêu dẹt, nhiều nhịp nhỏ bám theo gờ (không còn búi tròn kiểu cây cọ)
          const w = 24 + r() * (34 + k * 12)
          mp += humps(x - OX, y - OY, w, 0.9 + r() * 1.1 + k * 0.3, 3, r)
          if (r() < 0.3) drip += `M${J([x + w * (0.2 + r() * 0.6) - OX, y - OY])}h3l-1 ${R(16 + r() * 34)}z`
        }
      }
      s += E(moss, mp) + (drip ? E('m3', drip, ' opacity=".35"') : '')
    }
    // dải triều sẫm ngay trên mặt nước, hà bám, tảo rủ; đá đổ ven nước (biển vẽ sau sẽ nhấn chìm nửa dưới)
    const tz: Pt[] = []
    for (let x = 16600; x <= 17460; x += 123) tz.push(L([x, SEA - 21 + nz(x / 23, 7) * 8]))
    s += E('k2', `${P(tz, false)}V262H100z`, ' opacity=".26"')
    if (fine) s += E('vhs', 'M200 254H940', ' stroke-width="2" stroke-dasharray="0 5 0 9 0 23 0 4 0 31 0 13" opacity=".4"') + E('vhu vhB', 'M160 260H940', ' stroke-width="9" stroke-dasharray="1.5 7 2.5 12 1 5" opacity=".8"')
    if (ctx.wet > 0.1) s += E('k1', 'M40 0H920V262H40z', ` opacity="${n2(ctx.wet * 0.14)}"`) + `<g class="vhw vh1" opacity="${n2(ctx.wet * 0.4)}" ${tr(0, 2)}>${U([0, 2, 3])}</g>`
    if (snow) s += `<g class="vhw vh3" opacity=".85" ${tr(0, 1)}>${U([0, 3, 5])}</g>`
    else if (frost && det) s += `<g class="vhw vh1" opacity=".5" ${tr(0, 1)}>${U([0, 2, 3])}</g>`
    if (fog > 0.3) s += `<path style="fill:var(--haze)" opacity="${n2(fog * 0.32)}" d="M40 0H920V300H40z"/>`
    // đêm: khối vách chìm hẳn vào bóng tối, nhường sáng cho tháp đèn
    else if (night) s += E('k1', 'M40 0H920V300H40z', ` opacity="${n2(0.15 + (0.72 - day) * 0.4)}"`)
    s += `</g>`
    // thảm rêu loang từ mép trên chảy xuống: mép dưới gợn theo nhiễu, mỏng dần về phía biển
    if (mossy || snow) {
      const mb: Pt[] = top.slice(1).map(([x, y]) => L([x, y]))
      const ml: Pt[] = top.slice(1).reverse().map(([x, y]) => L([x, y + 10 + Math.abs(nz(x / 37, 21)) * (70 - (x - 16560) * 0.06)]))
      s += E(snow ? 'w3' : moss, `${S(mb)}${cont(S(ml))}z`, ` opacity="${snow ? '.7' : '.8'}"`)
    }
    // mũ cỏ rủ xuống mép đá
    s += E('vhg vh6', P(top.slice(2).map(([x, y]) => L([x, y + 1])), false), ' stroke-dasharray="22 3 9 2 34 4"')
    add(3, 16540, 17440, 8, `<g ${tr(OX, OY)}>${s}</g>`)
  }

  // ═════════ 1. Biển (lớp 3): sẫm & đậm dần về phía người xem; sóng theo phối cảnh (xa mảnh-khít, gần to-thưa), nhịp đứt gãy ═════════
  {
    const x0 = 16380
    const x1 = 18380
    let s = `<path fill="url(#vh-ns)" d="M${x0} ${SEA - 8}H${x1}V1320H${x0}z"/>`
    // bóng vách soi xuống nước: dải tối mềm dưới chân vách, tan dần ra xa bờ
    s += E('k1', `M16660 ${SEA - 4}H17380l-6 24 14 18-10 30 8 22-26 34q-90-22-170 4-110-30-230-6l-30-16 8-30-30-30z`, ' opacity=".15"')
    const tq = ({ ha: 0.42, xuan: 0.22, thu: 0.12, dong: 0 } as const)[se] * (storm ? 0.3 : 1)
    // nước nông trong vắt sát chân vách & bờ cỏ (chỉ một dải hẹp, không làm sáng cả vùng gần)
    if (tq) s += E('p2', `M${x0} ${SEA + 2}H17700q-300 22-700 34t-620 34z`, ` opacity="${n2(tq * 0.6)}"`)
    if (dong || storm) s += E('k2', `M${x0} ${SEA}H${x1}V1320H${x0}z`, ` opacity="${storm ? 0.4 : 0.24}"`)
    // sương: biển gần chìm vào màn sương (mất chiều sâu như thật)
    if (fog > 0.3) s += `<path style="fill:var(--haze)" opacity="${n2(fog * 0.45)}" d="M${x0} ${SEA}H${x1}V1320H${x0}z"/>`
    const rw = rnd('wv')
    // [y đầu, y cuối, số hàng, chu kỳ nét = quãng trôi, bề dày]
    const GR: [number, number, number, number, number][] = lite
      ? [[868, 900, 3, 240, 1], [930, 1040, 2, 480, 2.4]]
      : [[866, 886, 4, 120, 0.8], [896, 944, 3, 240, 1.4], [966, 1060, 2, 480, 2.6]]
    const op = clamp(0.13 + (rough - 1) * 0.22, 0.12, 0.5)
    const wv = ['', '']
    GR.forEach(([ya, yb, n, Pg, wd], gi) => {
      let d = ''
      for (let j = 0; j < n; j += 1) {
        const y = ya + (yb - ya) * (j / (n - 1)) ** 1.3 + (rw() - 0.5) * wd * 2
        d += `M${R(x0 - Pg - rw() * Pg)} ${R(y)}H${x1 + Pg}`
      }
      const a = R(Pg * (0.1 + rw() * 0.14))
      const b = R(Pg * (0.16 + rw() * 0.2))
      const c = R(Pg * (0.04 + rw() * 0.08))
      const e = R(Pg * (0.03 + rw() * 0.06))
      const da = `${a} ${b} ${c} ${e} ${R(a * 0.4)} ${Math.max(4, Pg - a - b - c - e - R(a * 0.4))}`
      // ngọn sóng sáng + chân sóng tối lệch xuống (cùng hình, <use> tĩnh); khi gió to ngọn bạc đầu dày hơn
      wv[gi < GR.length - 1 ? 0 : 1] += `<g class="vhw" stroke-width="${n2(wd * (rough > 1.4 ? 1.4 : 1))}" opacity="${n2(op * (gi ? 1.1 : 1))}"><path id="vh-w${gi}" stroke-dasharray="${da}" d="${d}"/></g><use href="#vh-w${gi}" class="vhq" stroke-width="${n2(wd)}" opacity=".42" x="${R(a * 0.4)}" y="${n2(wd * 1.6)}"/>`
    })
    let w = `<g class="vh-wa">${wv[0]}</g><g class="vh-wb">${wv[1]}</g>`
    let glow = ''
    if (plankton) glow = `<g clip-path="url(#vh-pc)"><g class="vh-wb"><g class="vhy" stroke-width="2" opacity=".55"><use href="#vh-w${GR.length - 1}"/></g></g></g>`
    if (sunCol) {
      const [c0, c1] = column(rnd('sc'), lite ? 5 : 8, 867, 1070, 40, 190)
      w += `<path ${follow(1, ha * 110)} fill="url(#gw)" opacity="${n2(sunK * 0.6)}" d="M-40 866h80l140 210h-360z"/><g ${follow(1, ha * 110)} opacity="${n2(sunK * 0.9)}" class="vhw vh3" stroke-dasharray="3 9 7 13 2 17">${E(`${TW('sc0')}`, c0)}${E(`${TW('sc1')}`, c1)}</g>`
    }
    s += `<g clip-path="url(#vh-sc)">${w}</g>`
    // đêm: vệt đèn hải đăng soi dọc xuống nước (ấm, lấp lánh, tan dần về bờ)
    if (lamp && night) glow += `<ellipse cx="${LX}" cy="${SEA + 80}" rx="50" ry="100" fill="url(#gw)" opacity=".6"/><g ${tr(LX, 0)} opacity=".7">${E(`vhe vh2 ${TW('lc')}`, column(rnd('lc'), lite ? 5 : 8, SEA + 6, 1070, 6, 60).join(''), ' stroke-dasharray="3 5 8 4 2 9"')}</g>`
    // mưa: vòng gợn trên mặt nước (tĩnh, thưa, không đều)
    if (rain && det) {
      const rr = rnd('rr')
      let rg = ''
      for (let i = 0; i < 7; i += 1) {
        const y = 880 + rr() * rr() * 180
        const k = 0.4 + (y - 870) / 180
        rg += `<ellipse cx="${R(17360 + rr() * 900)}" cy="${R(y)}" rx="${R(9 * k + 2)}" ry="${n2(2 * k + 0.6)}"/>`
      }
      s += `<g class="vhw" fill="none" stroke-width=".9" opacity=".35">${rg}</g>`
    }
    if (moonCol) glow += `<g clip-path="url(#vh-sc)"><g ${follow(1, hm * 110)} opacity="${n2(illum * 0.55)}">${E(`vhw vh2 ${TW('mc')}`, column(rnd('mc'), 10, 866, 1060, 26, 150).join(''), ` stroke-dasharray="3 6 7 5 2 9 5 4"`)}</g></g>`
    add(3, x0, x1, 8, s, glow)
  }

  // ═════════ 3b. Bọt sóng vỗ theo chân vách răng cưa (3 lớp lệch pha tràn lên rồi rút), bụi nước, gợn trong vũng ═════════
  {
    const ff = dong || storm || rough > 1.5 ? 2 : 1
    const fp: Pt[] = []
    for (let x = 17232; x <= 17426; x += 14) fp.push([x, SEA - 3 - (2 + Math.abs(nz(x / 9, 4)) * 12) * ff])
    const fb: Pt[] = []
    for (let x = 17426; x >= 17232; x -= 28) fb.push([x, SEA + 4 + Math.abs(nz(x / 7, 9)) * 4])
    foamD = `${S(fp)}${cont(P(fb, false))}z`
    // đá vỡ nằm chân vách (nửa chìm), rồi viền bọt ren gãy khúc phủ lên — chân vách không còn là đường kẻ thước
    const rf = rnd('ft')
    let s = use('bA', '', 16748, SEA - 2, 0.9) + use('bB', '', 16968, SEA, 0.65) + use('bA', '', 17168, SEA - 1, 0.55)
    s += E('w3', humps(16640, SEA + 3, 600, 2.4 * ff, 13, rf), ' opacity=".5"')
    s += `<use href="#vh-fb" class="w3 vh-fo ${A(5.2, 'fo1')}" opacity=".9"/>`
    if (det) s += `<use href="#vh-fb" class="w3 vh-fo ${A(6.4, 'fo2', 'animation-duration:6.4s;')}" opacity=".6" x="-14" y="2"/><use href="#vh-fb" class="w3 vh-fo ${A(4.3, 'fo3', 'animation-duration:4.3s;')}" opacity=".5" x="10" y="-1"/>`
    s += E(`vhw vh-fo ${A(5.8, 'fo4', 'animation-duration:5.8s;')}`, `M16666 ${SEA}h66m30 0h70m60 0h120m40 0h60m30 0h50m20 0h36`, ` stroke-width="${2 + ff}" opacity=".75"`)
    if (!lite) s += E(`w3 vh-sp ${A(8, 'sp1')}`, `M${R(edgeX(840)) + 4} ${SEA - 2}q-8-16 0-30q2 12 6 16q0-20 9-28q0 18 4 24q4-12 12-16q-6 14-4 34z`)
    add(3, 16600, 17440, 7, s, plankton ? E('e4', `M17232 ${SEA - 4}H17426`, ' stroke-width="4" opacity=".4" stroke-dasharray="14 6 30 9"') : '')
  }

  // ═════════ 4. Sườn cỏ (16140–16720): thân dốc nối liền cánh đồng, bờ cỏ thoải chìm vào vũng biển, mép lở đất, đá rêu ═════════
  {
    const tp: Pt[] = []
    for (let x = 16140; x <= 16700; x += 70) tp.push([x, G(x) + 2])
    // mép phải: bám mép đá xuống tới mặt nước rồi thành bờ cỏ thoải chìm dần (không còn là bức tường dựng đứng)
    const re = ([[16716, 645], [16700, 690], [16690, 740], [16664, 790], [16648, 836]] as Pt[]).map(([x, y]) => [x + nz(y / 50, 11) * 16, y] as Pt)
    const sh: Pt[] = [[16634, 866], [16594, 884], [16550, 912], [16512, 950], [16484, 1000], [16466, 1070], [16458, 1150]]
    const off = (dx: number, dy: number, n = 7) => S(sh.slice(0, n).map(([x, y]) => [x + dx, y + dy] as Pt))
    let s = `<g fill="url(#vh-fg)" mask="url(#vh-fm)"><path id="vh-bd" d="${S(tp)}${cont(P(re, false))}${cont(S(sh))}H16140z"/></g><use href="#vh-bd" fill="url(#vh-dg)"/>`
    // tuyết / sương muối phủ dày dần từ mép cánh đồng (vùng bên trái không phủ) → không lộ đường nối
    if (snow || frost) s += `<g mask="url(#vh-om)"><use href="#vh-bd" class="${snow ? 'w3' : 'f3'}" opacity="${snow ? '.55' : '.3'}"/></g>`
    // mép lở: đất lộ, rễ thòng xuống mặt đá; viền cỏ sẫm không đều; bờ đất ướt & bọt lăn tăn ven nước
    s += E('d2', 'M16697 694q10 2 19 6q-5 17-15 32q2-18-4-38z', ' opacity=".7"')
    s += E('vhq vh6 vhO3', off(-5, 0))
    s += E(`vhw vh2 vh-fo ${A(7, 'fs', 'animation-duration:7s;')}`, off(4, 2, 6), ' stroke-dasharray="9 6 22 11 5 8" opacity=".6"')
    if (det) s += E('vhb', 'M16700 700q4 14 1 32M16712 704q6 10 3 24', ' stroke-width=".9"')
    // tảng đá rêu phong nằm trong cỏ & sát mép nước
    s += use('bA', '', 16318, 902, 1.2) + use('bB', '', 16452, 968)
    // lối mòn từ bậc đá của nhà xuống cánh đồng
    s += E('vhd vh8 vhO7', 'M16590 690q-70 20-150 46t-150 56q-80 24-170 36')
    // bụi cỏ: to & sẫm ở tiền cảnh, nhỏ dần lên cao; vài bụi lắc theo gió
    if (det) for (const [x, y, k, c] of [[16262, 930, 2, 'g4'], [16400, 1020, 2.2, 'g4']] as [number, number, number, string][]) s += use('ts', c, x, y, k)
    // búi cỏ đung đưa: hình #vh-ts TĨNH, class lắc (sw2) đặt trên <g> bọc <use> (bản sao của cây con có hoạt ảnh không lên
    // compositor). fill-box của <g> = khung của bản đã scale đều → tâm xoay vẫn là giữa đáy búi cỏ như trước.
    if (fine) s += `<g class="sw2">${use('ts', 'g2', 16420, G(16420) + 3, 1.5)}</g>`
    // hoa dại rải trong cỏ (theo mùa)
    if (fine && !dong) s += E('vhf', 'M16180 860q120-30 260-70t200-60', ' stroke-width="3.4" stroke-dasharray="0 13 0 29 0 7 0 41"') + E('vhf vhF', 'M16200 960q150-50 300-110', ' stroke-width="2.6" stroke-dasharray="0 23 0 9 0 37"')
    add(3, 16140, 16730, 6, s)
  }

  // ═════════ 6. Mặt vách trên: gò hải đăng, lối mòn đất, bóng đổ dài theo nắng, tuyết/sương muối phủ đỉnh ═════════
  {
    let s = E('g2', `M${LX - 96} ${R(G(LX - 96)) + 3}${cont(S([-90, -40, 0, 40, 96].map(d => [LX + d, surf(LX + d)] as Pt)))}L${LX + 100} ${R(G(LX + 100)) + 3}V630H${LX - 96}z`) + E('vhs vh2', S([-70, -30, 10, 60].map(d => [LX + d, surf(LX + d) + 1] as Pt)), ' opacity=".35"')
    // lối mòn: từ cửa nhà qua chân tháp tới ghế mép vách
    s += E('vhd vh4 vhO5', P([16700, 16790, 16880, 16980, 17040, 17110, 17160].map(x => [x, surf(x) + (x < 16790 ? 4 : 6)] as Pt), false), ' stroke-dasharray="70 8 50 12 90 6"')
    // bóng đổ dài (chiều/sáng xiên nắng), ngược phía mặt trời
    const lenS = day > 0.5 && skyK > 0.3 ? clamp((Math.abs(ha) - 2.8) * 120, 0, 340) : 0
    if (lenS > 10) {
      const tx = clamp(LX - side * lenS, 16700, 17250)
      s += E('k1', `M${LX + side * 24} ${LB - 1}L${R(tx)} ${R(surf(tx) + 4)}L${LX + side * 34} ${LB + 9}z`, ' opacity=".25"')
    }
    // tuyết / sương muối phủ suốt mặt trên (mép dưới gợn sóng)
    if (snow || frost) {
      const st: Pt[] = []
      const sb: Pt[] = []
      for (let x = 16140; x <= 17268; x += 112) {
        st.push([x, surf(x) - 2])
        sb.unshift([x, surf(x) + 9 + Math.abs(nz(x / 26, 13)) * 7])
      }
      s += `<g mask="url(#vh-om)">${E(snow ? 'w3' : 'f3', `${P(st, false)}${cont(P(sb, false))}z`, snow ? '' : ' opacity=".45"')}</g>`
    }
    add(3, 16140, 17280, 6, s)
  }

  // ═════════ 7. Nhà người giữ đèn trên kè đá (gốc: góc trái-dưới tường HX/FY) ═════════
  {
    const r = rnd('nha')
    const gy = (x: number) => R((G(HX + x * HK) - FY) / HK)
    let s = ''
    let g = ''
    // kè đá nâng nền nhà, bậc đá xuống lối mòn, rêu bám mép kè
    s += `<g class="s3"><path id="vh-kw" d="${P([[-14, gy(-14) + 8], [-14, 2], [164, 2], [164, gy(164) + 8]])}"/></g><use href="#vh-kw" fill="url(#vh-sj)"/>` + E('s2', `M-18 0h186v4H-18zM-14 3h-8v12h-8v12h-8v12h-8v${gy(-46) - 36}h32zM52 4h34v4H52z`)
    s += E('g2', humps(-40, gy(0) + 8, 76, 5, 3, r) + humps(110, gy(130) + 8, 60, 4, 2, r))
    if (mossy) s += E(moss, humps(-14, 3, 60, 2.5, 3, r) + humps(90, 3, 70, 2, 3, r))
    // tường vôi vàng, ẩm chân tường, bóng mái hiên
    s += E('w1', 'M0-66h146V0H0z') + E('m3 vhO3', 'M0 0v-9q20-5 40 0t40-2t46 3V0z') + E('sh', 'M0-66h146v8H0z')
    // cửa sổ cánh xanh ngọc ×2, bậu hoa
    s += `<use href="#vh-wn" x="14"/><use href="#vh-wn" x="90"/>` + E('r2', 'M11-23h28v5H11z')
    if (!dong && fine) s += E('vhf vh4', 'M14-25h22', ' stroke-dasharray="0 5 0 3"')
    if (night) g += `<use href="#vh-wg" x="14"/><use href="#vh-wg" x="90"/>`
    // cửa gỗ hé mở, bậc đá, phao cứu sinh, đèn hiên
    s += E('b1', 'M57 0v-42h24V0z') + E('b2', 'M64 0v-40h16V0z') 
    if (night) g += E('e1', 'M58 0v-40h6V0z') + `<path fill="url(#gw)" d="M44 4l12-46h10l12 46z"/>` + (det ? E('e1', 'M85-43h5v-6h-5z') + `<circle cx="87" cy="-46" r="22" fill="url(#gw)"/>` : '')
    if (det) s += `<circle class="vht vh4" cx="131" cy="-33" r="7"/><circle class="vhp vh4 vhB" stroke-dasharray="5.5 5.5" cx="131" cy="-33" r="7"/>` + E('k2', 'M84-42h7l-1-8h-5z')
    // mái ngói âm dương (hàng ngói lợp so le), nóc võng nhẹ, đầu đao cong; vài viên vỡ; rêu đọng hàng dưới & quanh ống khói
    s += `<g class="r1"><path id="vh-rf" d="M-18-60q6-9 32-48q60 4 118 0q26 39 32 48z"/></g>` + (det ? `<use href="#vh-rf" fill="url(#vh-tl)"/>${E('r3', 'M-18-60l5-7h162l5 7z', ' opacity=".7"')}` : '')
    if (det) s += E('r2', 'M38-94h8l-1 4h-8zM96-80h7v4h-8zM120-100h6v3h-6z')
    s += E('vhr', 'M0-118q4 9 14 9q60 3 118 0q10 0 14-9', ' stroke-width="5"')
    s += E('s3', 'M112-104v-26h13v26z') + E('s4', 'M109-129h19v-5h-19z')
    if (mossy) s += E(moss, `${humps(-12, -61, 64, 2.6, 3, r)}${humps(70, -61, 80, 2.2, 4, r)}M108-104q8-7 20 0z${humps(30, -104, 44, 2, 2, r)}`)
    if (snow) s += E('w3', 'M10-110q60 5 124 0l8 12q-18 7-40 1q-30 7-58-1q-24 6-40 0zM-18-61l5-6q80-4 172 0l5 5q-40 4-88 0q-50 5-94 1zM108-130v-5h21v5z')
    add(3, 16560, 16820, 7, `<g ${tr(HX, FY, ` scale(${HK})`)}>${s}</g>`, g ? `<g ${tr(HX, FY, ` scale(${HK})`)}>${g}</g>` : '')
  }

  // ═════════ 8. Hải đăng (tiêu điểm; gốc toạ độ: chân tháp LX/LB) ═════════
  {
    const hw = (y: number) => 23 + ((y + 230) * 11) / 214
    let s = `<ellipse class="ao" cy="2" rx="64" ry="6"/>` + E('s2', 'M-44 2l4-18h80l4 18z') + E(side > 0 ? 'sh' : 'hl', 'M-40-16h80v4h-80z')
    // tháp xây gạch trát vôi trắng đã ngả vàng (kiểu hải đăng Đông Dương cũ): chân ố vàng & ẩm, hàng đá mờ, vệt gỉ chảy từ
    // ban công, mũ đèn bằng sắt sẫm; khối trụ 3 sắc độ đổi phía theo nắng
    s += `<g class="w3"><path id="vh-tw" d="M-34-16l11-214h46l11 214z"/></g><use href="#vh-tw" fill="url(#vh-tb)"/>`
    s += `<use href="#vh-tw" fill="url(#vh-tg)"${side > 0 ? ' transform="scale(-1 1)"' : ''}/>`
    if (det) {
      let cs = ''
      for (let y = -40; y > -226; y -= 26) cs += `M${R(-hw(y))} ${y}H${R(hw(y))}`
      s += E('vhq', cs, ' stroke-width=".8" stroke-dasharray="17 2 9 2 23 3" opacity=".16"') + E('vhx', 'M-15-228c1 14-2 30 0 48M5-228c-1 20 2 36 0 70M16-227c1 10 0 18 1 26', ' stroke-width="1.6" opacity=".28"')
    }
    if (rim) s += E('vho vh2', 'M23-230l11 214M22-278q-4-14-22-25', ' opacity=".6"')
    // cửa vòm, cửa sổ cầu thang xoắn, ban công
    s += E('b1', 'M-10-16v-22q0-10 10-10t10 10v22z') + E('b2', 'M-7-16v-21q0-7 7-7t7 7v21z') + E('s3', 'M7-97h7v12H7zM-9-161h7v12h-7z') + E('k2', 'M-38-238h76v8h-76zM-20-238v-10h40v10z') + E('x1', 'M-22-278q22-34 44 0z') + E('k2', 'M8-96h5v10H8zM-8-160h5v10h-5zM-36-230h72l-9 6h-54z')
    // rêu, rong chân tháp
    if (det) s += E(moss, `${humps(-46, -14, 30, 4, 4, rnd('tm'))}M28-14q10-12 20 2zM-36-26q4-9 9-1q2-6 6 0zM-33-16c0-8 2-14 1-24l3 1c1 8-1 14 0 23z`)
    // lan can, phòng đèn kính, lăng kính Fresnel (ban ngày lấp lánh chậm), song kính
    s += E('vhq vh1', 'M-37-254h74')
    if (det) s += E('vhq vhB', 'M-36-246h72', ' stroke-width="16" stroke-dasharray="1.4 5"')
    s += E('a1', 'M-19-248v-30h38v30z')
    if (det && !night) s += E('x2', 'M-9-251q-4-11 0-22h18q4 11 0 22z') + `<g class="tw vh-fr ${A(12, 'fr')}">${E('vhs', 'M-9-256h18M-11-262h22M-9-268h18', ' stroke-width="1.2"')}</g>`
    s += E('e1', 'M-5-257h10v-11H-5z', lamp ? '' : ' opacity=".35"') + E('vhq vhB', 'M-19-263h38', ' stroke-width="30" stroke-dasharray="1.5 8.5"')
    if (det) s += E('hl', 'M-16-250l10-26h5l-10 26zM-16-280q8-18 20-21q-14 8-16 21z') + `<circle class="k2" cy="-304" r="3.4"/>` + E('vhq', 'M0-307v-14M-8-318h16', ' stroke-width="1.2"')
    // ngày: một lớp hơi trời mỏng phủ tháp → trắng hoà vào trời, không thành đốm sáng chói giữa khung; sương: dày hơn
    const tv = night ? fog * 0.3 : Math.max(0.14, fog * 0.3)
    if (tv > 0.05) s += `<use href="#vh-tw" style="fill:var(--haze)" opacity="${n2(tv)}"/>`
    if (snow) s += E('w3', 'M-23-279q23-34 46 0q-12-6-23-4q-11-2-23 4zM-39-238h78v-4h-78zM-45-15h90v-4h-90z')
    // vệt đèn quét: 3 nêm lồng nhau (mép mềm), tắt dần trước 80% chiều dài; mưa/tuyết sáng lên trong vệt
    const pt = parts ? `<g clip-path="url(#vh-bc)"><path class="vh-pt" fill="url(#vh-${snow ? 'ps' : 'pr'})" d="M0-190h1150v340H0z"/></g>` : ''
    const beam = `<g class="vh-bm"><path fill="url(#vh-bg)" d="M0 0L1150-44V44z"/><path fill="url(#vh-bg)" opacity=".5" d="M0 0L1150-86V86z"/>${det ? '<path fill="url(#vh-bg)" opacity=".22" d="M0 0L1150-140V140z"/>' : ''}${pt}</g>`
    let g = ''
    if (lamp && day > 0.5) s += `</g><g ${tr(LX, LY)} opacity=".5"><circle r="90" fill="url(#gw)"/>${beam}`
    else if (lamp) {
      g +=
        `<g ${tr(LX, LY)}><circle r="140" fill="url(#gw)" opacity=".75"/>${det ? '<circle r="32" fill="url(#gw)"/>' : ''}${E('e2', 'M-5 6h10v-12H-5z')}` +
        `<circle class="vh-fla" r="86" fill="url(#gw)"/><g opacity="${fog >= 0.4 || rain ? 1 : 0.8}">${beam}</g></g>` +
        (det ? E('e2', `M${R(LX + 8 * LK)} ${R(LB - 96 * LK)}h4v9h-4zM${R(LX - 8 * LK)} ${R(LB - 160 * LK)}h4v9h-4z`, ' opacity=".6"') : '')
    }
    add(3, LX - 50, LX + 50, 9, `<g ${tr(LX, LB, ` scale(${LK})`)}>${s}</g>`, g)
  }

  // ═════════ 9. Cây thông còi bám mép vách, nghiêng ra biển: 3 tầng tán so le (gốc 17262/612) ═════════
  {
    const r = rnd('thong')
    let t = ''
    let u = ''
    for (const [x, y, w] of [[36, -60, 46], [6, -47, 30], [54, -32, 28]] as Pt3[]) {
      t += humps(x - w / 2, y + 4, w, 5, 4, r)
      u += humps(x - w / 2 + 3, y + 1, w * 0.82, 4.5, 3, r)
    }
    const s = E('vhb', 'M0 2q2-16 16-24t26-16q12-8 18-20M17-22q-10-8-8-22M40-38q8 2 14 8', ' stroke-width="5"') + `<g class="sw1">${E('m3', t)}${det || snow ? E(snow ? 'w3' : moss, u) : ''}</g>`
    add(3, 17250, 17330, 6, `<g ${tr(17262, 612)}>${s}</g>`)
  }

  // ═════════ 10. Cầu thang gỗ bám vách xuống bến: chiếu nghỉ trên gờ đá, thanh chống, bu lông gỉ, vài bậc gãy ═════════
  {
    const r = rnd('thang')
    const T: Pt[] = [[17244, 612], [17168, R(lineY(0, 17168)) - 1], [17282, R(lineY(2, 17282)) - 1], [17200, R(lineY(3, 17200)) - 1], [17322, 852]]
    let line = ''
    let prof = ''
    let pad = ''
    T.slice(0, -1).forEach((a, i) => {
      const b = T[i + 1] as Pt
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const n = Math.max(3, R(dy / 10))
      const hx = R(dx / n)
      const vy = R(dy / n)
      // đoạn thứ hai: vài bậc gãy/mất
      prof += (i === 1 ? `M${J([a[0] + hx * 3, a[1] + vy * 3])}${`h${hx}v${vy}`.repeat(n - 3)}` : `M${J(a)}${`h${hx}v${vy}`.repeat(n)}`) + `h${dx - hx * n}v${dy - vy * n}`
      line += P([a, b], false)
      if (i > 0) {
        pad += `M${J([a[0] - 12, a[1]])}h24v4h-24z`
      }
    })
    let s = `<g class="vhk vhO2" stroke-width="5" ${tr(4, 7)}><path id="vh-sr" d="${line}"/></g><use href="#vh-sr" class="vhb" stroke-width="3" y="3" opacity=".5"/>` + E('vhc vh2', prof, ' opacity=".45"')
    s += E('b2', pad, ' opacity=".7"')
    if (mossy) s += E(moss, humps(17286, 850, 32, 2.2, 4, r))
    if (snow && det) s += `<use href="#vh-sr" class="vhw" stroke-width="2.4" y="-3"/>` + E('w3', pad.replace(/h24v4h-24z/g, 'h24v-3h-24z'))
    // đèn trên chiếu nghỉ giữa
    const [lx, ly] = T[2] as Pt
    s += E('vhb vh2', `M${lx + 8} ${ly}v-26h6`) + E('k2', `M${lx + 11} ${ly - 18}h7l-1-7h-5z`)
    add(3, 17150, 17340, 7, s, night ? E('e1', `M${lx + 12} ${ly - 20}h5v-5h-5z`) + `<circle cx="${lx + 14}" cy="${ly - 22}" r="26" fill="url(#gw)"/>` : '')
  }

  // ═════════ 11. Bến nhỏ: cọc gỗ, thùng, cuộn dây, thúng chai úp, lưới phơi; vòm đá có cua, vũng nước triều ═════════
  {
    // vòm đá (đá xuyên lỗ), rêu trên đỉnh, cỏ lơ thơ, con cua, vũng nước triều
    let s =
      `<g ${tr(17582, 876)}><g class="s3"><path id="vh-ar" fill-rule="evenodd" d="M0 0l7-40 11-30 22-16 30-4 28 10 19 22 11 28 8 30zM32 0l4-26 12-16 20-4 18 10 10 20 4 16z"/></g>` +
      E(side > 0 ? 'hl' : 'sh', 'M98-80l19 22 11 28 8 30h-36l-4-16 8-28z') +
      E('k1 vhO2', 'M0-10h136V0H0z') + E(moss, 'M38-84q30-14 64 2zM4-30q6-14 10-6zM124-20q6-8 10 4z') + (det ? use('ts', 'g1', 82, -87) : '') +
      (fine ? E('a1', 'M110-9q10-4 20 0q-10 3-20 0z') + E(`vhw tw ${A(7.2, 'tp')}`, 'M115-9h5', ' stroke-width="1.2"') : '') +
      (snow ? E('w3', 'M40-86q28-12 62 1q-30-5-62-1z') : '') +
      `</g>`
    // bọt quanh chân vòm đá, bụi nước tung
    s += E(`w3 vh-fo ${A(6, 'fo5')}`, 'M17574 866q12-6 24-1q10-4 20 1q-20 6-44 0zM17674 866q14-6 24-1q12-4 24 1q-24 6-48 0z', ' opacity=".8"')
    // bến gỗ (gốc 17316/852)
    let b = E('vhb vhB', 'M10 11H166', ' stroke-width="22" stroke-dasharray="4 24"')
    b += E('b2', 'M0-5h168v6H0z') + E('hl', 'M0-5h168v2H0z') + E('k2', 'M146-5v-6h6v6zM157-34h10l-2-9h-6z') + E('vhb', 'M162-5v-31', ' stroke-width="2.4"') 
    if (det) b += `<g class="bob">${E('p2', 'M104 5h58q-4 10-27 11q-23-1-31-11z')}${E('b1', 'M108 5h50l-2-3h-46z')}${E('vhp vh1', 'M107 8h52')}${E('vhc vh2', 'M120 2l28-7')}</g>`
    if (snow && det) b += E('w3', 'M0-5h168v-3H0zM64-6q15-22 32 0q-16-12-32 0z')
    s += `<g ${tr(17316, 852)}>${b}</g>`
    let g = ''
    if (night) g += `<g ${tr(17316, 852)}>${E('e1', 'M159-36h6v-6h-6z')}<circle cx="162" cy="-39" r="30" fill="url(#gw)"/>${det ? E('vhe vh2 tw', 'M156 18h12M158 26h8M154 35h14M159 45h6', ' opacity=".6"') : ''}</g>`
    if (plankton) g += E('e4', 'M17574 866q12-6 24-1q10-4 20 1q-20 6-44 0z', ' opacity=".45"')
    add(3, 17310, 17730, 7, s, g)
  }

  // ═════════ 12. Mỏm đá tiền cảnh khung góc phải dưới: khối tối nhất khung, mũ rêu, mặt ướt, bọt quấn chân ═════════
  {
    const r = rnd('mo')
    let s = E('k2', blob(17660, 1050, 170, 100, r, 8, 0.3))
    s += E(snow ? 'w3' : mossy ? moss : 's4', blob(17672, 966, 116, 20, r, 7, 0.35), ' opacity=".75"')
    if (ctx.wet > 0.1 || rim) s += E(rim ? 'vho vh2' : 'vhw vh1', S([[17540, 990], [17580, 970], [17640, 958], [17720, 954]]), ' opacity=".5"')
    s += E(`w3 vh-fo ${A(6.8, 'fo6', 'animation-duration:6.8s;')}`, humps(17460, 1050, 110, 3, 4, r), ' opacity=".5"')
    add(3, 17460, 17840, 9, s)
  }

  // ═════════ 13. Hải âu lượn quanh tháp (ngày, không bão) ═════════
  if (gulls)
    add(3, 16700, 17700, 3, `<g class="vh-gu ${A(80, 'gu')}">${use('gl', 'vhw', 17000, 470)}${lite ? '' : use('gl', 'vhw', 17062, 482, 0.7) + use('gl', 'vhw', 16930, 520, 0.85)}</g>`)

  const spots: Spot[] = [
    { kind: 'cat', layer: 3, x: 16262, y: R(G(16262)) + 2, s: 1 },
    { kind: 'cat-shelter', layer: 3, x: R(HX + 69 * HK), y: FY, s: 0.9 },
    { kind: 'butterflies', layer: 3, x: 16330, y: R(G(16330)) - 20, w: 160 },
    { kind: 'perch', layer: 3, x: LX - 16, y: LB - R(254 * LK), s: 0.8 },
    { kind: 'perch', layer: 3, x: R(HX + 60 * HK), y: R(FY - 118 * HK), s: 0.8 },
    { kind: 'perch', layer: 3, x: 17478, y: 806, s: 0.9 },
    { kind: 'perch', layer: 3, x: 17650, y: 788, s: 0.8 },
    { kind: 'smoke', layer: 3, x: R(HX + 118 * HK), y: R(FY - 134 * HK), s: 0.85 },
  ]

  const css =
    STROKES.map(([c]) => `.vh${c}`).join(',') +
    `,.vhf{fill:none;stroke-linecap:round;stroke-linejoin:round}.vhB{stroke-linecap:butt}` +
    STROKES.map(([c, v]) => `.vh${c}{stroke:var(--${v})}`).join('') +
    `.vhf{stroke:var(--${flower})}.vhF{stroke:var(--f3)}` +
    WIDTHS.map(([c, v]) => `.vh${c}{stroke-width:${v}}`).join('') +
    OPAS.map(([c, v]) => `.vh${c}{opacity:${v}}`).join('') +
    (lamp ? `.vh-bm{transform-box:fill-box;transform-origin:0 50%;animation:vh-bm 16s ease-in-out infinite;${dl(16, 'bm')}}@keyframes vh-bm{0%,100%{transform:scaleX(1)}50%{transform:scaleX(-1)}}` +
    `.vh-fla{animation:vh-fla 16s linear infinite;${dl(16, 'bm')}}@keyframes vh-fla{0%,16%,34%,100%{opacity:.08}25%{opacity:1}}` : '') +
    (parts ? `.vh-pt{animation:vh-pt ${snow ? 5 : 0.9}s linear infinite}@keyframes vh-pt{to{transform:translate(${snow ? -12 : -6}px,40px)}}` : '') +
    `.vh-fo{transform-box:fill-box;transform-origin:50% 100%;animation:vh-fo 5.2s ease-in-out infinite}@keyframes vh-fo{0%,100%{transform:scale(.9,.8)}50%{transform:scale(1.1,${n2(1.3 + rough * 0.25)});opacity:.3}}` +
    (det ? `.vh-sp{transform-box:fill-box;transform-origin:50% 100%;animation:vh-sp 8s ease-out infinite}@keyframes vh-sp{0%,60%{transform:scale(.3,.1);opacity:0}70%{opacity:.85}100%{transform:scale(${n2(0.8 + rough * 0.3)});opacity:0}}` : '') +
    (boat ? `.vh-bt{animation:vh-bt 300s ease-in-out infinite alternate;${dl(600, 'bt')}}@keyframes vh-bt{to{transform:translateX(150px)}}` : '') +
    `.vh-wa{animation:vh-wa 128s linear infinite;${dl(128, 'w0')}}.vh-wb{animation:vh-wa 70s linear infinite;${dl(70, 'w1')}}@keyframes vh-wa{to{transform:translateX(-480px)}}` +
    (gulls ? `.vh-gu{animation:vh-gu 80s linear infinite}@keyframes vh-gu{0%{transform:translate(-260px,14px);opacity:0}8%,90%{opacity:1}100%{transform:translate(620px,-36px);opacity:0}}` : '') +
    (night ? `.vh-bl{animation:vh-bl 5s steps(1) infinite}@keyframes vh-bl{0%,9%{opacity:1}10%,100%{opacity:.06}}` : '.vh-fr{animation-duration:6s}') +
    anim

  // tảng đá dùng lại (đặt bằng <use>): thân, mặt khuất/đón nắng, mũ rêu, bóng tiếp xúc
  const rb = rnd('da')
  const boulder = (id: string, rx: number, ry: number) =>
    `<g id="vh-${id}"><ellipse class="ao" cy="${R(ry * 0.5)}" rx="${R(rx * 1.15)}" ry="${R(ry * 0.3)}"/>${E('s3', blob(0, 0, rx, ry, rb, 7))}${E(side > 0 ? 'hl' : 'sh', blob(side * rx * 0.3, -ry * 0.2, rx * 0.55, ry * 0.5, rb, 6))}${E('s2', blob(-side * rx * 0.25, -ry * 0.35, rx * 0.45, ry * 0.35, rb, 5), ' opacity=".7"')}${mossy ? E(moss, humps(-rx * 0.7, -ry * 0.45, rx * 1.2, 3, 3, rb)) : ''}${snow ? E('w3', humps(-rx * 0.6, -ry * 0.5, rx * 1.1, 2.5, 3, rb)) : ''}</g>`
  const defs =
    `<linearGradient id="vh-fg" gradientUnits="userSpaceOnUse" x1="0" y1="764" x2="0" y2="1060">${stop(0, 'g2', 1)}${stop(0.22, 'g2', 1)}${stop(0.55, 'g3', 1)}${stop(1, 'g4', 1)}</linearGradient>` +
    `<linearGradient id="vh-omg" gradientUnits="userSpaceOnUse" x1="16150" y1="0" x2="16470" y2="0">${stop(0, 'w3', 0)}${stop(1, 'w3', 1)}</linearGradient>` +
    `<mask id="vh-om" maskUnits="userSpaceOnUse" x="16130" y="560" width="1200" height="700" style="mask-type:alpha"><path fill="url(#vh-omg)" d="M16130 560h1200v700h-1200z"/></mask>` +
    `<linearGradient id="vh-fmg" gradientUnits="userSpaceOnUse" x1="16140" y1="0" x2="16200" y2="0">${stop(0, 'w3', 0)}${stop(1, 'w3', 1)}</linearGradient>` +
    `<mask id="vh-fm" maskUnits="userSpaceOnUse" x="16130" y="560" width="700" height="700" style="mask-type:alpha"><path fill="url(#vh-fmg)" d="M16130 560h700v700h-700z"/></mask>` +
    // dải mù chân trời của cánh đồng bên trái: kéo tiếp rồi tan dần, không lộ mép
    `<linearGradient id="vh-dg" gradientUnits="userSpaceOnUse" x1="16420" y1="0" x2="16712" y2="0">${stop(0, 'k1', 0)}${stop(1, 'k1', 0.3)}</linearGradient>` +
    // MỘT dải màu biển liền cho cả biển xa (lớp 2) và gần (lớp 3) — y dùng chung: nhạt ở chân trời, sẫm dần về phía người xem
    `<linearGradient id="vh-fs" gradientUnits="userSpaceOnUse" x1="0" y1="${HZ}" x2="0" y2="1300">${stop(0, 'a1', 1)}${stop(0.5, 'a2', 1)}${stop(1, 'a3', 1)}</linearGradient>` +
    `<linearGradient id="vh-ns" gradientUnits="userSpaceOnUse" x1="0" y1="${SEA - 8}" x2="0" y2="1150">${stop(0, 'a2', 0)}${stop(0.07, 'a2', 0.92)}${stop(0.5, 'a3', 1)}${stop(1, 'k2', 1)}</linearGradient>` +
    `<linearGradient id="vh-lt" gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="280">${stop(0, 'w3', 0.34)}${stop(0.26, 'w3', 0)}${stop(0.42, 'k1', 0)}${stop(1, 'k1', 0.34)}</linearGradient>` +
    `<linearGradient id="vh-tg" gradientUnits="userSpaceOnUse" x1="-34" y1="0" x2="34" y2="0">${stop(0, 'w3', 0.6)}${stop(0.3, 'w3', 0)}${stop(0.55, 'k1', 0)}${stop(0.85, 'k1', 0.3)}${stop(1, 'k1', 0.45)}</linearGradient>` +
    `<linearGradient id="vh-tb" gradientUnits="userSpaceOnUse" x1="0" y1="-230" x2="0" y2="-16">${stop(0, 'w1', 0.12)}${stop(0.55, 'w1', 0.3)}${stop(0.9, 'w1', 0.5)}${stop(1, 'k1', 0.3)}</linearGradient>` +
    `<linearGradient id="vh-hz" gradientUnits="userSpaceOnUse" x1="0" y1="${HZ}" x2="0" y2="${HZ + 62}">${stop(0, 'haze', 0.75)}${stop(1, 'haze', 0)}</linearGradient>` +
    (lamp ? `<linearGradient id="vh-bg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1150" y2="0">${stop(0, 'e2', 0.6)}${stop(0.12, 'e2', 0.3)}${stop(0.45, 'e2', 0.09)}${stop(0.85, 'e2', 0)}</linearGradient>`: '') +
    (det ? `<pattern id="vh-gr" width="23" height="13" patternUnits="userSpaceOnUse"><path class="vhq" opacity=".12" stroke-width=".8" d="M2 3h6M14 9h5M9 12l3-1M19 2h2M4 8l2 1"/></pattern>`: '') +
    (det ? `<pattern id="vh-tl" width="10" height="14" patternUnits="userSpaceOnUse" y="-108"><path class="vhr" stroke-width="1.3" opacity=".75" d="M0 7a5 4 0 0 1 10 0M-5 14a5 4 0 0 1 10 0M5 14a5 4 0 0 1 10 0"/><path class="vhs" opacity=".25" d="M3 4h4M-2 11h3M8 11h3"/></pattern>`: '') +
    `<pattern id="vh-sj" width="22" height="12" patternUnits="userSpaceOnUse"><path class="vhq" opacity=".35" d="M0 1h22M0 7h22M8 1v6M19 7v6"/></pattern>` +
    (parts && !snow ? `<pattern id="vh-pr" width="40" height="40" patternUnits="userSpaceOnUse"><path class="vhw" stroke-width="1" d="M6 2l-2 9M27 17l-2 9M15 29l-2 9M35 5l-1 6"/></pattern>`: '') +
    (parts && snow ? `<pattern id="vh-ps" width="40" height="40" patternUnits="userSpaceOnUse"><path class="vhw" stroke-width="2.6" d="M6 4h0M27 17h0M15 31h0M35 9h0M20 2h0"/></pattern>`: '') +
    (parts ? `<clipPath id="vh-bc"><path d="M0 0L1150-140V140z"/></clipPath>`: '') +
    `<clipPath id="vh-rk"><use href="#vh-rkp"/></clipPath>` +
    `<clipPath id="vh-sc"><path d="M16640 ${SEA - 30}H18400V1300H16470L16484 1000 16512 950 16550 912 16594 884z"/></clipPath><clipPath id="vh-fc"><path d="M${R(17310 - 0.55 * SHX)} ${HZ}H8700V${SEA}H${R(17310 - 0.55 * SHX)}z"/></clipPath>` +
    (plankton ? `<clipPath id="vh-pc"><path d="M17346 850H18380V1330H17346z"/></clipPath>` : '') +
    (foamD ? `<path id="vh-fb" d="${foamD}"/>` : '') +
    boulder('bA', 30, 20) +
    boulder('bB', 24, 19) +
    `<path id="vh-ts" d="M-7 0q-2-6-6-10q5 3 7 8q-1-8-2-14q4 6 4 13q2-9 6-12q-2 7-2 12q3-5 8-7q-4 4-4 10z"/>` +
    `<g id="vh-gl"><path stroke-width="1.6" d="M-8-1q4-4 8 1q4-5 8-1"/></g>` +
    // cửa sổ nhà giữ đèn (dùng 2 lần) + bản phát sáng ban đêm
    `<g id="vh-wn">${E('p2', 'M-10-49h8v24h-8zM24-49h8v24h-8z')}${E('p3', 'M-2-51h26v28H-2z')}${E('k2', 'M1-48h20v22H1z')}${E('vht', 'M11-48v22M1-37h20', ' stroke-width="1.6"')}${E('hl', 'M2-47h8v9H2z')}</g>` +
    `<g id="vh-wg">${E('e2', 'M1-48h20v22H1z')}<circle cx="11" cy="-37" r="34" fill="url(#gw)" opacity=".7"/>${E('vhq', 'M11-48v22M1-37h20', ' stroke-width="1.6"')}</g>`

  return { pieces, spots, defs, css }
}

export const region: Region = {
  id: 'vach-hai-dang',
  name: 'Vách hải đăng',
  x0: 16200,
  x1: 18000,
  shots: [
    { id: 'vach-hai-dang', name: 'Hải đăng trên vách', x: SHX, y: 520, zoom: 0.92 },
  ],
  build,
}
