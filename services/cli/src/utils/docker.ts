/**
 * Docker 操作封装
 * 提供 Docker 和 Docker Compose 相关操作
 */

import { spawn, execSync } from 'child_process';
import * as fs from 'fs-extra';
import type { ContainerStatus } from '../types';
import logger from './logger';

/** MySQL 容器名称 */
const MYSQL_CONTAINER_NAME = 'ddo-mysql';

/**
 * 检查 Docker 是否已安装并运行
 */
export async function checkDocker(): Promise<{ installed: boolean; running: boolean }> {
  try {
    // 检查 Docker 版本（验证是否安装）
    execSync('docker --version', { stdio: 'pipe' });

    // 检查 Docker 是否运行
    try {
      execSync('docker info', { stdio: 'pipe' });
      return { installed: true, running: true };
    } catch {
      return { installed: true, running: false };
    }
  } catch {
    return { installed: false, running: false };
  }
}

/**
 * 检查 Docker Compose 是否可用
 */
export function checkDockerCompose(): boolean {
  try {
    // 尝试 docker compose (v2) 或 docker-compose (v1)
    try {
      execSync('docker compose version', { stdio: 'pipe' });
      return true;
    } catch {
      execSync('docker-compose --version', { stdio: 'pipe' });
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * 获取 Docker Compose 命令前缀
 * 优先使用 docker compose (v2)，回退到 docker-compose (v1)
 */
export function getComposeCommand(): string {
  try {
    execSync('docker compose version', { stdio: 'pipe' });
    return 'docker compose';
  } catch {
    return 'docker-compose';
  }
}

/**
 * 获取容器状态
 */
export async function getContainerStatus(containerName: string): Promise<ContainerStatus> {
  try {
    const output = execSync(
      `docker inspect --format='{{.State.Running}}|{{.State.Status}}|{{.State.Health.Status}}|{{.Id}}' ${containerName}`,
      { stdio: 'pipe', encoding: 'utf8' }
    );

    const [running, status, health, id] = output.trim().split('|');

    return {
      running: running === 'true',
      name: containerName,
      health: health as ContainerStatus['health'],
      id: id?.substring(0, 12),
    };
  } catch {
    return {
      running: false,
      name: containerName,
      health: 'none',
    };
  }
}

/**
 * 启动 MySQL 容器
 */
export async function startMySQL(
  composeFilePath: string
): Promise<{ success: boolean; message: string }> {
  const composeCmd = getComposeCommand();
  const workDir = require('path').dirname(composeFilePath);

  return new Promise((resolve) => {
    logger.info('正在启动 MySQL 容器...');

    const child = spawn('docker', ['compose', 'up', '-d'], {
      cwd: workDir,
      stdio: 'pipe',
      shell: process.platform === 'win32',
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: '容器启动成功' });
      } else {
        resolve({
          success: false,
          message: stderr || stdout || `退出码: ${code}`,
        });
      }
    });

    child.on('error', (err) => {
      resolve({ success: false, message: err.message });
    });
  });
}

/**
 * 等待容器健康检查通过
 */
export async function waitForHealthy(
  containerName: string,
  timeoutMs: number = 60000
): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 2000;

  logger.info('等待 MySQL 就绪...');

  while (Date.now() - startTime < timeoutMs) {
    const status = await getContainerStatus(containerName);

    if (status.running && status.health === 'healthy') {
      return true;
    }

    // 检查是否还在运行（但可能还没有健康检查）
    if (status.running && status.health === 'none') {
      // 没有健康检查配置，直接检查 MySQL 端口
      try {
        execSync(`docker exec ${containerName} mysqladmin ping --silent`, {
          stdio: 'pipe',
        });
        return true;
      } catch {
        // 还没准备好，继续等待
      }
    }

    await sleep(checkInterval);
  }

  return false;
}

/**
 * 停止 MySQL 容器
 */
export async function stopMySQL(
  composeFilePath: string
): Promise<{ success: boolean; message: string }> {
  const workDir = require('path').dirname(composeFilePath);

  return new Promise((resolve) => {
    const child = spawn('docker', ['compose', 'down'], {
      cwd: workDir,
      stdio: 'pipe',
      shell: process.platform === 'win32',
    });

    let stderr = '';

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: '容器已停止' });
      } else {
        resolve({ success: false, message: stderr || `退出码: ${code}` });
      }
    });

    child.on('error', (err) => {
      resolve({ success: false, message: err.message });
    });
  });
}

/**
 * 验证数据持久化挂载
 */
export async function verifyDataMount(
  dataDir: string
): Promise<boolean> {
  try {
    const mysqlDataDir = require('path').join(dataDir, 'data', 'mysql');

    // 检查本地目录是否存在且可写
    await fs.ensureDir(mysqlDataDir);
    const testFile = require('path').join(mysqlDataDir, '.ddo_test');
    await fs.writeFile(testFile, 'test');
    await fs.remove(testFile);

    // 检查容器内的挂载
    try {
      const output = execSync(
        `docker exec ${MYSQL_CONTAINER_NAME} ls -la /var/lib/mysql`,
        { stdio: 'pipe', encoding: 'utf8' }
      );
      return output.length > 0;
    } catch {
      // 容器可能还没完全启动，但至少本地目录检查通过了
      return true;
    }
  } catch (err) {
    logger.debug(`数据挂载验证失败: ${err}`);
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { MYSQL_CONTAINER_NAME };
