/**
 * 路径解析工具
 * 处理数据目录路径的各种场景
 */

import * as os from 'os';
import * as path from 'path';
import type { PathOptions } from '../types';

/** 默认数据目录名称 */
const DEFAULT_DIR_NAME = '.ddo';

/**
 * 解析数据目录路径
 * 优先级：环境变量 > CLI 参数 > 默认路径
 */
export function resolveDataDir(options: PathOptions = {}): string {
  // 优先级 1: 环境变量 DDO_DATA_DIR
  if (options.envDataDir) {
    return path.resolve(options.envDataDir);
  }

  // 优先级 2: CLI 参数 --data-dir
  if (options.dataDir) {
    return path.resolve(options.dataDir);
  }

  // 优先级 3: 默认路径
  return getDefaultDataDir();
}

/**
 * 获取默认数据目录路径
 * Windows: %USERPROFILE%\.ddo
 * macOS/Linux: ~/.ddo
 */
export function getDefaultDataDir(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, DEFAULT_DIR_NAME);
}

/**
 * 获取 CLI 需要使用的所有路径
 */
export function getPaths(dataDir: string) {
  return {
    // 根目录
    root: dataDir,
    // 配置文件
    config: path.join(dataDir, 'config.yaml'),
    // Docker 配置目录
    docker: path.join(dataDir, 'docker'),
    dockerCompose: path.join(dataDir, 'docker', 'docker-compose.yml'),
    // 服务 PID 文件目录
    services: path.join(dataDir, 'services'),
    // 数据库目录
    database: path.join(dataDir, 'data'),
    // server-go 配置目录
    serverGoConfig: path.join(dataDir, 'server-go'),
    // server-go 配置文件
    serverGoConfigYaml: path.join(dataDir, 'server-go', 'config.yaml'),
    // server-go 数据目录
    goData: path.join(dataDir, 'data', 'go'),
    // server-go SQLite 数据库文件
    serverGoDb: path.join(dataDir, 'data', 'go', 'server-go.db'),
    // MySQL 数据目录
    mysqlData: path.join(dataDir, 'data', 'mysql'),
    // 缓存目录
    cache: path.join(dataDir, 'cache'),
    // 日志目录
    logs: path.join(dataDir, 'logs'),
    // 备份目录
    backup: path.join(dataDir, 'backup'),
  };
}

/**
 * 规范化路径（统一使用正斜杠，便于显示）
 */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * 将绝对路径转换为相对路径（用于显示）
 * 如果是 home 目录下的路径，显示为 ~/xxx
 */
export function prettyPath(p: string): string {
  const homeDir = os.homedir();
  if (p.startsWith(homeDir)) {
    return '~' + p.substring(homeDir.length).replace(/\\/g, '/');
  }
  return normalizePath(p);
}

/**
 * 验证路径是否安全（防止目录遍历攻击）
 */
export function isSafePath(targetPath: string, basePath: string): boolean {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(basePath);
  return resolvedTarget.startsWith(resolvedBase);
}
