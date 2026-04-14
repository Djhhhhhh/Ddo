/**
 * 服务管理器
 * 负责启动、停止和管理后台服务
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import logger from '../utils/logger';
import {
  writePid,
  readPid,
  removePid,
  isServiceRunning,
  killProcess,
  isProcessRunning,
} from './pid-file';
import { waitForHealthy } from './health-check';

/** 服务定义 */
export interface ServiceDefinition {
  name: string;
  displayName: string;
  port: number;
  healthUrl: string;
  command: string[];
  cwd?: string;
  env?: Record<string, string>;
}

/** 启动结果 */
export interface StartResult {
  success: boolean;
  pid?: number;
  error?: string;
}

/** 停止结果 */
export interface StopResult {
  success: boolean;
  error?: string;
}

/** 服务状态 */
export interface ServiceStatus {
  name: string;
  displayName: string;
  running: boolean;
  pid?: number;
  port: number;
  healthUrl: string;
}

/** 服务管理器配置 */
interface ManagerConfig {
  pidDir: string;
  logDir: string;
  dataDir: string;
}

/**
 * 创建服务管理器
 */
export function createServiceManager(config: ManagerConfig) {
  const { pidDir, logDir, dataDir } = config;

  // 确保目录存在
  fs.ensureDirSync(pidDir);
  fs.ensureDirSync(logDir);

  /**
   * 启动单个服务
   */
  async function startService(service: ServiceDefinition): Promise<StartResult> {
    // 检查是否已在运行
    if (isServiceRunning(pidDir, service.name)) {
      const existingPid = readPid(pidDir, service.name);
      logger.warn(`${service.displayName} 已在运行 (PID: ${existingPid})`);
      return { success: true, pid: existingPid ?? undefined };
    }

    // 准备日志文件
    const logFile = path.join(logDir, `${service.name}.log`);
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });

    // 准备环境变量
    const env = {
      ...process.env,
      DDO_DATA_DIR: dataDir,
      ...service.env,
    };

    // 准备启动选项
    // Windows 不支持 stdio 传入流，使用 'pipe' 然后手动重定向
    const spawnOptions: SpawnOptions = {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    };

    if (service.cwd) {
      spawnOptions.cwd = service.cwd;
    }

    try {
      logger.info(`启动 ${service.displayName}...`);

      // 启动进程
      const child = spawn(service.command[0], service.command.slice(1), spawnOptions);

      // 处理启动错误
      if (!child.pid) {
        logStream.end();
        return {
          success: false,
          error: `无法启动 ${service.displayName}: 进程创建失败`,
        };
      }

      // 重定向输出到日志文件
      if (child.stdout) {
        child.stdout.pipe(logStream, { end: false });
      }
      if (child.stderr) {
        child.stderr.pipe(logStream, { end: false });
      }

      // 写入 PID 文件
      writePid(pidDir, service.name, child.pid);

      // 分离进程
      child.unref();

      logger.debug(`${service.displayName} 进程已启动，PID: ${child.pid}`);

      // 等待服务就绪
      const healthy = await waitForHealthy(service.healthUrl, 30000, 1000);

      if (!healthy) {
        // 启动失败，清理
        killProcess(child.pid, true);
        removePid(pidDir, service.name);
        logStream.end();

        return {
          success: false,
          error: `${service.displayName} 启动超时，请检查日志: ${logFile}`,
        };
      }

      logger.success(`${service.displayName} 已就绪 (PID: ${child.pid}, 端口: ${service.port})`);
      return { success: true, pid: child.pid };
    } catch (err) {
      logStream.end();
      return {
        success: false,
        error: `启动 ${service.displayName} 失败: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * 停止单个服务
   */
  async function stopService(serviceName: string, displayName: string): Promise<StopResult> {
    const pid = readPid(pidDir, serviceName);

    if (pid === null) {
      logger.debug(`${displayName} 未运行（无 PID 文件）`);
      return { success: true };
    }

    if (!isProcessRunning(pid)) {
      logger.debug(`${displayName} 进程已不存在，清理 PID 文件`);
      removePid(pidDir, serviceName);
      return { success: true };
    }

    // 先尝试优雅终止
    logger.info(`停止 ${displayName} (PID: ${pid})...`);
    killProcess(pid, false);

    // 等待进程结束
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts && isProcessRunning(pid)) {
      await sleep(500);
      attempts++;
    }

    // 如果还在运行，强制终止
    if (isProcessRunning(pid)) {
      logger.warn(`${displayName} 未响应，强制终止...`);
      killProcess(pid, true);
      await sleep(500);
    }

    // 清理 PID 文件
    removePid(pidDir, serviceName);

    if (isProcessRunning(pid)) {
      return {
        success: false,
        error: `无法终止 ${displayName} 进程 (PID: ${pid})`,
      };
    }

    logger.success(`${displayName} 已停止`);
    return { success: true };
  }

  /**
   * 获取服务状态
   */
  function getStatus(service: ServiceDefinition): ServiceStatus {
    const pid = readPid(pidDir, service.name);
    const running = pid !== null && isProcessRunning(pid);

    return {
      name: service.name,
      displayName: service.displayName,
      running,
      pid: running ? pid ?? undefined : undefined,
      port: service.port,
      healthUrl: service.healthUrl,
    };
  }

  /**
   * 启动所有服务
   */
  async function startAll(services: ServiceDefinition[]): Promise<{
    success: boolean;
    results: { service: string; result: StartResult }[];
  }> {
    const results: { service: string; result: StartResult }[] = [];

    for (const service of services) {
      const result = await startService(service);
      results.push({ service: service.name, result });

      if (!result.success) {
        // 如果某个服务启动失败，停止已启动的服务
        logger.error(`${service.displayName} 启动失败: ${result.error}`);
        logger.info('正在回滚已启动的服务...');

        // 停止之前已启动的服务（逆序）
        const startedServices = results
          .filter((r) => r.result.success && r.result.pid)
          .reverse();

        for (const started of startedServices) {
          const svc = services.find((s) => s.name === started.service);
          if (svc) {
            await stopService(svc.name, svc.displayName);
          }
        }

        return { success: false, results };
      }
    }

    return { success: true, results };
  }

  /**
   * 停止所有服务
   */
  async function stopAll(services: ServiceDefinition[]): Promise<{
    success: boolean;
    results: { service: string; result: StopResult }[];
  }> {
    const results: { service: string; result: StopResult }[] = [];
    let allSuccess = true;

    // 逆序停止服务
    for (const service of [...services].reverse()) {
      const result = await stopService(service.name, service.displayName);
      results.push({ service: service.name, result });

      if (!result.success) {
        allSuccess = false;
      }
    }

    return { success: allSuccess, results };
  }

  return {
    startService,
    stopService,
    getStatus,
    startAll,
    stopAll,
  };
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
