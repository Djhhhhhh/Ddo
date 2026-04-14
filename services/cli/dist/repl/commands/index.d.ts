/**
 * REPL 命令注册中心
 * 统一管理和分发所有 REPL 命令
 */
import * as readline from 'readline';
import { ReplMode, ModeManager } from '../mode';
import { ParsedCommand } from '../parser';
/**
 * 命令上下文
 */
export interface CommandContext {
    /** 位置参数 */
    args: string[];
    /** 选项（flags） */
    flags: Record<string, string | boolean>;
    /** readline 接口 */
    rl: readline.Interface;
    /** 当前模式 */
    mode: ReplMode;
    /** 模式管理器 */
    modeManager: ModeManager;
    /** 设置模式 */
    setMode: (mode: ReplMode) => void;
    /** 原始解析后的命令 */
    parsed: ParsedCommand;
}
/**
 * 命令定义接口
 */
export interface ReplCommand {
    /** 命令名称 */
    name: string;
    /** 命令描述 */
    description: string;
    /** 使用示例 */
    usage?: string;
    /** 命令别名 */
    aliases?: string[];
    /** 适用的模式（如果不指定，则所有模式都可用） */
    modes?: ReplMode[];
    /**
     * 命令处理器
     * @returns 返回 true 表示继续 REPL，返回 false 表示退出
     */
    handler: (ctx: CommandContext) => Promise<boolean>;
}
/**
 * 命令注册表
 */
declare class CommandRegistry {
    private commands;
    private aliasMap;
    /**
     * 注册命令
     */
    register(command: ReplCommand): void;
    /**
     * 获取命令
     */
    get(name: string): ReplCommand | undefined;
    /**
     * 获取所有命令
     */
    getAll(): ReplCommand[];
    /**
     * 获取所有命令名称（包括别名）
     */
    getAllNames(): string[];
    /**
     * 获取适用于指定模式的命令
     */
    getByMode(mode: ReplMode): ReplCommand[];
    /**
     * 检查命令名称是否存在
     */
    has(name: string): boolean;
}
export declare const registry: CommandRegistry;
/**
   * 执行命令
   */
export declare function executeCommand(parsed: ParsedCommand, rl: readline.Interface, modeManager: ModeManager): Promise<boolean>;
export {};
//# sourceMappingURL=index.d.ts.map