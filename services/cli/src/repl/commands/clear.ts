import { ReplCommand } from './index';
import { showWelcomeAgain } from '../index';

export const clearCommand: ReplCommand = {
  name: 'clear',
  description: '清屏（保留首页提示）',
  aliases: ['cls'],
  usage: '/clear',
  handler: async () => {
    // 重新显示首页信息（包含 clear），而不是单纯的清屏
    showWelcomeAgain();
    return true;
  },
};
