import client from './client'
import type { KnowledgeListResponse, KnowledgeSearchResponse } from './types'

export function listKnowledge(): Promise<KnowledgeListResponse> {
  return client.get<KnowledgeListResponse>('/api/v1/knowledge')
    .then(res => res.data)
}

export function searchKnowledge(keyword: string): Promise<KnowledgeSearchResponse> {
  return client.get<KnowledgeSearchResponse>('/api/v1/knowledge/search', {
    params: { q: keyword }
  })
    .then(res => res.data)
}
