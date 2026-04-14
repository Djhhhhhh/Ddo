/**
 * 日志读取工具
 * 提供日志文件的读取、过滤、实时跟踪功能
 */
import type { LogEntry } from '../types';
/** 支持的服务列表 */
export declare const SUPPORTED_SERVICES: string[];
/** 服务显示名称映射 */
export declare const SERVICE_DISPLAY_NAMES: Record<string, string>;
/** 判断是否为有效的服务名 */
export declare function isValidService(service: string): boolean;
/** 获取日志文件路径 */
export declare function getLogFilePath(logsDir: string, service: string): string;
/** 解析 since 参数，返回毫秒时间戳 */
export declare function parseSinceTime(since: string): number;
/** 尝试从日志行解析时间戳和级别 */
export declare function parseLogLine(line: string): {
    timestamp?: Date;
    level?: string;
    message: string;
};
/** 检查日志级别是否匹配 */
export declare function matchLogLevel(lineLevel: string | undefined, filterLevel: string): boolean;
/** 读取文件最后 N 行 */
export declare function readLastLines(filePath: string, lines: number, since?: string, level?: string): Promise<string[]>;
/** 高亮日志级别 */
export declare function highlightLogLevel(line: string): string;
/** 实时跟踪日志文件 */
export declare function followLogFile(filePath: string, since?: string, level?: string, onLine?: (line: string) => void, abortSignal?: AbortSignal): Promise<void>;
/** 获取 MySQL 容器日志 */
export declare function getMySQLLogs(containerName: string, lines: number, follow: boolean, since?: string): Promise<{
    output: string;
    process?: any;
}>;
/** 读取多个服务的日志 */
export declare function readMultipleLogs(logsDir: string, services: string[], lines: number, since?: string, level?: string): Promise<LogEntry[]>;
//# sourceMappingURL=log-reader.d.ts.map