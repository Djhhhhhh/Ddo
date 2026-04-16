import chalk from 'chalk';
import { ReplCommand, CommandContext } from './index';
import { registry } from './index';

/**
 * 创建快捷命令（不切换模式，只是执行对应子命令）
 * 这些命令原本是模式切换命令，现在改为直接执行对应操作
 */
function createQuickCommand(
  name: string,
  subCommand: string,
  description: string
): ReplCommand {
  return {
    name,
    description,
    usage: `/${name}`,
    handler: async (ctx: CommandContext) => {
      // 直接执行对应子命令
      const cmd = registry.get(subCommand);
      if (cmd) {
        return await cmd.handler(ctx);
      }
      console.log(chalk.red(`命令 ${subCommand} 不存在`));
      return true;
    },
  };
}

/** 知识库快捷命令 */
export const kbCommand = createQuickCommand(
  'kb',
  'kb-list',
  '查看知识库列表'
);

/** 定时任务快捷命令 */
export const timerCommand = createQuickCommand(
  'timer',
  'timer-list',
  '查看定时任务列表'
);

/** MCP 快捷命令 */
export const mcpCommand = createQuickCommand(
  'mcp',
  'mcp-list',
  '查看 MCP 配置列表'
);
