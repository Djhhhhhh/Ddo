"use strict";
/**
 * Conversation Handler - 统一对话处理器
 *
 * 负责处理用户输入的完整对话流程：
 * 1. 意图识别
 * 2. 路由决策
 * 3. RAG检索/直接回答
 * 4. 流式输出
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationHandler = void 0;
exports.createConversationHandler = createConversationHandler;
const chalk_1 = __importDefault(require("chalk"));
/**
 * ConversationHandler 类
 */
class ConversationHandler {
    constructor(serverGoUrl) {
        this.state = {
            status: 'idle',
            answerBuffer: '',
            isStreaming: false,
        };
        this.serverGoUrl = serverGoUrl || process.env.DDO_SERVER_GO_URL || 'http://localhost:8080';
    }
    /**
     * 处理用户输入
     */
    async handle(input, kbPriority = false) {
        if (!input.trim()) {
            return true;
        }
        // 重置状态
        this.resetState();
        this.state.status = 'analyzing';
        // 显示正在分析
        process.stdout.write(`${chalk_1.default.cyan('🔍')} 分析意图... `);
        try {
            // 调用流式API
            const response = await fetch(`${this.serverGoUrl}/api/v1/conversation/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                },
                body: JSON.stringify({
                    query: input,
                    stream: true,
                    kb_priority: kbPriority,
                }),
            });
            if (!response.ok) {
                throw new Error(`API错误: ${response.status}`);
            }
            if (!response.body) {
                throw new Error('响应体为空');
            }
            // 处理SSE流
            await this.processStream(response.body);
            return true;
        }
        catch (error) {
            this.handleError(error);
            return true;
        }
    }
    /**
     * 处理SSE流
     */
    async processStream(stream) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                // 解码并处理数据
                buffer += decoder.decode(value, { stream: true });
                // 处理完整的事件行
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 保留未完成的行
                for (const line of lines) {
                    const event = this.parseSSELine(line.trim());
                    if (event) {
                        await this.handleEvent(event);
                    }
                }
            }
            // 处理剩余数据
            if (buffer.trim()) {
                const event = this.parseSSELine(buffer.trim());
                if (event) {
                    await this.handleEvent(event);
                }
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    /**
     * 解析SSE行
     */
    parseSSELine(line) {
        if (!line.startsWith('data: ')) {
            return null;
        }
        const data = line.slice(6); // 去掉 'data: ' 前缀
        if (data === '[DONE]') {
            return null;
        }
        // 尝试解析JSON
        try {
            const parsed = JSON.parse(data);
            if (parsed.type) {
                return parsed;
            }
        }
        catch { }
        // 如果不是标准格式，可能是纯文本内容
        return {
            type: 'delta',
            data: { content: data }
        };
    }
    /**
     * 处理事件
     */
    async handleEvent(event) {
        switch (event.type) {
            case 'intent_detected':
                this.handleIntentDetected(event.data);
                break;
            case 'retrieving':
                this.handleRetrieving(event.data);
                break;
            case 'docs_found':
                this.handleDocsFound(event.data);
                break;
            case 'generating':
                this.handleGenerating(event.data);
                break;
            case 'delta':
                this.handleDelta(event.data);
                break;
            case 'completed':
                this.handleCompleted(event.data);
                break;
            case 'clarify':
                await this.handleClarify(event.data);
                break;
            case 'tool_call':
                await this.handleToolCall(event.data);
                break;
            case 'error':
                this.handleStreamError(event.data);
                break;
        }
    }
    /**
     * 处理意图识别事件
     */
    handleIntentDetected(data) {
        this.state.status = 'analyzing';
        this.state.intent = {
            type: data.intent,
            sub_intent: data.sub_intent,
            need_knowledge: data.need_knowledge,
            confidence: data.confidence,
        };
        // 显示意图识别完成（简短）
        process.stdout.write(`${chalk_1.default.green('✓')}\n`);
        // 简短显示意图
        const intentName = this.getIntentDisplayName(data.intent);
        if (data.need_knowledge) {
            process.stdout.write(`${chalk_1.default.magenta('📚')} 知识查询\n`);
        }
        else {
            process.stdout.write(`${chalk_1.default.cyan('💬')} ${intentName}\n`);
        }
    }
    /**
     * 处理检索中事件
     */
    handleRetrieving(data) {
        this.state.status = 'retrieving';
        process.stdout.write(`${chalk_1.default.magenta('📚')} 检索中...\n`);
    }
    /**
     * 处理文档找到事件
     */
    handleDocsFound(data) {
        this.state.retrievedDocs = data.docs || [];
        if (data.count > 0) {
            process.stdout.write(`${chalk_1.default.green('✓')} 找到 ${chalk_1.default.cyan(data.count)} 条相关文档\n`);
        }
        else {
            process.stdout.write(`${chalk_1.default.gray('○')} 知识库暂无相关文档\n`);
        }
    }
    /**
     * 处理生成开始事件
     */
    handleGenerating(data) {
        this.state.status = 'generating';
        this.state.isStreaming = true;
        // 开始生成时不额外输出，让内容直接流式显示
    }
    /**
     * 处理生成增量
     */
    handleDelta(data) {
        if (!this.state.isStreaming) {
            this.state.isStreaming = true;
        }
        const content = data.content || '';
        this.state.answerBuffer += content;
        // 流式输出
        process.stdout.write(content);
    }
    /**
     * 处理完成事件
     */
    handleCompleted(data) {
        this.state.status = 'completed';
        this.state.isStreaming = false;
        console.log(); // 结束流式输出后换行
        // 显示来源（如果有）
        if (data.sources && data.sources.length > 0) {
            console.log(chalk_1.default.gray('─'.repeat(40)));
            console.log(`${chalk_1.default.gray('📚 参考来源:')}`);
            for (const source of data.sources) {
                console.log(`   • ${chalk_1.default.gray(source)}`);
            }
            console.log(chalk_1.default.gray('─'.repeat(40)));
        }
        // 显示处理时间（如果超过2秒）
        if (data.processing_time_ms && data.processing_time_ms > 2000) {
            const seconds = (data.processing_time_ms / 1000).toFixed(1);
            console.log(chalk_1.default.gray(`  耗时: ${seconds}s`));
        }
        console.log();
    }
    /**
     * 处理澄清询问
     */
    async handleClarify(data) {
        this.state.status = 'clarifying';
        console.log();
        console.log(`${chalk_1.default.yellow('❓')} ${data.message || '我没有完全理解您的意思，请问您想：'}`);
        if (data.suggestions && data.suggestions.length > 0) {
            for (let i = 0; i < data.suggestions.length; i++) {
                console.log(`   [${i + 1}] ${data.suggestions[i]}`);
            }
        }
        console.log();
    }
    /**
     * 处理工具调用
     */
    async handleToolCall(data) {
        const toolName = this.getToolDisplayName(data.tool);
        console.log();
        console.log(`${chalk_1.default.cyan('📋')} ${toolName}...`);
        // 显示参数
        if (data.parameters && Object.keys(data.parameters).length > 0) {
            console.log(`   参数: ${chalk_1.default.gray(JSON.stringify(data.parameters))}`);
        }
        console.log();
    }
    /**
     * 处理错误
     */
    handleError(error) {
        this.state.status = 'error';
        const message = error instanceof Error ? error.message : String(error);
        console.error(`${chalk_1.default.red('⚠️')} 出错了: ${message}`);
        // 如果是API不可用的错误，显示降级提示
        if (message.includes('fetch') || message.includes('ECONNREFUSED')) {
            console.log(chalk_1.default.yellow('\n💡 AI服务暂时不可用，您可以：'));
            console.log('   • 使用 /help 查看可用命令');
            console.log('   • 稍后重试');
        }
    }
    /**
     * 处理流式错误
     */
    handleStreamError(data) {
        this.state.status = 'error';
        console.error(`${chalk_1.default.red('⚠️')} 流式传输错误: ${data.message || '未知错误'}`);
    }
    /**
     * 重置状态
     */
    resetState() {
        this.state = {
            status: 'idle',
            answerBuffer: '',
            isStreaming: false,
        };
    }
    /**
     * 获取意图显示名称
     */
    getIntentDisplayName(intent) {
        const intentMap = {
            'chat': '闲聊',
            'chat.greeting': '问候',
            'chat.farewell': '告别',
            'knowledge.query': '知识查询',
            'knowledge.search': '知识搜索',
            'knowledge.add': '添加知识',
            'timer.add': '创建定时任务',
            'timer.list': '查看定时任务',
            'system.help': '寻求帮助',
            'system.status': '查看状态',
            'unknown': '闲聊',
        };
        return intentMap[intent] || intent;
    }
    /**
     * 获取工具显示名称
     */
    getToolDisplayName(tool) {
        const toolMap = {
            'knowledge.add': '打开知识库添加向导',
            'timer.add': '打开定时任务创建向导',
            'mcp.add': '打开MCP配置向导',
        };
        return toolMap[tool] || `执行 ${tool}`;
    }
}
exports.ConversationHandler = ConversationHandler;
/**
 * 工厂函数 - 创建ConversationHandler实例
 */
function createConversationHandler(serverGoUrl) {
    return new ConversationHandler(serverGoUrl);
}
//# sourceMappingURL=conversation-handler.js.map