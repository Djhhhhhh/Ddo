import client from './client'
import type { MCPListResponse, MCPTestResponse } from './types'

export function listMCPs(): Promise<MCPListResponse> {
  return client.get<MCPListResponse>('/api/v1/mcps')
    .then(res => res.data)
}

export function testMCP(uuid: string): Promise<MCPTestResponse> {
  return client.post<MCPTestResponse>(`/api/v1/mcps/${uuid}/test`)
    .then(res => res.data)
}
