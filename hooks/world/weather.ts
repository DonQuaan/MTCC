// THỜI TIẾT — lớp phủ màn hình trên cùng (dưới viền tối) + vài mảnh trong thế giới:
//  · mưa phùn · mưa · mưa to: trời sầm & ngả xám (khử bão hoà), mây dày che mặt trời (lớp 0), màn mưa xa, bốn tầng vệt sâu,
//    bọt bắn theo phối cảnh, gợn trên vũng nước, CHỖ TRÚ dưới tán đa (mặt nạ giảm mưa bám camera) + giọt nhỏ từ mép tán
//  · chớp: tia sét nhánh mọc từ chân mây xuống núi (lớp 0, ba lượt: quầng · thân · lõi, dư ảnh), mây quanh tia bừng sáng
//  · tuyết bốn tầng (mây thấp che sao) · sương: dải dày sau đất chính (lớp 2) + màn mỏng tan dần về tiền cảnh
//  · hạt mùa rụng từ tán / gió cuốn vào khung: cánh đào, lá thu lộn mặt, phấn nắng & bồ công anh; đông: sương muối trên cỏ.
// Mọi lớp bám dòng thời tiết ctx.weather: opacity theo t0/t1 (mờ vào/ra), chu kỳ liền mạch theo giờ tuyệt đối.
// Kỹ thuật gọn: vệt mưa/tuyết nằm trong <pattern> nghiêng (skewX theo gió); tấm phủ trượt đúng một ô mẫu mỗi chu kỳ.
import { clamp, ground, mix, smooth, smoothPath, type Pt } from './util'
import type { Ctx, Piece, WeatherModule, WeatherSlice } from './types'

/** Số gọn: tối đa d chữ số thập phân, bỏ số 0 đầu (".6"). */
const f = (v: number, d = 1): string => {
  const p = 10 ** d
  const s = String(Math.round(v * p) / p)
  return s === '-0' ? '0' : s.replace(/^(-?)0\./, '$1.')
}
const R = Math.round
const isRain = (s: WeatherSlice) => s.precip === 'mua' || s.precip === 'mua-to'
const isWet = (s: WeatherSlice) => s.precip !== 'khong' && s.precip !== 'tuyet'
const maxOf = (xs: number[]) => xs.reduce((a, b) => Math.max(a, b), 0)
type P = WeatherSlice['precip']
const DARK: Record<P, number> = { khong: 0, phun: 0.3, mua: 0.62, 'mua-to': 1, tuyet: 0 }
const DESAT: Record<P, number> = { khong: 0, phun: 0.16, mua: 0.3, 'mua-to': 0.45, tuyet: 0.15 }

/** Chỗ trú mưa (lớp 3): [x0, x1, mép dưới tán y, bỏ qua từ, bỏ qua đến (thân cây)]. Tán đa cay-da. */
const SHELTERS: [number, number, number, number, number][] = [[3900, 5190, 418, 4370, 4580]]
/** Vũng nước cay-da vẽ khi đất ướt (cx, cy, rx, ry; chép từ regions/cay-da.ts mục A — đổi bên đó thì sửa theo). */
const PUDDLES: [number, number, number, number][] = [[4300, 905, 16, 3], [4460, 804, 13, 2.5], [4600, 738, 30, 4]]
/** Đoạn lớp 3 không có cỏ (mặt hồ, biển): không phủ sương muối. */
const NO_GRASS: [number, number][] = [[7300, 8900], [17250, 99999]]

/** Một tia sét (gốc ở chân mây, toạ độ cục bộ): thân zig-zag dài ~400 xuống tới núi + 2–3 nhánh 40–90 px, mỗi nhánh 3–5 đoạn. */
function bolt(r: () => number): [string, string] {
  const len = 360 + r() * 90
  const lean = (r() - 0.5) * 12
  let x = 0
  let y = 0
  let d = 'M0 0'
  const pts: Pt[] = []
  while (y < len) {
    // khúc khuỷu nhỏ + thỉnh thoảng gãy gắt (kênh phóng điện thật không mượt)
    const dx = R((r() - 0.5) * 24 * (r() < 0.22 ? 2.6 : 1) + lean)
    const dy = R(10 + r() * 20)
    x += dx
    y += dy
    d += `l${dx} ${dy}`
    pts.push([x, y])
  }
  let b = ''
  for (let i = 0, nb = 2 + Math.floor(r() * 2); i < nb; i += 1) {
    const p = pts[1 + Math.floor(r() * (pts.length - 2) * 0.7)] ?? [0, 0]
    const dir = r() < 0.5 ? -1 : 1
    const m = 3 + Math.floor(r() * 3)
    const seg = (40 + r() * 50) / m
    b += `M${p[0]} ${p[1]}`
    for (let j = 0; j < m; j += 1) b += `l${R(dir * seg * (0.4 + r() * 0.8))} ${R(seg * (0.5 + r() * 0.6))}`
  }
  return [d, b]
}

/** Giá trị tại t của đường gấp khúc (t, v). */
function valAt(pts: Pt[], t: number): number {
  const a = pts[0] as Pt
  if (t <= a[0]) return a[1]
  for (let i = 1; i < pts.length; i += 1) {
    const p = pts[i - 1] as Pt
    const q = pts[i] as Pt
    if (t <= q[0]) return q[0] === p[0] ? q[1] : p[1] + ((q[1] - p[1]) * (t - p[0])) / (q[0] - p[0])
  }
  return (pts[pts.length - 1] as Pt)[1]
}

/** Kênh opacity theo thời gian: `a` = thuộc tính sẵn (có khoảng trắng đầu); c/s/o để ghép với class/style khác. */
type Ch = { max: number; a: string; c: string; s: string; o: string }

type Out = { screen: string; pieces: Piece[]; defs: string; css: string }

/** Dựng toàn bộ lớp thời tiết với mật độ `dens` (1 = đủ); trả kèm số ký tự ước tính thực xuất ra. */
function make(ctx: Ctx, dens: number): { out: Out; n: number } {
    const lite = ctx.detail === 'lite'
    const q = (n: number) => Math.max(1, R(n * dens * (lite ? 0.5 : 1)))
    const span = ctx.span
    const nowSec = ctx.now / 1000
    const sl: WeatherSlice[] = ctx.weather.length ? ctx.weather : [ctx.cur]
    const first = sl[0] as WeatherSlice
    const dl = clamp(ctx.daylight, 0, 1)
    const pieces: Piece[] = []
    // chuỗi mảnh trải cả thế giới (sương lớp 2, sương muối, cột mưa xa): lõi chỉ giữ ~nVis mảnh quanh đường camera
    let wide = { real: 0, est: 0 }
    const addWide = (list: Piece[], nVis: number) => {
      const sz = list.map(p => p.svg.length + 8)
      pieces.push(...list)
      wide = { real: wide.real + sz.reduce((a, b) => a + b, 0), est: wide.est + sz.sort((a, b) => b - a).slice(0, nVis).reduce((a, b) => a + b, 0) }
    }
    let defs = ''
    let css = `svg{--wrc:${mix('#7b8aa8', '#e2ebf2', dl)};--wsc:${mix('#c9d4ea', '#ffffff', dl)}}`
    let scr = ''
    // BUDGET đo NỘI DUNG theo cách mã hoá trước quy tắc "nội dung được <use> phải tĩnh". Ký tự quy tắc này thêm/bớt — vỏ <g> động
    // bọc từng bản sao, bản sao tia sét, giọt vẽ tại chỗ; bỏ vỏ #wr-LS, ký hiệu #wr-dq… — cộng vào `enc` ĐÚNG từng ký tự ngay chỗ sinh ra,
    // nên mật độ & lớp phụ trùng bản trước quy tắc đó (mưa không thưa đi). Lõi vẫn tính cỡ THẬT vào trần chung.
    // Cộng một HẰNG vào BUDGET thì không đủ: phần tăng đổi theo số bọt/tia/giọt/hạt từng cửa sổ, mà khi mưa ngân sách gần như luôn
    // chạm trần (lớp phụ lấp đầy) → lệch vài chục ký tự là đổi quyết định; đo 2026-11-07, hằng 9000…10000: khớp tối đa 81%.
    // Các số dưới (26, 21, 47, 52, 98, 39) là chênh độ dài so với chuỗi cũ, đo một lần; khớp 2248/2248 lần dựng (mọi mốc kiểm).
    let enc = 0
    /** Độ trễ âm (giây) để một vòng chu kỳ `p` chạy liền mạch theo giờ tuyệt đối. */
    const ph = (p: number, r: () => number) => f(-((nowSec + r() * p) % p), 1)

    // ── Kênh thời gian: opacity theo đường gấp khúc (giây của cửa sổ) → thuộc tính tĩnh hoặc keyframes ──
    const kfs = new Map<string, string>()
    const att = (ch: Ch, cls = '', sty = '') => {
      const c = [ch.c, cls].filter(Boolean).join(' ')
      const s = [ch.s, sty].filter(Boolean).join(';')
      return (c ? ` class="${c}"` : '') + (s ? ` style="${s}"` : '') + (ch.o ? ` opacity="${ch.o}"` : '')
    }
    const mk = (max: number, c: string, s: string, o: string): Ch => {
      const ch = { max, a: '', c, s, o }
      ch.a = att(ch)
      return ch
    }
    const anim = (pts: Pt[]): Ch => {
      const all: Pt[] = [[0, valAt(pts, 0)], ...pts.filter(([t]) => t > 0 && t < span), [span, valAt(pts, span)]]
      const max = maxOf(all.map(p => p[1]))
      if (max < 0.02) return mk(0, '', '', '')
      if (all.every(p => Math.abs(p[1] - max) < 0.01)) return mk(max, '', '', max > 0.98 ? '' : f(max, 2))
      // mốc liền nhau cùng giá trị gộp chung một khối: "0%,7.5%{opacity:0}"
      let kf = ''
      for (let i = 0; i < all.length; ) {
        const v = f((all[i] as Pt)[1], 2)
        const at: string[] = []
        while (i < all.length && f((all[i] as Pt)[1], 2) === v) at.push(`${f(((all[i++] as Pt)[0] / span) * 100, 2)}%`)
        kf += `${at.join(',')}{opacity:${v}}`
      }
      let id = kfs.get(kf)
      if (!id) {
        id = `wr-k${kfs.size}`
        kfs.set(kf, id)
        if (kfs.size === 1) css += `.wr-k{animation:var(--n) ${span}s linear forwards;animation-delay:calc(var(--t)*-1s)}`
        css += `@keyframes ${id}{${kf}}`
      }
      return mk(max, 'wr-k', `--n:${id}`, '')
    }
    /** Kênh bám các đoạn thời tiết; `early` = phần dốc lên nằm trước ranh giới (1: hiện hẳn trước khi tới). */
    const track = (fn: (s: WeatherSlice) => number, ramp = 20, early = 0.5) => {
      const pts: Pt[] = [[0, fn(first)]]
      for (let i = 1; i < sl.length; i += 1) {
        const s = sl[i] as WeatherSlice
        const a = fn(sl[i - 1] as WeatherSlice)
        const b = fn(s)
        if (Math.abs(a - b) < 0.01) continue
        const e = b > a ? early : 1 - early
        const t0 = Math.max(s.t0 - ramp * e, (pts[pts.length - 1] as Pt)[0] + 0.5)
        pts.push([t0, a], [Math.max(s.t0 + ramp * (1 - e), t0 + 0.5), b])
      }
      return anim(pts)
    }

    // ── Dụng cụ: mẫu nghiêng theo gió + tấm phủ trượt đúng một vectơ lưới mẫu (k, th) mỗi chu kỳ → liền mạch ──
    // mẫu cùng góc nghiêng thừa hưởng patternUnits/patternTransform từ một mẫu gốc rỗng (href) → gọn ký tự
    const pbase = new Map<string, string>()
    const pat = (id: string, tw: number, th: number, deg: number, inner: string, attr = '') => {
      const k = f(deg)
      let b = pbase.get(k)
      if (!b) {
        b = `wr-u${pbase.size}`
        pbase.set(k, b)
        defs += `<pattern id="${b}" patternUnits="userSpaceOnUse" patternTransform="skewX(${k})"/>`
      }
      defs += `<pattern id="${id}" href="#${b}" width="${tw}" height="${th}"${attr}>${inner}</pattern>`
    }
    // màu chung của gradient đặt qua class (wr-hz: sương · wr-wc: mưa · wr-sc: tuyết) thay vì lặp style ở từng điểm dừng
    const gcls = new Set<string>()
    const gc = (c: 'hz' | 'wc' | 'sc') => {
      gcls.add(c)
      return ` class="wr-${c}"`
    }
    const so = (o: string, a: string) => `<stop${o === '0' ? '' : ` offset="${o}"`}${a === '1' ? '' : ` stop-opacity="${a}"`}/>`
    const streaks = (id: string, tw: number, th: number, deg: number, n: number, l0: number, l1: number, wd: number, op: number, r: () => number, line = false) => {
      let d = ''
      for (let i = 0; i < n; i += 1) {
        const L = R(l0 + r() * (l1 - l0))
        const x = R(2 + r() * (tw - 4))
        const y = R(r() * (th - L - 2))
        d += line ? `M${x} ${y}v${L}` : `M${x} ${y}l${f(wd / 2)} ${L}h${f(-wd)}z`
      }
      pat(id, tw, th, deg, line ? `<path class="wr-c" fill="none" stroke-width="${f(wd)}" stroke-opacity="${f(op, 2)}" d="${d}"/>` : `<path fill="url(#wr-sg)" fill-opacity="${f(op, 2)}" d="${d}"/>`)
    }
    let usedSheet = false
    let hasSoft = false
    const soft = () => {
      if (!hasSoft) defs += `<linearGradient id="wr-hg"${gc('wc')}>${so('0', '0')}${so('.5', '1')}${so('1', '0')}</linearGradient>`
      hasSoft = true
    }
    const sheet = (id: string, th: number, dur: number, deg: number, pad = 0, extra = '') => {
      usedSheet = true
      const k = R(th * Math.tan((deg * Math.PI) / 180))
      return `<rect class="wr-y" style="--h:${th}px;--k:${k}px;--d:${dur}s${extra}" x="${-k - pad - 2}" y="${-th}" width="${1604 + k + 2 * pad}" height="${1000 + th}" fill="url(#${id})"/>`
    }
    // Chỗ trú: KHÔNG dùng mặt nạ bám camera. Nội dung trong <mask> không lên compositor được → camera trong mặt nạ chạy
    // luồng chính, kéo cả cảnh ~7k nút vẽ lại mỗi khung (đo: 50–60% một nhân khi mưa to). Mưa trước tán cây vẫn thấy là
    // đúng vật lý; "trú mưa" thể hiện bằng mảnh thế giới (giọt từ mép tán, vũng khô, mèo nằm dưới tán) ở lớp 3.
    const shelter = (inner: string) => inner

    const clearK = sl.reduce((a, s) => a + (s.precip === 'khong' ? s.t1 - s.t0 : 0), 0) / span

    // ── 1. Trời sầm lại, cảnh ngả xám khi mưa; mây dày kéo che mặt trời (lớp 0, trước mặt trời/sau núi) ──
    const dk = track(s => DARK[s.precip], 30)
    if (dk.max) {
      // trời đã được màn mây lớp 0 làm tối (sau tia sét) → lớp phủ màn hình nhẹ ở trên, đậm dần ở tầng cảnh giữa & đất
      defs += `<linearGradient id="wr-dk" x2="0" y2="1"><stop stop-color="#18202f" stop-opacity=".14"/><stop offset=".45" stop-color="#46526a" stop-opacity=".28"/><stop offset=".62" stop-color="#46526a" stop-opacity=".32"/><stop offset="1" stop-color="#18202f" stop-opacity=".42"/></linearGradient>`
      scr += `<rect width="1600" height="1000" fill="url(#wr-dk)"${dk.a}/>`
    }
    const ds = track(s => DESAT[s.precip], 30)
    if (ds.max) {
      css += `.wr-ds{mix-blend-mode:saturation}`
      scr += `<rect width="1600" height="1000" fill="#6b7684"${att(ds, 'wr-ds')}/>`
    }
    const cv = track(s => (s.precip === 'mua-to' ? 0.78 : s.precip === 'mua' ? 0.55 : 0), 40)
    if (cv.max) {
      const c = mix('#3a4458', '#1c2236', 1 - dl)
      defs += `<linearGradient id="wr-cv" gradientUnits="userSpaceOnUse" x2="0" y1="-60" y2="600"><stop stop-color="${c}" stop-opacity=".92"/><stop offset=".6" stop-color="${c}" stop-opacity=".62"/><stop offset="1" stop-color="${c}" stop-opacity=".1"/></linearGradient>`
      pieces.push({ layer: 0, x0: -1200, x1: 2400, prio: 7, svg: `<rect x="-1200" y="-300" width="3600" height="900" fill="url(#wr-cv)"${cv.a}/>` })
    }

    // ── 2. Sương: dải dày ở LỚP 2 (sau cây cối lớp 3) + màn mỏng trên màn hình dày ở tầm y≈620, tan hẳn ở tiền cảnh ──
    const fg = track(s => clamp(s.fog, 0, 1), 40)
    if (fg.max > 0.04) {
      const r = ctx.rng('wr-suong')
      const hz = so
      defs +=
        `<radialGradient id="wr-fb"${gc('hz')}>${hz('0', '.9')}${hz('.5', '.45')}${hz('1', '0')}</radialGradient>` +
        `<linearGradient id="wr-fg"${gc('hz')} x2="0" y2="1">${hz('0', '0')}${hz('.4', '.5')}${hz('.62', '.28')}${hz('.85', '.05')}${hz('1', '0')}</linearGradient>` +
        `<rect id="wr-f2" width="1800" height="170" fill="url(#wr-fb)"/>`
      css += `.wr-fd{animation:wr-fd var(--d) ease-in-out infinite alternate;animation-delay:calc(var(--o) - var(--t)*1s)}@keyframes wr-fd{from{transform:translateX(calc(var(--dx)*-1))}to{transform:translateX(var(--dx))}}`
      const band = (x: number, y: number, w: number, h: number, op = '') => {
        const d = R(70 + r() * 90)
        return `<rect class="wr-fd" x="${R(x)}" y="${R(y)}" width="${R(w)}" height="${R(h)}" fill="url(#wr-fb)"${op} style="--dx:${R(120 + r() * 240)}px;--d:${d}s;--o:${ph(2 * d, r)}s"/>`
      }
      let g = `<rect y="360" width="1600" height="640" fill="url(#wr-fg)"/>`
      const wetWin = sl.some(isWet)
      for (let i = 0, nb = q(wetWin ? 2 : 4); i < nb; i += 1) {
        const h = 50 + r() * 60
        g += band(-300 + r() * 900, 580 + (i / nb) * 150 + r() * 20 - h / 2, 1200 + r() * 1000, h, ' opacity=".55"')
      }
      scr += `<g${fg.a}>${g}</g>`
      const list: Piece[] = []
      for (let x = -600; x < 8400; x += 1200) {
        let s = ''
        for (let j = 0; j < (wetWin ? 1 : 2); j += 1) {
          const d = R(80 + r() * 80)
          s += `<use href="#wr-f2" class="wr-fd" x="${R(x + r() * 500)}" y="${R(540 + j * 70 + r() * 50)}" style="--dx:${R(100 + r() * 200)}px;--d:${d}s;--o:${ph(2 * d, r)}s"/>`
        }
        list.push({ layer: 2, x0: x - 300, x1: x + 2600, prio: 6, svg: `<g${fg.a}>${s}</g>` })
      }
      addWide(list, 6)
    }

    // ── 3. Mưa phùn: hạt cực mảnh, dày, chậm, mờ như bụi ──
    const pt = track(s => (s.precip === 'phun' ? 1 : 0), 30)
    if (pt.max) {
      const r = ctx.rng('wr-phun')
      const deg = 8 + maxOf(sl.filter(s => s.precip === 'phun').map(s => s.wind)) * 34
      const dash = (id: string, tw: number, th: number, n: number, len: number, w: number, op: number) => {
        let d = ''
        for (let i = 0; i < n; i += 1) d += `M${R(1 + r() * (tw - 2))} ${R(r() * (th - len - 1))}v${len}`
        pat(id, tw, th, deg, `<path class="wr-dd" stroke-width="${f(w)}" stroke-opacity="${f(op, 2)}" d="${d}"/>`)
      }
      dash('wr-d1', 230, 210, q(44), 4, 0.7, 0.55)
      dash('wr-d2', 370, 330, q(22), 7, 1, 0.4)
      css += `.wr-dd{stroke:var(--wrc);stroke-linecap:round}`
      scr += `<g${pt.a}><rect width="1600" height="1000" style="fill:var(--haze)" opacity=".08"/>${shelter(sheet('wr-d1', 210, 3.4, deg) + sheet('wr-d2', 330, 2.2, deg))}</g>`
    }

    // ── 4. Mưa vừa / mưa to: màn mưa xa, bốn tầng vệt (xa mảnh mờ → gần dài rõ), bọt bắn lớn dần về tiền cảnh ──
    const rt = track(s => (isRain(s) ? 1 : 0))
    let splash = (_n: number) => ''
    const rainS = sl.filter(isRain)
    const deg = 4 + maxOf(rainS.map(s => s.wind)) * 24
    if (rt.max) {
      const r = ctx.rng('wr-mua')
      const heavy = rainS.some(s => s.precip === 'mua-to')
      const hk = heavy ? 1.3 : 1
      const vs = so
      defs +=
        (lite ? '' : `<linearGradient id="wr-mv"${gc('wc')} x2="0" y2="1">${vs('0', '0')}${vs('.5', '.16')}${vs('1', '0')}</linearGradient>`) +
        `<linearGradient id="wr-sg"${gc('wc')} x2="0" y2="1">${vs('0', '0')}${vs('.55', '.45')}${vs('1', '1')}</linearGradient>`
      streaks('wr-r1', 280, 230, deg, q(24 * hk), 10, 18, 0.8, 0.25, r, true) // xa: mảnh, mờ, chậm
      streaks('wr-r2', 370, 320, deg, q(13 * hk), 24, 40, 1.2, 0.46, r, true) // giữa
      streaks('wr-r3', 560, 640, deg, q(5), 50, 90, 1.8, 0.45, r) // gần: dài, đuôi mờ
      css +=
        `.wr-c{stroke:var(--wrc)}` +
        `.wr-sp{fill:none;stroke:var(--wrc);stroke-width:1;stroke-linecap:round;transform-box:fill-box;transform-origin:50% 80%;opacity:0;animation:wr-s .8s ease-out infinite}` +
        // nhịp lệch theo thứ tự bọt trong nhóm wr-s: shorthand SỐ ở trên + longhand SỐ ở đây (không var(); cùng thứ tự, luật sau thắng như bảng cũ)
        `.wr-s>:nth-child(2n){animation-duration:.95s}.wr-s>:nth-child(3n){animation-delay:-.27s}.wr-s>:nth-child(3n+1){animation-delay:-.55s}.wr-s>:nth-child(5n+2){animation-delay:-.12s}.wr-s>:nth-child(7n+3){animation-duration:.7s}` +
        `@keyframes wr-s{0%{transform:scale(.2);opacity:0}8%{opacity:.85}100%{transform:scale(1.5);opacity:0}}`
      // bọt bắn: ba cỡ theo độ sâu (rx 3 ở y≈790 → rx 11 ở y≈980). Ký hiệu TĨNH (wr-p1/wr-p3 = wr-p2 thu/phóng, <use> lồng tĩnh);
      // hoạt ảnh đặt trên <g class="wr-sp"> bọc TỪNG bản sao — fill-box của nhóm = khung của bọt nên vẫn co giãn quanh chân từng bọt.
      // (Hoạt ảnh trong ký hiệu qua <use> lồng nhau thì bản sao đứng im: opacity 0 → bọt không bao giờ hiện.)
      enc += 26 - 21 // bảng nhịp SỐ dài hơn bảng var() cũ 26 ký tự; ký hiệu bọt bỏ vỏ <g class="wr-sp"></g> (21)
      defs += `<g id="wr-p2"><ellipse rx="6" ry="1.4"/><path d="M-2-1l-2-5M2-1l2-5M0-2v-6"/></g><g id="wr-p1" transform="scale(.5)"><use href="#wr-p2"/></g><g id="wr-p3" transform="scale(1.8)"><use href="#wr-p2"/></g>`
      splash = (n: number) => {
        let s = ''
        for (let i = 0; i < n; i += 1) {
          const y = 790 + r() ** 0.8 * 195
          // vỏ <g class="wr-sp"> không style riêng: nhịp lấy từ bảng nth-child của nhóm wr-s (con thứ i của nhóm)
          s += `<g class="wr-sp"><use href="#wr-p${y < 850 ? 1 : y < 925 ? 2 : 3}" x="${R(r() * 1600)}" y="${R(y)}"/></g>`
          enc += 21 // vỏ <g class="wr-sp"></g> chuyển từ ký hiệu ra từng bọt
        }
        return `<g class="wr-s">${s}</g>`
      }
      scr += `<g${rt.a}>${lite ? '' : '<rect y="420" width="1600" height="340" fill="url(#wr-mv)"/>'}${shelter(sheet('wr-r1', 230, 0.62, deg) + sheet('wr-r2', 320, 0.4, deg))}${sheet('wr-r3', 640, 0.36, deg)}${splash(q(12))}</g>`

      const ht = track(s => (s.precip === 'mua-to' ? 1 : 0))
      if (ht.max) {
        streaks('wr-r4', 560, 640, deg, q(8), 80, 130, 2.4, 0.62, r) // mưa to: thêm vệt rất gần, nhanh
        scr += `<g${ht.a}>${sheet('wr-r4', 640, 0.3, deg)}${splash(q(10))}</g>`
      }
    }

    // ── 5. Chớp: tia sét nhánh ở LỚP 0 (mọc từ chân mây y≈150, chạm núi; núi đồi cây cối che đúng chỗ) + quầng sáng mây quanh tia;
    //    cả màn hình loé nhẹ. Thời điểm theo giờ tuyệt đối (hai cửa sổ chồng nhau thấy cùng một tia).
    if (sl.some(s => s.lightning)) {
      const rb = ctx.rng('wr-set-hinh')
      const NB = lite ? 1 : 2
      defs +=
        `<radialGradient id="wr-lr"><stop stop-color="#eef2ff" stop-opacity=".66"/><stop offset=".4" stop-color="#d6deff" stop-opacity=".32"/><stop offset="1" stop-color="#cdd8ff" stop-opacity="0"/></radialGradient>` +
        `<circle id="wr-lc" cy="170" r="760" fill="url(#wr-lr)"/><rect id="wr-lf" width="1600" height="1000" fill="#e9eeff"/>`
      for (let b = 0; b < NB; b += 1) {
        const [d, br] = bolt(rb)
        const u = (c: string) => `<use href="#wr-b${b}" class="wr-g${c}"/>`
        defs += `<g id="wr-b${b}"><path class="wr-bm" d="${d}"/><path class="wr-bb" d="${br}"/></g><g id="wr-B${b}"><use href="#wr-lc"/>${u('1')}${u('2')}${u('3')}</g>`
      }
      css +=
        `.wr-g1,.wr-g2,.wr-g3{fill:none;stroke-linejoin:round;stroke-linecap:round}.wr-g1{stroke:#a9b8ff;stroke-opacity:.6;--w:14px;filter:blur(6px)}.wr-g2{stroke:#f2f5ff;--w:4px}.wr-g3{stroke:#fff;--w:1.8px}` +
        `.wr-bm{stroke-width:var(--w)}.wr-bb{stroke-width:calc(var(--w)*.45)}` +
        `.wr-L,.wr-Lb{opacity:0;animation:wr-L 1.3s linear both;animation-delay:calc(var(--o) - var(--t)*1s)}.wr-L2{animation-name:wr-L2}.wr-Lb{animation-name:wr-Lb}` +
        `@keyframes wr-L{0%,50%,100%{opacity:0}2%{opacity:.2}7%{opacity:.05}12%{opacity:.24}19%{opacity:.08}27%{opacity:.18}38%{opacity:.03}}` +
        `@keyframes wr-L2{0%,40%,100%{opacity:0}3%{opacity:.22}10%{opacity:.05}17%{opacity:.18}}` +
        // nhịp tia: loé · tắt · loé lại · ... rồi DƯ ẢNH .35→.3 trong ~250 ms sau nhịp cuối
        `@keyframes wr-Lb{0%,62%,100%{opacity:0}2%,12%{opacity:1}7%{opacity:.4}19%{opacity:.45}27%{opacity:.95}33%{opacity:.35}52%{opacity:.3}}`
      const B = 26
      let n = 0
      let bolts = ''
      for (const s of sl) {
        if (!s.lightning) continue
        for (let k = Math.floor((nowSec + s.t0) / B); k * B < nowSec + s.t1 && n < q(8); k += 1) {
          const r = ctx.rng(`wr-set-${k}`)
          if (r() > 0.62) continue
          const t = k * B + r() * B - nowSec
          if (t < s.t0 + 3 || t > s.t1 - 2) continue
          const kind = r() * 0.9
          const o = `style="--o:${f(t)}s"`
          scr += `<use href="#wr-lf" class="wr-L${kind < 0.72 ? '' : ' wr-L2'}" ${o}/>`
          // x trong [-940, 120], bản sao cách 1900 (> bề ngang khung lớp 0): luôn thấy đúng MỘT tia, ở bất kỳ đâu trên màn hình.
          // Hai <use> TĨNH (gốc + bản sao) chung một <g class="wr-Lb"> mang hoạt ảnh — không <use> nào sao chép nội dung động.
          const x = R(-940 + r() * 1060)
          const y = R(135 + r() * 40)
          const id = kind < 0.72 ? `wr-B${Math.floor(r() * NB)}` : 'wr-lc'
          const copy = `<use href="#${id}" x="${x + 1900}" y="${y}"/>`
          bolts += `<g class="wr-Lb" ${o}><use href="#${id}" x="${x}" y="${y}"/>${copy}</g>`
          enc += copy.length + 7 // bản sao + vỏ <g></g> (class/style trước nằm trên <use>)
          n += 1
        }
      }
      if (bolts) {
        pieces.push({ layer: 0, x0: -1100, x1: 2300, prio: 6, svg: bolts })
        enc -= 47 // bỏ vỏ cũ <g id="wr-LS">…</g> và <use> sao cả nhóm (x=1900)
      }
    }

    // ── 6. Tuyết: mây thấp che sao (lớp 0) + bốn tầng bông (xa mờ pha sương → rất gần to, mềm), rơi lả lướt lệch pha ──
    const st = track(s => (s.precip === 'tuyet' ? 1 : 0), 30)
    if (st.max) {
      const r = ctx.rng('wr-tuyet')
      const deg = maxOf(sl.filter(s => s.precip === 'tuyet').map(s => s.wind)) * 22
      const c = mix('#2a3348', '#c4cad4', dl)
      defs += `<linearGradient id="wr-sv" gradientUnits="userSpaceOnUse" x2="0" y2="800"><stop stop-color="${c}" stop-opacity=".9"/><stop offset=".7" stop-color="${c}" stop-opacity=".84"/><stop offset=".88" stop-color="${mix(c, '#6a7490', 0.5)}" stop-opacity=".4"/><stop offset="1" stop-color="${c}" stop-opacity=".1"/></linearGradient>`
      pieces.push({ layer: 0, x0: -1200, x1: 2400, prio: 7, svg: `<rect x="-1200" y="-300" width="3600" height="1500" fill="url(#wr-sv)"${st.a}/>` })
      let p = ''
      for (const [w, n] of [[2, 12], [3, 7]] as Pt[]) {
        let d = ''
        for (let i = 0; i < q(n); i += 1) d += `M${R(w + r() * (260 - 2 * w))} ${R(w + r() * (250 - 2 * w))}h0`
        p += `<path stroke-width="${w}" d="${d}"/>`
      }
      pat('wr-n1', 260, 250, deg, p, ' class="wr-n"')
      const flakes = (id: string, tw: number, th: number, n: number, r0: number, r1: number, k: number, grad: string) => {
        let s = ''
        for (let i = 0; i < q(n); i += 1) {
          const rr = R(r0 + r() * (r1 - r0))
          const ry = R(rr * k)
          s += k > 1 ? `<ellipse cx="${R(rr + r() * (tw - 2 * rr))}" cy="${R(ry + r() * (th - 2 * ry))}" rx="${rr}" ry="${ry}"/>` : `<circle cx="${R(rr + r() * (tw - 2 * rr))}" cy="${R(rr + r() * (th - 2 * rr))}" r="${rr}"/>`
        }
        pat(id, tw, th, deg, s, ` fill="url(#${grad})"`)
      }
      const sg = (id: string, a: string, b: string) => `<radialGradient id="${id}"${gc('sc')}>${so(a, b)}${so('1', '0')}</radialGradient>`
      // mây tuyết hắt sáng mờ (bầu trời đêm tuyết đục, sáng hơn đêm quang): phủ SAU lớp tô màu đêm nên không bị dìm tối
      defs += `${sg('wr-sf', '.3', '.95') + sg('wr-sh', '0', '.6')}<linearGradient id="wr-sz" x2="0" y2="1"><stop stop-color="${mix('#8f97b8', '#e8ecf2', dl)}" stop-opacity=".2"/><stop offset=".7" stop-color="${mix('#8f97b8', '#e8ecf2', dl)}" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity=".04"/></linearGradient>`
      flakes('wr-n2', 400, 360, 9, 3, 5, 1.3, 'wr-sf')
      flakes('wr-n3', 720, 640, 4, 8, 13, 1.4, 'wr-sf') // gần: kéo dài theo chiều rơi
      flakes('wr-n4', 900, 800, 3, 14, 18, 1.4, 'wr-sh') // rất gần: to, mềm như nhoè nét
      css += `.wr-n path{fill:none;stroke:color-mix(in srgb,var(--wsc) 70%,var(--haze));stroke-opacity:.35;stroke-linecap:round}.wr-w{animation:wr-w var(--d) ease-in-out infinite alternate;animation-delay:calc(var(--o) - var(--t)*1s)}@keyframes wr-w{from{transform:translateX(calc(var(--a)*-1))}to{transform:translateX(var(--a))}}`
      const sway = (a: number, per: number, inner: string) => `<g class="wr-w" style="--a:${a}px;--d:${per}s;--o:${ph(2 * per, r)}s">${inner}</g>`
      scr +=
        `<g${st.a}><rect width="1600" height="1000" fill="url(#wr-sz)"/>` +
        sway(14, 6.4, sheet('wr-n1', 250, 13, deg, 16)) +
        sway(18, 8.2, sheet('wr-n1', 250, 15, deg, 20, ';animation-delay:-6.1s')) +
        sway(28, 5.3, sheet('wr-n2', 360, 8, deg, 30)) +
        sway(36, 7.1, sheet('wr-n2', 360, 9.5, deg, 38, ';animation-delay:-3.7s')) +
        sway(60, 4.6, sheet('wr-n3', 640, 6.5, deg, 62)) +
        `<g opacity=".5">${sway(80, 3.9, sheet('wr-n4', 800, 5, deg, 84))}</g>` +
        `</g>`
    }

    if (usedSheet) css += `.wr-y{animation:wr-y var(--d) linear infinite}@keyframes wr-y{to{transform:translate(var(--k),var(--h))}}`

    // ── Ngân sách: các lớp trên luôn vẽ; các lớp dưới đây là "phụ", chỉ nhận khi còn chỗ (thử đủ → một nửa → bỏ).
    //    Thứ tự = ưu tiên: giọt từ tán · gợn vũng · hạt mùa · sương muối · vệt gió · cột mưa xa · màn mưa lướt.
    const BUDGET = lite ? 6500 : 9000
    const used = () => defs.length + css.length + scr.length + pieces.reduce((n, p) => n + p.svg.length + 8, 0) - wide.real + wide.est - enc
    const optional = (fn: (k: number) => void) => {
      for (const k of [1, 0.5]) {
        const snap = { defs, css, scr, n: pieces.length, kf: [...kfs], soft: hasSoft, wide, enc }
        fn(k)
        if (used() <= BUDGET) return
        defs = snap.defs
        css = snap.css
        scr = snap.scr
        pieces.length = snap.n
        kfs.clear()
        for (const [x, y] of snap.kf) kfs.set(x, y)
        hasSoft = snap.soft
        wide = snap.wide
        enc = snap.enc
      }
    }

    // ── 7. Nhỏ giọt từ mép tán đa khi mưa và còn ~2 phút sau khi tạnh (giọt rơi xuống đất rồi bắn vòng nhỏ) ──
    optional(k => {
      const pts: Pt[] = [[0, isWet(first) || ctx.wet > 0.6 ? 1 : 0]]
      if (!isWet(first) && ctx.wet > 0.6) pts.push([60, 1], [150, 0])
      for (let i = 1; i < sl.length; i += 1) {
        const a = isWet(sl[i - 1] as WeatherSlice)
        const b = isWet(sl[i] as WeatherSlice)
        if (a === b) continue
        const t = (sl[i] as WeatherSlice).t0
        const last = (pts[pts.length - 1] as Pt)[0]
        if (b) pts.push([Math.max(t, last + 0.5), 0], [Math.max(t + 25, last + 1), 1])
        else pts.push([Math.max(t + 60, last + 0.5), 1], [Math.max(t + 160, last + 1), 0])
      }
      const dp = anim(pts)
      if (!dp.max) return
      const r = ctx.rng('wr-giot')
      enc += 52 - 98 // CSS giọt: hai shorthand riêng (+52); bỏ ký hiệu <g id="wr-dq"> (98)
      // giọt + vòng bắn vẽ TẠI CHỖ (hai hoạt ảnh khác nhau trên hai hình nhỏ — không qua <use>: nội dung được <use> phải tĩnh);
      // mỗi luật có shorthand riêng (không ghi đè animation-name của shorthand có var() ở luật khác)
      css +=
        `.wr-dp{fill:#f4f8ff;stroke:#283048;stroke-opacity:.3;stroke-width:.5;animation:wr-dp var(--dd) linear infinite;animation-delay:calc(var(--o) - var(--t)*1s)}` +
        `.wr-dr{fill:none;stroke:var(--wrc);stroke-width:.8;transform-box:fill-box;transform-origin:50% 50%;animation:wr-dr var(--dd) linear infinite;animation-delay:calc(var(--o) - var(--t)*1s)}` +
        `@keyframes wr-dp{0%{transform:translateY(0);opacity:0}30%{transform:translateY(0);opacity:.9;animation-timing-function:ease-in}52%{transform:translateY(var(--h));opacity:.9}53%,100%{transform:translateY(var(--h));opacity:0}}` +
        `@keyframes wr-dr{0%,52%{transform:translateY(var(--h)) scale(.2);opacity:0}54%{opacity:.8}76%,100%{transform:translateY(var(--h)) scale(1.6);opacity:0}}`
      const DQ = '<ellipse class="wr-dp" rx="1.6" ry="3"/><ellipse class="wr-dr" rx="7" ry="1.6"/>'
      for (const [a, b, y, s0, s1] of SHELTERS) {
        let g = ''
        for (let i = 0, n = q(11 * k); i < n; i += 1) {
          let x = a + 30 + r() * (b - a - 60 - (s1 - s0))
          if (x > s0) x += s1 - s0
          const y0 = R(y - 10 + r() * 22)
          const per = f(2 + r() * 2.4)
          g += `<g transform="translate(${R(x)} ${y0})" style="--h:${R(ground(x) + 4 + r() * 40 - y0)}px;--dd:${per}s;--o:${ph(Number(per), r)}s">${DQ}</g>`
          enc += DQ.length + 2 // hình giọt chép tại chỗ thay <use href="#wr-dq" x y>
        }
        pieces.push({ layer: 3, x0: a - 20, x1: b + 20, prio: 4, svg: `<g${dp.a}>${g}</g>` })
      }
    })

    // ── 7b. Mưa to: thêm bọt bắn dày ở tiền cảnh ──
    optional(k => {
      const ht = track(s => (s.precip === 'mua-to' ? 1 : 0))
      if (ht.max) scr += `<g${ht.a}>${splash(q(14 * k))}</g>`
    })

    // ── 8. Mưa rơi trên vũng nước có sẵn (cay-da vẽ vũng khi đất ướt): vòng gợn lan ra ──
    optional(() => {
      if (!rt.max || ctx.wet <= 0.25) return
      const r = ctx.rng('wr-vung')
      let g = ''
      for (const [x, y, a, b] of PUDDLES) {
        for (let i = 0; i < (a > 25 ? 4 : 2); i += 1) g += `<ellipse cx="${R(x - a * 0.55 + r() * a * 1.1)}" cy="${R(y - b * 0.3 + r() * b * 0.6)}" rx="${R(4 + r() * a * 0.18)}" ry="${f(1 + r() * b * 0.2)}" style="--o:${f(-r() * 1.2, 2)}s"/>`
      }
      css += `.wr-rp ellipse{fill:none;stroke:var(--wrc);stroke-width:.7;transform-box:fill-box;transform-origin:50% 50%;opacity:0;animation:wr-rp 1.2s ease-out infinite;animation-delay:var(--o)}@keyframes wr-rp{0%{transform:scale(.2);opacity:.9}100%{transform:scale(1.5);opacity:0}}`
      pieces.push({ layer: 3, x0: Math.min(...PUDDLES.map(p => p[0] - p[2])) - 10, x1: Math.max(...PUDDLES.map(p => p[0] + p[2])) + 10, prio: 4, svg: `<g${rt.a}><g class="wr-rp">${g}</g></g>` })
    })

    // ── 9. Hạt theo mùa (chỉ khi không mưa): rụng từ dải tán (y 150–450, hiện dần) hoặc bị gió cuốn từ mép trái vào khung ──
    optional(kk => {
      const ct = track(s => (s.precip === 'khong' ? 1 : 0), 60, 0)
      const season = ctx.season
      if (!ct.max || clearK <= 0.6 || season === 'dong' || (season === 'ha' && dl <= 0.45)) return
      const r = ctx.rng(`wr-hat-${season}`)
      const wind = maxOf(sl.filter(s => s.precip === 'khong').map(s => s.wind))
      const gust = wind > 0.6
      type Place = { x: number; y: number; w: number; e: number }
      // ex: bộ phận động riêng vẽ cạnh ký hiệu TĨNH, cùng nhóm lộn/xoay (nội dung được <use> không mang hoạt ảnh)
      type Kind = { sym: string; cls: () => string; n: number; d: Pt; s: Pt; ic: string; div: number; place: () => Place; ex?: string }
      const fall = (w0: number): Place => {
        if (gust || r() < 0.25) {
          const y = 200 + r() * 450
          return { x: -60, y, w: 1760 + r() * 200, e: y + 300 + r() * 200 }
        }
        return { x: -100 + r() * 1600, y: 150 + r() * 300, w: w0 + wind * 600 + r() * 120, e: 800 + r() * 180 }
      }
      let kinds: Kind[]
      let tint: string[] = []
      if (season === 'xuan') {
        // cánh đào rời (3 sắc độ) + vài cụm 2–3 cánh dính nhau xoay lệch 25–40°
        defs +=
          `<g id="wr-pe"><path d="M-6 1C-5-4 1-6 6-3L5-1l2 1C4 5-2 6-6 1z"/><path class="hl" d="M-4 0c2-3 5-3 7-2-3 0-5 1-7 2z"/><path class="sh" d="M-6 1c2-1 4-1 5 0-2 1-3 1-5 0z"/></g>` +
          `<g id="wr-pc"><use href="#wr-pe"/><use href="#wr-pe" transform="rotate(34)translate(4 3)"/><use href="#wr-pe" transform="rotate(-28)translate(3-4)"/></g>`
        css += `@keyframes wr-i0{0%{transform:translateX(-22px) rotate(-40deg) scale(var(--s))}50%{transform:translateX(0) rotate(15deg) scale(var(--s),calc(var(--s)*.25))}100%{transform:translateX(24px) rotate(70deg) scale(var(--s))}}`
        kinds = [
          { sym: 'wr-pe', cls: () => (r() < 0.2 ? 'f3' : 'f1'), n: 20, d: [15, 27], s: [0.9, 2.6], ic: 'wr-i0', div: 6, place: () => fall(260) },
          { sym: 'wr-pc', cls: () => 'f1', n: 3, d: [17, 24], s: [0.8, 1.1], ic: 'wr-i0', div: 6, place: () => fall(260) },
        ]
        tint = ['f1', 'f3']
      } else if (season === 'thu') {
        // lá bất đối xứng: thân · mảng khuất dưới-phải · vệt sáng trên-trái · gân sáng mảnh; lộn mặt (scaleX 1→-1) thấy mặt dưới sáng hơn.
        // Thân lá wr-lb dùng chung: trong ký hiệu tĩnh wr-lv và làm lớp loé mặt dưới (wr-ub) đặt TRÊN lá ở từng chỗ dùng.
        const lf = 'M0 8C6 6 8-3 2-10C-3-7-6 0-4 5C-3 7-1 8 0 8z'
        enc -= 39 // ký hiệu lá: thân wr-lb dùng chung thay hai bản chép đường lá
        defs += `<path id="wr-lb" d="${lf}"/><g id="wr-lv"><use href="#wr-lb"/><path class="sh" style="opacity:.32" d="M0 8C6 6 8-3 2-10C3-4 2 2 0 8z"/><path class="hl" d="M-1-7C-4-4-5 1-3 4C-3 0-2-4-1-7z"/><path class="z3" style="stroke-width:.5;opacity:.4" d="M0 7C1 2 2-3 2-8M1 2.6l3-2M1.6-1.5l2.4-2.4M.7 3.4L-2.4 1.8M1.2-.6L-1.6-2.6"/></g>`
        css +=
          `@keyframes wr-i1{0%{transform:translate(-48px,-12px) rotate(-40deg) scale(var(--s));animation-timing-function:ease-in}50%{transform:translate(0,10px) rotate(0) scale(calc(var(--s)*-1),var(--s));animation-timing-function:ease-out}100%{transform:translate(48px,-12px) rotate(40deg) scale(var(--s))}}` +
          `.wr-ub{fill:#fff;opacity:0;animation:wr-ub calc(var(--d)/8) ease-in-out infinite alternate;animation-delay:calc(var(--o) - var(--t)*1s)}@keyframes wr-ub{50%{opacity:.28}}`
        kinds = [{ sym: 'wr-lv', cls: () => ['l1', 'l2', 'l2', 'l3'][Math.floor(r() * 4)] ?? 'l2', n: 15, d: [13, 22], s: [0.9, 2.3], ic: 'wr-i1', div: 8, place: () => fall(140), ex: '<g class="wr-ub"><use href="#wr-lb"/></g>' }]
        tint = ['l1', 'l2', 'l3']
      } else {
        // hạ: phấn nắng lơ lửng trong vùng tán & vệt nắng (không trên trời) + bồ công anh bay lên lắc nhẹ
        defs +=
          `<radialGradient id="wr-mg"><stop stop-color="#fff3c4" stop-opacity=".5"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>` +
          `<g id="wr-mo"><circle r="7" fill="url(#wr-mg)"/><circle r="2" fill="#fff3c4" opacity=".9"/></g>` +
          `<g id="wr-dn"><path class="wr-dl" d="M0 0l-6-2M0 0l-5-4M0 0l-2-6M0 0l2-6M0 0l5-4M0 0l6-2M0 0v9"/><path class="wr-dq" d="M0 9v3"/></g>`
        css +=
          `.wr-dl,.wr-dq{fill:none;stroke:var(--f3);stroke-width:1;stroke-linecap:round}.wr-dq{stroke:var(--d1);stroke-width:1.5}` +
          `@keyframes wr-i2{from{transform:translateY(-8px) scale(var(--s));opacity:.3}to{transform:translateY(8px) scale(var(--s));opacity:1}}` +
          `@keyframes wr-i3{from{transform:translateY(-14px) rotate(-12deg) scale(var(--s))}to{transform:translateY(14px) rotate(14deg) scale(var(--s))}}`
        kinds = [
          { sym: 'wr-mo', cls: () => '', n: 16, d: [30, 50], s: [1, 1.5], ic: 'wr-i2', div: 7, place: () => { const y = 300 + r() * 450; return { x: 300 + r() * 1000, y, w: 120 + wind * 200, e: y - 90 } } },
          { sym: 'wr-dn', cls: () => '', n: 7, d: [44, 70], s: [1, 1.8], ic: 'wr-i3', div: 8, place: () => { const y = 350 + r() * 450; return { x: -60 + r() * 300, y, w: 1300 + wind * 300, e: y - 170 } } },
        ]
      }
      let g = ''
      for (const k of kinds) {
        for (let i = 0, m = q(k.n * clearK * kk); i < m; i += 1) {
          const u = r() ** 2
          const s = k.s[0] + u * (k.s[1] - k.s[0])
          const d = R(k.d[1] - u * (k.d[1] - k.d[0]) + (r() - 0.5) * 4)
          const p = k.place()
          const near = season !== 'ha' && u > 0.8
          const c = k.cls()
          // hoạt ảnh lộn/xoay trên <g> bọc ký hiệu (không đặt trên <use>): fill-box của nhóm = khung hạt → tâm xoay như cũ
          g += `<g${near ? ' class="wr-bl"' : ''} style="--x:${R(p.x)};--y:${R(p.y)};--w:${R(p.w)};--e:${R(p.e)};--s:${f(s)};--d:${d}s;--o:${ph(d, r)}s"><g class="${k.ic}${c ? ` ${c}` : ''}"><use href="#${k.sym}"/>${k.ex ?? ''}</g></g>`
          enc += 7 + (k.ex?.length ?? 0) // vỏ <g></g> (class trước nằm trên <use>) + bộ phận động tách khỏi ký hiệu
        }
      }
      css +=
        `.wr-P>g{animation:wr-pa var(--d) linear infinite;animation-delay:calc(var(--o) - var(--t)*1s)}` +
        `@keyframes wr-pa{0%{transform:translate(calc(var(--x)*1px),calc(var(--y)*1px));opacity:0}6%,93%{opacity:1}100%{transform:translate(calc(var(--x)*1px + var(--w)*1px),calc(var(--e)*1px));opacity:0}}` +
        `.wr-P>g>g{transform-box:fill-box;transform-origin:50% 50%;animation:none ease-in-out infinite alternate;animation-delay:calc(var(--o) - var(--t)*1s)}` +
        kinds.filter((k, i, a) => a.findIndex(o => o.ic === k.ic) === i).map(k => `.wr-P .${k.ic}{animation-name:${k.ic};animation-duration:calc(var(--d)/${k.div})}`).join('') +
        `.wr-bl{filter:blur(1.4px);opacity:.8}`
      // Đêm: hạt chìm vào bóng tối; chiều tà/rạng đông: hắt ánh cam ấm.
      const h = ctx.vn.hourF
      const golden = dl > 0.15 && dl < 0.98 && (h > 15 || h < 9)
      const pct = golden ? 76 : R(30 + 70 * dl)
      if (pct < 97) for (const c of tint) css += `.wr-P .${c}{fill:color-mix(in srgb,var(--${c}) ${pct}%,${golden ? '#ff9a4c' : '#141a33'})}`
      scr += `<g${ct.a}><g class="wr-P">${g}</g></g>`
    })

    // ── 10. Đông: sương muối đọng trên ngọn cỏ lúc sáng sớm (5h–9h30), tan dần khi nắng lên; không mưa ──
    optional(() => {
      const h = ctx.vn.hourF
      const fk = ctx.season === 'dong' ? smooth(4.5, 6, h) * (1 - smooth(8.4, 9.6, h)) : 0
      const ct = track(s => (s.precip === 'khong' ? fk : 0), 60)
      if (ct.max < 0.05) return
      const r = ctx.rng('wr-suongmuoi')
      let d = ''
      for (let i = 0; i < 11; i += 1) d += `M${R(2 + r() * 156)} ${R(2 + r() * 52)}h0`
      let d2 = ''
      for (let i = 0; i < 4; i += 1) d2 += `M${R(2 + r() * 156)} ${R(2 + r() * 52)}h0`
      defs += `<pattern id="wr-fr" width="160" height="56" patternUnits="userSpaceOnUse"><path style="stroke:var(--wsc)" stroke-linecap="round" stroke-width="1.3" stroke-opacity=".5" d="${d}"/><path style="stroke:var(--wsc)" stroke-linecap="round" stroke-width="1" stroke-opacity=".8" d="${d2}"/></pattern>`
      const list: Piece[] = []
      for (let x = -400; x < 18400; x += 1200) {
        if (NO_GRASS.some(([a, b]) => x + 1200 > a && x < b)) continue
        const top: Pt[] = []
        let low = 0
        for (let xx = x; xx <= x + 1200; xx += 300) {
          const y = ground(xx) + 5
          top.push([xx, y])
          low = Math.max(low, y)
        }
        list.push({ layer: 3, x0: x, x1: x + 1200, prio: 3, svg: `<path fill="url(#wr-fr)"${ct.a} d="${smoothPath(top)}L${x + 1200} ${R(low + 260)}H${x}Z"/>` })
      }
      addWide(list, 6)
    })

    // ── 11. Gió mạnh: vệt gió mảnh dài trên trời (y 100–450) lướt qua ──
    optional(k => {
      const wt = track(s => (s.wind > 0.6 && s.precip === 'khong' ? clamp((s.wind - 0.45) / 0.45, 0, 1) : 0), 30)
      if (!wt.max || clearK <= 0.6) return
      const r = ctx.rng('wr-gio')
      soft()
      defs += `<path id="wr-wl" d="M0 0c80-14 160 8 250-2s150-14 210 4"/>`
      css += `.wr-wi{fill:none;stroke:url(#wr-hg);stroke-opacity:${f(0.18 + 0.1 * dl, 2)};stroke-width:1.2;stroke-linecap:round;animation:wr-wi var(--d) linear infinite;animation-delay:calc(var(--o) - var(--t)*1s)}@keyframes wr-wi{0%{transform:translateX(-520px);opacity:0}8%,44%{opacity:1}55%,100%{transform:translateX(1700px);opacity:0}}`
      let g = ''
      for (let i = 0; i < q(5 * k); i += 1) {
        const d = R(9 + r() * 9)
        g += `<use href="#wr-wl" class="wr-wi" y="${R(100 + r() * 350)}" style="--d:${d}s;--o:${ph(d, r)}s"/>`
      }
      scr += `<g${wt.a}>${g}</g>`
    })

    // ── 12. Cột mưa xa (lớp 1): màn mưa xám treo dưới chân mây trên dãy núi trước khi cơn rào tới, và sau khi đã qua ──
    optional(k => {
      const sh = track(s => (isRain(s) ? 1 : 0), 150, 1)
      if (!sh.max) return
      const r = ctx.rng('wr-cot')
      const lean = R(50 + maxOf(sl.map(s => s.wind)) * 190)
      defs += `<linearGradient id="wr-vs" x2="0" y2="1"><stop stop-color="#678" stop-opacity="0"/><stop offset=".6" stop-color="#678" stop-opacity=".6"/><stop offset="1" stop-color="#678" stop-opacity="0"/></linearGradient>`
      const list: Piece[] = []
      for (let x = 60 + r() * 300; x < 3300; x += (640 + r() * 420) / k) {
        let d = ''
        const yt = R(250 + r() * 40)
        for (let j = 0, m = q(5); j < m; j += 1) d += `M${R(x + j * 26 + r() * 16)} ${yt + R(r() * 30)}l${lean} 390`
        list.push({ layer: 1, x0: R(x - 20), x1: R(x + 200 + lean), prio: 2, svg: `<g${sh.a}><path d="${d}" fill="none" stroke="url(#wr-vs)" stroke-width="${R(14 + r() * 10)}" opacity=".32"/></g>` })
      }
      addWide(list, 4)
    })

    // ── 13. Mưa to: màn mưa bị gió quất lướt ngang (mép mềm mọi phía, tắt hẳn trước tiền cảnh) ──
    optional(k => {
      const ht = track(s => (s.precip === 'mua-to' ? 1 : 0))
      if (!ht.max) return
      const r = ctx.rng('wr-man')
      defs += `<radialGradient id="wr-hr"${gc('wc')} cy=".3" r=".5">${so('0', '.9')}${so('.5', '.4')}${so('1', '0')}</radialGradient>`
      css += `.wr-cu{animation:wr-cu var(--d) linear infinite;animation-delay:calc(var(--o) - var(--t)*1s)}@keyframes wr-cu{from{transform:translateX(-900px)}to{transform:translateX(2300px)}}`
      let cu = ''
      for (let i = 0; i < q(2 * k); i += 1) {
        const d = R(12 + r() * 9)
        cu += `<rect class="wr-cu" y="-60" width="${R(500 + r() * 300)}" height="1060" fill="url(#wr-hr)" opacity=".1" transform="skewX(${f(deg)})" style="--d:${d}s;--o:${ph(d, r)}s"/>`
      }
      scr += `<g${ht.a}>${cu}</g>`
    })

    const GV = { hz: 'haze', wc: 'wrc', sc: 'wsc' } as const
    for (const c of gcls) css += `.wr-${c} stop{stop-color:var(--${GV[c as keyof typeof GV]})}`
    return { out: { screen: scr, pieces, defs, css }, n: used() }
}

export const weather: WeatherModule = {
  build(ctx: Ctx) {
    // phần lõi (mưa, chớp, tuyết, sương) vượt trần → dựng lại thưa hơn; phần phụ tự co trong optional()
    const budget = ctx.detail === 'lite' ? 6500 : 9000
    let last = make(ctx, 1)
    for (const dens of [0.78, 0.6, 0.45, 0.32]) {
      if (last.n <= budget) break
      last = make(ctx, dens)
    }
    return last.out
  },
}
