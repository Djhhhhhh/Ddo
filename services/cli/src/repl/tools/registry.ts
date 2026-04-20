/**
 * 工具注册 - 在应用启动时注册所有可用的工具
 *
 * 使用方法：
 * 1. 在 commands/index.ts 或相关文件中导入 registerAllTools
 * 2. 在 REPL 初始化时调用 registerAllTools()
 * 3. 通过 executeTool(toolName, params, ctx) 执行工具
 */

import chalk from 'chalk';
import { registerTool, getTool, commandToToolHandler } from './index';
import { kbAddCommand, kbSearchCommand, kbListCommand, kbRemoveCommand } from '../commands/kb-commands';
import { timerAddCommand, timerAddIntervalCommand, timerAddDelayCommand, timerListCommand } from '../commands/timer-commands';
import { mcpAddCommand, mcpListCommand } from '../commands/mcp-commands';
import { CommandType } from '../commands';
import type { CommandContext } from '../commands';

/**
 * 工具名称别名映射
 * 支持 NLP/意图识别返回的各种命名格式
 */
const TOOL_ALIASES: Record<string, string> = {
  // 知识库
  'knowledge.add': 'kb-add',
  'kb.add': 'kb-add',
  'knowledge.search': 'kb-search',
  'kb.search': 'kb-search',
  'knowledge.list': 'kb-list',
  'kb.list': 'kb-list',
  'knowledge.remove': 'kb-remove',
  'kb.remove': 'kb-remove',

  // 定时任务
  'timer.create': 'timer-add',
  'timer.add': 'timer-add',
  'timer.create.interval': 'timer-add-interval',
  'timer.add.interval': 'timer-add-interval',
  'timer.create.delay': 'timer-add-delay',
  'timer.add.delay': 'timer-add-delay',
  'timer.list': 'timer-list',

  // MCP
  'mcp.setup': 'mcp-add',
  'mcp.add': 'mcp-add',
  'mcp.list': 'mcp-list',
};

/**
 * 解析工具名称（支持别名）
 */
export function resolveToolName(name: string): string {
  return TOOL_ALIASES[name] || name;
}

/**
 * 注册所有工具
 */
export function registerAllTools(): void {
  console.log(chalk.gray('[tools] Registering all tools...'));

  // === 知识库工具 ===
  registerTool(commandToToolHandler(kbAddCommand, '添加知识库词条'));
  registerTool(commandToToolHandler(kbSearchCommand, '搜索知识库'));
  registerTool(commandToToolHandler(kbListCommand, '列出知识库'));
  registerTool(commandToToolHandler(kbRemoveCommand, '删除知识库'));

  // === 定时任务工具 ===
  registerTool(commandToToolHandler(timerAddCommand, '创建定时任务'));
  registerTool(commandToToolHandler(timerAddIntervalCommand, '创建间隔重复任务'));
  registerTool(commandToToolHandler(timerAddDelayCommand, '创建一次性延迟任务'));
  registerTool(commandToToolHandler(timerListCommand, '列出定时任务'));

  // === MCP 工具 ===
  registerTool(commandToToolHandler(mcpAddCommand, '添加 MCP 配置'));
  registerTool(commandToToolHandler(mcpListCommand, '列出 MCP 配置'));

  console.log(chalk.gray(`[tools] All tools registered`));
}

/**
 * 执行工具（支持别名）
 */
export async function executeToolByName(
  name: string,
  params: Record<string, unknown>,
  ctx: CommandContext
) {
  const resolvedName = resolveToolName(name);
  const handler = getTool(resolvedName);

  if (!handler) {
    console.log(chalk.red(`[tools] Unknown tool: ${name} (resolved: ${resolvedName})`));
    return { shouldContinue: true, outputType: CommandType.Command };
  }

  return await handler.execute(params, ctx);
}
