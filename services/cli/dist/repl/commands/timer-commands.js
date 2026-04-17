"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.timerHelpCommand = exports.timerRemoveCommand = exports.timerResumeCommand = exports.timerPauseCommand = exports.timerAddCommand = exports.timerListCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
const index_1 = require("./index");
const api_client_1 = require("../../services/api-client");
const prompt_helper_1 = require("./prompt-helper");
/**
 * Timer List 命令 - 列出定时任务
 */
exports.timerListCommand = {
    name: 'timer-list',
    aliases: ['tl', 'timer:list'],
    description: '查看定时任务列表',
    usage: '/timer-list',
    handler: async () => {
        const apiClient = (0, api_client_1.getApiClient)();
        try {
            // server-go 返回 { data: { total, items } }
            const result = await apiClient.getTimers();
            const items = result.items || result.data || [];
            const total = result.total || 0;
            console.log(chalk_1.default.cyan('\n定时任务列表:'));
            console.log(chalk_1.default.gray('─'.repeat(50)));
            if (items.length === 0) {
                console.log(chalk_1.default.gray('  暂无定时任务'));
            }
            else {
                for (const task of items) {
                    // server-go 使用 status 字段，CLI 用 enabled 表示
                    const isRunning = task.status === 'active' || task.status === 'running';
                    const status = isRunning ? chalk_1.default.green('●') : chalk_1.default.gray('○');
                    const statusText = isRunning ? chalk_1.default.green('运行中') : chalk_1.default.gray('已暂停');
                    console.log(`  ${status} ${chalk_1.default.cyan(task.uuid.slice(0, 8))}  ${task.name}`);
                    console.log(chalk_1.default.gray(`    Cron: ${task.cron_expr || task.cron}  状态: ${statusText}`));
                    if (task.next_run_at || task.next_run) {
                        console.log(chalk_1.default.gray(`    下次执行: ${task.next_run_at || task.next_run}`));
                    }
                }
            }
            console.log();
            console.log(chalk_1.default.gray(`共 ${total} 个任务`));
            console.log();
        }
        catch (err) {
            console.log(chalk_1.default.red('获取定时任务失败:'), err instanceof Error ? err.message : String(err));
        }
        return { shouldContinue: true, outputType: index_1.CommandType.Command };
    },
};
/**
 * Timer Add 命令 - 添加定时任务
 * 支持渐进式参数收集：参数充足时直接执行，否则引导用户输入
 */
exports.timerAddCommand = {
    name: 'timer-add',
    aliases: ['ta', 'timer:create'],
    description: '创建定时任务',
    usage: '/timer-add [cron] [url] [method]',
    handler: async (ctx) => {
        const { args, nlpParameters, rl } = ctx;
        const prompt = new prompt_helper_1.InteractivePrompt(rl);
        // 定义参数
        const paramDefs = [
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
                validate: prompt_helper_1.validateCron,
                help: '分 时 日 月 周，例如：0 9 * * * 表示每天 9 点',
            },
            {
                name: 'url',
                label: '回调 URL',
                required: true,
                validate: prompt_helper_1.validateUrl,
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
        const initialValues = {};
        if (args.length >= 1)
            initialValues.cron = args[0];
        if (args.length >= 2)
            initialValues.url = args[1];
        if (args.length >= 3)
            initialValues.method = args[2];
        if (nlpParameters) {
            if (!initialValues.cron && nlpParameters.cron)
                initialValues.cron = String(nlpParameters.cron);
            if (!initialValues.cron && nlpParameters.schedule)
                initialValues.cron = String(nlpParameters.schedule);
            if (!initialValues.url && nlpParameters.url)
                initialValues.url = String(nlpParameters.url);
            if (!initialValues.url && nlpParameters.callback_url)
                initialValues.url = String(nlpParameters.callback_url);
            if (!initialValues.method && nlpParameters.method)
                initialValues.method = String(nlpParameters.method);
            if (!initialValues.name && nlpParameters.name)
                initialValues.name = String(nlpParameters.name);
        }
        // 渐进式收集参数：先收集所有已有值，然后仅对必填参数引导输入
        console.log(chalk_1.default.cyan('\n📋 创建定时任务'));
        console.log(chalk_1.default.gray('─'.repeat(40)));
        const { params: collected, allCollected } = await prompt.collectRequiredParams(paramDefs, initialValues);
        // 如果所有必填参数都已收集，执行创建
        if (allCollected) {
            const name = collected.name || `Timer ${new Date().toISOString()}`;
            const confirmed = await prompt.confirmSummary('定时任务信息', {
                名称: name,
                Cron: collected.cron,
                回调URL: collected.url,
                方法: collected.method || 'GET',
            });
            if (!confirmed) {
                console.log(chalk_1.default.yellow('\n已取消创建'));
                return { shouldContinue: true, outputType: index_1.CommandType.Command };
            }
            const apiClient = (0, api_client_1.getApiClient)();
            try {
                const result = await apiClient.createTimer({
                    name,
                    cron: collected.cron,
                    url: collected.url,
                    method: collected.method || 'GET',
                });
                console.log(chalk_1.default.green('\n✓ 定时任务创建成功!'));
                console.log(chalk_1.default.gray(`  UUID: ${result.uuid}`));
                console.log(chalk_1.default.gray(`  Cron: ${result.cron}`));
                console.log();
            }
            catch (err) {
                console.log(chalk_1.default.red('\n✗ 创建定时任务失败:'), err instanceof Error ? err.message : String(err));
            }
        }
        return { shouldContinue: true, outputType: index_1.CommandType.Command };
    },
};
/**
 * Timer Pause 命令 - 暂停定时任务
 */
exports.timerPauseCommand = {
    name: 'timer-pause',
    aliases: ['tp', 'timer:pause'],
    description: '暂停定时任务',
    usage: '/timer-pause <uuid>',
    handler: async ({ args }) => {
        if (args.length === 0) {
            console.log(chalk_1.default.yellow('用法: /timer-pause <uuid>'));
            return { shouldContinue: true, outputType: index_1.CommandType.Command };
        }
        const uuid = args[0];
        const apiClient = (0, api_client_1.getApiClient)();
        try {
            await apiClient.pauseTimer(uuid);
            console.log(chalk_1.default.green('\n定时任务已暂停'));
            console.log();
        }
        catch (err) {
            console.log(chalk_1.default.red('暂停定时任务失败:'), err instanceof Error ? err.message : String(err));
        }
        return { shouldContinue: true, outputType: index_1.CommandType.Command };
    },
};
/**
 * Timer Resume 命令 - 恢复定时任务
 */
exports.timerResumeCommand = {
    name: 'timer-resume',
    aliases: ['tr', 'timer:resume'],
    description: '恢复定时任务',
    usage: '/timer-resume <uuid>',
    handler: async ({ args }) => {
        if (args.length === 0) {
            console.log(chalk_1.default.yellow('用法: /timer-resume <uuid>'));
            return { shouldContinue: true, outputType: index_1.CommandType.Command };
        }
        const uuid = args[0];
        const apiClient = (0, api_client_1.getApiClient)();
        try {
            await apiClient.resumeTimer(uuid);
            console.log(chalk_1.default.green('\n定时任务已恢复'));
            console.log();
        }
        catch (err) {
            console.log(chalk_1.default.red('恢复定时任务失败:'), err instanceof Error ? err.message : String(err));
        }
        return { shouldContinue: true, outputType: index_1.CommandType.Command };
    },
};
/**
 * Timer Remove 命令 - 删除定时任务
 */
exports.timerRemoveCommand = {
    name: 'timer-remove',
    aliases: ['trm', 'timer:delete'],
    description: '删除定时任务',
    usage: '/timer-remove <uuid>',
    handler: async ({ args }) => {
        if (args.length === 0) {
            console.log(chalk_1.default.yellow('用法: /timer-remove <uuid>'));
            return { shouldContinue: true, outputType: index_1.CommandType.Command };
        }
        const uuid = args[0];
        const apiClient = (0, api_client_1.getApiClient)();
        try {
            await apiClient.deleteTimer(uuid);
            console.log(chalk_1.default.green('\n定时任务已删除'));
            console.log();
        }
        catch (err) {
            console.log(chalk_1.default.red('删除定时任务失败:'), err instanceof Error ? err.message : String(err));
        }
        return { shouldContinue: true, outputType: index_1.CommandType.Command };
    },
};
/**
 * Timer Help 命令
 */
exports.timerHelpCommand = {
    name: 'timer-help',
    aliases: ['th', 'timer:help'],
    description: '显示定时任务帮助',
    usage: '/timer-help',
    handler: async () => {
        console.log(chalk_1.default.cyan('\n定时任务管理命令:'));
        console.log(chalk_1.default.gray('─'.repeat(40)));
        console.log(`  ${chalk_1.default.yellow('timer-list')}      - 列出所有定时任务`);
        console.log(`  ${chalk_1.default.yellow('timer-add')}       - 创建定时任务（支持自然语言）`);
        console.log(`  ${chalk_1.default.yellow('timer-pause')}     - 暂停定时任务`);
        console.log(`  ${chalk_1.default.yellow('timer-resume')}     - 恢复定时任务`);
        console.log(`  ${chalk_1.default.yellow('timer-remove')}     - 删除定时任务`);
        console.log(`  ${chalk_1.default.yellow('timer-help')}       - 显示帮助`);
        console.log();
        console.log(chalk_1.default.gray('示例:'));
        console.log(`  ${chalk_1.default.gray('/timer-add "0 9 * * *" "http://localhost:8080/callback" POST')}`);
        console.log(`  ${chalk_1.default.gray('帮我创建一个每小时执行的任务')}`);
        console.log();
        return { shouldContinue: true, outputType: index_1.CommandType.Command };
    },
};
//# sourceMappingURL=timer-commands.js.map