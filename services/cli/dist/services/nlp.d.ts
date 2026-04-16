/**
 * NLP Service
 * 与 llm-py 服务通信，提供意图识别和命令解析能力
 */
/** NLP API 响应 - 意图识别 */
export interface NLPResponse {
    intent: string;
    confidence: number;
    entities: NLPEntity[];
    parameters: Record<string, unknown>;
    reply: string;
}
/** NLP 实体 */
export interface NLPEntity {
    type: string;
    value: string;
    start?: number;
    end?: number;
}
/** NLP API 响应 - 命令解析 */
export interface NLPParseResponse {
    command: string;
    arguments: Record<string, unknown>;
    is_ambiguous: boolean;
    suggestions: string[];
}
/** NLP Service 配置 */
interface NLPServiceConfig {
    /** llm-py 服务地址 */
    baseUrl: string;
    /** 请求超时（毫秒） */
    timeout: number;
}
/**
 * NLP Service 错误类
 */
export declare class NLPServiceError extends Error {
    cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
/**
 * 创建 NLP Service
 */
export declare function createNLPService(config: NLPServiceConfig): {
    analyzeText: (text: string, context?: Record<string, unknown>, model?: string) => Promise<NLPResponse>;
    parseCommand: (command: string, availableCommands: string[], model?: string) => Promise<NLPParseResponse>;
    isAvailable: () => Promise<boolean>;
};
/**
 * 获取默认 NLP Service
 * 使用默认配置：http://localhost:8000, 10秒超时
 */
export declare function getNLPService(): ReturnType<typeof createNLPService>;
/**
 * 重置默认 NLP Service（用于测试或配置变更）
 */
export declare function resetNLPService(): void;
export {};
//# sourceMappingURL=nlp.d.ts.map