#!/usr/bin/env node

/**
 * Ddo CLI 入口文件
 * 个人智能工作空间命令行工具
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { startCommand } from './commands/start';
import logger from './utils/logger';
import { resolveDataDir, prettyPath } from './utils/paths';

const program = new Command();

// CLI 基本信息
program
  .name('ddo')
  .description('Ddo - 个人智能工作空间 CLI')
  .version('0.1.0', '-v, --version', '显示版本号')
  .helpOption('-h, --help', '显示帮助信息');

// 全局选项
program.option('-d, --data-dir <path>', '指定数据目录路径');
program.option('--silent', '静默模式，减少输出');
program.option('--verbose', '详细模式，显示调试信息');

// init 命令
program
  .command('init')
  .description('初始化 Ddo 工作空间')
  .option('-d, --data-dir <path>', '指定数据目录路径')
  .option('--skip-docker', '跳过 Docker 检查和 MySQL 启动')
  .option('--force', '强制重新生成配置文件')
  .action(async (options) => {
    try {
      // 设置日志级别
      if (options.verbose) {
        logger.setLevel('debug');
      } else if (options.silent) {
        logger.setSilent(true);
      }

      // 获取全局选项中的 dataDir
      const globalOpts = program.opts();
      const dataDir = options.dataDir || globalOpts.dataDir;

      const result = await initCommand({
        dataDir,
        skipDocker: options.skipDocker,
        force: options.force,
      });

      if (!result.success) {
        logger.error(result.error || '初始化失败');
        process.exit(1);
      }

      process.exit(0);
    } catch (err) {
      logger.error(`初始化过程出错: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// start 命令
program
  .command('start')
  .description('启动所有 Ddo 服务')
  .option('-d, --data-dir <path>', '指定数据目录路径')
  .option('--skip-repl', '启动后不进入 REPL 模式')
  .option('-v, --verbose', '显示详细日志')
  .option('--silent', '静默模式')
  .action(async (options) => {
    try {
      // 设置日志级别
      if (options.verbose) {
        logger.setLevel('debug');
      } else if (options.silent) {
        logger.setSilent(true);
      }

      const result = await startCommand({
        dataDir: options.dataDir,
        skipRepl: options.skipRepl,
      });

      if (!result.success) {
        logger.error(result.error || '启动失败');
        process.exit(1);
      }

      // 如果跳过 REPL，直接退出
      if (options.skipRepl) {
        process.exit(0);
      }
    } catch (err) {
      logger.error(`启动过程出错: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// stop 命令
program
  .command('stop')
  .description('停止所有 Ddo 服务')
  .option('-d, --data-dir <path>', '指定数据目录路径')
  .option('--include-mysql', '同时停止 MySQL 容器')
  .option('-v, --verbose', '显示详细日志')
  .option('--silent', '静默模式')
  .action(async (options) => {
    try {
      // 设置日志级别
      if (options.verbose) {
        logger.setLevel('debug');
      } else if (options.silent) {
        logger.setSilent(true);
      }

      const { stopCommand } = await import('./commands/stop');

      const result = await stopCommand({
        dataDir: options.dataDir,
        includeMysql: options.includeMysql,
      });

      if (!result.success) {
        logger.error(result.error || '停止失败');
        process.exit(1);
      }

      process.exit(0);
    } catch (err) {
      logger.error(`停止过程出错: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// status 命令
program
  .command('status')
  .description('显示服务状态')
  .option('-d, --data-dir <path>', '指定数据目录路径')
  .option('-v, --verbose', '显示详细日志')
  .action(async (options) => {
    try {
      // 设置日志级别
      if (options.verbose) {
        logger.setLevel('debug');
      }

      const { statusCommand } = await import('./commands/status');

      const result = await statusCommand({
        dataDir: options.dataDir,
      });

      if (!result.success) {
        logger.error(result.error || '查询状态失败');
        process.exit(1);
      }

      process.exit(0);
    } catch (err) {
      logger.error(`查询状态出错: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// logs 命令
program
  .command('logs [service]')
  .description('查看服务日志 (cli|server-go|llm-py|web-ui|mysql|all)')
  .option('-d, --data-dir <path>', '指定数据目录路径')
  .option('-n, --lines <number>', '显示最后 N 行', '100')
  .option('-f, --follow', '实时跟踪日志')
  .option('--since <time>', '显示某时间之后的日志（如 1h, 30m, 2024-01-01）')
  .option('--level <level>', '按日志级别过滤（DEBUG, INFO, WARN, ERROR）')
  .action(async (service, options) => {
    try {
      const { logsCommand } = await import('./commands/logs');

      const result = await logsCommand(service, options);

      if (!result.success) {
        logger.error(result.error || '查看日志失败');
        process.exit(1);
      }

      process.exit(0);
    } catch (err) {
      logger.error(`查看日志出错: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// config 命令（占位）
program
  .command('config')
  .description('管理配置')
  .action(() => {
    const dataDir = resolveDataDir({ envDataDir: process.env.DDO_DATA_DIR });
    logger.info(chalk.yellow('config 命令尚未实现'));
    logger.info(`配置文件位置: ${prettyPath(`${dataDir}/config.yaml`)}`);
  });

// 如果没有提供命令，直接启动 REPL
if (!process.argv.slice(2).length) {
  (async () => {
    try {
      const result = await startCommand({});
      if (!result.success) {
        logger.error(result.error || '启动失败');
        process.exit(1);
      }
    } catch (err) {
      logger.error(`启动过程出错: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  })();
} else {
  // 解析命令行参数
  program.parse(process.argv);
}
