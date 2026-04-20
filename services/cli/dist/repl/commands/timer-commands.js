"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.timerHelpCommand = exports.timerRemoveCommand = exports.timerResumeCommand = exports.timerPauseCommand = exports.timerAddDelayCommand = exports.timerAddIntervalCommand = exports.timerAddCommand = exports.timerListCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
const index_1 = require("./index");
const api_client_1 = require("../../services/api-client");
const prompt_helper_1 = require("./prompt-helper");
/**
 * 通用创建定时任务结果处理
 */
function handleCreateResult(result, typeLabel) {
    console.log(chalk_1.default.green(`\n✓ ${typeLabel}创建成功!`));
    console.log(chalk_1.default.gray(`  UUID: ${result.uuid}`));
    console.log(chalk_1.default.gray(`  名称: ${result.name}`));
    if (result.status) {
        console.log(chalk_1.default.gray(`  状态: ${result.status}`));
    }
    if (result.next_run_at) {
        console.log(chalk_1.default.gray(`  下次执行: ${result.next_run_at}`));
    }
    console.log();
}
/**
 * 验证间隔数值（大于0的整数）
 */
function validateIntervalValue(value) {
    const amount = Number(value);
    if (!Number.isInteger(amount) || amount <= 0) {
        return '请输入大于 0 的整数';
    }
    return null;
}
/**
 * 验证时间单位
 */
function validateTimeUnit(value) {
    const unit = value.trim().toLowerCase();
    if (!['second', 'seconds', 'minute', 'minutes', 'hour', 'hours', 'day', 'days'].includes(unit)) {
        return '请输入 seconds、minutes、hours 或 days';
    }
    return null;
}
/**
 * 将单位字符串转换为秒数
 */
function unitToSeconds(value, unit) {
    const normalizedUnit = unit.trim().toLowerCase();
    if (['second', 'seconds'].includes(normalizedUnit)) {
        return value;
    }
    if (['minute', 'minutes'].includes(normalizedUnit)) {
        return value * 60;
    }
    if (['hour', 'hours'].includes(normalizedUnit)) {
        return value * 3600;
    }
    if (['day', 'days'].includes(normalizedUnit)) {
        return value * 86400;
    }
    return value;
}
/**
 * 格式化秒数为可读字符串
 */
function formatDuration(seconds) {
    if (seconds < 60)
        return `${seconds}秒`;
    if (seconds < 3600)
        return `${Math.floor(seconds / 60)}分钟`;
    if (seconds < 86400)
        return `${Math.floor(seconds / 3600)}小时`;
    return `${Math.floor(seconds / 86400)}天`;
}
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
                    const isRunning = task.status === 'active' || task.status === 'running';
                    const status = isRunning ? chalk_1.default.green('●') : chalk_1.default.gray('○');
                    const statusText = isRunning ? chalk_1.default.green('运行中') : chalk_1.default.gray('已暂停');
                    const triggerType = task.trigger_type || 'cron';
                    console.log(`  ${status} ${chalk_1.default.cyan(task.uuid.slice(0, 8))}  ${task.name} ${chalk_1.default.gray(`(${triggerType})`)}`);
                    if (triggerType === 'cron') {
                        console.log(chalk_1.default.gray(`    Cron: ${task.cron_expr || task.cron}  状态: ${statusText}`));
                    }
                    else if (triggerType === 'periodic') {
                        console.log(chalk_1.default.gray(`    间隔: ${formatDuration(task.interval_seconds || 3600)}  状态: ${statusText}`));
                    }
                    else if (triggerType === 'delayed') {
                        console.log(chalk_1.default.gray(`    延迟: ${formatDuration(task.delay_seconds || 60)}  状态: ${statusText}`));
                    }
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
                label: '目标 URL',
                required: true,
                validate: prompt_helper_1.validateUrl,
                help: '定时任务触发时访问的目标地址',
            },
            {
                name: 'method',
                label: '请求方法',
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
        if (allCollected) {
            const displayName = collected.name || `Timer ${new Date().toISOString()}`;
            const confirmed = await prompt.confirmSummary('定时任务信息', {
                名称: displayName,
                调度表达式: collected.cron,
                目标URL: collected.url,
                请求方法: collected.method || 'GET',
            });
            if (!confirmed) {
                console.log(chalk_1.default.yellow('\n已取消创建'));
                return { shouldContinue: true, outputType: index_1.CommandType.Command };
            }
            const apiClient = (0, api_client_1.getApiClient)();
            try {
                const result = await apiClient.createTimer({
                    name: displayName,
                    trigger_type: 'cron',
                    cron_expr: collected.cron,
                    callback_url: collected.url,
                    callback_method: collected.method || 'GET',
                });
                handleCreateResult(result, '定时任务');
            }
            catch (err) {
                console.log(chalk_1.default.red('\n✗ 创建定时任务失败:'), err instanceof Error ? err.message : String(err));
            }
        }
        return { shouldContinue: true, outputType: index_1.CommandType.Command };
    },
};
exports.timerAddIntervalCommand = {
    name: 'timer-add-interval',
    aliases: ['tai', 'timer:create-interval'],
    description: '按固定间隔创建重复任务',
    usage: '/timer-add-interval [every] [unit] [url] [method]',
    handler: async (ctx) => {
        const { args, nlpParameters, rl } = ctx;
        const prompt = new prompt_helper_1.InteractivePrompt(rl);
        const paramDefs = [
            {
                name: 'name',
                label: '任务名称',
                required: false,
                help: '给任务起个名字',
            },
            {
                name: 'every',
                label: '间隔数值',
                required: true,
                defaultHint: '5',
                validate: validateIntervalValue,
                help: '输入大于 0 的整数',
            },
            {
                name: 'unit',
                label: '间隔单位',
                required: true,
                defaultHint: 'minutes',
                validate: validateTimeUnit,
                help: 'seconds | minutes | hours | days',
            },
            {
                name: 'url',
                label: '目标 URL',
                required: true,
                validate: prompt_helper_1.validateUrl,
                help: '定时任务触发时访问的目标地址',
            },
            {
                name: 'method',
                label: '请求方法',
                required: false,
                defaultHint: 'GET',
                help: 'GET/POST/PUT/DELETE',
            },
        ];
        const initialValues = {};
        if (args.length >= 1)
            initialValues.every = args[0];
        if (args.length >= 2)
            initialValues.unit = args[1];
        if (args.length >= 3)
            initialValues.url = args[2];
        if (args.length >= 4)
            initialValues.method = args[3];
        if (nlpParameters) {
            if (!initialValues.every && nlpParameters.every)
                initialValues.every = String(nlpParameters.every);
            if (!initialValues.every && nlpParameters.interval)
                initialValues.every = String(nlpParameters.interval);
            if (!initialValues.unit && nlpParameters.unit)
                initialValues.unit = String(nlpParameters.unit);
            if (!initialValues.url && nlpParameters.url)
                initialValues.url = String(nlpParameters.url);
            if (!initialValues.url && nlpParameters.callback_url)
                initialValues.url = String(nlpParameters.callback_url);
            if (!initialValues.method && nlpParameters.method)
                initialValues.method = String(nlpParameters.method);
            if (!initialValues.name && nlpParameters.name)
                initialValues.name = String(nlpParameters.name);
        }
        console.log(chalk_1.default.cyan('\n📋 创建间隔重复任务'));
        console.log(chalk_1.default.gray('─'.repeat(40)));
        const { params: collected, allCollected } = await prompt.collectRequiredParams(paramDefs, initialValues);
        if (allCollected) {
            const displayName = collected.name || `Periodic ${new Date().toISOString()}`;
            const intervalSeconds = unitToSeconds(Number(collected.every), collected.unit);
            const confirmed = await prompt.confirmSummary('间隔重复任务信息', {
                名称: displayName,
                间隔: `每 ${formatDuration(intervalSeconds)}`,
                目标URL: collected.url,
                请求方法: collected.method || 'GET',
            });
            if (!confirmed) {
                console.log(chalk_1.default.yellow('\n已取消创建'));
                return { shouldContinue: true, outputType: index_1.CommandType.Command };
            }
            const apiClient = (0, api_client_1.getApiClient)();
            try {
                const result = await apiClient.createTimer({
                    name: displayName,
                    trigger_type: 'periodic',
                    interval_seconds: intervalSeconds,
                    callback_url: collected.url,
                    callback_method: collected.method || 'GET',
                });
                handleCreateResult(result, '间隔重复任务');
            }
            catch (err) {
                console.log(chalk_1.default.red('\n✗ 创建间隔重复任务失败:'), err instanceof Error ? err.message : String(err));
            }
        }
        return { shouldContinue: true, outputType: index_1.CommandType.Command };
    },
};
exports.timerAddDelayCommand = {
    name: 'timer-add-delay',
    aliases: ['tad', 'timer:create-delay'],
    description: '创建一次性延迟任务',
    usage: '/timer-add-delay [delay] [unit] [url] [method]',
    handler: async (ctx) => {
        const { args, nlpParameters, rl } = ctx;
        const prompt = new prompt_helper_1.InteractivePrompt(rl);
        const paramDefs = [
            {
                name: 'name',
                label: '任务名称',
                required: false,
                help: '给任务起个名字',
            },
            {
                name: 'delay',
                label: '延迟数值',
                required: true,
                defaultHint: '10',
                validate: validateIntervalValue,
                help: '输入大于 0 的整数',
            },
            {
                name: 'unit',
                label: '延迟单位',
                required: true,
                defaultHint: 'minutes',
                validate: validateTimeUnit,
                help: 'seconds | minutes | hours | days',
            },
            {
                name: 'url',
                label: '目标 URL',
                required: true,
                validate: prompt_helper_1.validateUrl,
                help: '任务触发时访问的目标地址',
            },
            {
                name: 'method',
                label: '请求方法',
                required: false,
                defaultHint: 'GET',
                help: 'GET/POST/PUT/DELETE',
            },
        ];
        const initialValues = {};
        if (args.length >= 1)
            initialValues.delay = args[0];
        if (args.length >= 2)
            initialValues.unit = args[1];
        if (args.length >= 3)
            initialValues.url = args[2];
        if (args.length >= 4)
            initialValues.method = args[3];
        if (nlpParameters) {
            if (!initialValues.delay && nlpParameters.delay)
                initialValues.delay = String(nlpParameters.delay);
            if (!initialValues.delay && nlpParameters.interval)
                initialValues.delay = String(nlpParameters.interval);
            if (!initialValues.unit && nlpParameters.unit)
                initialValues.unit = String(nlpParameters.unit);
            if (!initialValues.url && nlpParameters.url)
                initialValues.url = String(nlpParameters.url);
            if (!initialValues.url && nlpParameters.callback_url)
                initialValues.url = String(nlpParameters.callback_url);
            if (!initialValues.method && nlpParameters.method)
                initialValues.method = String(nlpParameters.method);
            if (!initialValues.name && nlpParameters.name)
                initialValues.name = String(nlpParameters.name);
        }
        console.log(chalk_1.default.cyan('\n📋 创建一次性延迟任务'));
        console.log(chalk_1.default.gray('─'.repeat(40)));
        const { params: collected, allCollected } = await prompt.collectRequiredParams(paramDefs, initialValues);
        if (allCollected) {
            const displayName = collected.name || `Delayed ${new Date().toISOString()}`;
            const delaySeconds = unitToSeconds(Number(collected.delay), collected.unit);
            const confirmed = await prompt.confirmSummary('一次性延迟任务信息', {
                名称: displayName,
                延迟: `${formatDuration(delaySeconds)}后执行`,
                目标URL: collected.url,
                请求方法: collected.method || 'GET',
            });
            if (!confirmed) {
                console.log(chalk_1.default.yellow('\n已取消创建'));
                return { shouldContinue: true, outputType: index_1.CommandType.Command };
            }
            const apiClient = (0, api_client_1.getApiClient)();
            try {
                const result = await apiClient.createTimer({
                    name: displayName,
                    trigger_type: 'delayed',
                    delay_seconds: delaySeconds,
                    callback_url: collected.url,
                    callback_method: collected.method || 'GET',
                });
                handleCreateResult(result, '一次性延迟任务');
            }
            catch (err) {
                console.log(chalk_1.default.red('\n✗ 创建一次性延迟任务失败:'), err instanceof Error ? err.message : String(err));
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
        console.log(`  ${chalk_1.default.yellow('timer-add-interval')} - 创建间隔重复任务`);
        console.log(`  ${chalk_1.default.yellow('timer-add-delay')} - 创建一次性延迟任务`);
        console.log(`  ${chalk_1.default.yellow('timer-pause')}     - 暂停定时任务`);
        console.log(`  ${chalk_1.default.yellow('timer-resume')}     - 恢复定时任务`);
        console.log(`  ${chalk_1.default.yellow('timer-remove')}     - 删除定时任务`);
        console.log(`  ${chalk_1.default.yellow('timer-help')}       - 显示帮助`);
        console.log();
        console.log(chalk_1.default.gray('示例:'));
        console.log(`  ${chalk_1.default.gray('/timer-add "0 9 * * *" "http://localhost:8080/callback" POST')}`);
        console.log(`  ${chalk_1.default.gray('/timer-add-interval 15 minutes "http://localhost:8080/callback" GET')}`);
        console.log(`  ${chalk_1.default.gray('/timer-add-delay 30 minutes "http://localhost:8080/callback" GET')}`);
        console.log(`  ${chalk_1.default.gray('帮我创建一个每小时执行的任务')}`);
        console.log();
        return { shouldContinue: true, outputType: index_1.CommandType.Command };
    },
};
//# sourceMappingURL=timer-commands.js.map