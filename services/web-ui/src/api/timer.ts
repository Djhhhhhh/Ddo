import client from './client'
import type {
  TimerListResponse,
  CreateTimerRequest,
  CreateTimerResponse,
  GetTimerResponse,
  UpdateTimerRequest,
  UpdateTimerResponse,
  PauseTimerResponse,
  ResumeTimerResponse,
  DeleteTimerResponse,
  TriggerTimerResponse,
  TimerLogsResponse,
} from './types'

export function listTimers(): Promise<TimerListResponse> {
  return client.get<TimerListResponse>('/api/v1/timers')
    .then(res => res.data)
}

export function createTimer(data: CreateTimerRequest): Promise<CreateTimerResponse> {
  return client.post<CreateTimerResponse>('/api/v1/timers', data)
    .then(res => res.data)
}

export function getTimer(uuid: string): Promise<GetTimerResponse> {
  return client.get<GetTimerResponse>(`/api/v1/timers/${uuid}`)
    .then(res => res.data)
}

export function updateTimer(uuid: string, data: UpdateTimerRequest): Promise<UpdateTimerResponse> {
  return client.post<UpdateTimerResponse>(`/api/v1/timers/${uuid}/update`, data)
    .then(res => res.data)
}

export function pauseTimer(uuid: string): Promise<PauseTimerResponse> {
  return client.post<PauseTimerResponse>(`/api/v1/timers/${uuid}/pause`)
    .then(res => res.data)
}

export function resumeTimer(uuid: string): Promise<ResumeTimerResponse> {
  return client.post<ResumeTimerResponse>(`/api/v1/timers/${uuid}/resume`)
    .then(res => res.data)
}

export function deleteTimer(uuid: string): Promise<DeleteTimerResponse> {
  return client.post<DeleteTimerResponse>(`/api/v1/timers/${uuid}/delete`)
    .then(res => res.data)
}

export function triggerTimer(uuid: string): Promise<TriggerTimerResponse> {
  return client.post<TriggerTimerResponse>(`/api/v1/timers/${uuid}/trigger`)
    .then(res => res.data)
}

export function listTimerLogs(uuid: string): Promise<TimerLogsResponse> {
  return client.get<TimerLogsResponse>(`/api/v1/timers/${uuid}/logs`)
    .then(res => res.data)
}
