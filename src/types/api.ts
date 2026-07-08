import type { ProIdentifier } from './pro.js'

// Playlists

export interface ProPlaylistItem {
  id: ProIdentifier
  type: string
  is_header: boolean
  header: string
}

export interface ProPlaylist {
  id: ProIdentifier
  name: string
  type: string
  children: ProPlaylistItem[]
}

export interface ProPlaylistList {
  playlists: ProPlaylist[]
}

// Media

export interface ProMediaPlaylistItem {
  id: ProIdentifier
  type: string
  artist: string
  duration: number
}

export interface ProMediaPlaylist {
  id: ProIdentifier
  name: string
  type: string
  items: ProMediaPlaylistItem[]
}

export interface ProMediaPlaylistList {
  playlists: ProMediaPlaylist[]
}

// Audio

export interface ProAudioPlaylistItem {
  id: ProIdentifier
  type: string
  artist: string
  duration: number
}

export interface ProAudioPlaylist {
  id: ProIdentifier
  name: string
  type: string
  items: ProAudioPlaylistItem[]
}

export interface ProAudioPlaylistList {
  playlists: ProAudioPlaylist[]
}

// Timelines

export interface ProTimeline {
  is_running: boolean
  current_time: number
  total_time: number
}

// Timers

export interface ProTimer {
  id: ProIdentifier
  name: string
  allows_overrun: boolean
  countdown: {
    duration: number
  } | null
  count_down_to_time: {
    time_of_day: number
    period: string
  } | null
  elapsed: {
    start_time: number
    end_time: number
  } | null
}

export interface ProTimerList {
  timers: ProTimer[]
}

export interface ProSystemTime {
  time: number
  format: string
}

export interface ProVideoCountdown {
  time: number
}

// Capture

export interface ProCaptureSettings {
  source: string
  type: string
  disk: {
    path: string
  }
  rtmp: {
    server: string
    key: string
  } | null
  resi: unknown
}

export interface ProCaptureEncoding {
  name: string
  description: string
}

// Clear Groups

export interface ProClearGroup {
  id: ProIdentifier
  name: string
  icon: string
  tint: { red: number; green: number; blue: number; alpha: number }
  layers: string[]
}

export interface ProClearGroupList {
  groups: ProClearGroup[]
}

// Groups

export interface ProGroup {
  id: ProIdentifier
  name: string
  color: { red: number; green: number; blue: number; alpha: number }
}

export interface ProGroupList {
  groups: ProGroup[]
}

// Libraries

export interface ProLibrary {
  id: ProIdentifier
  name: string
  items: ProLibraryItem[]
}

export interface ProLibraryItem {
  id: ProIdentifier
  is_header: boolean
  type: string
}

export interface ProLibraryList {
  libraries: ProLibrary[]
}

// Looks

export interface ProLook {
  id: ProIdentifier
  name: string
  screens: Record<string, unknown>
}

export interface ProLookList {
  looks: ProLook[]
}

// Macros

export interface ProMacro {
  id: ProIdentifier
  name: string
  color: { red: number; green: number; blue: number; alpha: number }
}

export interface ProMacroList {
  macros: ProMacro[]
}

export interface ProMacroCollection {
  id: ProIdentifier
  name: string
  macros: ProMacro[]
}

export interface ProMacroCollectionList {
  collections: ProMacroCollection[]
}

// Masks

export interface ProMask {
  id: ProIdentifier
  name: string
}

export interface ProMaskList {
  masks: ProMask[]
}

// Messages

export interface ProMessageToken {
  name: string
  text: {
    text: string
  }
  timer: ProIdentifier | null
}

export interface ProMessage {
  id: ProIdentifier
  name: string
  tokens: ProMessageToken[]
}

export interface ProMessageList {
  messages: ProMessage[]
}

// Props

export interface ProProp {
  id: ProIdentifier
  name: string
  is_active: boolean
}

export interface ProPropList {
  props: ProProp[]
}

export interface ProPropCollection {
  id: ProIdentifier
  name: string
  props: ProProp[]
}

export interface ProPropCollectionList {
  collections: ProPropCollection[]
}

// Stage

export interface ProStageScreen {
  id: ProIdentifier
  name: string
  layout: ProIdentifier
  enabled: boolean
}

export interface ProStageScreenList {
  screens: ProStageScreen[]
}

export interface ProStageLayout {
  id: ProIdentifier
  name: string
}

export interface ProStageLayoutList {
  layouts: ProStageLayout[]
}

export interface ProStageLayoutMap {
  map: Record<string, string>
}

// Screens

export interface ProScreenStatus {
  enabled: boolean
}

export interface ProScreenList {
  screens: {
    id: ProIdentifier
    name: string
    type: string
  }[]
}

// Themes

export interface ProThemeSlide {
  id: ProIdentifier
  name: string
}

export interface ProTheme {
  id: ProIdentifier
  name: string
  slides: ProThemeSlide[]
}

export interface ProThemeList {
  themes: ProTheme[]
}

// Transport

export interface ProTransportCurrent {
  is_playing: boolean
  name: string
  duration: number
  time: number
  layer: string
}

export interface ProTransportTime {
  time: number
}

export interface ProTransportAutoAdvance {
  enabled: boolean
}

// Video Inputs

export interface ProVideoInput {
  id: ProIdentifier
  name: string
}

export interface ProVideoInputList {
  inputs: ProVideoInput[]
}

// Chord Chart

export interface ProChordChart {
  chords: string[]
}
