package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/ddo/server-go/internal/db/models"
)

// ClientPool MCP 连接池
type ClientPool struct {
	sync.RWMutex
	clients   map[string]*ClientEntry  // uuid -> client entry
	stdioMgr  *StdioManager
	httpMgr   *HTTPManager
}

// ClientEntry 连接条目
type ClientEntry struct {
	Type     string
	Config   *models.MCPConfig
	LastUsed time.Time
}

// NewClientPool 创建连接池
func NewClientPool() *ClientPool {
	return &ClientPool{
		clients:  make(map[string]*ClientEntry),
		stdioMgr: NewStdioManager(),
		httpMgr:  NewHTTPManager(),
	}
}

// TestConnection 测试 MCP 连接
func (p *ClientPool) TestConnection(ctx context.Context, cfg *models.MCPConfig) ([]string, error) {
	switch cfg.Type {
	case models.MCPTypeStdio:
		return p.stdioMgr.TestConnection(ctx, cfg)
	case models.MCPTypeHTTP, models.MCPTypeStreamableHTTP, models.MCPTypeSSE:
		return p.httpMgr.TestConnection(ctx, cfg)
	default:
		return nil, fmt.Errorf("unsupported mcp type: %s", cfg.Type)
	}
}

// Connect 建立并保持连接
func (p *ClientPool) Connect(ctx context.Context, cfg *models.MCPConfig) error {
	switch cfg.Type {
	case models.MCPTypeStdio:
		return p.stdioMgr.Connect(ctx, cfg)
	case models.MCPTypeHTTP, models.MCPTypeStreamableHTTP, models.MCPTypeSSE:
		return p.httpMgr.Connect(ctx, cfg)
	default:
		return fmt.Errorf("unsupported mcp type: %s", cfg.Type)
	}
}

// Disconnect 断开连接
func (p *ClientPool) Disconnect(uuid string) error {
	p.Lock()
	defer p.Unlock()

	// 从连接池移除
	delete(p.clients, uuid)

	// 关闭 stdio 连接
	p.stdioMgr.Disconnect(uuid)

	// 关闭 http 连接
	p.httpMgr.Disconnect(uuid)

	return nil
}

// IsConnected 检查是否已连接
func (p *ClientPool) IsConnected(uuid string) bool {
	p.RLock()
	defer p.RUnlock()

	_, ok := p.clients[uuid]
	return ok
}

// GetTools 获取 MCP 工具列表（含 schema）
func (p *ClientPool) GetTools(ctx context.Context, cfg *models.MCPConfig) ([]Tool, error) {
	switch cfg.Type {
	case models.MCPTypeStdio:
		return p.stdioMgr.GetTools(ctx, cfg)
	case models.MCPTypeHTTP, models.MCPTypeStreamableHTTP, models.MCPTypeSSE:
		return p.httpMgr.GetTools(ctx, cfg)
	default:
		return nil, fmt.Errorf("unsupported mcp type: %s", cfg.Type)
	}
}

// CallTool 调用指定 MCP 工具
func (p *ClientPool) CallTool(ctx context.Context, cfg *models.MCPConfig, toolName string, args map[string]interface{}) (map[string]interface{}, error) {
	switch cfg.Type {
	case models.MCPTypeStdio:
		return p.stdioMgr.CallTool(ctx, cfg, toolName, args)
	case models.MCPTypeHTTP, models.MCPTypeStreamableHTTP, models.MCPTypeSSE:
		return p.httpMgr.CallTool(ctx, cfg, toolName, args)
	default:
		return nil, fmt.Errorf("unsupported mcp type: %s", cfg.Type)
	}
}

// GetStatus 获取连接状态
func (p *ClientPool) GetStatus(uuid string) string {
	p.RLock()
	defer p.RUnlock()

	entry, ok := p.clients[uuid]
	if !ok {
		return models.MCPStatusInactive
	}
	return entry.Config.Status
}

// Close 关闭连接池
func (p *ClientPool) Close() error {
	p.Lock()
	defer p.Unlock()

	// 关闭所有 stdio 连接
	p.stdioMgr.CloseAll()

	// 关闭所有 http 连接
	p.httpMgr.CloseAll()

	p.clients = make(map[string]*ClientEntry)
	return nil
}

// MCPMessage MCP 协议消息
type MCPMessage struct {
	JSONRPC string          `json:"jsonrpc"`
	Method  string          `json:"method,omitempty"`
	Params json.RawMessage  `json:"params,omitempty"`
	ID     interface{}      `json:"id,omitempty"`
	Result json.RawMessage  `json:"result,omitempty"`
	Error  *MCPError        `json:"error,omitempty"`
}

// MCPError MCP 错误
type MCPError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// InitializeParams 初始化参数
type InitializeParams struct {
	ProtocolVersion string                 `json:"protocolVersion"`
	Capabilities    map[string]interface{} `json:"capabilities"`
	ClientInfo      ClientInfo             `json:"clientInfo"`
}

// ClientInfo 客户端信息
type ClientInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// InitializeResult 初始化结果
type InitializeResult struct {
	ProtocolVersion string                 `json:"protocolVersion"`
	Capabilities    map[string]interface{} `json:"capabilities"`
	ServerInfo      ServerInfo             `json:"serverInfo"`
}

// ServerInfo 服务器信息
type ServerInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// ToolsListResult 工具列表结果
type ToolsListResult struct {
	Tools []Tool `json:"tools"`
}

// Tool 工具定义
type Tool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	InputSchema map[string]interface{} `json:"inputSchema,omitempty"`
}