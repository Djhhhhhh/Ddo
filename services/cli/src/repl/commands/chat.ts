import chalk from 'chalk';
import { ReplCommand, CommandResult, CommandType } from './index';
import { ReplMode } from '../mode';
import { getApiClient } from '../../services/api-client';

export const chatCommand: ReplCommand = {
  name: 'chat',
  description: '与 AI 助手对话',
  usage: '/chat <消息> 或 /chat -m "消息内容"',
  handler: async ({ args, flags, modeManager, setMode }): Promise<CommandResult> => {
    // 如果没有参数，进入持续聊天模式
    if (args.length === 0 && Object.keys(flags).length === 0) {
      setMode(ReplMode.Chat);
      console.log(chalk.green('已进入聊天模式，直接输入消息与 AI 对话'));
      console.log(chalk.gray('提示: 输入 /back 返回默认模式，输入 /exit 退出 REPL'));
      return { shouldContinue: true, outputType: CommandType.Command };
    }

    // 获取消息内容
    let message: string;

    if (flags.m || flags.message) {
      message = String(flags.m || flags.message);
    } else if (args.length > 0) {
      message = args.join(' ');
    } else {
      console.log(chalk.yellow('请输入对话内容'));
      console.log(chalk.gray('用法: /chat <消息> 或 /chat -m "消息内容"'));
      return { shouldContinue: true, outputType: CommandType.Command };
    }

    console.log(chalk.cyan('你:'), message);
    console.log();

    const apiClient = getApiClient();

    try {
      console.log(chalk.gray('正在等待 AI 回复...'));
      console.log();

      const response = await apiClient.chat([
        { role: 'user', content: message }
      ], false);

      console.log(chalk.green('AI:'), response.content);

      if (response.usage) {
        console.log();
        console.log(chalk.gray(`(tokens: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out)`));
      }
    } catch (err) {
      console.log(chalk.red('请求失败:'), err instanceof Error ? err.message : String(err));
    }

    console.log();
    return { shouldContinue: true, outputType: CommandType.Chat };
  },
};
