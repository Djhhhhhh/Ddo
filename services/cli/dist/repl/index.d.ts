/**
 * REPL 交互模式
 * Ddo CLI 的主交互界面
 */
/**
 * REPL 选项
 */
export interface ReplOptions {
    /** 服务状态信息 */
    services: {
        name: string;
        displayName: string;
        running: boolean;
        port: number;
    }[];
}
/**
 * 启动 REPL 交互模式
 */
export declare function startRepl(options: ReplOptions): Promise<void>;
/**
 * 重新显示欢迎信息（用于 clear 命令）
 */
export declare function showWelcomeAgain(): void;
export { parseCommand } from './parser';
export { ModeManager, ReplMode, type ModeInfo } from './mode';
export { registry, type CommandContext, type ReplCommand } from './commands';
//# sourceMappingURL=index.d.ts.map