package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/ddo/server-go/internal/db/models"
)

// StdioManager stdio 连接管理器
type StdioManager struct {
	sync.RWMutex
	processes map[string]*exec.Cmd  // uuid -> process
}

// NewStdioManager 创建 stdio 管理器
func NewStdioManager() *StdioManager {
	return &StdioManager{
		processes: make(map[string]*exec.Cmd),
	}
}

// TestConnection 测试 stdio 连接
func (m *StdioManager) TestConnection(ctx context.Context, cfg *models.MCPConfig) ([]string, error) {
	// 解析参数
	var args []string
	json.Unmarshal([]byte(cfg.Args), &args)

	var envs []string
	json.Unmarshal([]byte(cfg.Env), &envs)

	// 构建命令
	cmd := exec.CommandContext(ctx, cfg.Command, args...)
	if len(envs) > 0 {
		cmd.Env = envs
	}

	// 创建管道
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("create stdin pipe failed: %w", err)
	}
	defer stdin.Close()

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("create stdout pipe failed: %w", err)
	}

	// 启动进程
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start process failed: %w", err)
	}

	// 记录进程
	m.Lock()
	m.processes[cfg.UUID] = cmd
	m.Unlock()

	// 确保进程结束
	defer func() {
		m.Lock()
		delete(m.processes, cfg.UUID)
		m.Unlock()
		cmd.Process.Kill()
		cmd.Wait()
	}()

	// 发送 initialize 请求
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

	if err := writeJSON(stdin, initializeReq); err != nil {
		return nil, fmt.Errorf("send initialize request failed: %w", err)
	}

	// 读取响应
	var initResp MCPMessage
	if err := readJSONTimeout(stdout, &initResp, 10*time.Second); err != nil {
		return nil, fmt.Errorf("read initialize response failed: %w", err)
	}

	if initResp.Error != nil {
		return nil, fmt.Errorf("initialize error: %s", initResp.Error.Message)
	}

	// 发送 initialized 通知
	initializedNotify := MCPMessage{
		JSONRPC: "2.0",
		Method:  "notifications/initialized",
	}
	writeJSON(stdin, initializedNotify)

	// 发送 tools/list 请求
	listReq := MCPMessage{
		JSONRPC: "2.0",
		Method:  "tools/list",
		Params:  mustMarshal(map[string]interface{}{}),
		ID:      2,
	}

	if err := writeJSON(stdin, listReq); err != nil {
		return nil, fmt.Errorf("send tools/list request failed: %w", err)
	}

	// 读取响应
	var listResp MCPMessage
	if err := readJSONTimeout(stdout, &listResp, 10*time.Second); err != nil {
		return nil, fmt.Errorf("read tools/list response failed: %w", err)
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

// CloseAll 关闭所有 stdio 连接
func (m *StdioManager) CloseAll() {
	m.Lock()
	defer m.Unlock()

	for _, cmd := range m.processes {
		cmd.Process.Kill()
		cmd.Wait()
	}
	m.processes = make(map[string]*exec.Cmd)
}

// Helper functions

func writeJSON(w interface{ Write([]byte) (int, error) }, msg MCPMessage) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	data = append(data, '\n')
	_, err = w.Write(data)
	return err
}

func readJSONTimeout(r interface{ Read([]byte) (int, error) }, target interface{}, timeout time.Duration) error {
	buf := make([]byte, 4096)
	done := make(chan error, 1)

	go func() {
		n, err := r.Read(buf)
		if err != nil {
			done <- err
			return
		}
		done <- json.Unmarshal(buf[:n], target)
	}()

	select {
	case err := <-done:
		return err
	case <-time.After(timeout):
		return fmt.Errorf("read timeout")
	}
}

func mustMarshal(v interface{}) json.RawMessage {
	data, _ := json.Marshal(v)
	return data
}

func parseCommandLine(command string) (string, []string) {
	parts := strings.Fields(command)
	if len(parts) == 0 {
		return "", nil
	}
	return parts[0], parts[1:]
}

func combineBuffers(buffers ...*bytes.Buffer) []byte {
	var result bytes.Buffer
	for _, b := range buffers {
		result.Write(b.Bytes())
	}
	return result.Bytes()
}
