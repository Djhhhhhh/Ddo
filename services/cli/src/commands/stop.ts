/**
 * ddo stop 命令实现
 * 停止所有 Ddo 服务
 */

import * as fs from 'fs-extra';
import type { DdoConfig } from '../types';
import logger from '../utils/logger';
import { resolveDataDir, getPaths, prettyPath } from '../utils/paths';
import { loadDdoConfig } from '../utils/config';
import { createServiceManager, ServiceDefinition } from '../services/manager';

interface StopOptions {
  dataDir?: string;
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
  let config: DdoConfig | undefined;
  try {
    config = await loadDdoConfig(dataDir);
  } catch (err) {
    logger.warn(`读取配置文件失败: ${err instanceof Error ? err.message : String(err)}`);
    logger.info('将继续尝试停止服务...');
  }

  // 4. 定义服务列表
  const services: ServiceDefinition[] = [
    {
      name: 'server-go',
      displayName: 'server-go',
      port: config?.services?.serverGo?.port || 50001,
      healthUrl: `${config?.services?.serverGo?.url || 'http://127.0.0.1:50001'}${config?.services?.serverGo?.healthPath || '/health'}`,
      command: [], // stop 不需要 command
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

  // 8. 输出结果
  logger.newline();
  logger.divider();
  logger.success('Ddo 服务已停止');
  logger.divider();

  return { success: true };
}
