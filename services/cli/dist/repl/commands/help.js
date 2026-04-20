"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.helpCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
const index_1 = require("./index");
exports.helpCommand = {
    name: 'help',
    description: '显示帮助信息',
    aliases: ['h', '?'],
    usage: '/help [命令名]',
    handler: async ({ args, mode }) => {
        // 如果指定了命令名，显示该命令的详细帮助
        if (args.length > 0) {
            const cmdName = args[0];
            const command = index_1.registry.get(cmdName);
            if (!command) {
                console.log(chalk_1.default.red(`未知命令: ${cmdName}`));
                return { shouldContinue: true, outputType: index_1.CommandType.Command };
            }
            console.log();
            console.log(chalk_1.default.bold.cyan(`命令: /${command.name}`));
            console.log(chalk_1.default.gray('─'.repeat(40)));
            console.log(chalk_1.default.gray('描述:'), command.description);
            if (command.aliases && command.aliases.length > 0) {
                console.log(chalk_1.default.gray('别名:'), command.aliases.map(a => `/${a}`).join(', '));
            }
            if (command.usage) {
                console.log(chalk_1.default.gray('用法:'), chalk_1.default.yellow(command.usage));
            }
            if (command.modes && command.modes.length > 0) {
                console.log(chalk_1.default.gray('适用模式:'), command.modes.join(', '));
            }
            console.log();
            return { shouldContinue: true, outputType: index_1.CommandType.Command };
        }
        // 显示通用帮助
        console.log();
        console.log(chalk_1.default.bold.cyan('Ddo REPL 帮助'));
        console.log();
        // 当前模式
        const modeNames = {
            default: '默认模式',
            chat: '聊天模式',
            kb: '知识库模式',
            timer: '定时任务模式',
            mcp: 'MCP 模式',
        };
        console.log(chalk_1.default.gray('当前模式:'), chalk_1.default.cyan(modeNames[mode] || mode));
        console.log();
        // 获取当前模式下可用的命令
        const commands = index_1.registry.getByMode(mode);
        console.log(chalk_1.default.gray('可用命令:'));
        console.log();
        // 按功能分组
        const groups = {
            系统: [],
            模式: [],
            交互: [],
            其他: [],
        };
        for (const cmd of commands) {
            if (['exit', 'quit', 'q', 'help', 'h', '?', 'clear'].includes(cmd.name)) {
                groups['系统'].push(cmd);
            }
            else if (['back', 'kb', 'timer', 'mcp', 'chat'].includes(cmd.name)) {
                groups['模式'].push(cmd);
            }
            else if (['status', 'web', 'status-web', 'timer-web', 'mcp-web', 'kb-web'].includes(cmd.name)) {
                groups['交互'].push(cmd);
            }
            else {
                groups['其他'].push(cmd);
            }
        }
        for (const [groupName, cmds] of Object.entries(groups)) {
            if (cmds.length === 0)
                continue;
            console.log(chalk_1.default.gray(`  ${groupName}:`));
            for (const cmd of cmds) {
                const aliases = cmd.aliases ? ` (${cmd.aliases.join(', ')})` : '';
                console.log(`    ${chalk_1.default.yellow(`/${cmd.name}`)}${chalk_1.default.gray(aliases)} - ${cmd.description}`);
            }
            console.log();
        }
        console.log(chalk_1.default.gray('使用方式:'));
        console.log('  直接输入      - 自然语言模式，AI 将自动解析您的意图');
        console.log('  /命令 <参数>  - 命令模式，执行特定命令');
        console.log();
        console.log(chalk_1.default.gray('提示: 使用 "/help <命令名>" 查看详细说明'));
        console.log();
        return { shouldContinue: true, outputType: index_1.CommandType.Command };
    },
};
//# sourceMappingURL=help.js.map