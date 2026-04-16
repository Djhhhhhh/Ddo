import chalk from 'chalk';
import { ReplCommand } from './index';
import { getApiClient } from '../../services/api-client';

export const statusCommand: ReplCommand = {
  name: 'status',
  description: '查看所有服务状态',
  usage: '/status',
  handler: async () => {
    const apiClient = getApiClient();

    console.log(chalk.cyan('\n服务状态:'));
    console.log(chalk.gray('─'.repeat(40)));

    // 并行调用健康检查和综合指标
    const [healthResult, metricsResult] = await Promise.allSettled([
      apiClient.getHealth(),
      apiClient.getMetrics(),
    ]);

    // server-go 健康状态
    if (healthResult.status === 'fulfilled') {
      console.log(`  ${chalk.green('●')} server-go  ${chalk.green('running')}`);
    } else {
      console.log(`  ${chalk.red('●')} server-go  ${chalk.red('stopped')}`);
    }

    // llm-py 状态（通过 metrics）
    if (metricsResult.status === 'fulfilled') {
      const m = metricsResult.value;
      const llmPyStatus = m.services?.llm_py;
      console.log(`  ${llmPyStatus === 'running' ? chalk.green('●') : chalk.red('●')} llm-py   ${llmPyStatus ? chalk.green(llmPyStatus) : chalk.red('stopped')}`);
    } else {
      console.log(`  ${chalk.red('●')} llm-py   ${chalk.red('unknown')}`);
    }

    // CLI 状态（始终 running，因为 REPL 在运行）
    console.log(`  ${chalk.green('●')} CLI       ${chalk.green('running')}`);

    console.log();
    return true;
  },
};
