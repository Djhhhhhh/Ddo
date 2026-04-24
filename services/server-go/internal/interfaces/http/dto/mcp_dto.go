package dto

import (
	"time"
)

// CreateMCPRequest 创建 MCP 配置请求
type CreateMCPRequest struct {
	Name        string            `json:"name" binding:"required"`
	Description string            `json:"description"`
	Type        string            `json:"type" binding:"required,oneof=stdio http streamable_http sse"`
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

// ConnectTestMCPRequest 连接测试请求
type ConnectTestMCPRequest struct {
	Timeout int `json:"timeout" form:"timeout,default=10"`
}

// ConnectTestMCPResponse 连接测试响应
type ConnectTestMCPResponse struct {
	Code     int                `json:"code"`
	Message  string             `json:"message"`
	Data     ConnectTestMCPData `json:"data"`
	Timestamp time.Time         `json:"timestamp"`
}

// ConnectTestMCPData 连接测试数据
type ConnectTestMCPData struct {
	Status                string                 `json:"status"`
	Reachable            bool                   `json:"reachable"`
	InitializeSucceeded  bool                   `json:"initialize_succeeded"`
	ProtocolReady        bool                   `json:"protocol_ready"`
	LatencyMs            int64                  `json:"latency_ms"`
	ServerInfo           map[string]interface{} `json:"server_info,omitempty"`
	ServerProtocolVersion string                `json:"server_protocol_version,omitempty"`
	ServerCapabilities   map[string]interface{} `json:"server_capabilities,omitempty"`
	Tools                []string               `json:"tools,omitempty"`
	Error                string                 `json:"error,omitempty"`
}

// MCPToolDTO MCP 工具 DTO
type MCPToolDTO struct {
	Name        string                 `json:"name"`
	Title       string                 `json:"title,omitempty"`
	Description string                 `json:"description,omitempty"`
	InputSchema map[string]interface{} `json:"inputSchema,omitempty"`
}

// ListMCPToolsResponse 工具列表响应
type ListMCPToolsResponse struct {
	Code     int             `json:"code"`
	Message  string          `json:"message"`
	Data     ListMCPToolsData `json:"data"`
	Timestamp time.Time      `json:"timestamp"`
}

// ListMCPToolsData 工具列表数据
type ListMCPToolsData struct {
	ServerID string       `json:"server_id"`
	Tools    []MCPToolDTO  `json:"tools"`
}

// CallMCPToolRequest 调用 MCP 工具请求
type CallMCPToolRequest struct {
	Arguments map[string]interface{} `json:"arguments"`
}

// CallMCPToolResponse 调用 MCP 工具响应
type CallMCPToolResponse struct {
	Code     int            `json:"code"`
	Message  string         `json:"message"`
	Data     CallMCPToolData `json:"data"`
	Timestamp time.Time     `json:"timestamp"`
}

// CallMCPToolData 调用 MCP 工具数据
type CallMCPToolData struct {
	Content          interface{} `json:"content,omitempty"`
	StructuredContent interface{} `json:"structured_content,omitempty"`
	Raw              interface{} `json:"raw,omitempty"`
	IsError          bool        `json:"is_error"`
	Error            string      `json:"error,omitempty"`
}

// ConnectMCPResponse 连接 MCP 响应
type ConnectMCPResponse struct {
	Code     int            `json:"code"`
	Message  string         `json:"message"`
	Data     ConnectMCPData `json:"data"`
	Timestamp time.Time     `json:"timestamp"`
}

// ConnectMCPData 连接 MCP 数据
type ConnectMCPData struct {
	Status string `json:"status"`
}

// DisconnectMCPResponse 断开 MCP 连接响应
type DisconnectMCPResponse struct {
	Code     int               `json:"code"`
	Message  string            `json:"message"`
	Data     DisconnectMCPData `json:"data"`
	Timestamp time.Time        `json:"timestamp"`
}

// DisconnectMCPData 断开 MCP 连接数据
type DisconnectMCPData struct {
	Status string `json:"status"`
}
