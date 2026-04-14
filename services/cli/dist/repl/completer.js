"use strict";
/**
 * REPL 命令自动补全
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCompleter = createCompleter;
const commands_1 = require("./commands");
const mode_1 = require("./mode");
/**
 * 创建自动补全函数
 */
function createCompleter(modeManager) {
    return (line) => {
        const trimmed = line.trim();
        // 如果输入为空，返回所有可用命令
        if (trimmed === '') {
            const commands = commands_1.registry.getByMode(modeManager.mode);
            const allNames = [];
            for (const cmd of commands) {
                allNames.push(`/${cmd.name}`);
                if (cmd.aliases) {
                    for (const alias of cmd.aliases) {
                        allNames.push(`/${alias}`);
                    }
                }
            }
            // 在自然语言模式下，也可以直接输入文字
            if (modeManager.mode === mode_1.ReplMode.Default) {
                // 只返回命令
            }
            return { completions: allNames, matched: '' };
        }
        // 如果输入以 / 开头，补全命令
        if (trimmed.startsWith('/')) {
            const prefix = trimmed.slice(1).toLowerCase();
            const commands = commands_1.registry.getByMode(modeManager.mode);
            const matches = [];
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
function getSubCommands(mode) {
    switch (mode) {
        case mode_1.ReplMode.Kb:
            return ['list', 'add', 'search', 'remove', 'rm', 'help', 'h'];
        case mode_1.ReplMode.Timer:
            return ['list', 'add', 'remove', 'rm', 'help', 'h'];
        case mode_1.ReplMode.Mcp:
            return ['list', 'add', 'remove', 'rm', 'help', 'h'];
        case mode_1.ReplMode.Chat:
            return [];
        default:
            return [];
    }
}
//# sourceMappingURL=completer.js.map