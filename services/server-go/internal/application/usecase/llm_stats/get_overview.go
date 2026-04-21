package llm_stats

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/ddo/server-go/internal/application/result"
)

// OverviewData 概览统计数据
type OverviewData struct {
	Today     PeriodStats `json:"today"`
	ThisWeek  PeriodStats `json:"this_week"`
	ThisMonth PeriodStats `json:"this_month"`
}

// PeriodStats 周期统计数据
type PeriodStats struct {
	Requests     int `json:"requests"`
	Tokens       int `json:"tokens"`
	AvgLatencyMs int `json:"avg_latency_ms"`
}

// GetOverviewUseCase 获取概览统计用例
type GetOverviewUseCase struct {
	llmPyURL string
	client   *http.Client
}

// NewGetOverviewUseCase 创建用例实例
func NewGetOverviewUseCase(llmPyURL string) *GetOverviewUseCase {
	return &GetOverviewUseCase{
		llmPyURL: llmPyURL,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// Execute 执行查询
func (uc *GetOverviewUseCase) Execute(ctx context.Context) *result.Result[OverviewData] {
	// 调用 llm-py 统计接口
	url := fmt.Sprintf("%s/api/stats/overview", uc.llmPyURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return result.NewFailure[OverviewData](err)
	}

	resp, err := uc.client.Do(req)
	if err != nil {
		return result.NewFailure[OverviewData](fmt.Errorf("failed to call llm-py: %w", err))
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return result.NewFailure[OverviewData](fmt.Errorf("llm-py returned status: %d", resp.StatusCode))
	}

	// 解析响应
	var llmResp struct {
		Code    int          `json:"code"`
		Message string       `json:"message"`
		Data    OverviewData `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&llmResp); err != nil {
		return result.NewFailure[OverviewData](fmt.Errorf("failed to decode response: %w", err))
	}

	if llmResp.Code != 0 {
		return result.NewFailure[OverviewData](fmt.Errorf("llm-py error: %s", llmResp.Message))
	}

	return result.NewSuccess(llmResp.Data)
}
