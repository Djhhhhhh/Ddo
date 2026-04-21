package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/ddo/server-go/internal/application/result"
)

// DecisionType 路由决策类型
type DecisionType string

const (
	DecisionRAG       DecisionType = "rag"       // 需要RAG检索
	DecisionChat      DecisionType = "chat"      // 直接聊天
	DecisionTool      DecisionType = "tool"      // 工具调用
	DecisionClarify   DecisionType = "clarify"   // 需要澄清
)

// 置信度阈值
const (
	HighConfidenceThreshold   = 0.8
	LowConfidenceThreshold    = 0.5
)

// ConversationService 统一对话服务接口
type ConversationService interface {
	// ProcessQuery 处理用户查询（非流式）
	ProcessQuery(ctx context.Context, req *ConversationRequest) *result.Result[ConversationResponse]

	// ProcessQueryStream 处理用户查询（流式）
	ProcessQueryStream(ctx context.Context, req *ConversationRequest) (<-chan StreamEvent, error)
}

// ConversationRequest 对话请求
type ConversationRequest struct {
	Query          string `json:"query"`
	ConversationID string `json:"conversation_id,omitempty"`
	Model          string `json:"model,omitempty"`
	KBPriority     bool   `json:"kb_priority,omitempty"`
}

// ConversationResponse 对话响应
type ConversationResponse struct {
	Decision     DecisionType   `json:"decision"`
	Intent       IntentDetail   `json:"intent"`
	Answer       string         `json:"answer"`
	Sources      []string       `json:"sources,omitempty"`
	RetrievedDocs []RetrievedDoc `json:"retrieved_docs,omitempty"`
}

// IntentDetail 意图详情
type IntentDetail struct {
	Type           string  `json:"type"`
	SubIntent      string  `json:"sub_intent,omitempty"`
	NeedKnowledge  bool    `json:"need_knowledge"`
	Confidence     float64 `json:"confidence"`
}

// RetrievedDoc 检索到的文档
type RetrievedDoc struct {
	ID      string  `json:"id"`
	Title   string  `json:"title"`
	Content string  `json:"content"`
	Score   float64 `json:"score"`
}

// StreamEvent 流式事件
type StreamEvent struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// IntentDetectedData 意图识别事件数据
type IntentDetectedData struct {
	Intent          string  `json:"intent"`
	NeedKnowledge   bool    `json:"need_knowledge"`
	Confidence      float64 `json:"confidence"`
	Reply           string  `json:"reply,omitempty"`
}

// RetrievingData 检索中事件数据
type RetrievingData struct {
	Status string `json:"status"`
	Query  string `json:"query,omitempty"`
}

// DocsFoundData 文档找到事件数据
type DocsFoundData struct {
	Count int            `json:"count"`
	Docs  []RetrievedDoc `json:"docs,omitempty"`
}

// DeltaData 增量生成事件数据
type DeltaData struct {
	Content string `json:"content"`
	Index   int    `json:"index,omitempty"`
}

// CompletedData 完成事件数据
type CompletedData struct {
	AnswerLength   int      `json:"answer_length"`
	Sources        []string `json:"sources,omitempty"`
	ProcessingTime int64    `json:"processing_time_ms,omitempty"`
}

// ClarifyData 澄清询问事件数据
type ClarifyData struct {
	Message     string   `json:"message"`
	Suggestions []string `json:"suggestions,omitempty"`
}

// ToolCallData 工具调用事件数据
type ToolCallData struct {
	Tool        string                 `json:"tool"`
	Parameters  map[string]interface{} `json:"parameters,omitempty"`
}

// conversationService 对话服务实现
type conversationService struct {
	intentProxy IntentProxy
	ragProxy    RAGProxy
	llmProxy    LLMProxy
	httpClient  *http.Client
	baseURL     string
}

// NewConversationService 创建对话服务
func NewConversationService(intentProxy IntentProxy, ragProxy RAGProxy, llmProxy LLMProxy) ConversationService {
	baseURL := os.Getenv("DDO_LLM_HOST")
	if baseURL == "" {
		baseURL = defaultLLMHost
	}

	return &conversationService{
		intentProxy: intentProxy,
		ragProxy:    ragProxy,
		llmProxy:    llmProxy,
		httpClient: &http.Client{
			Timeout: 120 * time.Second,
		},
		baseURL: baseURL,
	}
}

// ProcessQuery 处理用户查询（非流式）
func (s *conversationService) ProcessQuery(ctx context.Context, req *ConversationRequest) *result.Result[ConversationResponse] {
	if req.Query == "" {
		return result.NewFailure[ConversationResponse](fmt.Errorf("查询内容不能为空"))
	}

	// Step 1: 意图识别
	intentResult, err := s.intentProxy.RecognizeIntent(ctx, req.Query, req.Model)
	if err != nil {
		return result.NewFailure[ConversationResponse](fmt.Errorf("意图识别失败: %w", err))
	}

	// Step 2: 路由决策
	decision := s.makeDecision(intentResult, req.KBPriority, req.Query)

	intentDetail := IntentDetail{
		Type:          intentResult.Intent,
		SubIntent:     intentResult.SubIntent,
		NeedKnowledge: intentResult.NeedKnowledge,
		Confidence:    intentResult.Confidence,
	}

	switch decision {
	case DecisionRAG:
		return s.handleRAG(ctx, req, intentDetail)
	case DecisionChat:
		return s.handleChat(ctx, req, intentDetail)
	case DecisionTool:
		return s.handleTool(ctx, req, intentResult)
	case DecisionClarify:
		return s.handleClarify(intentResult)
	default:
		return result.NewFailure[ConversationResponse](fmt.Errorf("未知决策类型: %v", decision))
	}
}

// ProcessQueryStream 流式处理用户查询
func (s *conversationService) ProcessQueryStream(ctx context.Context, req *ConversationRequest) (<-chan StreamEvent, error) {
	if req.Query == "" {
		return nil, fmt.Errorf("查询内容不能为空")
	}

	eventChan := make(chan StreamEvent)

	go func() {
		defer close(eventChan)

		// Step 1: 意图识别
		intentResult, err := s.intentProxy.RecognizeIntent(ctx, req.Query, req.Model)
		if err != nil {
			eventChan <- StreamEvent{
				Type: "error",
				Data: map[string]string{"message": fmt.Sprintf("意图识别失败: %v", err)},
			}
			return
		}

		// 发送意图识别事件
		eventChan <- StreamEvent{
			Type: "intent_detected",
			Data: IntentDetectedData{
				Intent:        intentResult.Intent,
				NeedKnowledge: intentResult.NeedKnowledge,
				Confidence:    intentResult.Confidence,
				Reply:         intentResult.SuggestedReply,
			},
		}

		// Step 2: 路由决策
		decision := s.makeDecision(intentResult, req.KBPriority, req.Query)

		switch decision {
		case DecisionRAG:
			s.handleRAGStream(ctx, req, intentResult, eventChan)
		case DecisionChat:
			s.handleChatStream(ctx, req, intentResult, eventChan, false)
		case DecisionTool:
			s.handleToolStream(intentResult, eventChan)
		case DecisionClarify:
			s.handleClarifyStream(intentResult, eventChan)
		}
	}()

	return eventChan, nil
}

// makeDecision 路由决策
func (s *conversationService) makeDecision(intent *IntentResult, kbPriority bool, query string) DecisionType {
	// KB优先模式：必须先走RAG检索
	if kbPriority {
		// 置信度足够时才走RAG（避免无效检索）
		if intent.Confidence > 0.5 {
			return DecisionRAG
		}
		// 置信度太低，走澄清
		return DecisionClarify
	}

	// 低置信度：需要澄清
	if intent.Confidence < LowConfidenceThreshold {
		return DecisionClarify
	}

	// 以"我"开头的问答走RAG（如"我理解..."、"我觉得..."）
	if len(query) >= 2 && strings.HasPrefix(query, "我") {
		return DecisionRAG
	}

	// 聊天类意图（问候、告别）：始终走聊天
	if intent.Intent == "chat.greeting" || intent.Intent == "chat.farewell" {
		return DecisionChat
	}

	// 高置信度意图路由
	if intent.Confidence >= HighConfidenceThreshold {
		switch intent.Intent {
		case "knowledge.query", "knowledge.search":
			return DecisionRAG
		case "knowledge.add", "timer.add", "timer.create":
			return DecisionTool
		case "chat":
			// 通用chat走聊天
			return DecisionChat
		}
	}

	// 根据need_knowledge决策
	if intent.NeedKnowledge {
		return DecisionRAG
	}

	// 检查是否是工具类意图
	toolIntents := []string{"knowledge.add", "timer.add", "timer.create", "timer.list",
		"mcp.add", "mcp.setup", "system.help", "system.status"}
	for _, ti := range toolIntents {
		if intent.Intent == ti || (len(intent.Intent) > len(ti) && intent.Intent[:len(ti)] == ti) {
			return DecisionTool
		}
	}

	// 默认进入聊天
	return DecisionChat
}

// handleRAG 处理RAG查询（非流式）
func (s *conversationService) handleRAG(ctx context.Context, req *ConversationRequest, intent IntentDetail) *result.Result[ConversationResponse] {
	// 步骤1：检索文档
	searchResults, err := s.ragProxy.SearchVector(ctx, req.Query, 5, 0.5)
	if err != nil {
		// 检索失败，降级到直接聊天
		return s.handleChat(ctx, req, intent)
	}

	// 步骤2：没有检索到文档时降级到 chat
	if len(searchResults) == 0 {
		return s.handleChat(ctx, req, intent)
	}

	// 步骤3：有检索到文档，调用RAG服务生成
	ragReq := &RAGAskRequest{
		Question:     req.Query,
		Collection:   "default",
		TopK:         5,
		MinScore:     0.5,
		Stream:       false,
		Model:        req.Model,
	}

	rawResp, err := s.callRAGService(ctx, ragReq)
	if err != nil {
		// RAG失败，降级到直接聊天
		return s.handleChat(ctx, req, intent)
	}

	return result.NewSuccess(ConversationResponse{
		Decision:     DecisionRAG,
		Intent:       intent,
		Answer:       rawResp.Answer,
		Sources:      rawResp.Sources,
		RetrievedDocs: convertToRetrievedDocs(rawResp),
	})
}

// handleRAGStream 处理RAG流式查询
func (s *conversationService) handleRAGStream(ctx context.Context, req *ConversationRequest, intent *IntentResult, eventChan chan<- StreamEvent) {
	// 发送检索中事件
	eventChan <- StreamEvent{
		Type: "retrieving",
		Data: RetrievingData{Status: "searching", Query: req.Query},
	}

	// 步骤1：检索文档
	searchResults, err := s.ragProxy.SearchVector(ctx, req.Query, 5, 0.5)
	if err != nil {
		// 检索失败，降级到聊天
		s.handleChatStream(ctx, req, intent, eventChan, false)
		return
	}

	// 步骤2：决策 - 没有检索到文档时降级到 chat
	if len(searchResults) == 0 {
		// 发送空文档事件
		eventChan <- StreamEvent{
			Type: "docs_found",
			Data: DocsFoundData{Count: 0, Docs: nil},
		}
		// 降级到直接 chat，让 AI 用通用知识回答
		s.handleChatStream(ctx, req, intent, eventChan, true)
		return
	}

	// 步骤3：有检索到文档，执行 RAG 生成
	// 发送文档找到事件
	docs := make([]RetrievedDoc, 0, len(searchResults))
	for _, sr := range searchResults {
		docs = append(docs, RetrievedDoc{
			ID:      sr.EmbeddingID,
			Title:   sr.Title,
			Content: sr.Content,
			Score:   sr.Score,
		})
	}

	eventChan <- StreamEvent{
		Type: "docs_found",
		Data: DocsFoundData{Count: len(docs), Docs: docs},
	}

	// 步骤4：调用流式RAG生成
	ragReq := &RAGAskRequest{
		Question:     req.Query,
		Collection:   "default",
		TopK:         5,
		MinScore:     0.5,
		Stream:       true,
		Model:        req.Model,
	}

	streamChan, err := s.callRAGServiceStream(ctx, ragReq)
	if err != nil {
		// 流式失败，尝试非流式
		ragReq.Stream = false
		rawResp, err := s.callRAGService(ctx, ragReq)
		if err != nil {
			eventChan <- StreamEvent{
				Type: "error",
				Data: map[string]string{"message": "RAG生成失败"},
			}
			return
		}
		// 一次性发送完整回答
		eventChan <- StreamEvent{
			Type: "generating",
			Data: map[string]string{"status": "started"},
		}
		eventChan <- StreamEvent{
			Type: "delta",
			Data: DeltaData{Content: rawResp.Answer, Index: 0},
		}
		eventChan <- StreamEvent{
			Type: "completed",
			Data: CompletedData{AnswerLength: len(rawResp.Answer), Sources: rawResp.Sources},
		}
		return
	}

	// 发送生成开始事件
	eventChan <- StreamEvent{
		Type: "generating",
		Data: map[string]string{"status": "started"},
	}

	// 转发流式事件
	index := 0
	fullAnswer := ""
	for chunk := range streamChan {
		eventChan <- StreamEvent{
			Type: "delta",
			Data: DeltaData{Content: chunk, Index: index},
		}
		fullAnswer += chunk
		index++
	}

	// 发送完成事件
	sources := []string{}
	for _, doc := range docs {
		sources = append(sources, doc.ID)
	}
	eventChan <- StreamEvent{
		Type: "completed",
		Data: CompletedData{
			AnswerLength: len(fullAnswer),
			Sources:      sources,
		},
	}
}

// handleChat 处理直接聊天（非流式）
func (s *conversationService) handleChat(ctx context.Context, req *ConversationRequest, intent IntentDetail) *result.Result[ConversationResponse] {
	messages := []Message{
		{Role: "user", Content: req.Query},
	}

	chatReq := &ChatRequest{
		Messages:       messages,
		Model:          req.Model,
		Stream:         false,
		ConversationID: req.ConversationID,
		SessionID:      "cli", // CLI 调用标记
	}

	resp, err := s.llmProxy.Chat(ctx, chatReq)
	if err != nil {
		return result.NewFailure[ConversationResponse](fmt.Errorf("聊天请求失败: %w", err))
	}

	return result.NewSuccess(ConversationResponse{
		Decision: DecisionChat,
		Intent:   intent,
		Answer:   resp.Content,
	})
}

// handleChatStream 处理流式聊天
func (s *conversationService) handleChatStream(ctx context.Context, req *ConversationRequest, intentResult *IntentResult, eventChan chan<- StreamEvent, noDocsFound bool) {
	// 如果意图识别已经提供了建议回复且不需要知识库，通过流式返回
	// 注意：need_knowledge=true 时 SuggestedReply 只是中途提示，不能作为最终回答
	if intentResult != nil && intentResult.SuggestedReply != "" && !intentResult.NeedKnowledge {
		// 仍然调用 llmProxy 保存对话记录，但使用预设回复
		s.streamReplyWithSave(ctx, req, intentResult.SuggestedReply, eventChan)
		return
	}

	// 根据是否检索到文档决定回复风格
	var systemPrompt string
	if noDocsFound {
		systemPrompt = "请用简洁的方式回答用户的问题，不要过于冗长。如果用户问的是具体知识类问题，直接告知\"知识库暂无相关文档\"即可。"
	}

	messages := []Message{}
	if systemPrompt != "" {
		messages = append(messages, Message{Role: "system", Content: systemPrompt})
	}
	messages = append(messages, Message{Role: "user", Content: req.Query})

	chatReq := &ChatRequest{
		Messages:       messages,
		Model:          req.Model,
		Stream:         true,
		SystemPrompt:   systemPrompt,
		ConversationID: req.ConversationID,
		SessionID:      "cli", // CLI 调用标记
	}

	streamChan, err := s.llmProxy.ChatStream(ctx, chatReq)
	if err != nil {
		eventChan <- StreamEvent{
			Type: "error",
			Data: map[string]string{"message": fmt.Sprintf("聊天流失败: %v", err)},
		}
		return
	}

	// 发送生成开始事件
	eventChan <- StreamEvent{
		Type: "generating",
		Data: map[string]string{"status": "started"},
	}

	// 转发流式事件
	index := 0
	fullAnswer := ""
	for chunk := range streamChan {
		eventChan <- StreamEvent{
			Type: "delta",
			Data: DeltaData{Content: chunk, Index: index},
		}
		fullAnswer += chunk
		index++
	}

	// 发送完成事件
	eventChan <- StreamEvent{
		Type: "completed",
		Data: CompletedData{AnswerLength: len(fullAnswer)},
	}
}

// streamReplyWithSave 保存对话并流式发送预设回复
func (s *conversationService) streamReplyWithSave(ctx context.Context, req *ConversationRequest, reply string, eventChan chan<- StreamEvent) {
	// 调用 llmProxy.Chat 保存对话记录（使用非流式，传入 preset_reply）
	messages := []Message{
		{Role: "user", Content: req.Query},
	}
	chatReq := &ChatRequest{
		Messages:       messages,
		Model:          req.Model,
		Stream:         false,
		ConversationID: req.ConversationID,
		SessionID:      "cli",
		PresetReply:    reply, // 使用预设回复，跳过 LLM 调用
	}
	// 异步保存，不阻塞回复
	go s.llmProxy.Chat(ctx, chatReq)

	// 流式发送预设回复
	eventChan <- StreamEvent{
		Type: "generating",
		Data: map[string]string{},
	}

	for i, char := range reply {
		eventChan <- StreamEvent{
			Type: "delta",
			Data: DeltaData{Content: string(char), Index: i},
		}
	}

	eventChan <- StreamEvent{
		Type: "completed",
		Data: CompletedData{AnswerLength: len(reply)},
	}
}

// streamReply 将文本通过流式发送（逐字发送以实现打字机效果）
func (s *conversationService) streamReply(text string, eventChan chan<- StreamEvent) {
	eventChan <- StreamEvent{
		Type: "generating",
		Data: map[string]string{},
	}

	for i, char := range text {
		eventChan <- StreamEvent{
			Type: "delta",
			Data: DeltaData{Content: string(char), Index: i},
		}
	}

	eventChan <- StreamEvent{
		Type: "completed",
		Data: CompletedData{AnswerLength: len(text)},
	}
}

// handleTool 处理工具调用（非流式）
func (s *conversationService) handleTool(ctx context.Context, req *ConversationRequest, intent *IntentResult) *result.Result[ConversationResponse] {
	// 工具调用返回特殊响应，由CLI处理后续交互
	return result.NewSuccess(ConversationResponse{
		Decision: DecisionTool,
		Intent: IntentDetail{
			Type:          intent.Intent,
			SubIntent:     intent.SubIntent,
			NeedKnowledge: intent.NeedKnowledge,
			Confidence:    intent.Confidence,
		},
		Answer: intent.SuggestedReply,
	})
}

// handleToolStream 处理流式工具调用
func (s *conversationService) handleToolStream(intent *IntentResult, eventChan chan<- StreamEvent) {
	eventChan <- StreamEvent{
		Type: "tool_call",
		Data: ToolCallData{
			Tool:       intent.Intent,
			Parameters: intent.Parameters,
		},
	}
}

// handleClarify 处理澄清询问（非流式）
func (s *conversationService) handleClarify(intent *IntentResult) *result.Result[ConversationResponse] {
	return result.NewSuccess(ConversationResponse{
		Decision: DecisionClarify,
		Intent: IntentDetail{
			Type:          intent.Intent,
			SubIntent:     intent.SubIntent,
			NeedKnowledge: intent.NeedKnowledge,
			Confidence:    intent.Confidence,
		},
		Answer: "请澄清您的意图",
	})
}

// handleClarifyStream 处理流式澄清询问
func (s *conversationService) handleClarifyStream(intent *IntentResult, eventChan chan<- StreamEvent) {
	// 构建澄清选项
	suggestions := []string{}
	if intent.Intent == "" || intent.Confidence < LowConfidenceThreshold {
		suggestions = []string{
			"查询知识库",
			"添加知识",
			"创建定时任务",
			"随便聊聊",
		}
	}

	eventChan <- StreamEvent{
		Type: "clarify",
		Data: ClarifyData{
			Message:     "我没有完全理解您的意思，请问您想：",
			Suggestions: suggestions,
		},
	}
}

// RAGAskRequest RAG问答请求
type RAGAskRequest struct {
	Question   string  `json:"question"`
	Collection string  `json:"collection,omitempty"`
	TopK       int     `json:"top_k,omitempty"`
	MinScore   float64 `json:"min_score,omitempty"`
	Stream     bool    `json:"stream,omitempty"`
	Model      string  `json:"model,omitempty"`
}

// RAGAskResponse RAG问答响应
type RAGAskResponse struct {
	Answer  string   `json:"answer"`
	Sources []string `json:"sources,omitempty"`
}

// callRAGService 调用RAG服务（非流式）
func (s *conversationService) callRAGService(ctx context.Context, req *RAGAskRequest) (*RAGAskResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal rag request failed: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+"/api/rag/ask", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create rag request failed: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("rag request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("rag request failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result RAGAskResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode rag response failed: %w", err)
	}

	return &result, nil
}

// callRAGServiceStream 调用RAG服务（流式）
func (s *conversationService) callRAGServiceStream(ctx context.Context, req *RAGAskRequest) (<-chan string, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal rag request failed: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+"/api/rag/ask", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create rag request failed: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	// 添加流式标识
	httpReq.Header.Set("Accept", "text/event-stream")

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("rag stream request failed: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, fmt.Errorf("rag stream request failed with status %d", resp.StatusCode)
	}

	streamChan := make(chan string)

	go func() {
		defer close(streamChan)
		defer resp.Body.Close()

		// 读取SSE格式响应 (data: ...)
		reader := resp.Body
		buffer := make([]byte, 1024)
		lineBuffer := ""

		for {
			n, err := reader.Read(buffer)
			if n > 0 {
				lineBuffer += string(buffer[:n])

				// 处理完整的行
				for {
					idx := 0
					found := false
					for i := 0; i < len(lineBuffer); i++ {
						if lineBuffer[i] == '\n' {
							idx = i
							found = true
							break
						}
					}
					if !found {
						break
					}

					line := lineBuffer[:idx]
					lineBuffer = lineBuffer[idx+1:]

					line = string(bytes.TrimSpace([]byte(line)))
					if len(line) > 6 && string(line[:6]) == "data: " {
						data := string(line[6:])
						if data == "[DONE]" {
							return
						}

						// 尝试解析JSON获取content
						var eventData map[string]interface{}
						if json.Unmarshal([]byte(data), &eventData) == nil {
							if content, ok := eventData["content"].(string); ok {
								streamChan <- content
							}
						} else {
							streamChan <- data
						}
					}
				}
			}

			if err != nil {
				break
			}
		}
	}()

	return streamChan, nil
}

// convertToRetrievedDocs 转换为检索文档列表
func convertToRetrievedDocs(resp *RAGAskResponse) []RetrievedDoc {
	// 简化处理，实际应该从sources解析
	return []RetrievedDoc{}
}
