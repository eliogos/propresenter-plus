import type { ProId, TimerType, TimerEndAction } from '../types/base'

export interface TimerData {
  id?:             ProId
  name:            string
  type:            TimerType
  duration:        number
  loop:            boolean
  allows_overrun:  boolean
  end_action:      TimerEndAction
}

export class TimerBuilder {
  private d: Partial<TimerData>

  constructor(data?: Partial<TimerData>) {
    this.d = { loop: false, allows_overrun: false, end_action: 'none', ...data }
  }

  setId(v: ProId)                { this.d.id = v; return this }
  setName(v: string)             { this.d.name = v; return this }
  setType(v: TimerType)          { this.d.type = v; return this }
  setDuration(seconds: number)   { this.d.duration = seconds; return this }
  setLoop(v = true)              { this.d.loop = v; return this }
  setAllowsOverrun(v = true)     { this.d.allows_overrun = v; return this }
  setEndAction(v: TimerEndAction){ this.d.end_action = v; return this }

  toJSON(): TimerData {
    if (!this.d.name)                  throw new Error('TimerBuilder: name required')
    if (!this.d.type)                  throw new Error('TimerBuilder: type required')
    if (this.d.duration === undefined) throw new Error('TimerBuilder: duration required')
    return this.d as TimerData
  }
}
