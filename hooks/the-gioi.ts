// Cầu nối mod ↔ thế giới nền (mã vẽ thế giới nằm ở hooks/world/).
// Mọi thứ ở đây thuần: không `$`, không Date — giờ do mod truyền vào.
import type { HourPick, SeasonPick, WeatherPick, WorldDetail, WorldView } from '../types'
import { SHOWN_S, SPAN_S, atElapsed, compose } from './world/compose'
import type { ComposeStats } from './world/compose'
import { camAt } from './world/camera'
import { REGIONS } from './world/regions/index'
import { sky } from './world/sky'
import { mid } from './world/mid'
import { weather } from './world/weather'
import { actors } from './world/actors'
import { season as seasonOf, tietKhi, vnTime } from './world/time'
import { weatherTimeline, type WeatherOverride } from './world/weather-model'
import type { Season, WeatherSlice } from './world/types'

const MODS = { regions: REGIONS, sky, mid, weather, actors }
const SHOTS = REGIONS.flatMap(r => r.shots)

/** Cửa sổ vẽ lấy từ lõi (compose.SPAN_S / SHOWN_S): bản vẽ phủ 3 phút, mod vẽ lại mỗi 2 phút nên luôn còn dư 1 phút.
 *  Cửa sổ ngắn = camera đi qua ít vùng hơn = ít phải cắt chi tiết (12.3% → 4.6% nội dung lên hình bị cắt). */
export const WINDOW_MS = SHOWN_S * 1000
const SPAN = SPAN_S

export const DEFAULT_VIEW: WorldView = { weather: 'tu-nhien', season: 'tu-nhien', hour: 'that', shift: 0 }

export const WEATHER_PICKS: { id: WeatherPick; label: string; override?: WeatherOverride }[] = [
  { id: 'tu-nhien', label: 'Tự nhiên' },
  { id: 'nang', label: 'Nắng đẹp', override: { cloud: 'quang', precip: 'khong', fog: 0, wind: 0.25 } },
  { id: 'may-it', label: 'Mây ít', override: { cloud: 'it', precip: 'khong', fog: 0 } },
  { id: 'may-vua', label: 'Mây vừa', override: { cloud: 'vua', precip: 'khong', fog: 0 } },
  { id: 'may-nhieu', label: 'Mây nhiều', override: { cloud: 'nhieu', precip: 'khong', fog: 0 } },
  { id: 'gio', label: 'Gió lộng', override: { cloud: 'it', precip: 'khong', fog: 0, wind: 0.95 } },
  { id: 'suong', label: 'Sương mù', override: { cloud: 'vua', precip: 'khong', fog: 0.8, wind: 0.1 } },
  { id: 'phun', label: 'Mưa phùn', override: { cloud: 'nhieu', precip: 'phun', fog: 0.3, wind: 0.2 } },
  { id: 'mua', label: 'Mưa', override: { cloud: 'nhieu', precip: 'mua', wind: 0.45 } },
  { id: 'mua-rao', label: 'Mưa rào', override: { cloud: 'nhieu', precip: 'mua', shower: true, wind: 0.6 } },
  { id: 'mua-to', label: 'Mưa to', override: { cloud: 'u-am', precip: 'mua-to', wind: 0.8 } },
  { id: 'tuyet', label: 'Tuyết', override: { cloud: 'u-am', precip: 'tuyet', wind: 0.3 } },
]
export const SEASON_PICKS: { id: SeasonPick; label: string }[] = [
  { id: 'tu-nhien', label: 'Tự nhiên' },
  { id: 'xuan', label: 'Xuân' },
  { id: 'ha', label: 'Hạ' },
  { id: 'thu', label: 'Thu' },
  { id: 'dong', label: 'Đông' },
]
export const HOUR_PICKS: { id: HourPick; label: string; hour?: number }[] = [
  { id: 'that', label: 'Giờ thật' },
  { id: 'binh-minh', label: 'Bình minh', hour: 5.75 },
  { id: 'trua', label: 'Trưa', hour: 12 },
  { id: 'hoang-hon', label: 'Hoàng hôn', hour: 17.45 },
  { id: 'dem', label: 'Đêm', hour: 21.5 },
]
export const DETAIL_PICKS: { id: WorldDetail; label: string }[] = [
  { id: 'full', label: 'Đầy đủ' },
  { id: 'lite', label: 'Nhẹ' },
]

const SEASON_NAME: Record<Season, string> = { xuan: 'Xuân', ha: 'Hạ', thu: 'Thu', dong: 'Đông' }
const WEEKDAY = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

export const isWeatherPick = (v: unknown): v is WeatherPick => WEATHER_PICKS.some(p => p.id === v)
export const isSeasonPick = (v: unknown): v is SeasonPick => SEASON_PICKS.some(p => p.id === v)
export const isHourPick = (v: unknown): v is HourPick => HOUR_PICKS.some(p => p.id === v)
export const isDetail = (v: unknown): v is WorldDetail => v === 'full' || v === 'lite'

/** Độ lệch (ms) để giờ Việt Nam hiển thị bằng giờ đã chọn, cùng ngày hôm nay. */
export function shiftFor(hour: HourPick, now: number): number {
  const target = HOUR_PICKS.find(p => p.id === hour)?.hour
  if (target === undefined) return 0
  return Math.round((target - vnTime(now).hourF) * 3_600_000)
}

export function windowStart(worldNow: number): number {
  return Math.floor(worldNow / WINDOW_MS) * WINDOW_MS
}

function overrideOf(view: WorldView): WeatherOverride | undefined {
  return WEATHER_PICKS.find(p => p.id === view.weather)?.override
}

// Một cửa sổ tốn vài chục tới vài trăm ms để ghép; nhớ vài cửa sổ gần nhất (mất khi mod tải lại, không sao).
type Frame = { svg: string; stats: ComposeStats }
const cache = new Map<string, Frame>()
function frameOf(win: number, view: WorldView, detail: WorldDetail): Frame {
  const key = `${win}|${view.weather}|${view.season}|${detail}`
  const hit = cache.get(key)
  if (hit) return hit
  const { svg, stats } = compose(MODS, {
    now: win,
    span: SPAN,
    detail,
    weather: overrideOf(view),
    season: view.season === 'tu-nhien' ? undefined : view.season,
    budget: detail === 'lite' ? 90_000 : 130_000,
    shown: WINDOW_MS / 1000,
  })
  const frame = { svg, stats }
  cache.set(key, frame)
  if (cache.size > 6) cache.delete(cache.keys().next().value as string)
  return frame
}

/** SVG đã gắn số giây trôi trong cửa sổ, để camera/hoạt ảnh nối tiếp đúng chỗ khi bề mặt vẽ lại. */
export function backdropSvg(win: number, worldNow: number, view: WorldView, detail: WorldDetail): { svg: string; stats: ComposeStats } {
  const frame = frameOf(win, view, detail)
  return { svg: atElapsed(frame.svg, (worldNow - win) / 1000), stats: frame.stats }
}

/** Cùng bản vẽ cho một khung (pane): gốc SVG mang kích thước riêng (lấy từ viewBox) thay cho 100%, để khung giữ tỉ lệ
 *  của bản vẽ theo bề ngang thay vì không có kích thước riêng. Chỉ sửa thẻ gốc; dùng cho cả thế giới lẫn bản in. */
export function windowSvg(svg: string): string {
  const root = /^<svg\b[^>]*>/.exec(svg)?.[0]
  const box = root && /\sviewBox="\s*-?[\d.]+\s+-?[\d.]+\s+([\d.]+)\s+([\d.]+)\s*"/.exec(root)
  if (!root || !box) return svg
  const sized = root.replace(/\swidth="100%"/, ` width="${box[1]}"`).replace(/\sheight="100%"/, ` height="${box[2]}"`)
  return sized + svg.slice(root.length)
}

function regionAt(x: number): string {
  return (REGIONS.find(r => x >= r.x0 && x < r.x1) ?? REGIONS[REGIONS.length - 1])?.name ?? ''
}

function weatherWords(s: WeatherSlice | undefined): string {
  if (!s) return ''
  const sky = { quang: 'trời quang', it: 'ít mây', vua: 'mây vừa', nhieu: 'nhiều mây', 'u-am': 'u ám' }[s.cloud]
  const rain =
    s.precip === 'khong' ? '' : s.isShower && s.precip === 'mua' ? 'mưa rào' : { phun: 'mưa phùn', mua: 'mưa', 'mua-to': 'mưa to', tuyet: 'tuyết rơi' }[s.precip]
  const extra = [s.fog >= 0.4 ? 'sương mù' : '', s.wind >= 0.65 ? 'gió mạnh' : s.wind >= 0.35 ? 'gió nhẹ' : '', s.lightning ? 'có sấm chớp' : '']
  return [rain || sky, ...extra].filter(Boolean).join(', ')
}

export type WorldInfo = {
  clock: string
  date: string
  tietKhi: string
  season: string
  weather: string
  place: string
  /** Cảnh camera đang lướt tới trong 1 phút tới, nếu khác cảnh hiện tại. */
  heading: string | undefined
}

/** Mô tả thế giới lúc `worldNow` (đã cộng shift) theo cùng mô phỏng mà nền đang vẽ. */
export function describe(worldNow: number, view: WorldView): WorldInfo {
  const vn = vnTime(worldNow)
  const weekday = WEEKDAY[(Math.floor((worldNow + 7 * 3_600_000) / 86_400_000) + 4) % 7] ?? ''
  const season = view.season === 'tu-nhien' ? seasonOf(vn).season : view.season
  const slice = weatherTimeline(worldNow, 60, overrideOf(view)).slices[0]
  const here = regionAt(camAt(SHOTS, worldNow / 1000).x)
  const ahead = regionAt(camAt(SHOTS, worldNow / 1000 + 60).x)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return {
    clock: `${pad(vn.h)}:${pad(vn.mi)}`,
    date: `${weekday}, ${pad(vn.d)}.${pad(vn.mo)}.${vn.y}`,
    tietKhi: tietKhi(vn),
    season: SEASON_NAME[season],
    weather: weatherWords(slice),
    place: here,
    heading: ahead !== here ? ahead : undefined,
  }
}
