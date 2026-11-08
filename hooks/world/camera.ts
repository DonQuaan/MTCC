// Camera đi lang thang giữa các khung cảnh: dừng ngắm (trôi chậm kiểu Ken Burns) rồi lướt sang cảnh gần đó,
// thứ tự có ngẫu nhiên nhưng là hàm THUẦN của thời gian tuyệt đối → liền mạch giữa các lần vẽ lại.
import { clamp, rng } from './util'
import type { Shot } from './types'

export type Cam = { x: number; y: number; z: number }
type Step = { t0: number; t1: number; kind: 'dwell' | 'move'; a: Cam; b: Cam }

const WEEK = 7 * 86400
const dist = (a: Shot, b: Shot) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.4) + Math.abs(a.zoom - b.zoom) * 900
const moveDur = (a: Shot, b: Shot) => (a.id === b.id ? 0 : 22 + dist(a, b) / 19)

/** Tuần bắt đầu 00:00 thứ Hai giờ Việt Nam. Trả [chỉ số tuần, giây trong tuần]. */
function weekOf(tSec: number): [number, number] {
  const shifted = tSec + 7 * 3600 - 4 * 86400 // 05/01/1970 là thứ Hai
  const w = Math.floor(shifted / WEEK)
  return [w, shifted - w * WEEK]
}

const cache = new Map<string, Step[]>()

/**
 * Hành trình liên tục cả tuần: mỗi chặng dừng ngắm 95–205 s rồi lướt sang một trong hai cảnh gần nhất chưa ghé gần đây.
 * Tuần nào cũng mở đầu ở cảnh đầu tiên (Ga cũ) — đêm thứ Hai camera "về ga".
 */
function weekSteps(shots: Shot[], weekIndex: number): Step[] {
  const key = `${weekIndex}|${shots.map(s => `${s.id}:${s.x}:${s.y}:${s.zoom}`).join(',')}`
  const hit = cache.get(key)
  if (hit) return hit
  const r = rng(`cam-tuan-${weekIndex}`)
  const home = shots[0] as Shot
  let cur = home
  const recent: string[] = [cur.id]
  const steps: Step[] = []
  let t = 0
  const at = (s: Shot, drift: number, dz: number): [Cam, Cam] => [
    { x: s.x - drift / 2, y: s.y, z: s.zoom },
    { x: s.x + drift / 2, y: s.y - drift * 0.08, z: s.zoom + dz },
  ]
  // Tuần nào cũng mở đầu & kết thúc ĐÚNG một điểm (Ga cũ, không trôi): qua 00:00 thứ Hai camera không nhảy.
  const [ha] = at(home, 0, 0)
  let last: Cam | undefined = ha
  const MIN_DWELL = 95
  for (let guard = 0; guard < 20000; guard += 1) {
    const dwell = MIN_DWELL + r() * 110
    const drift = (r() < 0.5 ? -1 : 1) * (36 + r() * 70)
    const dz = 0.012 + r() * 0.03
    const [a, b] = at(cur, drift, dz)
    const from = last ?? a
    // Chọn cảnh kế TRƯỚC: tránh 5 cảnh vừa ghé (12 cảnh, có cặp cảnh sát nhau như tượng đá/nhìn đảo bay — nhớ 2 thì camera
    // lượn vòng trong một cụm 4–5 cảnh hàng giờ), lấy trong 3 cảnh gần nhất, nghiêng về cảnh gần.
    const cands = shots
      .filter(s => !recent.includes(s.id))
      .sort((p, q) => dist(cur, p) - dist(cur, q))
      .slice(0, 3)
    const next = (cands.length ? cands[Math.floor(r() ** 1.6 * cands.length)] : home) as Shot
    const md = moveDur(cur, next)
    // Còn đủ giờ cho: ngắm ở đây + lướt sang `next` + ngắm tối thiểu ở đó + lướt về ga? Không đủ → ngắm nốt rồi về ga NGAY
    // (trước đây chỉ xét đường về từ cảnh hiện tại → có tuần bị ép lướt hàng nghìn px/s ngay trước 00:00 thứ Hai).
    if (t + dwell + md + MIN_DWELL + moveDur(next, home) + 60 >= WEEK) {
      const finalMove = moveDur(cur, home)
      const d = Math.max(20, WEEK - t - finalMove)
      // Đang ở ga: trôi về đúng điểm mở đầu tuần sau; ở cảnh khác: trôi như thường rồi lướt về ga.
      steps.push({ t0: t, t1: t + d, kind: 'dwell', a: from, b: finalMove === 0 ? ha : b })
      t += d
      if (t < WEEK) steps.push({ t0: t, t1: WEEK, kind: 'move', a: finalMove === 0 ? ha : b, b: ha })
      break
    }
    steps.push({ t0: t, t1: t + dwell, kind: 'dwell', a: from, b })
    t += dwell
    const [na] = at(next, 0, 0)
    steps.push({ t0: t, t1: t + md, kind: 'move', a: b, b: { ...na, x: na.x - (r() < 0.5 ? -1 : 1) * 40 } })
    last = steps[steps.length - 1]?.b
    t += md
    cur = next
    recent.push(next.id)
    if (recent.length > 5) recent.shift()
  }
  if (cache.size > 4) cache.clear()
  cache.set(key, steps)
  return steps
}

// lướt êm: tăng tốc rồi hãm (smoothstep bậc 5)
const ease = (t: number) => {
  const s = clamp(t, 0, 1)
  return s * s * s * (s * (s * 6 - 15) + 10)
}

/** Vị trí camera tại thời điểm tuyệt đối (giây epoch). */
export function camAt(shots: Shot[], tSec: number): Cam {
  const [w, local] = weekOf(tSec)
  const steps = weekSteps(shots, w)
  let lo = 0
  let hi = steps.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if ((steps[mid] as Step).t0 <= local) lo = mid
    else hi = mid - 1
  }
  const s = steps[lo] as Step
  const u = clamp((local - s.t0) / Math.max(1e-6, s.t1 - s.t0), 0, 1)
  const k = s.kind === 'move' ? ease(u) : u
  return { x: s.a.x + (s.b.x - s.a.x) * k, y: s.a.y + (s.b.y - s.a.y) * k, z: s.a.z + (s.b.z - s.a.z) * k }
}

/** Lấy mẫu camera cho cửa sổ [nowSec, nowSec+span]: mẫu dày khi đang lướt, thưa khi dừng. */
export function camSamples(shots: Shot[], nowSec: number, span: number): { t: number; cam: Cam }[] {
  const out: { t: number; cam: Cam }[] = []
  let t = 0
  while (t <= span) {
    out.push({ t, cam: camAt(shots, nowSec + t) })
    t += 6
  }
  if ((out[out.length - 1]?.t ?? 0) < span) out.push({ t: span, cam: camAt(shots, nowSec + span) })
  // bỏ mẫu thẳng hàng (dừng ngắm trôi tuyến tính) để gọn CSS
  const keep = out.filter((p, i) => {
    if (i === 0 || i === out.length - 1) return true
    const a = out[i - 1] as { t: number; cam: Cam }
    const b = out[i + 1] as { t: number; cam: Cam }
    const f = (p.t - a.t) / (b.t - a.t)
    const ex = a.cam.x + (b.cam.x - a.cam.x) * f
    const ey = a.cam.y + (b.cam.y - a.cam.y) * f
    const ez = a.cam.z + (b.cam.z - a.cam.z) * f
    return Math.abs(ex - p.cam.x) > 0.6 || Math.abs(ey - p.cam.y) > 0.6 || Math.abs(ez - p.cam.z) > 0.0008
  })
  return keep
}

/** Một đoạn hành trình camera trong cửa sổ vẽ (giây tính từ đầu cửa sổ). `u0..u1`: phần của chặng gốc nằm trong cửa sổ. */
export type CamSeg = { t0: number; t1: number; kind: 'dwell' | 'move'; a: Cam; b: Cam; whole: boolean }

/**
 * Các chặng camera phủ cửa sổ [nowSec, nowSec+span]. Chặng dừng ngắm là tuyến tính; chặng lướt dùng `ease` (smootherstep).
 * Chặng lướt nằm TRỌN trong cửa sổ → `whole` (CSS dùng một cubic-bezier xấp xỉ); bị cắt ở mép cửa sổ → lấy mẫu dày.
 */
export function camPlan(shots: Shot[], nowSec: number, span: number): CamSeg[] {
  const out: CamSeg[] = []
  let t = 0
  for (let guard = 0; guard < 500 && t < span - 1e-6; guard += 1) {
    const [w, local] = weekOf(nowSec + t)
    const steps = weekSteps(shots, w)
    let lo = 0
    let hi = steps.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if ((steps[mid] as Step).t0 <= local) lo = mid
      else hi = mid - 1
    }
    // Đúng mép giữa hai chặng (sai số dấu phẩy động): sang chặng kế, không tạo đoạn dài 0.
    if (lo + 1 < steps.length && (steps[lo] as Step).t1 - local < 1e-3) lo += 1
    const s = steps[lo] as Step
    const endLocal = Math.min(s.t1, local + (span - t))
    const t1 = t + (endLocal - local)
    const a = camAt(shots, nowSec + t)
    const b = camAt(shots, nowSec + t1)
    out.push({ t0: t, t1, kind: s.kind, a, b, whole: s.kind === 'move' && Math.abs(local - s.t0) < 1e-3 && endLocal >= s.t1 - 1e-6 })
    if (t1 <= t + 1e-6) break
    t = t1
  }
  return out
}
