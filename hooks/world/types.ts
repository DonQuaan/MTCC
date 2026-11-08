// HỢP ĐỒNG CHUNG của thế giới nền. Mọi module chỉ phụ thuộc file này + util.ts.
// Không dùng Node API, không import(), không DOM: code này chạy trong môi trường mod (thuần JS).

export type Season = 'xuan' | 'ha' | 'thu' | 'dong'

/** Độ phủ mây. */
export type Cloud = 'quang' | 'it' | 'vua' | 'nhieu' | 'u-am'
/** Giáng thuỷ. `phun` = mưa phùn (bụi mưa mảnh, đặc trưng xuân/đông miền Bắc). */
export type Precip = 'khong' | 'phun' | 'mua' | 'mua-to' | 'tuyet'

/** Một đoạn thời tiết liên tục trong [t0, t1) (giây tính từ đầu cửa sổ vẽ). */
export type WeatherSlice = {
  t0: number
  t1: number
  cloud: Cloud
  precip: Precip
  /** 0 lặng … 1 gió mạnh. */
  wind: number
  /** 0 trong … 1 sương mù dày. */
  fog: number
  /** Mưa rào: ngắn rồi tắt (đoạn này là một cơn rào). */
  isShower: boolean
  /** Có sấm chớp (chỉ khi mưa to). */
  lightning: boolean
}

export type VnTime = {
  y: number
  mo: number // 1..12
  d: number
  h: number
  mi: number
  s: number
  /** Giờ thập phân 0..24 (giờ Việt Nam, UTC+7). */
  hourF: number
  /** Ngày thứ mấy trong năm, 1..366. */
  doy: number
}

export type Detail = 'full' | 'lite'

/** Ngữ cảnh một lần vẽ. Một SVG phủ cửa sổ thời gian [now, now + span]. */
export type Ctx = {
  /** Epoch ms lúc bắt đầu cửa sổ. */
  now: number
  /** Số giây SVG này phải tự chạy (camera, thời tiết...). */
  span: number
  vn: VnTime
  season: Season
  /** Tiến độ trong mùa 0..1 (đầu mùa → cuối mùa). */
  seasonT: number
  /** Tên tiết khí hiện tại, ví dụ "Lập đông". */
  tietKhi: string
  /** Độ cao mặt trời -1..1 (âm = dưới chân trời) lúc now. */
  sunAlt: number
  /** 0 = đêm hẳn … 1 = ngày hẳn, lúc now. */
  daylight: number
  /** Pha trăng 0 = trăng non, 0.5 = trăng tròn, 1 = trăng non kế tiếp. */
  moonPhase: number
  /** Thời tiết phủ kín [0, span]. */
  weather: WeatherSlice[]
  /** Đoạn thời tiết lúc bắt đầu cửa sổ. */
  cur: WeatherSlice
  /** Độ ướt mặt đất 0..1 (mưa gần đây). */
  wet: number
  detail: Detail
  /** Bộ sinh ngẫu nhiên có hạt giống CỐ ĐỊNH theo khoá (không đổi giữa các lần vẽ). */
  rng: (key: string) => () => number
  /** Nhiễu Perlin 2D có hạt giống theo khoá, giá trị ~[-0.5, 0.5]. */
  noise: (key: string) => (x: number, y: number) => number
  /**
   * Độ trễ CSS (chuỗi, ví dụ "-12.3s") để một vòng lặp chu kỳ `period` giây chạy LIỀN MẠCH qua các lần vẽ lại
   * (pha tính theo thời gian tuyệt đối). Dùng trong style="animation-delay:…".
   */
  ph: (period: number, key?: string) => string
}

/**
 * Lớp parallax. Hệ số f: lớp càng xa càng trượt chậm.
 *  0 trời/mây (f=0.06) · 1 núi xa (0.18) · 2 tầng giữa: đảo bay, cầu cạn, đồi (0.45) · 3 mặt đất chính (1) · 4 tiền cảnh (1.35)
 * Toạ độ trong mỗi lớp: x_lớp = x_thế-giới × f (dùng util.toLayer); y dùng chung hệ "màn hình tham chiếu".
 */
export type Layer = 0 | 1 | 2 | 3 | 4

/** Một mảnh hình đặt trong một lớp, có biên ngang để cắt bớt khi camera không tới. */
export type Piece = {
  layer: Layer
  /** Biên ngang theo toạ độ CỦA LỚP đó. */
  x0: number
  x1: number
  /** 0..10: càng cao càng giữ lại khi vượt ngân sách ký tự. */
  prio: number
  /** SVG thường (bị tô theo giờ: đêm thì tối đi). */
  svg: string
  /** SVG phát sáng (đèn, cửa sổ, đom đóm, nấm sáng) — vẽ SAU lớp tô màu đêm nên không bị tối; tự mờ ban ngày. */
  glow?: string
}

/** Điểm để module "diễn viên" (mèo, đom đóm, bướm…) đặt nhân vật. Toạ độ theo lớp `layer`. */
export type SpotKind =
  | 'cat' // bãi cỏ nhỏ: mèo ngủ (xuân, hạ)
  | 'cat-shelter' // chỗ trú mưa (hiên nhà, gốc cây lớn): mèo chuyển vào đây khi mưa
  | 'fireflies' // đom đóm đêm hè
  | 'butterflies' // bướm ngày xuân/hạ
  | 'perch' // chỗ chim đậu (mái, dây điện, cành)
  | 'lantern-water' // mặt nước thả đèn hoa đăng đêm rằm
  | 'smoke' // ống khói / bếp: khói bay theo gió

export type Spot = { kind: SpotKind; layer: Layer; x: number; y: number; s?: number; w?: number }

/** Khung cảnh camera dừng ngắm. Toạ độ thế giới (lớp 3). */
export type Shot = { id: string; name: string; x: number; y: number; zoom: number }

export type BuildOut = { pieces: Piece[]; spots?: Spot[]; defs?: string; css?: string }

/** Một vùng của thế giới (lớp 3 + có thể thêm lớp 4/2 trong dải x của mình). */
export type Region = {
  id: string
  name: string
  /** Dải x thế giới mà vùng sở hữu ở lớp 3. */
  x0: number
  x1: number
  shots: Shot[]
  build: (ctx: Ctx) => BuildOut
}

/** Module trời: nền trời (màn hình) + mây/thiên thể (lớp 0). */
export type SkyModule = { build: (ctx: Ctx) => { screen: string; pieces: Piece[]; defs?: string; css?: string } }
/** Module tầng xa + giữa (lớp 1, 2) cho cả bề ngang thế giới, kèm cầu cạn & tàu hoả. */
export type MidModule = { build: (ctx: Ctx) => BuildOut }
/** Module thời tiết: lớp phủ màn hình (mưa, tuyết, chớp, sương, hạt mùa) + mảnh trong thế giới nếu cần. */
export type WeatherModule = { build: (ctx: Ctx) => { screen: string; pieces?: Piece[]; defs?: string; css?: string } }
/** Module diễn viên: nhận các Spot, trả mảnh hình (mèo, đom đóm, bướm, chim, đèn hoa đăng, khói). */
export type ActorsModule = { build: (ctx: Ctx, spots: Spot[]) => BuildOut }
