/**
 * 路径解析工具
 * 处理数据目录路径的各种场景
 */
import type { PathOptions } from '../types';
/**
 * 解析数据目录路径
 * 优先级：环境变量 > CLI 参数 > 默认路径
 */
export declare function resolveDataDir(options?: PathOptions): string;
/**
 * 获取默认数据目录路径
 * Windows: %USERPROFILE%\.ddo
 * macOS/Linux: ~/.ddo
 */
export declare function getDefaultDataDir(): string;
/**
 * 获取 CLI 需要使用的所有路径
 */
export declare function getPaths(dataDir: string): {
    root: string;
    config: string;
    docker: string;
    dockerCompose: string;
    services: string;
    database: string;
    serverGoConfig: string;
    serverGoConfigYaml: string;
    llmPyConfig: string;
    llmPyConfigJson: string;
    webUiConfig: string;
    webUiConfigJson: string;
    goData: string;
    serverGoDb: string;
    llmData: string;
    llmPyDb: string;
    vectorData: string;
    mysqlData: string;
    cache: string;
    logs: string;
    backup: string;
};
/**
 * 规范化路径（统一使用正斜杠，便于显示）
 */
export declare function normalizePath(p: string): string;
/**
 * 将绝对路径转换为相对路径（用于显示）
 * 如果是 home 目录下的路径，显示为 ~/xxx
 */
export declare function prettyPath(p: string): string;
/**
 * 验证路径是否安全（防止目录遍历攻击）
 */
export declare function isSafePath(targetPath: string, basePath: string): boolean;
//# sourceMappingURL=paths.d.ts.map