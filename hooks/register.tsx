import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { BackdropState, GlassLevel, HourPick, Meta, PlateId, SeasonPick, Stats, ThemeId, WeatherPick, WorldDetail, WorldView } from '../types'
import { bars, oklch, PLATE_IDS, PLATES } from './plates'
import type { Journey } from './plates'
import {
  backdropSvg,
  DEFAULT_VIEW,
  describe,
  DETAIL_PICKS,
  HOUR_PICKS,
  isDetail,
  isHourPick,
  isSeasonPick,
  isWeatherPick,
  SEASON_PICKS,
  shiftFor,
  WEATHER_PICKS,
  WINDOW_MS,
  windowStart,
  windowSvg,
} from './the-gioi'

const PANE = 'studio'
// Khung dự phòng: cùng thế giới, vẽ trong một khung cạnh khung chat khi app chưa vẽ nền sau khung chat.
const WINDOW = 'cua-so'
const BACKDROP = 'ban-in'
const COMMAND = 'giao-dien'

// ───────────────────────── Trạng thái của phiên ─────────────────────────
// Tag `shape` đổi khi kiểu đổi: giá trị bản cũ lưu trong phiên bị bỏ qua, không làm hỏng bản mới.
const themeAtom = atom({ plugin: 'giao-dien-dep', key: 'theme' } as const, 'the-gioi', { shape: 'theme-3' })
const glassAtom = atom({ plugin: 'giao-dien-dep', key: 'glass' } as const, 'mo', { shape: 'glass-2' })
const bandAtom = atom({ plugin: 'giao-dien-dep', key: 'band' } as const, true)
const statsAtom = atom({ plugin: 'giao-dien-dep', key: 'stats' } as const, { tools: {}, turns: 0 }, { shape: 'stats-1' })
const doneAtom = atom({ plugin: 'giao-dien-dep', key: 'done' } as const, 0)
const metaAtom = atom({ plugin: 'giao-dien-dep', key: 'meta' } as const, null, { shape: 'meta-1' })
const liveAtom = atom({ plugin: 'giao-dien-dep', key: 'live' } as const, { startedAt: null, now: 0 }, { shape: 'live-1' })
const viewAtom = atom({ plugin: 'giao-dien-dep', key: 'view' } as const, DEFAULT_VIEW, { shape: 'view-1' })
const detailAtom = atom({ plugin: 'giao-dien-dep', key: 'detail' } as const, 'full', { shape: 'detail-1' })
const winAtom = atom({ plugin: 'giao-dien-dep', key: 'win' } as const, 0)
const minuteAtom = atom({ plugin: 'giao-dien-dep', key: 'minute' } as const, 0)
const backdropAtom = atom({ plugin: 'giao-dien-dep', key: 'backdrop' } as const, { isDrawn: true, reason: '', hasDesktop: false }, { shape: 'backdrop-2' })

// Khoá lưu qua các phiên. Bản v0.2 lưu "theme" là một bản in; khoá mới để lần đầu ai cũng thấy thế giới nền.
const STORE = { theme: 'theme-v3', glass: 'glass', band: 'band', view: 'world-view', detail: 'world-detail' } as const

const GLASS: Record<GlassLevel, { label: string; blur: number; opacity: number }> = {
  trong: { label: 'Trong', blur: 10, opacity: 0.55 },
  mo: { label: 'Mờ', blur: 20, opacity: 0.72 },
  duc: { label: 'Đục', blur: 36, opacity: 0.86 },
}
const GLASS_IDS = Object.keys(GLASS) as GlassLevel[]

// Màu chữ cho biểu đồ trong Studio: xám ấm đọc được trên cả nền sáng lẫn tối.
const MUTED = oklch(0.62, 0.012, 80)
// Màu nhấn của thế giới nền: xanh rêu.
const MOSS = oklch(0.62, 0.11, 140)

// `in` cũng nhận khoá kế thừa của Object ('constructor', 'toString'…) → giá trị lạ trong store/lệnh lọt qua rồi vỡ khi tra bảng.
const own = (table: object, key: string) => Object.prototype.hasOwnProperty.call(table, key)

function isThemeId(value: unknown): value is ThemeId {
  return value === 'tat' || value === 'the-gioi' || (typeof value === 'string' && own(PLATES, value))
}

function isGlass(value: unknown): value is GlassLevel {
  return typeof value === 'string' && own(GLASS, value)
}

function isView(value: unknown): value is WorldView {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return isWeatherPick(v.weather) && isSeasonPick(v.season) && isHourPick(v.hour) && typeof v.shift === 'number'
}

function total(stats: Stats): number {
  return Object.values(stats.tools).reduce((sum, n) => sum + n, 0)
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const mm = Math.floor(s / 60)
  return `${mm.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

function journeyOf(done: number, meta: Meta | null): Journey {
  return { turns: done, folder: meta?.folder ?? 'phiên này', date: meta?.date ?? '' }
}

// Vẽ một bản in tốn ~30 ms; nhớ vài kết quả gần nhất (mất khi mod tải lại, không sao).
const cache = new Map<string, string>()
function drawn(id: PlateId, j: Journey, detail: 'full' | 'thumb'): string {
  const key = `${id}|${detail}|${j.turns}|${j.folder}|${j.date}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const svg = PLATES[id].render(j, detail)
  cache.set(key, svg)
  if (cache.size > 16) cache.delete(cache.keys().next().value as string)
  return svg
}

// ───────────────────────── Hành động (nhận `$`) ─────────────────────────
type Engine = EngineInterface

async function syncBackdrop($: Engine): Promise<BackdropState> {
  const id = await read($, themeAtom)
  const hasDesktop = (await $.session.surfaces()).includes('desktop')
  if (id === 'tat') {
    await $.ui.backdrop(undefined)
    return keepBackdrop($, { isDrawn: true, reason: '', hasDesktop })
  }
  const glass = GLASS[await read($, glassAtom)]
  const set = await $.ui.backdrop({ id: BACKDROP, glass: { blur: glass.blur, opacity: glass.opacity } })
  return keepBackdrop($, set.isDrawn ? { isDrawn: true, reason: '', hasDesktop } : { isDrawn: false, reason: set.reason, hasDesktop })
}

/** Ghi kết quả đặt nền khi nó đổi (thanh trạng thái và Studio đọc để hiện nút Cửa sổ). */
async function keepBackdrop($: Engine, next: BackdropState): Promise<BackdropState> {
  const cur = await read($, backdropAtom)
  if (cur.isDrawn !== next.isDrawn || cur.reason !== next.reason || cur.hasDesktop !== next.hasDesktop) await update($, backdropAtom, () => next)
  return next
}

/** Lời engine (tiếng Anh) → câu tiếng Việt. Engine 2.1.317 từ chối khi không app desktop nào đang gắn khai
 *  `draws: ["Backdrop"]`: app Claude 4.23118 chỉ khai khi một cờ tính năng phía máy chủ của app được bật. */
function whyNot(state: BackdropState): string {
  if (!state.hasDesktop) return 'Nền chỉ vẽ trong app Claude desktop (tab Code); lúc này chưa có app desktop nào gắn vào phiên.'
  const reason = state.reason
  if (/draws backdrops/i.test(reason))
    return 'App Claude desktop này chưa bật lớp vẽ nền sau khung chat (tính năng còn khoá ở phía máy chủ của app). Nền đã đặt sẵn và tự hiện khi app bật lớp này.'
  return `App chưa vẽ nền sau khung chat (${reason}).`
}

function themeLabel(id: ThemeId): string {
  if (id === 'tat') return 'Đã tắt hình nền.'
  if (id === 'the-gioi') return 'Thế giới nền: sống theo giờ Việt Nam.'
  return `Bản ${PLATES[id].numeral} · ${PLATES[id].name}.`
}

async function applyTheme($: Engine, id: ThemeId): Promise<string> {
  await update($, themeAtom, () => id)
  await $.store.set(STORE.theme, id)
  if (id === 'the-gioi') await worldTick($)
  const drawn = await syncBackdrop($)
  const label = themeLabel(id)
  $.ui.toast(label)
  if (drawn.isDrawn) return label
  if (!drawn.hasDesktop) return `${label} ${whyNot(drawn)}`
  const isPlaced = await openWindow($)
  return `${label} ${whyNot(drawn)} ${isPlaced ? 'Trong lúc chờ, cảnh đang hiện trong khung “Thế giới nền” cạnh khung chat.' : 'Gõ /giao-dien cua-so để xem cảnh trong một khung.'}`
}

async function applyGlass($: Engine, level: GlassLevel): Promise<void> {
  await update($, glassAtom, () => level)
  await $.store.set(STORE.glass, level)
  await syncBackdrop($)
}

async function setBand($: Engine, isOn: boolean): Promise<void> {
  await update($, bandAtom, () => isOn)
  await $.store.set(STORE.band, isOn)
}

async function openStudio($: Engine): Promise<void> {
  await $.ui.open({ id: PANE, title: 'Studio giao diện' })
}

async function openWindow($: Engine): Promise<boolean> {
  const id = await read($, themeAtom)
  const opened = await $.ui.open({ id: WINDOW, title: id === 'the-gioi' ? 'Thế giới nền' : 'Hình nền' })
  return opened.isPlaced
}

async function tick($: Engine): Promise<void> {
  const now = await $.clock.now()
  await update($, liveAtom, live => ({ ...live, now }))
}

/** Giờ của thế giới = giờ thật + độ lệch đang xem (0 khi xem giờ thật). */
async function worldNow($: Engine): Promise<number> {
  return (await $.clock.now()) + (await read($, viewAtom)).shift
}

/** Nhịp 30 s: đổi phút cho thanh trạng thái; sang cửa sổ mới (WINDOW_MS, 2 phút) thì nền vẽ lại. Chỉ ghi khi giá trị đổi. */
async function worldTick($: Engine): Promise<void> {
  const now = await worldNow($)
  const minute = Math.floor(now / 60_000)
  if ((await read($, minuteAtom)) !== minute) await update($, minuteAtom, () => minute)
  const win = windowStart(now)
  if ((await read($, winAtom)) !== win) await update($, winAtom, () => win)
}

/** Hẹn một lần ở mép cửa sổ vẽ kế tiếp (+100 ms) rồi tự hẹn lại; nhịp 30 s và lúc đổi giờ xem cũng hẹn lại (mép dời).
 *  Bản vẽ chỉ chắc đủ nội dung tới giây WINDOW_MS; chờ nhịp 30 s mới sang bản mới thì lộ mảng cắt cứng (đo: giây 150). */
let edge: Timer | undefined
async function armEdge($: Engine): Promise<void> {
  edge?.cancel()
  const now = await worldNow($)
  edge = $.clock.after(windowStart(now) + WINDOW_MS - now + 100, () => void worldTick($).then(() => armEdge($)))
}

async function setView($: Engine, change: Partial<WorldView>): Promise<WorldView> {
  const now = await $.clock.now()
  const next = await update($, viewAtom, v => {
    const merged = { ...v, ...change }
    // Giờ xem cố định lúc chọn: từ đó thời gian vẫn trôi (bình minh sáng dần), không nhảy lại mỗi lần vẽ.
    return change.hour === undefined ? merged : { ...merged, shift: shiftFor(change.hour, now) }
  })
  await $.store.set(STORE.view, next)
  await worldTick($)
  return next
}

async function setDetail($: Engine, detail: WorldDetail): Promise<void> {
  await update($, detailAtom, () => detail)
  await $.store.set(STORE.detail, detail)
}

/** Cảnh đang dùng: thế giới (SVG động theo cửa sổ vẽ) hoặc một bản in. Chỉ đọc theme/win/view/detail (bản in: done/meta)
 *  nên nền và khung Thế giới nền chỉ vẽ lại mỗi cửa sổ (WINDOW_MS) hoặc khi người dùng đổi lựa chọn. */
async function scene($: Engine, id: Exclude<ThemeId, 'tat'>): Promise<{ svg: string; alt: string; isLive: boolean; caption: string }> {
  if (id === 'the-gioi') {
    const view = await read($, viewAtom)
    const detail = await read($, detailAtom)
    const now = await worldNow($)
    const stored = await read($, winAtom)
    const win = stored > now - WINDOW_MS - 60_000 && stored <= now ? stored : windowStart(now)
    const { svg } = backdropSvg(win, now, view, detail)
    const info = describe(win, view)
    return {
      svg,
      alt: `Thế giới nền lúc ${info.clock} giờ Việt Nam, ${info.tietKhi}, ${info.weather}, cảnh ${info.place}`,
      isLive: true,
      caption: `Tiết ${info.tietKhi} · ${info.weather} · ${info.place}`,
    }
  }
  const j = journeyOf(await read($, doneAtom), await read($, metaAtom))
  return { svg: drawn(id, j, 'full'), alt: `Hình nền: bản ${PLATES[id].numeral}, ${PLATES[id].name}`, isLive: false, caption: `Bản ${PLATES[id].numeral} · ${PLATES[id].name}` }
}

function labelOf<T extends string>(list: { id: T; label: string }[], id: T): string {
  return list.find(p => p.id === id)?.label ?? id
}

const HELP =
  'Nền: the-gioi | dia-hinh | son-mai | thien-do | giay-do | tat. Thế giới: troi <tu-nhien|nang|may-it|may-vua|may-nhieu|gio|suong|phun|mua|mua-rao|mua-to|tuyet> · mua <tu-nhien|xuan|ha|thu|dong> · gio <that|binh-minh|trua|hoang-hon|dem> · chi-tiet <day-du|nhe>. Kính: kinh trong|mo|duc. Thanh: thanh bat|tat. Khung xem cảnh: cua-so.'

// ───────────────────────── Mod ─────────────────────────
export const register: Register = on => {
  let timer: Timer | undefined
  let world: Timer | undefined
  /** Lần vẽ nền gần nhất là nền của mod khác (mất khi mod tải lại: khi đó mod đặt nền ở session.start như thường). */
  let othersStand = false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Mở Studio giao diện, hoặc đổi nhanh: /giao-dien the-gioi | cua-so | troi mua-rao | mua thu | gio dem | tat',
      argumentHint: '[the-gioi | bản in | tat | cua-so | troi … | mua … | gio … | chi-tiet … | kinh … | thanh …]',
    })
    const savedTheme = await $.store.get(STORE.theme)
    if (isThemeId(savedTheme)) await update($, themeAtom, () => savedTheme)
    const savedGlass = await $.store.get(STORE.glass)
    if (isGlass(savedGlass)) await update($, glassAtom, () => savedGlass)
    const savedBand = await $.store.get(STORE.band)
    if (typeof savedBand === 'boolean') await update($, bandAtom, () => savedBand)
    const savedView = await $.store.get(STORE.view)
    // Giờ xem thử không giữ qua phiên mới: mở app lại là về giờ thật.
    if (isView(savedView)) await update($, viewAtom, () => ({ ...savedView, hour: 'that', shift: 0 }))
    const savedDetail = await $.store.get(STORE.detail)
    if (isDetail(savedDetail)) await update($, detailAtom, () => savedDetail)
    if ((await read($, metaAtom)) === null) {
      // Ngày theo giờ Việt Nam (UTC+7) như cả mod, không theo múi giờ của máy.
      const day = new Date((await $.clock.now()) + 7 * 3600_000)
      const date = `${day.getUTCDate().toString().padStart(2, '0')}.${(day.getUTCMonth() + 1).toString().padStart(2, '0')}.${day.getUTCFullYear()}`
      const folder = e.cwd.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || e.cwd
      await update($, metaAtom, () => ({ folder, date }))
    }
    // Tải lại giữa lượt: chạy lại đồng hồ.
    if ((await read($, liveAtom)).startedAt !== null) timer = $.clock.every(1000, () => void tick($))
    await worldTick($)
    world?.cancel()
    // Nhịp 30 s cho phút trên thanh trạng thái, kèm hẹn đúng mép cửa sổ vẽ: bản vẽ chỉ chắc đủ nội dung tới giây
    // WINDOW_MS (phần dư tới SPAN bị cắt bớt vì trần ký tự), nên trễ cả 30 s là lộ mảng cắt cứng (đo: giây 150).
    world = $.clock.every(30_000, () => void worldTick($).then(() => armEdge($)))
    await armEdge($)
    await syncBackdrop($)

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const [first = '', second = ''] = e.args.trim().toLowerCase().split(/\s+/)
    if (first === '') {
      await openStudio($)
      return { text: 'Đã mở Studio giao diện.' }
    }
    if (isThemeId(first)) return { text: await applyTheme($, first) }
    if (first === 'cua-so') {
      if ((await read($, themeAtom)) === 'tat') return { text: 'Hình nền đang tắt. Gõ /giao-dien the-gioi để bật.' }
      if (!(await $.session.surfaces()).includes('desktop')) return { text: 'Khung xem cảnh chỉ vẽ trong app Claude desktop (tab Code).' }
      return { text: (await openWindow($)) ? 'Đã mở khung xem cảnh cạnh khung chat.' : 'Chưa có app nào gắn vào phiên để vẽ khung.' }
    }
    if (first === 'troi' && isWeatherPick(second)) {
      await setView($, { weather: second })
      return { text: second === 'tu-nhien' ? 'Thời tiết: theo tự nhiên.' : `Xem trước thời tiết: ${labelOf(WEATHER_PICKS, second).toLowerCase()}.` }
    }
    if (first === 'mua' && isSeasonPick(second)) {
      await setView($, { season: second })
      return { text: second === 'tu-nhien' ? 'Mùa: theo lịch thật.' : `Xem trước mùa ${labelOf(SEASON_PICKS, second).toLowerCase()}.` }
    }
    if (first === 'gio' && isHourPick(second)) {
      await setView($, { hour: second })
      await armEdge($)
      return { text: second === 'that' ? 'Về giờ thật Việt Nam.' : `Xem lúc ${labelOf(HOUR_PICKS, second).toLowerCase()}.` }
    }
    if (first === 'chi-tiet' && (second === 'day-du' || second === 'nhe')) {
      await setDetail($, second === 'nhe' ? 'lite' : 'full')
      return { text: second === 'nhe' ? 'Mức chi tiết: nhẹ (ít hạt mưa, ít hoạt ảnh).' : 'Mức chi tiết: đầy đủ.' }
    }
    if (first === 'kinh' && isGlass(second)) {
      await applyGlass($, second)
      return { text: `Lớp kính: ${GLASS[second].label.toLowerCase()}.` }
    }
    if (first === 'thanh' && (second === 'bat' || second === 'tat')) {
      await setBand($, second === 'bat')
      return { text: second === 'bat' ? 'Đã bật thanh trạng thái.' : 'Đã ẩn thanh trạng thái.' }
    }
    return { text: `Không hiểu “${e.args.trim()}”. ${HELP}` }
  })

  // App gắn vào phiên sau session.start, hoặc rời đi: hỏi lại engine có vẽ được nền không (nút Cửa sổ, lời báo theo đó).
  // Chỉ khi app DESKTOP gắn/rời (điện thoại, terminal không vẽ nền), và không khi nền của mod khác đang đứng:
  // gọi lại $.ui.backdrop là đặt lại nền ("One backdrop stands, the latest set") — không được giành nền người dùng không hỏi.
  on('session.attach', async ($, e, next) => {
    const done = await next(e)
    if (e.surface === 'desktop' && !othersStand) await syncBackdrop($)
    return done
  })
  on('session.detach', async ($, e, next) => {
    const done = await next(e)
    if (e.surface === 'desktop' && e.reason !== 'end' && !othersStand) await syncBackdrop($)
    return done
  })

  // Đầu lượt: đếm lượt, bật đồng hồ trên thanh trạng thái.
  on('prompt.submit', async ($, e, next) => {
    await update($, statsAtom, s => ({ ...s, turns: s.turns + 1 }))
    const now = await $.clock.now()
    await update($, liveAtom, () => ({ startedAt: now, now }))
    timer?.cancel()
    timer = $.clock.every(1000, () => void tick($))
    return next(e)
  })

  // Cuối lượt: dừng đồng hồ, khắc thêm một dấu lên bản in.
  on('turn.complete', async ($, e, next) => {
    // Lượt của subagent (có agentId) kết thúc giữa lượt chính: không được dừng đồng hồ hay đếm lượt.
    if (e.agentId !== undefined) return next(e)
    timer?.cancel()
    timer = undefined
    await update($, liveAtom, live => ({ ...live, startedAt: null }))
    await update($, doneAtom, n => n + 1)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const name = 'tool' in e ? String(e.tool) : 'khác'
    const after = await update($, statsAtom, s => ({
      ...s,
      tools: { ...s.tools, [name]: (s.tools[name] ?? 0) + 1 },
    }))
    const count = total(after)
    if (count > 0 && count % 50 === 0) $.ui.toast(`Phiên này đã chạy ${count} lệnh công cụ.`)
    return ran
  })

  // Nền. Thế giới: một SVG động phủ 3 phút (hiện 2 phút đầu rồi sang bản mới), vẽ trong khung sandbox để CSS chạy; chỉ đọc
  // theme/win/view/detail nên chỉ vẽ lại mỗi cửa sổ (WINDOW_MS) hoặc khi người dùng đổi lựa chọn.
  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    // Nền đang vẽ cho biết ai đặt nó sau cùng: của mod khác thì từ giờ không tự đặt lại (xem session.attach).
    othersStand = e.props.plugin !== $.plugin.name
    if (e.props.plugin !== $.plugin.name || e.props.id !== BACKDROP || e.surface !== 'desktop') return next(e)
    const id = await read($, themeAtom)
    if (id === 'tat') return next(e)
    const { Svg } = $.ui.resolve(e)
    const s = await scene($, id)
    return s.isLive ? <Svg source={s.svg} isInteractive alt={s.alt} /> : <Svg source={s.svg} alt={s.alt} />
  })

  // Khung Thế giới nền: cùng cảnh với nền, vẽ trong một khung cạnh khung chat — đường dự phòng khi app chưa
  // vẽ nền sau khung chat (xem whyNot). Không đọc phút: SVG chỉ gửi lại mỗi cửa sổ vẽ, hoạt ảnh không khởi động lại.
  on('ui.render', { component: 'Pane', requestId: WINDOW }, async ($, e) => {
    const table = $.ui.resolve(e)
    const { Box, Text, Button } = table
    const Svg = 'Svg' in table ? table.Svg : undefined
    const id = await read($, themeAtom)
    if (e.surface !== 'desktop')
      return (
        <Box padding="md">
          <Text dimColor>Khung này chỉ vẽ hình trong app Claude desktop.</Text>
        </Box>
      )
    if (id === 'tat')
      return (
        <Box flexDirection="column" gap="sm" padding="md">
          <Text dimColor>Hình nền đang tắt.</Text>
          <Button key="cua-so-bat" label="Dùng thế giới nền" variant="primary" onPress={() => applyTheme($, 'the-gioi')} />
        </Box>
      )
    const s = await scene($, id)
    const backdrop = await read($, backdropAtom)
    return (
      <Box flexDirection="column" gap="sm" padding="sm">
        {Svg ? (
          s.isLive ? <Svg source={windowSvg(s.svg)} isInteractive alt={s.alt} /> : <Svg source={windowSvg(s.svg)} alt={s.alt} />
        ) : (
          <Text dimColor>Bề mặt này không vẽ được hình.</Text>
        )}
        <Text size="footnote" dimColor>
          {s.caption}
        </Text>
        {!backdrop.isDrawn && (
          <Text size="footnote" dimColor>
            App này chưa vẽ được nền sau khung chat, nên cảnh hiện tạm ở đây.
          </Text>
        )}
        <Button key="cua-so-studio" plain label="Studio" onPress={() => openStudio($)} />
      </Box>
    )
  })

  // Thanh trạng thái: một dòng chữ nhỏ. Thế giới nền: giờ · tiết khí · trời · cảnh đang xem.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, bandAtom))) return next(e)
    const id = await read($, themeAtom)
    const stats = await read($, statsAtom)
    const live = await read($, liveAtom)
    const isWindowNeeded = e.surface === 'desktop' && id !== 'tat' && !(await read($, backdropAtom)).isDrawn
    const plate = id === 'tat' || id === 'the-gioi' ? undefined : PLATES[id]
    const accent = id === 'the-gioi' ? MOSS : (plate?.accent ?? 'claude')
    const { Box, Text, Button } = $.ui.resolve(e)
    let here: ReturnType<typeof describe> | undefined
    if (id === 'the-gioi') {
      const minute = await read($, minuteAtom)
      const view = await read($, viewAtom)
      here = describe(minute > 0 ? minute * 60_000 : await worldNow($), view)
    }
    return (
      <Box flexDirection="row" gap="md" alignItems="center">
        {here ? (
          <Text size="footnote" mono tabular color={accent}>
            {here.clock}
          </Text>
        ) : (
          plate && (
            <Text size="footnote" mono color={accent}>
              {plate.numeral}
            </Text>
          )
        )}
        <Text size="footnote" mono dimColor>
          {here ? `${here.tietKhi.toUpperCase()} · ${here.weather}` : plate ? plate.name.toUpperCase() : 'NỀN TẮT'}
        </Text>
        {here && (
          <Text size="footnote" dimColor>
            {here.place}
          </Text>
        )}
        <Text size="footnote" dimColor tabular>
          {stats.turns} lượt
        </Text>
        <Text size="footnote" dimColor tabular>
          {total(stats)} lệnh
        </Text>
        {e.props.isWorking && live.startedAt !== null && (
          <Text size="footnote" mono tabular color={accent}>
            ● {clock(live.now - live.startedAt)}
          </Text>
        )}
        {isWindowNeeded && (
          <Button key="mo-cua-so" plain onPress={() => openWindow($)}>
            <Text size="footnote" color={accent}>
              Cửa sổ
            </Text>
          </Button>
        )}
        <Button key="mo-studio" plain onPress={() => openStudio($)}>
          <Text size="footnote" dimColor>
            Studio
          </Text>
        </Button>
      </Box>
    )
  })

  // Studio: bảng điều khiển thế giới nền ở trên, bộ sưu tập bản in tĩnh ở dưới.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const current = await read($, themeAtom)
    const glass = await read($, glassAtom)
    const isBandOn = await read($, bandAtom)
    const backdrop = await read($, backdropAtom)
    const stats = await read($, statsAtom)
    const view = await read($, viewAtom)
    const detail = await read($, detailAtom)
    const minute = await read($, minuteAtom)
    const info = describe(minute > 0 ? minute * 60_000 : await worldNow($), view)
    const j = journeyOf(await read($, doneAtom), await read($, metaAtom))
    const table = $.ui.resolve(e)
    const { Box, Text, Button } = table
    const Svg = 'Svg' in table ? table.Svg : undefined
    const isWorld = current === 'the-gioi'
    const accent = isWorld ? MOSS : current === 'tat' ? 'claude' : PLATES[current].accent
    const chart = Svg ? bars(stats.tools, current === 'tat' || isWorld ? MOSS : PLATES[current].accent, MUTED) : undefined
    const isPreview = view.weather !== 'tu-nhien' || view.season !== 'tu-nhien' || view.hour !== 'that'

    const picks = <T extends string>(group: string, list: { id: T; label: string }[], value: T, onPick: (id: T) => Promise<unknown>) => (
      <Box flexDirection="row" gap="sm" flexWrap="wrap">
        {list.map(p => (
          <Button key={`${group}-${p.id}`} label={p.label} variant={p.id === value ? 'primary' : undefined} onPress={() => onPick(p.id)} />
        ))}
      </Box>
    )

    return (
      <Box flexDirection="column" gap="lg" padding="md">
        <Box flexDirection="column" gap="xs">
          <Text size="caption" mono dimColor>
            THẾ GIỚI NỀN · 10 VÙNG · SỐNG THEO GIỜ VIỆT NAM
          </Text>
          <Box flexDirection="row" gap="md" alignItems="center">
            <Text size="title" weight="semibold" tabular color={accent}>
              {info.clock}
            </Text>
            <Box flexDirection="column">
              <Text size="footnote">{info.date}</Text>
              <Text size="footnote" dimColor>
                Tiết {info.tietKhi} · mùa {info.season}
              </Text>
            </Box>
          </Box>
          <Text size="footnote" dimColor>
            Trời {info.weather}. Camera đang ở {info.place}
            {info.heading ? `, đang lướt về ${info.heading}` : ''}.
          </Text>
          {isPreview && (
            <Text size="footnote" color={accent}>
              Đang xem trước — bấm “Tự nhiên” và “Giờ thật” để về đúng thời tiết, mùa và giờ hiện tại.
            </Text>
          )}
          {current !== 'tat' && !backdrop.isDrawn && (
            <Box flexDirection="column" gap="xs">
              <Text size="footnote" dimColor>
                {whyNot(backdrop)}
              </Text>
              {e.surface === 'desktop' && <Button key="mo-cua-so" label="Xem cảnh trong khung" onPress={() => openWindow($)} />}
            </Box>
          )}
          {isWorld ? (
            <Button key="tat" plain label="Tắt hình nền" onPress={() => applyTheme($, 'tat')} />
          ) : (
            <Button key="the-gioi" label="Dùng thế giới nền" variant="primary" onPress={() => applyTheme($, 'the-gioi')} />
          )}
        </Box>

        <Box flexDirection="column" gap="sm">
          <Text size="caption" mono dimColor>
            THỜI TIẾT
          </Text>
          {picks('troi', WEATHER_PICKS, view.weather, (id: WeatherPick) => setView($, { weather: id }))}
        </Box>
        <Box flexDirection="column" gap="sm">
          <Text size="caption" mono dimColor>
            MÙA
          </Text>
          {picks('mua', SEASON_PICKS, view.season, (id: SeasonPick) => setView($, { season: id }))}
        </Box>
        <Box flexDirection="column" gap="sm">
          <Text size="caption" mono dimColor>
            GIỜ
          </Text>
          {picks('gio', HOUR_PICKS, view.hour, (id: HourPick) => setView($, { hour: id }).then(() => armEdge($)))}
        </Box>
        <Box flexDirection="column" gap="sm">
          <Text size="caption" mono dimColor>
            MỨC CHI TIẾT
          </Text>
          {picks('chi-tiet', DETAIL_PICKS, detail, (id: WorldDetail) => setDetail($, id))}
          <Text size="footnote" dimColor>
            Máy nóng hoặc quạt kêu: chọn Nhẹ.
          </Text>
        </Box>

        <Box flexDirection="column" gap="sm">
          <Text size="caption" mono dimColor>
            LỚP KÍNH
          </Text>
          <Box flexDirection="row" gap="sm">
            {GLASS_IDS.map(level => (
              <Button
                key={`kinh-${level}`}
                label={GLASS[level].label}
                variant={level === glass ? 'primary' : undefined}
                onPress={() => applyGlass($, level)}
              />
            ))}
          </Box>
        </Box>

        <Box flexDirection="column" gap="sm">
          <Text size="caption" mono dimColor>
            BẢN IN TĨNH · 4 BẢN
          </Text>
          {PLATE_IDS.map(id => {
            const plate = PLATES[id]
            const isCurrent = id === current
            return (
              <Box key={`ban-${id}`} flexDirection="column" gap="sm">
                {Svg && <Svg source={drawn(id, j, 'thumb')} alt={`Bản ${plate.numeral}, ${plate.name}`} width={280} height={175} />}
                <Box flexDirection="row" gap="sm" alignItems="center" justifyContent="space-between">
                  <Box flexDirection="row" gap="sm" alignItems="center">
                    <Text size="footnote" mono color={plate.accent}>
                      {plate.numeral}
                    </Text>
                    <Text weight="semibold">{plate.name}</Text>
                  </Box>
                  {isCurrent ? (
                    <Text size="footnote" color={plate.accent}>
                      Đang dùng
                    </Text>
                  ) : (
                    <Button key={id} label="Dùng bản này" onPress={() => applyTheme($, id)} />
                  )}
                </Box>
                <Text size="footnote" dimColor>
                  {plate.source}
                </Text>
              </Box>
            )
          })}
        </Box>

        <Box flexDirection="column" gap="sm">
          <Text size="caption" mono dimColor>
            PHIÊN NÀY
          </Text>
          <Box flexDirection="row" gap="xl">
            <Box flexDirection="column">
              <Text size="title" weight="semibold" tabular color={accent}>
                {stats.turns}
              </Text>
              <Text size="caption" dimColor>
                lượt
              </Text>
            </Box>
            <Box flexDirection="column">
              <Text size="title" weight="semibold" tabular>
                {total(stats)}
              </Text>
              <Text size="caption" dimColor>
                lệnh công cụ
              </Text>
            </Box>
          </Box>
          {chart && Svg ? (
            <Svg source={chart} alt="Số lần dùng mỗi công cụ trong phiên" />
          ) : (
            <Text size="footnote" dimColor>
              {total(stats) === 0 ? 'Chưa có lệnh công cụ nào.' : `${total(stats)} lệnh công cụ.`}
            </Text>
          )}
        </Box>

        <Button
          key="thanh"
          plain
          label={isBandOn ? 'Ẩn thanh trạng thái' : 'Hiện thanh trạng thái'}
          onPress={() => setBand($, !isBandOn)}
        />
      </Box>
    )
  })
}
