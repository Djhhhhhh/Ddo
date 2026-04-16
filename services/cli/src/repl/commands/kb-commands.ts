import chalk from 'chalk';
import { ReplCommand, CommandContext } from './index';
import { getApiClient } from '../../services/api-client';
import { InteractivePrompt, ParameterDef } from './prompt-helper';

/**
 * KB List 命令 - 列出知识库
 */
export const kbListCommand: ReplCommand = {
  name: 'kb-list',
  aliases: ['kl', 'kb:list'],
  description: '查看知识库列表',
  usage: '/kb-list',
  handler: async () => {
    const apiClient = getApiClient();

    try {
      const result = await apiClient.getKnowledgeList({ page: 1, page_size: 20 });

      console.log(chalk.cyan('\n知识库列表:'));
      console.log(chalk.gray('─'.repeat(40)));

      if (result.data.length === 0) {
        console.log(chalk.gray('  暂无知识库'));
      } else {
        for (const item of result.data) {
          const tags = item.tags?.length > 0 ? ` [${item.tags.join(', ')}]` : '';
          console.log(`  ${chalk.cyan(item.uuid.slice(0, 8))}  ${item.title}${tags}`);
          console.log(chalk.gray(`    ${item.content.slice(0, 60)}${item.content.length > 60 ? '...' : ''}`));
        }
      }

      console.log();
      console.log(chalk.gray(`共 ${result.total} 条`));
      console.log();
    } catch (err) {
      console.log(chalk.red('获取知识库失败:'), err instanceof Error ? err.message : String(err));
    }

    return true;
  },
};

/**
 * KB Add 命令 - 添加知识库
 * 支持渐进式参数收集
 */
export const kbAddCommand: ReplCommand = {
  name: 'kb-add',
  aliases: ['ka', 'kb:create'],
  description: '添加知识库词条',
  usage: '/kb-add [title] [content]',
  handler: async (ctx) => {
    const { args, nlpParameters, rl } = ctx;
    const prompt = new InteractivePrompt(rl);

    const paramDefs: ParameterDef[] = [
      {
        name: 'title',
        label: '标题',
        required: true,
        help: '词条标题',
      },
      {
        name: 'content',
        label: '内容',
        required: true,
        help: '词条内容',
      },
      {
        name: 'tags',
        label: '标签',
        required: false,
        help: '逗号分隔的标签',
      },
    ];

    const initialValues: Record<string, string> = {};
    if (args.length >= 1) initialValues.title = args[0];
    if (args.length >= 2) initialValues.content = args.slice(1).join(' ');
    if (nlpParameters) {
      if (!initialValues.title && nlpParameters.title) initialValues.title = String(nlpParameters.title);
      if (!initialValues.content && nlpParameters.content) initialValues.content = String(nlpParameters.content);
    }

    console.log(chalk.cyan('\n📋 添加知识库词条'));
    console.log(chalk.gray('─'.repeat(40)));

    const { params: collected, allCollected } = await prompt.collectRequiredParams(paramDefs, initialValues);

    if (allCollected) {
      const tags = collected.tags ? collected.tags.split(',').map(t => t.trim()) : [];
      const confirmed = await prompt.confirmSummary('词条信息', {
        标题: collected.title,
        内容: collected.content,
        标签: tags.join(', ') || '(无)',
      });

      if (!confirmed) {
        console.log(chalk.yellow('\n已取消添加'));
        return true;
      }

      const apiClient = getApiClient();

      try {
        const result = await apiClient.createKnowledge({
          title: collected.title!,
          content: collected.content!,
          tags,
        });

        console.log(chalk.green('\n✓ 知识库词条添加成功!'));
        console.log(chalk.gray(`  UUID: ${result.uuid}`));
        console.log();
      } catch (err) {
        console.log(chalk.red('\n✗ 添加知识库失败:'), err instanceof Error ? err.message : String(err));
      }
    }

    return true;
  },
};

/**
 * KB Search 命令 - 搜索知识库
 */
export const kbSearchCommand: ReplCommand = {
  name: 'kb-search',
  aliases: ['ks', 'kb:search'],
  description: '搜索知识库',
  usage: '/kb-search <查询内容>',
  handler: async ({ args }) => {
    if (args.length === 0) {
      console.log(chalk.yellow('用法: /kb-search <查询内容>'));
      return true;
    }

    const query = args.join(' ');
    const apiClient = getApiClient();

    try {
      console.log(chalk.gray(`搜索中: ${query}...`));

      const result = await apiClient.searchKnowledge({ query, top_k: 5 });

      console.log(chalk.cyan('\n搜索结果:'));
      console.log(chalk.gray('─'.repeat(40)));

      if (result.results.length === 0) {
        console.log(chalk.gray('  未找到相关结果'));
      } else {
        for (const item of result.results) {
          console.log(`  ${chalk.yellow(item.score.toFixed(2))}  ${item.content.slice(0, 80)}${item.content.length > 80 ? '...' : ''}`);
        }
      }

      console.log();
    } catch (err) {
      console.log(chalk.red('搜索失败:'), err instanceof Error ? err.message : String(err));
    }

    return true;
  },
};

/**
 * KB Remove 命令 - 删除知识库
 */
export const kbRemoveCommand: ReplCommand = {
  name: 'kb-remove',
  aliases: ['krm', 'kb:delete'],
  description: '删除知识库',
  usage: '/kb-remove <UUID>',
  handler: async ({ args }) => {
    if (args.length === 0) {
      console.log(chalk.yellow('用法: /kb-remove <UUID>'));
      return true;
    }

    const uuid = args[0];
    const apiClient = getApiClient();

    try {
      await apiClient.deleteKnowledge(uuid);
      console.log(chalk.green('\n知识库删除成功!'));
      console.log();
    } catch (err) {
      console.log(chalk.red('删除知识库失败:'), err instanceof Error ? err.message : String(err));
    }

    return true;
  },
};

/**
 * KB Help 命令
 */
export const kbHelpCommand: ReplCommand = {
  name: 'kb-help',
  aliases: ['kh', 'kb:help'],
  description: '显示知识库帮助',
  usage: '/kb-help',
  handler: async () => {
    console.log(chalk.cyan('\n知识库管理命令:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`  ${chalk.yellow('kb-list')}        - 列出所有知识库`);
    console.log(`  ${chalk.yellow('kb-add')}         - 添加知识库（支持自然语言）`);
    console.log(`  ${chalk.yellow('kb-search')}      - 搜索知识库`);
    console.log(`  ${chalk.yellow('kb-remove')}      - 删除知识库`);
    console.log(`  ${chalk.yellow('kb-help')}        - 显示帮助`);
    console.log();
    console.log(chalk.gray('示例:'));
    console.log(`  ${chalk.gray('/kb-add "我的笔记" "这是一段重要的内容"')}`);
    console.log(`  ${chalk.gray('帮我添加一条知识库：标题是"如何设置定时任务"，内容是"使用 cron 表达式..."')}`);
    console.log();
    return true;
  },
};
