/**
 * 日志输出工具
 * 提供统一的终端输出格式和颜色
 */

import chalk from 'chalk';
import type { LogLevel } from '../types';

/** 日志级别数值 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel = 'info';
  private silent: boolean = false;

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setSilent(silent: boolean): void {
    this.silent = silent;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.silent) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  debug(message: string): void {
    if (this.shouldLog('debug')) {
      console.log(chalk.gray(`[debug] ${message}`));
    }
  }

  info(message: string): void {
    if (this.shouldLog('info')) {
      console.log(chalk.blue(message));
    }
  }

  success(message: string): void {
    if (this.shouldLog('info')) {
      console.log(chalk.green(`✓ ${message}`));
    }
  }

  warn(message: string): void {
    if (this.shouldLog('warn')) {
      console.log(chalk.yellow(`⚠ ${message}`));
    }
  }

  error(message: string): void {
    if (this.shouldLog('error')) {
      console.error(chalk.red(`✗ ${message}`));
    }
  }

  /** 输出带标题的信息块 */
  section(title: string): void {
    if (this.shouldLog('info')) {
      console.log('\n' + chalk.bold.cyan(`▸ ${title}`));
    }
  }

  /** 输出分隔线 */
  divider(): void {
    if (this.shouldLog('info')) {
      console.log(chalk.gray('─'.repeat(50)));
    }
  }

  /** 输出空行 */
  newline(): void {
    if (!this.silent) {
      console.log();
    }
  }

  /** 格式化路径输出 */
  path(p: string): string {
    return chalk.cyan(p);
  }

  /** 格式化命令输出 */
  command(cmd: string): string {
    return chalk.yellow(`\`${cmd}\``);
  }

  /** 格式化代码/文件名输出 */
  code(text: string): string {
    return chalk.magenta(text);
  }
}

export const logger = new Logger();
export default logger;
