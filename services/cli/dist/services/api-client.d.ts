/**
 * API Client
 * 统一调用 server-go API（server-go 再代理到 llm-py）
 */
export interface ServerGoHealth {
    status: 'ok' | 'error';
    mysql: 'connected' | 'disconnected';
    badgerdb: 'ok' | 'error';
}
export interface Metrics {
    status: string;
    version: string;
    timestamp: string;
    services: {
        server_go: string;
        llm_py: string;
        mysql: string;
    };
    timers: {
        total: number;
        active: number;
    };
    knowledge: {
        total: number;
    };
    mcps: {
        total: number;
    };
}
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export interface ChatResponse {
    content: string;
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
}
export interface NLPResponse {
    intent: string;
    confidence: number;
    entities: NLPEntity[];
    parameters: Record<string, unknown>;
    reply: string;
}
export interface NLPEntity {
    type: string;
    value: string;
}
export interface Knowledge {
    uuid: string;
    title: string;
    content: string;
    category: string;
    categories?: string[];
    tags: string[];
    created_at: string;
    updated_at: string;
}
export interface KnowledgeListResponse {
    data: Knowledge[];
    total: number;
    page: number;
    page_size: number;
}
export interface SearchResult {
    uuid: string;
    content: string;
    score: number;
    metadata?: Record<string, unknown>;
}
export interface SearchResponse {
    results: SearchResult[];
    total: number;
}
export interface AskResponse {
    answer: string;
    sources: string[];
}
export interface Timer {
    uuid: string;
    name: string;
    cron: string;
    enabled: boolean;
    last_run?: string;
    next_run?: string;
    created_at: string;
}
export interface TimerListResponse {
    data: Timer[];
    total: number;
}
export interface Mcp {
    uuid: string;
    name: string;
    type: 'stdio' | 'http' | 'streamable_http' | 'sse';
    status: 'connected' | 'disconnected' | 'active' | 'inactive';
    command?: string;
    args?: string[];
    url?: string;
    created_at: string;
}
export interface McpListResponse {
    mcps: Mcp[];
}
export interface McpTool {
    name: string;
    title?: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
    annotations?: Record<string, unknown>;
}
export interface McpConnectionTestResponse {
    status?: string;
    reachable?: boolean;
    initializeSucceeded?: boolean;
    protocolReady?: boolean;
    latencyMs?: number;
    serverInfo?: Record<string, unknown>;
    serverProtocolVersion?: string;
    serverCapabilities?: Record<string, unknown>;
    tools?: Array<string | McpTool>;
    error?: string;
}
export interface McpToolListResponse {
    serverId?: string;
    tools: McpTool[];
}
export interface McpToolCallResponse {
    content?: unknown;
    structuredContent?: unknown;
    raw?: unknown;
    isError?: boolean;
    error?: string;
    [key: string]: unknown;
}
export interface McpTestResponse {
    status: string;
    tools: string[];
}
export interface ApiClientConfig {
    serverGoUrl: string;
}
export interface ConversationRequest {
    query: string;
    conversation_id?: string | null;
    model?: string;
    stream?: boolean;
    kb_priority?: boolean;
}
export interface ConversationResponse {
    decision: string;
    intent: {
        type: string;
        sub_intent: string;
        need_knowledge: boolean;
        confidence: number;
    };
    answer: string;
    sources?: string[];
    retrieved_docs?: {
        id: string;
        content: string;
        score: number;
    }[];
}
/**
 * 创建 API Client
 * 注意：不使用超时限制，因为 LLM 推理时间不可预知
 */
export declare function createApiClient(config: ApiClientConfig): {
    getHealth: () => Promise<ServerGoHealth>;
    getMetrics: () => Promise<Metrics>;
    chat: (messages: Message[], stream?: boolean) => Promise<ChatResponse>;
    analyzeText: (text: string, context?: Record<string, unknown>) => Promise<NLPResponse>;
    getKnowledgeList: (params?: {
        page?: number;
        page_size?: number;
    }) => Promise<KnowledgeListResponse>;
    createKnowledge: (data: {
        title: string;
        content: string;
        category?: string;
        tags?: string[];
        source?: string;
    }) => Promise<Knowledge>;
    getKnowledge: (uuid: string) => Promise<Knowledge>;
    deleteKnowledge: (uuid: string) => Promise<{
        success: boolean;
    }>;
    searchKnowledge: (params: {
        query: string;
        top_k?: number;
    }) => Promise<SearchResponse>;
    askKnowledge: (question: string) => Promise<AskResponse>;
    getTimers: () => Promise<TimerListResponse>;
    getTimer: (uuid: string) => Promise<Timer>;
    createTimer: (data: {
        name: string;
        description?: string;
        trigger_type?: "cron" | "periodic" | "delayed";
        cron_expr?: string;
        interval_seconds?: number;
        delay_seconds?: number;
        timezone?: string;
        callback_url: string;
        callback_method?: string;
        callback_headers?: Record<string, string>;
        callback_body?: string;
    }) => Promise<Timer>;
    pauseTimer: (uuid: string) => Promise<{
        success: boolean;
    }>;
    resumeTimer: (uuid: string) => Promise<{
        success: boolean;
    }>;
    deleteTimer: (uuid: string) => Promise<{
        success: boolean;
    }>;
    getMcpList: () => Promise<McpListResponse>;
    createMcp: (data: {
        name: string;
        type: string;
        command?: string;
        args?: string[];
        url?: string;
        headers?: Record<string, string>;
        env?: Record<string, string>;
    }) => Promise<Mcp>;
    testMcp: (uuid: string) => Promise<McpTestResponse>;
    testMcpConnection: (uuid: string) => Promise<McpConnectionTestResponse>;
    getMcpTools: (uuid: string) => Promise<McpToolListResponse>;
    callMcpTool: (uuid: string, toolName: string, args: Record<string, unknown>) => Promise<McpToolCallResponse>;
    deleteMcp: (uuid: string) => Promise<{
        success: boolean;
    }>;
    connectMcp: (uuid: string) => Promise<{
        status: string;
    }>;
    disconnectMcp: (uuid: string) => Promise<{
        status: string;
    }>;
    conversationChat: (req: ConversationRequest) => Promise<ConversationResponse>;
    conversationChatStream: (req: ConversationRequest) => Promise<Response>;
};
/**
 * 获取 API Client 单例
 */
export declare function getApiClient(): ReturnType<typeof createApiClient>;
/**
 * 重置 API Client（用于测试或配置变更）
 */
export declare function resetApiClient(): void;
//# sourceMappingURL=api-client.d.ts.map