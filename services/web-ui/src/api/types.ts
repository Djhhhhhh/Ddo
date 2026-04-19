// API Types for DDO Web UI

// Generic API Response
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

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
}

export interface KnowledgeSearchResponse extends ApiResponse<KnowledgeSearchResult[]> {}
