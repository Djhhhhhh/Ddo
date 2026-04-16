/**
 * NLP Service
 * 通过 server-go 代理调用 llm-py 的 NLP 意图识别能力
 * 注意：不使用超时限制，因为 LLM 推理时间不可预知
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
    /** server-go 服务地址（NLP 代理端点） */
    baseUrl: string;
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
 * 不使用超时限制，因为 LLM 推理时间不可预知
 */
export declare function createNLPService(config: NLPServiceConfig): {
    analyzeText: (text: string, context?: Record<string, unknown>, model?: string) => Promise<NLPResponse>;
    parseCommand: (command: string, availableCommands: string[], model?: string) => Promise<NLPParseResponse>;
    isAvailable: () => Promise<boolean>;
};
/**
 * 获取默认 NLP Service
 * 使用默认配置：http://localhost:8080（server-go 地址）
 */
export declare function getNLPService(): ReturnType<typeof createNLPService>;
/**
 * 重置默认 NLP Service（用于测试或配置变更）
 */
export declare function resetNLPService(): void;
export {};
//# sourceMappingURL=nlp.d.ts.map