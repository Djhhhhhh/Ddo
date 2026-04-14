/**
 * ddo stop 命令实现
 * 停止所有 Ddo 服务
 */

import yaml from 'yaml';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import logger from '../utils/logger';
import { resolveDataDir, getPaths, prettyPath } from '../utils/paths';
import { createServiceManager, ServiceDefinition } from '../services/manager';
import { getContainerStatus, MYSQL_CONTAINER_NAME, stopMySQL } from '../utils/docker';

interface StopOptions {
  dataDir?: string;
  includeMysql?: boolean;
}

/**
 * 执行 stop 命令
 */
export async function stopCommand(options: StopOptions = {}): Promise<{
  success: boolean;
  error?: string;
}> {
  logger.section('停止 Ddo 服务');
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
    logger.warn('Ddo 尚未初始化，无需停止');
    return { success: true };
  }

  // 3. 读取配置
  let config: any;
  try {
    const configContent = await fs.readFile(paths.config, 'utf8');
    config = yaml.parse(configContent);
  } catch (err) {
    logger.warn(`读取配置文件失败: ${err instanceof Error ? err.message : String(err)}`);
    logger.info('将继续尝试停止服务...');
  }

  // 4. 定义服务列表
  const services: ServiceDefinition[] = [
    {
      name: 'server-go',
      displayName: 'server-go',
      port: config?.endpoints?.serverGo?.split(':').pop() || 8080,
      healthUrl: `${config?.endpoints?.serverGo || 'http://localhost:8080'}/health`,
      command: [], // stop 不需要 command
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

  // 5. 创建服务管理器
  const manager = createServiceManager({
    pidDir: paths.services,
    logDir: paths.logs,
    dataDir,
  });

  // 6. 停止服务（逆序）
  logger.section('停止后端服务');
  const stopResult = await manager.stopAll(services);

  if (!stopResult.success) {
    logger.warn('部分服务停止失败');
    for (const { service, result } of stopResult.results) {
      if (!result.success && result.error) {
        logger.error(`  ${service}: ${result.error}`);
      }
    }
  }

  // 7. 停止 MySQL（如果指定）
  if (options.includeMysql) {
    logger.section('停止 MySQL 数据库');
    const mysqlStatus = await getContainerStatus(MYSQL_CONTAINER_NAME);

    if (mysqlStatus.running) {
      const mysqlStopResult = await stopMySQL();
      if (mysqlStopResult.success) {
        logger.success('MySQL 容器已停止');
      } else {
        logger.error(`停止 MySQL 失败: ${mysqlStopResult.message}`);
      }
    } else {
      logger.info('MySQL 容器未运行');
    }
  } else {
    logger.newline();
    logger.info(chalk.gray('MySQL 容器仍在运行（使用 --include-mysql 停止）'));
  }

  // 8. 输出结果
  logger.newline();
  logger.divider();
  logger.success('Ddo 服务已停止');
  logger.divider();

  return { success: true };
}
