import { HttpClient } from './utils/http.js'
import { readSSE } from './utils/sse.js'
import { createLogger } from './logger.js'
import { ConnectionError } from './errors/index.js'
import { DEFAULT_OPTIONS } from './config.js'
import type { Listener } from './types/base.js'
import type { Logger } from './logger.js'
import type { ProPresenterOptions, ResolvedProPresenterOptions } from './config.js'
import type {
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
  ProIdentifier
} from './types/pro.js'
import type {
  ProPlaylistList,
  ProPlaylist,
  ProMediaPlaylistList,
  ProMediaPlaylist,
  ProAudioPlaylistList,
  ProAudioPlaylist,
  ProTimeline,
  ProTimerList,
  ProTimer,
  ProSystemTime,
  ProVideoCountdown,
  ProCaptureSettings,
  ProCaptureEncoding,
  ProClearGroupList,
  ProClearGroup,
  ProGroupList,
  ProLibraryList,
  ProLibrary,
  ProLookList,
  ProLook,
  ProMacroList,
  ProMacro,
  ProMacroCollectionList,
  ProMacroCollection,
  ProMaskList,
  ProMask,
  ProMessageList,
  ProMessage,
  ProPropList,
  ProProp,
  ProPropCollectionList,
  ProPropCollection,
  ProStageScreenList,
  ProStageLayout,
  ProStageLayoutList,
  ProStageLayoutMap,
  ProScreenStatus,
  ProScreenList,
  ProThemeList,
  ProTheme,
  ProThemeSlide,
  ProTransportCurrent,
  ProTransportTime,
  ProTransportAutoAdvance,
  ProVideoInputList,
  ProChordChart,
} from './types/api.js'

export interface ProEventMap {
  slideChange:                   ProSlideStatus
  slideIndexChange:              ProSlideIndex
  presentationChange:            { presentation?: ProPresentation }
  announcementDestinationChange: ProAnnouncementActive
  announcementIndex:             ProAnnouncementIndex
  audioActiveChange:             ProAudioPlaylist
  audioFocusedChange:            ProAudioPlaylist
  timerChange:                   ProTimerCurrent
  layerChange:                   ProLayerStatus
  stageMessage:                  ProStageMessage
  connected:                     void
  disconnected:                  void
  error:                         Error
}

export class ProPresenter {
  private http: HttpClient
  private listeners = new Map<keyof ProEventMap, Set<Function>>()
  private abort: AbortController | null = null
  private _connected = false
  private readonly options: ResolvedProPresenterOptions
  private readonly log: Logger
  public readonly baseUrl: string

  constructor(options: ProPresenterOptions)
  /** @deprecated Use `new ProPresenter({ host, port })` instead */
  constructor(host: string, port?: number)
  constructor(hostOrOptions: string | ProPresenterOptions, port?: number) {
    if (typeof hostOrOptions === 'string') {
      this.options = {
        host: hostOrOptions,
        port: port ?? DEFAULT_OPTIONS.port,
        version: undefined,
        reconnect: DEFAULT_OPTIONS.reconnect,
        reconnectDelay: DEFAULT_OPTIONS.reconnectDelay,
        timeout: DEFAULT_OPTIONS.timeout,
        debug: DEFAULT_OPTIONS.debug,
        logger: createLogger(DEFAULT_OPTIONS.debug),
      }
    } else {
      const logger = hostOrOptions.logger ?? createLogger(hostOrOptions.debug ?? DEFAULT_OPTIONS.debug)
      this.options = {
        host: hostOrOptions.host,
        port: hostOrOptions.port ?? DEFAULT_OPTIONS.port,
        version: hostOrOptions.version,
        reconnect: hostOrOptions.reconnect ?? DEFAULT_OPTIONS.reconnect,
        reconnectDelay: hostOrOptions.reconnectDelay ?? DEFAULT_OPTIONS.reconnectDelay,
        timeout: hostOrOptions.timeout ?? DEFAULT_OPTIONS.timeout,
        debug: hostOrOptions.debug ?? DEFAULT_OPTIONS.debug,
        logger,
      }
    }

    this.log = this.options.logger
    this.baseUrl = `http://${this.options.host}:${this.options.port}`
    this.http = new HttpClient({ baseUrl: this.baseUrl, timeout: this.options.timeout })
  }

  // Connection state

  /** Whether the client is currently connected to ProPresenter */
  get connected(): boolean {
    return this._connected
  }

  // Event system

  on<K extends keyof ProEventMap>(event: K, cb: Listener<ProEventMap[K]>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(cb)
    return () => this.listeners.get(event)?.delete(cb)
  }

  once<K extends keyof ProEventMap>(event: K, cb: Listener<ProEventMap[K]>): () => void {
    const wrapper = ((data: ProEventMap[K]) => {
      this.listeners.get(event)?.delete(wrapper)
      ;(cb as Function)(data)
    }) as Listener<ProEventMap[K]>
    return this.on(event, wrapper)
  }

  off<K extends keyof ProEventMap>(event: K, cb: Listener<ProEventMap[K]>): void {
    this.listeners.get(event)?.delete(cb)
  }

  private emit<K extends keyof ProEventMap>(event: K, data?: ProEventMap[K]) {
    this.listeners.get(event)?.forEach(fn => fn(data))
  }

  // Connection management

  async connect() {
    this.disconnect()
    this.abort = new AbortController()
    const signal = this.abort.signal

    const STREAM_URLS = [
      'status/slide',
      'presentation/slide_index',
      'presentation/active',
      'timers/current',
      'status/layers',
      'stage/message',
      'announcement/active',
      'announcement/slide_index',
      'audio/playlist/active',
      'audio/playlist/focused',
    ]

    const URL_EVENT_MAP: Record<string, keyof ProEventMap> = {
      'status/slide':              'slideChange',
      'presentation/slide_index':  'slideIndexChange',
      'presentation/active':       'presentationChange',
      'timers/current':            'timerChange',
      'status/layers':             'layerChange',
      'stage/message':             'stageMessage',
      'announcement/active':       'announcementDestinationChange',
      'announcement/slide_index':  'announcementIndex',
      'audio/playlist/active':     'audioActiveChange',
      'audio/playlist/focused':    'audioFocusedChange',
    }

    const runMultiplexer = async () => {
      try {
        await readSSE(
          new Request(`${this.baseUrl}/v1/status/updates?sse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(STREAM_URLS),
            signal,
          }),
          (raw, eventName) => {
            try {
              const url = eventName?.replace(/^\/v1\//, '')
              const event = url ? URL_EVENT_MAP[url] : undefined
              if (event) this.emit(event, JSON.parse(raw))
            } catch {}
          },
        )
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          this.log.error('Multiplexer connection failed:', err)
          this._connected = false
          this.emit('error', new ConnectionError('Multiplexer connection failed', { cause: err }))
          this.emit('disconnected')
          if (this.options.reconnect) {
            this.log.debug(`Reconnecting in ${this.options.reconnectDelay}ms...`)
            setTimeout(() => this.connect(), this.options.reconnectDelay)
          }
        }
      }
    }

    this._connected = true
    this.log.debug('Connected to ProPresenter')
    this.emit('connected')
    runMultiplexer()
  }

  disconnect() {
    this.abort?.abort()
    this.abort = null
    if (this._connected) {
      this._connected = false
      this.log.debug('Disconnected from ProPresenter')
      this.emit('disconnected')
    }
  }

  // Slide
  readonly slide = {
    getCurrent: () => this.http.get<ProSlideStatus>('/v1/status/slide'),
    getIndex:   () => this.http.get<ProSlideIndex>('/v1/presentation/slide_index'),
  }

  // Presentation
  readonly presentation = {
    getActive:               () => this.http.get<{ presentation?: ProPresentation }>('/v1/presentation/active'),
    getFocused:              () => this.http.get<ProIdentifier>('/v1/presentation/focused'),
    getByUuid:               (uuid: string) => this.http.get<{ presentation?: ProPresentation }>(`/v1/presentation/${uuid}`),
    thumbnailUrl:            (uuid: string, index: number) => `${this.baseUrl}/v1/presentation/${uuid}/thumbnail/${index}`,
    focusActive:             () => this.http.get<void>('/v1/presentation/active/focus'),
    triggerActive:           () => this.http.get<void>('/v1/presentation/active/trigger'),
    triggerNext:             () => this.http.get<void>('/v1/presentation/active/next/trigger'),
    triggerPrev:             () => this.http.get<void>('/v1/presentation/active/previous/trigger'),
    triggerIndex:            (i: number) => this.http.get<void>(`/v1/presentation/active/${i}/trigger`),
    triggerActiveGroup:      (groupId: string) => this.http.get<void>(`/v1/presentation/active/group/${groupId}/trigger`),
    getActiveTimeline:       () => this.http.get<ProTimeline>('/v1/presentation/active/timeline'),
    activeTimeline:          (op: 'play' | 'pause' | 'rewind') => this.http.get<void>(`/v1/presentation/active/timeline/${op}`),
    triggerFocused:          () => this.http.get<void>('/v1/presentation/focused/trigger'),
    triggerFocusedNext:      () => this.http.get<void>('/v1/presentation/focused/next/trigger'),
    triggerFocusedPrev:      () => this.http.get<void>('/v1/presentation/focused/previous/trigger'),
    triggerFocusedIndex:     (i: number) => this.http.get<void>(`/v1/presentation/focused/${i}/trigger`),
    triggerFocusedGroup:     (groupId: string) => this.http.get<void>(`/v1/presentation/focused/group/${groupId}/trigger`),
    getFocusedTimeline:      () => this.http.get<ProTimeline>('/v1/presentation/focused/timeline'),
    focusedTimeline:         (op: 'play' | 'pause' | 'rewind') => this.http.get<void>(`/v1/presentation/focused/timeline/${op}`),
    focusNext:               () => this.http.get<void>('/v1/presentation/next/focus'),
    focusPrev:               () => this.http.get<void>('/v1/presentation/previous/focus'),
    focusByUuid:             (uuid: string) => this.http.get<void>(`/v1/presentation/${uuid}/focus`),
    triggerByUuid:           (uuid: string) => this.http.get<void>(`/v1/presentation/${uuid}/trigger`),
    triggerByUuidNext:       (uuid: string) => this.http.get<void>(`/v1/presentation/${uuid}/next/trigger`),
    triggerByUuidPrev:       (uuid: string) => this.http.get<void>(`/v1/presentation/${uuid}/previous/trigger`),
    triggerByUuidIndex:      (uuid: string, i: number) => this.http.get<void>(`/v1/presentation/${uuid}/${i}/trigger`),
    triggerByUuidGroup:      (uuid: string, groupId: string) => this.http.get<void>(`/v1/presentation/${uuid}/group/${groupId}/trigger`),
    timelineByUuid:          (uuid: string, op: 'play' | 'pause' | 'rewind') => this.http.get<void>(`/v1/presentation/${uuid}/timeline/${op}`),
    getChordChart:           () => this.http.get<ProChordChart>('/v1/presentation/chord_chart'),
  }

  // Media
  readonly media = {
    thumbnailUrl:        (uuid: string) => `${this.baseUrl}/v1/media/${uuid}/thumbnail`,
    getPlaylists:        () => this.http.get<ProMediaPlaylistList>('/v1/media/playlists'),
    getActive:           () => this.http.get<ProMediaPlaylist>('/v1/media/playlist/active'),
    focusActive:         () => this.http.get<void>('/v1/media/playlist/active/focus'),
    triggerActive:       () => this.http.get<void>('/v1/media/playlist/active/trigger'),
    triggerActiveNext:   () => this.http.get<void>('/v1/media/playlist/active/next/trigger'),
    triggerActivePrev:   () => this.http.get<void>('/v1/media/playlist/active/previous/trigger'),
    triggerActiveItem:   (id: string) => this.http.get<void>(`/v1/media/playlist/active/${id}/trigger`),
    getFocused:          () => this.http.get<ProMediaPlaylist>('/v1/media/playlist/focused'),
    triggerFocused:      () => this.http.get<void>('/v1/media/playlist/focused/trigger'),
    triggerFocusedNext:  () => this.http.get<void>('/v1/media/playlist/focused/next/trigger'),
    triggerFocusedPrev:  () => this.http.get<void>('/v1/media/playlist/focused/previous/trigger'),
    triggerFocusedItem:  (id: string) => this.http.get<void>(`/v1/media/playlist/focused/${id}/trigger`),
    focusNext:           () => this.http.get<void>('/v1/media/playlist/next/focus'),
    focusPrev:           () => this.http.get<void>('/v1/media/playlist/previous/focus'),
    getPlaylist:         (id: string) => this.http.get<ProMediaPlaylist>(`/v1/media/playlist/${id}`),
    focusPlaylist:       (id: string) => this.http.get<void>(`/v1/media/playlist/${id}/focus`),
    triggerPlaylist:     (id: string) => this.http.get<void>(`/v1/media/playlist/${id}/trigger`),
    triggerPlaylistNext: (id: string) => this.http.get<void>(`/v1/media/playlist/${id}/next/trigger`),
    triggerPlaylistPrev: (id: string) => this.http.get<void>(`/v1/media/playlist/${id}/previous/trigger`),
    triggerPlaylistItem: (id: string, itemId: string) => this.http.get<void>(`/v1/media/playlist/${id}/${itemId}/trigger`),
  }

  // Trigger
  readonly trigger = {
    next:           () => this.http.get<void>('/v1/trigger/next'),
    previous:       () => this.http.get<void>('/v1/trigger/previous'),
    audioNext:      () => this.http.get<void>('/v1/trigger/audio/next'),
    audioPrevious:  () => this.http.get<void>('/v1/trigger/audio/previous'),
    mediaNext:      () => this.http.get<void>('/v1/trigger/media/next'),
    mediaPrevious:  () => this.http.get<void>('/v1/trigger/media/previous'),
  }

  // Audio

  readonly audio = {
    getPlaylists:        () => this.http.get<ProAudioPlaylistList>('/v1/audio/playlists'),
    getActive:           () => this.http.get<ProAudioPlaylist>('/v1/audio/playlist/active'),
    focusActive:         () => this.http.get<void>('/v1/audio/playlist/active/focus'),
    triggerActive:       () => this.http.get<void>('/v1/audio/playlist/active/trigger'),
    triggerActiveNext:   () => this.http.get<void>('/v1/audio/playlist/active/next/trigger'),
    triggerActivePrev:   () => this.http.get<void>('/v1/audio/playlist/active/previous/trigger'),
    triggerActiveItem:   (id: string) => this.http.get<void>(`/v1/audio/playlist/active/${id}/trigger`),
    getFocused:          () => this.http.get<ProAudioPlaylist>('/v1/audio/playlist/focused'),
    triggerFocused:      () => this.http.get<void>('/v1/audio/playlist/focused/trigger'),
    triggerFocusedNext:  () => this.http.get<void>('/v1/audio/playlist/focused/next/trigger'),
    triggerFocusedPrev:  () => this.http.get<void>('/v1/audio/playlist/focused/previous/trigger'),
    triggerFocusedItem:  (id: string) => this.http.get<void>(`/v1/audio/playlist/focused/${id}/trigger`),
    focusNext:           () => this.http.get<void>('/v1/audio/playlist/next/focus'),
    focusPrev:           () => this.http.get<void>('/v1/audio/playlist/previous/focus'),
    getPlaylist:         (id: string) => this.http.get<ProAudioPlaylist>(`/v1/audio/playlist/${id}`),
    focusPlaylist:       (id: string) => this.http.get<void>(`/v1/audio/playlist/${id}/focus`),
    triggerPlaylist:     (id: string) => this.http.get<void>(`/v1/audio/playlist/${id}/trigger`),
    triggerPlaylistNext: (id: string) => this.http.get<void>(`/v1/audio/playlist/${id}/next/trigger`),
    triggerPlaylistPrev: (id: string) => this.http.get<void>(`/v1/audio/playlist/${id}/previous/trigger`),
    triggerPlaylistItem: (id: string, itemId: string) => this.http.get<void>(`/v1/audio/playlist/${id}/${itemId}/trigger`),
  }

  // Capture
  readonly capture = {
    getStatus:    () => this.http.get<ProCaptureStatus>('/v1/capture/status'),
    getSettings:  () => this.http.get<ProCaptureSettings>('/v1/capture/settings'),
    getEncodings: (type: string) => this.http.get<ProCaptureEncoding[]>(`/v1/capture/encodings/${type}`),
    start:        () => this.http.get<void>('/v1/capture/start'),
    stop:         () => this.http.get<void>('/v1/capture/stop'),
  }

  // Clear Groups
  readonly clearGroups = {
    getAll:     () => this.http.get<ProClearGroupList>('/v1/clear/groups'),
    create:     (body: Partial<ProClearGroup>) => this.http.post('/v1/clear/groups', body),
    get:        (id: string) => this.http.get<ProClearGroup>(`/v1/clear/group/${id}`),
    update:     (id: string, body: Partial<ProClearGroup>) => this.http.put(`/v1/clear/group/${id}`, body),
    remove:     (id: string) => this.http.delete(`/v1/clear/group/${id}`),
    trigger:    (id: string) => this.http.get<void>(`/v1/clear/group/${id}/trigger`),
    getIcon:    (id: string) => this.http.get<string>(`/v1/clear/group/${id}/icon`),
    setIcon:    (id: string, body: string) => this.http.put(`/v1/clear/group/${id}/icon`, body),
    clearLayer: (layer: string) => this.http.get<void>(`/v1/clear/layer/${layer}`),
  }

  // Groups
  readonly group = {
    getAll: () => this.http.get<ProGroupList>('/v1/groups'),
  }

  // Library
  readonly library = {
    getAll:       () => this.http.get<ProLibraryList>('/v1/libraries'),
    get:          (libraryId: string) => this.http.get<ProLibrary>(`/v1/library/${libraryId}`),
    trigger:      (libraryId: string, presentationId: string) => this.http.get<void>(`/v1/library/${libraryId}/${presentationId}/trigger`),
    triggerIndex: (libraryId: string, presentationId: string, index: number) => this.http.get<void>(`/v1/library/${libraryId}/${presentationId}/${index}/trigger`),
  }

  // Looks
  readonly looks = {
    getAll:     () => this.http.get<ProLookList>('/v1/looks'),
    create:     (body: Partial<ProLook>) => this.http.post('/v1/looks', body),
    getCurrent: () => this.http.get<ProLook>('/v1/look/current'),
    setCurrent: (body: Partial<ProLook>) => this.http.put('/v1/look/current', body),
    get:        (id: string) => this.http.get<ProLook>(`/v1/look/${id}`),
    update:     (id: string, body: Partial<ProLook>) => this.http.put(`/v1/look/${id}`, body),
    remove:     (id: string) => this.http.delete(`/v1/look/${id}`),
    trigger:    (id: string) => this.http.get<void>(`/v1/look/${id}/trigger`),
  }

  // Macros
  readonly macro = {
    getAll:           () => this.http.get<ProMacroList>('/v1/macros'),
    get:              (id: string) => this.http.get<ProMacro>(`/v1/macro/${id}`),
    update:           (id: string, body: Partial<ProMacro>) => this.http.put(`/v1/macro/${id}`, body),
    remove:           (id: string) => this.http.delete(`/v1/macro/${id}`),
    trigger:          (id: string) => this.http.get<void>(`/v1/macro/${id}/trigger`),
    getIcon:          (id: string) => this.http.get<string>(`/v1/macro/${id}/icon`),
    setIcon:          (id: string, body: string) => this.http.put(`/v1/macro/${id}/icon`, body),
    getCollections:   () => this.http.get<ProMacroCollectionList>('/v1/macro_collections'),
    createCollection: (body: Partial<ProMacroCollection>) => this.http.post('/v1/macro_collections', body),
    getCollection:    (id: string) => this.http.get<ProMacroCollection>(`/v1/macro_collection/${id}`),
    updateCollection: (id: string, body: Partial<ProMacroCollection>) => this.http.put(`/v1/macro_collection/${id}`, body),
    removeCollection: (id: string) => this.http.delete(`/v1/macro_collection/${id}`),
  }

  // Masks
  readonly mask = {
    getAll:       () => this.http.get<ProMaskList>('/v1/masks'),
    get:          (id: string) => this.http.get<ProMask>(`/v1/mask/${id}`),
    thumbnailUrl: (id: string) => `${this.baseUrl}/v1/mask/${id}/thumbnail`,
  }

  // Messages
  readonly message = {
    getAll:  () => this.http.get<ProMessageList>('/v1/messages'),
    create:  (body: Partial<ProMessage>) => this.http.post('/v1/messages', body),
    get:     (id: string) => this.http.get<ProMessage>(`/v1/message/${id}`),
    update:  (id: string, body: Partial<ProMessage>) => this.http.put(`/v1/message/${id}`, body),
    remove:  (id: string) => this.http.delete(`/v1/message/${id}`),
    trigger: (id: string, body?: Record<string, unknown>) => this.http.post(`/v1/message/${id}/trigger`, body),
    clear:   (id: string) => this.http.get<void>(`/v1/message/${id}/clear`),
  }

  // Playlists
  readonly playlist = {
    getAll:              () => this.http.get<ProPlaylistList>('/v1/playlists'),
    create:              (body: Partial<ProPlaylist>) => this.http.post('/v1/playlists', body),
    getActive:           () => this.http.get<ProPlaylist>('/v1/playlist/active'),
    getFocused:          () => this.http.get<ProPlaylist>('/v1/playlist/focused'),
    triggerFocused:      () => this.http.get<void>('/v1/playlist/focused/trigger'),
    triggerFocusedNext:  () => this.http.get<void>('/v1/playlist/focused/next/trigger'),
    triggerFocusedPrev:  () => this.http.get<void>('/v1/playlist/focused/previous/trigger'),
    triggerFocusedIndex: (i: number) => this.http.get<void>(`/v1/playlist/focused/${i}/trigger`),
    focusNext:           () => this.http.get<void>('/v1/playlist/next/focus'),
    focusPrev:           () => this.http.get<void>('/v1/playlist/previous/focus'),
    get:                 (id: string) => this.http.get<ProPlaylist>(`/v1/playlist/${id}`),
    add:                 (id: string, body: Partial<ProPlaylist>) => this.http.post(`/v1/playlist/${id}`, body),
    update:              (id: string, body: Partial<ProPlaylist>) => this.http.put(`/v1/playlist/${id}`, body),
    focus:               (id: string) => this.http.get<void>(`/v1/playlist/${id}/focus`),
    trigger:             (id: string) => this.http.get<void>(`/v1/playlist/${id}/trigger`),
    triggerNext:         (id: string) => this.http.get<void>(`/v1/playlist/${id}/next/trigger`),
    triggerPrev:         (id: string) => this.http.get<void>(`/v1/playlist/${id}/previous/trigger`),
    triggerIndex:        (id: string, i: number) => this.http.get<void>(`/v1/playlist/${id}/${i}/trigger`),
    thumbnailUrl:        (id: string, index: number, cueIndex: number) => `${this.baseUrl}/v1/playlist/${id}/${index}/thumbnail/${cueIndex}`,
  }

  // Props
  readonly prop = {
    getAll:           () => this.http.get<ProPropList>('/v1/props'),
    get:              (id: string) => this.http.get<ProProp>(`/v1/prop/${id}`),
    update:           (id: string, body: Partial<ProProp>) => this.http.put(`/v1/prop/${id}`, body),
    remove:           (id: string) => this.http.delete(`/v1/prop/${id}`),
    trigger:          (id: string) => this.http.get<void>(`/v1/prop/${id}/trigger`),
    clear:            (id: string) => this.http.get<void>(`/v1/prop/${id}/clear`),
    pauseAutoClear:   (id: string) => this.http.get<void>(`/v1/prop/${id}/auto_clear/pause`),
    resumeAutoClear:  (id: string) => this.http.get<void>(`/v1/prop/${id}/auto_clear/resume`),
    thumbnailUrl:     (id: string) => `${this.baseUrl}/v1/prop/${id}/thumbnail`,
    getCollections:   () => this.http.get<ProPropCollectionList>('/v1/prop_collections'),
    createCollection: (body: Partial<ProPropCollection>) => this.http.post('/v1/prop_collections', body),
    getCollection:    (id: string) => this.http.get<ProPropCollection>(`/v1/prop_collection/${id}`),
    updateCollection: (id: string, body: Partial<ProPropCollection>) => this.http.put(`/v1/prop_collection/${id}`, body),
    removeCollection: (id: string) => this.http.delete(`/v1/prop_collection/${id}`),
  }

  // Stage
  readonly stage = {
    getMessage:           () => this.http.get<ProStageMessage>('/v1/stage/message'),
    setMessage:           (msg: string) => this.http.put('/v1/stage/message', msg),
    clearMessage:         () => this.http.delete('/v1/stage/message'),
    getScreens:           () => this.http.get<ProStageScreenList>('/v1/stage/screens'),
    getScreenLayout:      (id: string) => this.http.get<ProStageLayout>(`/v1/stage/screen/${id}/layout`),
    setScreenLayout:      (id: string, layoutId: string) => this.http.get<void>(`/v1/stage/screen/${id}/layout/${layoutId}`),
    getLayouts:           () => this.http.get<ProStageLayoutList>('/v1/stage/layouts'),
    removeLayout:         (id: string) => this.http.delete(`/v1/stage/layout/${id}`),
    layoutThumbnailUrl:   (id: string) => `${this.baseUrl}/v1/stage/layout/${id}/thumbnail`,
    getLayoutMap:         () => this.http.get<ProStageLayoutMap>('/v1/stage/layout_map'),
    setLayoutMap:         (body: ProStageLayoutMap) => this.http.put('/v1/stage/layout_map', body),
  }

  // Screens
  readonly screens = {
    getAudience: () => this.http.get<ProScreenStatus>('/v1/status/audience_screens'),
    setAudience: (enabled: boolean) => this.http.put('/v1/status/audience_screens', enabled),
    getStage:    () => this.http.get<ProScreenStatus>('/v1/status/stage_screens'),
    setStage:    (enabled: boolean) => this.http.put('/v1/status/stage_screens', enabled),
    getLayers:   () => this.http.get<ProLayerStatus>('/v1/status/layers'),
    getAll:      () => this.http.get<ProScreenList>('/v1/status/screens'),
  }

  // Themes
  readonly theme = {
    getAll:           () => this.http.get<ProThemeList>('/v1/themes'),
    get:              (id: string) => this.http.get<ProTheme>(`/v1/theme/${id}`),
    getSlide:         (id: string, slide: string) => this.http.get<ProThemeSlide>(`/v1/theme/${id}/slides/${slide}`),
    updateSlide:      (id: string, slide: string, body: Partial<ProThemeSlide>) => this.http.put(`/v1/theme/${id}/slides/${slide}`, body),
    slideThumbnailUrl:(id: string, slide: string) => `${this.baseUrl}/v1/theme/${id}/slides/${slide}/thumbnail`,
  }

  // Timers
  readonly timers = {
    getCurrent:        () => this.http.get<ProTimerCurrent>('/v1/timers/current'),
    startAll:          () => this.http.get<void>('/v1/timers/start'),
    stopAll:           () => this.http.get<void>('/v1/timers/stop'),
    resetAll:          () => this.http.get<void>('/v1/timers/reset'),
    getAll:            () => this.http.get<ProTimerList>('/v1/timers'),
    create:            (body: Partial<ProTimer>) => this.http.post('/v1/timers', body),
    get:               (id: string) => this.http.get<ProTimer>(`/v1/timer/${id}`),
    update:            (id: string, body: Partial<ProTimer>) => this.http.put(`/v1/timer/${id}`, body),
    remove:            (id: string) => this.http.delete(`/v1/timer/${id}`),
    control:           (id: string, op: 'start' | 'stop' | 'reset') => this.http.get<void>(`/v1/timer/${id}/${op}`),
    increment:         (id: string, time: number) => this.http.get<void>(`/v1/timer/${id}/increment/${time}`),
    getSystemTime:     () => this.http.get<ProSystemTime>('/v1/timer/system_time'),
    getVideoCountdown: () => this.http.get<ProVideoCountdown>('/v1/timer/video_countdown'),
  }

  // Transport
  readonly transport = {
    getCurrent:       (layer: string) => this.http.get<ProTransportCurrent>(`/v1/transport/${layer}/current`),
    play:             (layer: string) => this.http.get<void>(`/v1/transport/${layer}/play`),
    pause:            (layer: string) => this.http.get<void>(`/v1/transport/${layer}/pause`),
    getTime:          (layer: string) => this.http.get<ProTransportTime>(`/v1/transport/${layer}/time`),
    setTime:          (layer: string, body: ProTransportTime) => this.http.put(`/v1/transport/${layer}/time`, body),
    goToEnd:          (layer: string) => this.http.get<void>(`/v1/transport/${layer}/go_to_end`),
    skipForward:      (layer: string, time: number) => this.http.get<void>(`/v1/transport/${layer}/skip_forward/${time}`),
    skipBackward:     (layer: string, time: number) => this.http.get<void>(`/v1/transport/${layer}/skip_backward/${time}`),
    getAutoAdvance:   (layer: string) => this.http.get<ProTransportAutoAdvance>(`/v1/transport/${layer}/auto_advance`),
    setAutoAdvance:   (layer: string, body: ProTransportAutoAdvance) => this.http.put(`/v1/transport/${layer}/auto_advance`, body),
    clearAutoAdvance: (layer: string) => this.http.delete(`/v1/transport/${layer}/auto_advance`),
  }

  // Video Inputs
  readonly videoInput = {
    getAll:  () => this.http.get<ProVideoInputList>('/v1/video_inputs'),
    trigger: (id: string) => this.http.get<void>(`/v1/video_inputs/${id}/trigger`),
  }

  // Announcements
  readonly announcement = {
    getActive:    () => this.http.get<ProAnnouncementActive>('/v1/announcement/active'),
    getIndex:     () => this.http.get<ProAnnouncementIndex>('/v1/announcement/slide_index'),
    focus:        () => this.http.get<void>('/v1/announcement/active/focus'),
    trigger:      () => this.http.get<void>('/v1/announcement/active/trigger'),
    triggerNext:  () => this.http.get<void>('/v1/announcement/active/next/trigger'),
    triggerPrev:  () => this.http.get<void>('/v1/announcement/active/previous/trigger'),
    triggerIndex: (i: number) => this.http.get<void>(`/v1/announcement/active/${i}/trigger`),
    getTimeline:  () => this.http.get<ProAnnouncementTimeline>('/v1/announcement/active/timeline'),
    timeline:     (op: 'play' | 'pause' | 'rewind') => this.http.get<void>(`/v1/announcement/active/timeline/${op}`),
  }

  // Version
  getVersion() {
    return this.http.get<ProVersionInfo>('/version')
  }

  // Utility
  findMyMouse() {
    return this.http.get<void>('/v1/find_my_mouse')
  }
}

export function createProPresenter(options: ProPresenterOptions): ProPresenter
/** @deprecated Use `createProPresenter({ host, port })` instead */
export function createProPresenter(host: string, port?: number): ProPresenter
export function createProPresenter(hostOrOptions: string | ProPresenterOptions, port?: number): ProPresenter {
  if (typeof hostOrOptions === 'string') {
    return new ProPresenter(hostOrOptions, port)
  }
  return new ProPresenter(hostOrOptions)
}
