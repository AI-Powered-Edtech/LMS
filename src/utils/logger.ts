/**
 * Logger utility for standardizing log levels across environments.
 * - In development: logs everything (debug, info, warn, error)
 * - In production: logs only warn and error
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// We use import.meta.env for Vite environment variables
const isDev = import.meta.env?.DEV ?? process.env.NODE_ENV !== 'production'

class Logger {
  private formatMessage(level: LogLevel, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString()
    const argsString = args.length ? `\nData: ${JSON.stringify(args, null, 2)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${argsString}`
  }

  debug(message: string, ...args: any[]) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.debug(this.formatMessage('debug', message, ...args))
    }
  }

  info(message: string, ...args: any[]) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.info(this.formatMessage('info', message, ...args))
    }
  }

  warn(message: string, ...args: any[]) {
    console.warn(this.formatMessage('warn', message, ...args))
  }

  error(message: string | Error | unknown, ...args: any[]) {
    const msg = message instanceof Error ? message.message : String(message)
    const err =
      args.find((arg) => arg instanceof Error) || (message instanceof Error ? message : undefined)

    if (err instanceof Error) {
      console.error(this.formatMessage('error', msg), err.message, err.stack, ...args)
    } else {
      console.error(this.formatMessage('error', msg), ...args)
    }
  }
}

export const logger = new Logger()
