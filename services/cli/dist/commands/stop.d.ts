/**
 * ddo stop 命令实现
 * 停止所有 Ddo 服务
 */
interface StopOptions {
    dataDir?: string;
}
/**
 * 执行 stop 命令
 */
export declare function stopCommand(options?: StopOptions): Promise<{
    success: boolean;
    error?: string;
}>;
export {};
//# sourceMappingURL=stop.d.ts.map