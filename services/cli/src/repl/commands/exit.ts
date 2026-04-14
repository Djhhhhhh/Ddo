import chalk from 'chalk';
import { ReplCommand } from './index';

export const exitCommand: ReplCommand = {
  name: 'exit',
  description: '退出 REPL',
  aliases: ['quit', 'q'],
  usage: '/exit 或 /quit 或 /q',
  handler: async ({ rl }) => {
    console.log(chalk.gray('再见! 👋'));
    rl.close();
    return false; // 返回 false 表示退出 REPL
  },
};

export const backCommand: ReplCommand = {
  name: 'back',
  description: '返回默认模式（从子命令模式）',
  aliases: ['b', 'home'],
  usage: '/back',
  handler: async ({ modeManager, setMode }) => {
    if (modeManager.isInSubMode()) {
      setMode(modeManager.mode);
      modeManager.backToDefault();
      console.log(chalk.gray('已返回默认模式'));
    } else {
      console.log(chalk.gray('已在默认模式下'));
    }
    return true;
  },
};
