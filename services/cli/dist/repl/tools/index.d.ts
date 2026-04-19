/**
 * 工具注册表 - 统一管理所有工具的触发逻辑
 *
 * 当 NLP/意图识别决定需要执行某个工具时，通过此注册表找到对应的处理函数
 * 新增工具只需要在这里注册即可，无需修改其他代码
 *
 * 使用方法：
 * 1. 导入 registerAllTools 并在 REPL 初始化时调用
 * 2. 通过 executeToolByName(toolName, params, ctx) 执行工具
 */
import type { CommandContext, CommandResult, ReplCommand } from '../commands';
/**
 * 工具处理器接口
 */
export interface ToolHandler {
    /** 工具名称 */
    name: string;
    /** 工具描述 */
    description: string;
    /** 执行工具逻辑 */
    execute(params: Record<string, unknown>, ctx: CommandContext): Promise<CommandResult>;
}
/**
 * 注册工具
 */
export declare function registerTool(handler: ToolHandler): void;
/**
 * 获取工具
 */
export declare function getTool(name: string): ToolHandler | undefined;
/**
 * 检查工具是否存在
 */
export declare function hasTool(name: string): boolean;
/**
 * 执行工具
 */
export declare function executeTool(name: string, params: Record<string, unknown>, ctx: CommandContext): Promise<CommandResult>;
/**
 * 将 ReplCommand 转换为 ToolHandler
 */
export declare function commandToToolHandler(cmd: ReplCommand, description: string): ToolHandler;
//# sourceMappingURL=index.d.ts.map