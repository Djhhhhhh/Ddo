package llm_stats

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/ddo/server-go/internal/application/result"
)

// ConversationItem 对话项
type ConversationItem struct {
	ID            string `json:"id"`
	SessionID     string `json:"session_id,omitempty"`
	Title         string `json:"title,omitempty"`
	MemoryEnabled bool   `json:"memory_enabled"`
	Source        string `json:"source"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
	MessageCount  int    `json:"message_count"`
}

// ConversationListData 对话列表数据
type ConversationListData struct {
	Items      []ConversationItem `json:"items"`
	Total      int                `json:"total"`
	Page       int                `json:"page"`
	PageSize   int                `json:"page_size"`
	TotalPages int                `json:"total_pages"`
}

// ListConversationsUseCase 获取对话列表用例
type ListConversationsUseCase struct {
	llmPyURL string
	client   *http.Client
}

// NewListConversationsUseCase 创建用例实例
func NewListConversationsUseCase(llmPyURL string) *ListConversationsUseCase {
	return &ListConversationsUseCase{
		llmPyURL: llmPyURL,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// ListRequest 列表查询参数
type ListRequest struct {
	Page      int
	PageSize  int
	SessionID string
	Source    string
}

// Execute 执行查询
func (uc *ListConversationsUseCase) Execute(ctx context.Context, req ListRequest) *result.Result[ConversationListData] {
	// 构建 URL
	params := url.Values{}
	params.Set("page", fmt.Sprintf("%d", req.Page))
	params.Set("page_size", fmt.Sprintf("%d", req.PageSize))
	if req.SessionID != "" {
		params.Set("session_id", req.SessionID)
	}
	if req.Source != "" {
		params.Set("source", req.Source)
	}

	url := fmt.Sprintf("%s/api/conversations?%s", uc.llmPyURL, params.Encode())

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return result.NewFailure[ConversationListData](err)
	}

	resp, err := uc.client.Do(httpReq)
	if err != nil {
		return result.NewFailure[ConversationListData](fmt.Errorf("failed to call llm-py: %w", err))
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return result.NewFailure[ConversationListData](fmt.Errorf("llm-py returned status: %d", resp.StatusCode))
	}

	// 读取响应 body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return result.NewFailure[ConversationListData](fmt.Errorf("failed to read response body: %w", err))
	}

	// 解析响应 - llm-py 直接返回数据，没有 code/data 包装
	var data ConversationListData
	if err := json.Unmarshal(body, &data); err != nil {
		return result.NewFailure[ConversationListData](fmt.Errorf("failed to decode response: %w, body: %s", err, string(body)))
	}

	return result.NewSuccess(data)
}
