package dto

import (
	"time"
)

// CreateMCPRequest 创建 MCP 配置请求
type CreateMCPRequest struct {
	Name        string            `json:"name" binding:"required"`
	Description string            `json:"description"`
	Type        string            `json:"type" binding:"required,oneof=stdio http sse"`
	Command     string            `json:"command"`
	Args        []string          `json:"args"`
	Env         []string          `json:"env"`
	URL         string            `json:"url"`
	Headers     map[string]string `json:"headers"`
}

// CreateMCPResponse 创建 MCP 配置响应
type CreateMCPResponse struct {
	Code     int           `json:"code"`
	Message  string        `json:"message"`
	Data     CreateMCPData `json:"data"`
	Timestamp time.Time    `json:"timestamp"`
}

// CreateMCPData 创建 MCP 配置数据
type CreateMCPData struct {
	UUID   string `json:"uuid"`
	Name   string `json:"name"`
	Type   string `json:"type"`
	Status string `json:"status"`
}

// ListMCPRequest 查询 MCP 列表请求
type ListMCPRequest struct {
	Type     string `json:"type" form:"type"`
	Status   string `json:"status" form:"status"`
	Page     int    `json:"page" form:"page,default=1"`
	PageSize int    `json:"page_size" form:"page_size,default=20"`
}

// ListMCPResponse 查询 MCP 列表响应
type ListMCPResponse struct {
	Code     int          `json:"code"`
	Message  string       `json:"message"`
	Data     ListMCPData  `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
}

// ListMCPData 查询 MCP 列表数据
type ListMCPData struct {
	Total int64        `json:"total"`
	Items []MCPItemDTO `json:"items"`
}

// MCPItemDTO MCP 项 DTO
type MCPItemDTO struct {
	UUID        string `json:"uuid"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
	Status      string `json:"status"`
	LastTestAt  string `json:"last_test_at,omitempty"`
}

// GetMCPResponse 获取 MCP 详情响应
type GetMCPResponse struct {
	Code     int          `json:"code"`
	Message  string       `json:"message"`
	Data     GetMCPData   `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
}

// GetMCPData 获取 MCP 详情数据
type GetMCPData struct {
	MCP MCPDetailDTO `json:"mcp"`
}

// MCPDetailDTO MCP 详情 DTO
type MCPDetailDTO struct {
	UUID        string            `json:"uuid"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Type        string            `json:"type"`
	Command     string            `json:"command,omitempty"`
	Args        []string          `json:"args,omitempty"`
	Env         []string          `json:"env,omitempty"`
	URL         string            `json:"url,omitempty"`
	Headers     map[string]string `json:"headers,omitempty"`
	Status      string            `json:"status"`
	LastError   string            `json:"last_error,omitempty"`
	LastTestAt  string            `json:"last_test_at,omitempty"`
	CreatedAt   string            `json:"created_at"`
	UpdatedAt   string            `json:"updated_at"`
}

// DeleteMCPResponse 删除 MCP 配置响应
type DeleteMCPResponse struct {
	Code     int           `json:"code"`
	Message  string        `json:"message"`
	Data     DeleteMCPData `json:"data"`
	Timestamp time.Time    `json:"timestamp"`
}

// DeleteMCPData 删除 MCP 配置数据
type DeleteMCPData struct {
	Success bool `json:"success"`
}

// TestMCPRequest 测试 MCP 连接请求
type TestMCPRequest struct {
	Timeout int `json:"timeout" form:"timeout,default=10"`
}

// TestMCPResponse 测试 MCP 连接响应
type TestMCPResponse struct {
	Code     int          `json:"code"`
	Message  string       `json:"message"`
	Data     TestMCPData  `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
}

// TestMCPData 测试 MCP 连接数据
type TestMCPData struct {
	Status    string   `json:"status"`
	Tools     []string `json:"tools"`
	ElapsedMs int64    `json:"elapsed_ms"`
	Error     string   `json:"error,omitempty"`
}
