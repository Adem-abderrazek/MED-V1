/**
 * Logger Utility
 * 
 * Centralized logging system that replaces console.log statements.
 * Supports different log levels and can be extended with external logging services.
 */

import { env } from '@config/env.js';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
  error?: Error;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = env.LOG_LEVEL;
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  /**
   * Format log entry
   */
  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, data, error } = entry;
    let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      logMessage += ` ${JSON.stringify(data, null, 2)}`;
    }
    
    if (error) {
      logMessage += `\nError: ${error.message}\nStack: ${error.stack}`;
    }
    
    return logMessage;
  }

  /**
   * Write log to console (and potentially external services)
   */
  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formatted = this.formatLog(entry);
    
    switch (entry.level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'debug':
        console.debug(formatted);
        break;
    }

    // TODO: In production, send to external logging service (e.g., Sentry, CloudWatch)
    // if (env.isProduction && entry.level === 'error') {
    //   this.sendToExternalService(entry);
    // }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, data?: unknown): void {
    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      data,
      error: error instanceof Error ? error : undefined,
    };
    this.writeLog(entry);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: unknown): void {
    const entry: LogEntry = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      data,
    };
    this.writeLog(entry);
  }

  /**
   * Log info message
   */
  info(message: string, data?: unknown): void {
    const entry: LogEntry = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      data,
    };
    this.writeLog(entry);
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: unknown): void {
    const entry: LogEntry = {
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      data,
    };
    this.writeLog(entry);
  }
}

// Export singleton instance
export const logger = new Logger();


