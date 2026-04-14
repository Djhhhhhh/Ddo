/**
 * ddo logs 命令实现
 * 查看服务日志
 */

import chalk from 'chalk';
import logger from '../utils/logger';
import { resolveDataDir, getPaths, prettyPath } from '../utils/paths';
import {
  isValidService,
  getLogFilePath,
  readLastLines,
  followLogFile,
  getMySQLLogs,
  readMultipleLogs,
  highlightLogLevel,
  parseLogLine,
  SERVICE_DISPLAY_NAMES,
  SUPPORTED_SERVICES,
} from '../utils/log-reader';
import type { LogOptions } from '../types';
import { MYSQL_CONTAINER_NAME } from '../utils/docker';

interface LogsCommandOptions {
  dataDir?: string;
  lines?: string;
  follow?: boolean;
  since?: string;
  level?: string;
}

/**
 * 执行 logs 命令
 */
export async function logsCommand(
  service: string | undefined,
  options: LogsCommandOptions
): Promise<{ success: boolean; error?: string }> {
  // 1. 解析参数
  const targetService = service || 'cli';
  const lines = options.lines ? parseInt(options.lines, 10) : 100;
  const follow = options.follow || false;
  const since = options.since;
  const level = options.level?.toUpperCase();

  // 验证服务名称
  if (!isValidService(targetService)) {
    return {
      success: false,
      error: `未知的服务: ${targetService}\n支持的服务: ${SUPPORTED_SERVICES.join(', ')}`,
    };
  }

  // 验证级别
  if (level && !['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(level)) {
    return {
      success: false,
      error: `无效的日志级别: ${level}\n支持的级别: DEBUG, INFO, WARN, ERROR`,
    };
  }

  // 2. 解析数据目录
  const dataDir = resolveDataDir({
    dataDir: options.dataDir,
    envDataDir: process.env.DDO_DATA_DIR,
  });

  const paths = getPaths(dataDir);

  // 3. 输出日志信息头
  if (!follow) {
    logger.section('查看日志');
    logger.info(`数据目录: ${logger.path(prettyPath(dataDir))}`);
    logger.info(`服务: ${chalk.cyan(SERVICE_DISPLAY_NAMES[targetService] || targetService)}`);
    logger.info(`行数: ${lines}`);
    if (since) {
      logger.info(`时间过滤: ${since}`);
    }
    if (level) {
      logger.info(`级别过滤: ${level}`);
    }
    logger.newline();
  }

  try {
    // 4. 处理不同服务的日志
    if (targetService === 'mysql') {
      await showMySQLLogs(lines, follow, since);
    } else if (targetService === 'all') {
      await showAllLogs(paths.logs, lines, since, level);
    } else {
      await showServiceLogs(paths.logs, targetService, lines, follow, since, level);
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * 显示单个服务的日志
 */
async function showServiceLogs(
  logsDir: string,
  service: string,
  lines: number,
  follow: boolean,
  since?: string,
  level?: string
): Promise<void> {
  const logPath = getLogFilePath(logsDir, service);

  // 检查日志文件是否存在
  const fs = await import('fs-extra');
  if (!(await fs.pathExists(logPath))) {
    console.log(chalk.yellow(`⚠ 日志文件不存在: ${prettyPath(logPath)}`));
    console.log(chalk.gray('服务可能尚未启动或无日志输出'));
    return;
  }

  if (follow) {
    // 实时跟踪模式
    console.log(chalk.cyan(`⏺ 正在跟踪 ${SERVICE_DISPLAY_NAMES[service]} 日志（按 Ctrl+C 停止）...`));
    console.log();

    const abortController = new AbortController();

    // 处理 Ctrl+C
    process.on('SIGINT', () => {
      abortController.abort();
      console.log();
      console.log(chalk.gray('✓ 已停止跟踪'));
      process.exit(0);
    });

    await followLogFile(
      logPath,
      since,
      level,
      (line) => {
        console.log(highlightLogLevel(line));
      },
      abortController.signal
    );
  } else {
    // 一次性读取模式
    const lines_content = await readLastLines(logPath, lines, since, level);

    if (lines_content.length === 0) {
      console.log(chalk.gray('（无日志内容）'));
      return;
    }

    for (const line of lines_content) {
      console.log(highlightLogLevel(line));
    }

    console.log();
    console.log(chalk.gray(`✓ 共显示 ${lines_content.length} 行`));
  }
}

/**
 * 显示所有服务的日志
 */
async function showAllLogs(
  logsDir: string,
  lines: number,
  since?: string,
  level?: string
): Promise<void> {
  const services = ['cli', 'server-go', 'llm-py', 'web-ui'];

  // 读取多个服务的日志
  const entries = await readMultipleLogs(logsDir, services, lines, since, level);

  if (entries.length === 0) {
    console.log(chalk.yellow('⚠ 无日志内容'));
    return;
  }

  // 获取最大服务名长度用于对齐
  const maxNameLen = Math.max(...entries.map(e => e.service.length));

  // 输出日志
  for (const entry of entries.slice(-lines)) {
    const serviceTag = chalk.dim(`[${entry.service.padEnd(maxNameLen)}]`);
    const levelTag = entry.level ? formatLevelTag(entry.level) : '';
    console.log(`${serviceTag} ${levelTag}${entry.message}`);
  }

  console.log();
  console.log(chalk.gray(`✓ 共显示 ${entries.length} 条日志`));
}

/**
 * 格式化日志级别标签
 */
function formatLevelTag(level: string): string {
  const colors: Record<string, (text: string) => string> = {
    ERROR: chalk.red,
    FATAL: chalk.red,
    WARN: chalk.yellow,
    WARNING: chalk.yellow,
    INFO: chalk.cyan,
    DEBUG: chalk.gray,
  };

  const color = colors[level] || chalk.gray;
  return color(`[${level}] `);
}

/**
 * 显示 MySQL 容器日志
 */
async function showMySQLLogs(
  lines: number,
  follow: boolean,
  since?: string
): Promise<void> {
  try {
    const { output, process: proc } = await getMySQLLogs(
      MYSQL_CONTAINER_NAME,
      lines,
      follow,
      since
    );

    if (follow && proc) {
      // 实时跟踪模式
      console.log(chalk.cyan(`⏺ 正在跟踪 MySQL 日志（按 Ctrl+C 停止）...`));
      console.log();

      proc.stdout?.on('data', (data: Buffer) => {
        process.stdout.write(data);
      });

      proc.stderr?.on('data', (data: Buffer) => {
        process.stderr.write(data);
      });

      // 处理 Ctrl+C
      process.on('SIGINT', () => {
        proc.kill();
        console.log();
        console.log(chalk.gray('✓ 已停止跟踪'));
        process.exit(0);
      });

      // 等待进程结束
      await new Promise((resolve) => {
        proc.on('close', resolve);
      });
    } else {
      // 一次性输出
      if (output.trim()) {
        console.log(output.trim());
      } else {
        console.log(chalk.gray('（无日志内容）'));
      }
    }
  } catch (err) {
    console.log(chalk.red(`✗ 获取 MySQL 日志失败: ${err instanceof Error ? err.message : String(err)}`));
    console.log(chalk.gray('提示: 请确保 Docker 正在运行且 MySQL 容器已启动'));
  }
}
