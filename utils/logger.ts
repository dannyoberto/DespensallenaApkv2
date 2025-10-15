/**
 * Conditional Logging Utility
 * Logs only in development mode to improve production performance
 */

const __DEV__ = process.env.NODE_ENV === 'development';

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

class Logger {
  private enabled: boolean;
  private prefix: string;

  constructor(prefix: string = '[App]', enabled: boolean = __DEV__) {
    this.prefix = prefix;
    this.enabled = enabled;
  }

  private formatMessage(level: LogLevel, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    return `${this.prefix} [${timestamp}] [${level.toUpperCase()}]`;
  }

  log(...args: any[]): void {
    if (this.enabled) {
      console.log(this.formatMessage('log', ...args), ...args);
    }
  }

  info(...args: any[]): void {
    if (this.enabled) {
      console.info(this.formatMessage('info', ...args), ...args);
    }
  }

  warn(...args: any[]): void {
    if (this.enabled) {
      console.warn(this.formatMessage('warn', ...args), ...args);
    }
  }

  error(...args: any[]): void {
    // Always log errors, even in production
    console.error(this.formatMessage('error', ...args), ...args);
  }

  debug(...args: any[]): void {
    if (this.enabled) {
      console.debug(this.formatMessage('debug', ...args), ...args);
    }
  }

  // Performance marking
  mark(label: string): void {
    if (this.enabled && typeof performance !== 'undefined') {
      performance.mark(label);
    }
  }

  measure(name: string, startMark: string, endMark: string): void {
    if (this.enabled && typeof performance !== 'undefined') {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name)[0];
        this.debug(`⏱️ ${name}: ${measure.duration.toFixed(2)}ms`);
      } catch (error) {
        this.warn(`Failed to measure ${name}:`, error);
      }
    }
  }

  // Create scoped logger
  scope(scopeName: string): Logger {
    return new Logger(`${this.prefix}:${scopeName}`, this.enabled);
  }
}

// Export singleton instances
export const logger = new Logger('[App]');
export const cacheLogger = new Logger('[Cache]');
export const networkLogger = new Logger('[Network]');
export const webviewLogger = new Logger('[WebView]');
export const preloadLogger = new Logger('[Preload]');

export default logger;

