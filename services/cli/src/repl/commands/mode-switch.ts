import chalk from 'chalk';
import { ReplCommand } from './index';
import { ReplMode } from '../mode';

/**
 * 模式切换命令工厂
 */
function createModeCommand(
  name: string,
  mode: ReplMode,
  description: string,
  welcomeMessage: string
): ReplCommand {
  return {
    name,
    description,
    usage: `/${name}`,
    handler: async ({ setMode, modeManager }) => {
      if (modeManager.mode === mode) {
        console.log(chalk.gray(`已在 ${name} 模式`));
        return true;
      }

      setMode(mode);
      console.log();
      console.log(chalk.cyan(welcomeMessage));
      console.log(chalk.gray('提示: 输入 /back 返回默认模式，/help 查看可用命令'));
      console.log();
      return true;
    },
  };
}

/** 知识库模式 */
export const kbCommand = createModeCommand(
  'kb',
  ReplMode.Kb,
  '进入知识库管理模式',
  '📚 已进入知识库管理模式\n\n可用命令:\n  list           - 列出知识库\n  add <n> <p>    - 添加知识库\n  search <q>     - 搜索\n  remove <n>     - 删除知识库'
);

/** 定时任务模式 */
export const timerCommand = createModeCommand(
  'timer',
  ReplMode.Timer,
  '进入定时任务管理模式',
  '⏰ 已进入定时任务管理模式\n\n可用命令:\n  list           - 列出定时任务\n  add <c> <cmd>  - 添加定时任务\n  remove <id>    - 删除定时任务'
);

/** MCP 模式 */
export const mcpCommand = createModeCommand(
  'mcp',
  ReplMode.Mcp,
  '进入 MCP 管理模式',
  '🔌 已进入 MCP 管理模式\n\n可用命令:\n  list           - 列出 MCP 服务\n  add <n> <url>  - 添加 MCP 服务\n  remove <n>     - 删除 MCP 服务'
);
