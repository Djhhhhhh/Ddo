import client from './client'
import type { TimerListResponse } from './types'

export function listTimers(): Promise<TimerListResponse> {
  return client.get<TimerListResponse>('/api/v1/timers')
    .then(res => res.data)
}

export function pauseTimer(uuid: string): Promise<void> {
  return client.post(`/api/v1/timers/${uuid}/pause`)
    .then(res => res.data)
}

export function resumeTimer(uuid: string): Promise<void> {
  return client.post(`/api/v1/timers/${uuid}/resume`)
    .then(res => res.data)
}
