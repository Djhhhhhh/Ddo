import client from './client'
import type {
  KnowledgeListResponse,
  KnowledgeSearchResponse,
  KnowledgeAskRequest,
  KnowledgeAskResponse,
  GetKnowledgeResponse,
  DeleteKnowledgeResponse,
  CreateKnowledgeRequest,
  CreateKnowledgeResponse,
} from './types'

export interface ListKnowledgeParams {
  page?: number
  page_size?: number
  keyword?: string
  category?: string
  tag?: string
}

export function listKnowledge(params: ListKnowledgeParams = {}): Promise<KnowledgeListResponse> {
  return client.get<KnowledgeListResponse>('/api/v1/knowledge', {
    params: {
      page: params.page || 1,
      page_size: params.page_size || 20,
      keyword: params.keyword,
      category: params.category,
      tag: params.tag
    }
  })
    .then(res => res.data)
}

export function searchKnowledge(query: string, limit = 10): Promise<KnowledgeSearchResponse> {
  return client.get<KnowledgeSearchResponse>('/api/v1/knowledge/search', {
    params: { q: query, limit }
  })
    .then(res => res.data)
}

export function getKnowledge(uuid: string): Promise<GetKnowledgeResponse> {
  return client.get<GetKnowledgeResponse>(`/api/v1/knowledge/${uuid}`)
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

export function askKnowledge(data: KnowledgeAskRequest): Promise<KnowledgeAskResponse> {
  return client.post<KnowledgeAskResponse>('/api/v1/knowledge/ask', data)
    .then(res => res.data)
}
