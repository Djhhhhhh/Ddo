/**
 * ddo status 命令实现
 * 显示所有服务的状态
 */

import * as fs from 'fs-extra';
import chalk from 'chalk';
import type { DdoConfig } from '../types';
import logger from '../utils/logger';
import { resolveDataDir, getPaths, prettyPath } from '../utils/paths';
import { loadDdoConfig } from '../utils/config';
import { createServiceManager, ServiceDefinition } from '../services/manager';
import { readPid } from '../services/pid-file';
import { isProcessRunning } from '../services/pid-file';
import { checkHealth } from '../services/health-check';

interface StatusOptions {
  dataDir?: string;
}

/**
 * 执行 status 命令
 */
export async function statusCommand(options: StatusOptions = {}): Promise<{
  success: boolean;
  error?: string;
}> {
  logger.section('Ddo 服务状态');
  logger.newline();

  // 1. 解析数据目录
  const dataDir = resolveDataDir({
    dataDir: options.dataDir,
    envDataDir: process.env.DDO_DATA_DIR,
  });

  logger.info(`数据目录: ${logger.path(prettyPath(dataDir))}`);
  logger.newline();

  // 2. 检查初始化状态
  const paths = getPaths(dataDir);

  if (!(await fs.pathExists(paths.config))) {
    logger.warn('Ddo 尚未初始化');
    logger.info('请运行: ddo init');
    return { success: true };
  }

  // 3. 读取配置
  let config: DdoConfig | undefined;
  try {
    config = await loadDdoConfig(dataDir);
  } catch (err) {
    logger.warn(`读取配置文件失败: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 4. 显示数据库状态
  logger.divider();
  console.log(chalk.bold.cyan('数据库服务'));
  logger.divider();

  const databasePath = config?.database?.path || paths.serverGoDb;
  const databaseExists = await fs.pathExists(databasePath);
  const databaseState = databaseExists
    ? chalk.green('✓ 就绪')
    : chalk.yellow('○ 未创建');

  console.log(`${databaseState} SQLite`);
  if (config?.database) {
    console.log(`  驱动: ${chalk.gray(config.database.driver || 'sqlite')}`);
  }
  console.log(`  路径: ${chalk.gray(prettyPath(databasePath))}`);

  // 5. 显示后端服务状态
  logger.newline();
  logger.divider();
  console.log(chalk.bold.cyan('后端服务'));
  logger.divider();

  const services: ServiceDefinition[] = [
    {
      name: 'server-go',
      displayName: 'server-go',
      port: config?.services?.serverGo?.port || 50001,
      healthUrl: `${config?.services?.serverGo?.url || 'http://127.0.0.1:50001'}${config?.services?.serverGo?.healthPath || '/health'}`,
      command: [],
    },
    {
      name: 'llm-py',
      displayName: 'llm-py',
      port: config?.services?.llmPy?.port || 50002,
      healthUrl: `${config?.services?.llmPy?.url || 'http://127.0.0.1:50002'}${config?.services?.llmPy?.healthPath || '/health'}`,
      command: [],
    },
    {
      name: 'web-ui',
      displayName: 'web-ui',
      port: config?.services?.webUi?.port || 50003,
      healthUrl: `${config?.services?.webUi?.url || 'http://127.0.0.1:50003'}${config?.services?.webUi?.healthPath || '/__ddo/health'}`,
      command: [],
    },
    {
      name: 'electron',
      displayName: 'electron',
      port: 0,
      healthUrl: '',
      startupStrategy: 'process',
      command: [],
    },
  ];

  const manager = createServiceManager({
    pidDir: paths.services,
    logDir: paths.logs,
    dataDir,
  });

  for (const service of services) {
    const status = manager.getStatus(service);

    if (status.running) {
      if (service.startupStrategy === 'process') {
        console.log(`${chalk.green('✓ 运行中')} ${service.displayName}`);
        console.log(`  PID: ${chalk.gray(status.pid)}`);
        continue;
      }

      // 检查健康状态
      const healthResult = await checkHealth(service.healthUrl, 2000);
      const healthStatus = healthResult.healthy
        ? chalk.green('✓ 健康')
        : chalk.yellow('? 未就绪');
      const displayUrl = service.healthUrl.endsWith('/__ddo/health')
        ? service.healthUrl.replace('/__ddo/health', '')
        : service.healthUrl.endsWith('/health')
          ? service.healthUrl.replace('/health', '')
          : service.healthUrl;

      console.log(`${healthStatus} ${service.displayName}`);
      console.log(`  PID: ${chalk.gray(status.pid)}`);
      console.log(`  端口: ${chalk.gray(status.port)}`);
      console.log(`  地址: ${chalk.gray(displayUrl)}`);
    } else {
      console.log(`${chalk.red('✗ 已停止')} ${service.displayName}`);
      console.log(`  端口: ${chalk.gray(status.port)}`);
    }
  }

  // 6. 显示 PID 目录信息
  logger.newline();
  logger.divider();
  console.log(chalk.bold.cyan('进程管理'));
  logger.divider();

  const hasPidFiles = await fs.pathExists(paths.services);
  if (hasPidFiles) {
    const pidFiles = (await fs.readdir(paths.services)).filter((f) => f.endsWith('.pid'));
    if (pidFiles.length > 0) {
      console.log(`PID 文件目录: ${chalk.gray(prettyPath(paths.services))}`);
      for (const file of pidFiles) {
        const serviceName = file.replace('.pid', '');
        const pid = readPid(paths.services, serviceName);
        const running = pid !== null && isProcessRunning(pid);
        const icon = running ? chalk.green('●') : chalk.gray('○');
        console.log(`  ${icon} ${file}: ${pid} ${running ? '' : chalk.gray('(进程不存在)')}`);
      }
    } else {
      console.log('无 PID 文件');
    }
  } else {
    console.log('服务目录未创建');
  }

  // 7. 总结
  logger.newline();
  logger.divider();

  const runningCount = services.filter((s) => manager.getStatus(s).running).length;
  const databaseReady = databaseExists ? 1 : 0;
  const totalServices = services.length + 1;

  const summaryColor = runningCount + databaseReady === totalServices
    ? chalk.green
    : runningCount + databaseReady > 0
      ? chalk.yellow
      : chalk.red;

  console.log(`${summaryColor(`${runningCount + databaseReady}/${totalServices}`)} 服务运行中`);
  logger.divider();

  return { success: true };
}
