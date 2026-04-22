"use strict";
/**
 * NLP Service
 * 通过 server-go 代理调用 llm-py 的 NLP 意图识别能力
 * 注意：不使用超时限制，因为 LLM 推理时间不可预知
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
const config_1 = require("../utils/config");
const paths_1 = require("../utils/paths");
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
 * 不使用超时限制，因为 LLM 推理时间不可预知
 */
function createNLPService(config) {
    const { baseUrl } = config;
    /**
     * 发送 HTTP 请求（无超时限制）
     */
    async function request(path, body) {
        const url = `${baseUrl}${path}`;
        logger_1.default.debug(`[nlp] 请求 ${url}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new NLPServiceError(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }
    /**
     * 意图识别 - 分析文本并提取意图和实体
     * 调用 server-go /api/v1/chat/nlp（server-go 再代理到 llm-py）
     */
    async function analyzeText(text, context, model) {
        const result = await request('/api/v1/chat/nlp', {
            text,
            context: context ?? null,
            model: model ?? null,
        });
        logger_1.default.debug(`[nlp] 意图识别结果: intent=${result.intent}, confidence=${result.confidence}`);
        return result;
    }
    /**
     * 命令解析 - 将自然语言命令解析为结构化命令
     * 调用 server-go /api/v1/chat/nlp（server-go 再代理到 llm-py）
     */
    async function parseCommand(command, availableCommands, model) {
        const result = await request('/api/v1/chat/nlp', {
            text: command,
            context: {
                mode: 'parse',
                available_commands: availableCommands,
            },
            model: model ?? null,
        });
        logger_1.default.debug(`[nlp] 命令解析结果: command=${result.command}, ambiguous=${result.is_ambiguous}`);
        return result;
    }
    /**
     * 检查 NLP 服务是否可用
     * 通过 server-go 健康检查判断（使用短超时，只检测连接性）
     */
    async function isAvailable() {
        try {
            const response = await fetch(`${baseUrl}/api/v1/health`, {
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
 * 使用默认配置：http://localhost:8080（server-go 地址）
 */
function getNLPService() {
    if (!defaultService) {
        const dataDir = (0, paths_1.resolveDataDir)({
            envDataDir: process.env.DDO_DATA_DIR,
        });
        defaultService = createNLPService({
            baseUrl: process.env.DDO_SERVER_GO_URL || (0, config_1.loadDdoConfigSync)(dataDir).endpoints.serverGo,
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