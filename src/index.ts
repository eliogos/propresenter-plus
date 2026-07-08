// Core client
export { ProPresenter, createProPresenter } from './propresenter.js'
export type { ProEventMap } from './propresenter.js'

// Configuration
export type { ProPresenterOptions } from './config.js'

// Version
export { ProVersion } from './versions/index.js'

// Errors
export {
  ProPresenterError,
  ConnectionError,
  RequestError,
  TimeoutError,
} from './errors/index.js'

// Builders
export {
  TimerBuilder,
  LookBuilder,
  MessageBuilder,
  PlaylistBuilder,
  ClearGroupBuilder,
  PresentationBuilder,
  PropCollectionBuilder,
  MacroCollectionBuilder,
} from './builders/index.js'

// Public types
export type {
  // Base types
  Listener,

  // ProPresenter data types
  ProSlideStatus,
  ProSlideIndex,
  ProPresentation,
  ProTimerCurrent,
  ProLayerStatus,
  ProStageMessage,
  ProCaptureStatus,
  ProVersionInfo,
  ProAnnouncementActive,
  ProAnnouncementIndex,
  ProAnnouncementTimeline,
  ProIdentifier,

  // API response types
  ProPlaylist,
  ProPlaylistItem,
  ProPlaylistList,
  ProMediaPlaylist,
  ProMediaPlaylistItem,
  ProMediaPlaylistList,
  ProAudioPlaylist,
  ProAudioPlaylistItem,
  ProAudioPlaylistList,
  ProTimeline,
  ProTimer,
  ProTimerList,
  ProSystemTime,
  ProVideoCountdown,
  ProCaptureSettings,
  ProCaptureEncoding,
  ProClearGroup,
  ProClearGroupList,
  ProGroup,
  ProGroupList,
  ProLibrary,
  ProLibraryItem,
  ProLibraryList,
  ProLook,
  ProLookList,
  ProMacro,
  ProMacroList,
  ProMacroCollection,
  ProMacroCollectionList,
  ProMask,
  ProMaskList,
  ProMessage,
  ProMessageToken,
  ProMessageList,
  ProProp,
  ProPropList,
  ProPropCollection,
  ProPropCollectionList,
  ProStageScreen,
  ProStageScreenList,
  ProStageLayout,
  ProStageLayoutList,
  ProStageLayoutMap,
  ProScreenStatus,
  ProScreenList,
  ProTheme,
  ProThemeSlide,
  ProThemeList,
  ProTransportCurrent,
  ProTransportTime,
  ProTransportAutoAdvance,
  ProVideoInput,
  ProVideoInputList,
  ProChordChart,
} from './types/index.js'
