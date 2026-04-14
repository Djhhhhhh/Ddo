/**
 * PID 文件操作模块
 * 管理服务的进程 ID 文件读写
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import logger from '../utils/logger';

/**
 * 写入 PID 文件
 * @param pidDir PID 文件目录
 * @param serviceName 服务名称
 * @param pid 进程 ID
 */
export function writePid(pidDir: string, serviceName: string, pid: number): void {
  const pidFile = path.join(pidDir, `${serviceName}.pid`);
  fs.writeFileSync(pidFile, pid.toString(), 'utf8');
  logger.debug(`写入 PID 文件: ${pidFile} = ${pid}`);
}

/**
 * 读取 PID 文件
 * @param pidDir PID 文件目录
 * @param serviceName 服务名称
 * @returns 进程 ID，如果不存在返回 null
 */
export function readPid(pidDir: string, serviceName: string): number | null {
  const pidFile = path.join(pidDir, `${serviceName}.pid`);

  if (!fs.existsSync(pidFile)) {
    return null;
  }

  try {
    const content = fs.readFileSync(pidFile, 'utf8').trim();
    const pid = parseInt(content, 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

/**
 * 删除 PID 文件
 * @param pidDir PID 文件目录
 * @param serviceName 服务名称
 */
export function removePid(pidDir: string, serviceName: string): void {
  const pidFile = path.join(pidDir, `${serviceName}.pid`);

  if (fs.existsSync(pidFile)) {
    fs.removeSync(pidFile);
    logger.debug(`删除 PID 文件: ${pidFile}`);
  }
}

/**
 * 检查进程是否存活
 * @param pid 进程 ID
 * @returns 是否存活
 */
export function isProcessRunning(pid: number): boolean {
  try {
    // Windows 使用 tasklist，Unix 使用 kill -0
    if (process.platform === 'win32') {
      const { spawnSync } = require('child_process');
      const result = spawnSync('tasklist', ['/FI', `PID eq ${pid}`, '/NH'], {
        encoding: 'utf8',
        timeout: 5000,
      });
      return result.stdout && result.stdout.includes(pid.toString());
    } else {
      // Unix-like: kill -0 检查进程是否存在
      process.kill(pid, 0);
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * 终止进程
 * @param pid 进程 ID
 * @param force 是否强制终止
 * @returns 是否成功终止
 */
export function killProcess(pid: number, force = false): boolean {
  try {
    if (process.platform === 'win32') {
      const { spawnSync } = require('child_process');
      const args = force ? ['/F', '/PID', pid.toString()] : ['/PID', pid.toString()];
      const result = spawnSync('taskkill', args, {
        encoding: 'utf8',
        timeout: 10000,
      });
      return result.status === 0;
    } else {
      const signal = force ? 'SIGKILL' : 'SIGTERM';
      process.kill(pid, signal);
      return true;
    }
  } catch (err) {
    logger.debug(`终止进程 ${pid} 失败: ${err}`);
    return false;
  }
}

/**
 * 检查服务是否正在运行
 * @param pidDir PID 文件目录
 * @param serviceName 服务名称
 * @returns 是否正在运行
 */
export function isServiceRunning(pidDir: string, serviceName: string): boolean {
  const pid = readPid(pidDir, serviceName);
  if (pid === null) {
    return false;
  }
  return isProcessRunning(pid);
}

/**
 * 清理所有 PID 文件
 * @param pidDir PID 文件目录
 */
export function cleanAllPids(pidDir: string): void {
  if (!fs.existsSync(pidDir)) {
    return;
  }

  const files = fs.readdirSync(pidDir);
  for (const file of files) {
    if (file.endsWith('.pid')) {
      fs.removeSync(path.join(pidDir, file));
    }
  }
  logger.debug('清理所有 PID 文件');
}
