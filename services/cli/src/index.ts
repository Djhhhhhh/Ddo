#!/usr/bin/env node

/**
 * Ddo CLI 入口文件
 * 个人智能工作空间命令行工具
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
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

// start 命令（占位）
program
  .command('start')
  .description('启动所有 Ddo 服务')
  .action(() => {
    logger.info(chalk.yellow('start 命令尚未实现'));
    logger.info(`请先运行 ${chalk.cyan('ddo init')} 完成初始化`);
  });

// stop 命令（占位）
program
  .command('stop')
  .description('停止所有 Ddo 服务')
  .action(() => {
    logger.info(chalk.yellow('stop 命令尚未实现'));
  });

// status 命令（占位）
program
  .command('status')
  .description('显示服务状态')
  .action(() => {
    logger.info(chalk.yellow('status 命令尚未实现'));
  });

// logs 命令（占位）
program
  .command('logs [service]')
  .description('查看服务日志')
  .action((service) => {
    logger.info(chalk.yellow('logs 命令尚未实现'));
    if (service) {
      logger.info(`指定服务: ${service}`);
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

// 解析命令行参数
program.parse(process.argv);

// 如果没有提供命令，显示帮助
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
