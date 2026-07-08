import { RequestError, TimeoutError } from '../errors/index.js'

export interface HttpOptions extends RequestInit {
  baseUrl?: string
  timeout?: number
}

export class HttpClient {
  constructor(private options: HttpOptions = {}) {}

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = this.options.baseUrl ? `${this.options.baseUrl}${path}` : path
    const timeout = options.signal ? undefined : (options as HttpOptions).timeout ?? this.options.timeout

    let signal = options.signal
    let timeoutId: any = null

    if (timeout && !signal) {
      const controller = new AbortController()
      signal = controller.signal
      timeoutId = setTimeout(() => controller.abort(new TimeoutError(timeout)), timeout)
    }

    try {
      const res = await fetch(url, {
        ...this.options,
        ...options,
        ...(signal ? { signal } : {}),
        headers: {
          ...this.options.headers,
          ...options.headers,
        },
      })

      if (!res.ok) {
        throw new RequestError(`HTTP ${options.method || 'GET'} ${path} → ${res.status}`, {
          status: res.status,
          endpoint: path,
        })
      }

      if (res.status === 204) return undefined as T

      const contentType = res.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        return res.json()
      }

      return res.text() as unknown as T
    } catch (err: any) {
      if (err instanceof RequestError || err instanceof TimeoutError) {
        throw err
      }
      if (err.name === 'AbortError') {
        // If it was aborted by our timeout controller, err might be custom or we throw TimeoutError
        if (signal?.reason instanceof TimeoutError) {
          throw signal.reason
        }
        // Fallback for older environments or other abort reasons
        if (timeoutId) {
          throw new TimeoutError(timeout!)
        }
      }
      throw err
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }

  get<T>(path: string, options?: RequestInit) {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  post<T>(path: string, body?: unknown, options?: RequestInit) {
    const req: RequestInit = { ...options, method: 'POST' }
    if (body !== undefined) {
      req.body = JSON.stringify(body)
      req.headers = { 'Content-Type': 'application/json', ...options?.headers }
    }
    return this.request<T>(path, req)
  }

  put<T>(path: string, body?: unknown, options?: RequestInit) {
    const req: RequestInit = { ...options, method: 'PUT' }
    if (body !== undefined) {
      req.body = JSON.stringify(body)
      req.headers = { 'Content-Type': 'application/json', ...options?.headers }
    }
    return this.request<T>(path, req)
  }

  patch<T>(path: string, body?: unknown, options?: RequestInit) {
    const req: RequestInit = { ...options, method: 'PATCH' }
    if (body !== undefined) {
      req.body = JSON.stringify(body)
      req.headers = { 'Content-Type': 'application/json', ...options?.headers }
    }
    return this.request<T>(path, req)
  }

  delete<T>(path: string, options?: RequestInit) {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }
}
