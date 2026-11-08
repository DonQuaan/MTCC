// Tự mở khung, phần biên: gọi chồng nhau, đối số sai, giá trị lạ trong kho, nút Cửa sổ, app gắn vào lúc phiên còn nạp kho.
import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

const REFUSED = 'no attached desktop client says it draws backdrops (a desktop app with the backdrop layer does, on its ui_attach)'
const START = { cwd: '/', surface: 'desktop', isInteractive: true } as const
const BAND = {
  plugin: 'giao-dien-dep',
  surface: 'desktop',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

type App = { opened: string[]; surfaces: ('desktop' | 'terminal')[]; gate?: Promise<void>; onOpen?: () => void }

function engineBeneath(on: Parameters<TestBody>[1], stored: Record<string, unknown> | null, app: App) {
  if (stored) mock.store(on, stored)
  mock.clock(on, { now: 100_000 })
  on('session.surfaces', () => ({ value: app.surfaces }))
  on('session.attach', (_, e) => ({ clientId: e.clientId }))
  on('session.detach', (_, e) => ({ clientId: e.clientId }))
  on('command.register', () => ({ value: { command: 'giao-dien' } }))
  on('ui.open', async (_, e) => {
    app.opened.push(e.id)
    app.onOpen?.()
    if (app.gate) await app.gate
    return { value: { isPlaced: true } }
  })
  on('ui.backdrop', () => ({ value: { isDrawn: false, reason: REFUSED } }))
  on('ui.toast', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
}
const windows = (app: App) => app.opened.filter(id => id === 'cua-so').length
const run = ($: Parameters<TestBody>[0], args: string) =>
  $.command.run({ command: 'giao-dien', args } as Parameters<typeof $.command.run>[0]).then(r => JSON.stringify(r))

// Dấu "đã mở" đặt TRƯỚC khi mở: app gắn thêm lúc khung còn đang mở dở thì không gọi mở lần hai.
test('app gắn thêm trong lúc ui.open của lần tự mở trước chưa xong: không gọi mở lần hai', async ($, on) => {
  let release = () => {}
  let started = () => {}
  const opening = new Promise<void>(r => { started = r })
  const app: App = { opened: [], surfaces: [], gate: new Promise<void>(r => { release = r }) }
  app.onOpen = () => started()
  engineBeneath(on, {}, app)
  await $.session.start(START)
  app.surfaces = ['desktop']
  const first = $.session.attach({ surface: 'desktop', clientId: 'desktop:a' })
  await opening
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:b' })
  release()
  await first
  expect(windows(app)).toBe(1)
})

// `/giao-dien tu-mo` thiếu hoặc sai đối số không được lặng lẽ tắt tự mở.
test('tu-mo thiếu hoặc sai đối số: báo không hiểu, không đổi lựa chọn, không ghi kho', async ($, on) => {
  const app: App = { opened: [], surfaces: [] }
  const writes: string[] = []
  const kept = new Map<string, unknown>()
  on('store.get', (_, e) => ({ value: kept.get(e.key) }))
  on('store.set', (_, e) => {
    kept.set(e.key, e.value)
    writes.push(e.key)
    return { value: undefined }
  })
  engineBeneath(on, null, app)
  await $.session.start(START)
  expect(await run($, 'tu-mo')).toMatch(/Không hiểu/)
  expect(await run($, 'tu-mo co')).toMatch(/Không hiểu/)
  expect(writes).not.toContain('auto-window')
  app.surfaces = ['desktop']
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:default' })
  expect(windows(app)).toBe(1)
})

// Giá trị lạ trong kho bị bỏ qua như các khoá khác.
test('giá trị lạ trong kho (0, null, chuỗi rỗng) dưới auto-window: bỏ qua, vẫn tự mở theo mặc định', async ($, on) => {
  const app: App = { opened: [], surfaces: ['desktop'] }
  engineBeneath(on, { 'auto-window': 0 }, app)
  await $.session.start(START)
  expect(windows(app)).toBe(1)
})

// Nút Cửa sổ trên thanh trạng thái phải tự nó mở khung: tắt tự mở để chỉ cú bấm được đếm.
test('nút Cửa sổ trên thanh trạng thái tự nó mở khung (tách khỏi lần tự mở)', async ($, on) => {
  const app: App = { opened: [], surfaces: ['desktop'] }
  engineBeneath(on, { 'auto-window': false }, app)
  await $.session.start(START)
  expect(windows(app)).toBe(0)
  const band = await $.ui.mount(BAND)
  await band.press({ key: 'mo-cua-so' })
  expect(windows(app)).toBe(1)
  await band.unmount()
})

// App desktop gắn vào lúc session.start còn đang nạp kho: chưa được tự mở theo giá trị mặc định (tự mở: bật, nền: thế giới)
// mà phải chờ lựa chọn đã lưu, nếu không sẽ mở khung dù người dùng đã tắt.
test('đã lưu tu-mo tat, app gắn vào lúc session.start còn chạy: không được mở khung', async ($, on) => {
  const app: App = { opened: [], surfaces: ['desktop'] }
  engineBeneath(on, { 'auto-window': false }, app)
  await Promise.all([$.session.start(START), $.session.attach({ surface: 'desktop', clientId: 'desktop:default' })])
  expect(windows(app)).toBe(0)
})

test('đã lưu hình nền tắt, app gắn vào lúc session.start còn chạy: không được mở khung', async ($, on) => {
  const app: App = { opened: [], surfaces: ['desktop'] }
  engineBeneath(on, { 'theme-v3': 'tat' }, app)
  await Promise.all([$.session.start(START), $.session.attach({ surface: 'desktop', clientId: 'desktop:default' })])
  expect(windows(app)).toBe(0)
})

test('app gắn vào đúng lúc phiên đang đọc kho: chờ đọc xong lựa chọn mới quyết, không mở theo mặc định', async ($, on) => {
  let release = () => {}
  let reached = () => {}
  const gate = new Promise<void>(r => { release = r })
  const reading = new Promise<void>(r => { reached = r })
  const kept = new Map<string, unknown>([['auto-window', false]])
  on('store.get', async (_, e) => {
    reached()
    await gate
    return { value: kept.get(e.key) }
  })
  on('store.set', (_, e) => {
    kept.set(e.key, e.value)
    return { value: undefined }
  })
  const app: App = { opened: [], surfaces: ['desktop'] }
  engineBeneath(on, null, app)
  const start = $.session.start(START)
  await reading
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:default' })
  release()
  await start
  expect(windows(app)).toBe(0)
})
