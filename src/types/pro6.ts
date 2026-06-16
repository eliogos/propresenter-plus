export interface Pro6TextStyle {
  font?:  string
  size?:  number
  color?: [number, number, number]
  align?: 'left' | 'center' | 'right'
}

export interface Pro6Slide {
  text:              string
  label?:            string
  notes?:            string
  backgroundColor?:  [number, number, number, number]
}

export interface Pro6Group {
  name:   string
  slides: Pro6Slide[]
  color?: [number, number, number, number]
}

export interface Pro6Options {
  title:   string
  artist?: string
  author?: string
  width?:  number
  height?: number
  style?:  Pro6TextStyle
  groups:  Pro6Group[]
}
