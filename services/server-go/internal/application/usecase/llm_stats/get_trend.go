package llm_stats

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/ddo/server-go/internal/application/result"
)

// TrendData 趋势数据
type TrendData struct {
	Dates    []string `json:"dates"`
	Requests []int    `json:"requests"`
	Tokens   []int    `json:"tokens"`
}

// GetTrendUseCase 获取趋势数据用例
type GetTrendUseCase struct {
	llmPyURL string
	client   *http.Client
}

// NewGetTrendUseCase 创建用例实例
func NewGetTrendUseCase(llmPyURL string) *GetTrendUseCase {
	return &GetTrendUseCase{
		llmPyURL: llmPyURL,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// TrendRequest 趋势查询参数
type TrendRequest struct {
	Days    int    // 天数
	GroupBy string // 聚合方式: day/week/month
}

// Execute 执行查询
func (uc *GetTrendUseCase) Execute(ctx context.Context, req TrendRequest) *result.Result[TrendData] {
	// 构建 URL
	params := url.Values{}
	if req.Days > 0 {
		params.Set("days", fmt.Sprintf("%d", req.Days))
	}
	if req.GroupBy != "" {
		params.Set("group_by", req.GroupBy)
	}

	url := fmt.Sprintf("%s/api/stats/trend?%s", uc.llmPyURL, params.Encode())

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return result.NewFailure[TrendData](err)
	}

	resp, err := uc.client.Do(httpReq)
	if err != nil {
		return result.NewFailure[TrendData](fmt.Errorf("failed to call llm-py: %w", err))
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return result.NewFailure[TrendData](fmt.Errorf("llm-py returned status: %d", resp.StatusCode))
	}

	// 解析响应
	var llmResp struct {
		Code    int       `json:"code"`
		Message string    `json:"message"`
		Data    TrendData `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&llmResp); err != nil {
		return result.NewFailure[TrendData](fmt.Errorf("failed to decode response: %w", err))
	}

	if llmResp.Code != 0 {
		return result.NewFailure[TrendData](fmt.Errorf("llm-py error: %s", llmResp.Message))
	}

	return result.NewSuccess(llmResp.Data)
}
