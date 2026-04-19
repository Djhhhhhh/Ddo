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

import chalk from 'chalk';
import type { CommandContext, CommandResult, ReplCommand } from '../commands';
import { CommandType } from '../commands';

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
 * 工具注册表
 */
const toolRegistry: Map<string, ToolHandler> = new Map();

/**
 * 注册工具
 */
export function registerTool(handler: ToolHandler): void {
  toolRegistry.set(handler.name, handler);
}

/**
 * 获取工具
 */
export function getTool(name: string): ToolHandler | undefined {
  return toolRegistry.get(name);
}

/**
 * 检查工具是否存在
 */
export function hasTool(name: string): boolean {
  return toolRegistry.has(name);
}

/**
 * 执行工具
 */
export async function executeTool(
  name: string,
  params: Record<string, unknown>,
  ctx: CommandContext
): Promise<CommandResult> {
  const handler = toolRegistry.get(name);
  if (!handler) {
    console.log(chalk.red(`[tools] Unknown tool: ${name}`));
    return { shouldContinue: true, outputType: CommandType.Command };
  }

  try {
    return await handler.execute(params, ctx);
  } catch (err) {
    console.log(chalk.red(`[tools] Tool execution failed: ${err}`));
    return { shouldContinue: true, outputType: CommandType.Command };
  }
}

/**
 * 将 ReplCommand 转换为 ToolHandler
 */
export function commandToToolHandler(
  cmd: ReplCommand,
  description: string
): ToolHandler {
  return {
    name: cmd.name,
    description: description || cmd.description,
    execute: async (params, ctx) => {
      // 将 params 转换为 args 数组
      const args: string[] = [];
      if (params.title) args.push(String(params.title));
      if (params.content) args.push(String(params.content));
      if (params.tags) args.push(String(params.tags));

      // 创建新的 CommandContext，合并参数
      const toolCtx: CommandContext = {
        ...ctx,
        args,
        nlpParameters: params,
      };

      return await cmd.handler(toolCtx);
    },
  };
}
