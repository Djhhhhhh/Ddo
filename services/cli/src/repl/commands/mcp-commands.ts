import chalk from 'chalk';
import { ReplCommand, CommandResult, CommandType } from './index';
import { getApiClient, type McpTool } from '../../services/api-client';
import { InteractivePrompt, ParameterDef } from './prompt-helper';

type ToolSchemaProperty = {
  type?: string | string[];
  description?: string;
  default?: unknown;
  enum?: unknown[];
  properties?: Record<string, ToolSchemaProperty>;
  items?: ToolSchemaProperty;
};

type ToolSchema = {
  type?: string | string[];
  properties?: Record<string, ToolSchemaProperty>;
  required?: string[];
};

function normalizeTransportType(type: string): 'stdio' | 'http' | 'streamable_http' | 'sse' {
  const normalized = type.trim().toLowerCase().replace(/-/g, '_');
  if (normalized === 'stdio' || normalized === 'http' || normalized === 'streamable_http' || normalized === 'sse') {
    return normalized;
  }
  return 'http';
}

function getTransportIcon(type: string): string {
  if (type === 'stdio') {
    return '⬡';
  }
  if (type === 'streamable_http') {
    return '⬢';
  }
  if (type === 'http') {
    return '⬢';
  }
  return '◈';
}

function parseJsonArguments(input: string): Record<string, unknown> {
  if (!input.trim()) {
    return {};
  }

  const parsed = JSON.parse(input);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('工具参数必须是 JSON 对象');
  }

  return parsed as Record<string, unknown>;
}

function stringifyValue(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function validateTransportType(value: string): string | null {
  const normalized = value.trim().toLowerCase().replace(/-/g, '_');
  if (!['stdio', 'http', 'streamable_http', 'sse'].includes(normalized)) {
    return '类型必须是 stdio | http | streamable_http | sse 之一';
  }
  return null;
}

function validateStdioCommand(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return '命令不能为空';
  }
  if (trimmed === 'cmd' || trimmed === 'cmd.exe' || trimmed.startsWith('cmd ') || trimmed.startsWith('cmd.exe ')) {
    return 'stdio 请直接填写可执行命令，不要使用 cmd /c';
  }
  return null;
}

function validateUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'URL 必须以 http:// 或 https:// 开头';
    }
    return null;
  } catch {
    return '请输入有效的 URL';
  }
}

function parseShellArgs(input: string): string[] {
  return input.trim().split(/\s+/).filter(Boolean);
}

function parseKeyValuePairs(input: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of input.split(',').map((part) => part.trim()).filter(Boolean)) {
    const index = item.indexOf('=');
    if (index <= 0) {
      throw new Error(`环境变量格式错误: ${item}，请使用 KEY=VALUE`);
    }
    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();
    if (!key) {
      throw new Error(`环境变量格式错误: ${item}`);
    }
    result[key] = value;
  }
  return result;
}

function parseJsonRecord(input: string, label: string): Record<string, string> {
  if (!input.trim()) {
    return {};
  }
  const parsed = JSON.parse(input);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label}必须是 JSON 对象`);
  }
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, String(value)])
  );
}

function getToolSchema(tool: McpTool): ToolSchema {
  const schema = tool.inputSchema;
  if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
    return schema as ToolSchema;
  }
  return {};
}

function getToolProperties(tool: McpTool): Record<string, ToolSchemaProperty> {
  return getToolSchema(tool).properties || {};
}

function getSchemaType(prop: ToolSchemaProperty): string {
  if (Array.isArray(prop.type)) {
    return prop.type.find((item) => item !== 'null') || prop.type[0] || 'string';
  }
  if (prop.type) {
    return prop.type;
  }
  if (prop.properties) {
    return 'object';
  }
  return 'string';
}

function isRequiredProperty(tool: McpTool, key: string): boolean {
  return !!getToolSchema(tool).required?.includes(key);
}

function parseBooleanInput(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }
  throw new Error('请输入 true/false 或 yes/no');
}

function coerceArrayItemValue(value: string, itemSchema?: ToolSchemaProperty): unknown {
  const trimmed = value.trim();
  const itemType = itemSchema ? getSchemaType(itemSchema) : 'string';
  if (itemType === 'number' || itemType === 'integer') {
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      throw new Error(`数组值 ${trimmed} 不是有效数字`);
    }
    return parsed;
  }
  if (itemType === 'boolean') {
    return parseBooleanInput(trimmed);
  }
  return trimmed;
}

function parseToolArgumentValue(prop: ToolSchemaProperty, value: string): unknown {
  const type = getSchemaType(prop);
  if (type === 'number' || type === 'integer') {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error('请输入有效数字');
    }
    return parsed;
  }
  if (type === 'boolean') {
    return parseBooleanInput(value);
  }
  if (type === 'array') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    if (trimmed.startsWith('[')) {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        throw new Error('数组参数必须是 JSON 数组');
      }
      return parsed;
    }
    return trimmed
      .split(',')
      .map((item) => coerceArrayItemValue(item, prop.items))
      .filter((item) => item !== '');
  }
  if (type === 'object') {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('参数必须是 JSON 对象');
    }
    return parsed;
  }
  if (prop.enum && !prop.enum.some((item) => String(item) === value)) {
    throw new Error(`可选值: ${prop.enum.map((item) => String(item)).join(' | ')}`);
  }
  return value;
}

function validateToolArgumentInput(prop: ToolSchemaProperty): (value: string) => string | null {
  return (value: string) => {
    try {
      parseToolArgumentValue(prop, value);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };
}

function buildToolPromptDefs(tool: McpTool): ParameterDef[] {
  return Object.entries(getToolProperties(tool)).map(([key, prop]) => {
    const type = getSchemaType(prop);
    const extraHints: string[] = [];
    if (prop.enum && prop.enum.length > 0) {
      extraHints.push(`可选值: ${prop.enum.map((item) => String(item)).join(' | ')}`);
    } else if (type === 'array') {
      extraHints.push('逗号分隔，或输入 JSON 数组');
    } else if (type === 'object') {
      extraHints.push('请输入 JSON 对象');
    } else if (type === 'boolean') {
      extraHints.push('true/false');
    }

    return {
      name: key,
      label: key,
      required: isRequiredProperty(tool, key),
      defaultHint: prop.default !== undefined ? String(prop.default) : undefined,
      help: [prop.description, extraHints.join('，')].filter(Boolean).join(' - '),
      validate: validateToolArgumentInput(prop),
    };
  });
}

function printToolSchema(schema: Record<string, unknown> | undefined): void {
  if (!schema) {
    console.log(chalk.gray('    参数: 未提供 inputSchema'));
    return;
  }

  console.log(chalk.gray('    inputSchema:'));
  for (const line of stringifyValue(schema).split('\n')) {
    console.log(chalk.gray(`      ${line}`));
  }
}

export const mcpListCommand: ReplCommand = {
  name: 'mcp-list',
  aliases: ['ml', 'mcp:list'],
  description: '列出所有 MCP 配置',
  usage: '/mcp-list',
  handler: async (): Promise<CommandResult> => {
    const apiClient = getApiClient();

    try {
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
          const typeIcon = getTransportIcon(mcp.type);
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

export const mcpAddCommand: ReplCommand = {
  name: 'mcp-add',
  aliases: ['ma', 'mcp:create'],
  description: '添加 MCP 配置',
  usage: '/mcp-add [name] [type] [config]',
  handler: async ({ args, nlpParameters, rl }): Promise<CommandResult> => {
    const prompt = new InteractivePrompt(rl);

    const baseParamDefs: ParameterDef[] = [
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
        help: 'stdio | http | streamable_http | sse',
        validate: validateTransportType,
      },
    ];

    const initialValues: Record<string, string> = {};
    if (args.length >= 1) initialValues.name = args[0];
    if (args.length >= 2) initialValues.type = args[1];
    if (nlpParameters) {
      if (!initialValues.name && nlpParameters.name) initialValues.name = String(nlpParameters.name);
      if (!initialValues.type && nlpParameters.type) initialValues.type = String(nlpParameters.type);
    }
    const legacyConfig = args.length >= 3 ? args.slice(2).join(' ') : (nlpParameters?.config ? String(nlpParameters.config) : '');

    console.log(chalk.cyan('\n📋 添加 MCP 配置'));
    console.log(chalk.gray('─'.repeat(40)));

    const { params: collected, allCollected } = await prompt.collectRequiredParams(baseParamDefs, initialValues);

    if (allCollected) {
      const apiClient = getApiClient();

      try {
        let data: {
          name: string;
          type: string;
          command?: string;
          args?: string[];
          url?: string;
          headers?: Record<string, string>;
          env?: Record<string, string>;
        };

        const normalizedType = normalizeTransportType(collected.type || 'http');

        if (normalizedType === 'stdio' && collected.name) {
          console.log(chalk.gray('stdio 模式请直接填写可执行命令，不要使用 cmd /c'));
          const stdioInitial: Record<string, string> = {};
          if (legacyConfig) {
            const parts = parseShellArgs(legacyConfig);
            if (parts.length > 0) {
              stdioInitial.command = parts[0];
              if (parts.length > 1) {
                stdioInitial.args = parts.slice(1).join(' ');
              }
            }
          }
          if (nlpParameters?.command) stdioInitial.command = String(nlpParameters.command);
          if (nlpParameters?.args) {
            stdioInitial.args = Array.isArray(nlpParameters.args)
              ? nlpParameters.args.map((item) => String(item)).join(' ')
              : String(nlpParameters.args);
          }
          if (nlpParameters?.env) {
            stdioInitial.env = typeof nlpParameters.env === 'string'
              ? nlpParameters.env
              : stringifyValue(nlpParameters.env);
          }

          const stdioParams = await prompt.collectParams([
            {
              name: 'command',
              label: '命令',
              required: true,
              help: '例如 npx、python、uvx',
              validate: validateStdioCommand,
            },
            {
              name: 'args',
              label: '参数',
              required: false,
              help: '空格分隔，例如 -y @modelcontextprotocol/server-filesystem',
            },
            {
              name: 'env',
              label: '环境变量',
              required: false,
              help: '逗号分隔，格式 KEY=VALUE',
              validate: (value: string) => {
                try {
                  parseKeyValuePairs(value);
                  return null;
                } catch (error) {
                  return error instanceof Error ? error.message : String(error);
                }
              },
            },
          ], stdioInitial);

          const confirmed = await prompt.confirmSummary('MCP 配置信息', {
            名称: collected.name,
            类型: normalizedType,
            命令: stdioParams.command,
            参数: stdioParams.args,
            环境变量: stdioParams.env,
          });

          if (!confirmed) {
            console.log(chalk.yellow('\n已取消添加'));
            return { shouldContinue: true, outputType: CommandType.Command };
          }

          data = {
            name: collected.name || '',
            type: normalizedType,
            command: stdioParams.command || undefined,
            args: stdioParams.args ? parseShellArgs(stdioParams.args) : undefined,
            env: stdioParams.env ? parseKeyValuePairs(stdioParams.env) : undefined,
          };
        } else {
          const httpInitial: Record<string, string> = {};
          if (legacyConfig) {
            httpInitial.url = legacyConfig;
          }
          if (nlpParameters?.url) httpInitial.url = String(nlpParameters.url);
          if (nlpParameters?.headers) httpInitial.headers = stringifyValue(nlpParameters.headers);

          const httpParams = await prompt.collectParams([
            {
              name: 'url',
              label: 'URL',
              required: true,
              help: 'MCP 服务地址',
              validate: validateUrl,
            },
            {
              name: 'headers',
              label: '请求头',
              required: false,
              defaultHint: '{}',
              help: '可选，JSON 对象',
              validate: (value: string) => {
                try {
                  parseJsonRecord(value, '请求头');
                  return null;
                } catch (error) {
                  return error instanceof Error ? error.message : String(error);
                }
              },
            },
          ], httpInitial);

          const confirmed = await prompt.confirmSummary('MCP 配置信息', {
            名称: collected.name,
            类型: normalizedType,
            URL: httpParams.url,
            请求头: httpParams.headers,
          });

          if (!confirmed) {
            console.log(chalk.yellow('\n已取消添加'));
            return { shouldContinue: true, outputType: CommandType.Command };
          }

          data = {
            name: collected.name || '',
            type: normalizedType,
            url: httpParams.url || undefined,
            headers: httpParams.headers ? parseJsonRecord(httpParams.headers, '请求头') : undefined,
          };
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

export const mcpTestCommand: ReplCommand = {
  name: 'mcp-test',
  aliases: ['mt', 'mcp:test'],
  description: '测试 MCP 连接与初始化状态',
  usage: '/mcp-test <uuid>',
  handler: async ({ args, rl }): Promise<CommandResult> => {
    const prompt = new InteractivePrompt(rl);

    console.log(chalk.cyan('\n📋 测试 MCP 连接'));
    console.log(chalk.gray('─'.repeat(40)));

    const { params } = await prompt.collectRequiredParams([
      {
        name: 'uuid',
        label: 'MCP UUID',
        required: true,
        help: '待测试的 MCP 配置 UUID',
      },
    ], args[0] ? { uuid: args[0] } : undefined);

    const uuid = params.uuid;
    if (!uuid) {
      return { shouldContinue: true, outputType: CommandType.Command };
    }

    const apiClient = getApiClient();

    try {
      console.log(chalk.gray('正在测试 MCP 连接与初始化...'));
      const result = await apiClient.testMcpConnection(uuid);

      const reachable = result.reachable ?? false;
      const initializeSucceeded = result.initializeSucceeded ?? false;
      const protocolReady = result.protocolReady ?? false;

      console.log(reachable && initializeSucceeded
        ? chalk.green('\n连接测试成功!')
        : chalk.yellow('\n连接测试未完全通过'));
      console.log(chalk.gray(`状态: ${result.status || 'unknown'}`));
      console.log(chalk.gray(`Transport 可达: ${reachable ? 'yes' : 'no'}`));
      console.log(chalk.gray(`Initialize 成功: ${initializeSucceeded ? 'yes' : 'no'}`));
      console.log(chalk.gray(`协议就绪: ${protocolReady ? 'yes' : 'no'}`));
      if (typeof result.latencyMs === 'number') {
        console.log(chalk.gray(`耗时: ${result.latencyMs}ms`));
      }
      if (result.serverProtocolVersion) {
        console.log(chalk.gray(`协议版本: ${result.serverProtocolVersion}`));
      }
      if (result.serverInfo) {
        console.log(chalk.gray(`服务信息: ${stringifyValue(result.serverInfo)}`));
      }
      if (result.tools && result.tools.length > 0) {
        console.log(chalk.gray('可用工具:'));
        for (const tool of result.tools) {
          if (typeof tool === 'string') {
            console.log(`  - ${tool}`);
          } else {
            console.log(`  - ${tool.name}${tool.title ? ` (${tool.title})` : ''}`);
          }
        }
      }
      if (result.error) {
        console.log(chalk.yellow(`错误信息: ${result.error}`));
      }
      console.log();
    } catch (err) {
      console.log(chalk.red('测试 MCP 连接失败:'), err instanceof Error ? err.message : String(err));
    }

    return { shouldContinue: true, outputType: CommandType.Command };
  },
};

export const mcpToolsCommand: ReplCommand = {
  name: 'mcp-tools',
  aliases: ['mts', 'mcp:tools'],
  description: '查看 MCP 工具列表与参数 Schema',
  usage: '/mcp-tools <uuid>',
  handler: async ({ args, rl }): Promise<CommandResult> => {
    const prompt = new InteractivePrompt(rl);

    console.log(chalk.cyan('\n📋 查看 MCP 工具列表'));
    console.log(chalk.gray('─'.repeat(40)));

    const { params } = await prompt.collectRequiredParams([
      {
        name: 'uuid',
        label: 'MCP UUID',
        required: true,
        help: '要查看的 MCP 配置 UUID',
      },
    ], args[0] ? { uuid: args[0] } : undefined);

    const uuid = params.uuid;
    if (!uuid) {
      return { shouldContinue: true, outputType: CommandType.Command };
    }

    const apiClient = getApiClient();

    try {
      console.log(chalk.gray('正在获取 MCP 工具列表...'));
      const result = await apiClient.getMcpTools(uuid);
      const tools = result.tools || [];

      console.log(chalk.cyan('\nMCP 工具列表:'));
      console.log(chalk.gray('─'.repeat(40)));

      if (tools.length === 0) {
        console.log(chalk.gray('  当前 MCP 未返回任何工具'));
      } else {
        for (const tool of tools) {
          console.log(`  ${chalk.yellow(tool.name)}${tool.title ? chalk.gray(` (${tool.title})`) : ''}`);
          if (tool.description) {
            console.log(chalk.gray(`    描述: ${tool.description}`));
          }
          printToolSchema(tool.inputSchema);
        }
      }

      console.log();
    } catch (err) {
      console.log(chalk.red('获取 MCP 工具列表失败:'), err instanceof Error ? err.message : String(err));
    }

    return { shouldContinue: true, outputType: CommandType.Command };
  },
};

export const mcpCallCommand: ReplCommand = {
  name: 'mcp-call',
  aliases: ['mcall', 'mcp:call'],
  description: '测试调用指定 MCP 工具',
  usage: '/mcp-call <uuid> <toolName> [jsonArguments]',
  handler: async ({ args, rl }): Promise<CommandResult> => {
    const prompt = new InteractivePrompt(rl);
    const apiClient = getApiClient();

    console.log(chalk.cyan('\n📋 调用 MCP 工具'));
    console.log(chalk.gray('─'.repeat(40)));

    const { params: baseParams } = await prompt.collectRequiredParams([
      {
        name: 'uuid',
        label: 'MCP UUID',
        required: true,
        help: '要调用的 MCP 配置 UUID',
      },
    ], args[0] ? { uuid: args[0] } : undefined);

    const uuid = baseParams.uuid;
    if (!uuid) {
      return { shouldContinue: true, outputType: CommandType.Command };
    }

    let tools: McpTool[] = [];
    try {
      tools = (await apiClient.getMcpTools(uuid)).tools || [];
    } catch {
      console.log(chalk.yellow('获取工具列表失败，将继续按手动输入处理'));
    }

    if (tools.length > 0) {
      console.log(chalk.gray('可用工具:'));
      for (const tool of tools) {
        console.log(chalk.gray(`  - ${tool.name}${tool.title ? ` (${tool.title})` : ''}`));
      }
    }

    const { params: toolParams } = await prompt.collectRequiredParams([
      {
        name: 'toolName',
        label: '工具名称',
        required: true,
        help: '要调用的工具名',
        validate: (value: string) => {
          if (tools.length === 0) {
            return null;
          }
          return tools.some((tool) => tool.name === value)
            ? null
            : `工具不存在，可选值: ${tools.map((tool) => tool.name).join(' | ')}`;
        },
      },
    ], args[1] ? { toolName: args[1] } : undefined);

    const toolName = toolParams.toolName;
    if (!toolName) {
      return { shouldContinue: true, outputType: CommandType.Command };
    }

    const matchedTool = tools.find((tool) => tool.name === toolName);
    let parsedArgs: Record<string, unknown> = {};
    const rawArgs = args.slice(2).join(' ');

    if (rawArgs) {
      parsedArgs = parseJsonArguments(rawArgs);
    } else if (matchedTool && Object.keys(getToolProperties(matchedTool)).length > 0) {
      console.log(chalk.cyan('\n🧩 工具参数'));
      if (matchedTool.description) {
        console.log(chalk.gray(matchedTool.description));
      }
      const collected = await prompt.collectParams(buildToolPromptDefs(matchedTool));
      for (const [key, prop] of Object.entries(getToolProperties(matchedTool))) {
        const rawValue = collected[key];
        if (!rawValue) {
          continue;
        }
        parsedArgs[key] = parseToolArgumentValue(prop, rawValue);
      }
    } else {
      const collected = await prompt.collectParams([
        {
          name: 'arguments',
          label: '工具参数 JSON',
          required: false,
          defaultHint: '{}',
          help: '未获取到工具 schema，直接回车表示空参数',
          validate: (value: string) => {
            try {
              parseJsonArguments(value);
              return null;
            } catch (error) {
              return error instanceof Error ? error.message : String(error);
            }
          },
        },
      ]);
      parsedArgs = parseJsonArguments(collected.arguments || '{}');
    }

    const confirmed = await prompt.confirmSummary('工具调用信息', {
      UUID: uuid,
      工具: toolName,
      参数: stringifyValue(parsedArgs),
    });

    if (!confirmed) {
      console.log(chalk.yellow('\n已取消调用'));
      return { shouldContinue: true, outputType: CommandType.Command };
    }

    try {
      console.log(chalk.gray(`正在调用工具 ${toolName}...`));
      const result = await apiClient.callMcpTool(uuid, toolName, parsedArgs);

      console.log(chalk.cyan('\n工具调用结果:'));
      console.log(chalk.gray('─'.repeat(40)));
      console.log(chalk.gray(`工具: ${toolName}`));
      console.log(chalk.gray(`是否错误: ${result.isError ? 'yes' : 'no'}`));
      if (result.content !== undefined) {
        console.log(chalk.gray('content:'));
        console.log(stringifyValue(result.content));
      }
      if (result.structuredContent !== undefined) {
        console.log(chalk.gray('structuredContent:'));
        console.log(stringifyValue(result.structuredContent));
      }
      if (result.raw !== undefined) {
        console.log(chalk.gray('raw:'));
        console.log(stringifyValue(result.raw));
      }
      if (result.error) {
        console.log(chalk.red(`error: ${result.error}`));
      }
      console.log();
    } catch (err) {
      console.log(chalk.red('调用 MCP 工具失败:'), err instanceof Error ? err.message : String(err));
    }

    return { shouldContinue: true, outputType: CommandType.Command };
  },
};

export const mcpRemoveCommand: ReplCommand = {
  name: 'mcp-remove',
  aliases: ['mrm', 'mcp:delete'],
  description: '删除 MCP 配置',
  usage: '/mcp-remove <uuid>',
  handler: async ({ args, rl }): Promise<CommandResult> => {
    const prompt = new InteractivePrompt(rl);

    console.log(chalk.cyan('\n📋 删除 MCP 配置'));
    console.log(chalk.gray('─'.repeat(40)));

    const { params } = await prompt.collectRequiredParams([
      {
        name: 'uuid',
        label: 'MCP UUID',
        required: true,
        help: '要删除的 MCP 配置 UUID',
      },
    ], args[0] ? { uuid: args[0] } : undefined);

    const uuid = params.uuid;
    if (!uuid) {
      return { shouldContinue: true, outputType: CommandType.Command };
    }

    const confirmed = await prompt.confirmSummary('删除确认', {
      UUID: uuid,
    });

    if (!confirmed) {
      console.log(chalk.yellow('\n已取消删除'));
      return { shouldContinue: true, outputType: CommandType.Command };
    }

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

export const mcpConnectCommand: ReplCommand = {
  name: 'mcp-connect',
  aliases: ['mc', 'mcp:connect'],
  description: '建立并保持 MCP 连接',
  usage: '/mcp-connect <uuid>',
  handler: async ({ args, rl }): Promise<CommandResult> => {
    const prompt = new InteractivePrompt(rl);

    console.log(chalk.cyan('\n📋 建立 MCP 连接'));
    console.log(chalk.gray('─'.repeat(40)));

    const { params } = await prompt.collectRequiredParams([
      {
        name: 'uuid',
        label: 'MCP UUID',
        required: true,
        help: '要连接的 MCP 配置 UUID',
      },
    ], args[0] ? { uuid: args[0] } : undefined);

    const uuid = params.uuid;
    if (!uuid) {
      return { shouldContinue: true, outputType: CommandType.Command };
    }

    const apiClient = getApiClient();

    try {
      console.log(chalk.gray('正在建立连接...'));
      const result = await apiClient.connectMcp(uuid);
      console.log(chalk.green('\n连接建立成功!'));
      console.log(chalk.gray(`状态: ${result.status}`));
      console.log();
    } catch (err) {
      console.log(chalk.red('建立连接失败:'), err instanceof Error ? err.message : String(err));
    }

    return { shouldContinue: true, outputType: CommandType.Command };
  },
};

export const mcpDisconnectCommand: ReplCommand = {
  name: 'mcp-disconnect',
  aliases: ['mdc', 'mcp:disconnect'],
  description: '断开 MCP 连接',
  usage: '/mcp-disconnect <uuid>',
  handler: async ({ args, rl }): Promise<CommandResult> => {
    const prompt = new InteractivePrompt(rl);

    console.log(chalk.cyan('\n📋 断开 MCP 连接'));
    console.log(chalk.gray('─'.repeat(40)));

    const { params } = await prompt.collectRequiredParams([
      {
        name: 'uuid',
        label: 'MCP UUID',
        required: true,
        help: '要断开连接的 MCP 配置 UUID',
      },
    ], args[0] ? { uuid: args[0] } : undefined);

    const uuid = params.uuid;
    if (!uuid) {
      return { shouldContinue: true, outputType: CommandType.Command };
    }

    const apiClient = getApiClient();

    try {
      console.log(chalk.gray('正在断开连接...'));
      const result = await apiClient.disconnectMcp(uuid);
      console.log(chalk.green('\n连接已断开!'));
      console.log(chalk.gray(`状态: ${result.status}`));
      console.log();
    } catch (err) {
      console.log(chalk.red('断开连接失败:'), err instanceof Error ? err.message : String(err));
    }

    return { shouldContinue: true, outputType: CommandType.Command };
  },
};

export const mcpHelpCommand: ReplCommand = {
  name: 'mcp-help',
  aliases: ['mh', 'mcp:help'],
  description: '显示 MCP 帮助',
  usage: '/mcp-help',
  handler: async (): Promise<CommandResult> => {
    console.log(chalk.cyan('\nMCP 管理命令:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`  ${chalk.yellow('mcp-list')}         - 列出所有 MCP 配置`);
    console.log(`  ${chalk.yellow('mcp-add')}          - 添加 MCP 配置（支持渐进式交互）`);
    console.log(`  ${chalk.yellow('mcp-test')}         - 测试 MCP 连接与初始化`);
    console.log(`  ${chalk.yellow('mcp-connect')}      - 建立并保持 MCP 连接`);
    console.log(`  ${chalk.yellow('mcp-disconnect')}   - 断开 MCP 连接`);
    console.log(`  ${chalk.yellow('mcp-tools')}        - 查看 MCP 工具列表与参数 Schema`);
    console.log(`  ${chalk.yellow('mcp-call')}         - 测试调用指定 MCP 工具`);
    console.log(`  ${chalk.yellow('mcp-remove')}       - 删除 MCP 配置`);
    console.log(`  ${chalk.yellow('mcp-help')}         - 显示帮助`);
    console.log();
    console.log(chalk.gray('示例:'));
    console.log(`  ${chalk.gray('/mcp-add "my-mcp" stdio "npx -y some-server"')}`);
    console.log(`  ${chalk.gray('/mcp-add "my-mcp" streamable_http "http://localhost:3000/mcp"')}`);
    console.log(`  ${chalk.gray('/mcp-connect 12345678-1234-1234-1234-123456789abc')}`);
    console.log(`  ${chalk.gray('/mcp-disconnect 12345678-1234-1234-1234-123456789abc')}`);
    console.log(`  ${chalk.gray('/mcp-tools 12345678-1234-1234-1234-123456789abc')}`);
    console.log(`  ${chalk.gray('/mcp-call 12345678-1234-1234-1234-123456789abc get_weather "{\"city\":\"Shanghai\"}"')}`);
    console.log();
    return { shouldContinue: true, outputType: CommandType.Command };
  },
};
