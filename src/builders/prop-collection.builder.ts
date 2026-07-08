import type { ProId } from '../types/base.js'

export interface PropCollectionData {
  id?:   ProId
  name:  string
  props: ProId[]
}

export class PropCollectionBuilder {
  private d: Partial<PropCollectionData> & { props: ProId[] }

  constructor(data?: Partial<PropCollectionData>) {
    this.d = { props: [], ...data }
  }

  setId(v: ProId)   { this.d.id = v; return this }
  setName(v: string){ this.d.name = v; return this }
  addProp(v: ProId) { this.d.props.push(v); return this }

  toJSON(): PropCollectionData {
    if (!this.d.name) throw new Error('PropCollectionBuilder: name required')
    return this.d as PropCollectionData
  }
}
