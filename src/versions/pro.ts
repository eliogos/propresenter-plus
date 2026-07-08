import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type {
  ProStyle,
  ProGroupInput,
  ProSlideBinary,
  ProGroupBinary,
  PresentationMeta,
  BuildOptions
} from '../types/pro.js'

// Sometimes libraries will be placed inside the OneDrive root for some reason
function findOneDriveRoot(docsPath: string): string | null {
  try {
    for (const entry of readdirSync(docsPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (entry.name.toLowerCase().includes('onedrive')) return join(docsPath, entry.name)
      const sub = join(docsPath, entry.name)
      try {
        for (const sub2 of readdirSync(sub, { withFileTypes: true })) {
          if (sub2.isDirectory() && sub2.name.toLowerCase().includes('onedrive')) {
            return join(sub, sub2.name)
          }
        }
      } catch {}
    }
  } catch {}
  return null
}

function getLibrariesDir(): string {
  const docs = join(homedir(), 'Documents')
  const onedrive = findOneDriveRoot(docs)
  return join(onedrive ?? docs, 'Documents', 'ProPresenter', 'Libraries')
}

export const LIBRARIES_DIR   = getLibrariesDir()
export const DEFAULT_LIBRARY = join(LIBRARIES_DIR, 'Default')

const h = (hex: string) => Buffer.from(hex, 'hex')
const B_pos      = h('0a120900000000000074401100000000008066401212090000000000009e40110000000000e09040')
const B_layout   = h('080112060a0012001a0012210a0909000000000000f03f120909000000000000f03f1a0909000000000000f03f123c0a1209000000000000f03f11000000000000f03f121209000000000000f03f11000000000000f03f1a1209000000000000f03f11000000000000f03f12210a0911000000000000f03f120911000000000000f03f1a0911000000000000f03f1a020801')
const B_stroke   = h('0a140df1f0f03d159190103f1d0000803f250000803f')
const B_bounds   = h('1100000000000008401a140d0000803f150000803f1d0000803f250000803f')
const B_trans    = h('110000000000b073401900000000000014402100000000000014402a05250000803f31000000000000e83f')
const B_corner   = h('119a9999999999a93f')
const B_trange   = h('0a220a07417269616c4d54110000000000c050404a05417269616c5207526567756c61721a140d0000803f150000803f1d0000803f250000803f320d080229000000000000f03f6a0062140d0000803f150000803f1d0000803f250000803f')
const B_tstyle   = h('110000000000b073401900000000000014402100000000000014402a05250000803f31000000000000e83f')
const B_bullet   = h('2020e280a22020')
const B_oextra   = h('11000000000000e03f180121abaaaaaaaaaaaa3f')
const B_scale    = h('250000803f')
const B_origin   = h('09000000000000a440110000000000809640')
const B_style    = h('0a88047b5c727466305c616e73695c616e7369637067313235327b5c666f6e7474626c5c66305c666e696c20417269616c4d543b7d7b5c636f6c6f7274626c3b5c726564305c677265656e305c626c7565303b5c7265643235355c677265656e3235355c626c75653235353b5c7265643235355c677265656e3235355c626c75653235353b7d7b5c2a5c657870616e646564636f6c6f7274626c3b5c637367656e657269637267625c63305c63305c63305c633130303030303b5c637367656e657269637267625c633130303030305c633130303030305c633130303030305c633130303030303b5c637367656e657269637267625c633130303030305c633130303030305c633130303030305c63303b7d7b5c2a5c6l6973747461626c657d7b5c2a5c6l6973746f766572726964657461626c657d5c7563315c70617065727731323234305c6d6172676l305c6d61726772305c6d61726774305c6d6172676b305c706172645c6l69305c6669305c7269305c716l5c7362305c7361305c736l24305c736l6d756c74315c736l6c656164696e67305c66305c62305c69305c756c305c737472696b65305c66733130305c6578706n64305c6578706n647477305c436f636f614c69676174757265315c6366315c7374726f6b657769647468305c7374726f6b6563325c6n6f73757065727375625c756c63305c686967686l69676874335c6362337d124e0a220a07417269616c4d541100000000000049404a05417269616c5207526567756c61721a05250000803f320b29000000000000f03f6a0062140d0000803f150000803f1d0000803f250000803f')

function encVarint(n: number): Buffer {
  const b: number[] = []
  do { let byte = n & 0x7f; n >>>= 7; if (n) byte |= 0x80; b.push(byte) } while (n)
  return Buffer.from(b)
}
function fBytes(field: number, data: Buffer): Buffer {
  return Buffer.concat([encVarint((field << 3) | 2), encVarint(data.length), data])
}
function fVarint(field: number, n: number): Buffer {
  return Buffer.concat([encVarint((field << 3) | 0), encVarint(n)])
}
function fDouble(field: number, v: number): Buffer {
  const b = Buffer.alloc(8); b.writeDoubleLE(v, 0)
  return Buffer.concat([encVarint((field << 3) | 1), b])
}
function fString(field: number, s: string): Buffer { return fBytes(field, Buffer.from(s, 'utf8')) }
function uuidField(field: number, u: string): Buffer { return fBytes(field, fString(1, u)) }

function escapeRtf(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/[^\x00-\x7F]/g, c => `\\u${c.charCodeAt(0)}?`)
}

export function buildRtf(text: string, style: ProStyle = {}): Buffer {
  const { font = 'ArialMT', size = 67, color = [255, 255, 255], align = 'center', width = 1920 } = style
  const [r, g, b] = color
  const fs = size * 2
  const paperw = width * 20
  const toCs = (c: number) => Math.round(c / 255 * 100000)
  const alignStr = ({ left: 'ql', center: 'qc', right: 'qr' } as const)[align] ?? 'qc'
  const para = `\\pard\\li0\\fi0\\ri0\\${alignStr}\\sb0\\sa0\\sl240\\slmult1\\slleading0\\f0\\b0\\i0\\ul0\\strike0\\fs${fs}\\expnd0\\expndtw0\\CocoaLigature1\\cf1\\strokewidth0\\strokec1\\nosupersub\\ulc0\\highlight2\\cb2`
  const lines = text.split('\n')
  const body = lines.map(l => `${para} ${escapeRtf(l)}`).join('\\par') + `\\par${para}`
  return Buffer.from(
    `{\\rtf0\\ansi\\ansicpg1252` +
    `{\\fonttbl\\f0\\fnil ${font};}` +
    `{\\colortbl;\\red${r}\\green${g}\\blue${b};\\red255\\green255\\blue255;}` +
    `{\\*\\expandedcolortbl;\\csgenericrgb\\c${toCs(r)}\\c${toCs(g)}\\c${toCs(b)}\\c100000;\\csgenericrgb\\c100000\\c100000\\c100000\\c0;}` +
    `{\\*\\listtable}{\\*\\listoverridetable}` +
    `\\uc1\\paperw${paperw}\\margl0\\margr0\\margt0\\margb0` +
    body + `}`,
    'utf8',
  )
}

export function splitSlides(text: string, opts: { delimiter?: string; linesPerSlide?: number } = {}): string[] {
  const { delimiter = '\n\n', linesPerSlide } = opts
  const sections = text.split(delimiter).map(s => s.trim()).filter(Boolean)

  if (!linesPerSlide) return sections

  const slides: string[] = []

  for (const section of sections) {
    const lines = section.split('\n').filter(l => l.trim())
    if (lines.length <= 1) {
      const last = slides[slides.length - 1]
      if (last !== undefined && last.split('\n').length < linesPerSlide) {
        slides[slides.length - 1] = last + '\n' + lines.join('\n')
      } else {
        slides.push(lines.join('\n'))
      }
    } else {
      for (let i = 0; i < lines.length; i += linesPerSlide) {
        const chunk = lines.slice(i, i + linesPerSlide).join('\n')
        if (chunk.trim()) slides.push(chunk)
      }
    }
  }

  return slides.filter(Boolean)
}

function buildSlide(slideUUID: string, rtfBytes: Buffer): Buffer {
  const elemUUID  = randomUUID()
  const innerUUID = randomUUID()
  const bUUID     = randomUUID()
  const ZERO      = '00000000-0000-0000-0000-000000000000'

  const textContent = Buffer.concat([
    fBytes(3, B_trange),
    fBytes(4, B_tstyle),
    fBytes(5, rtfBytes),
    fVarint(6, 1),
    fBytes(8, Buffer.alloc(0)),
    fVarint(9, 1),
    fBytes(11, B_bullet),
    fBytes(12, Buffer.alloc(0)),
  ])

  const innerBody = Buffer.concat([
    uuidField(1, innerUUID),
    fBytes(3, B_pos),
    fDouble(5, 1.0),
    fBytes(8, B_layout),
    fBytes(9, B_stroke),
    fBytes(10, B_bounds),
    fBytes(11, B_trans),
    fBytes(12, B_corner),
    fBytes(13, textContent),
    fBytes(14, Buffer.alloc(0)),
  ])

  const level2 = Buffer.concat([
    fBytes(1, innerBody),
    fVarint(4, 3),
    fBytes(9, B_oextra),
  ])

  const textElem = Buffer.concat([
    fBytes(1, level2),
    fBytes(5, B_scale),
    fBytes(6, B_origin),
    uuidField(7, bUUID),
  ])

  const elemContent = Buffer.concat([
    fBytes(1, textElem),
    fBytes(2, B_style),
    fBytes(4, Buffer.alloc(0)),
  ])

  const elementData = Buffer.concat([
    uuidField(1, elemUUID),
    fVarint(6, 1),
    fVarint(9, 11),
    fBytes(23, fBytes(2, elemContent)),
  ])

  return Buffer.concat([
    uuidField(1, slideUUID),
    uuidField(4, ZERO),
    fVarint(5, 1),
    uuidField(6, ZERO),
    fBytes(7, Buffer.alloc(0)),
    fBytes(10, elementData),
    fVarint(12, 1),
  ])
}

export function build(opts: BuildOptions): { binary: Buffer; meta: Omit<PresentationMeta, 'filePath'> } {
  const presUUID = opts.presUUID ?? randomUUID()
  const arrUUID  = randomUUID()
  const now      = Math.floor(Date.now() / 1000)
  const ts       = fVarint(1, now)

  const canvasF4 = Buffer.concat([
    encVarint((4 << 3) | 5),
    (() => { const b = Buffer.alloc(4); b.writeFloatLE(1.0, 0); return b })(),
  ])

  const groups: ProGroupBinary[] = opts.groups.map(g => ({
    uuid:            randomUUID(),
    arrangementUUID: randomUUID(),
    name:            g.name,
    slides:          g.slides.map(s => ({ uuid: randomUUID(), text: s.text })),
  }))

  const parts: Buffer[] = [
    uuidField(1, randomUUID()),
    uuidField(2, presUUID),
    fString(3, opts.title),
    fBytes(4, ts),
    fBytes(5, ts),
    fBytes(8, fBytes(1, canvasF4)),
    uuidField(10, arrUUID),
  ]

  for (const g of groups) {
    const groupMsg = Buffer.concat([
      fBytes(1, Buffer.concat([
        uuidField(1, g.uuid),
        fString(2, g.name),
        uuidField(5, g.arrangementUUID),
        fString(6, g.name),
      ])),
      ...g.slides.map(s => uuidField(2, s.uuid)),
    ])
    parts.push(fBytes(12, groupMsg))
  }

  for (const g of groups) {
    for (const s of g.slides) {
      const rtf = buildRtf(s.text, {
        ...(opts.style ?? {}),
        width: opts.width ?? 1920
      })
      parts.push(fBytes(13, buildSlide(s.uuid, rtf)))
    }
  }

  parts.push(fBytes(14, Buffer.alloc(0)))
  parts.push(fBytes(17, fDouble(5, 300.0)))

  const filename = opts.title.replace(/[^a-z0-9]/gi, '_') + '.pro'
  const meta: Omit<PresentationMeta, 'filePath'> = {
    uuid:      presUUID,
    title:     opts.title,
    filename,
    groups,
    createdAt: new Date().toISOString(),
    ...(opts.width            != null && { width:            opts.width }),
    ...(opts.height           != null && { height:           opts.height }),
    ...(opts.artist           != null && { artist:           opts.artist }),
    ...(opts.author           != null && { author:           opts.author }),
    ...(opts.publisher        != null && { publisher:        opts.publisher }),
    ...(opts.CCLI             != null && { CCLI:             opts.CCLI }),
    ...(opts.displayCopyright != null && { displayCopyright: opts.displayCopyright }),
    ...(opts.copyrightYear    != null && { copyrightYear:    opts.copyrightYear }),
  }

  return { binary: Buffer.concat(parts), meta }
}

function readPresentationUUID(filePath: string): string | null {
  try {
    const raw = readFileSync(filePath)
    const p = 40
    if (raw[p] !== 0x12) return null
    const uuidStart = p + 4
    return raw.slice(uuidStart, uuidStart + 36).toString('ascii')
  } catch { return null }
}

export function write(libraryPath: string, _title: string, opts: BuildOptions): PresentationMeta {
  const { binary, meta } = build(opts)
  const filePath = join(libraryPath, meta.filename)
  writeFileSync(filePath, binary)
  return { ...meta, filePath }
}

export function findByName(libraryPath: string, name: string): string | null {
  const filename = name.endsWith('.pro') ? name : name.replace(/[^a-z0-9]/gi, '_') + '.pro'
  const filePath = join(libraryPath, filename)
  try { readFileSync(filePath); return filePath } catch { return null }
}

export function findByUUID(libraryPath: string, uuid: string): string | null {
  try {
    for (const file of readdirSync(libraryPath)) {
      if (!file.endsWith('.pro')) continue
      const filePath = join(libraryPath, file)
      if (readPresentationUUID(filePath) === uuid) return filePath
    }
  } catch {}
  return null
}

export function update(libraryPath: string, identifier: string, opts: BuildOptions): PresentationMeta {
  const isUUID = /^[0-9a-f-]{36}$/i.test(identifier)
  const existing = isUUID
    ? findByUUID(libraryPath, identifier)
    : findByName(libraryPath, identifier)

  const presUUID = existing ? (readPresentationUUID(existing) ?? undefined) : undefined
  if (existing) unlinkSync(existing)

  return write(libraryPath, opts.title, {
    ...opts,
    ...(presUUID ? { presUUID } : {})
  })
}
