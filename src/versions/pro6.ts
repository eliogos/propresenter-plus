import type { Pro6Options, Pro6TextStyle } from '../types/pro6'

function uuid() {
  return crypto.randomUUID()
}

function isoNow() {
  return new Date().toISOString()
}

function rgba(c: [number, number, number, number]) {
  return c.join(' ')
}

const ALIGN_RTF = { left: 'ql', center: 'qc', right: 'qr' } as const

function escapeRtf(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\n/g, '\\line ')
    .replace(/[^\x00-\x7F]/g, c => `\\u${c.charCodeAt(0)}?`)
}

function buildRtf(text: string, style: Required<Pro6TextStyle>): string {
  const [r, g, b] = style.color
  const fs = style.size * 2
  const align = ALIGN_RTF[style.align]
  return (
    `{\\rtf1\\ansi\\ansicpg1252\\cocoartf1504\n` +
    `{\\fonttbl\\f0\\fswiss\\fcharset0 ${style.font};}\n` +
    `{\\colortbl;\\red255\\green255\\blue255;\\red${r}\\green${g}\\blue${b};}\n` +
    `\\viewkind4\\uc1\\pard\\tx720\\tx1440\\tx2160\\tx2880\\tx3600\\tx4320\\tx5040\\tx5760\\tx6480\\tx7200\\tx7920\\tx8640\\pardirnatural\\${align}\\partightenfactor0\n` +
    `\\f0\\fs${fs} \\cf2 ${escapeRtf(text)}}`
  )
}

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach(b => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

function attr(obj: Record<string, string | number>): string {
  return Object.entries(obj).map(([k, v]) => `${k}="${v}"`).join(' ')
}

export function generatePro6(options: Pro6Options): string {
  const w = options.width  ?? 1920
  const h = options.height ?? 1080
  const pad = 40
  const style: Required<Pro6TextStyle> = {
    font:  options.style?.font  ?? 'ArialMT',
    size:  options.style?.size  ?? 48,
    color: options.style?.color ?? [255, 255, 255],
    align: options.style?.align ?? 'center',
  }
  const now = isoNow()
  const bg  = '0 0 0 1'

  const lines: string[] = []

  lines.push('<?xml version="1.0" encoding="utf-8"?>')
  lines.push(`<RVPresentationDocument ${attr({
    height: h, width: w, versionNumber: 600, docType: 0,
    creatorCode: 1349676880, lastDateUsed: now, usedCount: 0,
    category: 'Song', resourcesDirectory: '',
    backgroundColor: bg, drawingBackgroundColor: bg,
    notes: '', artist: options.artist ?? '', author: options.author ?? '',
    album: '', CCLIDisplay: 0, CCLIArtist: '', CCLISongTitle: '',
    CCLIYear: '', publisher: '', copyrightYear: '', os: 1,
  })}>`)
  lines.push(`  <aaUUID>${uuid()}</aaUUID>`)
  lines.push('  <mimes></mimes>')
  lines.push('  <groups>')

  for (const group of options.groups) {
    const groupColor = group.color ?? [0, 0, 1, 1]
    lines.push(`    <RVSlideGrouping name="${group.name}" uuid="${uuid()}" color="${rgba(groupColor)}">`)
    lines.push('      <slides>')

    group.slides.forEach((slide, i) => {
      const slideBg = slide.backgroundColor ?? [0, 0, 0, 1]
      const rtf = buildRtf(slide.text, style)
      const b64 = toBase64(rtf)

      lines.push(`        <RVDisplaySlide ${attr({
        backgroundColor: rgba(slideBg),
        enabled: 1, highlightColor: '0 0 0 0',
        hotKey: '', label: slide.label ?? '', notes: slide.notes ?? '',
        slideType: 1, sort_index: i + 1,
        UUID: uuid(), drawingBackgroundColor: rgba(slideBg), chordChartPath: '',
      })}>`)
      lines.push('          <displayElements>')
      lines.push(`            <RVTextElement ${attr({
        displayDelay: 0, displayName: 'Default', locked: 0, persistent: 0,
        typeID: 0, typography: 0, UUID: uuid(), fromTemplate: 0,
        bezelRadius: 0, drawingFill: 0, drawingShadow: 0, drawingStroke: 0,
        fill_color: '0 0 0 0', rotation: 0, source: '', type: 0,
        useFlowConstraint: 0, flowConstraint: 0,
      })}>`)
      lines.push(`              <RVRect3D>{${pad}, ${pad}, 0, ${w - pad * 2}, ${h - pad * 2}}</RVRect3D>`)
      lines.push('              <shadowOffset>{2, -2}</shadowOffset>')
      lines.push('              <stroke width="0"/>')
      lines.push(`              <NSString rvXMLIvarName="RTFData">${b64}</NSString>`)
      lines.push('            </RVTextElement>')
      lines.push('          </displayElements>')
      lines.push('        </RVDisplaySlide>')
    })

    lines.push('      </slides>')
    lines.push('    </RVSlideGrouping>')
  }

  lines.push('  </groups>')
  lines.push('  <arrangements/>')
  lines.push('</RVPresentationDocument>')

  return lines.join('\n')
}

export function parseLyricsToSlides(text: string, chunkSize = 250): string[] {
  return text
    .split(/\n\n+/)
    .flatMap(section => {
      section = section.trim()
      if (!section) return []
      if (section.length <= chunkSize) return [section]

      const lines = section.split('\n')
      const chunks: string[] = []
      let current: string[] = []

      for (const line of lines) {
        const joined = [...current, line].join('\n')
        if (joined.length > chunkSize && current.length) {
          chunks.push(current.join('\n'))
          current = [line]
        } else {
          current.push(line)
        }
      }
      if (current.length) chunks.push(current.join('\n'))
      return chunks
    })
    .filter(Boolean)
}
