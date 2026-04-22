/**
 * Ddo CLI 类型定义
 */

export interface ServiceEndpointConfig {
  host: string;
  port: number;
  healthPath: string;
  url: string;
}

export interface ServerGoServiceConfig extends ServiceEndpointConfig {
  configPath: string;
  databasePath: string;
}

export interface LLMPyServiceConfig extends ServiceEndpointConfig {
  configPath: string;
  databasePath: string;
  ragStorePath: string;
}

export interface WebUiServiceConfig extends ServiceEndpointConfig {
  configPath: string;
  apiBaseUrl: string;
}

/** Ddo 配置结构 */
export interface DdoConfig {
  /** 配置版本 */
  version: string;
  /** 数据目录路径 */
  dataDir: string;
  /** 数据库配置 */
  database: {
    driver: 'sqlite';
    path: string;
  };
  /** 日志配置 */
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    maxSize: string;
    maxFiles: number;
  };
  /** 服务端点配置 */
  endpoints: {
    serverGo: string;
    llmPy: string;
    webUi: string;
  };
  /** 服务级配置 */
  services: {
    serverGo: ServerGoServiceConfig;
    llmPy: LLMPyServiceConfig;
    webUi: WebUiServiceConfig;
  };
}

/** 路径解析选项 */
export interface PathOptions {
  /** 命令行指定的数据目录 */
  dataDir?: string;
  /** 环境变量中的数据目录 */
  envDataDir?: string;
}

/** Docker 容器状态 */
export interface ContainerStatus {
  /** 容器是否正在运行 */
  running: boolean;
  /** 容器名称 */
  name: string;
  /** 健康状态 */
  health?: 'healthy' | 'unhealthy' | 'starting' | 'none';
  /** 容器 ID */
  id?: string;
}

/** 初始化结果 */
export interface InitResult {
  /** 是否成功 */
  success: boolean;
  /** 数据目录路径 */
  dataDir: string;
  /** 执行的操作 */
  actions: string[];
  /** 错误信息 */
  error?: string;
}

/** 日志级别 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** CLI 命令上下文 */
export interface CommandContext {
  /** 数据目录路径 */
  dataDir: string;
  /** 是否静默模式 */
  silent?: boolean;
  /** 日志级别 */
  logLevel?: LogLevel;
}

/** 服务状态 */
export interface ServiceStatusInfo {
  /** 服务名称 */
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 是否运行中 */
  running: boolean;
  /** 进程ID */
  pid?: number;
  /** 服务端口 */
  port: number;
  /** 健康检查地址 */
  healthUrl: string;
}

/** 日志查看选项 */
export interface LogOptions {
  /** 服务名称 */
  service?: string;
  /** 显示行数（默认 100） */
  lines?: number;
  /** 是否实时跟踪 */
  follow?: boolean;
  /** 时间过滤（如 "1h", "30m"） */
  since?: string;
  /** 日志级别过滤 */
  level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

/** 日志条目 */
export interface LogEntry {
  /** 时间戳 */
  timestamp?: Date;
  /** 日志级别 */
  level?: string;
  /** 服务名称 */
  service: string;
  /** 日志消息 */
  message: string;
}
