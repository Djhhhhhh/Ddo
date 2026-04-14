/**
 * REPL 命令解析器
 * 支持解析带引号的参数、选项（flags）和命令
 */

/**
 * 解析后的命令结构
 */
export interface ParsedCommand {
  /** 命令名 */
  name: string;
  /** 位置参数 */
  args: string[];
  /** 选项（flags） */
  flags: Record<string, string | boolean>;
}

/**
 * 分词结果
 */
interface TokenizeResult {
  tokens: string[];
  errors: string[];
}

/**
 * 将输入字符串分词
 * 支持双引号包裹的字符串（支持转义）
 */
export function tokenize(input: string): TokenizeResult {
  const tokens: string[] = [];
  const errors: string[] = [];
  let current = '';
  let inQuote = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escaped) {
      // 处理转义字符
      if (char === 'n') {
        current += '\n';
      } else if (char === 't') {
        current += '\t';
      } else if (char === 'r') {
        current += '\r';
      } else {
        current += char;
      }
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inQuote = !inQuote;
      continue;
    }

    if (char === ' ' && !inQuote) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  // 处理最后一个 token
  if (current.length > 0) {
    tokens.push(current);
  }

  // 检查引号是否匹配
  if (inQuote) {
    errors.push('未闭合的引号');
  }

  return { tokens, errors };
}

/**
 * 判断是否为选项（flag）
 */
function isFlag(token: string): boolean {
  return token.startsWith('-') && token.length > 1;
}

/**
 * 解析选项
 * 支持 -a、-abc、--long、--long=value 格式
 */
function parseFlag(
  token: string,
  nextToken: string | undefined,
  consumed: { value: boolean }
): { key: string; value: string | boolean } | null {
  // 长选项 --long 或 --long=value
  if (token.startsWith('--')) {
    const equalIndex = token.indexOf('=');
    if (equalIndex !== -1) {
      // --key=value 格式
      const key = token.slice(2, equalIndex);
      const value = token.slice(equalIndex + 1);
      return { key, value };
    } else {
      const key = token.slice(2);
      // 检查下一个 token 是否是值（不是选项）
      if (nextToken && !isFlag(nextToken)) {
        consumed.value = true;
        return { key, value: nextToken };
      }
      return { key, value: true };
    }
  }

  // 短选项 -a 或 -abc
  if (token.startsWith('-') && token.length > 1) {
    const flags = token.slice(1);

    // 单个短选项 -a
    if (flags.length === 1) {
      if (nextToken && !isFlag(nextToken)) {
        consumed.value = true;
        return { key: flags, value: nextToken };
      }
      return { key: flags, value: true };
    }

    // 组合短选项 -abc，每个都是布尔值
    // 只有最后一个可以有值
    const lastFlag = flags[flags.length - 1];
    if (nextToken && !isFlag(nextToken)) {
      consumed.value = true;
      return { key: lastFlag, value: nextToken };
    }

    // 没有值时，返回第一个作为代表，其他需要在 flags 中展开
    return { key: flags, value: true };
  }

  return null;
}

/**
 * 解析命令字符串
 */
export function parseCommand(input: string): ParsedCommand & { errors: string[] } {
  const trimmed = input.trim();

  if (trimmed === '') {
    return { name: '', args: [], flags: {}, errors: [] };
  }

  const { tokens, errors } = tokenize(trimmed);

  if (tokens.length === 0) {
    return { name: '', args: [], flags: {}, errors };
  }

  const name = tokens[0];
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    const nextToken = tokens[i + 1];
    const consumed = { value: false };

    if (isFlag(token)) {
      const result = parseFlag(token, nextToken, consumed);
      if (result) {
        // 处理组合短选项 -abc
        if (token.startsWith('-') && !token.startsWith('--') && token.slice(1).length > 1) {
          const flagChars = token.slice(1);
          // 除了最后一个，其他都是布尔值
          for (let j = 0; j < flagChars.length - 1; j++) {
            flags[flagChars[j]] = true;
          }
          // 最后一个可能有值
          const lastChar = flagChars[flagChars.length - 1];
          flags[lastChar] = consumed.value ? nextToken : true;
        } else {
          flags[result.key] = result.value;
        }

        if (consumed.value) {
          i++; // 跳过已消费的下一个 token
        }
      }
    } else {
      args.push(token);
    }
  }

  return { name, args, flags, errors };
}

/**
 * 解析自然语言输入（用于 NLP 模式）
 * 返回处理后的文本
 */
export function parseNaturalLanguage(input: string): {
  text: string;
  mentionedCommands: string[];
} {
  const mentionedCommands: string[] = [];

  // 简单检测是否提到了特定命令
  const commandPatterns = [
    { pattern: /知识库|knowledge base|kb/i, command: 'kb' },
    { pattern: /定时任务|定时器|timer|cron/i, command: 'timer' },
    { pattern: /状态|status/i, command: 'status' },
    { pattern: /聊天|对话|chat/i, command: 'chat' },
    { pattern: /mcp|模型上下文/i, command: 'mcp' },
  ];

  for (const { pattern, command } of commandPatterns) {
    if (pattern.test(input)) {
      mentionedCommands.push(command);
    }
  }

  return { text: input.trim(), mentionedCommands };
}
