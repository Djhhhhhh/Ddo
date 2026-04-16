"use strict";
/**
 * NLP Service
 * 与 llm-py 服务通信，提供意图识别和命令解析能力
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NLPServiceError = void 0;
exports.createNLPService = createNLPService;
exports.getNLPService = getNLPService;
exports.resetNLPService = resetNLPService;
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * NLP Service 错误类
 */
class NLPServiceError extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'NLPServiceError';
    }
}
exports.NLPServiceError = NLPServiceError;
/**
 * 创建 NLP Service
 */
function createNLPService(config) {
    const { baseUrl, timeout } = config;
    /**
     * 发送 HTTP 请求
     */
    async function request(path, body) {
        const url = `${baseUrl}${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            logger_1.default.debug(`[nlp] 请求 ${url}`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new NLPServiceError(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error && err.name === 'AbortError') {
                throw new NLPServiceError(`请求超时 (${timeout}ms)`);
            }
            if (err instanceof NLPServiceError) {
                throw err;
            }
            throw new NLPServiceError(`NLP 服务请求失败: ${err instanceof Error ? err.message : String(err)}`, err);
        }
    }
    /**
     * 意图识别 - 分析文本并提取意图和实体
     */
    async function analyzeText(text, context, model) {
        const result = await request('/api/nlp', {
            text,
            context: context ?? null,
            model: model ?? null,
        });
        logger_1.default.debug(`[nlp] 意图识别结果: intent=${result.intent}, confidence=${result.confidence}`);
        return result;
    }
    /**
     * 命令解析 - 将自然语言命令解析为结构化命令
     */
    async function parseCommand(command, availableCommands, model) {
        const result = await request('/api/nlp/parse', {
            command,
            available_commands: availableCommands,
            model: model ?? null,
        });
        logger_1.default.debug(`[nlp] 命令解析结果: command=${result.command}, ambiguous=${result.is_ambiguous}`);
        return result;
    }
    /**
     * 检查 NLP 服务是否可用
     */
    async function isAvailable() {
        try {
            const response = await fetch(`${baseUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000),
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    return {
        analyzeText,
        parseCommand,
        isAvailable,
    };
}
/** 默认 NLP Service 实例（延迟初始化） */
let defaultService = null;
/**
 * 获取默认 NLP Service
 * 使用默认配置：http://localhost:8000, 10秒超时
 */
function getNLPService() {
    if (!defaultService) {
        defaultService = createNLPService({
            baseUrl: process.env.DDO_LLM_PY_URL || 'http://localhost:8000',
            timeout: parseInt(process.env.DDO_NLP_TIMEOUT || '10000', 10),
        });
    }
    return defaultService;
}
/**
 * 重置默认 NLP Service（用于测试或配置变更）
 */
function resetNLPService() {
    defaultService = null;
}
//# sourceMappingURL=nlp.js.map