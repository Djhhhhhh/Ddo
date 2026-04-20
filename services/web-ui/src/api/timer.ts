import client from './client'
import type {
  CreateTimerRequest,
  UpdateTimerRequest,
} from './types'

// API 返回类型（已包含 ApiResponse 包装）
export interface ApiTimerItem {
  uuid: string
  name: string
  description?: string
  trigger_type: 'cron' | 'periodic' | 'delayed'
  cron_expr?: string
  interval_seconds?: number
  delay_seconds?: number
  timezone?: string
  status: string
  callback_url: string
  callback_method: string
  callback_headers?: Record<string, string>
  callback_body?: string
  last_run_at?: string
  next_run_at?: string
  created_at?: string
  updated_at?: string
}

export interface ApiTimerDetail extends ApiTimerItem {
  stats: {
    total_runs: number
    success_rate: number
    avg_duration_ms: number
    last_status?: string
  }
}

export interface ApiTimerLog {
  id: string
  status: string
  output?: string
  error?: string
  duration: number
  created_at: string
}

export interface ApiListTimersResponse {
  code: number
  msg: string
  data: {
    total: number
    items: ApiTimerItem[]
  }
}

export interface ApiGetTimerResponse {
  code: number
  msg: string
  data: {
    timer: ApiTimerDetail
  }
}

export interface ApiTimerLogsResponse {
  code: number
  msg: string
  data: {
    total: number
    items: ApiTimerLog[]
  }
}

export interface ApiTimerActionResponse {
  code: number
  msg: string
  data: {
    uuid: string
    status: string
  }
}

export interface ApiDeleteResponse {
  code: number
  msg: string
  data: {
    success: boolean
  }
}

export interface ApiCreateTimerResponse {
  code: number
  msg: string
  data: {
    uuid: string
    name: string
    status: string
    next_run_at?: string
  }
}

export function listTimers(): Promise<ApiListTimersResponse> {
  return client.get<ApiListTimersResponse>('/api/v1/timers')
    .then(res => res.data)
}

export function createTimer(data: CreateTimerRequest): Promise<ApiCreateTimerResponse> {
  return client.post<ApiCreateTimerResponse>('/api/v1/timers', data)
    .then(res => res.data)
}

export function getTimer(uuid: string): Promise<ApiGetTimerResponse> {
  return client.get<ApiGetTimerResponse>(`/api/v1/timers/${uuid}`)
    .then(res => res.data)
}

export function updateTimer(uuid: string, data: UpdateTimerRequest): Promise<ApiTimerActionResponse> {
  return client.post<ApiTimerActionResponse>(`/api/v1/timers/${uuid}/update`, data)
    .then(res => res.data)
}

export function pauseTimer(uuid: string): Promise<ApiTimerActionResponse> {
  return client.post<ApiTimerActionResponse>(`/api/v1/timers/${uuid}/pause`)
    .then(res => res.data)
}

export function resumeTimer(uuid: string): Promise<ApiTimerActionResponse> {
  return client.post<ApiTimerActionResponse>(`/api/v1/timers/${uuid}/resume`)
    .then(res => res.data)
}

export function deleteTimer(uuid: string): Promise<ApiDeleteResponse> {
  return client.post<ApiDeleteResponse>(`/api/v1/timers/${uuid}/delete`)
    .then(res => res.data)
}

export function triggerTimer(uuid: string): Promise<ApiTimerActionResponse> {
  return client.post<ApiTimerActionResponse>(`/api/v1/timers/${uuid}/trigger`)
    .then(res => res.data)
}

export function listTimerLogs(uuid: string): Promise<ApiTimerLogsResponse> {
  return client.get<ApiTimerLogsResponse>(`/api/v1/timers/${uuid}/logs`)
    .then(res => res.data)
}
