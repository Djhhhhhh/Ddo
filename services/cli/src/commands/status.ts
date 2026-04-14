/**
 * ddo status 命令实现
 * 显示所有服务的状态
 */

import yaml from 'yaml';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import logger from '../utils/logger';
import { resolveDataDir, getPaths, prettyPath } from '../utils/paths';
import { createServiceManager, ServiceDefinition } from '../services/manager';
import { getContainerStatus, MYSQL_CONTAINER_NAME } from '../utils/docker';
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
  let config: any;
  try {
    const configContent = await fs.readFile(paths.config, 'utf8');
    config = yaml.parse(configContent);
  } catch (err) {
    logger.warn(`读取配置文件失败: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 4. 显示 MySQL 状态
  logger.divider();
  console.log(chalk.bold.cyan('数据库服务'));
  logger.divider();

  const mysqlStatus = await getContainerStatus(MYSQL_CONTAINER_NAME);
  const mysqlState = mysqlStatus.running
    ? mysqlStatus.health === 'healthy'
      ? chalk.green('✓ 健康')
      : mysqlStatus.health === 'starting'
        ? chalk.yellow('启动中')
        : chalk.yellow('运行中')
    : chalk.red('✗ 已停止');

  console.log(`${mysqlState} MySQL (容器: ${MYSQL_CONTAINER_NAME})`);
  if (mysqlStatus.id) {
    console.log(`  容器ID: ${chalk.gray(mysqlStatus.id)}`);
  }
  if (config?.database) {
    console.log(`  连接: ${chalk.gray(`${config.database.host}:${config.database.port}`)}`);
  }

  // 5. 显示后端服务状态
  logger.newline();
  logger.divider();
  console.log(chalk.bold.cyan('后端服务'));
  logger.divider();

  const services: ServiceDefinition[] = [
    {
      name: 'server-go',
      displayName: 'server-go',
      port: config?.endpoints?.serverGo?.split(':').pop() || 8080,
      healthUrl: `${config?.endpoints?.serverGo || 'http://localhost:8080'}/health`,
      command: [],
    },
    {
      name: 'llm-py',
      displayName: 'llm-py',
      port: config?.endpoints?.llmPy?.split(':').pop() || 8000,
      healthUrl: `${config?.endpoints?.llmPy || 'http://localhost:8000'}/health`,
      command: [],
    },
    {
      name: 'web-ui',
      displayName: 'web-ui',
      port: config?.endpoints?.webUi?.split(':').pop() || 3000,
      healthUrl: `${config?.endpoints?.webUi || 'http://localhost:3000'}/health`,
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
      // 检查健康状态
      const healthResult = await checkHealth(service.healthUrl, 2000);
      const healthStatus = healthResult.healthy
        ? chalk.green('✓ 健康')
        : chalk.yellow('? 未就绪');

      console.log(`${healthStatus} ${service.displayName}`);
      console.log(`  PID: ${chalk.gray(status.pid)}`);
      console.log(`  端口: ${chalk.gray(status.port)}`);
      console.log(`  地址: ${chalk.gray(service.healthUrl.replace('/health', ''))}`);
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
  const mysqlRunning = mysqlStatus.running ? 1 : 0;
  const totalServices = services.length + 1; // +1 for MySQL

  const summaryColor = runningCount + mysqlRunning === totalServices
    ? chalk.green
    : runningCount + mysqlRunning > 0
      ? chalk.yellow
      : chalk.red;

  console.log(`${summaryColor(`${runningCount + mysqlRunning}/${totalServices}`)} 服务运行中`);
  logger.divider();

  return { success: true };
}
