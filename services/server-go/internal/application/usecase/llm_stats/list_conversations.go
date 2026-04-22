package llm_stats

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
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

type ConversationMessage struct {
	ID        string `json:"id,omitempty"`
	Role      string `json:"role"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at,omitempty"`
	Timestamp string `json:"timestamp,omitempty"`
	Model     string `json:"model,omitempty"`
}

type ConversationDetailData struct {
	ID            string                `json:"id"`
	SessionID     string                `json:"session_id,omitempty"`
	Title         string                `json:"title,omitempty"`
	MemoryEnabled bool                  `json:"memory_enabled"`
	Source        string                `json:"source"`
	CreatedAt     string                `json:"created_at"`
	UpdatedAt     string                `json:"updated_at"`
	MessageCount  int                   `json:"message_count"`
	Messages      []ConversationMessage `json:"messages"`
}

// ListConversationsUseCase 获取对话列表用例
type ListConversationsUseCase struct {
	llmPyURL string
	client   *http.Client
}

type GetConversationDetailUseCase struct {
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

func NewGetConversationDetailUseCase(llmPyURL string) *GetConversationDetailUseCase {
	return &GetConversationDetailUseCase{
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

func (uc *GetConversationDetailUseCase) Execute(ctx context.Context, id string) *result.Result[ConversationDetailData] {
	id = strings.TrimSpace(id)
	if id == "" {
		return result.NewFailure[ConversationDetailData](fmt.Errorf("conversation id is required"))
	}

	encodedID := url.PathEscape(id)
	candidates := []string{
		fmt.Sprintf("%s/api/conversations/%s", uc.llmPyURL, encodedID),
		fmt.Sprintf("%s/api/conversations/%s/detail", uc.llmPyURL, encodedID),
		fmt.Sprintf("%s/api/conversation/%s", uc.llmPyURL, encodedID),
	}

	var lastErr error

	for _, endpoint := range candidates {
		httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
		if err != nil {
			lastErr = err
			continue
		}

		resp, err := uc.client.Do(httpReq)
		if err != nil {
			lastErr = fmt.Errorf("failed to call llm-py: %w", err)
			continue
		}

		body, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		if readErr != nil {
			lastErr = fmt.Errorf("failed to read response body: %w", readErr)
			continue
		}

		if resp.StatusCode == http.StatusNotFound {
			lastErr = fmt.Errorf("detail endpoint not found: %s", endpoint)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("llm-py returned status: %d, body: %s", resp.StatusCode, string(body))
			continue
		}

		data, err := decodeConversationDetail(body, id)
		if err != nil {
			lastErr = fmt.Errorf("failed to decode response: %w", err)
			continue
		}

		return result.NewSuccess(data)
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("conversation detail not found")
	}

	return result.NewFailure[ConversationDetailData](lastErr)
}

func decodeConversationDetail(body []byte, fallbackID string) (ConversationDetailData, error) {
	var payload any
	if err := json.Unmarshal(body, &payload); err != nil {
		return ConversationDetailData{}, err
	}

	payloadMap := asMap(payload)
	if payloadMap != nil {
		if code, ok := payloadMap["code"]; ok && intValue(code) != 0 {
			return ConversationDetailData{}, fmt.Errorf("llm-py error: %s", stringValue(payloadMap["message"]))
		}

		if data, ok := payloadMap["data"]; ok && data != nil {
			payload = data
		}
	}

	return normalizeConversationDetail(payload, fallbackID), nil
}

func normalizeConversationDetail(payload any, fallbackID string) ConversationDetailData {
	rawConversation := asMap(payload)
	if rawConversation == nil {
		rawConversation = map[string]any{}
	}

	if nestedConversation := asMap(rawConversation["conversation"]); nestedConversation != nil {
		rawConversation = nestedConversation
	}

	messageList := asSlice(rawConversation["messages"])
	if len(messageList) == 0 {
		payloadMap := asMap(payload)
		if payloadMap != nil {
			messageList = asSlice(payloadMap["messages"])
			if len(messageList) == 0 {
				messageList = asSlice(payloadMap["items"])
			}
			if len(messageList) == 0 {
				messageList = asSlice(payloadMap["history"])
			}
		}
	}

	messages := make([]ConversationMessage, 0, len(messageList))
	for _, item := range messageList {
		message := asMap(item)
		if message == nil {
			continue
		}

		normalized := ConversationMessage{
			ID:        stringValue(message["id"]),
			Role:      firstNonEmptyString(message["role"], message["sender_role"], message["type"], "assistant"),
			Content:   firstNonEmptyString(message["content"], message["text"], message["message"], ""),
			CreatedAt: stringValue(message["created_at"]),
			Timestamp: stringValue(message["timestamp"]),
			Model:     stringValue(message["model"]),
		}

		if normalized.Content == "" {
			continue
		}

		messages = append(messages, normalized)
	}

	if len(messages) == 0 {
		userContent := firstNonEmptyString(rawConversation["user_message"], rawConversation["user_content"], rawConversation["question"], rawConversation["prompt"], "")
		assistantContent := firstNonEmptyString(rawConversation["assistant_message"], rawConversation["assistant_content"], rawConversation["answer"], rawConversation["response"], "")

		if userContent != "" {
			messages = append(messages, ConversationMessage{
				Role:      "user",
				Content:   userContent,
				CreatedAt: stringValue(rawConversation["created_at"]),
			})
		}

		if assistantContent != "" {
			messages = append(messages, ConversationMessage{
				Role:      "assistant",
				Content:   assistantContent,
				CreatedAt: firstNonEmptyString(rawConversation["updated_at"], rawConversation["created_at"], ""),
			})
		}
	}

	return ConversationDetailData{
		ID:            firstNonEmptyString(rawConversation["id"], fallbackID),
		SessionID:     stringValue(rawConversation["session_id"]),
		Title:         stringValue(rawConversation["title"]),
		MemoryEnabled: boolValue(rawConversation["memory_enabled"]),
		Source:        stringValue(rawConversation["source"]),
		CreatedAt:     stringValue(rawConversation["created_at"]),
		UpdatedAt:     firstNonEmptyString(rawConversation["updated_at"], rawConversation["created_at"], ""),
		MessageCount:  intValueWithDefault(rawConversation["message_count"], len(messages)),
		Messages:      messages,
	}
}

func asMap(value any) map[string]any {
	result, _ := value.(map[string]any)
	return result
}

func asSlice(value any) []any {
	result, _ := value.([]any)
	return result
}

func stringValue(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case fmt.Stringer:
		return typed.String()
	case float64:
		return fmt.Sprintf("%.0f", typed)
	case float32:
		return fmt.Sprintf("%.0f", typed)
	case int:
		return fmt.Sprintf("%d", typed)
	case int32:
		return fmt.Sprintf("%d", typed)
	case int64:
		return fmt.Sprintf("%d", typed)
	case bool:
		if typed {
			return "true"
		}
		return "false"
	default:
		return ""
	}
}

func firstNonEmptyString(values ...any) string {
	for _, value := range values {
		if str := strings.TrimSpace(stringValue(value)); str != "" {
			return str
		}
	}
	return ""
}

func boolValue(value any) bool {
	switch typed := value.(type) {
	case bool:
		return typed
	case string:
		return strings.EqualFold(typed, "true") || typed == "1"
	case float64:
		return typed != 0
	case int:
		return typed != 0
	default:
		return false
	}
}

func intValue(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int32:
		return int(typed)
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	case string:
		var parsed int
		fmt.Sscanf(typed, "%d", &parsed)
		return parsed
	default:
		return 0
	}
}

func intValueWithDefault(value any, defaultValue int) int {
	if value == nil {
		return defaultValue
	}

	parsed := intValue(value)
	if parsed == 0 && defaultValue > 0 && strings.TrimSpace(stringValue(value)) == "" {
		return defaultValue
	}

	if parsed == 0 && defaultValue > 0 {
		return defaultValue
	}

	return parsed
}
