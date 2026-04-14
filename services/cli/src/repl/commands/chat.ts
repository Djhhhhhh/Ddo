import chalk from 'chalk';
import { ReplCommand } from './index';
import { ReplMode } from '../mode';

export const chatCommand: ReplCommand = {
  name: 'chat',
  description: '与 AI 助手对话',
  usage: '/chat <消息> 或 /chat -m "消息内容"',
  handler: async ({ args, flags, modeManager, setMode }) => {
    // 如果没有参数，进入持续聊天模式
    if (args.length === 0 && Object.keys(flags).length === 0) {
      setMode(ReplMode.Chat);
      console.log(chalk.green('已进入聊天模式，直接输入消息与 AI 对话'));
      console.log(chalk.gray('提示: 输入 /back 返回默认模式，输入 /exit 退出 REPL'));
      return true;
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
      return true;
    }

    console.log(chalk.cyan('你:'), message);
    console.log();
    console.log(chalk.gray('正在发送请求到 llm-py...'));
    console.log(chalk.yellow('注意: 聊天功能尚未完整实现'));
    console.log();

    return true;
  },
};
