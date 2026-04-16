/**
 * ddo start 命令实现
 * 启动所有 Ddo 服务并进入 REPL
 */

import * as path from 'path';
import yaml from 'yaml';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import logger from '../utils/logger';
import { resolveDataDir, getPaths, prettyPath } from '../utils/paths';
import {
  createServiceManager,
  ServiceDefinition,
  ServiceStatus,
} from '../services/manager';
import { startRepl } from '../repl';
import { getContainerStatus, MYSQL_CONTAINER_NAME } from '../utils/docker';

interface StartOptions {
  dataDir?: string;
  skipRepl?: boolean;
}

/**
 * 执行 start 命令
 */
export async function startCommand(options: StartOptions = {}): Promise<{
  success: boolean;
  error?: string;
}> {
  logger.section('启动 Ddo 服务');
  logger.newline();

  // 1. 解析数据目录
  const dataDir = resolveDataDir({
    dataDir: options.dataDir,
    envDataDir: process.env.DDO_DATA_DIR,
  });

  logger.info(`数据目录: ${logger.path(prettyPath(dataDir))}`);

  // 2. 检查初始化状态
  const paths = getPaths(dataDir);

  if (!(await fs.pathExists(paths.config))) {
    return {
      success: false,
      error: `Ddo 尚未初始化。请先运行: ddo init`,
    };
  }

  // 3. 读取配置
  let config: any;
  try {
    const configContent = await fs.readFile(paths.config, 'utf8');
    config = yaml.parse(configContent);
  } catch (err) {
    return {
      success: false,
      error: `读取配置文件失败: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // 4. 检查 MySQL 容器
  logger.section('检查 MySQL 数据库');
  const mysqlStatus = await getContainerStatus(MYSQL_CONTAINER_NAME);

  if (!mysqlStatus.running) {
    logger.error('MySQL 容器未运行');
    logger.info('请先运行: ddo init');
    return {
      success: false,
      error: 'MySQL 服务未启动',
    };
  }

  logger.success(`MySQL 正在运行 (容器: ${mysqlStatus.id})`);

  // 辅助函数：从配置中提取端口号
  function getPort(endpoint: string | undefined, defaultPort: number): number {
    if (!endpoint) return defaultPort;
    const match = endpoint.match(/:(\d+)\/?$/);
    return match ? parseInt(match[1], 10) : defaultPort;
  }

  // 检查服务目录是否存在
  const serverGoDir = path.join(process.cwd(), '..', '..', 'server-go');
  const llmPyDir = path.join(process.cwd(), '..', '..', 'llm-py');
  const webUiDir = path.join(process.cwd(), '..', '..', 'web-ui');

  // 5. 定义服务列表（只包含存在的服务）
  const allServices: ServiceDefinition[] = [];

  if (await fs.pathExists(serverGoDir)) {
    allServices.push({
      name: 'server-go',
      displayName: 'server-go',
      port: getPort(config.endpoints?.serverGo, 8080),
      healthUrl: `${config.endpoints?.serverGo || 'http://localhost:8080'}/health`,
      command: ['go', 'run', 'main.go'],
      cwd: serverGoDir,
      env: {
        DDO_DATA_DIR: dataDir,
        PORT: String(getPort(config.endpoints?.serverGo, 8080)),
      },
    });
  }

  if (await fs.pathExists(llmPyDir)) {
    allServices.push({
      name: 'llm-py',
      displayName: 'llm-py',
      port: getPort(config.endpoints?.llmPy, 8000),
      healthUrl: `${config.endpoints?.llmPy || 'http://localhost:8000'}/health`,
      command: ['python', '-m', 'uvicorn', 'main:app', '--host', '0.0.0.0'],
      cwd: llmPyDir,
      env: {
        DDO_DATA_DIR: dataDir,
        PORT: String(getPort(config.endpoints?.llmPy, 8000)),
      },
    });
  }

  if (await fs.pathExists(webUiDir)) {
    allServices.push({
      name: 'web-ui',
      displayName: 'web-ui',
      port: getPort(config.endpoints?.webUi, 3000),
      healthUrl: `${config.endpoints?.webUi || 'http://localhost:3000'}/health`,
      command: ['npm', 'run', 'dev'],
      cwd: webUiDir,
      env: {
        DDO_DATA_DIR: dataDir,
        PORT: String(getPort(config.endpoints?.webUi, 3000)),
      },
    });
  }

  // 如果没有任何服务，给出提示但仍继续进入 REPL
  let noBackendServices = false;
  if (allServices.length === 0) {
    logger.warn('未找到任何后端服务目录');
    logger.info('当前仅 CLI 可用，部分功能受限');
    logger.newline();
    noBackendServices = true;
  }

  const services = allServices;

  // 6. 创建服务管理器
  const manager = createServiceManager({
    pidDir: paths.services,
    logDir: paths.logs,
    dataDir,
  });

  // 7. 检查已有运行状态
  logger.section('检查服务状态');
  const statuses: ServiceStatus[] = [];

  for (const service of services) {
    const status = manager.getStatus(service);
    statuses.push(status);

    if (status.running) {
      logger.info(`${service.displayName}: ${logger.success('已在运行')} (PID: ${status.pid})`);
    } else {
      logger.info(`${service.displayName}: ${logger.warn('未运行')}`);
    }
  }

  // 8. 启动服务（如果有的话）
  let runningStatuses: ServiceStatus[] = [];

  if (!noBackendServices) {
    logger.newline();
    logger.section('启动服务');

    // 只启动未运行的服务
    const servicesToStart = services.filter((s) => {
      const status = manager.getStatus(s);
      return !status.running;
    });

    if (servicesToStart.length === 0) {
      logger.success('所有服务已在运行');
    } else {
      const startResult = await manager.startAll(servicesToStart);

      if (!startResult.success) {
        return {
          success: false,
          error: '部分服务启动失败，请查看日志',
        };
      }

      logger.newline();
      logger.success('所有服务已启动');
    }

    // 9. 输出服务信息
    logger.newline();
    logger.divider();
    logger.section('服务访问地址');

    runningStatuses = services.map((s) => manager.getStatus(s));

    for (const service of runningStatuses) {
      const status = service.running ? chalk.green('● 运行中') : chalk.red('● 已停止');
      console.log(`  ${status} ${service.displayName.padEnd(12)} ${chalk.cyan(service.healthUrl)}`);
    }

    logger.divider();
    logger.newline();
  }

  // 10. 进入 REPL 或退出
  if (options.skipRepl) {
    logger.info('skip-repl 模式，不进入交互界面');
    return { success: true };
  }

  logger.info('正在进入 REPL 交互模式...');
  logger.newline();

  // 准备服务状态列表（只显示 go、llm-py、CLI，不显示 MySQL）
  // 通过 API 健康检查逐个检测服务状态
  const replServices: { name: string; displayName: string; running: boolean; port: number }[] = [];

  // 始终包含 CLI
  replServices.push({ name: 'cli', displayName: 'CLI', running: true, port: 0 });

  // 通过 API 健康检查检测 server-go 和 llm-py
  try {
    const { getApiClient } = await import('../services/api-client');
    const apiClient = getApiClient();
    const [healthResult, metricsResult] = await Promise.allSettled([
      apiClient.getHealth(),
      apiClient.getMetrics(),
    ]);

    if (healthResult.status === 'fulfilled') {
      replServices.push({ name: 'server-go', displayName: 'server-go', running: true, port: 8080 });
    }

    if (metricsResult.status === 'fulfilled') {
      const m = metricsResult.value;
      if (m.services?.llm_py === 'running') {
        replServices.push({ name: 'llm-py', displayName: 'llm-py', running: true, port: 8000 });
      }
    }
  } catch {
    // 健康检查失败，忽略
  }

  // 进入 REPL
  await startRepl({
    services: replServices,
  });

  return { success: true };
}
