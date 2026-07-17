export async function readSSE(req: Request, onData: (raw: string, event?: string) => void) {
  const res = await fetch(req)
  if (!res.body) throw new Error('Response body is null')

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buffer = ''
  // Per the SSE spec, `event:` and `data:` lines belonging to the same
  // message are separate lines, terminated by a blank line — the event name
  // isn't embedded in the data payload itself, so it has to be tracked
  // across lines and paired with the `data:` line that follows it.
  let currentEvent: string | undefined

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += dec.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        onData(line.slice(5).trim(), currentEvent)
      } else if (line === '') {
        currentEvent = undefined
      }
    }
  }
}
