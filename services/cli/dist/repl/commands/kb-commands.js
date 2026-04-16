"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.kbHelpCommand = exports.kbRemoveCommand = exports.kbSearchCommand = exports.kbAddCommand = exports.kbListCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
const api_client_1 = require("../../services/api-client");
const prompt_helper_1 = require("./prompt-helper");
/**
 * KB List 命令 - 列出知识库
 */
exports.kbListCommand = {
    name: 'kb-list',
    aliases: ['kl', 'kb:list'],
    description: '查看知识库列表',
    usage: '/kb-list',
    handler: async () => {
        const apiClient = (0, api_client_1.getApiClient)();
        try {
            const result = await apiClient.getKnowledgeList({ page: 1, page_size: 20 });
            console.log(chalk_1.default.cyan('\n知识库列表:'));
            console.log(chalk_1.default.gray('─'.repeat(40)));
            if (result.data.length === 0) {
                console.log(chalk_1.default.gray('  暂无知识库'));
            }
            else {
                for (const item of result.data) {
                    const tags = item.tags?.length > 0 ? ` [${item.tags.join(', ')}]` : '';
                    console.log(`  ${chalk_1.default.cyan(item.uuid.slice(0, 8))}  ${item.title}${tags}`);
                    console.log(chalk_1.default.gray(`    ${item.content.slice(0, 60)}${item.content.length > 60 ? '...' : ''}`));
                }
            }
            console.log();
            console.log(chalk_1.default.gray(`共 ${result.total} 条`));
            console.log();
        }
        catch (err) {
            console.log(chalk_1.default.red('获取知识库失败:'), err instanceof Error ? err.message : String(err));
        }
        return true;
    },
};
/**
 * KB Add 命令 - 添加知识库
 * 支持渐进式参数收集
 */
exports.kbAddCommand = {
    name: 'kb-add',
    aliases: ['ka', 'kb:create'],
    description: '添加知识库词条',
    usage: '/kb-add [title] [content]',
    handler: async (ctx) => {
        const { args, nlpParameters, rl } = ctx;
        const prompt = new prompt_helper_1.InteractivePrompt(rl);
        const paramDefs = [
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
        const initialValues = {};
        if (args.length >= 1)
            initialValues.title = args[0];
        if (args.length >= 2)
            initialValues.content = args.slice(1).join(' ');
        if (nlpParameters) {
            if (!initialValues.title && nlpParameters.title)
                initialValues.title = String(nlpParameters.title);
            if (!initialValues.content && nlpParameters.content)
                initialValues.content = String(nlpParameters.content);
        }
        console.log(chalk_1.default.cyan('\n📋 添加知识库词条'));
        console.log(chalk_1.default.gray('─'.repeat(40)));
        const { params: collected, allCollected } = await prompt.collectRequiredParams(paramDefs, initialValues);
        if (allCollected) {
            const tags = collected.tags ? collected.tags.split(',').map(t => t.trim()) : [];
            const confirmed = await prompt.confirmSummary('词条信息', {
                标题: collected.title,
                内容: collected.content,
                标签: tags.join(', ') || '(无)',
            });
            if (!confirmed) {
                console.log(chalk_1.default.yellow('\n已取消添加'));
                return true;
            }
            const apiClient = (0, api_client_1.getApiClient)();
            try {
                const result = await apiClient.createKnowledge({
                    title: collected.title,
                    content: collected.content,
                    tags,
                });
                console.log(chalk_1.default.green('\n✓ 知识库词条添加成功!'));
                console.log(chalk_1.default.gray(`  UUID: ${result.uuid}`));
                console.log();
            }
            catch (err) {
                console.log(chalk_1.default.red('\n✗ 添加知识库失败:'), err instanceof Error ? err.message : String(err));
            }
        }
        return true;
    },
};
/**
 * KB Search 命令 - 搜索知识库
 */
exports.kbSearchCommand = {
    name: 'kb-search',
    aliases: ['ks', 'kb:search'],
    description: '搜索知识库',
    usage: '/kb-search <查询内容>',
    handler: async ({ args }) => {
        if (args.length === 0) {
            console.log(chalk_1.default.yellow('用法: /kb-search <查询内容>'));
            return true;
        }
        const query = args.join(' ');
        const apiClient = (0, api_client_1.getApiClient)();
        try {
            console.log(chalk_1.default.gray(`搜索中: ${query}...`));
            const result = await apiClient.searchKnowledge({ query, top_k: 5 });
            console.log(chalk_1.default.cyan('\n搜索结果:'));
            console.log(chalk_1.default.gray('─'.repeat(40)));
            if (result.results.length === 0) {
                console.log(chalk_1.default.gray('  未找到相关结果'));
            }
            else {
                for (const item of result.results) {
                    console.log(`  ${chalk_1.default.yellow(item.score.toFixed(2))}  ${item.content.slice(0, 80)}${item.content.length > 80 ? '...' : ''}`);
                }
            }
            console.log();
        }
        catch (err) {
            console.log(chalk_1.default.red('搜索失败:'), err instanceof Error ? err.message : String(err));
        }
        return true;
    },
};
/**
 * KB Remove 命令 - 删除知识库
 */
exports.kbRemoveCommand = {
    name: 'kb-remove',
    aliases: ['krm', 'kb:delete'],
    description: '删除知识库',
    usage: '/kb-remove <UUID>',
    handler: async ({ args }) => {
        if (args.length === 0) {
            console.log(chalk_1.default.yellow('用法: /kb-remove <UUID>'));
            return true;
        }
        const uuid = args[0];
        const apiClient = (0, api_client_1.getApiClient)();
        try {
            await apiClient.deleteKnowledge(uuid);
            console.log(chalk_1.default.green('\n知识库删除成功!'));
            console.log();
        }
        catch (err) {
            console.log(chalk_1.default.red('删除知识库失败:'), err instanceof Error ? err.message : String(err));
        }
        return true;
    },
};
/**
 * KB Help 命令
 */
exports.kbHelpCommand = {
    name: 'kb-help',
    aliases: ['kh', 'kb:help'],
    description: '显示知识库帮助',
    usage: '/kb-help',
    handler: async () => {
        console.log(chalk_1.default.cyan('\n知识库管理命令:'));
        console.log(chalk_1.default.gray('─'.repeat(40)));
        console.log(`  ${chalk_1.default.yellow('kb-list')}        - 列出所有知识库`);
        console.log(`  ${chalk_1.default.yellow('kb-add')}         - 添加知识库（支持自然语言）`);
        console.log(`  ${chalk_1.default.yellow('kb-search')}      - 搜索知识库`);
        console.log(`  ${chalk_1.default.yellow('kb-remove')}      - 删除知识库`);
        console.log(`  ${chalk_1.default.yellow('kb-help')}        - 显示帮助`);
        console.log();
        console.log(chalk_1.default.gray('示例:'));
        console.log(`  ${chalk_1.default.gray('/kb-add "我的笔记" "这是一段重要的内容"')}`);
        console.log(`  ${chalk_1.default.gray('帮我添加一条知识库：标题是"如何设置定时任务"，内容是"使用 cron 表达式..."')}`);
        console.log();
        return true;
    },
};
//# sourceMappingURL=kb-commands.js.map