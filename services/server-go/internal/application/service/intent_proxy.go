package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// IntentProxy 意图识别代理服务接口
type IntentProxy interface {
	// RecognizeIntent 识别用户意图
	RecognizeIntent(ctx context.Context, text string, model string) (*IntentResult, error)
}

// IntentResult 意图识别结果
type IntentResult struct {
	Intent          string                 `json:"intent"`
	SubIntent       string                 `json:"sub_intent"`
	NeedKnowledge   bool                   `json:"need_knowledge"`
	Confidence      float64                `json:"confidence"`
	Entities        []Entity               `json:"entities"`
	Parameters      map[string]interface{} `json:"parameters"`
	SuggestedReply  string                 `json:"suggested_reply"`
}

// Entity 提取的实体
type Entity struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

// intentProxy 意图识别代理服务实现
type intentProxy struct {
	httpClient *http.Client
	baseURL    string
}

// NewIntentProxy 创建意图识别代理服务
func NewIntentProxy() IntentProxy {
	baseURL := resolveLLMBaseURL()

	return &intentProxy{
		httpClient: &http.Client{
			Timeout: defaultLLMTimeout,
		},
		baseURL: baseURL,
	}
}

// RecognizeIntent 调用LLM服务进行意图识别
func (p *intentProxy) RecognizeIntent(ctx context.Context, text string, model string) (*IntentResult, error) {
	payload := map[string]interface{}{
		"text": text,
	}
	if model != "" {
		payload["model"] = model
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal intent request failed: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/api/nlp/intent", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create intent request failed: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("intent request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("intent request failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result IntentResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode intent response failed: %w", err)
	}

	return &result, nil
}
