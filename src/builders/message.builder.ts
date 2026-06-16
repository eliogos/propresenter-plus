import type { ProId } from '../types/base'

export interface MessageTokenData {
  name:         string
  text:         string
  is_required?: boolean
}

export interface MessageData {
  id?:    ProId
  name:   string
  tokens: MessageTokenData[]
}

export class MessageBuilder {
  private d: Partial<MessageData> & { tokens: MessageTokenData[] }

  constructor(data?: Partial<MessageData>) {
    this.d = { tokens: [], ...data }
  }

  setId(v: ProId)   { this.d.id = v; return this }
  setName(v: string){ this.d.name = v; return this }

  addToken(name: string, text = '', required = false) {
    this.d.tokens.push({ name, text, is_required: required })
    return this
  }

  toJSON(): MessageData {
    if (!this.d.name) throw new Error('MessageBuilder: name required')
    return this.d as MessageData
  }
}

export interface MessageTriggerData {
  tokens: MessageTokenData[]
}

export class MessageTriggerBuilder {
  private tokens: MessageTokenData[] = []

  constructor(data?: MessageTriggerData) {
    if (data) this.tokens = [...data.tokens]
  }

  set(name: string, text: string) {
    const existing = this.tokens.find(t => t.name === name)
    if (existing) existing.text = text
    else this.tokens.push({ name, text })
    return this
  }

  toJSON(): MessageTriggerData {
    return { tokens: this.tokens }
  }
}
