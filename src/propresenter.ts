import { HttpClient } from './utils/http'
import { readSSE } from './utils/sse'
import type { Listener } from './types/base'
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
} from './types/pro'

export interface ProEventMap {
  slideChange:                   ProSlideStatus
  slideIndexChange:              ProSlideIndex
  presentationChange:            { presentation?: ProPresentation }
  announcementDestinationChange: ProAnnouncementActive
  announcementIndex:             ProAnnouncementIndex
  audioActiveChange:             unknown
  audioFocusedChange:            unknown
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
  public readonly baseUrl: string

  constructor(host: string, port = 1025) {
    this.baseUrl = `http://${host}:${port}`
    this.http = new HttpClient({ baseUrl: this.baseUrl })
  }

  on<K extends keyof ProEventMap>(event: K, cb: Listener<ProEventMap[K]>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(cb)
    return () => this.listeners.get(event)?.delete(cb)
  }

  private emit<K extends keyof ProEventMap>(event: K, data?: ProEventMap[K]) {
    this.listeners.get(event)?.forEach(fn => fn(data))
  }

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
    ]

    const URL_EVENT_MAP: Record<string, keyof ProEventMap> = {
      'status/slide':              'slideChange',
      'presentation/slide_index':  'slideIndexChange',
      'presentation/active':       'presentationChange',
      'timers/current':            'timerChange',
      'status/layers':             'layerChange',
      'stage/message':             'stageMessage',
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
          (raw) => {
            try {
              const { url, data } = JSON.parse(raw)
              const event = URL_EVENT_MAP[url]
              if (event) this.emit(event, data)
            } catch {}
          },
        )
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('ProPresenter multiplexer connection failed:', err)
          this.emit('error', err as Error)
          this.emit('disconnected')
          setTimeout(() => this.connect(), 3000)
        }
      }
    }

    const runDirectSSE = async (path: string, eventName: keyof ProEventMap) => {
      const run = async () => {
        try {
          await readSSE(
            new Request(`${this.baseUrl}${path}?chunked=true&sse`, { signal }),
            (raw) => { try { this.emit(eventName, JSON.parse(raw)) } catch {} },
          )
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            console.error(`ProPresenter direct SSE (${path}) failed:`, err)
            setTimeout(run, 3000)
          }
        }
      }
      run()
    }

    this.emit('connected')
    runDirectSSE('/v1/status/slide',              'slideChange')
    runDirectSSE('/v1/status/layers',             'layerChange')
    runMultiplexer()
    runDirectSSE('/v1/announcement/active',       'announcementDestinationChange')
    runDirectSSE('/v1/announcement/slide_index',  'announcementIndex')
    runDirectSSE('/v1/audio/playlist/active',     'audioActiveChange')
    runDirectSSE('/v1/audio/playlist/focused',    'audioFocusedChange')
  }

  disconnect() {
    this.abort?.abort()
    this.abort = null
    this.emit('disconnected')
  }

  readonly slide = {
    getCurrent: () => this.http.get<ProSlideStatus>('/v1/status/slide'),
    getIndex:   () => this.http.get<ProSlideIndex>('/v1/presentation/slide_index'),
  }

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
    getActiveTimeline:       () => this.http.get<unknown>('/v1/presentation/active/timeline'),
    activeTimeline:          (op: 'play' | 'pause' | 'rewind') => this.http.get<void>(`/v1/presentation/active/timeline/${op}`),
    triggerFocused:          () => this.http.get<void>('/v1/presentation/focused/trigger'),
    triggerFocusedNext:      () => this.http.get<void>('/v1/presentation/focused/next/trigger'),
    triggerFocusedPrev:      () => this.http.get<void>('/v1/presentation/focused/previous/trigger'),
    triggerFocusedIndex:     (i: number) => this.http.get<void>(`/v1/presentation/focused/${i}/trigger`),
    triggerFocusedGroup:     (groupId: string) => this.http.get<void>(`/v1/presentation/focused/group/${groupId}/trigger`),
    getFocusedTimeline:      () => this.http.get<unknown>('/v1/presentation/focused/timeline'),
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
    getChordChart:           () => this.http.get<unknown>('/v1/presentation/chord_chart'),
  }

  readonly media = {
    thumbnailUrl:        (uuid: string) => `${this.baseUrl}/v1/media/${uuid}/thumbnail`,
    getPlaylists:        () => this.http.get<unknown>('/v1/media/playlists'),
    getActive:           () => this.http.get<unknown>('/v1/media/playlist/active'),
    focusActive:         () => this.http.get<void>('/v1/media/playlist/active/focus'),
    triggerActive:       () => this.http.get<void>('/v1/media/playlist/active/trigger'),
    triggerActiveNext:   () => this.http.get<void>('/v1/media/playlist/active/next/trigger'),
    triggerActivePrev:   () => this.http.get<void>('/v1/media/playlist/active/previous/trigger'),
    triggerActiveItem:   (id: string) => this.http.get<void>(`/v1/media/playlist/active/${id}/trigger`),
    getFocused:          () => this.http.get<unknown>('/v1/media/playlist/focused'),
    triggerFocused:      () => this.http.get<void>('/v1/media/playlist/focused/trigger'),
    triggerFocusedNext:  () => this.http.get<void>('/v1/media/playlist/focused/next/trigger'),
    triggerFocusedPrev:  () => this.http.get<void>('/v1/media/playlist/focused/previous/trigger'),
    triggerFocusedItem:  (id: string) => this.http.get<void>(`/v1/media/playlist/focused/${id}/trigger`),
    focusNext:           () => this.http.get<void>('/v1/media/playlist/next/focus'),
    focusPrev:           () => this.http.get<void>('/v1/media/playlist/previous/focus'),
    getPlaylist:         (id: string) => this.http.get<unknown>(`/v1/media/playlist/${id}`),
    focusPlaylist:       (id: string) => this.http.get<void>(`/v1/media/playlist/${id}/focus`),
    triggerPlaylist:     (id: string) => this.http.get<void>(`/v1/media/playlist/${id}/trigger`),
    triggerPlaylistNext: (id: string) => this.http.get<void>(`/v1/media/playlist/${id}/next/trigger`),
    triggerPlaylistPrev: (id: string) => this.http.get<void>(`/v1/media/playlist/${id}/previous/trigger`),
    triggerPlaylistItem: (id: string, itemId: string) => this.http.get<void>(`/v1/media/playlist/${id}/${itemId}/trigger`),
  }

  readonly trigger = {
    next:           () => this.http.get<void>('/v1/trigger/next'),
    previous:       () => this.http.get<void>('/v1/trigger/previous'),
    audioNext:      () => this.http.get<void>('/v1/trigger/audio/next'),
    audioPrevious:  () => this.http.get<void>('/v1/trigger/audio/previous'),
    mediaNext:      () => this.http.get<void>('/v1/trigger/media/next'),
    mediaPrevious:  () => this.http.get<void>('/v1/trigger/media/previous'),
  }

  readonly audio = {
    getPlaylists:        () => this.http.get<unknown>('/v1/audio/playlists'),
    getActive:           () => this.http.get<unknown>('/v1/audio/playlist/active'),
    focusActive:         () => this.http.get<void>('/v1/audio/playlist/active/focus'),
    triggerActive:       () => this.http.get<void>('/v1/audio/playlist/active/trigger'),
    triggerActiveNext:   () => this.http.get<void>('/v1/audio/playlist/active/next/trigger'),
    triggerActivePrev:   () => this.http.get<void>('/v1/audio/playlist/active/previous/trigger'),
    triggerActiveItem:   (id: string) => this.http.get<void>(`/v1/audio/playlist/active/${id}/trigger`),
    getFocused:          () => this.http.get<unknown>('/v1/audio/playlist/focused'),
    triggerFocused:      () => this.http.get<void>('/v1/audio/playlist/focused/trigger'),
    triggerFocusedNext:  () => this.http.get<void>('/v1/audio/playlist/focused/next/trigger'),
    triggerFocusedPrev:  () => this.http.get<void>('/v1/audio/playlist/focused/previous/trigger'),
    triggerFocusedItem:  (id: string) => this.http.get<void>(`/v1/audio/playlist/focused/${id}/trigger`),
    focusNext:           () => this.http.get<void>('/v1/audio/playlist/next/focus'),
    focusPrev:           () => this.http.get<void>('/v1/audio/playlist/previous/focus'),
    getPlaylist:         (id: string) => this.http.get<unknown>(`/v1/audio/playlist/${id}`),
    focusPlaylist:       (id: string) => this.http.get<void>(`/v1/audio/playlist/${id}/focus`),
    triggerPlaylist:     (id: string) => this.http.get<void>(`/v1/audio/playlist/${id}/trigger`),
    triggerPlaylistNext: (id: string) => this.http.get<void>(`/v1/audio/playlist/${id}/next/trigger`),
    triggerPlaylistPrev: (id: string) => this.http.get<void>(`/v1/audio/playlist/${id}/previous/trigger`),
    triggerPlaylistItem: (id: string, itemId: string) => this.http.get<void>(`/v1/audio/playlist/${id}/${itemId}/trigger`),
  }

  readonly capture = {
    getStatus:    () => this.http.get<ProCaptureStatus>('/v1/capture/status'),
    getSettings:  () => this.http.get<unknown>('/v1/capture/settings'),
    getEncodings: (type: string) => this.http.get<unknown>(`/v1/capture/encodings/${type}`),
    start:        () => this.http.get<void>('/v1/capture/start'),
    stop:         () => this.http.get<void>('/v1/capture/stop'),
  }

  readonly clearGroups = {
    getAll:     () => this.http.get<unknown>('/v1/clear/groups'),
    create:     (body: unknown) => this.http.post('/v1/clear/groups', body),
    get:        (id: string) => this.http.get<unknown>(`/v1/clear/group/${id}`),
    update:     (id: string, body: unknown) => this.http.put(`/v1/clear/group/${id}`, body),
    remove:     (id: string) => this.http.delete(`/v1/clear/group/${id}`),
    trigger:    (id: string) => this.http.get<void>(`/v1/clear/group/${id}/trigger`),
    getIcon:    (id: string) => this.http.get<unknown>(`/v1/clear/group/${id}/icon`),
    setIcon:    (id: string, body: unknown) => this.http.put(`/v1/clear/group/${id}/icon`, body),
    clearLayer: (layer: string) => this.http.get<void>(`/v1/clear/layer/${layer}`),
  }

  readonly group = {
    getAll: () => this.http.get<unknown>('/v1/groups'),
  }

  readonly library = {
    getAll:       () => this.http.get<unknown>('/v1/libraries'),
    get:          (libraryId: string) => this.http.get<unknown>(`/v1/library/${libraryId}`),
    trigger:      (libraryId: string, presentationId: string) => this.http.get<void>(`/v1/library/${libraryId}/${presentationId}/trigger`),
    triggerIndex: (libraryId: string, presentationId: string, index: number) => this.http.get<void>(`/v1/library/${libraryId}/${presentationId}/${index}/trigger`),
  }

  readonly looks = {
    getAll:     () => this.http.get<unknown>('/v1/looks'),
    create:     (body: unknown) => this.http.post('/v1/looks', body),
    getCurrent: () => this.http.get<unknown>('/v1/look/current'),
    setCurrent: (body: unknown) => this.http.put('/v1/look/current', body),
    get:        (id: string) => this.http.get<unknown>(`/v1/look/${id}`),
    update:     (id: string, body: unknown) => this.http.put(`/v1/look/${id}`, body),
    remove:     (id: string) => this.http.delete(`/v1/look/${id}`),
    trigger:    (id: string) => this.http.get<void>(`/v1/look/${id}/trigger`),
  }

  readonly macro = {
    getAll:           () => this.http.get<unknown>('/v1/macros'),
    get:              (id: string) => this.http.get<unknown>(`/v1/macro/${id}`),
    update:           (id: string, body: unknown) => this.http.put(`/v1/macro/${id}`, body),
    remove:           (id: string) => this.http.delete(`/v1/macro/${id}`),
    trigger:          (id: string) => this.http.get<void>(`/v1/macro/${id}/trigger`),
    getIcon:          (id: string) => this.http.get<unknown>(`/v1/macro/${id}/icon`),
    setIcon:          (id: string, body: unknown) => this.http.put(`/v1/macro/${id}/icon`, body),
    getCollections:   () => this.http.get<unknown>('/v1/macro_collections'),
    createCollection: (body: unknown) => this.http.post('/v1/macro_collections', body),
    getCollection:    (id: string) => this.http.get<unknown>(`/v1/macro_collection/${id}`),
    updateCollection: (id: string, body: unknown) => this.http.put(`/v1/macro_collection/${id}`, body),
    removeCollection: (id: string) => this.http.delete(`/v1/macro_collection/${id}`),
  }

  readonly mask = {
    getAll:       () => this.http.get<unknown>('/v1/masks'),
    get:          (id: string) => this.http.get<unknown>(`/v1/mask/${id}`),
    thumbnailUrl: (id: string) => `${this.baseUrl}/v1/mask/${id}/thumbnail`,
  }

  readonly message = {
    getAll:  () => this.http.get<unknown>('/v1/messages'),
    create:  (body: unknown) => this.http.post('/v1/messages', body),
    get:     (id: string) => this.http.get<unknown>(`/v1/message/${id}`),
    update:  (id: string, body: unknown) => this.http.put(`/v1/message/${id}`, body),
    remove:  (id: string) => this.http.delete(`/v1/message/${id}`),
    trigger: (id: string, body?: unknown) => this.http.post(`/v1/message/${id}/trigger`, body),
    clear:   (id: string) => this.http.get<void>(`/v1/message/${id}/clear`),
  }

  readonly playlist = {
    getAll:              () => this.http.get<unknown>('/v1/playlists'),
    create:              (body: unknown) => this.http.post('/v1/playlists', body),
    getActive:           () => this.http.get<unknown>('/v1/playlist/active'),
    getFocused:          () => this.http.get<unknown>('/v1/playlist/focused'),
    triggerFocused:      () => this.http.get<void>('/v1/playlist/focused/trigger'),
    triggerFocusedNext:  () => this.http.get<void>('/v1/playlist/focused/next/trigger'),
    triggerFocusedPrev:  () => this.http.get<void>('/v1/playlist/focused/previous/trigger'),
    triggerFocusedIndex: (i: number) => this.http.get<void>(`/v1/playlist/focused/${i}/trigger`),
    focusNext:           () => this.http.get<void>('/v1/playlist/next/focus'),
    focusPrev:           () => this.http.get<void>('/v1/playlist/previous/focus'),
    get:                 (id: string) => this.http.get<unknown>(`/v1/playlist/${id}`),
    add:                 (id: string, body: unknown) => this.http.post(`/v1/playlist/${id}`, body),
    update:              (id: string, body: unknown) => this.http.put(`/v1/playlist/${id}`, body),
    focus:               (id: string) => this.http.get<void>(`/v1/playlist/${id}/focus`),
    trigger:             (id: string) => this.http.get<void>(`/v1/playlist/${id}/trigger`),
    triggerNext:         (id: string) => this.http.get<void>(`/v1/playlist/${id}/next/trigger`),
    triggerPrev:         (id: string) => this.http.get<void>(`/v1/playlist/${id}/previous/trigger`),
    triggerIndex:        (id: string, i: number) => this.http.get<void>(`/v1/playlist/${id}/${i}/trigger`),
    thumbnailUrl:        (id: string, index: number, cueIndex: number) => `${this.baseUrl}/v1/playlist/${id}/${index}/thumbnail/${cueIndex}`,
  }

  readonly prop = {
    getAll:           () => this.http.get<unknown>('/v1/props'),
    get:              (id: string) => this.http.get<unknown>(`/v1/prop/${id}`),
    update:           (id: string, body: unknown) => this.http.put(`/v1/prop/${id}`, body),
    remove:           (id: string) => this.http.delete(`/v1/prop/${id}`),
    trigger:          (id: string) => this.http.get<void>(`/v1/prop/${id}/trigger`),
    clear:            (id: string) => this.http.get<void>(`/v1/prop/${id}/clear`),
    pauseAutoClear:   (id: string) => this.http.get<void>(`/v1/prop/${id}/auto_clear/pause`),
    resumeAutoClear:  (id: string) => this.http.get<void>(`/v1/prop/${id}/auto_clear/resume`),
    thumbnailUrl:     (id: string) => `${this.baseUrl}/v1/prop/${id}/thumbnail`,
    getCollections:   () => this.http.get<unknown>('/v1/prop_collections'),
    createCollection: (body: unknown) => this.http.post('/v1/prop_collections', body),
    getCollection:    (id: string) => this.http.get<unknown>(`/v1/prop_collection/${id}`),
    updateCollection: (id: string, body: unknown) => this.http.put(`/v1/prop_collection/${id}`, body),
    removeCollection: (id: string) => this.http.delete(`/v1/prop_collection/${id}`),
  }

  readonly stage = {
    getMessage:           () => this.http.get<ProStageMessage>('/v1/stage/message'),
    setMessage:           (msg: string) => this.http.put('/v1/stage/message', msg),
    clearMessage:         () => this.http.delete('/v1/stage/message'),
    getScreens:           () => this.http.get<unknown>('/v1/stage/screens'),
    getScreenLayout:      (id: string) => this.http.get<unknown>(`/v1/stage/screen/${id}/layout`),
    setScreenLayout:      (id: string, layoutId: string) => this.http.get<void>(`/v1/stage/screen/${id}/layout/${layoutId}`),
    getLayouts:           () => this.http.get<unknown>('/v1/stage/layouts'),
    removeLayout:         (id: string) => this.http.delete(`/v1/stage/layout/${id}`),
    layoutThumbnailUrl:   (id: string) => `${this.baseUrl}/v1/stage/layout/${id}/thumbnail`,
    getLayoutMap:         () => this.http.get<unknown>('/v1/stage/layout_map'),
    setLayoutMap:         (body: unknown) => this.http.put('/v1/stage/layout_map', body),
  }

  readonly screens = {
    getAudience: () => this.http.get<unknown>('/v1/status/audience_screens'),
    setAudience: (enabled: boolean) => this.http.put('/v1/status/audience_screens', enabled),
    getStage:    () => this.http.get<unknown>('/v1/status/stage_screens'),
    setStage:    (enabled: boolean) => this.http.put('/v1/status/stage_screens', enabled),
    getLayers:   () => this.http.get<ProLayerStatus>('/v1/status/layers'),
    getAll:      () => this.http.get<unknown>('/v1/status/screens'),
  }

  readonly theme = {
    getAll:           () => this.http.get<unknown>('/v1/themes'),
    get:              (id: string) => this.http.get<unknown>(`/v1/theme/${id}`),
    getSlide:         (id: string, slide: string) => this.http.get<unknown>(`/v1/theme/${id}/slides/${slide}`),
    updateSlide:      (id: string, slide: string, body: unknown) => this.http.put(`/v1/theme/${id}/slides/${slide}`, body),
    slideThumbnailUrl:(id: string, slide: string) => `${this.baseUrl}/v1/theme/${id}/slides/${slide}/thumbnail`,
  }

  readonly timers = {
    getCurrent:        () => this.http.get<ProTimerCurrent>('/v1/timers/current'),
    startAll:          () => this.http.get<void>('/v1/timers/start'),
    stopAll:           () => this.http.get<void>('/v1/timers/stop'),
    resetAll:          () => this.http.get<void>('/v1/timers/reset'),
    getAll:            () => this.http.get<unknown>('/v1/timers'),
    create:            (body: unknown) => this.http.post('/v1/timers', body),
    get:               (id: string) => this.http.get<unknown>(`/v1/timer/${id}`),
    update:            (id: string, body: unknown) => this.http.put(`/v1/timer/${id}`, body),
    remove:            (id: string) => this.http.delete(`/v1/timer/${id}`),
    control:           (id: string, op: 'start' | 'stop' | 'reset') => this.http.get<void>(`/v1/timer/${id}/${op}`),
    increment:         (id: string, time: number) => this.http.get<void>(`/v1/timer/${id}/increment/${time}`),
    getSystemTime:     () => this.http.get<unknown>('/v1/timer/system_time'),
    getVideoCountdown: () => this.http.get<unknown>('/v1/timer/video_countdown'),
  }

  readonly transport = {
    getCurrent:       (layer: string) => this.http.get<unknown>(`/v1/transport/${layer}/current`),
    play:             (layer: string) => this.http.get<void>(`/v1/transport/${layer}/play`),
    pause:            (layer: string) => this.http.get<void>(`/v1/transport/${layer}/pause`),
    getTime:          (layer: string) => this.http.get<unknown>(`/v1/transport/${layer}/time`),
    setTime:          (layer: string, body: unknown) => this.http.put(`/v1/transport/${layer}/time`, body),
    goToEnd:          (layer: string) => this.http.get<void>(`/v1/transport/${layer}/go_to_end`),
    skipForward:      (layer: string, time: number) => this.http.get<void>(`/v1/transport/${layer}/skip_forward/${time}`),
    skipBackward:     (layer: string, time: number) => this.http.get<void>(`/v1/transport/${layer}/skip_backward/${time}`),
    getAutoAdvance:   (layer: string) => this.http.get<unknown>(`/v1/transport/${layer}/auto_advance`),
    setAutoAdvance:   (layer: string, body: unknown) => this.http.put(`/v1/transport/${layer}/auto_advance`, body),
    clearAutoAdvance: (layer: string) => this.http.delete(`/v1/transport/${layer}/auto_advance`),
  }

  readonly videoInput = {
    getAll:  () => this.http.get<unknown>('/v1/video_inputs'),
    trigger: (id: string) => this.http.get<void>(`/v1/video_inputs/${id}/trigger`),
  }

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

  getVersion() {
    return this.http.get<ProVersionInfo>('/version')
  }

  findMyMouse() {
    return this.http.get<void>('/v1/find_my_mouse')
  }
}

export function createProPresenter(host: string, port = 1025) {
  return new ProPresenter(host, port)
}
