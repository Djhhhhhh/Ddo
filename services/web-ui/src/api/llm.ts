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

export interface ConversationMessage {
  id?: string
  role: string
  content: string
  created_at?: string
  timestamp?: string
  model?: string
}

export interface ConversationDetailResponse extends ConversationItem {
  messages: ConversationMessage[]
}

function normalizeConversationDetail(payload: any, id: string): ConversationDetailResponse {
  const rawConversation = payload?.conversation ?? payload ?? {}
  const messageList = payload?.messages ?? rawConversation?.messages ?? payload?.items ?? []
  const normalizedMessages = Array.isArray(messageList)
    ? messageList
        .map((message: any) => ({
          id: message?.id,
          role: String(message?.role ?? message?.sender_role ?? message?.type ?? 'assistant'),
          content: String(message?.content ?? message?.text ?? message?.message ?? ''),
          created_at: message?.created_at,
          timestamp: message?.timestamp,
          model: message?.model
        }))
        .filter((message) => message.content)
    : []

  if (!normalizedMessages.length) {
    const userContent = rawConversation?.user_message ?? rawConversation?.user_content ?? rawConversation?.question ?? rawConversation?.prompt
    const assistantContent = rawConversation?.assistant_message ?? rawConversation?.assistant_content ?? rawConversation?.answer ?? rawConversation?.response

    if (userContent) {
      normalizedMessages.push({
        role: 'user',
        content: String(userContent),
        created_at: rawConversation?.created_at
      })
    }

    if (assistantContent) {
      normalizedMessages.push({
        role: 'assistant',
        content: String(assistantContent),
        created_at: rawConversation?.updated_at ?? rawConversation?.created_at
      })
    }
  }

  return {
    id: String(rawConversation?.id ?? id),
    session_id: rawConversation?.session_id,
    title: rawConversation?.title,
    memory_enabled: Boolean(rawConversation?.memory_enabled),
    source: String(rawConversation?.source ?? ''),
    created_at: String(rawConversation?.created_at ?? ''),
    updated_at: String(rawConversation?.updated_at ?? rawConversation?.created_at ?? ''),
    message_count: Number(rawConversation?.message_count ?? normalizedMessages.length),
    messages: normalizedMessages
  }
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

export async function getConversationDetail(id: string): Promise<ConversationDetailResponse> {
  const candidates = [
    `/api/v1/llm/conversations/${id}`,
    `/api/v1/llm/conversations/${id}/detail`,
    `/api/v1/llm/conversation/${id}`
  ]

  let lastError: unknown = null

  for (const url of candidates) {
    try {
      const res = await api.get(url)
      return normalizeConversationDetail(res.data?.data ?? res.data, id)
    } catch (error: any) {
      lastError = error

      if (error?.response?.status === 404) {
        continue
      }
    }
  }

  throw lastError
}
