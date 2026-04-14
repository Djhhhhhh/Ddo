/**
 * ddo start 命令实现
 * 启动所有 Ddo 服务并进入 REPL
 */
interface StartOptions {
    dataDir?: string;
    skipRepl?: boolean;
}
/**
 * 执行 start 命令
 */
export declare function startCommand(options?: StartOptions): Promise<{
    success: boolean;
    error?: string;
}>;
export {};
//# sourceMappingURL=start.d.ts.map