package dto

import "time"

// TimerItemDTO 定时任务项 DTO
type TimerItemDTO struct {
	UUID        string `json:"uuid"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	CronExpr    string `json:"cron_expr"`
	Timezone    string `json:"timezone"`
	Status      string `json:"status"`
	LastRunAt   string `json:"last_run_at,omitempty"`
	NextRunAt   string `json:"next_run_at,omitempty"`
}

// TimerDetailDTO 定时任务详情 DTO
type TimerDetailDTO struct {
	UUID            string         `json:"uuid"`
	Name            string         `json:"name"`
	Description     string         `json:"description,omitempty"`
	CronExpr        string         `json:"cron_expr"`
	Timezone        string         `json:"timezone"`
	CallbackURL     string         `json:"callback_url"`
	CallbackMethod  string         `json:"callback_method"`
	CallbackHeaders string         `json:"callback_headers,omitempty"`
	CallbackBody    string         `json:"callback_body,omitempty"`
	Status          string         `json:"status"`
	LastRunAt       string         `json:"last_run_at,omitempty"`
	NextRunAt       string         `json:"next_run_at,omitempty"`
	Stats           TimerStatsDTO  `json:"stats"`
	CreatedAt       string         `json:"created_at"`
	UpdatedAt       string         `json:"updated_at"`
}

// TimerStatsDTO 定时任务统计 DTO
type TimerStatsDTO struct {
	TotalRuns   int64   `json:"total_runs"`
	SuccessRate float64 `json:"success_rate"`
	AvgDuration int64   `json:"avg_duration_ms"`
	LastStatus  string  `json:"last_status,omitempty"`
}

// TimerLogItemDTO 定时任务日志项 DTO
type TimerLogItemDTO struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	Output    string `json:"output,omitempty"`
	Error     string `json:"error,omitempty"`
	Duration  int64  `json:"duration"` // 毫秒
	CreatedAt string `json:"created_at"`
}

// CreateTimerRequest 创建定时任务请求
type CreateTimerRequest struct {
	Name            string            `json:"name" binding:"required"`
	Description     string            `json:"description"`
	CronExpr        string            `json:"cron_expr" binding:"required"`
	Timezone        string            `json:"timezone"`
	CallbackURL     string            `json:"callback_url" binding:"required"`
	CallbackMethod  string            `json:"callback_method"`
	CallbackHeaders map[string]string `json:"callback_headers"`
	CallbackBody    string            `json:"callback_body"`
}

// CreateTimerResponse 创建定时任务响应
type CreateTimerResponse struct {
	Code      int                `json:"code"`
	Message   string             `json:"message"`
	Data      CreateTimerData    `json:"data"`
	Timestamp time.Time          `json:"timestamp"`
}

// CreateTimerData 创建定时任务数据
type CreateTimerData struct {
	UUID      string     `json:"uuid"`
	Name      string     `json:"name"`
	Status    string     `json:"status"`
	NextRunAt string     `json:"next_run_at,omitempty"`
}

// ListTimerRequest 查询定时任务列表请求
type ListTimerRequest struct {
	Status   string `json:"status" form:"status"`
	Page     int    `json:"page" form:"page,default=1"`
	PageSize int    `json:"page_size" form:"page_size,default=20"`
}

// ListTimerResponse 查询定时任务列表响应
type ListTimerResponse struct {
	Code      int              `json:"code"`
	Message   string           `json:"message"`
	Data      ListTimerData    `json:"data"`
	Timestamp time.Time        `json:"timestamp"`
}

// ListTimerData 查询定时任务列表数据
type ListTimerData struct {
	Total int64          `json:"total"`
	Items []TimerItemDTO `json:"items"`
}

// GetTimerResponse 获取定时任务详情响应
type GetTimerResponse struct {
	Code      int              `json:"code"`
	Message   string           `json:"message"`
	Data      GetTimerData     `json:"data"`
	Timestamp time.Time        `json:"timestamp"`
}

// GetTimerData 获取定时任务详情数据
type GetTimerData struct {
	Timer TimerDetailDTO `json:"timer"`
}

// UpdateTimerRequest 更新定时任务请求
type UpdateTimerRequest struct {
	Name            string            `json:"name"`
	Description     string            `json:"description"`
	CronExpr        string            `json:"cron_expr"`
	Timezone        string            `json:"timezone"`
	CallbackURL     string            `json:"callback_url"`
	CallbackMethod  string            `json:"callback_method"`
	CallbackHeaders map[string]string `json:"callback_headers"`
	CallbackBody    string            `json:"callback_body"`
}

// UpdateTimerResponse 更新定时任务响应
type UpdateTimerResponse struct {
	Code      int               `json:"code"`
	Message   string            `json:"message"`
	Data      UpdateTimerData   `json:"data"`
	Timestamp time.Time         `json:"timestamp"`
}

// UpdateTimerData 更新定时任务数据
type UpdateTimerData struct {
	UUID   string `json:"uuid"`
	Name   string `json:"name"`
	Status string `json:"status"`
}

// PauseTimerResponse 暂停定时任务响应
type PauseTimerResponse struct {
	Code      int              `json:"code"`
	Message   string           `json:"message"`
	Data      PauseTimerData   `json:"data"`
	Timestamp time.Time        `json:"timestamp"`
}

// PauseTimerData 暂停定时任务数据
type PauseTimerData struct {
	UUID   string `json:"uuid"`
	Status string `json:"status"`
}

// ResumeTimerResponse 恢复定时任务响应
type ResumeTimerResponse struct {
	Code      int               `json:"code"`
	Message   string            `json:"message"`
	Data      ResumeTimerData   `json:"data"`
	Timestamp time.Time         `json:"timestamp"`
}

// ResumeTimerData 恢复定时任务数据
type ResumeTimerData struct {
	UUID   string `json:"uuid"`
	Status string `json:"status"`
}

// DeleteTimerResponse 删除定时任务响应
type DeleteTimerResponse struct {
	Code      int              `json:"code"`
	Message   string           `json:"message"`
	Data      DeleteTimerData  `json:"data"`
	Timestamp time.Time        `json:"timestamp"`
}

// DeleteTimerData 删除定时任务数据
type DeleteTimerData struct {
	Success bool `json:"success"`
}

// TriggerTimerResponse 手动触发定时任务响应
type TriggerTimerResponse struct {
	Code      int               `json:"code"`
	Message   string            `json:"message"`
	Data      TriggerTimerData  `json:"data"`
	Timestamp time.Time         `json:"timestamp"`
}

// TriggerTimerData 手动触发定时任务数据
type TriggerTimerData struct {
	UUID   string `json:"uuid"`
	Status string `json:"status"`
}

// ListTimerLogsRequest 查询定时任务日志请求
type ListTimerLogsRequest struct {
	Status   string `json:"status" form:"status"`
	Page     int    `json:"page" form:"page,default=1"`
	PageSize int    `json:"page_size" form:"page_size,default=20"`
}

// ListTimerLogsResponse 查询定时任务日志响应
type ListTimerLogsResponse struct {
	Code      int                 `json:"code"`
	Message   string              `json:"message"`
	Data      ListTimerLogsData   `json:"data"`
	Timestamp time.Time           `json:"timestamp"`
}

// ListTimerLogsData 查询定时任务日志数据
type ListTimerLogsData struct {
	Total int64             `json:"total"`
	Items []TimerLogItemDTO `json:"items"`
}
