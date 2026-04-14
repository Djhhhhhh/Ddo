/**
 * 日志输出工具
 * 提供统一的终端输出格式和颜色
 */
import type { LogLevel } from '../types';
declare class Logger {
    private level;
    private silent;
    setLevel(level: LogLevel): void;
    setSilent(silent: boolean): void;
    private shouldLog;
    debug(message: string): void;
    info(message: string): void;
    success(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    /** 输出带标题的信息块 */
    section(title: string): void;
    /** 输出分隔线 */
    divider(): void;
    /** 输出空行 */
    newline(): void;
    /** 格式化路径输出 */
    path(p: string): string;
    /** 格式化命令输出 */
    command(cmd: string): string;
    /** 格式化代码/文件名输出 */
    code(text: string): string;
}
export declare const logger: Logger;
export default logger;
//# sourceMappingURL=logger.d.ts.map