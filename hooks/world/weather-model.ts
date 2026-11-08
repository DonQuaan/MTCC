// Mô phỏng thời tiết như một game: hàm THUẦN của thời gian tuyệt đối → cùng thời điểm luôn cùng thời tiết,
// liền mạch giữa các lần vẽ lại. Khí hậu tham chiếu miền Bắc Việt Nam:
//  xuân: nồm, mưa phùn, sương sớm · hạ: nắng gắt, mưa rào chiều, giông · thu: trong, hanh, gió heo may
//  đông: âm u, mưa phùn, gió mùa đông bắc, sương mù sáng; tuyết = "phép màu" cực hiếm về đêm.
import { vnTime, season as seasonOf } from './time'
import { clamp, hash, smooth } from './util'
import type { Cloud, Precip, Season, WeatherSlice } from './types'

const MIN = 60_000
// FNV-1a một mình: các khoá chỉ khác chữ số cuối (`may${i}`, `rao${i}`) cho số gần nhau → thời tiết "kẹt" nhiều ngày, mưa rào
// thành chuỗi (đo: tương quan bậc 1 ≈ 0.87). Trộn thêm bước cuối murmur3 (fmix32) → các lần rút độc lập.
const fmix = (h: number) => {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}
const r01 = (k: string) => fmix(hash(k)) / 4294967296

type Sample = { cloud: number; precip: Precip; wind: number; fog: number; isShower: boolean; lightning: boolean }

const PRIOR: Record<Season, { cloud: number; rain: number; shower: number; storm: number; wind: number; fogAM: number }> = {
  xuan: { cloud: 0.62, rain: 0.34, shower: 0.12, storm: 0.04, wind: 0.25, fogAM: 0.55 },
  ha: { cloud: 0.42, rain: 0.1, shower: 0.42, storm: 0.45, wind: 0.35, fogAM: 0.1 },
  thu: { cloud: 0.3, rain: 0.12, shower: 0.16, storm: 0.25, wind: 0.4, fogAM: 0.25 },
  dong: { cloud: 0.66, rain: 0.26, shower: 0.05, storm: 0.0, wind: 0.5, fogAM: 0.6 },
}

/** Thời tiết tự nhiên tại một thời điểm (epoch ms). */
export function sampleAt(t: number): Sample {
  const vt = vnTime(t)
  const { season } = seasonOf(vt)
  const P = PRIOR[season]
  const regime = Math.floor(t / (3 * 3600_000)) // "kiểu trời" mỗi 3 giờ
  const block = Math.floor(t / (20 * MIN))
  const blend = (t % (3 * 3600_000)) / (3 * 3600_000)
  const regCloud = (k: number) => clamp(P.cloud + (r01(`may${k}`) - 0.5) * 0.9, 0, 1)
  // nội suy mượt giữa hai kiểu trời liền kề
  let cloud = regCloud(regime) + (regCloud(regime + 1) - regCloud(regime)) * smooth(0.7, 1, blend)
  cloud = clamp(cloud + (r01(`kh${block}`) - 0.5) * 0.25, 0, 1)
  const h = vt.hourF
  let wind = clamp(P.wind + (r01(`gio${regime}`) - 0.5) * 0.7 + (r01(`giat${block}`) - 0.5) * 0.25, 0, 1)
  let precip: Precip = 'khong'
  let isShower = false
  let lightning = false

  // Mưa dầm/mưa phùn theo kiểu trời
  const rainy = r01(`mua${regime}`) < P.rain && cloud > 0.45
  if (rainy) precip = season === 'xuan' || season === 'dong' ? 'phun' : 'mua'

  // Trận mưa to kéo dài (hạ/thu): hiếm (~0.4 trận/ngày mùa hạ), 40–90 phút, có sấm chớp — không chỉ là cơn rào 4–12'.
  const STORM_K = 0.12
  const stormOn = r01(`bao${regime}`) < P.storm * STORM_K
  const sOff = (0.15 + r01(`bao-bd${regime}`) * 0.4) * 180
  const sLen = 40 + r01(`bao-dai${regime}`) * 50
  if (stormOn) {
    const inReg = (t % (3 * 3600_000)) / MIN
    if (inReg >= sOff && inReg < sOff + sLen) {
      precip = 'mua-to'
      lightning = season === 'ha' || season === 'thu'
      cloud = Math.max(cloud, 0.95)
      wind = Math.max(wind, 0.7)
    }
  }

  // Mưa rào: mỗi khối 20' có thể có một cơn 4–12' (hạ: chiều 13–18h nhiều hơn). Quyết định theo ĐẦU khối (giờ & mây lúc đó):
  // xét lại mỗi phút thì cơn rào đang mưa có thể tắt phụt lúc 18:30 khi hệ số chiều hạ hết hiệu lực (đo: cơn 1 phút).
  const t0 = block * 20 * MIN
  const h0 = vnTime(t0).hourF
  const c0 = clamp(regCloud(Math.floor(t0 / (3 * 3600_000))) + (r01(`kh${block}`) - 0.5) * 0.25, 0, 1)
  const showerBias = season === 'ha' && h0 >= 13 && h0 <= 18.5 ? 1.6 : 1
  // Khối 20' nào chạm trận mưa to thì không có cơn rào riêng (trận đè lên giữa cơn → cơn rào chỉ còn 1').
  const bOff = (t0 % (3 * 3600_000)) / MIN
  const stormHere = stormOn && bOff < sOff + sLen && bOff + 20 > sOff
  if (!stormHere && r01(`rao${block}`) < P.shower * showerBias * (0.4 + c0)) {
    // Cơn 4–12' nằm TRỌN trong khối 20' (trước đây bắt đầu tới phút 10 + dài tới 12' → bị cắt ở mép khối, còn 1').
    const len = 4 + r01(`rao-dai${block}`) * 8
    const start = 1 + r01(`rao-bd${block}`) * (19 - len - 1)
    const inBlock = (t % (20 * MIN)) / MIN
    if (inBlock >= start && inBlock < start + len) {
      isShower = true
      const heavy = r01(`rao-to${block}`) < P.storm
      precip = heavy ? 'mua-to' : 'mua'
      lightning = heavy && (season === 'ha' || season === 'thu')
      cloud = Math.max(cloud, heavy ? 0.95 : 0.72)
      wind = Math.max(wind, heavy ? 0.75 : 0.45)
    }
  }
  if (precip !== 'khong' && !isShower) cloud = Math.max(cloud, precip === 'phun' ? 0.7 : 0.78)

  // Tuyết: phép màu hiếm của mùa đông, chỉ về đêm và khi trời âm u
  if (season === 'dong' && (h >= 22 || h < 5) && cloud > 0.6 && r01(`tuyet${regime}`) < 0.035) precip = 'tuyet'

  // Sương sớm
  let fog = 0
  // Khoá theo NGÀY VIỆT NAM (không phải ngày UTC: sương 4:30–9:00 VN vắt qua 0:00 UTC → đổi đột ngột lúc 7:00).
  const vnDay = Math.floor((t + 7 * 3600_000) / 86400000)
  if (h >= 4.5 && h <= 9 && r01(`suong${vnDay}`) < P.fogAM) {
    fog = (0.35 + r01(`suong-d${vnDay}`) * 0.5) * (1 - smooth(7.2, 9, h)) * smooth(4.5, 5.5, h)
  }
  if (precip === 'phun') fog = Math.max(fog, 0.25)
  return { cloud, precip, wind, fog, isShower, lightning }
}

const cloudClass = (c: number): Cloud => (c < 0.15 ? 'quang' : c < 0.38 ? 'it' : c < 0.6 ? 'vua' : c < 0.85 ? 'nhieu' : 'u-am')

export type WeatherOverride = { cloud?: Cloud; precip?: Precip; wind?: number; fog?: number; shower?: boolean }

/** Dòng thời tiết cho cửa sổ [now, now+span] (giây), gộp phút giống nhau thành đoạn. */
export function weatherTimeline(now: number, span: number, override?: WeatherOverride): { slices: WeatherSlice[]; wet: number } {
  const slices: WeatherSlice[] = []
  const minutes = Math.ceil(span / 60)
  for (let i = 0; i < minutes; i += 1) {
    const s = sampleAt(now + i * MIN)
    let slice: WeatherSlice = {
      t0: i * 60,
      t1: Math.min(span, (i + 1) * 60),
      cloud: cloudClass(s.cloud),
      precip: s.precip,
      wind: Math.round(s.wind * 20) / 20,
      fog: Math.round(s.fog * 10) / 10,
      isShower: s.isShower,
      lightning: s.lightning,
    }
    if (override) {
      // Mưa rào ép: 3' mưa, 4' tạnh xen kẽ.
      const showerOn = override.shower ? Math.floor(i / 3.5) % 2 === 0 : undefined
      slice = {
        ...slice,
        cloud: override.cloud ?? slice.cloud,
        precip: override.shower ? (showerOn ? override.precip ?? 'mua' : 'khong') : override.precip ?? slice.precip,
        wind: override.wind ?? slice.wind,
        fog: override.fog ?? slice.fog,
        isShower: override.shower ?? slice.isShower,
        lightning: (override.precip ?? slice.precip) === 'mua-to',
      }
    }
    const prev = slices[slices.length - 1]
    if (
      prev &&
      prev.cloud === slice.cloud &&
      prev.precip === slice.precip &&
      prev.wind === slice.wind &&
      prev.fog === slice.fog &&
      prev.isShower === slice.isShower &&
      prev.lightning === slice.lightning
    ) {
      prev.t1 = slice.t1
    } else slices.push(slice)
  }
  // Độ ướt: số phút có mưa trong 60' trước, giảm dần theo thời gian.
  let wet = override?.precip && override.precip !== 'khong' && override.precip !== 'tuyet' ? 1 : 0
  if (!override?.precip) {
    for (let k = 1; k <= 60; k += 1) {
      const p = sampleAt(now - k * MIN).precip
      if (p !== 'khong' && p !== 'tuyet') wet = Math.max(wet, 1 - k / 60)
    }
    const p0 = slices[0]?.precip
    if (p0 && p0 !== 'khong' && p0 !== 'tuyet') wet = 1
  }
  return { slices, wet }
}
