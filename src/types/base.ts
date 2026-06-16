export interface ProId {
  uuid: string
  name: string
  index: number
}

export type Maybe<T> = T | undefined
export type Nullable<T> = T | null
export type Dict<T = unknown> = Record<string, T>
export type Listener<T> = T extends void ? () => void : (data: T) => void
export type EventMap = Record<string, unknown>

export interface ApiResponse<T> {
  data: T
  error?: string
}

export interface ProList<T> {
  items: T[]
  total?: number
}

export type TimerType = 'countdown' | 'countup' | 'elapsed'
export type TimerEndAction = 'none' | 'loop' | 'stop'

export type PlaylistType = 'presentation' | 'media' | 'audio'

export type ClearLayer =
  | 'presentation'
  | 'announcement'
  | 'props'
  | 'audio'
  | 'media'
  | 'video_input'
  | 'messages'
  | 'telestrator'

export type LookLayerType =
  | 'slide'
  | 'props'
  | 'announcement'
  | 'audio'
  | 'media'
  | 'video_input'
  | 'messages'

export type ProVersion = 'pro' | 'pro6'
