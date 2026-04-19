/**
 * Conversation Handler - 统一对话处理器
 *
 * 负责处理用户输入的完整对话流程：
 * 1. 意图识别
 * 2. 路由决策
 * 3. RAG检索/直接回答
 * 4. 流式输出
 */
export type ConversationStatus = 'idle' | 'analyzing' | 'clarifying' | 'retrieving' | 'generating' | 'completed' | 'error';
export interface IntentDetail {
    type: string;
    sub_intent?: string;
    need_knowledge: boolean;
    confidence: number;
}
export interface RetrievedDoc {
    id: string;
    content: string;
    score: number;
}
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
export type StreamEventType = 'intent_detected' | 'retrieving' | 'docs_found' | 'generating' | 'delta' | 'completed' | 'clarify' | 'tool_call' | 'error';
export interface StreamEvent {
    type: StreamEventType;
    data: any;
}
/**
 * ConversationHandler 类
 */
export declare class ConversationHandler {
    private state;
    private serverGoUrl;
    constructor(serverGoUrl?: string);
    /**
     * 处理用户输入
     */
    handle(input: string, kbPriority?: boolean): Promise<boolean>;
    /**
     * 处理SSE流
     */
    private processStream;
    /**
     * 解析SSE行
     */
    private parseSSELine;
    /**
     * 处理事件
     */
    private handleEvent;
    /**
     * 处理意图识别事件
     */
    private handleIntentDetected;
    /**
     * 处理检索中事件
     */
    private handleRetrieving;
    /**
     * 处理文档找到事件
     */
    private handleDocsFound;
    /**
     * 处理生成开始事件
     */
    private handleGenerating;
    /**
     * 处理生成增量
     */
    private handleDelta;
    /**
     * 处理完成事件
     */
    private handleCompleted;
    /**
     * 处理澄清询问
     */
    private handleClarify;
    /**
     * 处理工具调用
     */
    private handleToolCall;
    /**
     * 外部设置的工具调用回调
     */
    private onToolCall?;
    /**
     * 设置工具调用回调
     */
    setToolCallHandler(handler: (tool: string, parameters?: Record<string, unknown>) => void): void;
    /**
     * 处理错误
     */
    private handleError;
    /**
     * 处理流式错误
     */
    private handleStreamError;
    /**
     * 重置状态
     */
    private resetState;
    /**
     * 获取意图显示名称
     */
    private getIntentDisplayName;
    /**
     * 获取工具显示名称
     */
    private getToolDisplayName;
}
/**
 * 工厂函数 - 创建ConversationHandler实例
 */
export declare function createConversationHandler(serverGoUrl?: string): ConversationHandler;
//# sourceMappingURL=conversation-handler.d.ts.map