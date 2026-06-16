export interface ProFileStyle {
  font?:  string
  size?:  number
  align?: 'left' | 'center' | 'right'
}

export interface ProFileGroupInput {
  name:    string
  text?:   string
  texts?:  string[]
  slides?: Array<{ text: string }>
}

export interface PresentationRequestBody {
  title:              string
  groups:             ProFileGroupInput[]
  style?:             ProFileStyle
  artist?:            string
  author?:            string
  publisher?:         string
  CCLI?:              string
  displayCopyright?:  boolean
  copyrightYear?:     string
}

export interface ProFilePresentationSlide {
  uuid: string
  text: string
}

export interface ProFilePresentationGroup {
  uuid:            string
  arrangementUUID: string
  name:            string
  slides:          ProFilePresentationSlide[]
}

export interface ProFilePresentationMeta {
  uuid:               string
  title:              string
  filename:           string
  filePath:           string
  groups:             ProFilePresentationGroup[]
  createdAt:          string
  width?:             number
  height?:            number
  artist?:            string
  author?:            string
  publisher?:         string
  CCLI?:              string
  displayCopyright?:  boolean
  copyrightYear?:     string
  playlist?:          string
  theme?:             string
}

type QueryOpts = {
  path?:      string
  library?:   string
  playlist?:  string
  theme?:     string
  size?:      string
  delimiter?: string
  maxLines?:  number
}

export class PresentationBuilder {
  private title  = ''
  private groups: ProFileGroupInput[] = []
  private style: ProFileStyle = {}
  private meta: Omit<PresentationRequestBody, 'title' | 'groups' | 'style'> = {}
  private baseUrl = 'http://localhost:5173'

  setTitle(v: string)                { this.title = v; return this }
  setBaseUrl(v: string)              { this.baseUrl = v.replace(/\/$/, ''); return this }
  setStyle(v: ProFileStyle)          { this.style = { ...this.style, ...v }; return this }
  setArtist(v: string)               { this.meta.artist = v; return this }
  setAuthor(v: string)               { this.meta.author = v; return this }
  setPublisher(v: string)            { this.meta.publisher = v; return this }
  setCCLI(v: string)                 { this.meta.CCLI = v; return this }
  setDisplayCopyright(v: boolean)    { this.meta.displayCopyright = v; return this }
  setCopyrightYear(v: string)        { this.meta.copyrightYear = v; return this }

  addGroup(name: string, text: string): this
  addGroup(name: string, slides: Array<{ text: string }>): this
  addGroup(name: string, content: string | Array<{ text: string }>) {
    if (typeof content === 'string') this.groups.push({ name, text: content })
    else                             this.groups.push({ name, slides: content })
    return this
  }

  body(): PresentationRequestBody {
    if (!this.title) throw new Error('PresentationBuilder: title required')
    if (!this.groups.length) throw new Error('PresentationBuilder: at least one group required')
    return { title: this.title, groups: this.groups, style: this.style, ...this.meta }
  }

  async create(opts: QueryOpts = {}): Promise<ProFilePresentationMeta> {
    const url = this.buildUrl('/api/presentations', opts)
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.body()) })
    if (!res.ok) throw new Error(`POST /api/presentations → ${res.status}: ${await res.text()}`)
    return res.json() as Promise<ProFilePresentationMeta>
  }

  async update(identifier: string, opts: QueryOpts = {}): Promise<ProFilePresentationMeta> {
    const url = this.buildUrl(`/api/presentations/${encodeURIComponent(identifier)}`, opts)
    const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.body()) })
    if (!res.ok) throw new Error(`PATCH /api/presentations → ${res.status}: ${await res.text()}`)
    return res.json() as Promise<ProFilePresentationMeta>
  }

  private buildUrl(path: string, opts: QueryOpts) {
    const u = new URL(this.baseUrl + path)
    if (opts.path)      u.searchParams.set('path',      opts.path)
    if (opts.library)   u.searchParams.set('library',   opts.library)
    if (opts.playlist)  u.searchParams.set('playlist',  opts.playlist)
    if (opts.theme)     u.searchParams.set('theme',     opts.theme)
    if (opts.size)      u.searchParams.set('size',      opts.size)
    if (opts.delimiter) u.searchParams.set('delimiter', opts.delimiter)
    if (opts.maxLines)  u.searchParams.set('maxLines',  String(opts.maxLines))
    return u.toString()
  }
}
