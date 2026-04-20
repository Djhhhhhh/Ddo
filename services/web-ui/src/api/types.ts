// API Types for DDO Web UI

// MCP Types
export interface MCPItem {
  uuid: string
  name: string
  description: string
  type: 'stdio' | 'http' | 'sse'
  status: string
  last_test_at?: string
}

export interface MCPDetail {
  uuid: string
  name: string
  description: string
  type: 'stdio' | 'http' | 'sse'
  command?: string
  args?: string[]
  env?: string[]
  url?: string
  headers?: Record<string, string>
  status: string
  last_error?: string
  last_test_at?: string
  created_at: string
  updated_at: string
}

export interface CreateMCPRequest {
  name: string
  description?: string
  type: 'stdio' | 'http' | 'sse'
  command?: string
  args?: string[]
  env?: string[]
  url?: string
  headers?: Record<string, string>
}

export interface CreateMCPData {
  uuid: string
  name: string
  type: string
  status: string
}

export interface CreateMCPResponse extends ApiResponse<CreateMCPData> {}

export interface MCPListData {
  total: number
  items: MCPItem[]
}

export interface MCPListResponse extends ApiResponse<MCPListData> {}

export interface GetMCPData {
  mcp: MCPDetail
}

export interface GetMCPResponse extends ApiResponse<GetMCPData> {}

export interface DeleteMCPData {
  success: boolean
}

export interface DeleteMCPResponse extends ApiResponse<DeleteMCPData> {}

export interface TestMCPData {
  status: string
  tools: string[]
  elapsed_ms: number
  error?: string
}

export interface TestMCPResponse extends ApiResponse<TestMCPData> {}

// Timer Types
export interface Timer {
  uuid: string
  name: string
  description?: string
  trigger_type: 'cron' | 'periodic' | 'delayed'
  cron_expr?: string
  interval_seconds?: number
  delay_seconds?: number
  timezone?: string
  status: string
  callback_url: string
  callback_method: string
  callback_headers?: Record<string, string>
  callback_body?: string
  last_run_at?: string
  next_run_at?: string
  created_at?: string
  updated_at?: string
}

export interface TimerDetail extends Timer {
  stats: {
    total_runs: number
    success_rate: number
    avg_duration_ms: number
    last_status?: string
  }
}

export interface TimerLog {
  id: string
  status: string
  output?: string
  error?: string
  duration: number
  created_at: string
}

export interface CreateTimerRequest {
  name: string
  description?: string
  trigger_type: 'cron' | 'periodic' | 'delayed'
  cron_expr?: string
  interval_seconds?: number
  delay_seconds?: number
  timezone?: string
  callback_url: string
  callback_method?: string
  callback_headers?: Record<string, string>
  callback_body?: string
}

export interface CreateTimerData {
  uuid: string
  name: string
  status: string
  next_run_at?: string
}

export interface CreateTimerResponse extends ApiResponse<CreateTimerData> {}

export interface TimerListData {
  total: number
  items: Timer[]
}

export interface TimerListResponse extends ApiResponse<TimerListData> {}

export interface GetTimerData {
  timer: TimerDetail
}

export interface GetTimerResponse extends ApiResponse<GetTimerData> {}

export interface UpdateTimerRequest {
  name?: string
  description?: string
  trigger_type?: 'cron' | 'periodic' | 'delayed'
  cron_expr?: string
  interval_seconds?: number
  delay_seconds?: number
  timezone?: string
  callback_url?: string
  callback_method?: string
  callback_headers?: Record<string, string>
  callback_body?: string
}

export interface UpdateTimerData {
  uuid: string
  name: string
  status: string
}

export interface UpdateTimerResponse extends ApiResponse<UpdateTimerData> {}

export interface PauseTimerData {
  uuid: string
  status: string
}

export interface PauseTimerResponse extends ApiResponse<PauseTimerData> {}

export interface ResumeTimerData {
  uuid: string
  status: string
}

export interface ResumeTimerResponse extends ApiResponse<ResumeTimerData> {}

export interface DeleteTimerData {
  success: boolean
}

export interface DeleteTimerResponse extends ApiResponse<DeleteTimerData> {}

export interface TriggerTimerData {
  uuid: string
  status: string
}

export interface TriggerTimerResponse extends ApiResponse<TriggerTimerData> {}

export interface TimerLogsData {
  total: number
  items: TimerLog[]
}

export interface TimerLogsResponse extends ApiResponse<TimerLogsData> {}

// Health API
export interface HealthData {
  status: string
  version: string
  mysql: string
  badgerdb: string
  timestamp?: string
}

export interface HealthResponse extends ApiResponse<HealthData> {}

// Metrics API
export interface ServicesMetrics {
  server_go: string
  llm_py: string
  mysql: string
  cli: string
  web: string
}

export interface TimerMetrics {
  total: number
  active: number
}

export interface KnowledgeMetrics {
  total: number
}

export interface McpMetrics {
  total: number
}

export interface MetricsData {
  status: string
  version: string
  services: ServicesMetrics
  timers: TimerMetrics
  knowledge: KnowledgeMetrics
  mcps: McpMetrics
}

export interface MetricsResponse extends ApiResponse<MetricsData> {}

// Timer API
export interface Timer {
  uuid: string
  name: string
  cron_expr: string  // 后端字段
  timezone?: string
  status: string
  next_run_at?: string  // 后端字段
  last_run_at?: string
  created_at?: string
  updated_at?: string
}

export interface TimerListData {
  total: number
  items: Timer[]
}

export interface TimerListResponse extends ApiResponse<TimerListData> {}

export interface MCPTestData {
  success: boolean
  tools: string[]
  error?: string
}

export interface MCPListResponse extends ApiResponse<MCPListData> {}

export interface MCPTestData {
  success: boolean
  tools: string[]
  error?: string
}

export interface MCPTestResponse extends ApiResponse<MCPTestData> {}

// Knowledge API
export interface KnowledgeListData {
  total: number
  items: Knowledge[]
}

export interface Knowledge {
  uuid: string
  title: string
  content: string
  category?: string
  tags?: string[]
  source?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export interface KnowledgeListResponse extends ApiResponse<KnowledgeListData> {}

export interface KnowledgeSearchResult {
  uuid: string
  title: string
  snippet?: string
  category?: string
  score?: number
}

export interface KnowledgeSearchResponse extends ApiResponse<KnowledgeSearchResult[]> {}

// Knowledge Create
export interface CreateKnowledgeRequest {
  title: string
  content: string
  category?: string
  tags?: string[]
  source?: string
}

export interface CreateKnowledgeData {
  uuid: string
  title: string
  category?: string
  tags?: string[]
  status: string
}

export interface CreateKnowledgeResponse extends ApiResponse<CreateKnowledgeData> {}

// Knowledge Ask (RAG)
export interface KnowledgeAskRequest {
  question: string
  top_k?: number
  context_limit?: number
  min_score?: number
}

export interface KnowledgeAskResponse extends ApiResponse<{
  answer: string
  sources: KnowledgeSearchResult[]
}> {}

export interface GetKnowledgeData {
  knowledge: Knowledge
}

export interface GetKnowledgeResponse extends ApiResponse<GetKnowledgeData> {}

export interface DeleteKnowledgeData {
  success: boolean
}

export interface DeleteKnowledgeResponse extends ApiResponse<DeleteKnowledgeData> {}

// RAG Chat Message
export interface RagMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: KnowledgeSearchResult[]
  timestamp: Date
}

// Word Cloud Data
export interface WordCloudItem {
  name: string
  value: number
}
