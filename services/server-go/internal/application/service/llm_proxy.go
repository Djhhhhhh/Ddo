package service

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	defaultLLMTimeout = 60 * time.Second
)

// LLMProxy LLM 代理服务接口
type LLMProxy interface {
	Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error)
	ChatStream(ctx context.Context, req *ChatRequest) (<-chan string, error)
	NLP(ctx context.Context, req *NLPRequest) (*NLPResponse, error)
	AnalyzeKnowledge(ctx context.Context, req *AnalyzeRequest) (*AnalyzeResponse, error)
}

// llmProxy LLM 代理服务实现
type llmProxy struct {
	httpClient *http.Client
	baseURL    string
}

// NewLLMProxy 创建 LLM 代理服务
func NewLLMProxy() LLMProxy {
	baseURL := resolveLLMBaseURL()

	return &llmProxy{
		httpClient: &http.Client{
			Timeout: defaultLLMTimeout,
		},
		baseURL: baseURL,
	}
}

// ChatRequest 对话请求
type ChatRequest struct {
	Messages       []Message `json:"messages"`
	Model          string    `json:"model,omitempty"`
	Stream         bool      `json:"stream,omitempty"`
	SystemPrompt   string    `json:"system_prompt,omitempty"`
	ConversationID string    `json:"conversation_id,omitempty"`
	SessionID      string    `json:"session_id,omitempty"`
	PresetReply    string    `json:"preset_reply,omitempty"`
}

// Message 消息
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatResponse 对话响应
type ChatResponse struct {
	Content string `json:"content"`
	Usage   *Usage `json:"usage,omitempty"`
}

// Usage token 使用量
type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

// ChatStreamResponse 流式对话响应chunk
type ChatStreamResponse struct {
	Content string `json:"content"`
	Done    bool   `json:"done"`
}

// NLPRequest NLP 请求
type NLPRequest struct {
	Text    string                 `json:"text"`
	Context map[string]interface{} `json:"context,omitempty"`
	Model   string                 `json:"model,omitempty"`
}

// NLPResponse NLP 响应
type NLPResponse struct {
	Intent     string                 `json:"intent"`
	Confidence float64                `json:"confidence"`
	Entities   []NLPEntity            `json:"entities"`
	Parameters map[string]interface{} `json:"parameters"`
	Reply      string                 `json:"reply"`
}

// NLPEntity NLP 实体
type NLPEntity struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

// AnalyzeRequest 知识分析请求
type AnalyzeRequest struct {
	Content string `json:"content"`
	Title   string `json:"title,omitempty"`
	Context string `json:"context,omitempty"`
}

// AnalyzeResponse 知识分析响应
type AnalyzeResponse struct {
	Tags             []string `json:"tags"`
	Categories       []string `json:"categories"`
	IsNewCategories  []bool   `json:"is_new_categories"`
	SuggestedReply   string   `json:"suggested_reply"`
}

// Chat 对话（非流式）
func (r *llmProxy) Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
	payload := map[string]interface{}{
		"messages": req.Messages,
		"stream":   false,
	}
	if req.SystemPrompt != "" {
		payload["system_prompt"] = req.SystemPrompt
	}
	if req.Model != "" {
		payload["model"] = req.Model
	}
	if req.ConversationID != "" {
		payload["conversation_id"] = req.ConversationID
	}
	if req.SessionID != "" {
		payload["session_id"] = req.SessionID
	}
	if req.PresetReply != "" {
		payload["preset_reply"] = req.PresetReply
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal chat request failed: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, r.baseURL+"/api/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create chat request failed: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("chat request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("chat request failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// llm-py 返回 OpenAI 兼容格式: {choices: [{message: {content: ...}}], usage: {...}}
	var llmResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
			TotalTokens      int `json:"total_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&llmResp); err != nil {
		return nil, fmt.Errorf("decode chat response failed: %w", err)
	}

	content := ""
	if len(llmResp.Choices) > 0 {
		content = llmResp.Choices[0].Message.Content
	}

	chatResp := &ChatResponse{
		Content: content,
	}
	if llmResp.Usage.PromptTokens > 0 || llmResp.Usage.CompletionTokens > 0 {
		chatResp.Usage = &Usage{
			InputTokens:  llmResp.Usage.PromptTokens,
			OutputTokens: llmResp.Usage.CompletionTokens,
		}
	}

	return chatResp, nil
}

// ChatStream 流式对话
func (r *llmProxy) ChatStream(ctx context.Context, req *ChatRequest) (<-chan string, error) {
	payload := map[string]interface{}{
		"messages": req.Messages,
		"stream":   true,
	}
	if req.SystemPrompt != "" {
		payload["system_prompt"] = req.SystemPrompt
	}
	if req.Model != "" {
		payload["model"] = req.Model
	}
	if req.ConversationID != "" {
		payload["conversation_id"] = req.ConversationID
	}
	if req.SessionID != "" {
		payload["session_id"] = req.SessionID
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal chat request failed: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, r.baseURL+"/api/chat/completions/stream", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create chat request failed: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("chat stream request failed: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("chat stream request failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	streamChan := make(chan string)

	go func() {
		defer close(streamChan)
		defer resp.Body.Close()

		reader := bufio.NewReader(resp.Body)
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				break
			}

			line = strings.TrimRight(line, "\r")

			if len(line) > 0 && strings.HasPrefix(line, "data: ") {
				jsonStr := line[6:]
				if jsonStr != "[DONE]" {
					var chunk struct {
						Choices []struct {
							Delta struct {
								Content string `json:"content"`
							} `json:"delta"`
						} `json:"choices"`
					}
					if json.Unmarshal([]byte(jsonStr), &chunk) == nil {
						if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
							streamChan <- chunk.Choices[0].Delta.Content
						}
					}
				}
			}
		}
	}()

	return streamChan, nil
}

// AnalyzeKnowledge 知识分析（提取标签和分类）
func (r *llmProxy) AnalyzeKnowledge(ctx context.Context, req *AnalyzeRequest) (*AnalyzeResponse, error) {
	payload := map[string]interface{}{
		"content": req.Content,
	}
	if req.Title != "" {
		payload["title"] = req.Title
	}
	if req.Context != "" {
		payload["context"] = req.Context
	} else {
		payload["context"] = "knowledge_base"
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal analyze request failed: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, r.baseURL+"/api/analyze/analyze", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create analyze request failed: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("analyze request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("analyze request failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result AnalyzeResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode analyze response failed: %w", err)
	}

	return &result, nil
}

// NLP NLP 意图识别
func (r *llmProxy) NLP(ctx context.Context, req *NLPRequest) (*NLPResponse, error) {
	payload := map[string]interface{}{
		"text":    req.Text,
		"context": req.Context,
	}
	if req.Model != "" {
		payload["model"] = req.Model
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal nlp request failed: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, r.baseURL+"/api/nlp/", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create nlp request failed: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("nlp request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("nlp request failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result NLPResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode nlp response failed: %w", err)
	}

	return &result, nil
}
