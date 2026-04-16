import chalk from 'chalk';
import { ReplCommand, CommandContext } from './index';
import { getApiClient } from '../../services/api-client';
import { InteractivePrompt, ParameterDef, validateCron, validateUrl } from './prompt-helper';

/**
 * Timer List 命令 - 列出定时任务
 */
export const timerListCommand: ReplCommand = {
  name: 'timer-list',
  aliases: ['tl', 'timer:list'],
  description: '查看定时任务列表',
  usage: '/timer-list',
  handler: async () => {
    const apiClient = getApiClient();

    try {
      const result = await apiClient.getTimers();

      console.log(chalk.cyan('\n定时任务列表:'));
      console.log(chalk.gray('─'.repeat(50)));

      if (result.data.length === 0) {
        console.log(chalk.gray('  暂无定时任务'));
      } else {
        for (const task of result.data) {
          const status = task.enabled ? chalk.green('●') : chalk.gray('○');
          const statusText = task.enabled ? chalk.green('运行中') : chalk.gray('已暂停');
          console.log(`  ${status} ${chalk.cyan(task.uuid.slice(0, 8))}  ${task.name}`);
          console.log(chalk.gray(`    Cron: ${task.cron}  状态: ${statusText}`));
          if (task.next_run) {
            console.log(chalk.gray(`    下次执行: ${task.next_run}`));
          }
        }
      }

      console.log();
      console.log(chalk.gray(`共 ${result.total} 个任务`));
      console.log();
    } catch (err) {
      console.log(chalk.red('获取定时任务失败:'), err instanceof Error ? err.message : String(err));
    }

    return true;
  },
};

/**
 * Timer Add 命令 - 添加定时任务
 * 支持渐进式参数收集：参数充足时直接执行，否则引导用户输入
 */
export const timerAddCommand: ReplCommand = {
  name: 'timer-add',
  aliases: ['ta', 'timer:create'],
  description: '创建定时任务',
  usage: '/timer-add [cron] [url] [method]',
  handler: async (ctx) => {
    const { args, nlpParameters, rl } = ctx;
    const prompt = new InteractivePrompt(rl);

    // 定义参数
    const paramDefs: ParameterDef[] = [
      {
        name: 'name',
        label: '任务名称',
        required: false,
        help: '给任务起个名字',
      },
      {
        name: 'cron',
        label: 'Cron 表达式',
        required: true,
        defaultHint: '0 * * * *',
        validate: validateCron,
        help: '分 时 日 月 周，例如：0 9 * * * 表示每天 9 点',
      },
      {
        name: 'url',
        label: '回调 URL',
        required: true,
        validate: validateUrl,
        help: '定时任务触发时访问的 URL',
      },
      {
        name: 'method',
        label: 'HTTP 方法',
        required: false,
        defaultHint: 'GET',
        help: 'GET/POST/PUT/DELETE',
      },
    ];

    // 从命令行参数和 NLP 参数中提取初始值
    const initialValues: Record<string, string> = {};

    if (args.length >= 1) initialValues.cron = args[0];
    if (args.length >= 2) initialValues.url = args[1];
    if (args.length >= 3) initialValues.method = args[2];

    if (nlpParameters) {
      if (!initialValues.cron && nlpParameters.cron) initialValues.cron = String(nlpParameters.cron);
      if (!initialValues.cron && nlpParameters.schedule) initialValues.cron = String(nlpParameters.schedule);
      if (!initialValues.url && nlpParameters.url) initialValues.url = String(nlpParameters.url);
      if (!initialValues.url && nlpParameters.callback_url) initialValues.url = String(nlpParameters.callback_url);
      if (!initialValues.method && nlpParameters.method) initialValues.method = String(nlpParameters.method);
      if (!initialValues.name && nlpParameters.name) initialValues.name = String(nlpParameters.name);
    }

    // 渐进式收集参数：先收集所有已有值，然后仅对必填参数引导输入
    console.log(chalk.cyan('\n📋 创建定时任务'));
    console.log(chalk.gray('─'.repeat(40)));

    const { params: collected, allCollected } = await prompt.collectRequiredParams(paramDefs, initialValues);

    // 如果所有必填参数都已收集，执行创建
    if (allCollected) {
      const name = collected.name || `Timer ${new Date().toISOString()}`;
      const confirmed = await prompt.confirmSummary('定时任务信息', {
        名称: name,
        Cron: collected.cron!,
        回调URL: collected.url!,
        方法: collected.method || 'GET',
      });

      if (!confirmed) {
        console.log(chalk.yellow('\n已取消创建'));
        return true;
      }

      const apiClient = getApiClient();

      try {
        const result = await apiClient.createTimer({
          name,
          cron: collected.cron!,
          url: collected.url!,
          method: (collected.method as 'GET' | 'POST' | 'PUT' | 'DELETE') || 'GET',
        });

        console.log(chalk.green('\n✓ 定时任务创建成功!'));
        console.log(chalk.gray(`  UUID: ${result.uuid}`));
        console.log(chalk.gray(`  Cron: ${result.cron}`));
        console.log();
      } catch (err) {
        console.log(chalk.red('\n✗ 创建定时任务失败:'), err instanceof Error ? err.message : String(err));
      }
    }

    return true;
  },
};

/**
 * Timer Pause 命令 - 暂停定时任务
 */
export const timerPauseCommand: ReplCommand = {
  name: 'timer-pause',
  aliases: ['tp', 'timer:pause'],
  description: '暂停定时任务',
  usage: '/timer-pause <uuid>',
  handler: async ({ args }) => {
    if (args.length === 0) {
      console.log(chalk.yellow('用法: /timer-pause <uuid>'));
      return true;
    }

    const uuid = args[0];
    const apiClient = getApiClient();

    try {
      await apiClient.pauseTimer(uuid);
      console.log(chalk.green('\n定时任务已暂停'));
      console.log();
    } catch (err) {
      console.log(chalk.red('暂停定时任务失败:'), err instanceof Error ? err.message : String(err));
    }

    return true;
  },
};

/**
 * Timer Resume 命令 - 恢复定时任务
 */
export const timerResumeCommand: ReplCommand = {
  name: 'timer-resume',
  aliases: ['tr', 'timer:resume'],
  description: '恢复定时任务',
  usage: '/timer-resume <uuid>',
  handler: async ({ args }) => {
    if (args.length === 0) {
      console.log(chalk.yellow('用法: /timer-resume <uuid>'));
      return true;
    }

    const uuid = args[0];
    const apiClient = getApiClient();

    try {
      await apiClient.resumeTimer(uuid);
      console.log(chalk.green('\n定时任务已恢复'));
      console.log();
    } catch (err) {
      console.log(chalk.red('恢复定时任务失败:'), err instanceof Error ? err.message : String(err));
    }

    return true;
  },
};

/**
 * Timer Remove 命令 - 删除定时任务
 */
export const timerRemoveCommand: ReplCommand = {
  name: 'timer-remove',
  aliases: ['trm', 'timer:delete'],
  description: '删除定时任务',
  usage: '/timer-remove <uuid>',
  handler: async ({ args }) => {
    if (args.length === 0) {
      console.log(chalk.yellow('用法: /timer-remove <uuid>'));
      return true;
    }

    const uuid = args[0];
    const apiClient = getApiClient();

    try {
      await apiClient.deleteTimer(uuid);
      console.log(chalk.green('\n定时任务已删除'));
      console.log();
    } catch (err) {
      console.log(chalk.red('删除定时任务失败:'), err instanceof Error ? err.message : String(err));
    }

    return true;
  },
};

/**
 * Timer Help 命令
 */
export const timerHelpCommand: ReplCommand = {
  name: 'timer-help',
  aliases: ['th', 'timer:help'],
  description: '显示定时任务帮助',
  usage: '/timer-help',
  handler: async () => {
    console.log(chalk.cyan('\n定时任务管理命令:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`  ${chalk.yellow('timer-list')}      - 列出所有定时任务`);
    console.log(`  ${chalk.yellow('timer-add')}       - 创建定时任务（支持自然语言）`);
    console.log(`  ${chalk.yellow('timer-pause')}     - 暂停定时任务`);
    console.log(`  ${chalk.yellow('timer-resume')}     - 恢复定时任务`);
    console.log(`  ${chalk.yellow('timer-remove')}     - 删除定时任务`);
    console.log(`  ${chalk.yellow('timer-help')}       - 显示帮助`);
    console.log();
    console.log(chalk.gray('示例:'));
    console.log(`  ${chalk.gray('/timer-add "0 9 * * *" "http://localhost:8080/callback" POST')}`);
    console.log(`  ${chalk.gray('帮我创建一个每小时执行的任务')}`);
    console.log();
    return true;
  },
};
