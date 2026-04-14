import chalk from 'chalk';
/**
 * REPL 模式枚举
 */
export declare enum ReplMode {
    Default = "default",
    Chat = "chat",
    Kb = "kb",
    Timer = "timer",
    Mcp = "mcp"
}
/**
 * 模式信息
 */
export interface ModeInfo {
    /** 模式名称 */
    name: string;
    /** 显示名称 */
    displayName: string;
    /** 提示符颜色 */
    promptColor: chalk.Chalk;
    /** 描述 */
    description: string;
}
/**
 * 模式管理器
 */
export declare class ModeManager {
    private currentMode;
    /**
     * 获取当前模式
     */
    get mode(): ReplMode;
    /**
     * 设置模式
     */
    setMode(mode: ReplMode): void;
    /**
     * 切换到子命令模式
     */
    enterSubMode(mode: ReplMode): void;
    /**
     * 返回默认模式
     */
    backToDefault(): void;
    /**
     * 获取当前模式信息
     */
    getModeInfo(): ModeInfo;
    /**
     * 获取指定模式信息
     */
    static getModeInfo(mode: ReplMode): ModeInfo;
    /**
     * 获取所有可用模式
     */
    static getAllModes(): ModeInfo[];
    /**
     * 获取提示符字符串
     */
    getPrompt(): string;
    /**
     * 检查是否在子命令模式
     */
    isInSubMode(): boolean;
    /**
     * 从字符串解析模式
     */
    static fromString(str: string): ReplMode | null;
}
//# sourceMappingURL=mode.d.ts.map