export interface HttpOptions extends RequestInit {
  baseUrl?: string
}

export class HttpClient {
  constructor(private options: HttpOptions = {}) {}

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = this.options.baseUrl ? `${this.options.baseUrl}${path}` : path
    const res = await fetch(url, {
      ...this.options,
      ...options,
      headers: {
        ...this.options.headers,
        ...options.headers,
      },
    })

    if (!res.ok) {
      throw new Error(`HTTP ${options.method || 'GET'} ${path} → ${res.status}`)
    }

    if (res.status === 204) return undefined as T

    const contentType = res.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return res.json()
    }

    return res.text() as unknown as T
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
