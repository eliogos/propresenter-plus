export class ProPresenterError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ProPresenterError'
  }
}

export class ConnectionError extends ProPresenterError {
  constructor(message = 'Unable to connect to ProPresenter', options?: ErrorOptions) {
    super(message, options)
    this.name = 'ConnectionError'
  }
}

export class RequestError extends ProPresenterError {
  public readonly status: number | undefined
  public readonly endpoint: string | undefined

  constructor(
    message: string,
    options?: ErrorOptions & { status?: number; endpoint?: string }
  ) {
    super(message, options)
    this.name = 'RequestError'
    this.status = options?.status
    this.endpoint = options?.endpoint
  }
}

export class TimeoutError extends ProPresenterError {
  public readonly timeout: number

  constructor(timeout: number, message?: string, options?: ErrorOptions) {
    super(message ?? `Request timed out after ${timeout}ms`, options)
    this.name = 'TimeoutError'
    this.timeout = timeout
  }
}
