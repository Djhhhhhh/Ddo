package dto

import "time"

// HealthCheckRequest 健康检查请求
type HealthCheckRequest struct{}

// HealthCheckResponse 健康检查响应
type HealthCheckResponse struct {
	Code      int         `json:"code"`
	Message   string      `json:"message"`
	Data      HealthData  `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
}

// HealthData 健康数据
type HealthData struct {
	Status    string `json:"status"`
	Version   string `json:"version"`
	Timestamp string `json:"timestamp"`
}

// HealthCheckV1Response v1 版本健康检查响应
type HealthCheckV1Response struct {
	Code      int         `json:"code"`
	Message   string      `json:"message"`
	Data      HealthV1Data `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
}

// HealthV1Data v1 健康数据
type HealthV1Data struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
}

// ToHealthCheckResponse 转换为健康检查响应
func ToHealthCheckResponse(status, version string, ts time.Time) HealthCheckResponse {
	return HealthCheckResponse{
		Code:    0,
		Message: "ok",
		Data: HealthData{
			Status:    status,
			Version:   version,
			Timestamp: ts.Format(time.RFC3339),
		},
		Timestamp: time.Now(),
	}
}

// ToHealthCheckV1Response 转换为 v1 版本健康检查响应
func ToHealthCheckV1Response(status string, ts time.Time) HealthCheckV1Response {
	return HealthCheckV1Response{
		Code:    0,
		Message: "ok",
		Data: HealthV1Data{
			Status:    status,
			Timestamp: ts.Format(time.RFC3339),
		},
		Timestamp: time.Now(),
	}
}

// ErrorResponse 错误响应
type ErrorResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

// NewErrorResponse 创建错误响应
func NewErrorResponse(code int, message string, data any) ErrorResponse {
	return ErrorResponse{
		Code:    code,
		Message: message,
		Data:    data,
	}
}
