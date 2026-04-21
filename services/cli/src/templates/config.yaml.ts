/**
 * 配置文件模板
 */

import * as path from 'path';
import type { DdoConfig } from '../types';
import { prettyPath } from '../utils/paths';

/**
 * 生成默认配置
 */
export function generateDefaultConfig(dataDir: string): DdoConfig {
  return {
    version: '0.1.0',
    dataDir: dataDir,
    database: {
      driver: 'sqlite',
      path: `${dataDir}/data/go/server-go.db`,
    },
    logging: {
      level: 'info',
      maxSize: '10MB',
      maxFiles: 5,
    },
    endpoints: {
      serverGo: 'http://localhost:8080',
      llmPy: 'http://localhost:8000',
      webUi: 'http://localhost:3000',
    },
  };
}

/**
 * 生成配置文件 YAML 内容
 */
export function generateConfigYaml(config: DdoConfig): string {
  return `# Ddo CLI 配置文件
# 生成时间: ${new Date().toISOString()}
# 版本: ${config.version}

version: "${config.version}"

# 数据目录路径（建议在环境变量或命令行参数中设置）
dataDir: "${prettyPath(config.dataDir)}"

# 数据库配置
database:
  driver: "${config.database.driver}"
  path: "${prettyPath(config.database.path)}"

# 日志配置
logging:
  level: "${config.logging.level}"  # debug, info, warn, error
  maxSize: "${config.logging.maxSize}"     # 单个日志文件最大大小
  maxFiles: ${config.logging.maxFiles}          # 保留日志文件数量

# 服务端点配置（用于服务间通信）
endpoints:
  serverGo: "${config.endpoints.serverGo}"   # server-go 服务地址
  llmPy: "${config.endpoints.llmPy}"         # llm-py 服务地址
  webUi: "${config.endpoints.webUi}"         # web-ui 服务地址
`;
}

/**
 * 生成 server-go 专用配置文件内容
 * server-go 使用不同的配置结构
 */
export function generateServerGoConfigYaml(dataDir: string, serverPort: number, llmPyUrl: string): string {
  const dbPath = path.join(dataDir, 'data', 'go', 'server-go.db');

  return `# server-go 配置文件
# 生成时间: ${new Date().toISOString()}

# 服务器配置
server:
  host: "127.0.0.1"
  port: ${serverPort}
  mode: "release"

# 数据库配置 (SQLite)
database:
  path: "${prettyPath(dbPath)}"
  host: ""
  port: 0
  user: ""
  password: ""
  dbname: ""
  charset: ""

# 日志配置
log:
  level: "info"
  format: "json"
  output: "stdout"

# LLM-Py 服务地址
llm_py_url: "${llmPyUrl}"
`;
}
