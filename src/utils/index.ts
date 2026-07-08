export * from './http.js'
export * from './sse.js'

export interface ProColor {
  red:   number
  green: number
  blue:  number
  alpha: number
}

export interface RgbColor   { r: number; g: number; b: number; a: number }
export interface HslColor   { h: number; s: number; l: number; a: number }
export interface HsvColor   { h: number; s: number; v: number; a: number }
export interface XyzColor   { x: number; y: number; z: number; a: number }
export interface OklabColor { L: number; a: number; b: number; alpha: number }
export interface OklchColor { L: number; c: number; h: number; alpha: number }

export function toRgb(c: ProColor): RgbColor {
  return { r: Math.round(c.red * 255), g: Math.round(c.green * 255), b: Math.round(c.blue * 255), a: c.alpha }
}

export function fromRgb(r: number, g: number, b: number, a = 1): ProColor {
  return { red: r / 255, green: g / 255, blue: b / 255, alpha: a }
}

function byte(n: number) {
  return Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).padStart(2, '0')
}

export function toHex(c: ProColor, includeAlpha = false): string {
  const hex = `#${byte(c.red)}${byte(c.green)}${byte(c.blue)}`
  return includeAlpha ? hex + byte(c.alpha) : hex
}

export function fromHex(hex: string): ProColor {
  const h = hex.replace('#', '')
  const parse = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255
  return { red: parse(0), green: parse(2), blue: parse(4), alpha: h.length === 8 ? parse(6) : 1 }
}

export function toHsl(c: ProColor): HslColor {
  const { red: r, green: g, blue: b } = c
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0, s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100, a: c.alpha }
}

export function fromHsl(h: number, s: number, l: number, a = 1): ProColor {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const f = (n: number) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return { red: f(0), green: f(8), blue: f(4), alpha: a }
}

export function toHsv(c: ProColor): HsvColor {
  const { red: r, green: g, blue: b } = c
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: h * 360, s: max === 0 ? 0 : (d / max) * 100, v: max * 100, a: c.alpha }
}

export function fromHsv(h: number, s: number, v: number, a = 1): ProColor {
  s /= 100; v /= 100; h /= 360
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s)
  const cases: [number, number, number][] = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]]
  const [r, g, b] = cases[i % 6]!
  return { red: r, green: g, blue: b, alpha: a }
}

function toLinear(n: number) {
  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
}

function fromLinear(n: number) {
  return n <= 0.0031308 ? 12.92 * n : 1.055 * Math.pow(n, 1 / 2.4) - 0.055
}

export function toXyz(c: ProColor): XyzColor {
  const r = toLinear(c.red), g = toLinear(c.green), b = toLinear(c.blue)
  return {
    x: 0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
    y: 0.2126729 * r + 0.7151522 * g + 0.0721750 * b,
    z: 0.0193339 * r + 0.1191920 * g + 0.9503041 * b,
    a: c.alpha,
  }
}

export function fromXyz(x: number, y: number, z: number, a = 1): ProColor {
  const clamp = (n: number) => Math.max(0, Math.min(1, n))
  return {
    red:   clamp(fromLinear( 3.2404542 * x - 1.5371385 * y - 0.4985314 * z)),
    green: clamp(fromLinear(-0.9692660 * x + 1.8760108 * y + 0.0415560 * z)),
    blue:  clamp(fromLinear( 0.0556434 * x - 0.2040259 * y + 1.0572252 * z)),
    alpha: a,
  }
}

export function toOklab(c: ProColor): OklabColor {
  const { x, y, z } = toXyz(c)
  const l_ = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z)
  const m_ = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z)
  const s_ = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z)
  return {
    L:     0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a:     1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b:     0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    alpha: c.alpha,
  }
}

export function fromOklab(L: number, a: number, b: number, alpha = 1): ProColor {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b
  return fromXyz(
    +4.0767416621 * (l_**3) - 3.3077115913 * (m_**3) + 0.2309699292 * (s_**3),
    -1.2684380046 * (l_**3) + 2.6097574011 * (m_**3) - 0.3413193965 * (s_**3),
    -0.0041960863 * (l_**3) - 0.7034186147 * (m_**3) + 1.7076147010 * (s_**3),
    alpha,
  )
}

export function toOklch(c: ProColor): OklchColor {
  const { L, a, b, alpha } = toOklab(c)
  let h = Math.atan2(b, a) * (180 / Math.PI)
  if (h < 0) h += 360
  return { L, c: Math.sqrt(a * a + b * b), h, alpha }
}

export function fromOklch(L: number, c: number, h: number, alpha = 1): ProColor {
  const rad = h * (Math.PI / 180)
  return fromOklab(L, c * Math.cos(rad), c * Math.sin(rad), alpha)
}

export function toCssRgb(c: ProColor): string {
  const { r, g, b, a } = toRgb(c)
  return a === 1 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${a})`
}

export function toCssHsl(c: ProColor): string {
  const { h, s, l, a } = toHsl(c)
  return a === 1 ? `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)` : `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}% / ${a})`
}

export function toCssOklch(c: ProColor): string {
  const { L, c: ch, h, alpha } = toOklch(c)
  const base = `oklch(${L.toFixed(4)} ${ch.toFixed(4)} ${h.toFixed(2)})`
  return alpha === 1 ? base : `oklch(${L.toFixed(4)} ${ch.toFixed(4)} ${h.toFixed(2)} / ${alpha})`
}

export function getSlideWidth(slide: { size?: { width: number } }): number {
  return slide.size?.width ?? 1920
}

export function getSlideHeight(slide: { size?: { height: number } }): number {
  return slide.size?.height ?? 1080
}

export function getSlideAspectRatio(slide: { size?: { width: number; height: number } }): number {
  return getSlideWidth(slide) / getSlideHeight(slide)
}

function normalizePath(p: string) {
  return p.replace(/\\/g, '/')
}

export function getPresentationFilename(path: string): string {
  return normalizePath(path).split('/').pop() ?? path
}

export function getPresentationDirectory(path: string): string {
  const parts = normalizePath(path).split('/')
  parts.pop()
  return parts.join('/')
}

export function getPresentationName(path: string): string {
  return getPresentationFilename(path).replace(/\.pro$/i, '')
}

export function getSlideAtIndex(groups: any[], index: number): any | null {
  return groups.flatMap((g: any) => g.slides)[index] ?? null
}

export function duration({ hours = 0, minutes = 0, seconds = 0 } = {}): number {
  return hours * 3600 + minutes * 60 + seconds
}
