import client from './client'
import type { HealthResponse } from './types'

export function getHealth(): Promise<HealthResponse> {
  return client.get<HealthResponse>('/health')
    .then(res => res.data)
}
