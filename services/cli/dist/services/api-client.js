"use strict";
/**
 * API Client
 * 统一调用 server-go API（server-go 再代理到 llm-py）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiClient = createApiClient;
exports.getApiClient = getApiClient;
exports.resetApiClient = resetApiClient;
/**
 * 创建 API Client
 * 注意：不使用超时限制，因为 LLM 推理时间不可预知
 */
function createApiClient(config) {
    const { serverGoUrl } = config;
    /**
     * 发送 HTTP 请求（无超时限制）
     * 自动解包 server-go 的标准响应格式 {code, message, data, ...}
     */
    async function request(path, options) {
        const url = `${serverGoUrl}${path}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API ${path} failed: ${response.status} ${errorBody}`);
        }
        const text = await response.text();
        if (!text) {
            return {};
        }
        const json = JSON.parse(text);
        // 解包标准响应格式：{code, message, data, ...} -> 返回 data
        if (json && typeof json === 'object' && 'data' in json) {
            return json.data;
        }
        return json;
    }
    // === 健康检查 ===
    async function getHealth() {
        return request('/api/v1/health');
    }
    async function getMetrics() {
        return request('/api/v1/metrics');
    }
    // === LLM（经 server-go 代理到 llm-py）===
    async function chat(messages, stream = false) {
        return request('/api/v1/chat', {
            method: 'POST',
            body: JSON.stringify({ messages, stream }),
        });
    }
    async function analyzeText(text, context) {
        return request('/api/v1/chat/nlp', {
            method: 'POST',
            body: JSON.stringify({ text, context: context ?? null }),
        });
    }
    // === 知识库 ===
    async function getKnowledgeList(params = {}) {
        const { page = 1, page_size = 20 } = params;
        return request(`/api/v1/knowledge?page=${page}&page_size=${page_size}`);
    }
    async function createKnowledge(data) {
        return request('/api/v1/knowledge', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async function getKnowledge(uuid) {
        return request(`/api/v1/knowledge/${uuid}`);
    }
    async function deleteKnowledge(uuid) {
        return request(`/api/v1/knowledge/${uuid}/delete`, {
            method: 'POST',
        });
    }
    async function searchKnowledge(params) {
        const { query, top_k = 5 } = params;
        // server-go 使用 q 作为查询参数名
        return request(`/api/v1/knowledge/search?q=${encodeURIComponent(query)}&limit=${top_k}`);
    }
    async function askKnowledge(question) {
        return request('/api/v1/knowledge/ask', {
            method: 'POST',
            body: JSON.stringify({ question }),
        });
    }
    // === 统一对话接口 ===
    async function conversationChat(req) {
        return request('/api/v1/conversation/chat', {
            method: 'POST',
            body: JSON.stringify(req),
        });
    }
    async function conversationChatStream(req) {
        return fetch(`${serverGoUrl}/api/v1/conversation/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
            },
            body: JSON.stringify(req),
        });
    }
    // === 定时任务 ===
    async function getTimers() {
        return request('/api/v1/timers');
    }
    async function getTimer(uuid) {
        return request(`/api/v1/timers/${uuid}`);
    }
    async function createTimer(data) {
        return request('/api/v1/timers', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async function pauseTimer(uuid) {
        return request(`/api/v1/timers/${uuid}/pause`, {
            method: 'POST',
        });
    }
    async function resumeTimer(uuid) {
        return request(`/api/v1/timers/${uuid}/resume`, {
            method: 'POST',
        });
    }
    async function deleteTimer(uuid) {
        return request(`/api/v1/timers/${uuid}/delete`, {
            method: 'POST',
        });
    }
    // === MCP ===
    async function getMcpList() {
        return request('/api/v1/mcps');
    }
    async function createMcp(data) {
        return request('/api/v1/mcps', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async function testMcp(uuid) {
        return request(`/api/v1/mcps/${uuid}/test`, {
            method: 'POST',
        });
    }
    async function deleteMcp(uuid) {
        return request(`/api/v1/mcps/${uuid}/delete`, {
            method: 'POST',
        });
    }
    return {
        // 健康检查
        getHealth,
        getMetrics,
        // LLM
        chat,
        analyzeText,
        // 知识库
        getKnowledgeList,
        createKnowledge,
        getKnowledge,
        deleteKnowledge,
        searchKnowledge,
        askKnowledge,
        // 定时任务
        getTimers,
        getTimer,
        createTimer,
        pauseTimer,
        resumeTimer,
        deleteTimer,
        // MCP
        getMcpList,
        createMcp,
        testMcp,
        deleteMcp,
        // 统一对话
        conversationChat,
        conversationChatStream,
    };
}
/** 全局 API Client 实例 */
let globalClient = null;
/**
 * 获取 API Client 单例
 */
function getApiClient() {
    if (!globalClient) {
        const serverGoUrl = process.env.DDO_SERVER_GO_URL || 'http://localhost:8080';
        globalClient = createApiClient({
            serverGoUrl,
        });
    }
    return globalClient;
}
/**
 * 重置 API Client（用于测试或配置变更）
 */
function resetApiClient() {
    globalClient = null;
}
//# sourceMappingURL=api-client.js.map