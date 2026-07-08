import type { ProId, PlaylistType } from '../types/base.js'

export interface PlaylistItemData {
  id?:       ProId
  type?:     string
  location?: string
}

export class PlaylistItemBuilder {
  private d: PlaylistItemData

  constructor(data?: PlaylistItemData) {
    this.d = { ...data }
  }

  setId(v: ProId)        { this.d.id = v; return this }
  setType(v: string)     { this.d.type = v; return this }
  setLocation(v: string) { this.d.location = v; return this }

  toJSON(): PlaylistItemData { return { ...this.d } }
}

export interface PlaylistData {
  id?:   ProId
  name:  string
  type:  PlaylistType
  items: PlaylistItemData[]
}

export class PlaylistBuilder {
  private d: Partial<PlaylistData> & { items: PlaylistItemData[] }

  constructor(data?: Partial<PlaylistData>) {
    this.d = { type: 'presentation', items: [], ...data }
  }

  setId(v: ProId)         { this.d.id = v; return this }
  setName(v: string)      { this.d.name = v; return this }
  setType(v: PlaylistType){ this.d.type = v; return this }

  addItem(item: PlaylistItemData | PlaylistItemBuilder) {
    this.d.items.push(item instanceof PlaylistItemBuilder ? item.toJSON() : item)
    return this
  }

  toJSON(): PlaylistData {
    if (!this.d.name) throw new Error('PlaylistBuilder: name required')
    return this.d as PlaylistData
  }
}
