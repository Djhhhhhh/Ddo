/**
 * ddo logs 命令实现
 * 查看服务日志
 */
interface LogsCommandOptions {
    dataDir?: string;
    lines?: string;
    follow?: boolean;
    since?: string;
    level?: string;
}
/**
 * 执行 logs 命令
 */
export declare function logsCommand(service: string | undefined, options: LogsCommandOptions): Promise<{
    success: boolean;
    error?: string;
}>;
export {};
//# sourceMappingURL=logs.d.ts.map