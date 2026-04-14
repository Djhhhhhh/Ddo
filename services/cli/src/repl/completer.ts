/**
 * REPL 命令自动补全
 */

import { registry } from './commands';
import { ModeManager, ReplMode } from './mode';

/**
 * 自动补全结果
 */
export interface CompleterResult {
  /** 补全选项 */
  completions: string[];
  /** 匹配的原始文本 */
  matched: string;
}

/**
 * 创建自动补全函数
 */
export function createCompleter(modeManager: ModeManager) {
  return (line: string): CompleterResult => {
    const trimmed = line.trim();

    // 如果输入为空，返回所有可用命令
    if (trimmed === '') {
      const commands = registry.getByMode(modeManager.mode);
      const allNames: string[] = [];

      for (const cmd of commands) {
        allNames.push(`/${cmd.name}`);
        if (cmd.aliases) {
          for (const alias of cmd.aliases) {
            allNames.push(`/${alias}`);
          }
        }
      }

      // 在自然语言模式下，也可以直接输入文字
      if (modeManager.mode === ReplMode.Default) {
        // 只返回命令
      }

      return { completions: allNames, matched: '' };
    }

    // 如果输入以 / 开头，补全命令
    if (trimmed.startsWith('/')) {
      const prefix = trimmed.slice(1).toLowerCase();
      const commands = registry.getByMode(modeManager.mode);
      const matches: string[] = [];

      for (const cmd of commands) {
        if (cmd.name.startsWith(prefix)) {
          matches.push(`/${cmd.name}`);
        }
        if (cmd.aliases) {
          for (const alias of cmd.aliases) {
            if (alias.startsWith(prefix)) {
              matches.push(`/${alias}`);
            }
          }
        }
      }

      return { completions: matches, matched: trimmed };
    }

    // 子命令模式下的补全
    if (modeManager.isInSubMode()) {
      const prefix = trimmed.toLowerCase();
      const subCommands = getSubCommands(modeManager.mode);
      const matches = subCommands.filter((cmd) => cmd.startsWith(prefix));

      if (matches.length > 0) {
        return { completions: matches, matched: trimmed };
      }
    }

    return { completions: [], matched: trimmed };
  };
}

/**
 * 获取子命令列表
 */
function getSubCommands(mode: ReplMode): string[] {
  switch (mode) {
    case ReplMode.Kb:
      return ['list', 'add', 'search', 'remove', 'rm', 'help', 'h'];
    case ReplMode.Timer:
      return ['list', 'add', 'remove', 'rm', 'help', 'h'];
    case ReplMode.Mcp:
      return ['list', 'add', 'remove', 'rm', 'help', 'h'];
    case ReplMode.Chat:
      return [];
    default:
      return [];
  }
}
