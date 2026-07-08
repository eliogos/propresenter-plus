import type { ProId } from '../types/base.js'

export interface MacroCollectionData {
  id?:    ProId
  name:   string
  macros: ProId[]
}

export class MacroCollectionBuilder {
  private d: Partial<MacroCollectionData> & { macros: ProId[] }

  constructor(data?: Partial<MacroCollectionData>) {
    this.d = { macros: [], ...data }
  }

  setId(v: ProId)    { this.d.id = v; return this }
  setName(v: string) { this.d.name = v; return this }
  addMacro(v: ProId) { this.d.macros.push(v); return this }

  toJSON(): MacroCollectionData {
    if (!this.d.name) throw new Error('MacroCollectionBuilder: name required')
    return this.d as MacroCollectionData
  }
}
