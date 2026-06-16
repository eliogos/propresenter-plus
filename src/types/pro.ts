import type { ProId, Maybe, Nullable, Dict, Listener, EventMap, ApiResponse, ProList, TimerType, TimerEndAction, PlaylistType, ClearLayer, LookLayerType, ProVersion as ProVersionTag } from './base'

export type ProSlideStatus          = any
export type ProSlide                = any
export type ProPresentation         = any
export type ProSlideIndex           = any
export type ProIdentifier           = any
export type ProPresentationDetail   = { presentation?: ProPresentation }
export type ProTimerCurrent         = any
export type ProLayerStatus          = any
export type ProAnnouncementActive   = any
export type ProAnnouncement         = any
export type ProAnnouncementIndex    = any
export type ProAnnouncementTimeline = any
export type ProStageMessage         = string
export type ProCaptureStatus        = any
export type ProVersionInfo          = any
export type ProSlideGroup           = any
export type ProSlideDetail          = any

export interface ProStyle {
  font?:  string
  size?:  number
  color?: [number, number, number]
  align?: 'left' | 'center' | 'right'
  width?: number
}

export interface ProSlideInput {
  text: string
}

export interface ProGroupInput {
  name: string
  slides: ProSlideInput[]
}

export interface ProSlideBinary {
  uuid:  string
  text:  string
}

export interface ProGroupBinary {
  uuid:            string
  arrangementUUID: string
  name:            string
  slides:          ProSlideBinary[]
}

export interface PresentationMeta {
  uuid:               string
  title:              string
  filename:           string
  filePath:           string
  groups:             ProGroupBinary[]
  createdAt:          string
  width?:             number
  height?:            number
  artist?:            string
  author?:            string
  publisher?:         string
  CCLI?:              string
  displayCopyright?:  boolean
  copyrightYear?:     string
}

export interface BuildOptions {
  title:              string
  groups:             ProGroupInput[]
  style?:             ProStyle
  presUUID?:          string
  width?:             number
  height?:            number
  artist?:            string
  author?:            string
  publisher?:         string
  CCLI?:              string
  displayCopyright?:  boolean
  copyrightYear?:     string
}

export type { ProId, Maybe, Nullable, Dict, Listener, EventMap, ApiResponse, ProList, TimerType, TimerEndAction, PlaylistType, ClearLayer, LookLayerType, ProVersionTag }
