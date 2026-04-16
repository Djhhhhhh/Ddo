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
  type: 'stdio' | 'http' | 'sse';
  status: 'connected' | 'disconnected';
  command?: string;
  args?: string[];
  url?: string;
  created_at: string;
}

export interface McpListResponse {
  mcps: Mcp[];
}

export interface McpTestResponse {
  status: string;
  tools: string[];
}

export interface ApiClientConfig {
  serverGoUrl: string;
}

/**
 * 创建 API Client
 * 注意：不使用超时限制，因为 LLM 推理时间不可预知
 */
export function createApiClient(config: ApiClientConfig) {
  const { serverGoUrl } = config;

  /**
   * 发送 HTTP 请求（无超时限制）
   * 自动解包 server-go 的标准响应格式 {code, message, data, ...}
   */
  async function request<T>(path: string, options?: RequestInit): Promise<T> {
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
      return {} as T;
    }

    const json = JSON.parse(text);

    // 解包标准响应格式：{code, message, data, ...} -> 返回 data
    if (json && typeof json === 'object' && 'data' in json) {
      return json.data as T;
    }

    return json as T;
  }

  // === 健康检查 ===

  async function getHealth(): Promise<ServerGoHealth> {
    return request<ServerGoHealth>('/api/v1/health');
  }

  async function getMetrics(): Promise<Metrics> {
    return request<Metrics>('/api/v1/metrics');
  }

  // === LLM（经 server-go 代理到 llm-py）===

  async function chat(messages: Message[], stream = false): Promise<ChatResponse> {
    return request<ChatResponse>('/api/v1/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, stream }),
    });
  }

  async function analyzeText(text: string, context?: Record<string, unknown>): Promise<NLPResponse> {
    return request<NLPResponse>('/api/v1/chat/nlp', {
      method: 'POST',
      body: JSON.stringify({ text, context: context ?? null }),
    });
  }

  // === 知识库 ===

  async function getKnowledgeList(params: { page?: number; page_size?: number } = {}): Promise<KnowledgeListResponse> {
    const { page = 1, page_size = 20 } = params;
    return request<KnowledgeListResponse>(`/api/v1/knowledge?page=${page}&page_size=${page_size}`);
  }

  async function createKnowledge(data: {
    title: string;
    content: string;
    category?: string;
    tags?: string[];
  }): Promise<Knowledge> {
    return request<Knowledge>('/api/v1/knowledge', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async function getKnowledge(uuid: string): Promise<Knowledge> {
    return request<Knowledge>(`/api/v1/knowledge/${uuid}`);
  }

  async function deleteKnowledge(uuid: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/v1/knowledge/${uuid}/delete`, {
      method: 'POST',
    });
  }

  async function searchKnowledge(params: {
    query: string;
    top_k?: number;
  }): Promise<SearchResponse> {
    const { query, top_k = 5 } = params;
    // server-go 使用 q 作为查询参数名
    return request<SearchResponse>(`/api/v1/knowledge/search?q=${encodeURIComponent(query)}&limit=${top_k}`);
  }

  async function askKnowledge(question: string): Promise<AskResponse> {
    return request<AskResponse>('/api/v1/knowledge/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  // === 定时任务 ===

  async function getTimers(): Promise<TimerListResponse> {
    return request<TimerListResponse>('/api/v1/timers');
  }

  async function getTimer(uuid: string): Promise<Timer> {
    return request<Timer>(`/api/v1/timers/${uuid}`);
  }

  async function createTimer(data: {
    name: string;
    cron: string;
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<Timer> {
    // 后端使用 cron_expr 和 callback_url，需要字段映射
    return request<Timer>('/api/v1/timers', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        cron_expr: data.cron,
        callback_url: data.url,
        callback_method: data.method || 'GET',
        callback_headers: data.headers,
        callback_body: data.body,
      }),
    });
  }

  async function pauseTimer(uuid: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/v1/timers/${uuid}/pause`, {
      method: 'POST',
    });
  }

  async function resumeTimer(uuid: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/v1/timers/${uuid}/resume`, {
      method: 'POST',
    });
  }

  async function deleteTimer(uuid: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/v1/timers/${uuid}/delete`, {
      method: 'POST',
    });
  }

  // === MCP ===

  async function getMcpList(): Promise<McpListResponse> {
    return request<McpListResponse>('/api/v1/mcps');
  }

  async function createMcp(data: {
    name: string;
    type: string;
    command?: string;
    args?: string[];
    url?: string;
    headers?: Record<string, string>;
    env?: Record<string, string>;
  }): Promise<Mcp> {
    return request<Mcp>('/api/v1/mcps', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async function testMcp(uuid: string): Promise<McpTestResponse> {
    return request<McpTestResponse>(`/api/v1/mcps/${uuid}/test`, {
      method: 'POST',
    });
  }

  async function deleteMcp(uuid: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/v1/mcps/${uuid}/delete`, {
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
  };
}

/** 全局 API Client 实例 */
let globalClient: ReturnType<typeof createApiClient> | null = null;

/**
 * 获取 API Client 单例
 */
export function getApiClient(): ReturnType<typeof createApiClient> {
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
export function resetApiClient(): void {
  globalClient = null;
}
