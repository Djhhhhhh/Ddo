/**
 * ddo status 命令实现
 * 显示所有服务的状态
 */
interface StatusOptions {
    dataDir?: string;
}
/**
 * 执行 status 命令
 */
export declare function statusCommand(options?: StatusOptions): Promise<{
    success: boolean;
    error?: string;
}>;
export {};
//# sourceMappingURL=status.d.ts.map