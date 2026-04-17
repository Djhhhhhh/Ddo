import chalk from 'chalk';
import { ReplCommand, CommandResult, CommandType } from './index';

export const exitCommand: ReplCommand = {
  name: 'exit',
  description: '退出 REPL',
  aliases: ['quit', 'q'],
  usage: '/exit 或 /quit 或 /q',
  handler: async ({ rl }): Promise<CommandResult> => {
    console.log(chalk.gray('再见! 👋'));
    rl.close();
    return { shouldContinue: false, outputType: CommandType.Command }; // 返回 false 表示退出 REPL
  },
};

export const backCommand: ReplCommand = {
  name: 'back',
  description: '返回默认模式（从子命令模式）',
  aliases: ['b', 'home'],
  usage: '/back',
  handler: async ({ modeManager, setMode }): Promise<CommandResult> => {
    if (modeManager.isInSubMode()) {
      setMode(modeManager.mode);
      modeManager.backToDefault();
      console.log(chalk.gray('已返回默认模式'));
    } else {
      console.log(chalk.gray('已在默认模式下'));
    }
    return { shouldContinue: true, outputType: CommandType.Command };
  },
};
