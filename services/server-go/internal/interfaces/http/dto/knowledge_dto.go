package dto

import "time"

// CreateKnowledgeRequest 创建知识请求
type CreateKnowledgeRequest struct {
	Title    string   `json:"title" binding:"required"`
	Content  string   `json:"content"`
	Category string   `json:"category"`
	Tags     []string `json:"tags"`
	Source   string   `json:"source"`
}

// CreateKnowledgeResponse 创建知识响应
type CreateKnowledgeResponse struct {
	Code    int                       `json:"code"`
	Message string                    `json:"message"`
	Data    CreateKnowledgeData       `json:"data"`
	Timestamp time.Time               `json:"timestamp"`
}

// CreateKnowledgeData 创建知识数据
type CreateKnowledgeData struct {
	UUID        string   `json:"uuid"`
	Title       string   `json:"title"`
	Category    string   `json:"category"`
	Tags        []string `json:"tags"`
	Status      string   `json:"status"`
	EmbeddingID string   `json:"embedding_id,omitempty"`
}

// ListKnowledgeRequest 查询知识列表请求
type ListKnowledgeRequest struct {
	Category string `json:"category" form:"category"`
	Tag      string `json:"tag" form:"tag"`
	Keyword  string `json:"keyword" form:"keyword"`
	Page     int    `json:"page" form:"page,default=1"`
	PageSize int    `json:"page_size" form:"page_size,default=20"`
}

// ListKnowledgeResponse 查询知识列表响应
type ListKnowledgeResponse struct {
	Code    int                  `json:"code"`
	Message string               `json:"message"`
	Data    ListKnowledgeData    `json:"data"`
	Timestamp time.Time          `json:"timestamp"`
}

// ListKnowledgeData 查询知识列表数据
type ListKnowledgeData struct {
	Total int64              `json:"total"`
	Items []KnowledgeItemDTO `json:"items"`
}

// KnowledgeItemDTO 知识项 DTO
type KnowledgeItemDTO struct {
	UUID     string   `json:"uuid"`
	Title    string   `json:"title"`
	Category string   `json:"category"`
	Tags     []string `json:"tags"`
	Source   string   `json:"source"`
	Status   string   `json:"status"`
}

// GetKnowledgeResponse 获取知识详情响应
type GetKnowledgeResponse struct {
	Code    int                  `json:"code"`
	Message string               `json:"message"`
	Data    KnowledgeDetailData  `json:"data"`
	Timestamp time.Time          `json:"timestamp"`
}

// KnowledgeDetailData 知识详情数据
type KnowledgeDetailData struct {
	Knowledge KnowledgeDetailDTO `json:"knowledge"`
}

// KnowledgeDetailDTO 知识详情 DTO
type KnowledgeDetailDTO struct {
	UUID        string   `json:"uuid"`
	Title       string   `json:"title"`
	Content     string   `json:"content"`
	Category    string   `json:"category"`
	Tags        []string `json:"tags"`
	Source      string   `json:"source"`
	EmbeddingID string   `json:"embedding_id,omitempty"`
	Status      string   `json:"status"`
	CreatedAt   string   `json:"created_at"`
	UpdatedAt   string   `json:"updated_at"`
}

// DeleteKnowledgeResponse 删除知识响应
type DeleteKnowledgeResponse struct {
	Code    int                      `json:"code"`
	Message string                   `json:"message"`
	Data    DeleteKnowledgeData      `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
}

// DeleteKnowledgeData 删除知识数据
type DeleteKnowledgeData struct {
	Success bool `json:"success"`
}

// SearchKnowledgeRequest 语义搜索请求
type SearchKnowledgeRequest struct {
	Query    string  `json:"query" form:"q,required"`
	Limit    int     `json:"limit" form:"limit,default=5"`
	MinScore float64 `json:"min_score" form:"min_score,default=0.3"`
}

// SearchKnowledgeResponse 语义搜索响应
type SearchKnowledgeResponse struct {
	Code    int                      `json:"code"`
	Message string                   `json:"message"`
	Data    SearchKnowledgeData      `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
}

// SearchKnowledgeData 语义搜索数据
type SearchKnowledgeData struct {
	Results []SearchResultItemDTO `json:"results"`
}

// SearchResultItemDTO 搜索结果项 DTO
type SearchResultItemDTO struct {
	UUID        string  `json:"uuid"`
	Title       string  `json:"title"`
	Category    string  `json:"category"`
	Score       float64 `json:"score"`
	Content     string  `json:"content,omitempty"`
	EmbeddingID string  `json:"embedding_id"`
}

// AskKnowledgeRequest RAG 问答请求
type AskKnowledgeRequest struct {
	Question     string  `json:"question" binding:"required"`
	ContextLimit int     `json:"context_limit"`
	MinScore     float64 `json:"min_score"`
}

// AskKnowledgeResponse RAG 问答响应
type AskKnowledgeResponse struct {
	Code    int                  `json:"code"`
	Message string               `json:"message"`
	Data    AskKnowledgeData     `json:"data"`
	Timestamp time.Time          `json:"timestamp"`
}

// AskKnowledgeData RAG 问答数据
type AskKnowledgeData struct {
	Answer  string   `json:"answer"`
	Sources []string `json:"sources"`
}
