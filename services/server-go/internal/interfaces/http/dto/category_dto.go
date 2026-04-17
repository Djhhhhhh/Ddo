package dto

import "time"

// CategoryResponse 分类响应
type CategoryResponse struct {
	Code    int            `json:"code"`
	Message string         `json:"message"`
	Data    CategoryData   `json:"data"`
	Timestamp time.Time    `json:"timestamp"`
}

// CategoryData 分类数据
type CategoryData struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ListCategoryResponse 分类列表响应
type ListCategoryResponse struct {
	Code    int               `json:"code"`
	Message string            `json:"message"`
	Data    ListCategoryData  `json:"data"`
	Timestamp time.Time       `json:"timestamp"`
}

// ListCategoryData 分类列表数据
type ListCategoryData struct {
	Total int64            `json:"total"`
	Items []CategoryItemDTO `json:"items"`
}

// CategoryItemDTO 分类项 DTO
type CategoryItemDTO struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// CreateCategoryRequest 创建分类请求
type CreateCategoryRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// KnowledgeByCategoryResponse 按分类查询知识响应
type KnowledgeByCategoryResponse struct {
	Code    int                       `json:"code"`
	Message string                    `json:"message"`
	Data    ListKnowledgeData         `json:"data"`
	Timestamp time.Time               `json:"timestamp"`
}

// AnalyzeRequest AI 分析请求
type AnalyzeRequest struct {
	Content  string `json:"content"`
	Title    string `json:"title"`
	Context  string `json:"context"`
}

// AnalyzeResponse AI 分析响应
type AnalyzeResponse struct {
	Tags             []string `json:"tags"`
	Categories       []string `json:"categories"`
	IsNewCategories  []bool   `json:"is_new_categories"`
	SuggestedReply   string   `json:"suggested_reply"`
}

// UpdateCreateKnowledgeRequest 修改后的创建知识请求（包含分类列表）
type UpdateCreateKnowledgeRequest struct {
	Title      string   `json:"title" binding:"required"`
	Content    string   `json:"content"`
	Category   string   `json:"category"`   // 主分类（冗余字段）
	Categories []string `json:"categories"` // 分类列表
	Tags       []string `json:"tags"`
	Source     string   `json:"source"`
}

// UpdateCreateKnowledgeData 修改后的创建知识数据（包含分类列表）
type UpdateCreateKnowledgeData struct {
	UUID        string   `json:"uuid"`
	Title       string   `json:"title"`
	Category    string   `json:"category"`
	Categories  []string `json:"categories"`
	Tags        []string `json:"tags"`
	Status      string   `json:"status"`
	EmbeddingID string   `json:"embedding_id,omitempty"`
}