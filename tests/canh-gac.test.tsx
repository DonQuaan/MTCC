// Phép thử canh gác hành vi: mỗi phép giữ một lời hứa mà bộ test chính chưa canh — đổi giờ xem thật sự đổi cảnh,
// sang bản vẽ mới đúng mép sau khi đổi giờ, không giành nền của mod khác, khung không mở được thì không nói đã mở, toast
// chỉ ở mốc 50. Mỗi phép đã được kiểm: xanh trên mã hiện tại, đỏ khi phá đúng chỗ nó canh.
import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

const PANE = {
  plugin: 'giao-dien-dep',
  component: 'Pane',
  requestId: 'studio',
  props: { title: 'Studio giao diện', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const
const BACKDROP = {
  plugin: 'giao-dien-dep',
  surface: 'desktop',
  component: 'Backdrop',
  requestId: 'backdrop',
  props: { id: 'ban-in', plugin: 'giao-dien-dep', glass: { blur: 20, opacity: 0.72 } },
} as const
const BAND = {
  plugin: 'giao-dien-dep',
  surface: 'desktop',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const
const WINDOW = { ...PANE, surface: 'desktop', requestId: 'cua-so', props: { ...PANE.props, title: 'Thế giới nền' } } as const
const REFUSED = 'no attached desktop client says it draws backdrops (a desktop app with the backdrop layer does, on its ui_attach)'

type App = {
  refused?: boolean
  reason?: string
  placed?: boolean
  opened?: string[]
  surfaces?: ('desktop' | 'terminal')[]
  backdropCalls?: number
  now?: number
  toasts?: string[]
}

function engineBeneath(on: Parameters<TestBody>[1], stored: Record<string, unknown> = {}, app: App = {}) {
  mock.store(on, stored)
  const clock = mock.clock(on, { now: app.now ?? 0 })
  on('session.surfaces', () => ({ value: app.surfaces ?? ['desktop'] }))
  on('session.attach', (_, e) => ({ clientId: e.clientId }))
  on('session.detach', (_, e) => ({ clientId: e.clientId }))
  on('command.register', () => ({ value: { command: 'giao-dien' } }))
  on('ui.open', (_, e) => {
    app.opened?.push(e.id)
    return app.placed === false ? { value: { isPlaced: false, reason: 'narrow terminal' } } : { value: { isPlaced: true } }
  })
  on('ui.backdrop', () => {
    if (app.backdropCalls !== undefined) app.backdropCalls += 1
    return app.refused ? { value: { isDrawn: false, reason: app.reason ?? REFUSED } } : { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('ui.toast', (_, e) => {
    app.toasts?.push(e.text)
    return { value: undefined }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  return clock
}

function otherModBackdrop(on: Parameters<TestBody>[1]) {
  on('ui.render', { component: 'Backdrop' }, ($, e) => {
    const table = $.ui.resolve(e)
    const { Text } = table
    return 'Svg' in table ? <table.Svg source={'<svg xmlns="http://www.w3.org/2000/svg"/>'} alt="nền của mod khác" /> : <Text>nền của mod khác</Text>
  })
}

const START = { cwd: '/', surface: 'desktop', isInteractive: true } as const

test('ui.open không đặt được khung: lệnh không được nói đã mở', async ($, on) => {
  engineBeneath(on, {}, { refused: true, placed: false })
  await $.session.start(START)
  const run = async (args: string) => JSON.stringify(await $.command.run({ command: 'giao-dien', args } as Parameters<typeof $.command.run>[0]))
  expect(await run('cua-so')).toMatch(/Chưa có app nào gắn vào phiên/)
  expect(await run('the-gioi')).toMatch(/Gõ \/giao-dien cua-so/)
})

test('lời từ chối lạ của engine vẫn được kể lại cho người dùng', async ($, on) => {
  engineBeneath(on, {}, { refused: true, reason: 'layer busy xyz' })
  await $.session.start(START)
  const text = JSON.stringify(await $.command.run({ command: 'giao-dien', args: 'the-gioi' } as Parameters<typeof $.command.run>[0]))
  expect(text).toMatch(/layer busy xyz/)
})

async function elapsedIn($: Parameters<TestBody>[0]): Promise<number> {
  const ui = await $.ui.mount(WINDOW)
  const source = String((await ui.find({ type: 'Svg' }))?.props.source ?? '')
  await ui.unmount()
  return Number(/svg\{--t:([\d.]+)\}/.exec(source)?.[1] ?? NaN)
}

test('lệnh gio that sát mép cửa sổ: vẫn sang bản vẽ mới đúng mép', async ($, on) => {
  const clock = engineBeneath(on, {}, { refused: true, now: 100_000 })
  await $.session.start(START)
  const run = async (args: string) => $.command.run({ command: 'giao-dien', args } as Parameters<typeof $.command.run>[0])
  await run('gio dem')
  await clock.advance(135_000) // t = 235 000
  await run('gio that') // giờ thật: cửa sổ [120 000, 240 000), mép kế 240 000
  await clock.advance(14_000) // t = 249 000
  expect(await elapsedIn($)).toBeLessThanOrEqual(122)
})

test('nút GIỜ trong Studio sát mép cửa sổ: vẫn sang bản vẽ mới đúng mép', async ($, on) => {
  const clock = engineBeneath(on, {}, { refused: true, now: 100_000 })
  await $.session.start(START)
  let ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'gio-dem' })
  await ui.unmount()
  await clock.advance(135_000)
  ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'gio-that' })
  await ui.unmount()
  await clock.advance(14_000)
  expect(await elapsedIn($)).toBeLessThanOrEqual(122)
})

test('bản vẽ chứa đúng thời điểm hiện tại: giây trôi = now - đầu cửa sổ (không âm, không kẹp 0)', async ($, on) => {
  engineBeneath(on, {}, { refused: true, now: 100_000 })
  await $.session.start(START)
  expect(await elapsedIn($)).toBeGreaterThanOrEqual(99)
  expect(await elapsedIn($)).toBeLessThanOrEqual(101)
})

test('lệnh cua-so khi hình nền đang tắt: báo tắt, không mở khung', async ($, on) => {
  const app: App = { opened: [] }
  engineBeneath(on, {}, app)
  await $.session.start(START)
  const run = async (args: string) => JSON.stringify(await $.command.run({ command: 'giao-dien', args } as Parameters<typeof $.command.run>[0]))
  await run('tat')
  expect(await run('cua-so')).toMatch(/Hình nền đang tắt/)
  expect(app.opened).not.toContain('cua-so')
})

test('app desktop rời phiên khi nền mod khác đang đứng: không giành lại nền', async ($, on) => {
  const app: App = { refused: true, backdropCalls: 0 }
  engineBeneath(on, {}, app)
  otherModBackdrop(on)
  await $.session.start(START)
  const other = await $.ui.mount({ ...BACKDROP, props: { ...BACKDROP.props, plugin: 'mod-khac', id: 'nen-khac' } })
  await other.unmount()
  const before = app.backdropCalls
  await $.session.detach({ surface: 'desktop', clientId: 'desktop:default', reason: 'detach' })
  expect(app.backdropCalls).toBe(before)
})

test('điện thoại rời phiên: không đặt lại nền', async ($, on) => {
  const app: App = { refused: true, backdropCalls: 0 }
  engineBeneath(on, {}, app)
  await $.session.start(START)
  const before = app.backdropCalls
  await $.session.detach({ surface: 'mobile', clientId: 'mobile:default', reason: 'detach' })
  expect(app.backdropCalls).toBe(before)
})

test('người dùng chọn lại nền của mod này sau nền mod khác: app desktop gắn vào lại được hỏi lại', async ($, on) => {
  const app: App = { refused: true, backdropCalls: 0 }
  engineBeneath(on, {}, app)
  otherModBackdrop(on)
  await $.session.start(START)
  const other = await $.ui.mount({ ...BACKDROP, props: { ...BACKDROP.props, plugin: 'mod-khac', id: 'nen-khac' } })
  await other.unmount()
  await $.command.run({ command: 'giao-dien', args: 'the-gioi' } as Parameters<typeof $.command.run>[0])
  const mine = await $.ui.mount(BACKDROP)
  await mine.unmount()
  const before = app.backdropCalls
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:2' })
  expect(app.backdropCalls).toBe((before ?? 0) + 1)
})

test('lệnh gio dem đổi giờ của cảnh (thanh trạng thái hiện 21:30)', async ($, on) => {
  engineBeneath(on, {}, { now: 100_000 })
  await $.session.start(START)
  await $.command.run({ command: 'giao-dien', args: 'gio dem' } as Parameters<typeof $.command.run>[0])
  const band = await $.ui.mount(BAND)
  expect(await band.find({ type: 'Text', text: /^21:30$/ })).toBeTruthy()
  await band.unmount()
})

test('app desktop gắn vào sau mà vẫn bị từ chối: Studio không nói "chưa có app desktop"', async ($, on) => {
  const app: App = { refused: true, surfaces: [] }
  engineBeneath(on, {}, app)
  await $.session.start(START)
  app.surfaces = ['desktop']
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:default' })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /chưa bật lớp vẽ nền/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /chưa có app desktop nào gắn vào/ })).toBeFalsy()
  await ui.unmount()
})

test('toast đếm lệnh chỉ ở mốc 50', async ($, on) => {
  const app: App = { toasts: [] }
  engineBeneath(on, {}, app)
  await $.session.start(START)
  const engine = $ as unknown as { tool: { call: (input: { tool: string; command: string }) => Promise<unknown> } }
  for (let i = 0; i < 50; i += 1) await engine.tool.call({ tool: 'Bash', command: 'ls' })
  expect((app.toasts ?? []).filter(t => /lệnh công cụ/.test(t)).length).toBe(1)
})
