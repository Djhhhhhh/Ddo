import client from './client'
import type {
  CreateMCPRequest,
} from './types'

// API 返回类型（已包含 ApiResponse 包装）
export interface ApiMCPItem {
  uuid: string
  name: string
  description: string
  type: 'stdio' | 'http' | 'sse'
  status: string
  last_test_at?: string
}

export interface ApiMCPDetail {
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

export interface ApiListMCPsResponse {
  code: number
  msg: string
  data: {
    total: number
    items: ApiMCPItem[]
  }
}

export interface ApiGetMCPResponse {
  code: number
  msg: string
  data: {
    mcp: ApiMCPDetail
  }
}

export interface ApiTestMCPResponse {
  code: number
  msg: string
  data: {
    success: boolean
    tools: string[]
    error?: string
  }
}

export interface ApiDeleteMCPResponse {
  code: number
  msg: string
  data: {
    success: boolean
  }
}

export interface ApiCreateMCPResponse {
  code: number
  msg: string
  data: {
    uuid: string
    name: string
    type: string
    status: string
  }
}

export function listMCPs(): Promise<ApiListMCPsResponse> {
  return client.get<ApiListMCPsResponse>('/api/v1/mcps')
    .then(res => res.data)
}

export function createMCP(data: CreateMCPRequest): Promise<ApiCreateMCPResponse> {
  return client.post<ApiCreateMCPResponse>('/api/v1/mcps', data)
    .then(res => res.data)
}

export function getMCP(uuid: string): Promise<ApiGetMCPResponse> {
  return client.get<ApiGetMCPResponse>(`/api/v1/mcps/${uuid}`)
    .then(res => res.data)
}

export function deleteMCP(uuid: string): Promise<ApiDeleteMCPResponse> {
  return client.post<ApiDeleteMCPResponse>(`/api/v1/mcps/${uuid}/delete`)
    .then(res => res.data)
}

export function testMCP(uuid: string, timeout?: number): Promise<ApiTestMCPResponse> {
  return client.post<ApiTestMCPResponse>(`/api/v1/mcps/${uuid}/test`, { timeout })
    .then(res => res.data)
}
