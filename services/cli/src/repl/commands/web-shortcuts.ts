import chalk from 'chalk';
import { CommandResult, CommandType, ReplCommand } from './index';
import { openWebPage } from '../../utils/open-url';

const WEB_SHORTCUT_ROUTES = {
  web: '',
  'status-web': '/dashboard',
  'timer-web': '/timer',
  'mcp-web': '/mcp',
  'kb-web': '/knowledge',
} as const;

function createWebShortcutCommand(
  name: keyof typeof WEB_SHORTCUT_ROUTES,
  description: string
): ReplCommand {
  return {
    name,
    description,
    usage: `/${name}`,
    handler: async (): Promise<CommandResult> => {
      const result = await openWebPage({
        route: WEB_SHORTCUT_ROUTES[name],
      });

      if (result.success) {
        console.log(chalk.green(`已打开 Web 页面: ${result.url}`));
      } else {
        console.log(chalk.yellow('打开浏览器失败，请手动访问以下地址:'));
        console.log(chalk.cyan(result.url));
        if (result.error) {
          console.log(chalk.gray(`原因: ${result.error}`));
        }
      }

      return { shouldContinue: true, outputType: CommandType.Command };
    },
  };
}

export const webCommand = createWebShortcutCommand('web', '打开 Dashboard 首页');
export const statusWebCommand = createWebShortcutCommand('status-web', '打开 Dashboard 状态页');
export const timerWebCommand = createWebShortcutCommand('timer-web', '打开 Dashboard 定时任务页');
export const mcpWebCommand = createWebShortcutCommand('mcp-web', '打开 Dashboard MCP 配置页');
export const kbWebCommand = createWebShortcutCommand('kb-web', '打开 Dashboard 知识库页');
