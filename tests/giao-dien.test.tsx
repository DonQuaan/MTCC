import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

const PANE = {
  plugin: 'giao-dien-dep',
  component: 'Pane',
  requestId: 'studio',
  props: {
    title: 'Studio giao diện',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
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
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

// Lời engine 2.1.317 khi app desktop đang gắn không khai vẽ nền (app Claude 4.23118, cờ tính năng chưa bật).
const REFUSED = 'no attached desktop client says it draws backdrops (a desktop app with the backdrop layer does, on its ui_attach)'

const WINDOW = { ...PANE, surface: 'desktop', requestId: 'cua-so', props: { ...PANE.props, title: 'Thế giới nền' } } as const

function engineBeneath(
  on: Parameters<TestBody>[1],
  stored: Record<string, unknown> = {},
  app: { refused?: boolean; opened?: string[]; surfaces?: ('desktop' | 'terminal')[]; backdropCalls?: number; now?: number } = {},
) {
  mock.store(on, stored)
  const clock = mock.clock(on, { now: app.now ?? 0 })
  on('session.surfaces', () => ({ value: app.surfaces ?? ['desktop'] }))
  on('session.attach', (_, e) => ({ clientId: e.clientId }))
  on('command.register', () => ({ value: { command: 'giao-dien' } }))
  on('ui.open', (_, e) => {
    app.opened?.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.backdrop', () => {
    if (app.backdropCalls !== undefined) app.backdropCalls += 1
    return app.refused ? { value: { isDrawn: false, reason: REFUSED } } : { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  return clock
}

test('mặc định là thế giới nền: SVG động, vẽ trong khung, vừa trần ký tự của engine', async ($, on) => {
  engineBeneath(on)
  await $.session.start({ cwd: 'D:/du-an', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount(BACKDROP)
  const svg = await ui.find({ type: 'Svg' })
  const source = String(svg?.props.source ?? '')
  expect(svg?.props.isInteractive).toBe(true)
  expect(source.startsWith('<svg')).toBe(true)
  // camera từng lớp: lướt (keyframes cL3, chạy trên compositor) hoặc đứng yên (transform tĩnh)
  expect(source).toMatch(/@keyframes cL3\{|\.L3\{transform:/)
  expect(source.length).toBeLessThan(131072)
  expect(String(svg?.props.alt ?? '')).toMatch(/giờ Việt Nam/)
  await ui.unmount()
})

test('xem trước thời tiết từ Studio: nút đang chọn sáng, nền đổi theo', async ($, on) => {
  engineBeneath(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const back = await $.ui.mount(BACKDROP)
  const before = String((await back.find({ type: 'Svg' }))?.props.source ?? '')
  await back.unmount()

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Button', key: 'troi-tu-nhien' }))?.props.variant).toBe('primary')
  await ui.press({ key: 'troi-mua-to' })
  expect((await ui.find({ type: 'Button', key: 'troi-mua-to' }))?.props.variant).toBe('primary')
  expect((await ui.find({ type: 'Button', key: 'troi-tu-nhien' }))?.props.variant).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Đang xem trước/ })).toBeTruthy()
  await ui.unmount()

  const after = await $.ui.mount(BACKDROP)
  const source = String((await after.find({ type: 'Svg' }))?.props.source ?? '')
  expect(source).not.toBe(before)
  expect(source.length).toBeLessThan(131072)
  await after.unmount()
})

test('Studio có đủ nhóm điều khiển và 4 bản in, trên mọi surface', async ($, on) => {
  engineBeneath(on)
  await $.session.start({ cwd: 'D:/du-an/web', surface: 'desktop', isInteractive: true })
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    for (const name of ['THỜI TIẾT', 'MÙA', 'GIỜ', 'MỨC CHI TIẾT', 'Địa hình', 'Sơn mài', 'Thiên đồ', 'Giấy dó']) {
      expect(await ui.find({ type: 'Text', text: name })).toBeTruthy()
    }
    for (const key of ['troi-mua-rao', 'troi-may-it', 'troi-may-vua', 'troi-may-nhieu', 'troi-tuyet', 'mua-thu', 'gio-dem', 'chi-tiet-lite']) {
      expect(await ui.find({ type: 'Button', key })).toBeTruthy()
    }
    await ui.unmount()
  }
  // Đổi sang một bản in rồi quay lại thế giới.
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'son-mai' })
  expect(await ui.find({ type: 'Button', key: 'son-mai' })).toBeFalsy()
  await ui.press({ key: 'the-gioi' })
  expect(await ui.find({ type: 'Button', key: 'the-gioi' })).toBeFalsy()
  await ui.unmount()
})

test('lệnh /giao-dien: thời tiết, mùa, giờ, chi tiết, bản in, và báo lỗi tên lạ', async ($, on) => {
  engineBeneath(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const run = async (args: string) =>
    JSON.stringify(await $.command.run({ command: 'giao-dien', args } as Parameters<typeof $.command.run>[0]))
  expect(await run('troi mua-rao')).toMatch(/mưa rào/)
  expect(await run('mua thu')).toMatch(/thu/)
  expect(await run('gio dem')).toMatch(/đêm/)
  expect(await run('gio that')).toMatch(/giờ thật/)
  expect(await run('chi-tiet nhe')).toMatch(/nhẹ/)
  expect(await run('thien-do')).toMatch(/Thiên đồ/)
  expect(await run('the-gioi')).toMatch(/Thế giới nền/)
  expect(await run('kinh duc')).toMatch(/đục/)
  expect(await run('cuc-quang')).toMatch(/Không hiểu/)
})

test('bản in tĩnh vẫn dùng được, ghi đúng dữ kiện phiên', async ($, on) => {
  engineBeneath(on)
  await $.session.start({ cwd: 'D:/du-an', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'giao-dien', args: 'dia-hinh' } as Parameters<typeof $.command.run>[0])
  const ui = await $.ui.mount(BACKDROP)
  const svg = await ui.find({ type: 'Svg' })
  const source = String(svg?.props.source ?? '')
  expect(source).toContain('du-an')
  expect(source).toContain('0 trạm')
  expect(svg?.props.isInteractive).toBeUndefined()
  await ui.unmount()
})

test('thanh trạng thái: giờ thế giới, tiết khí, cảnh, và đếm lệnh công cụ', async ($, on) => {
  engineBeneath(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  // Ép kiểu: hợp kiểu của mọi công cụ quá lớn cho tsc suy luận từ một literal.
  const engine = $ as unknown as { tool: { call: (input: { tool: string; command: string }) => Promise<unknown> } }
  await engine.tool.call({ tool: 'Bash', command: 'ls' })
  await engine.tool.call({ tool: 'Bash', command: 'pwd' })
  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /2 lệnh/ }))?.text).toBe('2 lệnh')
  expect(await ui.find({ type: 'Text', text: /^\d\d:\d\d$/ })).toBeTruthy()
  await ui.unmount()
})

test('lựa chọn được nhớ sang phiên sau; bản in v0.2 lưu ở khoá cũ không chặn thế giới nền', async ($, on) => {
  engineBeneath(on, { theme: 'giay-do', glass: 'duc', 'world-detail': 'lite' })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Button', key: 'the-gioi' })).toBeFalsy()
  expect((await ui.find({ type: 'Button', key: 'kinh-duc' }))?.props.variant).toBe('primary')
  expect((await ui.find({ type: 'Button', key: 'chi-tiet-lite' }))?.props.variant).toBe('primary')
  await ui.unmount()
})

test('giờ xem thử không giữ qua phiên mới', async ($, on) => {
  engineBeneath(on, { 'world-view': { weather: 'tuyet', season: 'dong', hour: 'dem', shift: 3_600_000 } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Button', key: 'troi-tuyet' }))?.props.variant).toBe('primary')
  expect((await ui.find({ type: 'Button', key: 'gio-that' }))?.props.variant).toBe('primary')
  await ui.unmount()
})

test('không có emoji trong chữ của Studio và thanh trạng thái', async ($, on) => {
  engineBeneath(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /\p{Extended_Pictographic}/u })).toBeFalsy()
  expect(await ui.find({ type: 'Button', text: /\p{Extended_Pictographic}/u })).toBeFalsy()
  await ui.unmount()
  const band = await $.ui.mount(BAND)
  expect(await band.find({ type: 'Text', text: /\p{Extended_Pictographic}/u })).toBeFalsy()
  await band.unmount()
})

test('lượt subagent kết thúc giữa lượt chính không dừng đồng hồ; chỉ lượt chính mới dừng', async ($, on) => {
  engineBeneath(on)
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('turn.complete', () => ({ text: '' }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  // Ép kiểu: chỉ cần vài trường của sự kiện cho phép thử này.
  const engine = $ as unknown as {
    prompt: { submit: (input: { text: string }) => Promise<unknown> }
    turn: { complete: (input: Record<string, unknown>) => Promise<unknown> }
  }
  // Đồng hồ chỉ hiện khi app báo đang làm việc.
  const WORKING = { ...BAND, props: { ...BAND.props, isWorking: true } }
  await engine.prompt.submit({ text: 'xin chào' })
  await engine.turn.complete({ answer: '', durationMs: 5, isAborted: false, turnId: 't-con', agentId: 'con-1', reason: 'answer' })
  let ui = await $.ui.mount(WORKING)
  expect(await ui.find({ type: 'Text', text: /●/ })).toBeTruthy()
  await ui.unmount()
  await engine.turn.complete({ answer: '', durationMs: 9, isAborted: false, turnId: 't-chinh', reason: 'answer' })
  ui = await $.ui.mount(WORKING)
  expect(await ui.find({ type: 'Text', text: /●/ })).toBeFalsy()
  await ui.unmount()
})

test('tên kế thừa của Object (constructor, toString) không lọt làm bản in, kể cả khi nằm trong store', async ($, on) => {
  engineBeneath(on, { theme: 'constructor', glass: 'toString' })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount(BACKDROP)
  expect((await ui.find({ type: 'Svg' }))?.props.isInteractive).toBe(true)
  await ui.unmount()
  const run = async (args: string) =>
    JSON.stringify(await $.command.run({ command: 'giao-dien', args } as Parameters<typeof $.command.run>[0]))
  expect(await run('constructor')).toMatch(/Không hiểu/)
  expect(await run('kinh tostring')).toMatch(/Không hiểu/)
})

test('app chưa vẽ nền: lệnh nói rõ bằng tiếng Việt và mở khung Thế giới nền thay vì in lời engine', async ($, on) => {
  const opened: string[] = []
  engineBeneath(on, {}, { refused: true, opened })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const text = JSON.stringify(await $.command.run({ command: 'giao-dien', args: 'the-gioi' } as Parameters<typeof $.command.run>[0]))
  expect(text).toMatch(/chưa bật lớp vẽ nền/)
  expect(text).toMatch(/khung “Thế giới nền”/)
  expect(text).not.toMatch(/no attached desktop client/)
  expect(opened).toContain('cua-so')
})

test('khung Thế giới nền: cùng SVG động, giữ tỉ lệ 16:10 theo bề ngang, vừa trần ký tự', async ($, on) => {
  engineBeneath(on, {}, { refused: true })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount(WINDOW)
  const svg = await ui.find({ type: 'Svg' })
  const source = String(svg?.props.source ?? '')
  expect(svg?.props.isInteractive).toBe(true)
  expect(source).toMatch(/^<svg[^>]* width="1600" height="1000"/)
  expect(source).not.toContain('width="100%"')
  expect(source).toMatch(/@keyframes cL3\{|\.L3\{transform:/)
  expect(source.length).toBeLessThan(131072)
  expect(await ui.find({ type: 'Text', text: /cảnh hiện tạm ở đây/ })).toBeTruthy()
  await ui.unmount()
})

test('nút Cửa sổ trên thanh trạng thái chỉ hiện khi app chưa vẽ nền; lệnh cua-so mở khung', async ($, on) => {
  const opened: string[] = []
  engineBeneath(on, {}, { refused: true, opened })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const band = await $.ui.mount(BAND)
  expect(await band.find({ type: 'Button', key: 'mo-cua-so' })).toBeTruthy()
  await band.press({ key: 'mo-cua-so' })
  expect(opened).toContain('cua-so')
  await band.unmount()
  const text = JSON.stringify(await $.command.run({ command: 'giao-dien', args: 'cua-so' } as Parameters<typeof $.command.run>[0]))
  expect(text).toMatch(/Đã mở khung/)
})

test('app vẽ được nền: không có nút Cửa sổ, lệnh không mở khung', async ($, on) => {
  const opened: string[] = []
  engineBeneath(on, {}, { opened })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const band = await $.ui.mount(BAND)
  expect(await band.find({ type: 'Button', key: 'mo-cua-so' })).toBeFalsy()
  await band.unmount()
  const text = JSON.stringify(await $.command.run({ command: 'giao-dien', args: 'the-gioi' } as Parameters<typeof $.command.run>[0]))
  expect(text).toMatch(/Thế giới nền: sống theo giờ Việt Nam\./)
  expect(opened).not.toContain('cua-so')
})

test('chỉ có terminal: không nút Cửa sổ, không mở khung, lời báo nói đúng là chưa có app desktop', async ($, on) => {
  const opened: string[] = []
  engineBeneath(on, {}, { refused: true, opened, surfaces: ['terminal'] })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Button', key: 'mo-cua-so' })).toBeFalsy()
  await band.unmount()
  const run = async (args: string) =>
    JSON.stringify(await $.command.run({ command: 'giao-dien', args } as Parameters<typeof $.command.run>[0]))
  const text = await run('the-gioi')
  expect(text).toMatch(/chưa có app desktop nào gắn vào/)
  expect(text).not.toMatch(/chưa bật lớp vẽ nền/)
  expect(await run('cua-so')).toMatch(/chỉ vẽ trong app Claude desktop/)
  expect(opened).not.toContain('cua-so')
  const pane = await $.ui.mount({ ...WINDOW, surface: 'terminal' })
  expect(await pane.find({ type: 'Svg' })).toBeFalsy()
  expect(await pane.find({ type: 'Text', text: /chỉ vẽ hình trong app Claude desktop/ })).toBeTruthy()
  await pane.unmount()
})

test('app desktop gắn vào sau session.start: trạng thái nền được hỏi lại, nút Cửa sổ theo đó', async ($, on) => {
  const app: { refused: boolean; surfaces: ('desktop' | 'terminal')[] } = { refused: true, surfaces: [] }
  engineBeneath(on, {}, app)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  // gắn vào, app chưa bật lớp nền → có nút
  app.surfaces = ['desktop']
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:default' })
  let band = await $.ui.mount(BAND)
  expect(await band.find({ type: 'Button', key: 'mo-cua-so' })).toBeTruthy()
  await band.unmount()
  // app (bản sau) gắn lại và vẽ được nền → nút biến mất
  app.refused = false
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:2' })
  band = await $.ui.mount(BAND)
  expect(await band.find({ type: 'Button', key: 'mo-cua-so' })).toBeFalsy()
  await band.unmount()
})

test('bản in trong khung cũng mang kích thước riêng, không còn 100%', async ($, on) => {
  engineBeneath(on, {}, { refused: true })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'giao-dien', args: 'son-mai' } as Parameters<typeof $.command.run>[0])
  const ui = await $.ui.mount(WINDOW)
  const source = String((await ui.find({ type: 'Svg' }))?.props.source ?? '')
  expect(source).toMatch(/^<svg[^>]* width="1600" height="1000"/)
  expect(source).not.toMatch(/^<svg[^>]*width="100%"/)
  await ui.unmount()
})

test('app desktop rời phiên: hỏi lại engine, Studio nói đúng là chưa có app desktop', async ($, on) => {
  const app: { refused: boolean; surfaces: ('desktop' | 'terminal')[] } = { refused: false, surfaces: ['desktop'] }
  engineBeneath(on, {}, app)
  on('session.detach', (_, e) => ({ clientId: e.clientId }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  app.refused = true
  app.surfaces = []
  await $.session.detach({ surface: 'desktop', clientId: 'desktop:default', reason: 'detach' })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /chưa có app desktop nào gắn vào/ })).toBeTruthy()
  await ui.unmount()
})

test('Studio trên terminal không có nút Xem cảnh trong khung', async ($, on) => {
  engineBeneath(on, {}, { refused: true, surfaces: ['desktop', 'terminal'] })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const term = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await term.find({ type: 'Button', key: 'mo-cua-so' })).toBeFalsy()
  await term.unmount()
  const desk = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await desk.find({ type: 'Button', key: 'mo-cua-so' })).toBeTruthy()
  await desk.unmount()
})

test('không tự đặt lại nền: lệnh cua-so, điện thoại gắn vào, hay khi nền mod khác đang đứng', async ($, on) => {
  const app = { refused: true, backdropCalls: 0 }
  engineBeneath(on, {}, app)
  // engine vẽ nền của mod khác (hook của mod chuyển nền không phải của mình xuống đây)
  on('ui.render', { component: 'Backdrop' }, ($, e) => {
    const table = $.ui.resolve(e)
    const { Text } = table
    return 'Svg' in table ? <table.Svg source={'<svg xmlns="http://www.w3.org/2000/svg"/>'} alt="nền của mod khác" /> : <Text>nền của mod khác</Text>
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const after = app.backdropCalls
  await $.command.run({ command: 'giao-dien', args: 'cua-so' } as Parameters<typeof $.command.run>[0])
  await $.session.attach({ surface: 'mobile', clientId: 'mobile:default' })
  expect(app.backdropCalls).toBe(after)
  // app desktop gắn vào: hỏi lại (đặt nền của mình) — đúng
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:2' })
  expect(app.backdropCalls).toBe(after + 1)
  // nền đang vẽ là của mod khác → app desktop gắn vào nữa cũng không giành lại
  const other = await $.ui.mount({ ...BACKDROP, props: { ...BACKDROP.props, plugin: 'mod-khac', id: 'nen-khac' } })
  await other.unmount()
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:3' })
  expect(app.backdropCalls).toBe(after + 1)
})

test('sang cửa sổ vẽ mới đúng mép (không trễ tới nhịp 30 s): khung không bao giờ hiện quá giây 122 của một bản vẽ', async ($, on) => {
  // Bản vẽ chỉ chắc đủ nội dung tới giây 120 của nó; đo thật: giây 150 đã lộ mảng cắt cứng.
  const clock = engineBeneath(on, {}, { refused: true, now: 100_000 })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const elapsed = async () => {
    const ui = await $.ui.mount(WINDOW)
    const source = String((await ui.find({ type: 'Svg' }))?.props.source ?? '')
    await ui.unmount()
    return Number(/svg\{--t:([\d.]+)\}/.exec(source)?.[1] ?? NaN)
  }
  expect(await elapsed()).toBeLessThanOrEqual(122)
  await clock.advance(21_000) // giây 121 của bản vẽ đầu: phải đã sang bản vẽ mới
  expect(await elapsed()).toBeLessThanOrEqual(2)
  await clock.advance(119_500) // tới mép kế tiếp lần nữa: hẹn mép tự hẹn lại
  expect(await elapsed()).toBeLessThanOrEqual(2)
})
