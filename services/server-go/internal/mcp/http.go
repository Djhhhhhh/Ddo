package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/ddo/server-go/internal/db/models"
)

// HTTPManager HTTP 连接管理器
type HTTPManager struct {
	sync.RWMutex
	clients   map[string]*HTTPClient  // uuid -> http client
	timeout   time.Duration
}

// HTTPClient HTTP 客户端
type HTTPClient struct {
	BaseURL  string
	Headers  map[string]string
	Client   *http.Client
	LastUsed time.Time
}

// NewHTTPManager 创建 HTTP 管理器
func NewHTTPManager() *HTTPManager {
	return &HTTPManager{
		clients: make(map[string]*HTTPClient),
		timeout: 30 * time.Second,
	}
}

// TestConnection 测试 HTTP 连接
func (m *HTTPManager) TestConnection(ctx context.Context, cfg *models.MCPConfig) ([]string, error) {
	// 解析 headers
	var headers map[string]string
	json.Unmarshal([]byte(cfg.Headers), &headers)

	// 创建 HTTP 客户端
	client := &HTTPClient{
		BaseURL: cfg.URL,
		Headers: headers,
		Client: &http.Client{
			Timeout: m.timeout,
		},
		LastUsed: time.Now(),
	}

	// 保存到连接池
	m.Lock()
	m.clients[cfg.UUID] = client
	m.Unlock()

	// 构建请求
	var body bytes.Buffer
	initializeReq := MCPMessage{
		JSONRPC: "2.0",
		Method:  "initialize",
		Params: mustMarshal(InitializeParams{
			ProtocolVersion: "2024-11-05",
			Capabilities:    map[string]interface{}{},
			ClientInfo: ClientInfo{
				Name:    "ddo-server",
				Version: "1.0.0",
			},
		}),
		ID: 1,
	}
	json.NewEncoder(&body).Encode(initializeReq)

	// 发送请求
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.URL, &body)
	if err != nil {
		return nil, fmt.Errorf("create request failed: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := client.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send request failed: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response failed: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("http error: status=%d, body=%s", resp.StatusCode, string(respBody))
	}

	// 解析响应
	var initResp MCPMessage
	if err := json.Unmarshal(respBody, &initResp); err != nil {
		return nil, fmt.Errorf("parse response failed: %w", err)
	}

	if initResp.Error != nil {
		return nil, fmt.Errorf("initialize error: %s", initResp.Error.Message)
	}

	// 发送 initialized 通知
	m.sendNotification(ctx, cfg.URL, headers, MCPMessage{
		JSONRPC: "2.0",
		Method:  "notifications/initialized",
	})

	// 发送 tools/list 请求
	listReqBody := bytes.Buffer{}
	listReq := MCPMessage{
		JSONRPC: "2.0",
		Method:  "tools/list",
		Params:  mustMarshal(map[string]interface{}{}),
		ID:      2,
	}
	json.NewEncoder(&listReqBody).Encode(listReq)

	req2, _ := http.NewRequestWithContext(ctx, http.MethodPost, cfg.URL, &listReqBody)
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Accept", "application/json")
	for k, v := range headers {
		req2.Header.Set(k, v)
	}

	resp2, err := client.Client.Do(req2)
	if err != nil {
		return nil, fmt.Errorf("send tools/list request failed: %w", err)
	}
	defer resp2.Body.Close()

	respBody2, err := io.ReadAll(resp2.Body)
	if err != nil {
		return nil, fmt.Errorf("read tools/list response failed: %w", err)
	}

	var listResp MCPMessage
	if err := json.Unmarshal(respBody2, &listResp); err != nil {
		return nil, fmt.Errorf("parse tools/list response failed: %w", err)
	}

	if listResp.Error != nil {
		return nil, fmt.Errorf("tools/list error: %s", listResp.Error.Message)
	}

	// 解析工具列表
	var result ToolsListResult
	if err := json.Unmarshal(listResp.Result, &result); err != nil {
		return nil, fmt.Errorf("parse tools list result failed: %w", err)
	}

	tools := make([]string, 0, len(result.Tools))
	for _, tool := range result.Tools {
		tools = append(tools, tool.Name)
	}

	return tools, nil
}

// sendNotification 发送通知
func (m *HTTPManager) sendNotification(ctx context.Context, url string, headers map[string]string, msg MCPMessage) {
	var body bytes.Buffer
	json.NewEncoder(&body).Encode(msg)

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, url, &body)
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	client := &http.Client{Timeout: 5 * time.Second}
	client.Do(req)
}

// GetTools 获取 MCP 工具列表（含完整 schema）
func (m *HTTPManager) GetTools(ctx context.Context, cfg *models.MCPConfig) ([]Tool, error) {
	var headers map[string]string
	json.Unmarshal([]byte(cfg.Headers), &headers)

	client := &HTTPClient{
		BaseURL: cfg.URL,
		Headers: headers,
		Client: &http.Client{
			Timeout: m.timeout,
		},
		LastUsed: time.Now(),
	}

	m.Lock()
	m.clients[cfg.UUID] = client
	m.Unlock()

	// 1. initialize
	var body bytes.Buffer
	initializeReq := MCPMessage{
		JSONRPC: "2.0",
		Method:  "initialize",
		Params: mustMarshal(InitializeParams{
			ProtocolVersion: "2024-11-05",
			Capabilities:    map[string]interface{}{},
			ClientInfo: ClientInfo{
				Name:    "ddo-server",
				Version: "1.0.0",
			},
		}),
		ID: 1,
	}
	json.NewEncoder(&body).Encode(initializeReq)

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, cfg.URL, &body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := client.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send request failed: %w", err)
	}
	respBody, _ := io.ReadAll(resp.Body)
	resp.Body.Close()

	var initResp MCPMessage
	json.Unmarshal(respBody, &initResp)
	if initResp.Error != nil {
		return nil, fmt.Errorf("initialize error: %s", initResp.Error.Message)
	}

	// 2. notifications/initialized
	m.sendNotification(ctx, cfg.URL, headers, MCPMessage{
		JSONRPC: "2.0",
		Method:  "notifications/initialized",
	})

	// 3. tools/list
	listReqBody := bytes.Buffer{}
	listReq := MCPMessage{
		JSONRPC: "2.0",
		Method:  "tools/list",
		Params:  mustMarshal(map[string]interface{}{}),
		ID:      2,
	}
	json.NewEncoder(&listReqBody).Encode(listReq)

	req2, _ := http.NewRequestWithContext(ctx, http.MethodPost, cfg.URL, &listReqBody)
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Accept", "application/json")
	for k, v := range headers {
		req2.Header.Set(k, v)
	}

	resp2, err := client.Client.Do(req2)
	if err != nil {
		return nil, fmt.Errorf("send tools/list request failed: %w", err)
	}
	defer resp2.Body.Close()

	respBody2, _ := io.ReadAll(resp2.Body)
	var listResp MCPMessage
	json.Unmarshal(respBody2, &listResp)
	if listResp.Error != nil {
		return nil, fmt.Errorf("tools/list error: %s", listResp.Error.Message)
	}

	var result ToolsListResult
	if err := json.Unmarshal(listResp.Result, &result); err != nil {
		return nil, fmt.Errorf("parse tools list result failed: %w", err)
	}

	return result.Tools, nil
}

// CallTool 调用指定 MCP 工具
func (m *HTTPManager) CallTool(ctx context.Context, cfg *models.MCPConfig, toolName string, args map[string]interface{}) (map[string]interface{}, error) {
	var headers map[string]string
	json.Unmarshal([]byte(cfg.Headers), &headers)

	client, ok := m.clients[cfg.UUID]
	if !ok {
		client = &HTTPClient{
			BaseURL: cfg.URL,
			Headers: headers,
			Client: &http.Client{
				Timeout: m.timeout,
			},
			LastUsed: time.Now(),
		}
		m.Lock()
		m.clients[cfg.UUID] = client
		m.Unlock()
	}

	callReqBody := bytes.Buffer{}
	callReq := MCPMessage{
		JSONRPC: "2.0",
		Method:  "tools/call",
		Params: mustMarshal(map[string]interface{}{
			"name":      toolName,
			"arguments": args,
		}),
		ID: 3,
	}
	json.NewEncoder(&callReqBody).Encode(callReq)

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, cfg.URL, &callReqBody)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := client.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send tools/call request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read tools/call response failed: %w", err)
	}

	var callResp MCPMessage
	if err := json.Unmarshal(respBody, &callResp); err != nil {
		return nil, fmt.Errorf("parse tools/call response failed: %w", err)
	}

	if callResp.Error != nil {
		return nil, fmt.Errorf("tools/call error: %s", callResp.Error.Message)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(callResp.Result, &result); err != nil {
		return nil, fmt.Errorf("parse tools/call result failed: %w", err)
	}

	return result, nil
}

// Connect 建立并保持 HTTP 连接
func (m *HTTPManager) Connect(ctx context.Context, cfg *models.MCPConfig) error {
	// 解析 headers
	var headers map[string]string
	json.Unmarshal([]byte(cfg.Headers), &headers)

	// 创建 HTTP 客户端
	client := &HTTPClient{
		BaseURL: cfg.URL,
		Headers: headers,
		Client: &http.Client{
			Timeout: m.timeout,
		},
		LastUsed: time.Now(),
	}

	// 保存到连接池
	m.Lock()
	m.clients[cfg.UUID] = client
	m.Unlock()

	// 发送 initialize 请求验证连接
	var body bytes.Buffer
	initializeReq := MCPMessage{
		JSONRPC: "2.0",
		Method:  "initialize",
		Params: mustMarshal(InitializeParams{
			ProtocolVersion: "2024-11-05",
			Capabilities:    map[string]interface{}{},
			ClientInfo: ClientInfo{
				Name:    "ddo-server",
				Version: "1.0.0",
			},
		}),
		ID: 1,
	}
	json.NewEncoder(&body).Encode(initializeReq)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.URL, &body)
	if err != nil {
		m.Disconnect(cfg.UUID)
		return fmt.Errorf("create request failed: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := client.Client.Do(req)
	if err != nil {
		m.Disconnect(cfg.UUID)
		return fmt.Errorf("send request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		m.Disconnect(cfg.UUID)
		return fmt.Errorf("http error: status=%d", resp.StatusCode)
	}

	// 发送 initialized 通知
	m.sendNotification(ctx, cfg.URL, headers, MCPMessage{
		JSONRPC: "2.0",
		Method:  "notifications/initialized",
	})

	return nil
}

// Disconnect 断开 HTTP 连接
func (m *HTTPManager) Disconnect(uuid string) {
	m.Lock()
	defer m.Unlock()

	delete(m.clients, uuid)
}

// CloseAll 关闭所有 HTTP 连接
func (m *HTTPManager) CloseAll() {
	m.Lock()
	defer m.Unlock()

	// HTTP 客户端不需要显式关闭，但可以清理映射
	m.clients = make(map[string]*HTTPClient)
}

// parseHeaders 解析 headers 字符串
func parseHeaders(headersStr string) map[string]string {
	var headers map[string]string
	json.Unmarshal([]byte(headersStr), &headers)
	return headers
}

// buildURL 构建完整 URL
func buildURL(baseURL, path string) string {
	if strings.HasSuffix(baseURL, "/") {
		return baseURL + path
	}
	return baseURL + "/" + path
}
