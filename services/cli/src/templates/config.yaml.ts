/**
 * 配置文件模板
 */

import * as path from 'path';
import type { DdoConfig } from '../types';
import { getPaths, prettyPath } from '../utils/paths';

function buildLocalUrl(host: string, port: number): string {
  return `http://${host}:${port}`;
}

/**
 * 生成默认配置
 */
export function generateDefaultConfig(dataDir: string): DdoConfig {
  const paths = getPaths(dataDir);
  const serverGoHost = '127.0.0.1';
  const serverGoPort = 50001;
  const llmPyHost = '127.0.0.1';
  const llmPyPort = 50002;
  const webUiHost = '127.0.0.1';
  const webUiPort = 50003;
  const serverGoUrl = buildLocalUrl(serverGoHost, serverGoPort);
  const llmPyUrl = buildLocalUrl(llmPyHost, llmPyPort);
  const webUiUrl = buildLocalUrl(webUiHost, webUiPort);

  return {
    version: '0.2.0',
    dataDir: dataDir,
    database: {
      driver: 'sqlite',
      path: paths.serverGoDb,
    },
    logging: {
      level: 'info',
      maxSize: '10MB',
      maxFiles: 5,
    },
    endpoints: {
      serverGo: serverGoUrl,
      llmPy: llmPyUrl,
      webUi: webUiUrl,
    },
    services: {
      serverGo: {
        host: serverGoHost,
        port: serverGoPort,
        healthPath: '/health',
        url: serverGoUrl,
        configPath: paths.serverGoConfigYaml,
        databasePath: paths.serverGoDb,
      },
      llmPy: {
        host: llmPyHost,
        port: llmPyPort,
        healthPath: '/health',
        url: llmPyUrl,
        configPath: paths.llmPyConfigJson,
        databasePath: paths.llmPyDb,
        ragStorePath: paths.vectorData,
      },
      webUi: {
        host: webUiHost,
        port: webUiPort,
        healthPath: '/__ddo/health',
        url: webUiUrl,
        configPath: paths.webUiConfigJson,
        apiBaseUrl: serverGoUrl,
      },
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

# 服务级配置
services:
  serverGo:
    host: "${config.services.serverGo.host}"
    port: ${config.services.serverGo.port}
    healthPath: "${config.services.serverGo.healthPath}"
    url: "${config.services.serverGo.url}"
    configPath: "${prettyPath(config.services.serverGo.configPath)}"
    databasePath: "${prettyPath(config.services.serverGo.databasePath)}"
  llmPy:
    host: "${config.services.llmPy.host}"
    port: ${config.services.llmPy.port}
    healthPath: "${config.services.llmPy.healthPath}"
    url: "${config.services.llmPy.url}"
    configPath: "${prettyPath(config.services.llmPy.configPath)}"
    databasePath: "${prettyPath(config.services.llmPy.databasePath)}"
    ragStorePath: "${prettyPath(config.services.llmPy.ragStorePath)}"
  webUi:
    host: "${config.services.webUi.host}"
    port: ${config.services.webUi.port}
    healthPath: "${config.services.webUi.healthPath}"
    url: "${config.services.webUi.url}"
    configPath: "${prettyPath(config.services.webUi.configPath)}"
    apiBaseUrl: "${config.services.webUi.apiBaseUrl}"
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

export function generateLLMPyConfigJson(config: DdoConfig): string {
  return JSON.stringify({
    llm_host: config.services.llmPy.host,
    llm_port: config.services.llmPy.port,
    llm_timeout: 30,
    llm_reload: false,
    log_level: config.logging.level.toUpperCase(),
    rag_enabled: true,
    rag_vector_store: 'chroma',
    rag_store_path: config.services.llmPy.ragStorePath,
    rag_embedding_batch_size: 100,
    rag_embedding_dimensions: 1536,
    rag_top_k: 5,
    rag_min_score: 0.5,
    rag_max_context_length: 4000,
    db_path: config.services.llmPy.databasePath,
    db_echo: false,
  }, null, 2);
}

export function generateWebUiConfigJson(config: DdoConfig): string {
  return JSON.stringify({
    host: config.services.webUi.host,
    port: config.services.webUi.port,
    apiBaseUrl: config.services.webUi.apiBaseUrl,
    healthPath: config.services.webUi.healthPath,
  }, null, 2);
}
