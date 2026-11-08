// Bảng màu: biến CSS theo MÙA (cây cỏ) và theo GIỜ (trời, nước, tô bóng) + lớp tô màu dùng chung + chuyển động nguyên tố.
// Module vẽ KHÔNG viết mã màu tự do: dùng class bên dưới để toàn thế giới chung một ngôn ngữ màu và tự đổi theo mùa/giờ.
import { clamp, lerp, mix, oklch, smooth } from './util'
import type { Ctx, Season } from './types'
import { designHour } from './time'

const C = oklch

// ───────────────────────── Theo mùa ─────────────────────────
type SeasonVars = Record<string, string>
const SEASON: Record<Season, SeasonVars> = {
  xuan: {
    g1: C(0.86, 0.11, 128), g2: C(0.76, 0.12, 132), g3: C(0.62, 0.11, 138), g4: C(0.45, 0.08, 145),
    m1: C(0.78, 0.13, 125), m2: C(0.64, 0.12, 132), m3: C(0.47, 0.09, 140),
    l1: C(0.86, 0.12, 122), l2: C(0.74, 0.13, 130), l3: C(0.59, 0.12, 138), l4: C(0.42, 0.08, 148),
    f1: C(0.84, 0.08, 355), f2: C(0.9, 0.1, 95), f3: C(0.96, 0.02, 90),
  },
  ha: {
    g1: C(0.8, 0.13, 135), g2: C(0.68, 0.14, 140), g3: C(0.54, 0.12, 146), g4: C(0.38, 0.08, 152),
    m1: C(0.7, 0.13, 135), m2: C(0.56, 0.12, 142), m3: C(0.4, 0.08, 150),
    l1: C(0.76, 0.14, 132), l2: C(0.62, 0.14, 140), l3: C(0.48, 0.11, 148), l4: C(0.33, 0.07, 155),
    f1: C(0.76, 0.13, 0), f2: C(0.62, 0.19, 30), f3: C(0.96, 0.02, 95),
  },
  thu: {
    g1: C(0.84, 0.1, 95), g2: C(0.74, 0.11, 100), g3: C(0.6, 0.09, 112), g4: C(0.44, 0.06, 125),
    m1: C(0.72, 0.1, 115), m2: C(0.58, 0.09, 122), m3: C(0.43, 0.07, 132),
    l1: C(0.84, 0.13, 78), l2: C(0.72, 0.15, 60), l3: C(0.58, 0.14, 45), l4: C(0.42, 0.09, 50),
    f1: C(0.86, 0.13, 85), f2: C(0.93, 0.04, 90), f3: C(0.96, 0.02, 90),
  },
  dong: {
    g1: C(0.84, 0.04, 120), g2: C(0.72, 0.05, 125), g3: C(0.58, 0.05, 135), g4: C(0.43, 0.04, 145),
    m1: C(0.7, 0.07, 130), m2: C(0.56, 0.06, 138), m3: C(0.42, 0.05, 145),
    l1: C(0.74, 0.06, 115), l2: C(0.6, 0.06, 125), l3: C(0.47, 0.05, 135), l4: C(0.34, 0.04, 145),
    f1: C(0.95, 0.02, 250), f2: C(0.82, 0.08, 355), f3: C(0.97, 0.01, 250),
  },
}

// Vật liệu không đổi theo mùa (rêu phong, cổ kính).
const MATERIAL: Record<string, string> = {
  b1: C(0.32, 0.03, 55), b2: C(0.46, 0.04, 60), b3: C(0.64, 0.03, 70),
  s1: C(0.84, 0.015, 95), s2: C(0.72, 0.018, 100), s3: C(0.58, 0.02, 110), s4: C(0.42, 0.02, 120),
  r1: C(0.62, 0.09, 40), r2: C(0.52, 0.09, 35), r3: C(0.4, 0.07, 32),
  w1: C(0.88, 0.06, 85), w2: C(0.76, 0.06, 80), w3: C(0.95, 0.012, 90),
  d1: C(0.56, 0.05, 65), d2: C(0.42, 0.045, 60),
  k1: C(0.22, 0.025, 270), k2: C(0.35, 0.03, 260),
  x1: C(0.5, 0.06, 45), x2: C(0.62, 0.01, 240),
  p1: C(0.55, 0.13, 28), p2: C(0.62, 0.07, 195), p3: C(0.93, 0.025, 90),
  e1: C(0.88, 0.14, 75), e2: C(0.9, 0.1, 85), e3: C(0.9, 0.08, 210), e4: C(0.9, 0.15, 150),
}

// ───────────────────────── Theo giờ ─────────────────────────
// Neo màu trời [giờ, đỉnh, giữa, chân trời, tô bóng (multiply), độ đậm tô bóng, sương mờ]
type Anchor = [number, string, string, string, string, number, string]
const ANCHORS: Anchor[] = [
  [0, '#0b1230', '#172350', '#2a3a6a', '#2c3a78', 0.7, '#2e3b66'],
  [4.4, '#101a40', '#28356b', '#5b5f92', '#3a4078', 0.66, '#4b4f80'],
  [5.5, '#2d3c74', '#9a7ca8', '#f2b48e', '#8a78b0', 0.48, '#d9a8a8'],
  [6.4, '#6d9bd2', '#eec4b2', '#ffe2b8', '#f0c8a8', 0.3, '#ffe6cc'],
  [8, '#7db8ea', '#bcdcf3', '#ecf4ef', '#ffffff', 0, '#eef6f2'],
  [12, '#6fb0ec', '#acd6f4', '#e9f5f6', '#ffffff', 0, '#eef7f7'],
  [15.6, '#77b0e2', '#bad8ef', '#f6ebd2', '#fff3e0', 0.12, '#f8ecd8'],
  [17.2, '#6b8fc8', '#e8bb94', '#ffd59c', '#ffd2a0', 0.34, '#ffd9b0'],
  [17.9, '#4a5b9c', '#dc8c80', '#ffb47c', '#f0a07c', 0.42, '#f6b090'],
  [18.7, '#293868', '#6e5a8e', '#cc8c8c', '#7a64a0', 0.55, '#9a7c9c'],
  [19.6, '#151f48', '#2c3b70', '#4f5c90', '#3a4580', 0.66, '#3e4a7a'],
  [24, '#0b1230', '#172350', '#2a3a6a', '#2c3a78', 0.7, '#2e3b66'],
]

export type TimeLook = {
  sky: [string, string, string]
  shade: string
  shadeO: number
  haze: string
  water: [string, string, string]
  lit: number
  /** Bóng tiền cảnh (đáy khung đậm & lạnh hơn — tách lớp gần/xa, nâng khung chat): màu + độ đậm. */
  fg: string
  fgO: number
  /** Khử bão hoà ban đêm (ánh trăng gần như đơn sắc, hết "ngày giả đêm" ô-liu): 0..1. */
  desat: number
}

/** Màu theo giờ VN (thập phân) + độ phủ mây (0..1). Mây dày → trời xám, bóng dịu.
 *  `doy` (ngày trong năm) có thì giờ được ánh xạ theo mọc/lặn THẬT của ngày đó (xem time.designHour). */
export function timeLook(hourF: number, cloudiness: number, daylight: number, doy?: number): TimeLook {
  if (doy !== undefined) hourF = designHour(doy, hourF)
  let i = 0
  while (i < ANCHORS.length - 2 && hourF >= (ANCHORS[i + 1] as Anchor)[0]) i += 1
  const a = ANCHORS[i] as Anchor
  const b = ANCHORS[i + 1] as Anchor
  const t = clamp((hourF - a[0]) / (b[0] - a[0]), 0, 1)
  // Mây xám theo độ sáng LIÊN TỤC (trước đây bật/tắt ở daylight .5 → cả bầu trời nhảy tới 90/255 lúc chạng vạng có mây).
  const grey = (c: string, k: number) => mix(c, mix('#30364a', '#b9c0c8', daylight), k)
  const k = clamp(cloudiness, 0, 1) * 0.62
  const sky: [string, string, string] = [grey(mix(a[1], b[1], t), k), grey(mix(a[2], b[2], t), k), grey(mix(a[3], b[3], t), k * 0.9)]
  const shade = mix(a[4], b[4], t)
  const shadeO = lerp(a[5], b[5], t) + cloudiness * 0.12 * daylight
  const haze = grey(mix(a[6], b[6], t), k)
  const water: [string, string, string] = [mix(sky[2], '#ffffff', 0.15), mix(sky[1], '#20405a', 0.35), mix(sky[0], '#0c1a2a', 0.55)]
  const night = 1 - daylight
  const fg = mix(mix('#1c3328', '#0a1222', night), shade, 0.2)
  const fgO = clamp(0.36 + night * 0.24 + cloudiness * 0.06, 0, 0.66)
  return {
    sky,
    shade,
    shadeO: clamp(shadeO, 0, 0.8),
    haze,
    water,
    lit: clamp(1 - daylight * 1.15 + cloudiness * 0.25 * (1 - daylight * 0.5), 0, 1),
    fg,
    fgO,
    desat: clamp(night * 0.5 + cloudiness * 0.18, 0, 0.62),
  }
}

/** Đầu cuối mùa đông (gần Tết): đào nở — f1 chuyển sang hồng. */
function seasonVars(ctx: Ctx): SeasonVars {
  const v = { ...SEASON[ctx.season] }
  if (ctx.season === 'dong' && ctx.seasonT > 0.78) v.f1 = C(0.84, 0.08, 355)
  return v
}

const FILL_CLASSES = ['g1', 'g2', 'g3', 'g4', 'm1', 'm2', 'm3', 'l1', 'l2', 'l3', 'l4', 'f1', 'f2', 'f3', 'b1', 'b2', 'b3', 's1', 's2', 's3', 's4', 'r1', 'r2', 'r3', 'w1', 'w2', 'w3', 'a1', 'a2', 'a3', 'd1', 'd2', 'k1', 'k2', 'x1', 'x2', 'p1', 'p2', 'p3', 'e1', 'e2', 'e3', 'e4']

/** CSS chung: biến màu, class tô, class nét, chuyển động nguyên tố. `look` là màu giờ lúc bắt đầu cửa sổ. */
export function paletteCss(ctx: Ctx, look: TimeLook): string {
  const vars = { ...seasonVars(ctx), ...MATERIAL, a1: look.water[0], a2: look.water[1], a3: look.water[2] }
  const decl = Object.entries(vars)
    .map(([k, v]) => `--${k}:${v}`)
    .join(';')
  const fills = FILL_CLASSES.map(k => `.${k}{fill:var(--${k})}`).join('')
  return (
    `svg{${decl};--wind:${ctx.cur.wind};--wet:${ctx.wet};--sky0:${look.sky[0]};--sky1:${look.sky[1]};--sky2:${look.sky[2]};--haze:${look.haze};--fg:${look.fg}}` +
    fills +
    // nét
    `.z1{fill:none;stroke:var(--k1);stroke-width:1.2;stroke-linecap:round}.z2{fill:none;stroke:var(--k2);stroke-width:.8;stroke-linecap:round}.z3{fill:none;stroke:var(--s1);stroke-width:1;stroke-linecap:round}` +
    // bóng & sáng dựng khối (đè lên vật thể)
    `.hl{fill:#fff;opacity:.16}.sh{fill:var(--k1);opacity:.2}.ao{fill:var(--k1);opacity:.32}.wetsheen{fill:#fff;opacity:calc(var(--wet)*.22)}` +
    // chuyển động nguyên tố
    // Thời lượng VIẾT SỐ, không qua biến: shorthand có var() + longhand animation-delay ở luật khác (LOOP_CLASSES) làm Chromium
    // dựng lại hoạt ảnh mỗi khung trên luồng chính (đo: một phần tử .sw1 = 14–28% một nhân; viết số → về ~0).
    `.sw1,.sw2,.sw3,.sw4{transform-box:fill-box;transform-origin:50% 100%;animation:sway 4.3s ease-in-out infinite alternate}` +
    `.sw2{animation-duration:5.9s}.sw3{animation-duration:3.2s}.sw4{animation-duration:7.7s}` +
    `@keyframes sway{from{transform:rotate(calc(-.6deg - var(--wind)*2.4deg))}to{transform:rotate(calc(.8deg + var(--wind)*4.2deg))}}` +
    `.br{transform-box:fill-box;transform-origin:50% 100%;animation:br 3.8s ease-in-out infinite}@keyframes br{50%{transform:scale(1.015,1.055)}}` +
    `.fl{animation:fl 2.6s steps(5) infinite}@keyframes fl{0%,100%{opacity:1}35%{opacity:.8}60%{opacity:.94}82%{opacity:.86}}` +
    `.bob{animation:bob 5.2s ease-in-out infinite alternate}@keyframes bob{to{transform:translateY(5px)}}` +
    `.tw{animation:tw 3.6s ease-in-out infinite alternate}@keyframes tw{from{opacity:.2}to{opacity:1}}` +
    `.spin{transform-box:fill-box;transform-origin:50% 50%;animation:spin 16s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}` +
    `.drift{animation:drift var(--d,140s) linear infinite}@keyframes drift{to{transform:translateX(var(--dx,240px))}}` +
    `.rip{transform-box:fill-box;transform-origin:50% 50%;animation:rip 3.4s ease-out infinite}@keyframes rip{from{transform:scale(.2);opacity:.7}to{transform:scale(1.6);opacity:0}}` +
    `.rise{animation:rise var(--d,9s) linear infinite}@keyframes rise{from{transform:translate(0,0);opacity:0}12%{opacity:.6}to{transform:translate(calc(var(--wind)*90px + 12px),-160px);opacity:0}}`
  )
}

/** Độ lệch pha (giây) cho các class lặp, để chuyển động liền mạch qua lần vẽ lại. */
export const LOOP_CLASSES: [string, number][] = [
  ['sw1', 4.3 * 2], ['sw2', 5.9 * 2], ['sw3', 3.2 * 2], ['sw4', 7.7 * 2], ['br', 3.8], ['fl', 2.6], ['bob', 10.4], ['tw', 7.2], ['spin', 16], ['rip', 3.4],
]

export const smoothstep = smooth
