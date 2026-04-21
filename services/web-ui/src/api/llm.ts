// LLM 统计与对话记录 API
// 提供 LLM 调用趋势统计和对话历史查询

import api from './client'

// 类型定义
export interface OverviewStats {
  requests: number
  tokens: number
  avg_latency_ms: number
}

export interface OverviewResponse {
  today: OverviewStats
  this_week: OverviewStats
  this_month: OverviewStats
}

export interface TrendData {
  dates: string[]
  requests: number[]
  tokens: number[]
}

export interface ConversationItem {
  id: string
  session_id?: string
  title?: string
  memory_enabled: boolean
  source: string
  created_at: string
  updated_at: string
  message_count: number
}

export interface ConversationListResponse {
  items: ConversationItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// API 函数
export async function getLLMOverview(): Promise<OverviewResponse> {
  const res = await api.get('/api/v1/llm/stats/overview')
  return res.data.data
}

export async function getLLMTrend(days: number = 7, group_by: string = 'day'): Promise<TrendData> {
  const res = await api.get('/api/v1/llm/stats/trend', {
    params: { days, group_by }
  })
  return res.data.data
}

export async function getConversations(
  page: number = 1,
  page_size: number = 20,
  session_id?: string,
  source?: string
): Promise<ConversationListResponse> {
  const res = await api.get('/api/v1/llm/conversations', {
    params: { page, page_size, session_id, source }
  })
  return res.data.data
}
