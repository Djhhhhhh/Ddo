package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

const (
	defaultTimeout = 30 * time.Second
	defaultLLMHost = "http://localhost:8000"
)

// RAGProxy RAG 代理服务接口
type RAGProxy interface {
	EmbedDocument(ctx context.Context, content string, metadata map[string]interface{}) (*EmbedResponse, error)
	SearchVector(ctx context.Context, query string, limit int, minScore float64) ([]SearchResult, error)
	AskRAG(ctx context.Context, question string, contextDocs []string, minScore float64) (*AskResponse, error)
}

// ragProxy RAG 代理服务实现
type ragProxy struct {
	httpClient *http.Client
	baseURL    string
}

// NewRAGProxy 创建 RAG 代理服务
func NewRAGProxy() RAGProxy {
	baseURL := os.Getenv("DDO_LLM_HOST")
	if baseURL == "" {
		baseURL = defaultLLMHost
	}

	return &ragProxy{
		httpClient: &http.Client{
			Timeout: defaultTimeout,
		},
		baseURL: baseURL,
	}
}

// EmbedResponse 嵌入响应 - 匹配 Python API 格式
type EmbedResponse struct {
	DocumentIDs     []string `json:"document_ids"`
	EmbeddingsCount int      `json:"embeddings_count"`
}

// GetEmbeddingID 获取第一个 embedding ID（简化用法）
func (e *EmbedResponse) GetEmbeddingID() string {
	if len(e.DocumentIDs) > 0 {
		return e.DocumentIDs[0]
	}
	return ""
}

// SearchResult 搜索结果
type SearchResult struct {
	EmbeddingID string  `json:"embedding_id"`
	Score       float64 `json:"score"`
	Content     string  `json:"content"`
	Metadata    map[string]interface{} `json:"metadata"`
}

// AskResponse 问答响应
type AskResponse struct {
	Answer  string   `json:"answer"`
	Sources []string `json:"sources"`
}

// EmbedDocument 嵌入文档
func (r *ragProxy) EmbedDocument(ctx context.Context, content string, metadata map[string]interface{}) (*EmbedResponse, error) {
	// Python API 期望 documents 数组和 metadata 数组
	payload := map[string]interface{}{
		"documents": []string{content},
		"metadata":  []map[string]interface{}{metadata},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal embed request failed: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, r.baseURL+"/api/rag/embed", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create embed request failed: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("embed request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("embed request failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result EmbedResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode embed response failed: %w", err)
	}

	return &result, nil
}

// SearchVector 语义搜索
func (r *ragProxy) SearchVector(ctx context.Context, query string, limit int, minScore float64) ([]SearchResult, error) {
	if limit < 1 || limit > 20 {
		limit = 5
	}
	// 默认最小相似度 0.3
	if minScore <= 0 || minScore > 1 {
		minScore = 0.3
	}

	// 构建 POST 请求体
	payload := map[string]interface{}{
		"query":     query,
		"top_k":     limit,
		"min_score": minScore,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal search request failed: %w", err)
	}

	apiURL := fmt.Sprintf("%s/api/rag/search", r.baseURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create search request failed: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("search request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("search request failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// Python 返回 SearchResponse 格式：{documents: [...], total: N, collection: "..."}
	var searchResp struct {
		Documents []struct {
			DocumentID string                 `json:"document_id"`
			Content    string                 `json:"content"`
			Score      float64                `json:"score"`
			Metadata   map[string]interface{} `json:"metadata"`
		} `json:"documents"`
		Total      int    `json:"total"`
		Collection string `json:"collection"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		return nil, fmt.Errorf("decode search response failed: %w", err)
	}

	// 转换为 SearchResult 列表
	results := make([]SearchResult, 0, len(searchResp.Documents))
	for _, doc := range searchResp.Documents {
		results = append(results, SearchResult{
			EmbeddingID: doc.DocumentID,
			Score:       doc.Score,
			Content:     doc.Content,
			Metadata:    doc.Metadata,
		})
	}

	return results, nil
}

// AskRAG RAG 问答
func (r *ragProxy) AskRAG(ctx context.Context, question string, contextDocs []string, minScore float64) (*AskResponse, error) {
	// 默认最小相似度
	if minScore <= 0 || minScore > 1 {
		minScore = 0.3
	}
	payload := map[string]interface{}{
		"question":     question,
		"context_docs": contextDocs,
		"min_score":    minScore,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal ask request failed: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, r.baseURL+"/api/rag/ask", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create ask request failed: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ask request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ask request failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result AskResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode ask response failed: %w", err)
	}

	return &result, nil
}
