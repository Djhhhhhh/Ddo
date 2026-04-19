import client from './client'
import type { MetricsResponse } from './types'

export function getMetrics(): Promise<MetricsResponse> {
  return client.get<MetricsResponse>('/api/v1/metrics')
    .then(res => res.data)
}
