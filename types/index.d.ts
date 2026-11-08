export type PlateId = 'dia-hinh' | 'son-mai' | 'thien-do' | 'giay-do'
/** 'the-gioi' = thế giới nền sống theo giờ thật; 4 bản in tĩnh giữ lại làm lựa chọn phụ. */
export type ThemeId = 'the-gioi' | PlateId | 'tat'
export type GlassLevel = 'trong' | 'mo' | 'duc'
export type Stats = { tools: Record<string, number>; turns: number }
export type Meta = { folder: string; date: string }
export type Live = { startedAt: number | null; now: number }

/** Xem trước thời tiết; 'tu-nhien' = theo mô phỏng thời tiết thật của thế giới. */
export type WeatherPick =
  | 'tu-nhien'
  | 'nang'
  | 'may-it'
  | 'may-vua'
  | 'may-nhieu'
  | 'gio'
  | 'suong'
  | 'phun'
  | 'mua'
  | 'mua-rao'
  | 'mua-to'
  | 'tuyet'
export type SeasonPick = 'tu-nhien' | 'xuan' | 'ha' | 'thu' | 'dong'
export type HourPick = 'that' | 'binh-minh' | 'trua' | 'hoang-hon' | 'dem'
/** `shift`: mili-giây cộng vào giờ thật khi xem một giờ khác (cố định lúc chọn để thời gian vẫn trôi liền). */
export type WorldView = { weather: WeatherPick; season: SeasonPick; hour: HourPick; shift: number }
export type WorldDetail = 'full' | 'lite'
/** Lần đặt nền gần nhất: app có vẽ nền sau khung chat không; không thì `reason` là lời engine (tiếng Anh).
 *  `hasDesktop`: lúc đó có app desktop nào gắn vào phiên (khung dự phòng chỉ mở cho app desktop). */
export type BackdropState = { isDrawn: boolean; reason: string; hasDesktop: boolean }

declare module 'claude-code' {
  interface PluginState {
    'giao-dien-dep': {
      theme: Shaped<ThemeId>
      glass: Shaped<GlassLevel>
      band: boolean
      stats: Shaped<Stats>
      done: number
      meta: Shaped<Meta | null>
      live: Shaped<Live>
      view: Shaped<WorldView>
      detail: Shaped<WorldDetail>
      /** Đầu cửa sổ vẽ hiện tại (epoch ms, đã cộng `shift`); đổi mỗi cửa sổ vẽ (WINDOW_MS, 2 phút) → nền vẽ lại. */
      win: number
      /** Phút hiện tại (epoch phút) cho thanh trạng thái; nền KHÔNG đọc giá trị này. */
      minute: number
      backdrop: Shaped<BackdropState>
    }
  }
}
