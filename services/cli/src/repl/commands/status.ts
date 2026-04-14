import chalk from 'chalk';
import { ReplCommand } from './index';

export const statusCommand: ReplCommand = {
  name: 'status',
  description: '查看所有服务状态',
  usage: '/status',
  handler: async () => {
    console.log(chalk.cyan('\n服务状态:'));
    console.log(chalk.gray('─'.repeat(40)));

    const services = [
      { name: 'CLI', status: 'running', version: '0.1.0' },
      { name: 'MySQL', status: 'unknown', version: '-' },
      { name: 'server-go', status: 'unknown', version: '-' },
      { name: 'llm-py', status: 'unknown', version: '-' },
      { name: 'web-ui', status: 'unknown', version: '-' },
    ];

    for (const svc of services) {
      const statusColor =
        svc.status === 'running'
          ? chalk.green
          : svc.status === 'stopped'
            ? chalk.red
            : chalk.gray;
      const statusIcon = svc.status === 'running' ? '●' : svc.status === 'stopped' ? '○' : '?';

      console.log(`  ${statusColor(statusIcon)} ${svc.name.padEnd(12)} ${statusColor(svc.status.padEnd(8))} ${chalk.gray(svc.version)}`);
    }

    console.log();
    console.log(chalk.gray('提示: 状态检查功能将在后续完善'));
    console.log();

    return true;
  },
};
