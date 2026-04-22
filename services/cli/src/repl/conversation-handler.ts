/**
 * Conversation Handler - 统一对话处理器
 *
 * 负责处理用户输入的完整对话流程：
 * 1. 意图识别
 * 2. 路由决策
 * 3. RAG检索/直接回答
 * 4. 流式输出
 */

import chalk from 'chalk';
import { loadDdoConfigSync } from '../utils/config';
import { resolveDataDir } from '../utils/paths';

// 状态类型
export type ConversationStatus =
  | 'idle'
  | 'analyzing'
  | 'clarifying'
  | 'retrieving'
  | 'generating'
  | 'completed'
  | 'error';

// 意图详情
export interface IntentDetail {
  type: string;
  sub_intent?: string;
  need_knowledge: boolean;
  confidence: number;
}

// 检索文档
export interface RetrievedDoc {
  id: string;
  content: string;
  score: number;
}

// 会话状态
export interface ConversationState {
  status: ConversationStatus;
  intent?: IntentDetail;
  retrievedDocs?: RetrievedDoc[];
  answerBuffer: string;
  isStreaming: boolean;
  error?: {
    type: string;
    message: string;
    isRetryable: boolean;
  };
}

// SSE 事件类型
export type StreamEventType =
  | 'intent_detected'
  | 'retrieving'
  | 'docs_found'
  | 'generating'
  | 'delta'
  | 'completed'
  | 'clarify'
  | 'tool_call'
  | 'error';

export interface StreamEvent {
  type: StreamEventType;
  data: any;
}

/**
 * ConversationHandler 类
 */
export class ConversationHandler {
  private state: ConversationState = {
    status: 'idle',
    answerBuffer: '',
    isStreaming: false,
  };

  private serverGoUrl: string;
  private conversationId: string | null = null;

  constructor(serverGoUrl?: string) {
    const dataDir = resolveDataDir({
      envDataDir: process.env.DDO_DATA_DIR,
    });
    this.serverGoUrl = serverGoUrl || process.env.DDO_SERVER_GO_URL || loadDdoConfigSync(dataDir).endpoints.serverGo;
  }

  /**
   * 处理用户输入
   */
  async handle(input: string, kbPriority: boolean = false): Promise<boolean> {
    if (!input.trim()) {
      return true;
    }

    // 重置状态（保留 conversationId 以维持会话连续性）
    this.resetState();
    this.state.status = 'analyzing';

    // 显示正在分析
    process.stdout.write(`${chalk.cyan('🔍')} 分析意图... `);

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
          conversation_id: this.conversationId,
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

    } catch (error) {
      this.handleError(error);
      return true;
    }
  }

  /**
   * 处理SSE流
   */
  private async processStream(stream: ReadableStream<Uint8Array>): Promise<void> {
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

    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 解析SSE行
   */
  private parseSSELine(line: string): StreamEvent | null {
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
        return parsed as StreamEvent;
      }
    } catch {}

    // 如果不是标准格式，可能是纯文本内容
    return {
      type: 'delta',
      data: { content: data }
    };
  }

  /**
   * 处理事件
   */
  private async handleEvent(event: StreamEvent): Promise<void> {
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
  private handleIntentDetected(data: any): void {
    this.state.status = 'analyzing';
    this.state.intent = {
      type: data.intent,
      sub_intent: data.sub_intent,
      need_knowledge: data.need_knowledge,
      confidence: data.confidence,
    };

    // 显示意图识别完成（简短）
    process.stdout.write(`${chalk.green('✓')}\n`);

    // 简短显示意图
    const intentName = this.getIntentDisplayName(data.intent);
    if (data.need_knowledge) {
      process.stdout.write(`${chalk.magenta('📚')} 知识查询\n`);
    } else {
      process.stdout.write(`${chalk.cyan('💬')} ${intentName}\n`);
    }
  }

  /**
   * 处理检索中事件
   */
  private handleRetrieving(data: any): void {
    this.state.status = 'retrieving';
    process.stdout.write(`${chalk.magenta('📚')} 检索中...\n`);
  }

  /**
   * 处理文档找到事件
   */
  private handleDocsFound(data: any): void {
    this.state.retrievedDocs = data.docs || [];

    if (data.count > 0) {
      process.stdout.write(`${chalk.green('✓')} 找到 ${chalk.cyan(data.count)} 条相关文档\n`);
    } else {
      process.stdout.write(`${chalk.gray('○')} 知识库暂无相关文档\n`);
    }
  }

  /**
   * 处理生成开始事件
   */
  private handleGenerating(data: any): void {
    this.state.status = 'generating';
    this.state.isStreaming = true;
    // 开始生成时不额外输出，让内容直接流式显示
  }

  /**
   * 处理生成增量
   */
  private handleDelta(data: any): void {
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
  private handleCompleted(data: any): void {
    this.state.status = 'completed';
    this.state.isStreaming = false;

    // 保存会话 ID，后续查询可保持连续性
    if (data.conversation_id) {
      this.conversationId = data.conversation_id;
    }

    console.log(); // 结束流式输出后换行

    // 显示来源（如果有）- 支持 sources 或 retrieved_docs
    const sources = data.sources || (data.retrieved_docs || []);

    if (sources.length > 0) {
      console.log(chalk.gray('─'.repeat(40)));
      console.log(`${chalk.gray('📚 参考来源:')}`);
      for (const source of sources) {
        // 支持两种格式：字符串（仅UUID）或对象{id, title}
        if (typeof source === 'string') {
          console.log(`   • ${chalk.gray(source)}`);
        } else if (source.id && source.title) {
          console.log(`   • ${chalk.gray(source.id)} - ${source.title}`);
        } else if (source.id) {
          console.log(`   • ${chalk.gray(source.id)}`);
        }
      }
      console.log(chalk.gray('─'.repeat(40)));
    }

    // 显示处理时间（如果超过2秒）
    if (data.processing_time_ms && data.processing_time_ms > 2000) {
      const seconds = (data.processing_time_ms / 1000).toFixed(1);
      console.log(chalk.gray(`  耗时: ${seconds}s`));
    }

    console.log();
  }

  /**
   * 处理澄清询问
   */
  private async handleClarify(data: any): Promise<void> {
    this.state.status = 'clarifying';
    console.log();
    console.log(`${chalk.yellow('❓')} ${data.message || '我没有完全理解您的意思，请问您想：'}`);

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
  private async handleToolCall(data: any): Promise<void> {
    const toolName = this.getToolDisplayName(data.tool);
    console.log();
    console.log(`${chalk.cyan('📋')} ${toolName}...`);

    // 显示参数
    if (data.parameters && Object.keys(data.parameters).length > 0) {
      console.log(`   参数: ${chalk.gray(JSON.stringify(data.parameters))}`);
    }

    console.log();

    // 尝试获取 REPL 实例并切换模式
    // 注意：这里触发模式切换后，用户将进入相应模式继续操作
    // 由于 handleToolCall 是 private 方法，需要通过事件通知外部
    this.onToolCall?.(data.tool, data.parameters);
  }

  /**
   * 外部设置的工具调用回调
   */
  private onToolCall?: (tool: string, parameters?: Record<string, unknown>) => void;

  /**
   * 设置工具调用回调
   */
  setToolCallHandler(handler: (tool: string, parameters?: Record<string, unknown>) => void): void {
    this.onToolCall = handler;
  }

  /**
   * 处理错误
   */
  private handleError(error: any): void {
    this.state.status = 'error';
    const message = error instanceof Error ? error.message : String(error);

    console.error(`${chalk.red('⚠️')} 出错了: ${message}`);

    // 如果是API不可用的错误，显示降级提示
    if (message.includes('fetch') || message.includes('ECONNREFUSED')) {
      console.log(chalk.yellow('\n💡 AI服务暂时不可用，您可以：'));
      console.log('   • 使用 /help 查看可用命令');
      console.log('   • 稍后重试');
    }
  }

  /**
   * 处理流式错误
   */
  private handleStreamError(data: any): void {
    this.state.status = 'error';
    console.error(`${chalk.red('⚠️')} 流式传输错误: ${data.message || '未知错误'}`);
  }

  /**
   * 重置状态
   */
  private resetState(): void {
    this.state = {
      status: 'idle',
      answerBuffer: '',
      isStreaming: false,
    };
  }

  /**
   * 获取意图显示名称
   */
  private getIntentDisplayName(intent: string): string {
    const intentMap: Record<string, string> = {
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
  private getToolDisplayName(tool: string): string {
    const toolMap: Record<string, string> = {
      'knowledge.add': '打开知识库添加向导',
      'timer.add': '打开定时任务创建向导',
      'mcp.add': '打开MCP配置向导',
    };
    return toolMap[tool] || `执行 ${tool}`;
  }
}

/**
 * 工厂函数 - 创建ConversationHandler实例
 */
export function createConversationHandler(serverGoUrl?: string): ConversationHandler {
  return new ConversationHandler(serverGoUrl);
}
