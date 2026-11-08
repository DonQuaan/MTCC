// KHỐI (ruong-bac-thang): trời sáng (trên 45%) · đồi xa nhạt trong sương · MỘT mỏm đồi lồi đầy ruộng ở giữa-dưới (vừa, các bậc
//   ôm quanh mỏm như vân gỗ, thu hẹp & dồn lại ở hai bên) · chòi + luỹ tre ở 2/3 phải trên vai đồi (tiêu điểm, tối nhất ở tầng giữa)
//   · hai góc dưới tối dần (khung). Giữa khung chỉ có mặt ruộng rộng, vân mảnh. Bỏ trống đồng & "ao trời" (vật lạ cướp tiêu điểm).
//   Một dải sương nằm giữa núi xa và vai đồi; bậc xa ngả màu sương, bậc gần đậm hơn; sườn cỏ phải (chỗ mắt nghỉ) chỉ có
//   chuyển sáng–tối theo khối đồi + bóng bậc ruộng + vân cỏ mờ. Bờ ruộng sau cột chat dịu ~70% (mặt nạ rb-cm).
// KHỐI (ho-sen, mép trái): ruộng dừng ở vai đồi trước x≈7120, sườn xuống hồ là cỏ của lõi — không còn phiến sọc nghiêng.
// VÙNG RUỘNG BẬC THANG (x 5400–7200): sườn đồi dâng từ ~760 lên đỉnh ~606 rồi đổ xuống hồ.
// Các bậc ruộng cong theo ĐỒNG MỨC: sườn có sống (lồi về phía người xem) và khe (lõm vào), nên mỗi bậc uốn lượn và các
// bậc lồng nhau như vảy rồng. Mỗi thửa ba sắc độ (mép sau tối · mặt sáng · mép trước khuất) + bờ đứng tối + viền nắng ở mép bờ.
// Câu chuyện: trên vai đồi là chòi canh sàn tre của người giữ nước (tiêu điểm) — áo tơi treo cột, chum nước, nồi cơm chiều,
// đèn bão sáng đêm. Giữa ruộng một TRỐNG ĐỒNG khổng lồ ngủ quên nửa vùi trong bờ, phủ rêu, bốn tượng cóc trên mặt; ống tre
// nhỏ giọt nước xuống mặt trống — trống vẫn "đánh", từng giọt một. Và có một thửa không bao giờ cấy: "ao trời" — ban ngày nó
// soi một bầu trời đêm có trăng lưỡi liềm, ban đêm nó sáng màu trời trưa. Không ai biết nó soi bầu trời của năm nào.
// Mùa: xuân nước gương + mạ lơ thơ · hạ lúa xanh dày hai sắc · thu lúa chín trĩu bông, bó lúa, đống rơm ủ khói · đông nước bạc,
// gốc rạ, sương nằm trong thung. Thời tiết: mưa gợn mặt ruộng, nước tràn qua khe bờ; bóng mây trôi; mây soi dưới nước;
// nắng thấp đổ một chuỗi đốm sáng xuống các bậc nước ngay dưới mặt trời, bóng đổ dài của chòi/tre/bù nhìn.
import type { BuildOut, Ctx, Piece, Region, Spot } from '../types'
import { clamp, ground, lerp, n0, n1, smooth } from '../util'

const RX0 = 5400
const RX1 = 7200
const S0 = ground(6400)
/** Hàng ruộng (trên → dưới): mặt ruộng RS (co phối cảnh) và bờ dựng RR. Hàng dưới gần hơn nên lớn hơn. */
const RS = [6, 9, 13, 17, 23, 30, 39, 48, 58, 70, 81]
const RR = [3, 4.4, 5, 6.5, 8, 10, 12, 14.5, 17.4, 20, 23]
const NR = RS.length
const DM = 4 + RS.reduce((a, v, i) => a + v + (RR[i] as number), 0)
/** Ranh giới khúc mảnh (để lõi cắt theo camera). */
const CB = [5400, 6000, 6600, 7200]
/** Tâm mỏm đồi: các bậc là đồng mức ôm quanh mỏm (cong ∪, hẹp & dồn lại hai bên). */
const XC = 6400
/** Bậc vân theo chiều sâu (xa · giữa · gần): cỡ & góc vân lúa đổi theo bậc. */
const TI = (j: number) => (j < 4 ? 0 : j < 7 ? 1 : 2)
const TS = [1, 1.6, 2.3]
const TR = [-2, 2.5, -1.2]
/** Nhóm bờ: các hàng có bờ cao gần nhau dùng chung một đường mép (dùng lại qua <use>). */
const LG = (j: number) => (j < 4 ? 0 : j < 6 ? 1 : j < 8 ? 2 : 3)
const LGW = [8, 12, 16.5, 25]
/** Hệ số cỡ theo hàng (phối cảnh thống nhất cho cò, bù nhìn, bó lúa). */
const U = (j: number) => 0.55 + 0.05 * j

type Kind = 'w' | 's' | 'b' | 'g' | 'r' | 'q' | 'y' | 'h' | 'f'
// w nước gương · s nước + mạ · b nước + gốc rạ · g mạ dày · r lúa xanh đậm · q lúa xanh sáng · y lúa chín · h đã gặt · f ruộng khô
const KINDS: Kind[] = ['w', 's', 'b', 'g', 'r', 'q', 'y', 'h', 'f']
const isWater = (k: Kind) => k === 'w' || k === 's' || k === 'b'
const isCrop = (k: Kind) => k === 'r' || k === 'q' || k === 'y'

type Field = { j: number; a: number; b: number; ab: number; bb: number; k: Kind; d: string }

/** Gọn chuỗi path: bỏ khoảng trắng trước dấu âm. */
const cz = (s: string) => s.replace(/ -/g, '-')
/** Hai chữ số thập phân cho hệ số cỡ. */
const n2 = (v: number) => Math.round(v * 100) / 100
const o2 = (v: number) => clamp(v, 0, 1).toFixed(2).replace(/^0/, '')

/** Một đoạn cubic tương đối "c…" xấp xỉ y = f(x) từ xs tới xe (nội suy đúng tại 1/3 và 2/3). */
function seg(f: (x: number) => number, xs: number, xe: number): string {
  const L = xe - xs
  const y0 = n0(f(xs))
  const y3 = f(xe)
  const A = 27 * f(xs + L / 3) - 8 * y0 - y3
  const B = 27 * f(xs + (2 * L) / 3) - y0 - 8 * y3
  const c2 = (2 * B - A) / 18
  const c1 = (A - 6 * c2) / 12
  return `c${n0(L / 3)} ${n0(c1) - y0} ${n0((2 * L) / 3)} ${n0(c2) - y0} ${L} ${n0(y3) - y0}`
}
/** Như seg nhưng chia n đoạn. */
const segs = (f: (x: number) => number, xs: number, xe: number, n: number) => {
  let s = ''
  for (let i = 0; i < n; i += 1) s += seg(f, n0(lerp(xs, xe, i / n)), n0(lerp(xs, xe, (i + 1) / n)))
  return s
}

function kindOf(ctx: Ctx, r: number, j: number): Kind {
  const T = ctx.seasonT
  switch (ctx.season) {
    case 'xuan':
      return T > 0.5 && r < (T - 0.5) * 1.6 ? 'g' : r < 0.5 ? 's' : 'w'
    case 'ha':
      // giữa hè: lúa xanh dày hai sắc xen theo hàng (tách bậc), vài thửa mạ dày sáng, vài thửa nước gương soi trời
      return r < 0.12 ? 'w' : r < 0.26 ? 'g' : j % 2 ? 'q' : 'r'
    case 'thu':
      return r < clamp((T - 0.38) * 1.5, 0, 0.75) ? 'h' : T < 0.25 && r > 0.85 ? 'r' : 'y'
    default:
      return r < 0.58 + (T > 0.7 ? (T - 0.7) * 1.4 : 0) ? 'b' : 'f'
  }
}

const wrapH = (v: number) => ((((v + 12) % 24) + 24) % 24) - 12

function build(ctx: Ctx): BuildOut {
  const lite = ctx.detail === 'lite'
  /** Chi tiết chỉ vẽ ở mức full. */
  const F_ = (x: string) => (lite ? '' : x)
  const nzW = ctx.noise('rb-dong-muc')
  const nzM = ctx.noise('rb-be-day')
  const W = (x: number) => nzW(x / 520, 0.37) * 2.4
  const sl = (x: number) => (ground(x - 160) + ground(x - 80) + ground(x) + ground(x + 80) + ground(x + 160)) / 5
  /** Thuỳ đồng mức dùng chung mọi hàng: > 0 là sống đồi lồi về phía người xem, < 0 là khe lõm vào. */
  const lobe = (x: number) => 0.6 * Math.sin((x - 5400) / 135 + 0.8) + 0.4 * Math.sin((x - 5400) / 86 + 2.1)
  const AMP = (D: number) => (5 + 33 * (D / DM) ** 1.1) * smooth(0, 70, D)
  /** Đường đồng mức ở độ sâu D dưới sống đồi (D=0 là sống đồi). Hàng sâu hơn: thuỳ lớn hơn, bớt dốc theo sống. */
  /** Nửa bề rộng đồng mức quanh mỏm (trái rộng hơn; phải dừng trước vai đồi đổ xuống hồ, x ≤ ~7120). */
  const rS = (x: number, D: number) => {
    const t = (D / DM) ** 0.75
    return x < XC ? Math.min(380 + 800 * t, XC - 5440) : Math.min(290 + 370 * t, 7125 - XC)
  }
  /** Độ nâng ở hai bên: đồng mức vòng ra sau mỏm nên lên cao & dồn sát nhau (co phối cảnh). */
  const lift = (x: number, D: number) => {
    const u = clamp((x - XC) / rS(x, D), -1, 1)
    return D * (0.4 * u * u + 0.12 * u ** 4)
  }
  const Y = (x: number, D: number) => {
    const g0 = ground(x)
    const s = g0 + (sl(x) - g0) * smooth(4, 40, D)
    return Math.max(g0 + 5 + 0.2 * D, s + D - 0.45 * (D / DM) * (s - S0) + 0.034 * D * W(x) + 0.7 * AMP(D) * lobe(x) - lift(x, D))
  }
  /** Bề dày mặt ruộng biến thiên theo x (đồng mức không song song). */
  const mod = (j: number, x: number) => 1 + 0.35 * nzM(x / 330, j * 3.7)
  const dTop = (j: number, x: number) => {
    let d = 4
    for (let i = 0; i < j; i += 1) d += (RS[i] as number) * mod(i, x) + (RR[i] as number)
    return d
  }
  const topY = (j: number) => (x: number) => Y(x, dTop(j, x))
  const botY = (j: number) => (x: number) => Y(x, dTop(j, x) + (RS[j] as number) * mod(j, x))
  const ph = (p: number, k: string) => `style="animation-delay:${ctx.ph(p, k)}"`

  const h = ctx.vn.hourF
  const day = ctx.daylight
  const night = day < 0.3
  const cl = ctx.cur.cloud
  const pr = ctx.cur.precip
  const wind = ctx.cur.wind
  const ss = ctx.season
  const rainy = (p: string) => p === 'mua' || p === 'mua-to' || p === 'phun'
  const raining = ctx.weather.some(s => rainy(s.precip))
  const snow = pr === 'tuyet'
  const frost = snow || (ss === 'dong' && h > 4 && h < 9 && cl !== 'u-am')
  // Mặt trời: cùng phép chiếu với module trời → cột đốm sáng nằm ngay dưới đĩa mặt trời ở khung cảnh chính.
  const haS = wrapH(h + 0.85 / 15 - 12)
  const sunX = 800 + haS * 110
  const sunA = ctx.sunAlt
  const sunK = day < 0.15 || sunA < -0.02 ? 0 : ({ quang: 1, it: 0.85, vua: 0.55, nhieu: 0.2, 'u-am': 0 } as const)[cl] * (pr === 'khong' ? 1 : 0.25)
  const xg = clamp(6430 + sunX - 800, 5660, 7200)
  const lowSun = 1 - smooth(0.06, 0.5, sunA)
  // Mặt trăng (cùng công thức module trời): cột ánh trăng trên các bậc nước ban đêm.
  const D2R = Math.PI / 180
  const decM = Math.asin(Math.sin(23.44 * D2R) * Math.sin((2 * Math.PI * (ctx.vn.doy - 80)) / 365.2422 + 2 * Math.PI * ctx.moonPhase))
  const haM = wrapH(haS - ctx.moonPhase * 24)
  const mS = Math.sin(21.03 * D2R) * Math.sin(decM) + Math.cos(21.03 * D2R) * Math.cos(decM) * Math.cos(haM * 15 * D2R)
  const ill = (1 - Math.cos(2 * Math.PI * ctx.moonPhase)) / 2
  const moonK = night && mS > 0.05 && ill > 0.25 && (cl === 'quang' || cl === 'it' || cl === 'vua') ? ill : 0
  const xm = clamp(6430 + haM * 110, 5660, 7200)

  // ───────── Hàng ruộng: biên, nhát cắt (bờ ngang chéo), thửa ─────────
  const fields: Field[] = []
  const lips: string[] = ['', '', '', '']
  const cutPts: [number, number, number][] = [] // [x mép trước, y mép trước, hàng] — khe tràn nước
  const ends: [number, number, number, number][] = [] // [x, y, hàng, hướng] — đầu hàng (bụi cây)
  const rh = ctx.rng('rb-hang')
  const rk = ctx.rng('rb-loai')
  let prev: number[] = []
  for (let j = 0; j < NR; j += 1) {
    const top = topY(j)
    const bot0 = botY(j)
    const Dm = dTop(j, XC) + (RS[j] as number) * 0.5
    // hai đầu hàng: nơi đồng mức vòng ra sau mỏm — so le, hàng dưới rộng hơn hàng trên
    const L = n0(Math.max(5440, XC - rS(XC - 1, Dm) * (0.9 + rh() * 0.08)))
    let R = n0(Math.min(7120, XC + rS(XC + 1, Dm) * (0.9 + rh() * 0.08)))
    // không để đầu hàng chìa ra ngoài sườn phải: mặt trên luôn nằm dưới mặt đất ≥ 4
    while (R > 6950 && top(R) < ground(R) + 4) R -= 8
    // mặt thửa thuôn dần ở hai đầu (mũi lá) → giữa các đầu hàng lộ lưỡi cỏ của sườn đồi, không thành tấm ván bo tròn
    const bot = (x: number) => {
      const t = top(x)
      return t + (bot0(x) - t) * (0.45 + 0.55 * clamp(Math.min(x - L, R - x) / 130, 0, 1))
    }
    const th = (x: number) => bot(x) - top(x)
    const rc = ctx.rng(`rb-cut${j}`)
    let cuts: number[] = []
    let x = L
    for (;;) {
      let c = x + (lite ? 520 : 400) + rc() ** 1.3 * (lite ? 560 : 500)
      for (let t = 0; t < 4 && prev.some(p => Math.abs(p - c) < 75); t += 1) c += 45 + rc() * 70
      if (c > R - 140) break
      cuts.push(n0(c))
      x = c
    }
    prev = cuts
    // bờ ngang chạy theo hướng dốc: nghiêng ngược độ dốc đồng mức + chút ngẫu nhiên
    const slant = cuts.map(c => {
      const sp = (top(c + 12) - top(c - 12)) / 24
      const k = clamp((rc() - 0.5) * 0.8 - 0.7 * sp, -0.55, 0.55)
      return n0(k * th(c))
    })
    const xs = [L, ...cuts, R]
    const xb = [L, ...cuts.map((c, i) => c + (slant[i] as number)), R]
    const g = lite ? 2 : Math.max(2, n0(1.5 + j * 0.35))
    for (let i = 0; i < xs.length - 1; i += 1) {
      const first = i === 0
      const last = i === xs.length - 2
      const a = i === 0 ? L : n0((xs[i] as number) + g / 2)
      const ab = i === 0 ? L : n0((xb[i] as number) + g / 2)
      const b = i === xs.length - 2 ? R : n0((xs[i + 1] as number) - g / 2)
      const bb = i === xs.length - 2 ? R : n0((xb[i + 1] as number) - g / 2)
      const n = Math.max(1, Math.ceil((b - a) / (lite || j < 3 ? 700 : 430)))
      let d: string
      if (first) {
        const hh = n0(bot(a)) - n0(top(a))
        // đầu hàng thuôn như mũi lá (đồng mức khuất sau mỏm), không bo tròn kiểu tấm ván
        d = `M${a} ${n0(bot(a))}c${-n0(0.3 * hh)} 0 ${-n0(1.1 * hh + 6)} ${-n0(0.8 * hh)} 0 ${-hh}`
      } else d = `M${a} ${n0(top(a))}`
      d += segs(top, a, b, n)
      if (last) {
        const hh = n0(bot(b)) - n0(top(b))
        d += `c${n0(1.1 * hh + 6)} ${n0(0.2 * hh)} ${n0(0.3 * hh)} ${hh} 0 ${hh}`
      } else d += `l${bb - b} ${n0(bot(bb)) - n0(top(b))}`
      d += segs(bot, last ? b : bb, first ? a : ab, n) + 'z'
      const r = rk()
      const k: Kind = kindOf(ctx, r, j)
      // thửa luôn nằm dưới mép khung (mọi khung cảnh/chuyển cảnh: y > 1112) thì bỏ
      if (Math.min(top(a), top(b), top((a + b) / 2)) < 1112) fields.push({ j, a, b, ab, bb, k, d: cz(d) })
      if (!last) cutPts.push([bb, n0(bot(bb)), j])
    }
    // đường mép trước của hàng (mặt trên của bờ đứng) — kéo dài vào hai đầu bo tròn
    // bờ dừng trước mũi thửa (bờ dày bo tròn ở đầu hàng trông như viên thuốc)
    const e0 = -n0(60 + (LGW[LG(j)] as number) * 2)
    const e1 = e0
    lips[LG(j)] += `M${L - e0} ${n0(bot(L - e0))}` + segs(bot, L - e0, R + e1, Math.max(1, Math.ceil((R - L) / (lite ? 600 : 380))))
    ends.push([L, n0(lerp(top(L), bot(L), 0.6)), j, -1], [R, n0(lerp(top(R), bot(R), 0.6)), j, 1])
  }
  const used = new Set<string>()
  /** Điểm trên mặt thửa: phần sâu f (0 mép sau … 1 mép trước, sát bờ). */
  const onF = (F: Field, x: number, f: number) => Y(x, dTop(F.j, x) + (RS[F.j] as number) * mod(F.j, x) * f)
  const fAt = (j: number, x: number) => fields.find(l => l.j === j && l.a + 16 <= x && l.b - 16 >= x)

  const pieces: Piece[] = []
  const spots: Spot[] = []
  const waterIds: string[] = []
  const cropIds: string[] = []
  const allIds: string[] = []
  let xcss = ''

  // ───────── Dải sương giữa núi xa và vai đồi (trên mặt đất): chân núi tan vào màu trời, vai đồi tách khỏi nền ─────────
  {
    let d = 'M5300 440'
    for (let x = 5300; x <= 7300; x += 100) d += `L${x} ${n0(ground(x) + 2)}`
    pieces.push({ layer: 3, x0: 5300, x1: 7300, prio: 5, svg: `<path fill="url(#rb-hzg)" opacity="${o2((night ? 0.3 : 0.26) + 0.2 * ctx.cur.fog)}" d="${d}V440z"/>` })
  }
  // ───────── Sườn cỏ bên phải (chỗ mắt nghỉ): sáng ở vai lồi → tối dần xuống hồ, bóng các bậc đổ lên sườn, vân cỏ mờ ─────────
  {
    let gt = ''
    if (!lite) {
      const rg = ctx.rng('rb-co-suon')
      for (let i = 0; i < 7; i += 1) {
        const x = 6860 + rg() * 400
        const y = ground(x) + 14 + rg() ** 1.6 * 420
        const k = 2 + (y - 700) / 90
        gt += cz(`M${n0(x)} ${n0(y)}l${n0(-k * 0.5)} ${n0(-k * 1.6)}m${n0(k * 0.5)} ${n0(k * 1.6)}l${n0(k * 0.4)} ${n0(-k * 1.9)}`)
      }
    }
    pieces.push({
      layer: 3,
      x0: 6760,
      x1: 7420,
      prio: 5,
      svg: `<ellipse fill="url(#rb-mg)" opacity="${night ? '.08' : '.2'}" cx="6950" cy="672" rx="230" ry="50"/><ellipse fill="url(#rb-cg)" cx="6990" cy="790" rx="190" ry="70"/><ellipse fill="url(#rb-cg)" cx="7190" cy="990" rx="270" ry="190"/>` + (gt ? `<path class="rb-gt" d="${gt}"/>` : ''),
    })
  }

  // ───────── Tuyết phủ sườn đồi (dưới ruộng, ngoài hai đầu hàng) ─────────
  if (snow) {
    let d = `M5400 ${n0(ground(5400))}`
    for (let x = 5500; x <= 7200; x += 100) d += `L${x} ${n0(ground(x) + 1)}`
    // Đáy mảng tuyết thu nhọn về hai đầu (sâu 0 ở mép, đầy dần trong 400 đơn vị, mép hơi gợn) — trước đây `V1200H5400z`
    // cắt mảng tuyết bằng hai mép đứng thẳng, lộ thành vạch sáng–tối dọc ở x=7200 trong cảnh tuyết.
    let b = d
    for (let x = 7200; x >= 5400; x -= 100) {
      const t = Math.min(smooth(5400, 5800, x), 1 - smooth(6800, 7200, x))
      b += `L${x} ${n0(ground(x) + 1 + t * (1200 - ground(x)) * (1.05 + 0.1 * Math.sin(x * 0.013)))}`
    }
    pieces.push({ layer: 3, x0: 5400, x1: 7200, prio: 6, svg: `<path class="s1" opacity=".55" d="${b}z"/><path class="rb-sn" stroke-width="5" d="${d}"/>` })
  }

  // ───────── Bờ đứng (dưới thửa): đất/cỏ tối, nửa dưới khuất, bờ đá xếp ở các hàng gần ─────────
  {
    let s = ''
    for (let gI = 0; gI < 4; gI += 1) {
      const w = LGW[gI] as number
      s += `<use href="#rb-L${gI}" class="rb-rs" stroke-width="${w}" y="${n1(w / 2 - 1)}"/>`
      if (!lite && gI) s += `<use href="#rb-L${gI}" class="rb-rd" stroke-width="${n1(w * 0.42)}" y="${n1(w * 0.8)}"/><use href="#rb-L${gI}" class="rb-rv" stroke-width="${n1(w * 0.5)}" y="${n1(w * 0.3)}"/>`
    }
    if (!lite)
      s +=
        `<use href="#rb-L2" class="rb-st" stroke-width="5" y="6"/>` +
        `<use href="#rb-L3" class="rb-st" stroke-width="7" y="6"/><use href="#rb-L3" class="rb-st rb-st2" stroke-width="7" y="14"/>`
    // giữa khung (sau cột chat) bờ dịu hơn hai bên ~40%: mặt nạ dải ngang
    pieces.push({ layer: 3, x0: 5380, x1: 7300, prio: 9, svg: `<g mask="url(#rb-cm)">${s}</g>` })
  }

  // ───────── Thửa ruộng theo khúc x: gom theo loại × bậc → 1 nhóm (tô) + lớp phủ (vân/mạ/bóng) dùng lại hình qua <use> ─────────
  for (let c = 0; c < CB.length - 1; c += 1) {
    const a = CB[c] as number
    const b = CB[c + 1] as number
    const mine = fields.filter(l => (l.a + l.b) / 2 >= a && (l.a + l.b) / 2 < b)
    let px0 = a
    let px1 = b
    for (const l of mine) {
      px0 = Math.min(px0, l.a - 40)
      px1 = Math.max(px1, l.b + 40)
    }
    let svg = ''
    for (const k of KINDS)
      for (let t = 0; t < 3; t += 1) {
        const ls = mine.filter(l => l.k === k && TI(l.j) === t)
        if (!ls.length) continue
        const K = k.toUpperCase()
        const id = `rb-${c}${k}${t}`
        used.add(K + t)
        svg += `<g class="rb-${K}${t}"><path id="${id}" d="${ls.map(l => l.d).join('')}"/></g>`
        if (isWater(k)) waterIds.push(id)
        else if (isCrop(k) && t) cropIds.push(id)
        else allIds.push(id)
      }
    pieces.push({ layer: 3, x0: px0, x1: px1, prio: c === 1 ? 9 : 8, svg })
  }

  // ───────── Ba sắc độ trên mặt thửa (theo mép bờ, không theo khung bao): mép sau tối (bờ trên soi/che bóng) → dải sáng
  // (trời soi gần chân trời / mặt lúa đón nắng) → 1/3 trước khuất. Đêm: phủ mực cho dịu, bớt bão hoà. ─────────
  // mặt nạ chung: nhóm nước (#rb-aw) và nhóm lúa (#rb-ay) có id riêng để mặt nạ mặt nước / mép bông lúa dùng lại, khỏi liệt kê lần nữa
  const uses = (ids: string[]) => ids.map(id => `<use href="#${id}"/>`).join('')
  if (allIds.length + waterIds.length + cropIds.length) {
    const TB = [[5.5, 4], [11, 7], [16, 10], [24, 14]]
    const LB = [[9.5, 3.5], [18, 6], [26.5, 9], [38, 13]]
    const BB = [[-2, 3.5], [-5, 9], [-8, 15], [-12, 22]]
    let s = `<mask id="rb-am"><g class="w3"><g id="rb-aw">${uses(waterIds)}</g><g id="rb-ay">${uses(cropIds)}</g>${uses(allIds)}</g></mask><g mask="url(#rb-am)"><g mask="url(#rb-cm)">`
    for (let gI = 0; gI < 4; gI += 1) {
      const [ty, tw] = TB[gI] as number[]
      const [ly, lw] = LB[gI] as number[]
      const [by, bw] = BB[gI] as number[]
      s += `<use href="#rb-L${gI}" class="rb-b1" stroke-width="${tw}" y="${ty}"/>` + (gI && !lite ? `<use href="#rb-L${gI}" class="rb-b2" stroke-width="${lw}" y="${ly}"/>` : '') + (gI ? `<use href="#rb-L${gI}" class="rb-b3" stroke-width="${bw}" y="${by}"/>` : '')
    }
    s += '</g>'
    if (night) s += `<rect class="k1" opacity=".12" x="5300" y="560" width="2100" height="760"/>`
    // chiều sâu: bậc xa ngả màu sương (nhạt, ngả trời), bậc gần đậm & ấm hơn; hai góc dưới tối dần (khung) — giữa khung yên
    s += `<rect fill="url(#rb-dg)" x="5380" y="560" width="1840" height="640"/><rect fill="url(#rb-vg)" x="5380" y="560" width="1840" height="640"/>`
    // hơi sương phủ các hàng xa (phối cảnh khí quyển)
    s += `<use href="#rb-L0" class="rb-hz" stroke-width="22" y="-4"/></g>`
    pieces.push({ layer: 3, x0: 5380, x1: 7340, prio: 8, svg: s })
  }

  // ───────── Mép bờ (trên thửa): viền nắng loang có tâm, rêu đọng, mép bông lúa rủ qua bờ, tuyết/sương muối, hoa dại ─────────
  {
    const RW = [1, 1.4, 1.8, 2.4]
    let s = ''
    for (let gI = 0; gI < 4; gI += 1) s += `<use href="#rb-L${gI}" class="rb-rim" stroke-width="${RW[gI]}" y="${n1((RW[gI] as number) / 2)}"/>`
    if (!lite) {
      const MW = [0, 3.5, 6, 9]
      for (let gI = 1; gI < 4; gI += 1) s += `<use href="#rb-L${gI}" class="rb-mo" stroke-width="${MW[gI]}" y="1"/>`
      s += `<use href="#rb-L2" class="rb-mo rb-mo2" stroke-width="4"/><use href="#rb-L3" class="rb-mo rb-mo2" stroke-width="6" y="2"/>`
      // rêu chảy dọc mặt bờ ở khe tràn nước (hàng gần)
      let dr = ''
      for (const [x, y, j] of cutPts) if (j >= 6 && x > 5640) dr += `M${x} ${y + 2}v${n0((RR[j] as number) * 0.85)}`
      if (dr) s += `<path class="rb-dd" d="${dr}"/>`
      if (ss === 'xuan' || ss === 'ha') s += `<use href="#rb-L2" class="rb-fw" stroke-width="3"/><use href="#rb-L3" class="rb-fw rb-fw2" stroke-width="4" y="1"/>`
      if (cropIds.length) {
        const FW = [0, 3, 4.6, 7]
        const FY = [0, 1.5, 2.5, 3.5]
        s += `<mask id="rb-fm"><use href="#rb-ay" class="w3" y="7"/></mask><g mask="url(#rb-fm)">`
        for (let gI = 1; gI < 4; gI += 1) {
          // bông lúa rủ qua mép bờ: chuỗi chấm tròn sát nhau (đường răng cưa hữu cơ) + bóng đổ ngay dưới
          const w = FW[gI] as number
          s += `<use href="#rb-L${gI}" class="rb-fr rb-fr2" stroke-width="${n1(w * 0.8)}" y="${n1((FY[gI] as number) + w * 0.45)}"/><use href="#rb-L${gI}" class="rb-fr rb-f${gI}" y="${FY[gI]}"/>`
        }
        s += `</g>`
      }
    }
    if (frost) for (let gI = 0; gI < 4; gI += 1) s += `<use href="#rb-L${gI}" class="rb-sn" stroke-width="${snow ? 2 + gI * 1.4 : 1 + gI * 0.6}" y="${snow ? 0 : 0.5}"/>`
    pieces.push({ layer: 3, x0: 5380, x1: 7300, prio: 7, svg: `<g mask="url(#rb-cm)">${s}</g>` })
  }

  // ───────── Phối cảnh khí quyển: các bậc xa (trên, gần sống đồi) chìm trong sương — bờ & vân dịu đi, bậc gần giữ nguyên ─────────
  {
    let d = `M5250 ${n0(ground(5250) + 3)}`
    for (let x = 5400; x <= 7250; x += 150) d += `L${x} ${n0(ground(x) + 3)}`
    pieces.push({ layer: 3, x0: 5250, x1: 7250, prio: 6, svg: `<path fill="url(#rb-hzg)" opacity="${o2((night ? 0.55 : 0.62) + 0.2 * ctx.cur.fog)}" d="${d}V930H5250z"/>` })
  }

  // ───────── Mặt nước sống: mây soi trôi chậm, chuỗi đốm nắng dưới mặt trời, ánh trăng ban đêm ─────────
  {
    let s = ''
    let gl = ''
    const clouds = !lite && day > 0.35 && (cl === 'it' || cl === 'vua' || cl === 'nhieu')
    const column = !lite && sunK > 0.3
    if (waterIds.length) {
      // vệt trời soi nằm ngang, mềm (mỗi vệt một bậc, dài ngắn không đều; xa mảnh, gần dày) — tĩnh
      const rv = ctx.rng('rb-soi-troi')
      let sh = ''
      for (let i = 0; i < (lite ? 3 : 5); i += 1) {
        const j = 1 + Math.floor(rv() * 9)
        const x = n0(5650 + rv() * 1350)
        sh += `<ellipse cx="${x}" cy="${n0(Y(x, dTop(j, x) + (RS[j] as number) * 0.3))}" rx="${n0(90 + rv() * 220)}" ry="${n1(1.4 + j * 0.45)}"/>`
      }
      let m = `<g fill="url(#rb-crg)" opacity="${night ? '.3' : '.75'}">${sh}</g>`
      if (clouds) {
        const rr = ctx.rng('rb-may-soi')
        let cr = ''
        for (let i = 0; i < 3; i += 1) {
          const x = n0(5700 + rr() * 1400)
          const j = 2 + Math.floor(rr() * 7)
          cr += `<ellipse cx="${x}" cy="${n0(Y(x, dTop(j, x)) + 4)}" rx="${n0(110 + rr() * 140)}" ry="${n0(6 + j * 2.2)}"/>`
        }
        m += `<g class="rb-cr" opacity="${o2(cl === 'it' ? 0.6 : cl === 'vua' ? 0.8 : 0.5)}" ${ph(260, 'rb-cr')}>${cr}</g>`
      }
      // cột nắng: chỉ sáng trên mặt nước (che bằng hình các thửa nước)
      if (column) m += `<ellipse class="rb-sc" cx="${n0(xg)}" cy="${n0(Y(xg, dTop(4, xg)))}" rx="${n0(60 + 50 * lowSun)}" ry="260" opacity="${o2(Math.min(0.75, sunK * (0.7 + 0.3 * lowSun)))}"/>`
      s += `<mask id="rb-wm"><use href="#rb-aw" class="w3"/></mask><g mask="url(#rb-wm)">${m}</g>`
    }
    // Lấp lánh: mỗi bậc nước gần vệt mặt trời có 1–2 đường sáng nằm ngang ở 1/3 trên mặt thửa, nét đứt dài ngắn không đều
    // (= chuỗi đốm nắng li ti). Hai lớp nét đứt nhấp nháy lệch pha → mặt nước lăn tăn. Bậc gần cao độ mặt trời: dày và sáng nhất.
    // Vành nóng: mép trên thửa sáng rực, chạy nghiêng theo đúng mép bờ.
    const glints = (xc: number, jc: number, k: number) => {
      const A = ['', '', '']
      const B = ['', '', '']
      let rim = ''
      let bloom = ''
      for (const F of fields) {
        if (!isWater(F.k)) continue
        const e = clamp(1 - Math.abs(F.j - jc) / 8, 0, 1) * k
        if (e < 0.1) continue
        const lv = e > 0.5 ? 2 : e > 0.25 ? 1 : 0
        const x0 = xc + Math.sin(F.j * 2.3) * 16
        const hw = (40 + 5 * F.j) * (0.8 + 0.4 * Math.abs(Math.sin(F.j * 7.1))) * (0.55 + 0.5 * e)
        const seg = (f: number, kk: number) => {
          const xa = n0(Math.max(F.a + 18, x0 - hw * kk))
          const xb = n0(Math.min(F.b - 18, x0 + hw * kk))
          return xb - xa > 12 ? `M${xa} ${n0(onF(F, xa, f))}L${xb} ${n0(onF(F, xb, f))}` : ''
        }
        A[lv] += seg(0.22, 1)
        if (lv) B[lv] += seg(0.4, 0.75)
        if (lv) rim += seg(0.015, 0.6)
        // quầng ấm mờ dưới chuỗi đốm (mặt nước hắt nắng), dày ~1/4 mặt thửa
        const bx = n0(x0)
        const bw = n0(hw * 0.9)
        const bh = Math.max(2, n0((onF(F, bx, 1) - onF(F, bx, 0)) * 0.14))
        if (lv && bx - bw > F.a + 16 && bx + bw < F.b - 16) bloom += `M${bx - bw} ${n0(onF(F, bx, 0.28))}l${bw} ${-bh}l${bw} ${bh}l${-bw} ${bh}z`
      }
      let a = ''
      let b = ''
      for (let lv = 0; lv < 3; lv += 1) {
        if (A[lv]) a += `<path class="rb-g${lv}" d="${A[lv]}"/>`
        if (B[lv]) b += `<path class="rb-g${lv} rb-gb" d="${B[lv]}"/>`
      }
      return (bloom ? `<path class="rb-gz" d="${cz(bloom)}"/>` : '') + (a || rim ? `<g class="rb-gw" ${ph(2.6, 'rb-gw')}>${rim ? `<path class="rb-gr" d="${rim}"/>` : ''}${a}</g>` : '') + (b ? `<g class="rb-gw rb-gv" ${ph(2.6, 'rb-gw')}>${b}</g>` : '')
    }
    if (sunK > 0.2) {
      const jc = lerp(1.5, 9, smooth(0.04, 0.75, sunA))
      const g = glints(xg, jc, sunK * (0.75 + 0.25 * lowSun))
      s += g
    }
    if (moonK > 0) gl += glints(xm, 3.5, moonK * 0.8)
    // prio 7: đốm nắng/trăng trên nước là điểm sáng chính của cảnh, không để rơi trước đồ trang trí
    if (s || gl) pieces.push({ layer: 3, x0: 5600, x1: 7300, prio: 7, svg: s, glow: gl ? `<g class="rb-mn">${gl}</g>` : undefined })
  }

  // ───────── Bóng mây trôi trên ruộng (ngày có mây, không mưa) ─────────
  if (!lite && day > 0.5 && pr === 'khong' && (cl === 'it' || cl === 'vua' || cl === 'nhieu')) {
    const dur = n0(170 - 90 * wind)
    let s = ''
    for (let i = 0; i < (cl === 'it' ? 1 : 2); i += 1)
      s += `<ellipse class="rb-cs" cx="4900" cy="${930 + i * 60}" rx="${380 - i * 90}" ry="${150 - i * 30}" style="animation-duration:${dur}s;animation-delay:${ctx.ph(dur, `rb-cs${i}`)}"/>`
    pieces.push({ layer: 3, x0: RX0, x1: RX1 + 60, prio: 3, svg: s })
  }

  // ───────── Sóng lúa theo gió (vạt sáng lướt trên lúa) ─────────
  if (!lite && wind > 0.08 && cropIds.length) {
    const gd = n0(70 - 40 * wind)
    let g = ''
    for (let i = 0; i < 2; i += 1)
      g += `<ellipse class="rb-gu" cx="5000" cy="${n0(Y(6300, dTop(6 + i * 3, 6300)) + 14)}" rx="${240 + i * 90}" ry="${36 + i * 30}" style="animation-duration:${gd + i * 11}s;animation-delay:${ctx.ph(gd + i * 11, `rb-gu${i}`)}"/>`
    pieces.push({ layer: 3, x0: RX0, x1: RX1 + 100, prio: 3, svg: `<g mask="url(#rb-fm)">${g}</g>` })
  }

  // ───────── Nắng sớm/chiều loang quanh cột nắng ─────────
  if (sunK > 0.3 && lowSun > 0.3) {
    const cy = n0(Y(xg, dTop(5, xg)))
    pieces.push({ layer: 3, x0: n0(xg - 600), x1: n0(xg + 600), prio: 4, svg: `<ellipse class="rb-sw0" cx="${n0(xg)}" cy="${cy}" rx="600" ry="240" opacity="${o2(sunK * lowSun)}"/>` })
  }

  /** Bóng đổ dài theo hướng ngược mặt trời (nắng thấp). */
  const castShadow = (x: number, y: number, t: number, hgt: number) => {
    if (sunK < 0.25 || sunA > 0.62) return ''
    const dir = x - 5630 < sunX ? -1 : 1
    const L = n0(hgt * clamp(0.4 / Math.max(sunA, 0.06), 1.2, 3.4))
    const t1 = n0(t * 2.2)
    // bóng nằm trên mặt đất/ruộng: đầu bóng hạ theo độ dốc sườn
    const dg = n0(Math.max(0, ground(x + dir * L) - ground(x)) * 0.9 + L * 0.03)
    // đầu xa bo tròn (bóng mái), gốc hẹp (bóng chân cột) → không thành dải chữ nhật
    return `<path class="k1" opacity="${o2(0.26 * sunK)}" d="M${n0(x)} ${n0(y - t / 2)}l${dir * L} ${dg + n0(t / 2 - t1 / 2)}q${n0(dir * t1 * 0.7)} ${n0(t1 / 2)} 0 ${t1}l${-dir * L} ${-dg + n0(t / 2 - t1 / 2)}q${n0(-dir * t * 0.7)} ${n0(-t / 2)} 0 ${-t}z"/>`
  }
  const lightR = sunX > 800 // nắng chiều từ phải

  // ───────── Bụi cây nhỏ ở đầu hàng (phá nhịp đều, che chỗ bờ uốn khuất) ─────────
  if (!lite) {
    let s = ''
    const rb = ctx.rng('rb-bui')
    for (const [x, y, j, dir] of ends) {
      if (j < 2 || j > 9 || rb() > 0.42) continue
      s += `<use href="#rb-bu" transform="matrix(${n1(0.35 + j * 0.09)} 0 0 ${n1(0.35 + j * 0.09)} ${x + dir * n0(4 + j)} ${y + 3})"/>`
    }
    if (s) pieces.push({ layer: 3, x0: 5400, x1: 7300, prio: 3, svg: s })
  }

  // ───────── Luỹ tre trên vai đồi (sau chòi) ─────────
  {
    const bx = 6858
    const by = n0(ground(bx) + 3)
    const culms = 'M0 0c-2-60-8-130-34-196M6 0c0-70-2-140-18-214M-6 0c-6-50-20-110-56-160M10 0c6-60 14-120 4-182M-2 0c-10-40-30-80-72-110'
    const tops: [number, number, string][] = [
      [-34, -196, 'l2'], [-12, -214, 'l3'], [-56, -160, 'l2'], [4, -182, 'l3'], [-72, -110, 'l2'], [-24, -150, 'l3'], [-4, -120, 'l4'], [-40, -124, 'l3'], [-8, -168, 'l2'],
    ]
    const nLeaf = lite ? 5 : ss === 'dong' ? 6 : 8
    pieces.push({
      layer: 3,
      x0: bx - 140,
      x1: bx + 60,
      prio: 6,
      svg:
        castShadow(bx - 20, by + 1, 6, 150) +
        `<g transform="translate(${bx} ${by})"><g class="sw4"><g class="rb-bb"><path id="rb-cu" d="${culms}"/></g><use href="#rb-cu" class="rb-bn"/>` +
        tops
          .slice(0, nLeaf)
          .map(([x, y, k], i) => {
            const c = snow && i % 3 !== 2 ? 's1' : k
            return i % 2 ? `<use href="#rb-lf" x="${-x}" y="${y}" class="${c}" transform="scale(-1 1)"/>` : `<use href="#rb-lf" x="${x}" y="${y}" class="${c}"/>`
          })
          .join('') +
        `</g><path class="ao" d="M-30 2c20-6 50-6 60 0-20 4-40 4-60 0z"/></g>`,
    })
  }

  // ───────── Chòi canh sàn tre trên vai đồi — TIÊU ĐIỂM (đường 2/3 khung) ─────────
  {
    const hx = 6700
    const hy = n0(ground(hx) + 3)
    const K = 1.32
    const lamp = day < 0.6 || (pr === 'mua-to' && day < 0.85)
    const cook = (day < 0.8 && day > 0.2) || (ss === 'dong' && day < 0.9)
    // mái rơm: diềm so le
    let eave = ''
    for (let x = 62, i = 0; x > -52; i += 1) {
      const dx = 6 + ((i * 7) % 3)
      eave += `l${-dx} ${i % 2 ? -3 : 3}`
      x -= dx
    }
    const hlSh = `<path class="hl" d="M3-101L-54-60l5 3 4-2 5 3 5-2L3-94z"/><path class="sh" d="M3-101l59 41-5 3-4-2-5 3-5-2-4 3-5-2-5 3L6-64z"/>`
    let s =
      castShadow(hx, hy + 1, 10, 130 * K) +
      `<g transform="translate(${hx} ${hy}) scale(${K})"><path class="ao" d="M-52 2c26 6 86 6 104 0-18-6-86-6-104 0z"/>` +
      `<path class="b1" d="M-20-3h3v-40h-3zM30-3h3v-40h-3z"/>${F_('<path class="z1" opacity=".5" d="M-28-6L28-36M-28-36L28-6"/>')}` +
      `<path class="b2" d="M-32 2h4v-45h-4zM26 2h4v-45h-4zM-38-43v-20h3v20zM37-43v-20h3v20z"/>` +
      `<path class="k2" d="M-36-63h74v10h-74z"/><path class="b3" d="M-36-53h74v10h-74zM-42-43h86l-3 5h-80z"/>` +
      `<path class="w2" d="M-54-60L3-101l59 41${eave}z"/><path class="w1" opacity=".55" d="M-30-80L3-101l33 21q-17 4-33 1-17 3-33-2z"/>` +
      (lightR ? `<g transform="matrix(-1 0 0 1 8 0)">${hlSh}</g>` : hlSh) +
      `<path class="b1" d="M-4-104h14v4h-14z"/><path class="sh" d="M-36-60h74v4h-74z"/>` +

      (snow || frost ? `<path class="s1" opacity="${snow ? '.95' : '.6'}" d="M3-101L-46-66q24-4 49-31 26 27 50 31z"/>` : '') +
      // thang tre có rêu ở chân · áo tơi treo cột · chum nước · nồi trên sàn · đèn bão
      `<path class="z1" d="M-56 2L-43-43M-47 4L-34-41M-54-6h9M-51-15h9M-49-24h9M-46-33h9"/>` +
      F_(
        `<path class="d2" d="M33-37l-7 20 3-1 2 3 2-2 3 3 2-3 3 1-6-21z"/><path class="r2" d="M41 1c-5-3-5-11-1-14v-3h8v3c4 3 4 11-1 14z"/><path class="hl" d="M41-12c-2 3-2 8 0 10-3-3-3-7 0-10z"/>` +
          `<path class="k2" d="M41-16h6v1.5h-6zM8-43c0-5 3-7 7-7s7 2 7 7zM13-51h4v1h-4z"/><path class="m2" d="M-18-78c6-5 15-5 20 0-6 4-14 4-20 0zM14-73c5-3 10-2 13 1-4 2-9 2-13-1zM-46-62c4-3 9-3 12 0-4 2-8 2-12 0zM-58 2c2-4 7-4 9-1zM-49 4c2-3 6-3 7 0z"/>` +
          `<path class="z2" opacity=".45" d="M-36-48h74M-26-53v10M-14-53v10M-2-53v10M10-53v10M22-53v10M32-53v10M-30-80q33 5 66 0M-44-68q47 6 94 0M31-34l-3 14M35-34v15M-29-63v5"/>`,
      ) +
      `<path class="x2" d="M-32-58h6v9h-6z"/><path class="${lamp ? 'e1' : 's3'}" d="M-31-56h4v5h-4z"/>` +
      F_(`<g class="rb-fp" ${ph(6.2, 'rb-chuong')}><path class="b3" d="M16-58h2v5h-2zM19-56h2v6h-2zM22-59h2v5h-2z"/></g>`) +
      `</g>`
    let glow = ''
    if (lamp) {
      glow =
        `<circle cx="${n0(hx - 29 * K)}" cy="${n0(hy - 53 * K)}" r="58" fill="url(#gw)"/><path class="e2" opacity=".5" d="M${n0(hx - 36 * K)} ${n0(hy - 63 * K)}h${n0(74 * K)}v${n0(10 * K)}h${-n0(74 * K)}z"/>` +
        `<path class="e1 fl" d="M${n0(hx - 29 * K)} ${n0(hy - 55 * K)}q3 3 0 7-3-4 0-7z"/>`
      // ánh đèn soi xuống các bậc dưới chòi: mỗi bậc một vệt ngang, xuống thấp thì dài ra & nhạt dần
      for (let j = 1; j < (lite ? 4 : 7); j += 1) {
        const x = hx - 40 - j * 6
        const F = fAt(j, x)
        if (F) glow += `<ellipse cx="${x}" cy="${n0(onF(F, x, 0.35))}" rx="${30 + j * 12}" ry="${n1(3 + j * 0.8)}" fill="url(#gw)" opacity="${o2((isWater(F.k) ? 1 : 0.8) * (1 - j * 0.1))}"/>`
      }
    }
    if (cook && !lite) {
      glow += `<circle cx="${n0(hx + 15 * K)}" cy="${n0(hy - 45 * K)}" r="12" fill="url(#gw)"/>`
      // khói bếp: một dải mỏng mềm bay theo gió, tan dần
      const kx = n0(hx + 15 * K)
      const ky = n0(hy - 64 * K)
      const wd = n0(60 + 160 * wind)
      s += `<path class="rb-sk" d="M${kx} ${ky}c-6-30 10-50 ${n0(wd * 0.3)}-74s${n0(wd * 0.5)}-30 ${wd}-56"/><path class="rb-sk rb-sk2" d="M${kx} ${ky}c-5-22 8-36 ${n0(wd * 0.22)}-52"/>`
    }
    pieces.push({ layer: 3, x0: hx - 90, x1: hx + 90, prio: 9, svg: s, glow: glow || undefined })
    spots.push({ kind: 'cat-shelter', layer: 3, x: hx - 2, y: hy - 1, s: 0.8 })
    spots.push({ kind: 'cat', layer: 3, x: hx + 100, y: n0(ground(hx + 100) + 2), s: 0.8 })
    spots.push({ kind: 'perch', layer: 3, x: hx + 4, y: n0(hy - 103 * K), s: 0.75 })
    if (cook) spots.push({ kind: 'smoke', layer: 3, x: n0(hx + 15 * K), y: n0(hy - 64 * K), s: 0.5 })
  }

  // ───────── Đống rơm ủ khói (thu, sau gặt) · bó lúa phơi theo đường gặt ─────────
  if (ss === 'thu') {
    let s = ''
    let n = 0
    let stacks = 0
    const rs = ctx.rng('rb-bo-lua')
    for (const F of fields) {
      if (F.k !== 'h' || F.j < 4) continue
      const u = U(F.j)
      if (F.j >= 5 && stacks < (lite ? 1 : 2) && F.b - F.a > 180) {
        const x = n0(F.b - 40 - rs() * 40)
        s += `<use href="#rb-ss" transform="matrix(${n1(u * 1.15)} 0 0 ${n1(u * 1.15)} ${x} ${n0(onF(F, x, 0.7))})"/>`
        stacks += 1
      }
      // cụm 2–5 bó dựng chụm dọc đường gặt
      const groups = F.b - F.a > 260 ? 2 : 1
      for (let gI = 0; gI < groups && n < (lite ? 6 : 9); gI += 1) {
        let x = lerp(F.a + 30, F.b - 90, (gI + 0.2 + rs() * 0.6) / groups)
        // giữa khung (sau cột chat) để trống: bó lúa chỉ đứng ở hai bên
        if (x > 6120 && x < 6740) continue
        const f = 0.35 + rs() * 0.35
        const cnt = 2 + Math.floor(rs() * 4)
        for (let i = 0; i < cnt && n < (lite ? 6 : 9); i += 1, n += 1) {
          const lean = rs() < 0.5 ? -1 : 1
          const yy = n0(onF(F, x, f + (rs() - 0.5) * 0.12))
          s += `<use href="#rb-sv" transform="matrix(${n1(lean * u * 1.3)} 0 0 ${n1(u * (1.2 + rs() * 0.25))} ${n0(x)} ${yy})"/>`
          x += (11 + rs() * 8) * u
        }
      }
    }
    if (s) pieces.push({ layer: 3, x0: 5450, x1: 7250, prio: 4, svg: s })
    if (ctx.seasonT > 0.35) {
      const fx = 6560
      const F = fAt(4, fx) ?? fAt(5, fx)
      if (F) {
        const fy = n0(onF(F, fx, 0.7))
        pieces.push({
          layer: 3,
          x0: fx - 20,
          x1: fx + 20,
          prio: 4,
          svg: `<path class="ao" d="M${fx - 15} ${fy}h30c-6 2-24 2-30 0z"/><path class="l2" d="M${fx - 13} ${fy}c3-8 9-11 13-11s10 4 13 11z"/><path class="l3" d="M${fx} ${fy - 11}c6 1 10 5 13 11h-9z"/>`,
          glow: day < 0.7 ? `<circle cx="${fx}" cy="${fy - 3}" r="13" fill="url(#gw)"/><path class="e1 fl" d="M${fx - 3} ${fy - 2}h6l-3-3z"/>` : undefined,
        })
        spots.push({ kind: 'smoke', layer: 3, x: fx, y: fy - 10, s: 0.7 })
      }
    }
  }

  // ───────── Sương nằm trong thung (đông, sáng sớm, trời sương) ─────────
  if (!lite && (ss === 'dong' || ctx.cur.fog > 0.3 || (h > 4.5 && h < 8.5 && ss === 'xuan'))) {
    const op = o2(0.35 + ctx.cur.fog * 0.6 + (ss === 'dong' ? 0.2 : 0))
    let s = ''
    for (const [x, j, rx] of [
      [6100, 5, 360],
      [6500, 8, 440],
    ] as const)
      s += `<ellipse class="rb-mi" cx="${x}" cy="${n0(Y(x, dTop(j, x)))}" rx="${rx}" ry="${n0(10 + j * 2.4)}" opacity="${op}" ${ph(94, `rb-mi${j}`)}/>`
    pieces.push({ layer: 3, x0: 5600, x1: 7100, prio: 3, svg: s })
  }

  // ───────── Bù nhìn rơm đội nón lá (tay áo bay theo gió) + dây lon xua chim ─────────
  {
    const bj = 8
    const bx = 6112
    const F = fAt(bj, bx) ?? fAt(bj, bx + 60)
    const by = n0(F ? onF(F, bx, 0.62) : Y(bx, dTop(bj, bx) + 30))
    const k = n2(0.68 * U(bj))
    const crop = F && (F.k === 'r' || F.k === 'q' || F.k === 'y' || F.k === 'g')
    let s = castShadow(bx, by + 1, 3, 55)
    // thân + 2 tay áo bay (lớp bọc động ngoài <use>, thư viện tĩnh) + rơm/nón — đúng thứ tự vẽ cũ; bóng nước dùng lại y hệt
    const scare = `<use href="#rb-bn"/><g class="rb-fp" ${ph(6.2, 'rb-tay1')}><use href="#rb-t1"/></g><g class="rb-fp" ${ph(6.2, 'rb-tay2')}><use href="#rb-t2"/></g><use href="#rb-bm"/>`
    if (F && isWater(F.k) && !lite && !raining) s += `<g mask="url(#rb-am)" opacity=".25"><g transform="matrix(${k} 0 0 ${n2(-k * 0.45)} ${bx} ${by + 2})">${scare}</g></g>`
    s +=
      `<ellipse class="ao" cx="${bx + 2}" cy="${by + 1}" rx="${n0(16 * k)}" ry="3"/><g transform="translate(${bx} ${by}) scale(${k})" opacity=".92">${scare}` +
      (lite ? '' : `<path class="z2" d="M28-53q32 10 66 5M46-49v4M62-47v4M78-47v4"/><path class="b2" d="M93-50v42h2v-42z"/><path class="x2" d="M44-45h4v6h-4zM60-43h4v6h-4zM76-43h4v6h-4z"/>`) +
      (crop ? `<g class="sw1"><use href="#rb-cl" x="-6" y="2"/><use href="#rb-cl" x="9" y="3"/></g>` : '') +
      `</g>`
    pieces.push({ layer: 3, x0: bx - 80, x1: bx + 110, prio: 6, svg: s })
    spots.push({ kind: 'perch', layer: 3, x: n0(bx + 24 * k), y: n0(by - 57 * k), s: n1(1.1 * U(bj)) })
    spots.push({ kind: 'perch', layer: 3, x: n0(bx + 94 * k), y: n0(by - 51 * k), s: n1(1.1 * U(bj)) })
  }

  // ───────── Cò trắng lội ruộng (ngày) — cỡ theo hàng ─────────
  if (day > 0.25) {
    let s = ''
    for (const [x, j, peck] of [
      [6905, 5, true],
      [6950, 5, false],
      [6990, 3, false],
      [5960, 9, true],
    ] as const) {
      const F = fAt(j, x)
      if (!F) continue
      const wet = isWater(F.k)
      const y = n0(onF(F, x, wet ? 0.6 : 0.95))
      const k = n2(0.9 * U(j))
      const u = `<use href="#rb-eg"/>`
      if (wet && !lite && j > 5) s += `<use href="#rb-eg" transform="matrix(${k} 0 0 ${n2(-k * 0.6)} ${x} ${y + 1})" opacity=".25"/>`
      s += peck ? `<g transform="translate(${x} ${y}) scale(${k})"><g class="rb-pk" ${ph(13, `rb-co${x}`)}>${u}</g></g>` : `<use href="#rb-eg" transform="matrix(${k} 0 0 ${k} ${x} ${y})"/>`
    }
    pieces.push({ layer: 3, x0: 5900, x1: 7010, prio: 5, svg: s })
  }
  spots.push({ kind: 'perch', layer: 3, x: 5900, y: n0(Y(5900, dTop(8, 5900))), s: n1(1.1 * U(8)) })
  {
    const F = fAt(7, 6780)
    if (F) spots.push({ kind: 'perch', layer: 3, x: 6780, y: n0(onF(F, 6780, 1)), s: n1(1.1 * U(7)) })
  }

  // ───────── Mưa: gợn trên mặt nước + nước tràn qua khe bờ ─────────
  if (!lite && (raining || ctx.wet > 0.3)) {
    const rr = ctx.rng('rb-mua')
    let rip = ''
    let tr = ''
    const pool = fields.filter(l => isWater(l.k) && l.j >= 6 && l.b > 5900 && l.a < 7000)
    for (let i = 0; i < (raining ? Math.min(2, pool.length) : 0); i += 1) {
      const F = pool[Math.floor(rr() * pool.length)] as Field
      const x = lerp(F.a + 20, F.b - 20, rr())
      rip += `<ellipse class="rip rb-rp" cx="${n0(x)}" cy="${n0(onF(F, x, 0.5))}" rx="${n0(4 + F.j * 0.8)}" ry="${n0(1 + F.j * 0.2)}" ${ph(3.4, `rb-rp${i}`)}/>`
    }
    let nt = 0
    for (const [x, y, j] of cutPts) {
      if (j < 5 || j > 9 || x < 5900 || x > 7000 || nt >= 6) continue
      nt += 1
      tr += `M${x} ${y}v${n0((RR[j] as number) + 3)}`
    }
    // gợn chỉ hiện trong các đoạn đang mưa của cửa sổ (bật/tắt theo dòng thời tiết)
    // cả cửa sổ đều mưa → khỏi bật/tắt (tránh keyframes hằng)
    const mixed = ctx.weather.some(w => !rainy(w.precip))
    if (rip && mixed) xcss += `@keyframes rb-rn{${ctx.weather.map(w => `${((w.t0 / ctx.span) * 100).toFixed(1)}%,${Math.max(0, (w.t1 / ctx.span) * 100 - 0.2).toFixed(1)}%{opacity:${rainy(w.precip) ? 1 : 0}}`).join('')}}`
    pieces.push({
      layer: 3,
      x0: 5880,
      x1: 7020,
      prio: 4,
      svg:
        (tr ? `<path class="rb-tr" opacity="${o2(0.3 + ctx.wet * 0.5)}" d="${cz(tr)}"/>` : '') +
        (rip ? (mixed ? `<g style="animation:rb-rn ${ctx.span}s linear forwards;animation-delay:calc(var(--t)*-1s)">${rip}</g>` : rip) : ''),
    })
  }

  // ───────── Đàn cò bay về tổ lúc rạng đông/chiều tà (lớp giữa) ─────────
  if (!lite && ((h > 5.3 && h < 7.2) || (h > 16.3 && h < 18.7)) && pr === 'khong' && cl !== 'u-am') {
    let s = ''
    for (const [x, y] of [
      [0, 0],
      [-16, 7],
      [-30, -5],
      [-46, 9],
    ] as const)
      s += `<use href="#rb-ef" x="${2700 + x}" y="${470 + y}"/><g class="rb-wn"><use href="#rb-ew" x="${2700 + x}" y="${470 + y}"/></g>`
    pieces.push({ layer: 2, x0: 2620, x1: 3660, prio: 2, svg: `<g class="rb-fy" ${ph(150, 'rb-dan-co')}>${s}</g>` })
  }

  // ───────── Tiền cảnh (lớp 4): bụi lúa/cỏ lớn ở hai góc dưới, lắc gió ─────────
  if (!lite) {
    const fg = (x: number, y: number, flip: boolean) =>
      `<g transform="translate(${x} ${y})${flip ? ' scale(-1 1)' : ''}" class="rb-FG"><g class="sw1"><use href="#rb-fg"/></g></g>`
    pieces.push({ layer: 4, x0: 7850, x1: 8060, prio: 3, svg: fg(7930, 1160, false) })
    pieces.push({ layer: 4, x0: 9330, x1: 9560, prio: 3, svg: fg(9460, 1170, true) })
  }

  // ───────── Điểm cho diễn viên ─────────
  spots.push({ kind: 'fireflies', layer: 3, x: 6380, y: n0(Y(6380, dTop(6, 6380))), w: 520 })
  spots.push({ kind: 'butterflies', layer: 3, x: 6020, y: n0(Y(6020, dTop(7, 6020))), w: 320 })

  const body = pieces.map(p => (p.svg || '') + (p.glow || '')).join('')
  const dAll = defs(ctx, used, lips, { xg, sunK, night, lite, snow })
  const cAll = css(ctx, used, night, snow) + xcss
  // chỉ gửi defs/css thật sự được dùng ở điều kiện này (ngân sách ký tự)
  const d1 = pruneDefs(dAll, body + cAll)
  const c1 = pruneCss(cAll, body + d1)
  return { pieces, spots, defs: pruneDefs(d1, body + c1), css: c1 }
}

/** Bỏ phần tử defs cấp đầu không ai tham chiếu (#id trong nội dung hoặc trong defs khác đang giữ). */
function pruneDefs(defs: string, content: string): string {
  const els: { s: string; ids: string[] }[] = []
  let depth = 0
  let start = 0
  for (const m of defs.matchAll(/<(\/?)[a-zA-Z][^>]*?(\/?)>/g)) {
    if (m[1]) depth -= 1
    else if (!m[2]) depth += 1
    if (depth === 0) {
      const s = defs.slice(start, (m.index as number) + m[0].length)
      els.push({ s, ids: [...s.matchAll(/ id="([^"]+)"/g)].map(x => x[1] as string) })
      start = (m.index as number) + m[0].length
    }
  }
  const refd = (txt: string, ids: string[]) => ids.some(id => txt.includes(`#${id}"`) || txt.includes(`#${id})`))
  const keep = els.map(e => !e.ids.length || refd(content, e.ids))
  for (let changed = true; changed; ) {
    changed = false
    const kept = els.filter((_, i) => keep[i]).map(e => e.s).join('')
    els.forEach((e, i) => {
      if (!keep[i] && refd(kept, e.ids)) {
        keep[i] = true
        changed = true
      }
    })
  }
  return els.filter((_, i) => keep[i]).map(e => e.s).join('')
}

/** Bỏ luật css mà không lớp nào trong nội dung dùng tới; bỏ @keyframes không còn ai gọi. */
function pruneCss(css: string, content: string): string {
  const rules: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < css.length; i += 1) {
    const c = css[i]
    if (c === '{') depth += 1
    else if (c === '}' && --depth === 0) {
      rules.push(css.slice(start, i + 1))
      start = i + 1
    }
  }
  const has = (cls: string) => new RegExp(`class="([^"]*\\s)?${cls}[\\s"]`).test(content)
  const kept = rules.filter(r => {
    if (r.startsWith('@')) return true
    const sel = r.slice(0, r.indexOf('{'))
    const cls = [...sel.matchAll(/\.([\w-]+)/g)].map(m => m[1] as string)
    return !cls.length || cls.some(has)
  })
  const live = kept.filter(r => !r.startsWith('@')).join('') + content
  return kept.filter(r => !r.startsWith('@keyframes') || new RegExp(`animation(-name)?:\\s*${/@keyframes\s+([\w-]+)/.exec(r)?.[1]}\\b`).test(live)).join('')
}

// ───────────────────────── defs & css ─────────────────────────
type Look = { xg: number; sunK: number; night: boolean; lite: boolean; snow: boolean }

/** Vân lớp phủ cho từng loại thửa (ô gốc, nét). Ô có nền = tô luôn bằng vân; ô không nền = phủ trên mặt nước. */
const PAT: Record<string, [number, number, string, string]> = {
  G: [14, 7, 'g2', '<path class="rb-q1" d="M1 7l1-4M4 7V2M6.5 7l-1-4.5M9 7l.6-3.5M12 7l-.4-4"/><path class="rb-q3" d="M2.5 7l.4-2M7.6 7l.5-2.4M13 7l.3-1.6"/>'],
  R: [22, 9, 'l3', '<path class="rb-q2" d="M1 9l1-5M4 9l-.5-6M7.5 9l1.5-5M10 9V3M13 9l-1-5M16 9l1-6M19 9l-.5-5M21 9l1-4"/><path class="rb-q4" d="M2.5 9l.4-2M8.5 9l.5-2.6M14.5 9l-.4-2M20 9l.3-2"/>'],
  Q: [22, 9, 'l2', '<path class="rb-q1" d="M1 9l1-5M4 9l-.5-6M7.5 9l1.5-5M10 9V3M13 9l-1-5M16 9l1-6M19 9l-.5-5M21 9l1-4"/><path class="rb-q4" d="M2.5 9l.4-2M8.5 9l.5-2.6M14.5 9l-.4-2M20 9l.3-2"/>'],
  Y: [24, 10, 'f1', '<path class="rb-qy" d="M1 9q1-4 4-6M7 10q0-4 3-7M12 9q1-3 5-5M18 10q-1-4 2-7M21 9q1-2 3-3M4 5q1-2 3-3M15 5q0-2 2-4M9 4q-1-2 1-3"/><path class="rb-q4" d="M3 10l.5-2M10 10l.4-2.4M16 10l.6-2M22 10l.3-1.6"/><path class="rb-qh" d="M5 3q1-1 2-1M13 6q1-1 2-1M19 3q1-1 2 0"/>'],
  H: [20, 8, 'd1', '<path class="rb-qb" d="M2 8V6M3 8l.6-2M7 7V5M11 8l-.4-2M12 8V6.4M16 7.5v-2M17 7.6l.6-1.6M5 3.5V2M9 3V1.6M14 3.4V2M18 2.6V1.2"/><path class="rb-qy" d="M.5 5l2-.6M8 4.6l1.6.4M13 6l1.8-.8M15 1.5l1.4.5"/>'],
  F: [18, 7, 'd2', '<path class="rb-qb" d="M2 7V5.4M6.5 6v-1.6M11 7V5.6M15 6.4V5M4.5 2.4V1.2M13 2.6V1.4"/>'],
  S: [90, 26, '', '<path class="rb-qs" d="M5 21l-2.7-4.8M5 21v-6M5 21l2.7-4.8M9 22l-1.5-2.7M9 22v-3.4M9 22l1.5-2.7M15 10l-1.1-1.9M15 10v-2.4M15 10l1.1-1.9M25 23l-2.1-3.7M25 23v-4.6M25 23l2.1-3.7M34 13l-0.9-1.6M34 13v-2M34 13l0.9-1.6M43 22l-2.5-4.5M43 22v-5.6M43 22l2.5-4.5M47 23l-1.4-2.4M47 23v-3M47 23l1.4-2.4M53 8l-1.3-2.2M53 8v-2.8M53 8l1.3-2.2M60 17l-1.9-3.4M60 17v-4.2M60 17l1.9-3.4M70 24l-1.6-2.9M70 24v-3.6M70 24l1.6-2.9M76 12l-0.8-1.4M76 12v-1.8M76 12l0.8-1.4M84 20l-2.2-4M84 20v-5M84 20l2.2-4"/>'],
  B: [18, 7, '', '<path class="rb-qb" d="M2 7V5M6 6.5v-2M4.5 3V1.6M8 2.8V1.4M11 7V5.4M14 6v-1.8M16 2.8V1.6"/>'],
  W: [60, 12, '', '<path class="rb-qw" d="M3 2h14M24 7h9M40 2h6M8 9h6M46 10h11M30 4h4"/>'],
}

function defs(ctx: Ctx, used: Set<string>, lips: string[], L: Look): string {
  const st = (o: number, c: string, op = 1) => `<stop offset="${o}" style="stop-color:${c.startsWith('c') ? c : `var(--${c})`}"${op < 1 ? ` stop-opacity="${op}"` : ''}/>`
  const s = ctx.season
  let d = lips.map((p, i) => (p ? `<path id="rb-L${i}" d="${cz(p)}"/>` : '')).join('')
  // viền nắng ở mép bờ: loang có tâm dưới mặt trời
  d += `<radialGradient id="rb-rg" gradientUnits="userSpaceOnUse" cx="${n0(L.xg)}" cy="700" r="950">${st(0, 'e2', o(0.1 + 0.75 * L.sunK))}${st(0.45, 's1', o(0.08 + 0.25 * L.sunK))}${st(1, 's1', L.night ? 0.05 : 0.08)}</radialGradient>`
  d +=
    `<radialGradient id="rb-mg">${st(0, 'w3', 0.75)}${st(0.6, 'w3', 0.3)}${st(1, 'w3', 0)}</radialGradient>` +
    `<radialGradient id="rb-cg">${st(0, 'k1', 0.2)}${st(0.6, 'k1', 0.1)}${st(1, 'k1', 0)}</radialGradient>` +
    `<radialGradient id="rb-gg" cx=".42">${st(0, 'w1', 0.3)}${st(0.5, 'w1', 0.12)}${st(0.8, 'k1', 0.07)}${st(1, 'k1', 0)}</radialGradient>` +
    `<radialGradient id="rb-swg0">${st(0, 'e2', 0.26)}${st(0.5, 'e2', 0.1)}${st(1, 'e2', 0)}</radialGradient>` +
    `<radialGradient id="rb-scg">${st(0, 'e2', 0.7)}${st(0.4, 'e2', 0.25)}${st(1, 'e2', 0)}</radialGradient>` +
    `<radialGradient id="rb-crg">${st(0, 'w3', 0.55)}${st(0.55, 'w3', 0.22)}${st(1, 'w3', 0)}</radialGradient>` +
    `<linearGradient id="rb-dg" gradientUnits="userSpaceOnUse" x1="0" y1="600" x2="0" y2="1120">${st(0, 'haze', L.night ? 0.3 : 0.42)}${st(0.5, 'haze', 0)}</linearGradient>` +
    `<linearGradient id="rb-cmg" gradientUnits="userSpaceOnUse" x1="5830" x2="7030">${st(0, 'w3')}${st(0.25, 'w3', 0.26)}${st(0.75, 'w3', 0.26)}${st(1, 'w3')}</linearGradient><mask id="rb-cm" maskUnits="userSpaceOnUse" x="5300" y="500" width="2100" height="800"><rect fill="url(#rb-cmg)" x="5300" y="500" width="2100" height="800"/></mask>` +
    `<radialGradient id="rb-hzg" gradientUnits="userSpaceOnUse" cx="6250" cy="600" r="1050" gradientTransform="matrix(1 0 0 .32 0 408)">${st(0, 'haze', 0.85)}${st(0.5, 'haze', 0.35)}${st(1, 'haze', 0)}</radialGradient>` +
    // chiều sâu trên mặt ruộng: sương ở bậc xa (trên), tối dần về hai góc dưới
    `<radialGradient id="rb-vg" gradientUnits="userSpaceOnUse" cx="6380" cy="760" r="900" gradientTransform="matrix(1 0 0 .62 0 289)">${st(0, 'k1', 0)}${st(0.45, 'k1', 0)}${st(1, 'k1', L.night ? 0.22 : 0.42)}</radialGradient>` +
    `<symbol id="rb-bu" overflow="visible"><path class="l4" d="M-16 2c-5-5-3-11 2-12-1-6 6-10 10-6 2-7 12-7 13 0 6-2 10 4 7 9 4 3 2 9-3 9z"/><path class="l3" d="M-12-2c-2-5 1-8 5-8 0-5 6-7 9-3 3-4 10-2 9 3 4 1 5 5 2 8-8-2-17-2-25 0z"/><path class="l2" d="M-8-9c1-3 5-4 7-1 2-3 7-2 7 1-5-1-9-1-14 0z"/></symbol>` +
    `<symbol id="rb-lf" overflow="visible"><path d="M0 0c-8 1-16 4-24 2 6-4 15-5 24-2zM0 0c-5 4-12 9-20 10 4-6 11-9 20-10zM0 0c-2 6-6 12-12 15 1-7 5-12 12-15zM0 0c6 2 14 1 20-3-6-1-14 0-20 3zM0 0c4 4 9 10 10 16-5-4-9-10-10-16z"/></symbol>` +
    `<symbol id="rb-eg" overflow="visible"><path class="z1" d="M-1-9l-1 9M3-9l1 9"/><path class="w3" d="M-9-14c3-6 13-7 16-2 2 4-1 8-6 9-6 1-9-2-10-7zM-10-27c0-2 3-3 4-1 0 2-2 2-4 1z"/>` +
    `<path class="s1" d="M-8-11c3 3 8 4 14 0-1 3-4 4-7 4-4 0-6-2-7-4z"/><path class="s2" d="M5-15c2 3 1 6-2 7 2-2 3-5 2-7z"/><path class="rb-ek" d="M-7-15c-3-4 2-7-1-12"/><path class="z1" d="M-10-27l-8 1"/></symbol>` +
    // cò bay: thân rb-ef + đôi cánh rb-ew đều TĨNH; cánh vỗ nhờ <g class="rb-wn"> bọc <use> ở chỗ dùng (fill w3 kế thừa từ lớp bọc)
    `<path id="rb-ef" class="w3" d="M-5 0q5-2 10 0-5 2-10 0z"/><path id="rb-ew" d="M-1 0q-3-6-9-7 5 4 6 7zM1 0q2-6 7-8-3 5-4 8z"/>` +
    `<symbol id="rb-cl" overflow="visible"><path class="rb-cp" d="M0 0q-2-10-7-16M0 0q0-12 2-20M0 0q3-9 8-13M0 0q-4-6-10-8"/></symbol>` +
    `<symbol id="rb-fg" overflow="visible"><path d="M0 0c-4-40-14-80-40-120M0 0c2-50 0-100-10-150M0 0c8-40 24-70 50-100M0 0c-10-30-30-60-64-74M0 0c4-30 6-60 22-84"/>` +
    (s === 'thu' ? `<path class="rb-ph" d="M-10-150c10 4 16 14 18 28M-40-120c-6 8-8 18-6 28M22-84c8 4 12 12 12 22"/>` : '') +
    (s === 'xuan' ? `<path class="rb-ph2" d="M-10-150h0M50-100h0M-64-74h0"/>` : '') +
    `</symbol>`
  // bù nhìn rơm (dùng 2 lần: thân + bóng soi dưới nước). Mọi phần TĨNH (nội dung được <use> tham chiếu không được mang class
  // động): rb-bn thân · rb-t1, rb-t2 hai tay áo · rb-bm rơm + nón. Tay áo bay nhờ <g class="rb-fp"> bọc <use> ở chỗ dùng (scare)
  d +=
    `<symbol id="rb-bn" overflow="visible"><path class="b2" d="M-1 0v-74h3v74z"/><path class="b1" d="M-27-55h54v3h-54z"/>` +
    `<path class="w2" d="M-10-31l-3 15 4-3 2 5 3-4 3 5 2-5 4 3-2-16zM-7-63c0-6 3-9 7-9s7 3 7 9-3 8-7 8-7-2-7-8z"/>` +
    `<path class="p2" d="M-10-57c-1 9-1 19-1 28h22c0-9 0-19-1-28z"/><path class="p3" opacity=".6" d="M-8-45h6v7h-6z"/>` +
    `<path class="sh" d="M2-57h8c1 9 1 19 1 28h-9zM2-71c3 1 5 4 5 8s-2 7-5 8c2-3 2-13 0-16zM1-88l19 22q-8 2-15 2z"/></symbol>` +
    `<path id="rb-t1" class="p2" d="M-26-55h15l-1 11c-5 2-10 1-14-2z"/>` +
    `<g id="rb-t2"><path class="p2" d="M11-55h15c0 4-1 8-2 11-4 1-8 1-12-1z"/><path class="p1" d="M26-52h3l1 13-2 4-1-5-2 2z"/></g>` +
    `<symbol id="rb-bm" overflow="visible"><path class="rb-sw" d="M-27-54l-5-3M-27-53h-6M-27-52l-5 3M27-54l5-3M27-53h6M27-52l5 3"/>` +
    `<path class="w1" d="M-18-66L1-88l19 22q-19 5-38 0z"/>${L.snow ? '<path class="w3" d="M-14-68L1-86l15 18q-15 3-30 0z"/>' : '<path class="hl" d="M1-88L-18-66q6 1 12 1z"/>'}` +
    `<path class="z2" d="M-8-45h6M-5-45v7M-3-63h1M2-63h1M-2-59q2 1 4 0M-12-71q13 3 26 0"/></symbol>`
  if (s === 'thu') {
    // bó lúa: 4 bông cong rủ chụm trên thân bó, dây buộc, bóng chân · đống rơm 3 sắc độ
    d +=
      `<symbol id="rb-sv" overflow="visible"><ellipse class="ao" cy="1" rx="7" ry="1.8"/><path class="l1" d="M-5 0l3-14h4l3 14z"/><path class="sh" d="M1-14h1l3 14h-3z"/>` +
      `<path class="rb-svh" d="M-1-13c-4-1-7 2-8 6M0-14c-2-4-6-5-9-3M1-14c2-4 6-5 9-2M1-13c4 0 7 3 7 7M0-14c0-3 1-5 3-6"/><path class="b1" d="M-3-7h6v1.4h-6z"/></symbol>` +
      `<symbol id="rb-ss" overflow="visible"><ellipse class="ao" cy="1" rx="18" ry="3"/><path class="l1" d="M-16 0c0-11 7-18 16-18s16 7 16 18z"/><path class="hl" d="M-13-4c1-7 5-12 11-13-5 3-8 8-9 13z"/>` +
      `<path class="sh" d="M3-17c7 2 12 8 13 17h-8c0-6-1-12-5-17z"/><path class="z2" opacity=".35" d="M-14-4q14 3 28 0M-10-11q10 2 20 0"/><path class="b2" d="M-1-18h2v-6h-2z"/></symbol>`
  }
  // vân theo bậc: xa mờ (.4), giữa & gần dùng chung ô (href) nhưng to dần và nghiêng khác nhau
  for (const K of ['G', 'R', 'Q', 'Y', 'H', 'F', 'S', 'B', 'W']) {
    const p = PAT[K] as [number, number, string, string]
    // đêm: đất/rạ dịu về một tông trầm (hết sọc gạch–lam); tuyết: ruộng khô phủ trắng
    const base = (K === 'H' || K === 'F') && (L.night || L.snow) ? (L.snow ? 'rb-sd' : 'rb-nd') : p[2]
    const body = (op: string) => (base ? `<rect class="${base}" width="${p[0]}" height="${p[1]}"/>` : '') + (op ? `<g opacity="${op}">${p[3]}</g>` : p[3])
    const pat = (t: number, inner: string, href = '') =>
      `<pattern id="rb-p${K}${t}"${href ? ` href="#${href}"` : ` width="${p[0]}" height="${p[1]}" patternUnits="userSpaceOnUse"`} patternTransform="rotate(${TR[t]}) scale(${TS[t]})">${inner}</pattern>`
    const u0 = used.has(K + 0)
    const u1 = used.has(K + 1) || used.has(K + 2)
    if (K === 'W' || K === 'S' || K === 'B') {
      // mặt nước: nền màu theo bậc (gương soi trời) + vân (gợn / mạ / gốc rạ) — mỗi bậc một ô riêng
      // vân mặt nước khai một lần (id) ở bậc đầu tiên dùng tới, bậc khác <use> lại
      let vi = ''
      for (let t = 0; t < 3; t += 1)
        if (used.has(K + t)) {
          const v = vi ? `<use href="#${vi}"/>` : p[3].replace('<path', `<path id="rb-v${K}"`)
          vi = `rb-v${K}`
          d += pat(t, `<rect class="rb-c${t}" width="${p[0]}" height="${p[1]}"/>` + (L.lite && K === 'W' ? '' : `<g opacity="${t ? (L.night ? '.35' : t < 2 && K === 'S' ? '.7' : '1') : '.4'}">${v}</g>`))
        }
      continue
    }
    if (u0) d += pat(0, body('.4'))
    if (u1) d += pat(1, body('')) + (used.has(K + 2) ? pat(2, '', `rb-p${K}1`) : '')
  }
  return d
}
const o = (v: number) => Math.round(clamp(v, 0, 1) * 100) / 100

function css(ctx: Ctx, used: Set<string>, night: boolean, snow: boolean): string {
  const s = ctx.season
  const fgCol: Record<string, string> = { xuan: 'g3', ha: 'l3', thu: 'l2', dong: 'b3' }
  const rsCol: Record<string, string> = {
    xuan: 'color-mix(in srgb,var(--d2) 55%,var(--g4))',
    ha: 'color-mix(in srgb,var(--g4) 52%,var(--k2))',
    thu: 'color-mix(in srgb,var(--g4) 66%,var(--d2))',
    dong: 'color-mix(in srgb,var(--d2) 72%,var(--k2))',
  }
  const fr = s === 'thu' ? 'color-mix(in srgb,var(--f1) 72%,var(--w3))' : 'var(--g1)'
  let f = ''
  for (const key of used) {
    const K = key[0] as string
    const t = key[1] as string
    // nước: hàng xa soi trời thấp (sáng), hàng gần soi trời cao (đậm) — gương phẳng theo bậc
    f += `.rb-${key}{fill:url(#rb-p${K}${t})}`
  }
  return (
    `svg{--rb-rs:${rsCol[s]};--rb-fr:${fr}}` +
    f +
    [0, 1, 2]
      .map(t => `.rb-c${t}{fill:color-mix(in srgb,${snow ? `var(--s1) ${[70, 60, 50][t]}%,var(--a2)` : night ? `var(--a3) ${[62, 66, 60][t]}%,var(--haze)` : `var(--a1) ${[82, 55, 32][t]}%,var(--${t ? 'a3' : 'a2'})`})}`)
      .join('') +
    `.rb-nd{fill:color-mix(in srgb,var(--d2) 50%,var(--k2))}.rb-sd{fill:color-mix(in srgb,var(--s1) 75%,var(--d2))}.rb-hz{fill:none;stroke:var(--haze);opacity:.3}` +
    `.rb-b1,.rb-b2,.rb-b3{fill:none;stroke-linecap:round}.rb-b1{stroke:color-mix(in srgb,var(--k1) 60%,var(--g4));opacity:.36}.rb-b2{stroke:var(--w3);opacity:.16}.rb-b3{stroke:var(--k1);opacity:.13}` +
    // bờ: mặt đứng · nửa dưới khuất · đá xếp so le · viền nắng · rêu · tuyết · hoa · mép bông
    `.rb-rs,.rb-rd,.rb-st,.rb-rim,.rb-mo,.rb-sn,.rb-fw,.rb-fr,.rb-dd{fill:none;stroke-linecap:round}.rb-rs{stroke:var(--rb-rs)}.rb-rd{stroke:var(--k1);opacity:.22}` +
    `.rb-st{stroke:var(--s3);opacity:.42;stroke-linecap:butt;stroke-dasharray:9 2 14 2 6 2 11 2 17 2 7 2}.rb-st2{stroke:var(--s4);stroke-dasharray:12 2 7 2 15 2 9 2 5 2 13 2;stroke-dashoffset:5}` +
    `.rb-rim{stroke:url(#rb-rg);stroke-dasharray:57 3 21 2 88 5 34 2 13 4}.rb-rv{stroke:var(--d2);opacity:.3;stroke-dasharray:31 17 64 9 12 23 47 13}.rb-gt{fill:none;stroke:var(--g4);stroke-width:1.1;stroke-linecap:round;opacity:.28}.rb-sk{fill:none;stroke:var(--haze);stroke-width:9;stroke-linecap:round;opacity:.22}.rb-sk2{stroke:var(--w3);stroke-width:4;opacity:.28}.rb-mo{stroke:var(--m2);stroke-dasharray:6 47 0 23 11 71 2 31 0 19 15 59 4 37}.rb-mo2{stroke:var(--m1);stroke-dasharray:3 61 8 29 0 83 5 43;stroke-dashoffset:17}` +
    `.rb-sn{stroke:var(--s1);opacity:.9}.rb-fw{stroke:var(--f1);stroke-dasharray:0 41 0 67 0 29 0 83}.rb-fw2{stroke:var(--f3);stroke-dashoffset:23}` +
    `.rb-fr{stroke:var(--rb-fr)}.rb-fr2{stroke:var(--k1);opacity:.2}` +
    [3, 4.6, 7].map((w, i) => `.rb-f${i + 1}{stroke-width:${w}px;stroke-dasharray:0 ${[0.8, 1.15, 0.95, 1.3, 0.75, 1.05].map(v => n1(v * w)).join(' ')}}`).join('') +
    `.rb-dd{stroke:var(--m3);stroke-width:2.2;opacity:.8}` +
    // vân
    `.rb-q1,.rb-q2,.rb-q3,.rb-q4,.rb-qy,.rb-qh,.rb-qb,.rb-qs,.rb-qw{fill:none;stroke-linecap:round;stroke-width:.8}.rb-q1{stroke:var(--g1)}.rb-q3{stroke:var(--g3)}.rb-q2{stroke:var(--l2);opacity:.6}.rb-q4{stroke:var(--l4);opacity:.45}` +
    `.rb-qy{stroke:var(--l2);opacity:.6}.rb-qh{stroke:var(--w3);opacity:.35}.rb-qb{stroke:var(--b3)}.rb-qs{stroke:var(--g1);stroke-width:.9;opacity:.6}.rb-qw{stroke:var(--w3);stroke-width:.7;opacity:.28}` +
    // nước: đốm nắng & viền nóng, ánh trăng, mây soi
    `.rb-g0,.rb-g1,.rb-g2{fill:none;stroke:var(--w3);stroke-linecap:round;stroke-dasharray:2 8 12 5 4 14 1 9 7 6}.rb-g0{stroke-width:2;opacity:.6}.rb-g1{stroke-width:2.8;opacity:.9}.rb-g2{stroke-width:3.6}.rb-gz{fill:color-mix(in srgb,var(--e1) 15%,var(--w3));opacity:.26}.rb-mn .rb-gz{fill:var(--w3);opacity:.18}.rb-gb{stroke-dasharray:6 12 2 7 10 16 3 8}` +
    `.rb-gw{animation:rb-gw 2.6s ease-in-out infinite alternate}.rb-gv{animation-direction:alternate-reverse}@keyframes rb-gw{from{opacity:.45}}.rb-gr{fill:none;stroke:color-mix(in srgb,var(--e1) 40%,var(--w3));stroke-width:1.8;stroke-linecap:round;opacity:.85}.rb-mn .rb-gr{stroke:var(--e3)}` +
    `.rb-cr{fill:url(#rb-crg);animation:rb-cr 260s ease-in-out infinite alternate}@keyframes rb-cr{from{transform:translateX(-160px)}to{transform:translateX(220px)}}` +
    `.rb-sc{fill:url(#rb-scg)}` +
    `.rb-svh{fill:none;stroke:var(--f1);stroke-width:1.8;stroke-linecap:round}.rb-sw0{fill:url(#rb-swg0)}` +

    `.rb-rp{fill:none;stroke:var(--a1);stroke-width:.9}.rb-tr{fill:none;stroke:var(--a1);stroke-width:1.6;stroke-linecap:round}` +
    `.rb-sw{fill:none;stroke:var(--w2);stroke-width:1.4;stroke-linecap:round}` +
    `.rb-bb{fill:none;stroke:var(--g3);stroke-width:3.6;stroke-linecap:round}.rb-bn{fill:none;stroke:var(--g4);stroke-width:4.4;stroke-dasharray:1.5 26}` +
    `.rb-ek{fill:none;stroke:var(--w3);stroke-width:2.6;stroke-linecap:round}` +
    `.rb-wn{fill:var(--w3);transform-box:fill-box;transform-origin:50% 100%;animation:rb-wf .8s ease-in-out infinite alternate}@keyframes rb-wf{to{transform:scaleY(-.5)}}` +
    `.rb-cp{fill:none;stroke:var(--${s === 'thu' ? 'l1' : s === 'dong' ? 'b3' : 'l3'});stroke-width:1.3;stroke-linecap:round}` +
    `.rb-FG{fill:none;stroke:var(--${fgCol[s]});stroke-width:6;stroke-linecap:round;opacity:.92}` +
    `.rb-ph{fill:none;stroke:var(--f1);stroke-width:7;stroke-linecap:round;stroke-dasharray:3 2}.rb-ph2{fill:none;stroke:var(--f3);stroke-width:9;stroke-linecap:round}` +
    `.rb-fp{transform-box:fill-box;transform-origin:50% 0;animation:rb-fp 3.1s ease-in-out infinite alternate}@keyframes rb-fp{from{transform:rotate(calc(-3deg - var(--wind)*6deg))}to{transform:rotate(calc(4deg + var(--wind)*16deg))}}` +
    `.rb-pk{transform-box:fill-box;transform-origin:75% 100%;animation:rb-pk 13s ease-in-out infinite}@keyframes rb-pk{0%,76%,100%{transform:rotate(0)}82%,90%{transform:rotate(-32deg)}}` +
    `.rb-gu{fill:url(#rb-gg);animation:rb-gu 50s linear infinite}@keyframes rb-gu{to{transform:translateX(2900px)}}` +
    `.rb-cs{fill:url(#rb-cg);animation:rb-cs 150s linear infinite}@keyframes rb-cs{to{transform:translateX(2700px)}}` +
    `.rb-mi{fill:url(#rb-mg);animation:rb-mi 47s ease-in-out infinite alternate}@keyframes rb-mi{to{transform:translateX(110px)}}` +
    `.rb-fy{animation:rb-fy 150s linear infinite}@keyframes rb-fy{0%{transform:translate(0,0);opacity:0}6%,92%{opacity:1}100%{transform:translate(900px,-60px);opacity:0}}`
  )
}

export const region: Region = {
  id: 'ruong-bac-thang',
  name: 'Ruộng bậc thang',
  x0: RX0,
  x1: RX1,
  shots: [{ id: 'ruong-bac-thang', name: 'Ruộng bậc thang', x: 6430, y: 585, zoom: 1 }],
  build,
}
