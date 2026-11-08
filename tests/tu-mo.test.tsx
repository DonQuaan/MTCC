// Tự mở khung Thế giới nền: mỗi phiên desktop mở MỘT lần khi app chưa vẽ nền sau khung chat; tắt được và nhớ qua phiên.
import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

const REFUSED = 'no attached desktop client says it draws backdrops (a desktop app with the backdrop layer does, on its ui_attach)'
const START = { cwd: '/', surface: 'desktop', isInteractive: true } as const

type App = {
  refused?: boolean
  placed?: boolean
  opened: string[]
  surfaces?: ('desktop' | 'terminal')[]
}

function engineBeneath(on: Parameters<TestBody>[1], stored: Record<string, unknown> | null, app: App) {
  if (stored) mock.store(on, stored)
  mock.clock(on, { now: 100_000 })
  on('session.surfaces', () => ({ value: app.surfaces ?? ['desktop'] }))
  on('session.attach', (_, e) => ({ clientId: e.clientId }))
  on('session.detach', (_, e) => ({ clientId: e.clientId }))
  on('command.register', () => ({ value: { command: 'giao-dien' } }))
  on('ui.open', (_, e) => {
    app.opened.push(e.id)
    return app.placed === false ? { value: { isPlaced: false, reason: 'narrow terminal' } } : { value: { isPlaced: true } }
  })
  on('ui.backdrop', () => (app.refused ? { value: { isDrawn: false, reason: REFUSED } } : { value: { isDrawn: true, requestId: 'backdrop' } }))
  on('ui.toast', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
}

const windows = (app: App) => app.opened.filter(id => id === 'cua-so').length
const run = ($: Parameters<TestBody>[0], args: string) => $.command.run({ command: 'giao-dien', args } as Parameters<typeof $.command.run>[0])

test('phiên desktop mà app chưa vẽ nền: tự mở khung đúng một lần, app gắn lại không mở thêm', async ($, on) => {
  const app: App = { refused: true, opened: [] }
  engineBeneath(on, {}, app)
  await $.session.start(START)
  expect(windows(app)).toBe(1)
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:2' })
  expect(windows(app)).toBe(1)
})

test('app desktop gắn vào sau khi phiên bắt đầu: mở khung lúc gắn', async ($, on) => {
  const app: App = { refused: true, opened: [], surfaces: [] }
  engineBeneath(on, {}, app)
  await $.session.start(START)
  expect(windows(app)).toBe(0)
  app.surfaces = ['desktop']
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:default' })
  expect(windows(app)).toBe(1)
})

test('app vẽ được nền sau khung chat: không mở khung', async ($, on) => {
  const app: App = { refused: false, opened: [] }
  engineBeneath(on, {}, app)
  await $.session.start(START)
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:2' })
  expect(windows(app)).toBe(0)
})

test('chỉ có terminal: không mở khung', async ($, on) => {
  const app: App = { refused: true, opened: [], surfaces: ['terminal'] }
  engineBeneath(on, {}, app)
  await $.session.start(START)
  expect(windows(app)).toBe(0)
})

test('hình nền đang tắt: không tự mở', async ($, on) => {
  const app: App = { refused: true, opened: [] }
  engineBeneath(on, { 'theme-v3': 'tat' }, app)
  await $.session.start(START)
  expect(windows(app)).toBe(0)
})

test('người dùng đã tắt tự mở ở phiên trước (lưu false): không mở', async ($, on) => {
  const app: App = { refused: true, opened: [] }
  engineBeneath(on, { 'auto-window': false }, app)
  await $.session.start(START)
  expect(windows(app)).toBe(0)
})

test('tu-mo tat rồi tu-mo bat trong phiên: tắt thì app gắn vào không mở, bật lại thì mở', async ($, on) => {
  const app: App = { refused: true, opened: [], surfaces: [] }
  engineBeneath(on, {}, app)
  await $.session.start(START)
  expect(JSON.stringify(await run($, 'tu-mo tat'))).toMatch(/Không tự mở/)
  app.surfaces = ['desktop']
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:default' })
  expect(windows(app)).toBe(0)
  expect(JSON.stringify(await run($, 'tu-mo bat'))).toMatch(/sẽ tự mở/)
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:2' })
  expect(windows(app)).toBe(1)
})

test('tu-mo tat được ghi vào kho lưu qua phiên', async ($, on) => {
  const app: App = { refused: true, opened: [], surfaces: [] }
  const writes: { key: string; value: unknown }[] = []
  const kept = new Map<string, unknown>()
  on('store.get', (_, e) => ({ value: kept.get(e.key) }))
  on('store.set', (_, e) => {
    kept.set(e.key, e.value)
    writes.push({ key: e.key, value: e.value })
    return { value: undefined }
  })
  engineBeneath(on, null, app)
  await $.session.start(START)
  await run($, 'tu-mo tat')
  expect(writes).toContainEqual({ key: 'auto-window', value: false })
})

test('khung không đặt được: chưa tính là đã mở, lần gắn sau thử lại', async ($, on) => {
  const app: App = { refused: true, opened: [], placed: false }
  engineBeneath(on, {}, app)
  await $.session.start(START)
  expect(windows(app)).toBe(1)
  app.placed = true
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:2' })
  expect(windows(app)).toBe(2)
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:3' })
  expect(windows(app)).toBe(2)
})
