// Ghép thế giới thành MỘT SVG cho cửa sổ thời gian [now, now+span]: camera parallax 5 lớp, cắt phần camera
// không tới, giữ trong ngân sách ký tự của engine (131 072), tô màu theo giờ, lớp phát sáng ban đêm, thời tiết.
import { camAt, camPlan, camSamples, type Cam } from './camera'
import { LOOP_CLASSES, paletteCss, timeLook } from './palette'
import { daylightOf, moonPhase, season as seasonOf, sunAltitude, tietKhi, vnTime } from './time'
import { CY0, LAYER_F, VH, VW, clamp, ground, makeNoise, mix, rng, smoothPath, type Pt } from './util'
import { weatherTimeline, type WeatherOverride } from './weather-model'
import type { ActorsModule, Ctx, Detail, Layer, MidModule, Piece, Region, Season, Shot, SkyModule, Spot, WeatherModule } from './types'

export type Modules = { regions: Region[]; sky: SkyModule; mid: MidModule; weather: WeatherModule; actors: ActorsModule }

export type ComposeOpts = {
  /** Epoch ms đầu cửa sổ. */
  now: number
  /** Giây; mặc định 600 nếu không truyền (mod truyền SPAN_S = 180 và vẽ lại mỗi SHOWN_S = 120). */
  span?: number
  detail?: Detail
  weather?: WeatherOverride
  season?: Season
  /** Camera đứng yên (xem trước một cảnh). */
  freeze?: Cam
  /** Trần ký tự; mặc định 130 000 (đo thật: luôn thấp hơn ước lượng ~2k; trần engine 131 072). */
  budget?: number
  /** Số giây đầu cửa sổ chắc chắn được hiển thị (mod vẽ lại trước khi hết); sau đó chỉ là dự phòng. Mặc định 90% span. */
  shown?: number
}

export type ComposeStats = {
  chars: number
  pieces: number
  dropped: number
  /** Số mảnh nhìn thấy được nhưng bị bỏ vì ngân sách ký tự. */
  cut: number
  /** Tỉ lệ nội dung LÊN HÌNH (ký tự × thời lượng lên hình) bị cắt vì ngân sách, 0..1. */
  lost: number
  byModule: Record<string, number>
  errors: string[]
  shots: string[]
}

const CLOUD_K = { quang: 0, it: 0.15, vua: 0.4, nhieu: 0.7, 'u-am': 1 } as const

export function makeCtx(opts: ComposeOpts): Ctx {
  const span = opts.span ?? 600
  const vn = vnTime(opts.now)
  const s = seasonOf(vn)
  const sunAlt = sunAltitude(vn.doy, vn.hourF)
  const tl = weatherTimeline(opts.now, span, opts.weather)
  const nowSec = opts.now / 1000
  return {
    now: opts.now,
    span,
    vn,
    season: opts.season ?? s.season,
    seasonT: s.seasonT,
    tietKhi: tietKhi(vn),
    sunAlt,
    daylight: daylightOf(sunAlt),
    moonPhase: moonPhase(opts.now),
    weather: tl.slices,
    cur: tl.slices[0] as Ctx['cur'],
    wet: tl.wet,
    detail: opts.detail ?? 'full',
    rng: key => rng(`the-gioi:${key}`),
    noise: key => makeNoise(`the-gioi:${key}`),
    ph: (period, key = '') => {
      const off = ((nowSec + (key ? (rng(key)() * period) : 0)) % period).toFixed(2)
      return `calc(-${off}s - var(--t)*1s)`
    },
  }
}

const CORE_DEFS =
  `<linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky0)"/><stop offset=".55" style="stop-color:var(--sky1)"/><stop offset="1" style="stop-color:var(--sky2)"/></linearGradient>` +
  `<linearGradient id="hzg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--haze)" stop-opacity="0"/><stop offset=".62" style="stop-color:var(--haze)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--haze)" stop-opacity=".35"/></linearGradient>` +
  `<radialGradient id="gw"><stop offset="0" stop-color="#ffd890" stop-opacity=".75"/><stop offset=".4" stop-color="#ffb860" stop-opacity=".22"/><stop offset="1" stop-color="#ff9a40" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="gc"><stop offset="0" stop-color="#c8f0ff" stop-opacity=".7"/><stop offset=".45" stop-color="#80c8ff" stop-opacity=".2"/><stop offset="1" stop-color="#60a0ff" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="gg"><stop offset="0" stop-color="#e8ffb0" stop-opacity=".85"/><stop offset=".4" stop-color="#a8ff80" stop-opacity=".25"/><stop offset="1" stop-color="#60ff90" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="vig" cx=".5" cy=".46" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#1a1030" stop-opacity=".32"/></radialGradient>` +
  // Bóng tiền cảnh: đáy khung đậm & lạnh dần (tách gần/xa, làm nền cho ô nhập chat).
  `<linearGradient id="fgg" x2="0" y2="1"><stop offset=".5" style="stop-color:var(--fg)" stop-opacity="0"/><stop offset=".8" style="stop-color:var(--fg)" stop-opacity=".55"/><stop offset="1" style="stop-color:var(--fg)"/></linearGradient>` +
  // Màn lặng giữa khung: phủ rất nhẹ màu sương sau cột chat → giảm tương phản đúng chỗ mắt đọc chữ.
  `<radialGradient id="veil" cx=".5" cy=".45" r=".52"><stop offset="0" style="stop-color:var(--haze)" stop-opacity=".24"/><stop offset=".55" style="stop-color:var(--haze)" stop-opacity=".13"/><stop offset="1" style="stop-color:var(--haze)" stop-opacity="0"/></radialGradient>` +
  // Vân giấy: nhiễu tĩnh, vẽ MỘT lần (không hoạt ảnh) → chất liệu tranh in, chi tiết mịn biên độ thấp.
  `<filter id="grn" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix values=".33 .33 .33 0 0 .33 .33 .33 0 0 .33 .33 .33 0 0 0 0 0 0 1"/></filter>`

/** Mặt đất nền lớp 3: MỘT mảnh liền phủ đúng dải camera nhìn thấy (chia khúc gây vạch nối do khử răng cưa chồng nhau). */
function groundPiece(xa: number, xb: number): Piece {
  const a = Math.floor(xa / 51) * 51
  const b = Math.ceil(xb / 51) * 51
  const top: Pt[] = []
  for (let x = a; x <= b; x += 51) top.push([x, ground(x)])
  const band = (dy: number) => `${smoothPath(top.map(([x, y]) => [x, y + dy] as Pt))}L${b} 1500L${a} 1500Z`
  return {
    layer: 3,
    x0: a,
    x1: b,
    prio: 10,
    svg: `<path class="g2" d="${band(0)}"/><path class="g3" d="${band(58)}"/><path class="g4" d="${band(190)}"/><path class="z3" opacity=".3" d="${smoothPath(top.map(([x, y]) => [x, y + 4] as Pt))}"/>`,
  }
}

// ───────────── defs: tách phần tử cấp cao, rung cây theo tham chiếu (chỉ giữ cái thật sự được dùng) ─────────────
export type DefEl = { text: string; ids: string[]; refs: string[] }
const REF_RE = /(?:href=["']#|url\(\s*["']?#)([^"')\s]+)/g
const refsOf = (text: string) => Array.from(text.matchAll(REF_RE), m => m[1] as string)

/** Tách chuỗi defs thành các phần tử cấp cao (theo cân bằng thẻ). */
export function splitDefs(defs: string): DefEl[] {
  const out: DefEl[] = []
  const tag = /<(\/?)([A-Za-z][\w:.-]*)\b[^>]*?(\/?)>/g
  let depth = 0
  let start = 0
  for (let m = tag.exec(defs); m; m = tag.exec(defs)) {
    const closing = m[1] === '/'
    const selfClose = m[3] === '/'
    if (depth === 0 && !closing) start = m.index
    if (closing) depth -= 1
    else if (!selfClose) depth += 1
    if (depth < 0) throw new Error('defs lệch thẻ')
    if (depth === 0) {
      const text = defs.slice(start, tag.lastIndex)
      out.push({ text, ids: Array.from(text.matchAll(/\bid="([^"]+)"/g), x => x[1] as string), refs: refsOf(text) })
    }
  }
  if (depth !== 0) throw new Error('defs thiếu thẻ đóng')
  return out
}

/** Giữ các phần tử defs được tham chiếu (bắc cầu) từ `roots`. Phần tử không có id luôn giữ. */
export function shakeDefs(els: DefEl[], roots: string[]): string {
  const owner = new Map<string, number>()
  els.forEach((e, i) => {
    for (const id of e.ids) owner.set(id, i)
  })
  const keep = new Set<number>()
  els.forEach((e, i) => {
    if (!e.ids.length) keep.add(i)
  })
  const queue = roots.flatMap(refsOf)
  while (queue.length) {
    const i = owner.get(queue.pop() as string)
    if (i === undefined || keep.has(i)) continue
    keep.add(i)
    queue.push(...(els[i] as DefEl).refs)
  }
  return els.filter((_, i) => keep.has(i)).map(e => e.text).join('')
}

// ───────────── hoạt ảnh phải chạy được trên compositor ─────────────
// Đo vi mô (công cụ đo nội bộ, không kèm repo): transform/opacity trên phần tử thường → compositor (luồng chính ~0%). Ba thứ kéo về LUỒNG CHÍNH
// và buộc dựng lại cả SVG mỗi khung: hoạt ảnh đặt thẳng trên <use>, hoạt ảnh thuộc tính khác transform/opacity (fill,
// stroke-dashoffset…). Lõi tự sửa loại 1 (bọc <use> trong <g>), báo loại 2 để module sửa.
const OK_KF_PROPS = new Set(['transform', 'opacity', 'offset', 'animation-timing-function'])

/** Tên class có hoạt ảnh (từ các luật CSS có `animation`), và các keyframes dùng thuộc tính không chạy được trên compositor. */
export function animAudit(css: string): { animated: Set<string>; slow: string[] } {
  const animated = new Set<string>()
  const flat = css.replace(/@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*\s*\}/g, '')
  for (const m of flat.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    if (!/animation(?:-name)?\s*:/.test(m[2] as string) || /animation\s*:\s*none/.test(m[2] as string)) continue
    for (const c of (m[1] as string).matchAll(/\.([A-Za-z_][\w-]*)/g)) animated.add(c[1] as string)
  }
  const slow: string[] = []
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)) {
    const bad = new Set<string>()
    for (const d of (m[2] as string).matchAll(/([a-z-]+)\s*:/g)) if (!OK_KF_PROPS.has(d[1] as string)) bad.add(d[1] as string)
    if (bad.size) slow.push(`${m[1]}(${[...bad].join('+')})`)
  }
  return { animated, slow }
}

/** Vùng chứa không vẽ trực tiếp (mask/clipPath/pattern/marker) mà bên trong có phần tử mang hoạt ảnh: hoạt ảnh đó KHÔNG lên
 *  compositor được, kéo cả tài liệu vẽ lại mỗi khung. Trả về danh sách "thẻ#id" vi phạm. */
export function hiddenAnim(svg: string, animated: Set<string>): string[] {
  const out: string[] = []
  for (const m of svg.matchAll(/<(mask|clipPath|pattern|marker)\b([^>]*)>([\s\S]*?)<\/\1>/g))
    if (hasAnim(m[3] as string, animated)) out.push(`${m[1]}#${/id="([^"]+)"/.exec(m[2] as string)?.[1] ?? '?'}`)
  return out
}

const hasAnim = (svg: string, animated: Set<string>) =>
  /style="[^"]*animation/.test(svg) ||
  Array.from(svg.matchAll(/class="([^"]+)"/g)).some(c => (c[1] as string).split(/\s+/).some(k => animated.has(k)))

/** Cây con của phần tử bắt đầu tại `start` (cân bằng thẻ). */
function subtree(svg: string, start: number): string {
  const tag = /<(\/?)([A-Za-z][\w:.-]*)\b[^>]*?(\/?)>/g
  tag.lastIndex = start
  let depth = 0
  for (let m = tag.exec(svg); m; m = tag.exec(svg)) {
    if (m[1] === '/') depth -= 1
    else if (m[3] !== '/') depth += 1
    if (depth <= 0) return svg.slice(start, tag.lastIndex)
  }
  return svg.slice(start)
}

/** <use> trỏ tới phần tử (trong defs hay vẽ tại chỗ) mà cây con có hoạt ảnh. Đo trên Chromium:
 *  - gốc vẽ tại chỗ + bản sao <use>: bản sao không lên compositor, cả cảnh vẽ lại mỗi khung, vết KHÔNG báo compositeFailed
 *    (thuyền nhấp nhô + bóng nước = 37% một nhân);
 *  - gốc trong defs dùng 2 lần: 52%; dùng qua <use> lồng nhau: bản sao ĐỨNG IM (bọt mưa opacity 0 → không bao giờ hiện).
 *  Cách đúng: nội dung được tham chiếu phải TĨNH; class động đặt trên <g> bọc ngoài từng <use> (đo: 0.2%). Trả về id vi phạm. */
export function usedAnim(svg: string, animated: Set<string>): string[] {
  const out: string[] = []
  for (const id of new Set(Array.from(svg.matchAll(/<use\b[^>]*href="#([^"]+)"/g), m => m[1] as string))) {
    const at = svg.search(new RegExp(`\\sid="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`))
    if (at >= 0 && hasAnim(subtree(svg, svg.lastIndexOf('<', at)), animated)) out.push(id)
  }
  return out
}

/** Bọc mọi <use> mang hoạt ảnh (class có animation, hoặc style có animation) trong <g> mang class/style đó. */
export function wrapAnimatedUse(svg: string, animated: Set<string>): string {
  return svg.replace(/<use\b([^>]*?)\/>/g, (whole, attrs: string) => {
    const cls = /\sclass="([^"]*)"/.exec(attrs)?.[1] ?? ''
    const sty = /\sstyle="([^"]*)"/.exec(attrs)?.[1] ?? ''
    const hit = cls.split(/\s+/).some(c => animated.has(c)) || /animation/.test(sty)
    if (!hit) return whole
    const rest = attrs.replace(/\sclass="[^"]*"/, '').replace(/\sstyle="[^"]*"/, '')
    return `<g${cls ? ` class="${cls}"` : ''}${sty ? ` style="${sty}"` : ''}><use${rest}/></g>`
  })
}

/** Độ dài phần vỏ SVG cố định (thẻ gốc, nền trời, sương giữa lớp, tô màu, nhóm lớp…), cộng dư 400 cho nhóm <g class="Lx">. */
const SHELL = 1900

/** Cửa sổ vẽ: mỗi bản vẽ phủ SPAN_S giây, mod vẽ lại mỗi SHOWN_S giây (bản mới bắt đầu đúng lúc bản cũ ở giây SHOWN_S).
 *  Cửa sổ ngắn = camera đi ít đường hơn trong một bản vẽ = ít mảnh phải cắt vì trần ký tự (đo 48 thời điểm, bản đủ:
 *  420/360 s mất TB 12.3% nội dung lên hình · 180/120 s mất 4.6%). Một lần dựng ~25 ms. */
export const SPAN_S = 180
export const SHOWN_S = 120

function run<T>(name: string, errors: string[], f: () => T): T | undefined {
  try {
    return f()
  } catch (err) {
    errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`)
    return undefined
  }
}

export function allShots(regions: Region[]): Shot[] {
  return regions.flatMap(r => r.shots)
}

export function compose(mods: Modules, opts: ComposeOpts): { svg: string; stats: ComposeStats; ctx: Ctx } {
  const ctx = makeCtx(opts)
  const errors: string[] = []
  const byModule: Record<string, number> = {}
  const budget = opts.budget ?? 130_000
  const shots = allShots(mods.regions)
  const nowSec = opts.now / 1000

  // Camera: mẫu trong cửa sổ.
  const samples = opts.freeze ? [{ t: 0, cam: opts.freeze }, { t: ctx.span, cam: opts.freeze }] : camSamples(shots, nowSec, ctx.span)
  const zMin = Math.min(...samples.map(s => s.cam.z))
  const xs = samples.map(s => s.cam.x)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const visible = (layer: Layer, x0: number, x1: number) => {
    if (layer === 0) return true
    const f = LAYER_F[layer]
    const half = VW / 2 / zMin + 260
    return x1 >= xMin * f - half && x0 <= xMax * f + half
  }
  // Thời lượng lên hình của từng mảnh: lấy mẫu camera đều 5 s. Mod vẽ lại ở giây SHOWN nên phần sau chỉ là dự phòng (trọng số nhỏ).
  const SHOWN = opts.shown ?? ctx.span * 0.9
  const probe: { cam: Cam; w: number; edge: boolean }[] = []
  for (let t = 0; t <= ctx.span; t += 5)
    probe.push({ cam: opts.freeze ?? camAt(shots, nowSec + t), w: t <= SHOWN ? 1 : 0.06, edge: t <= 20 || Math.abs(t - SHOWN) <= 25 })
  const probeW = probe.reduce((acc, p) => acc + p.w, 0)
  // Lên hình ở MÉP cửa sổ (lúc mod tráo bản vẽ, kể cả trễ vài chục giây): hai bản vẽ liền nhau phải cùng giữ mảnh đó,
  // nếu không cảnh "nhảy" (mảnh hiện/mất) đúng lúc tráo. Mép cuối của bản cũ = mép đầu của bản mới (cùng thời điểm tuyệt đối).
  const atEdge = (layer: Layer, x0: number, x1: number) => {
    if (layer === 0) return true
    const f = LAYER_F[layer]
    return probe.some(p => p.edge && x1 >= p.cam.x * f - (VW / 2 / p.cam.z + 40) && x0 <= p.cam.x * f + (VW / 2 / p.cam.z + 40))
  }
  const onScreen = (layer: Layer, x0: number, x1: number) => {
    if (layer === 0) return 1
    const f = LAYER_F[layer]
    let w = 0
    for (const p of probe) {
      const half = VW / 2 / p.cam.z + 40
      if (x1 >= p.cam.x * f - half && x0 <= p.cam.x * f + half) w += p.w
    }
    return w / probeW
  }

  // Dựng các module; defs/css giữ RIÊNG từng module để chỉ trả chi phí cho module có mảnh lên hình.
  const pieces: (Piece & { from: string })[] = []
  const spots: Spot[] = []
  const modDefs: { from: string; defs: string }[] = [{ from: 'loi', defs: CORE_DEFS }]
  const modCss: { from: string; css: string }[] = []
  const take = (name: string, out: { pieces?: Piece[]; spots?: Spot[]; defs?: string; css?: string } | undefined) => {
    if (!out) return
    for (const p of out.pieces ?? []) pieces.push({ ...p, from: name })
    spots.push(...(out.spots ?? []))
    if (out.defs) modDefs.push({ from: name, defs: out.defs })
    if (out.css) modCss.push({ from: name, css: out.css })
  }
  const half3 = VW / 2 / zMin + 260
  pieces.push({ ...groundPiece(xMin - half3, xMax + half3), from: 'dat' })
  const sky = run('sky', errors, () => mods.sky.build(ctx))
  if (sky) take('sky', sky)
  take('mid', run('mid', errors, () => mods.mid.build(ctx)))
  for (const region of mods.regions) {
    if (!visible(3, region.x0 - 900, region.x1 + 900)) continue
    take(region.id, run(region.id, errors, () => region.build(ctx)))
  }
  const visibleSpots = spots.filter(s => visible(s.layer, s.x - 50, s.x + 50))
  take('actors', run('actors', errors, () => mods.actors.build(ctx, visibleSpots)))
  const weather = run('weather', errors, () => mods.weather.build(ctx))
  if (weather) take('weather', { pieces: weather.pieces, defs: weather.defs, css: weather.css })
  // Class có hoạt ảnh (để bọc <use> mang hoạt ảnh trong <g>: hoạt ảnh trên <use> chạy luồng chính).
  const animated = animAudit(paletteCss(ctx, timeLook(ctx.vn.hourF, 0, ctx.daylight, ctx.vn.doy)) + modCss.map(c => c.css).join('')).animated
  const safe = (t: string) => wrapAnimatedUse(t, animated)
  for (const p of pieces) {
    p.svg = safe(p.svg)
    if (p.glow) p.glow = safe(p.glow)
  }
  const defEls: DefEl[] = []
  for (const md of modDefs) {
    const got = run(`defs:${md.from}`, errors, () => splitDefs(safe(md.defs)))
    if (got) defEls.push(...got)
  }

  // Cắt theo camera, rồi theo ngân sách: bỏ mảnh có "giá trị" thấp nhất trước — giá trị = (prio+1) × (0.08 + thời lượng lên hình).
  type Cand = Piece & { from: string; size: number; shown: number; value: number }
  const sizeOf = (p: Piece) => p.svg.length + (p.glow?.length ?? 0) + 18
  const cands: Cand[] = pieces.map(p => {
    const shown = onScreen(p.layer, p.x0, p.x1)
    return { ...p, size: sizeOf(p), shown, value: p.prio >= 10 ? Infinity : (p.prio + 1) * (0.08 + shown) * (atEdge(p.layer, p.x0, p.x1) ? 2.5 : 1) }
  })
  // Phụ thuộc giữa mảnh: mảnh B dùng id (href/url) do mảnh A định nghĩa → A phải còn khi B còn, nếu không B "treo" (mất hình).
  const owner = new Map<string, Cand>()
  for (const p of cands) for (const mm of (p.svg + (p.glow ?? '')).matchAll(/\sid="([^"]+)"/g)) owner.set(mm[1] as string, p)
  const needs = new Map<Cand, Cand[]>()
  for (const p of cands) {
    const ds = [...new Set(refsOf(p.svg + (p.glow ?? '')).map(id => owner.get(id)).filter((q): q is Cand => !!q && q !== p))]
    if (ds.length) needs.set(p, ds)
  }
  // (1) Mảnh khuất camera nhưng định nghĩa id cho mảnh thấy được → giữ lại (bắc cầu).
  const vis = new Set(cands.filter(p => visible(p.layer, p.x0, p.x1)))
  for (let grew = true; grew; ) {
    grew = false
    for (const p of [...vis])
      for (const q of needs.get(p) ?? [])
        if (!vis.has(q)) {
          vis.add(q)
          grew = true
        }
  }
  // (2) Giá trị của mảnh định nghĩa ≥ giá trị mảnh dùng nó (+ε): vòng ngân sách luôn bỏ mảnh dùng TRƯỚC mảnh định nghĩa.
  for (let pass = 0, ch = true; ch && pass < 8; pass += 1) {
    ch = false
    for (const [p, ds] of needs)
      for (const q of ds)
        if (q.value < p.value + 1e-9) {
          q.value = p.value + 1e-9
          ch = true
        }
  }
  let kept: Cand[] = cands.filter(p => vis.has(p))
  let dropped = pieces.length - kept.length
  let cut = 0
  const ALWAYS = new Set(['sky', 'weather', 'loi'])
  const skyScreen = safe(sky?.screen ?? '')
  const weatherScreen = safe(weather?.screen ?? '')
  const screens = skyScreen + weatherScreen
  const measure = (set: Cand[], head: string) => {
    const live = new Set(set.map(p => p.from))
    const cssOn = modCss.filter(c => ALWAYS.has(c.from) || live.has(c.from)).map(c => c.css).join('')
    const roots = [...set.map(p => p.svg + (p.glow ?? '')), screens, cssOn, 'url(#skyg) url(#hzg) url(#vig) url(#fgg) url(#veil) url(#grn)']
    const defsOn = shakeDefs(defEls, roots)
    const piecesLen = set.reduce((acc, p) => acc + p.size, 0)
    return { cssOn, defsOn, total: SHELL + head.length + cssOn.length + defsOn.length + screens.length + piecesLen }
  }

  // Màu theo giờ ở đầu và cuối cửa sổ (chuyển mượt trong 15 phút: chạng vạng, rạng đông).
  const cloudK = CLOUD_K[ctx.cur.cloud]
  const lookA = timeLook(ctx.vn.hourF, cloudK, ctx.daylight, ctx.vn.doy)
  const endVn = vnTime(opts.now + ctx.span * 1000)
  const endDay = daylightOf(sunAltitude(endVn.doy, endVn.hourF))
  const lastSlice = ctx.weather[ctx.weather.length - 1] ?? ctx.cur
  const lookB = timeLook(endVn.hourF, CLOUD_K[lastSlice.cloud], endDay, endVn.doy)

  // CSS camera: mỗi lớp có keyframes `transform` RIÊNG (dịch + thu phóng thẳng trên nhóm lớp).
  // Không dùng biến CSS kế thừa (--cx/--z) nữa: biến kế thừa đổi mỗi khung buộc tính lại style cho MỌI nút con (~7k nút),
  // còn transform trên nhóm chỉ đổi một nút thuộc tính vẽ — đo thật: luồng chính giảm mạnh (xem DESIGN).
  // Điểm (x, y) của lớp L hiện ở màn hình: (VW/2 + z(x − cx·f), VH/2 + z(y − (cy − CY0)·f − CY0)).
  // Điểm khoá camera lấy THẲNG từ hành trình (camera.ts): chặng dừng ngắm = 2 điểm tuyến tính; chặng lướt nằm trọn trong
  // cửa sổ = 2 điểm + cubic-bezier(.467,0,.533,1) (xấp xỉ smootherstep, cùng độ dốc giữa chặng); chặng lướt bị mép cửa sổ cắt
  // → lấy mẫu 6 s. Ít keyframes = ít ký tự (5 lớp × mỗi điểm ~90 ký tự).
  type Key = { t: number; cam: Cam; kind: 'dwell' | 'bezier' | 'linear' }
  const keys: Key[] = []
  if (opts.freeze) keys.push({ t: 0, cam: opts.freeze, kind: 'linear' }, { t: ctx.span, cam: opts.freeze, kind: 'linear' })
  else {
    const plan = camPlan(shots, nowSec, ctx.span)
    for (const sg of plan) {
      if (sg.kind === 'dwell') keys.push({ t: sg.t0, cam: sg.a, kind: 'dwell' })
      // Bezier chỉ khi chặng lướt KẾT THÚC trước lúc mod vẽ lại (SHOWN): bezier lệch smootherstep giữa chặng, nếu bản vẽ mới
      // bắt đầu giữa chặng (theo camAt) sẽ thấy giật. Còn lại lấy mẫu 3 s KHỚP thời gian tuyệt đối → hai bản vẽ liền nhau
      // trùng điểm mẫu ở lúc chuyển (cửa sổ bắt đầu ở bội số của SHOWN_S = 2 phút).
      // Thêm: chặng phải bắt đầu SAU 30 s — mod có thể tráo bản vẽ trễ vài chục giây, lúc đó chặng đã chạy theo đường bezier
      // của bản mới trong khi bản cũ vẽ đường lấy mẫu → lệch tới ~80 px.
      else if (sg.whole && sg.t0 >= 30 && sg.t1 <= SHOWN + 1e-6) keys.push({ t: sg.t0, cam: sg.a, kind: 'bezier' })
      else {
        keys.push({ t: sg.t0, cam: sg.a, kind: 'linear' })
        for (let t = Math.ceil((nowSec + sg.t0 + 1e-6) / 3) * 3 - nowSec; t < sg.t1 - 1e-6; t += 3) keys.push({ t, cam: camAt(shots, nowSec + t), kind: 'linear' })
      }
    }
    const last = plan[plan.length - 1]
    keys.push({ t: ctx.span, cam: last ? last.b : camAt(shots, nowSec + ctx.span), kind: 'linear' })
  }
  // Mỗi lớp: bỏ điểm thẳng hàng trong các đoạn lấy mẫu (sai số ≤ 0.4 px). Đoạn dừng ngắm trôi ~0.2–1 px/s không cần 60
  // khung/giây: `steps()` bước ≤ 0.6 px (mắt không thấy) → cả khung hình chỉ vẽ lại vài lần mỗi giây (bớt việc compositor).
  const layerCss = ([0, 1, 2, 3, 4] as Layer[])
    .map(l => {
      const f = LAYER_F[l]
      const pos = keys.map(k => ({ t: k.t, kind: k.kind, z: k.cam.z, tx: VW / 2 - k.cam.z * k.cam.x * f, ty: VH / 2 - k.cam.z * ((k.cam.y - CY0) * f + CY0) }))
      type P = (typeof pos)[number]
      const keep: number[] = [0]
      for (let j = 1; j < pos.length - 1; j += 1) {
        const k = pos[keep[keep.length - 1] as number] as P
        const p = pos[j] as P
        const e = pos[j + 1] as P
        const u = (p.t - k.t) / Math.max(1e-6, e.t - k.t)
        const inline = k.kind === 'linear' && p.kind === 'linear' &&
          Math.abs(k.tx + (e.tx - k.tx) * u - p.tx) <= 0.4 && Math.abs(k.ty + (e.ty - k.ty) * u - p.ty) <= 0.4 && Math.abs(k.z + (e.z - k.z) * u - p.z) <= 0.0003
        if (!inline) keep.push(j)
      }
      if (pos.length > 1) keep.push(pos.length - 1)
      const kf = keep
        .map((idx, n) => {
          const p = pos[idx] as P
          const q = n + 1 < keep.length ? (pos[keep[n + 1] as number] as P) : undefined
          let timing = ''
          if (q && p.kind === 'bezier') timing = ';animation-timing-function:cubic-bezier(.467,0,.533,1)'
          else if (q && p.kind === 'dwell') {
            const dt = Math.max(0.001, q.t - p.t)
            const perSec = (Math.hypot(q.tx - p.tx, q.ty - p.ty) + Math.abs(q.z - p.z) * VW) / dt / 0.6
            if (perSec < 20) timing = `;animation-timing-function:steps(${Math.max(1, Math.ceil(dt * Math.max(1.5, perSec)))})`
          }
          return `${((p.t / ctx.span) * 100).toFixed(2)}%{transform:translate(${p.tx.toFixed(1)}px,${p.ty.toFixed(1)}px) scale(${p.z.toFixed(4)})${timing}}`
        })
        .join('')
      // Camera đứng yên cả cửa sổ → transform TĨNH. Hoạt ảnh không đổi giá trị bị Chromium xếp loại "không thay đổi thấy được",
      // không lên compositor và chạy lại trên luồng chính MỖI khung (đo bằng vết khung của Chromium: lý do 1<<17).
      const first = keys[0] as Key
      const still = keys.every(s => Math.abs(s.cam.x - first.cam.x) < 0.05 && Math.abs(s.cam.y - first.cam.y) < 0.05 && Math.abs(s.cam.z - first.cam.z) < 0.00005)
      if (still) {
        const z = first.cam.z
        return `.L${l}{transform:translate(${(VW / 2 - z * first.cam.x * f).toFixed(1)}px,${(VH / 2 - z * ((first.cam.y - CY0) * f + CY0)).toFixed(1)}px) scale(${z.toFixed(4)})}`
      }
      return `.L${l}{animation:cL${l} ${ctx.span}s linear forwards;animation-delay:calc(var(--t)*-1s)}@keyframes cL${l}{${kf}}`
    })
    .join('')
  // Lớp tông theo giờ: opacity đi từ giá trị đầu → cuối cửa sổ (chạy trên compositor) để KHÔNG nhảy lúc vẽ lại.
  const fade = (cls: string, a: number, b: number) =>
    Math.abs(a - b) < 0.004
      ? `.${cls}{opacity:${a.toFixed(3)}}`
      : `.${cls}{animation:${cls} ${ctx.span}s linear forwards;animation-delay:calc(var(--t)*-1s)}@keyframes ${cls}{from{opacity:${a.toFixed(3)}}to{opacity:${b.toFixed(3)}}}`
  // Tô màu theo giờ (multiply): MỘT tấm, màu = trung điểm hai đầu cửa sổ, chỉ opacity chạy. Hai tấm đan chéo (A tắt dần, B
  // hiện dần) làm cảnh SÁNG LÊN giữa cửa sổ rồi tối sập lúc vẽ lại (multiply là phép nhân: hai tấm nửa đậm sáng hơn một tấm
  // đậm đủ — đo ~14% ban đêm). Cửa sổ chỉ 3 phút nên màu tô gần như không đổi trong cửa sổ.
  // Hoạt ảnh `fill` buộc dựng lại cả SVG mỗi khung trên luồng chính (đo: 50–90% một nhân) — cấm.
  const gA = lookA.shadeO
  const gB = lookB.shadeO
  const gradeOn = Math.max(gA, gB) >= 0.03
  const gradeCss = !gradeOn ? '' : `.grade{mix-blend-mode:multiply}${fade('gA', gA, gB)}`
  const gradeSvg = !gradeOn ? '' : `<rect class="grade gA" fill="${mix(lookA.shade, lookB.shade, 0.5)}" width="${VW}" height="${VH}"/>`
  const desatOn = Math.max(lookA.desat, lookB.desat) >= 0.03
  const toneCss = fade('fgs', lookA.fgO, lookB.fgO) + (desatOn ? `.nds{mix-blend-mode:saturation}${fade('nds', lookA.desat, lookB.desat)}` : '')
  const loops = LOOP_CLASSES.map(([cls, period]) => `.${cls}{animation-delay:calc(-${(nowSec % period).toFixed(2)}s - var(--t)*1s)}`).join('')
  const head =
    `svg{--t:0}` +
    paletteCss(ctx, lookA) +
    layerCss +
    gradeCss +
    toneCss +
    // Lớp phát sáng: chỉ hoạt ảnh khi độ sáng THẬT SỰ đổi trong cửa sổ (chạng vạng/rạng đông); còn lại opacity tĩnh (xem chú thích camera).
    (Math.abs(lookA.lit - lookB.lit) < 0.004
      ? `.lit{opacity:${lookA.lit.toFixed(3)}}`
      : `.lit{animation:lit ${ctx.span}s linear forwards;animation-delay:calc(var(--t)*-1s)}@keyframes lit{from{opacity:${lookA.lit.toFixed(3)}}to{opacity:${lookB.lit.toFixed(3)}}}`) +
    loops +
    `@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}`

  // Vòng ngân sách: mỗi lượt bỏ đủ số ký tự đang dư (theo thứ tự giá trị), rồi đo lại CHÍNH XÁC (defs rung cây, css theo module).
  const shownAll = kept.reduce((acc, p) => acc + p.size * p.shown, 0)
  let m = measure(kept, head)
  if (m.total > budget) {
    const order = kept.filter(p => p.value !== Infinity).sort((p, q) => p.value - q.value)
    let at = 0
    for (let guard = 0; guard < 2000 && m.total > budget && at < order.length; guard += 1) {
      // Bỏ từng đợt nhỏ (≤ 35% phần dư): bỏ mảnh còn kéo theo defs/css không dùng nữa, nên phần dư thật giảm nhanh hơn tổng cỡ mảnh.
      let need = Math.max(400, (m.total - budget) * 0.35)
      const drop = new Set<Cand>()
      while (need > 0 && at < order.length) {
        const p = order[at] as Cand
        at += 1
        if (!kept.includes(p)) continue // đã bị bỏ theo dây phụ thuộc ở lượt trước
        drop.add(p)
        need -= p.size
      }
      // (3) Chốt cuối: bỏ luôn mảnh nào còn dùng id của mảnh vừa bỏ (bắc cầu), để không bao giờ có tham chiếu treo.
      for (let grew = true; grew; ) {
        grew = false
        for (const p of kept)
          if (!drop.has(p) && (needs.get(p) ?? []).some(q => drop.has(q))) {
            drop.add(p)
            grew = true
          }
      }
      kept = kept.filter(p => !drop.has(p))
      dropped += drop.size
      cut += drop.size
      m = measure(kept, head)
    }
  }
  for (const p of kept) byModule[p.from] = (byModule[p.from] ?? 0) + p.size
  const lost = shownAll > 0 ? 1 - kept.reduce((acc, p) => acc + p.size * p.shown, 0) / shownAll : 0

  const audit = animAudit(head + m.cssOn)
  for (const k of audit.slow) errors.push(`hoạt ảnh chạy luồng chính (tốn CPU): @keyframes ${k}`)
  const inPlace = screens + kept.map(p => p.svg + (p.glow ?? '')).join('')
  for (const k of hiddenAnim(m.defsOn + inPlace, audit.animated)) errors.push(`hoạt ảnh trong ${k} (không lên compositor, cả cảnh vẽ lại mỗi khung)`)
  for (const k of usedAnim(m.defsOn + inPlace, audit.animated))
    errors.push(`<use> sao chép phần tử có hoạt ảnh #${k} (bản sao không lên compositor, cả cảnh vẽ lại mỗi khung)`)
  const byLayer = (l: Layer, glow: boolean) =>
    kept
      .filter(p => p.layer === l)
      .map(p => (glow ? p.glow ?? '' : p.svg))
      .join('')
  const layerG = (l: Layer, glow: boolean) => {
    const inner = byLayer(l, glow)
    return inner ? `<g class="L${l}">${inner}</g>` : ''
  }
  const litOn = Math.max(lookA.lit, lookB.lit) >= 0.005
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">` +
    `<defs>${m.defsOn}</defs><style><![CDATA[${head}${m.cssOn}]]></style>` +
    `<rect width="${VW}" height="${VH}" fill="url(#skyg)"/>` +
    skyScreen +
    `<g class="cam">` +
    layerG(0, false) +
    // Phối cảnh không khí ba bậc: càng xa càng chìm vào sương (tương phản & bão hoà giảm dần theo độ sâu).
    `<rect width="${VW}" height="${VH}" fill="url(#hzg)" opacity=".3"/>` +
    layerG(1, false) +
    `<rect width="${VW}" height="${VH}" fill="url(#hzg)" opacity=".52"/>` +
    layerG(2, false) +
    // Ánh sáng lớp xa (cửa sổ, đèn, bóng trăng lớp 1–2) vẽ NGAY sau lớp của nó: lớp gần che được, không còn "đèn xuyên cây".
    // Bị tô màu đêm & sương phủ → xa thì mờ & lạnh hơn, đúng phối cảnh không khí.
    (litOn ? `<g class="lit">${layerG(1, true)}${layerG(2, true)}</g>` : '') +
    `<rect width="${VW}" height="${VH}" fill="url(#hzg)" opacity=".3"/>` +
    layerG(3, false) +
    layerG(4, false) +
    `<rect class="fgs" width="${VW}" height="${VH}" fill="url(#fgg)"/>` +
    (desatOn ? `<rect class="nds" width="${VW}" height="${VH}" fill="#808080"/>` : '') +
    gradeSvg +
    (litOn ? `<g class="lit">${layerG(3, true)}${layerG(4, true)}</g>` : '') +
    `</g>` +
    `<rect width="${VW}" height="${VH}" fill="url(#veil)"/>` +
    weatherScreen +
    `<rect width="${VW}" height="${VH}" filter="url(#grn)" opacity=".06" style="mix-blend-mode:soft-light"/>` +
    `<rect width="${VW}" height="${VH}" fill="url(#vig)"/>` +
    `</svg>`

  return {
    svg,
    ctx,
    stats: {
      chars: svg.length,
      pieces: kept.length,
      dropped,
      cut,
      lost,
      byModule,
      errors,
      shots: shots.map(s => s.id),
    },
  }
}

/** Gắn thời điểm hiển thị: số giây đã trôi kể từ đầu cửa sổ (để camera không giật lùi khi bề mặt vẽ lại). */
export function atElapsed(svg: string, seconds: number): string {
  return svg.replace('svg{--t:0}', `svg{--t:${clamp(seconds, 0, 86400).toFixed(1)}}`)
}
