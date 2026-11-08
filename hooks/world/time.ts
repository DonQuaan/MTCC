// Thời gian thật: giờ Việt Nam (UTC+7), mùa theo 24 tiết khí, mặt trời, mặt trăng.
// [GIẢ ĐỊNH] Vị trí tham chiếu Hà Nội (21.03°B, 105.85°Đ) — miền Bắc có đủ bốn mùa.
// Ngày tiết khí lấy theo lịch dương gần đúng (sai số ±1 ngày so với lịch thiên văn).
import type { Season, VnTime } from './types'

const VN_OFFSET = 7 * 3600 * 1000
const LAT = (21.03 * Math.PI) / 180

export function vnTime(epochMs: number): VnTime {
  const d = new Date(epochMs + VN_OFFSET)
  const y = d.getUTCFullYear()
  const mo = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  const h = d.getUTCHours()
  const mi = d.getUTCMinutes()
  const s = d.getUTCSeconds()
  const start = Date.UTC(y, 0, 1)
  const doy = Math.floor((Date.UTC(y, mo - 1, day) - start) / 86400000) + 1
  return { y, mo, d: day, h, mi, s, hourF: h + mi / 60 + s / 3600, doy }
}

// [tháng, ngày, tên, mùa bắt đầu ở tiết này?]
const TIET_KHI: [number, number, string][] = [
  [1, 6, 'Tiểu hàn'],
  [1, 20, 'Đại hàn'],
  [2, 4, 'Lập xuân'],
  [2, 19, 'Vũ thủy'],
  [3, 6, 'Kinh trập'],
  [3, 21, 'Xuân phân'],
  [4, 5, 'Thanh minh'],
  [4, 20, 'Cốc vũ'],
  [5, 6, 'Lập hạ'],
  [5, 21, 'Tiểu mãn'],
  [6, 6, 'Mang chủng'],
  [6, 21, 'Hạ chí'],
  [7, 7, 'Tiểu thử'],
  [7, 23, 'Đại thử'],
  [8, 8, 'Lập thu'],
  [8, 23, 'Xử thử'],
  [9, 8, 'Bạch lộ'],
  [9, 23, 'Thu phân'],
  [10, 8, 'Hàn lộ'],
  [10, 23, 'Sương giáng'],
  [11, 7, 'Lập đông'],
  [11, 22, 'Tiểu tuyết'],
  [12, 7, 'Đại tuyết'],
  [12, 22, 'Đông chí'],
]

const key = (mo: number, d: number) => mo * 100 + d

export function tietKhi(t: VnTime): string {
  const k = key(t.mo, t.d)
  let name = 'Đông chí'
  for (const [mo, d, n] of TIET_KHI) if (k >= key(mo, d)) name = n
  return name
}

/** Mùa theo Lập xuân (4/2), Lập hạ (6/5), Lập thu (8/8), Lập đông (7/11). seasonT: tiến độ 0..1 trong mùa. */
export function season(t: VnTime): { season: Season; seasonT: number } {
  const dayOf = (mo: number, d: number) => Math.floor((Date.UTC(t.y, mo - 1, d) - Date.UTC(t.y, 0, 1)) / 86400000) + 1
  const xuan = dayOf(2, 4)
  const ha = dayOf(5, 6)
  const thu = dayOf(8, 8)
  const dong = dayOf(11, 7)
  const len = (a: number, b: number) => b - a
  const n = t.doy
  if (n >= xuan && n < ha) return { season: 'xuan', seasonT: (n - xuan) / len(xuan, ha) }
  if (n >= ha && n < thu) return { season: 'ha', seasonT: (n - ha) / len(ha, thu) }
  if (n >= thu && n < dong) return { season: 'thu', seasonT: (n - thu) / len(thu, dong) }
  const dongLen = 365 - dong + xuan
  return { season: 'dong', seasonT: n >= dong ? (n - dong) / dongLen : (n + 365 - dong) / dongLen }
}

/** sin(độ cao mặt trời) tại giờ VN thập phân `hourF`, ngày `doy`. */
export function sunAltitude(doy: number, hourF: number): number {
  const decl = ((23.44 * Math.PI) / 180) * Math.sin((2 * Math.PI * (284 + doy)) / 365)
  // Giờ mặt trời thật = giờ VN + lệch kinh tuyến (Hà Nội 105.85°Đ so với múi 105°) + phương trình thời gian (−14…+16 phút:
  // quỹ đạo elip & trục nghiêng). Thiếu nó, mọc/lặn & đèn bật lệch tới 16 phút so với trời thật.
  const B = (2 * Math.PI * (doy - 81)) / 364
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)
  const solar = hourF + (105.85 - 105) / 15 + eot / 60
  const ha = ((solar - 12) * 15 * Math.PI) / 180
  return Math.sin(LAT) * Math.sin(decl) + Math.cos(LAT) * Math.cos(decl) * Math.cos(ha)
}

/** Giờ (VN thập phân) mặt trời qua độ cao `deg` buổi sáng và buổi chiều của ngày `doy` (tìm nhị phân). */
function sunCross(doy: number, deg: number): { am: number; pm: number } {
  const H = Math.sin((deg * Math.PI) / 180)
  const cross = (lo: number, hi: number) => {
    const up = sunAltitude(doy, hi) > sunAltitude(doy, lo)
    for (let i = 0; i < 40; i += 1) {
      const m = (lo + hi) / 2
      if (sunAltitude(doy, m) > H === up) hi = m
      else lo = m
    }
    return (lo + hi) / 2
  }
  return { am: cross(0.5, 12.2), pm: cross(12.2, 23.5) }
}

/** Giờ mọc & lặn (giờ VN thập phân) của ngày `doy`: lúc tâm mặt trời qua -0.833° (khúc xạ + bán kính đĩa). */
export function sunEvents(doy: number): { rise: number; set: number } {
  const c = sunCross(doy, -0.833)
  return { rise: c.am, set: c.pm }
}

/** "Giờ thiết kế" cho bảng màu trời: bảng neo vẽ cho một ngày chuẩn (mặt trời -12° lúc 4:24 & 19:36, mọc 6:00, +12° lúc 7:12
 *  & 16:24, lặn 17:54). Ánh xạ tuyến tính từng khúc theo các mốc ĐỘ CAO MẶT TRỜI thật của ngày đó → màu trời & độ tô đi theo
 *  mặt trời (hè lặn 18:42, đông lặn 17:14; mặt trời ≤ -12° luôn là đêm, ≥ +12° không còn sắc hoàng hôn). */
export function designHour(doy: number, hourF: number): number {
  const d12 = sunCross(doy, -12)
  const r0 = sunCross(doy, -0.833)
  const u12 = sunCross(doy, 12)
  const real = [0, d12.am, r0.am, u12.am, u12.pm, r0.pm, d12.pm, 24]
  const design = [0, 4.4, 6.0, 7.2, 16.4, 17.9, 19.6, 24]
  for (let i = 1; i < real.length; i += 1) {
    const a = real[i - 1] as number
    const b = real[i] as number
    if (hourF <= b) return (design[i - 1] as number) + ((hourF - a) / Math.max(1e-6, b - a)) * ((design[i] as number) - (design[i - 1] as number))
  }
  return hourF
}

/** 0 đêm … 1 ngày: chuyển trong khoảng hoàng hôn dân dụng (mặt trời -6° … +6°). */
export const daylightOf = (sinAlt: number) => {
  const t = Math.min(1, Math.max(0, (sinAlt + 0.105) / 0.21))
  return t * t * (3 - 2 * t)
}

const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)
const SYNODIC = 29.530588853 * 86400000
export function moonPhase(epochMs: number): number {
  const p = ((epochMs - NEW_MOON) / SYNODIC) % 1
  return p < 0 ? p + 1 : p
}
