import type { ProId, LookLayerType } from '../types/base.js'

export interface LookLayerData {
  type:       LookLayerType
  is_enabled: boolean
  opacity:    number
}

export class LookLayerBuilder {
  private d: LookLayerData

  constructor(type: LookLayerType, data?: Partial<LookLayerData>) {
    this.d = { type, is_enabled: true, opacity: 1, ...data }
  }

  setEnabled(v = true)  { this.d.is_enabled = v; return this }
  setOpacity(v: number) { this.d.opacity = Math.max(0, Math.min(1, v)); return this }

  toJSON(): LookLayerData { return { ...this.d } }
}

export interface LookData {
  id?:    ProId
  name:   string
  layers: LookLayerData[]
}

export class LookBuilder {
  private d: Partial<LookData> & { layers: LookLayerData[] }

  constructor(data?: Partial<LookData>) {
    this.d = { layers: [], ...data }
  }

  setId(v: ProId)   { this.d.id = v; return this }
  setName(v: string){ this.d.name = v; return this }

  addLayer(layer: LookLayerData | LookLayerBuilder) {
    this.d.layers.push(layer instanceof LookLayerBuilder ? layer.toJSON() : layer)
    return this
  }

  setLayers(layers: (LookLayerData | LookLayerBuilder)[]) {
    this.d.layers = layers.map(l => l instanceof LookLayerBuilder ? l.toJSON() : l)
    return this
  }

  toJSON(): LookData {
    if (!this.d.name) throw new Error('LookBuilder: name required')
    return this.d as LookData
  }
}
