import client from './client'
import type {
  MCPListResponse,
  MCPTestResponse,
  CreateMCPRequest,
  CreateMCPResponse,
  GetMCPResponse,
  DeleteMCPResponse,
} from './types'

export function listMCPs(): Promise<MCPListResponse> {
  return client.get<MCPListResponse>('/api/v1/mcps')
    .then(res => res.data)
}

export function createMCP(data: CreateMCPRequest): Promise<CreateMCPResponse> {
  return client.post<CreateMCPResponse>('/api/v1/mcps', data)
    .then(res => res.data)
}

export function getMCP(uuid: string): Promise<GetMCPResponse> {
  return client.get<GetMCPResponse>(`/api/v1/mcps/${uuid}`)
    .then(res => res.data)
}

export function deleteMCP(uuid: string): Promise<DeleteMCPResponse> {
  return client.post<DeleteMCPResponse>(`/api/v1/mcps/${uuid}/delete`)
    .then(res => res.data)
}

export function testMCP(uuid: string, timeout?: number): Promise<MCPTestResponse> {
  return client.post<MCPTestResponse>(`/api/v1/mcps/${uuid}/test`, { timeout })
    .then(res => res.data)
}
