import client from './client'
import type {
  DeleteKnowledgeResponse,
  CreateKnowledgeRequest,
  CreateKnowledgeResponse,
  KnowledgeSearchResponse,
  KnowledgeAskRequest,
} from './types'

export interface ListKnowledgeParams {
  page?: number
  page_size?: number
  keyword?: string
  category?: string
  tag?: string
}

// API 返回类型（已包含 ApiResponse 包装）
export interface ApiListKnowledgeResponse {
  code: number
  msg: string
  data: {
    total: number
    items: Array<{
      uuid: string
      title: string
      content: string
      category?: string
      tags?: string[]
      source?: string
      status?: string
      created_at?: string
      updated_at?: string
    }>
  }
}

export function listKnowledge(params: ListKnowledgeParams = {}): Promise<ApiListKnowledgeResponse> {
  return client.get<ApiListKnowledgeResponse>('/api/v1/knowledge', {
    params: {
      page: params.page || 1,
      page_size: params.page_size || 20,
      keyword: params.keyword,
      category: params.category,
      tag: params.tag
    }
  }).then(res => res.data)
}

export function searchKnowledge(query: string, limit = 10): Promise<KnowledgeSearchResponse> {
  return client.get<KnowledgeSearchResponse>('/api/v1/knowledge/search', {
    params: { q: query, limit }
  }).then(res => res.data)
}

export interface ApiGetKnowledgeResponse {
  code: number
  msg: string
  data: {
    knowledge: {
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
  }
}

export function getKnowledge(uuid: string): Promise<ApiGetKnowledgeResponse> {
  return client.get<ApiGetKnowledgeResponse>(`/api/v1/knowledge/${uuid}`)
    .then(res => res.data)
}

export function deleteKnowledge(uuid: string): Promise<DeleteKnowledgeResponse> {
  return client.post<DeleteKnowledgeResponse>(`/api/v1/knowledge/${uuid}/delete`)
    .then(res => res.data)
}

export function createKnowledge(data: CreateKnowledgeRequest): Promise<CreateKnowledgeResponse> {
  return client.post<CreateKnowledgeResponse>('/api/v1/knowledge', data)
    .then(res => res.data)
}

export interface ApiAskKnowledgeResponse {
  code: number
  msg: string
  data: {
    answer: string
    sources: Array<{
      uuid: string
      title: string
      snippet?: string
      category?: string
      score?: number
    }>
  }
}

export function askKnowledge(data: KnowledgeAskRequest): Promise<ApiAskKnowledgeResponse> {
  return client.post<ApiAskKnowledgeResponse>('/api/v1/knowledge/ask', data)
    .then(res => res.data)
}
