export async function readSSE(req: Request, onData: (raw: string) => void) {
  const res = await fetch(req)
  if (!res.body) throw new Error('Response body is null')

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += dec.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.startsWith('data:')) {
        onData(line.slice(5).trim())
      }
    }
  }
}
