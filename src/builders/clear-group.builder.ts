import type { ProId, ClearLayer } from '../types/base'

export interface ClearGroupData {
  id?:    ProId
  name:   string
  layers: ClearLayer[]
  icon?:  string
}

export class ClearGroupBuilder {
  private d: Partial<ClearGroupData> & { layers: ClearLayer[] }

  constructor(data?: Partial<ClearGroupData>) {
    this.d = { layers: [], ...data }
  }

  setId(v: ProId)            { this.d.id = v; return this }
  setName(v: string)         { this.d.name = v; return this }
  setIcon(v: string)         { this.d.icon = v; return this }
  addLayer(v: ClearLayer)    { if (!this.d.layers.includes(v)) this.d.layers.push(v); return this }
  setLayers(v: ClearLayer[]) { this.d.layers = [...v]; return this }
  removeLayer(v: ClearLayer) { this.d.layers = this.d.layers.filter(l => l !== v); return this }

  toJSON(): ClearGroupData {
    if (!this.d.name) throw new Error('ClearGroupBuilder: name required')
    return this.d as ClearGroupData
  }
}
