// Bản thay thế tối giản cho mỗi module — dùng khi module thật chưa có hoặc đang lỗi (khung xem trước tự rơi về đây).
import { ground, n0, toLayer, WORLD_W } from './util'
import type { ActorsModule, MidModule, Region, SkyModule, WeatherModule } from './types'

export const stubSky: SkyModule = {
  build: () => ({ screen: '', pieces: [] }),
}

export const stubMid: MidModule = {
  build: () => {
    const pieces = []
    for (let x = 0; x < toLayer(WORLD_W, 2); x += 700) {
      pieces.push({ layer: 2 as const, x0: x, x1: x + 700, prio: 6, svg: `<path class="l4" opacity=".5" d="M${x} 700Q${x + 350} ${560 + ((x / 700) % 3) * 30} ${x + 700} 700V1100H${x}Z"/>` })
    }
    return { pieces }
  },
}

export const stubWeather: WeatherModule = { build: () => ({ screen: '' }) }
export const stubActors: ActorsModule = { build: () => ({ pieces: [] }) }

export function stubRegion(id: string, name: string, x0: number, x1: number): Region {
  const cx = (x0 + x1) / 2
  return {
    id,
    name,
    x0,
    x1,
    shots: [{ id, name, x: cx, y: 520, zoom: 1 }],
    build: () => ({
      pieces: [
        {
          layer: 3,
          x0: cx - 60,
          x1: cx + 60,
          prio: 5,
          svg: `<rect class="s3" x="${n0(cx - 50)}" y="${n0(ground(cx) - 120)}" width="100" height="120"/><text x="${n0(cx)}" y="${n0(ground(cx) - 140)}" text-anchor="middle" font-size="28" fill="#fff">${name}</text>`,
        },
      ],
    }),
  }
}
