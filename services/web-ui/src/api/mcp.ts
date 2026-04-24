import client from './client'
import type {
  CreateMCPRequest,
  MCPConnectTestResponse,
  MCPListToolsResponse,
  MCPCallToolResponse,
} from './types'

// API 返回类型（已包含 ApiResponse 包装）
export interface ApiMCPItem {
  uuid: string
  name: string
  description: string
  type: 'stdio' | 'http' | 'streamable_http' | 'sse'
  status: string
  last_test_at?: string
}

export interface ApiMCPDetail {
  uuid: string
  name: string
  description: string
  type: 'stdio' | 'http' | 'streamable_http' | 'sse'
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
    status: string
    tools: string[]
    elapsed_ms: number
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
  // 优先使用标准 DELETE 方法，失败时回退到旧版 POST /delete
  return client.delete<ApiDeleteMCPResponse>(`/api/v1/mcps/${uuid}`)
    .then(res => res.data)
    .catch((err) => {
      if (err.response?.status === 404 || err.response?.status === 405) {
        return client.post<ApiDeleteMCPResponse>(`/api/v1/mcps/${uuid}/delete`)
          .then(res => res.data)
      }
      throw err
    })
}

export function testMCP(uuid: string, timeout?: number): Promise<ApiTestMCPResponse> {
  return client.post<ApiTestMCPResponse>(`/api/v1/mcps/${uuid}/test`, { timeout })
    .then(res => res.data)
}

export function connectTestMCP(uuid: string, timeout?: number): Promise<MCPConnectTestResponse> {
  return client.post<MCPConnectTestResponse>(`/api/v1/mcps/${uuid}/connect-test`, null, { params: { timeout } })
    .then(res => res.data)
}

export function listMCPTools(uuid: string): Promise<MCPListToolsResponse> {
  return client.get<MCPListToolsResponse>(`/api/v1/mcps/${uuid}/tools`)
    .then(res => res.data)
}

export function callMCPTool(uuid: string, toolName: string, args: Record<string, unknown>): Promise<MCPCallToolResponse> {
  return client.post<MCPCallToolResponse>(`/api/v1/mcps/${uuid}/tools/${encodeURIComponent(toolName)}/test`, { arguments: args })
    .then(res => res.data)
}

export function connectMCP(uuid: string): Promise<{ code: number; message: string; data: { status: string }; timestamp: string }> {
  return client.post<{ code: number; message: string; data: { status: string }; timestamp: string }>(`/api/v1/mcps/${uuid}/connect`)
    .then(res => res.data)
}

export function disconnectMCP(uuid: string): Promise<{ code: number; message: string; data: { status: string }; timestamp: string }> {
  return client.post<{ code: number; message: string; data: { status: string }; timestamp: string }>(`/api/v1/mcps/${uuid}/disconnect`)
    .then(res => res.data)
}
