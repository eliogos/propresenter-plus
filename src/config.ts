import type { ProVersion } from './versions/index.js'
import type { Logger } from './logger.js'

export interface ProPresenterOptions {
  /** ProPresenter host address */
  host: string

  /** ProPresenter API port (default: 1025) */
  port?: number

  /** ProPresenter version to target */
  version?: ProVersion

  /** Automatically reconnect on disconnect (default: true) */
  reconnect?: boolean

  /** Delay between reconnection attempts in milliseconds (default: 3000) */
  reconnectDelay?: number

  /** Request timeout in milliseconds (default: 5000) */
  timeout?: number

  /** Enable debug logging (default: false) */
  debug?: boolean

  /** Custom logger implementation */
  logger?: Logger
}

export interface ResolvedProPresenterOptions {
  host: string
  port: number
  version: ProVersion | undefined
  reconnect: boolean
  reconnectDelay: number
  timeout: number
  debug: boolean
  logger: Logger
}

export const DEFAULT_OPTIONS = {
  port: 1025,
  reconnect: true,
  reconnectDelay: 3000,
  timeout: 5000,
  debug: false,
} as const
