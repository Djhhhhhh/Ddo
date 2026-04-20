import chalk from 'chalk';
import { ReplCommand, CommandContext, CommandResult, CommandType } from './index';
import { getApiClient } from '../../services/api-client';
import { InteractivePrompt, ParameterDef } from './prompt-helper';

/**
 * MCP List 命令 - 列出 MCP 配置
 */
export const mcpListCommand: ReplCommand = {
  name: 'mcp-list',
  aliases: ['ml', 'mcp:list'],
  description: '查看 MCP 配置列表',
  usage: '/mcp-list',
  handler: async (): Promise<CommandResult> => {
    const apiClient = getApiClient();

    try {
      // server-go 返回 { data: { total, items } }
      const result = await apiClient.getMcpList() as any;
      const items = result.items || result.mcps || [];
      const total = result.total || items.length;

      console.log(chalk.cyan('\nMCP 配置列表:'));
      console.log(chalk.gray('─'.repeat(40)));

      if (items.length === 0) {
        console.log(chalk.gray('  暂无 MCP 配置'));
      } else {
        for (const mcp of items) {
          const status = mcp.status === 'connected' || mcp.status === 'active'
            ? chalk.green('●')
            : chalk.red('●');
          const statusText = mcp.status === 'connected' || mcp.status === 'active'
            ? chalk.green('已连接')
            : chalk.red('未连接');
          const typeIcon = mcp.type === 'stdio' ? '⬡' : mcp.type === 'http' ? '⬢' : '◈';
          console.log(`  ${status} ${chalk.cyan(mcp.uuid.slice(0, 8))}  ${mcp.name} ${chalk.gray(typeIcon)} ${mcp.type}`);
          console.log(chalk.gray(`    状态: ${statusText}`));
          if (mcp.url) {
            console.log(chalk.gray(`    URL: ${mcp.url}`));
          }
        }
      }

      console.log();
      console.log(chalk.gray(`共 ${total} 个配置`));
      console.log();
    } catch (err) {
      console.log(chalk.red('获取 MCP 配置失败:'), err instanceof Error ? err.message : String(err));
    }

    return { shouldContinue: true, outputType: CommandType.Command };
  },
};

/**
 * MCP Add 命令 - 添加 MCP 配置
 * 支持渐进式参数收集
 */
export const mcpAddCommand: ReplCommand = {
  name: 'mcp-add',
  aliases: ['ma', 'mcp:create'],
  description: '添加 MCP 配置',
  usage: '/mcp-add [name] [type] [config]',
  handler: async (ctx): Promise<CommandResult> => {
    const { args, nlpParameters, rl } = ctx;
    const prompt = new InteractivePrompt(rl);

    const paramDefs: ParameterDef[] = [
      {
        name: 'name',
        label: '名称',
        required: true,
        help: 'MCP 配置名称',
      },
      {
        name: 'type',
        label: '类型',
        required: true,
        help: 'stdio | http | sse',
      },
      {
        name: 'config',
        label: '连接配置',
        required: true,
        help: 'stdio 填启动命令，http/sse 填服务 URL',
      },
    ];

    const initialValues: Record<string, string> = {};
    if (args.length >= 1) initialValues.name = args[0];
    if (args.length >= 2) initialValues.type = args[1];
    if (args.length >= 3) initialValues.config = args.slice(2).join(' ');
    if (nlpParameters) {
      if (!initialValues.name && nlpParameters.name) initialValues.name = String(nlpParameters.name);
      if (!initialValues.type && nlpParameters.type) initialValues.type = String(nlpParameters.type);
      if (!initialValues.config && nlpParameters.config) initialValues.config = String(nlpParameters.config);
    }

    console.log(chalk.cyan('\n📋 添加 MCP 配置'));
    console.log(chalk.gray('─'.repeat(40)));

    const { params: collected, allCollected } = await prompt.collectRequiredParams(paramDefs, initialValues);

    if (allCollected) {
      const confirmed = await prompt.confirmSummary('MCP 配置信息', {
        名称: collected.name,
        类型: collected.type,
        连接配置: collected.config,
      });

      if (!confirmed) {
        console.log(chalk.yellow('\n已取消添加'));
        return { shouldContinue: true, outputType: CommandType.Command };
      }

      const apiClient = getApiClient();

      try {
        let data: {
          name: string;
          type: string;
          command?: string;
          args?: string[];
          url?: string;
        };

        if (collected.type === 'stdio' && collected.config && collected.name) {
          const parts = collected.config.split(' ');
          data = {
            name: collected.name,
            type: collected.type,
            command: parts[0],
            args: parts.slice(1),
          };
        } else if (collected.name && collected.type) {
          data = {
            name: collected.name,
            type: collected.type,
            url: collected.config || undefined,
          };
        } else {
          console.log(chalk.red('\n✗ 参数不完整'));
          return { shouldContinue: true, outputType: CommandType.Command };
        }

        const result = await apiClient.createMcp(data);

        console.log(chalk.green('\n✓ MCP 配置创建成功!'));
        console.log(chalk.gray(`  UUID: ${result.uuid}`));
        console.log(chalk.gray(`  类型: ${result.type}`));
        console.log();
      } catch (err) {
        console.log(chalk.red('\n✗ 创建 MCP 配置失败:'), err instanceof Error ? err.message : String(err));
      }
    }

    return { shouldContinue: true, outputType: CommandType.Command };
  },
};

/**
 * MCP Test 命令 - 测试 MCP 连接
 */
export const mcpTestCommand: ReplCommand = {
  name: 'mcp-test',
  aliases: ['mt', 'mcp:test'],
  description: '测试 MCP 连接',
  usage: '/mcp-test <uuid>',
  handler: async ({ args }): Promise<CommandResult> => {
    if (args.length === 0) {
      console.log(chalk.yellow('用法: /mcp-test <uuid>'));
      return { shouldContinue: true, outputType: CommandType.Command };
    }

    const uuid = args[0];
    const apiClient = getApiClient();

    try {
      console.log(chalk.gray('正在测试连接...'));

      const result = await apiClient.testMcp(uuid);

      console.log(chalk.green('\n连接测试成功!'));
      console.log(chalk.gray(`状态: ${result.status}`));
      if (result.tools && result.tools.length > 0) {
        console.log(chalk.gray('可用工具:'));
        for (const tool of result.tools) {
          console.log(`  - ${tool}`);
        }
      }
      console.log();
    } catch (err) {
      console.log(chalk.red('测试 MCP 连接失败:'), err instanceof Error ? err.message : String(err));
    }

    return { shouldContinue: true, outputType: CommandType.Command };
  },
};

/**
 * MCP Remove 命令 - 删除 MCP 配置
 */
export const mcpRemoveCommand: ReplCommand = {
  name: 'mcp-remove',
  aliases: ['mrm', 'mcp:delete'],
  description: '删除 MCP 配置',
  usage: '/mcp-remove <uuid>',
  handler: async ({ args }): Promise<CommandResult> => {
    if (args.length === 0) {
      console.log(chalk.yellow('用法: /mcp-remove <uuid>'));
      return { shouldContinue: true, outputType: CommandType.Command };
    }

    const uuid = args[0];
    const apiClient = getApiClient();

    try {
      await apiClient.deleteMcp(uuid);
      console.log(chalk.green('\nMCP 配置已删除'));
      console.log();
    } catch (err) {
      console.log(chalk.red('删除 MCP 配置失败:'), err instanceof Error ? err.message : String(err));
    }

    return { shouldContinue: true, outputType: CommandType.Command };
  },
};

/**
 * MCP Help 命令
 */
export const mcpHelpCommand: ReplCommand = {
  name: 'mcp-help',
  aliases: ['mh', 'mcp:help'],
  description: '显示 MCP 帮助',
  usage: '/mcp-help',
  handler: async (): Promise<CommandResult> => {
    console.log(chalk.cyan('\nMCP 管理命令:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`  ${chalk.yellow('mcp-list')}        - 列出所有 MCP 配置`);
    console.log(`  ${chalk.yellow('mcp-add')}         - 添加 MCP 配置（支持自然语言）`);
    console.log(`  ${chalk.yellow('mcp-test')}        - 测试 MCP 连接`);
    console.log(`  ${chalk.yellow('mcp-remove')}      - 删除 MCP 配置`);
    console.log(`  ${chalk.yellow('mcp-help')}        - 显示帮助`);
    console.log();
    console.log(chalk.gray('示例:'));
    console.log(`  ${chalk.gray('/mcp-add "my-mcp" stdio "npx -y some-server"')}`);
    console.log(`  ${chalk.gray('/mcp-add "my-mcp" http "http://localhost:3000/mcp"')}`);
    console.log();
    return { shouldContinue: true, outputType: CommandType.Command };
  },
};
