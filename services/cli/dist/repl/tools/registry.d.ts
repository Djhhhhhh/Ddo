/**
 * 工具注册 - 在应用启动时注册所有可用的工具
 *
 * 使用方法：
 * 1. 在 commands/index.ts 或相关文件中导入 registerAllTools
 * 2. 在 REPL 初始化时调用 registerAllTools()
 * 3. 通过 executeTool(toolName, params, ctx) 执行工具
 */
import type { CommandContext } from '../commands';
/**
 * 解析工具名称（支持别名）
 */
export declare function resolveToolName(name: string): string;
/**
 * 注册所有工具
 */
export declare function registerAllTools(): void;
/**
 * 执行工具（支持别名）
 */
export declare function executeToolByName(name: string, params: Record<string, unknown>, ctx: CommandContext): Promise<import("../commands").CommandResult>;
//# sourceMappingURL=registry.d.ts.map