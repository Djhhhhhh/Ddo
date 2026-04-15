package health

import (
	"context"
	"time"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/domain/health"
)

// CheckHealthInput 健康检查输入（空，无参数）
type CheckHealthInput struct{}

// CheckHealthOutput 健康检查输出
type CheckHealthOutput struct {
	Status    string
	Version   string
	Timestamp time.Time
}

// UseCase 健康检查用例接口
type UseCase interface {
	Execute(ctx context.Context, input CheckHealthInput) *result.Result[CheckHealthOutput]
}

// useCase 健康检查用例实现
type useCase struct {
	version string
}

// NewUseCase 创建健康检查用例
func NewUseCase(version string) UseCase {
	return &useCase{
		version: version,
	}
}

// Execute 执行健康检查用例
func (uc *useCase) Execute(ctx context.Context, input CheckHealthInput) *result.Result[CheckHealthOutput] {
	// 创建聚合根，执行业务逻辑
	aggregate := health.NewAggregate(uc.version)

	// 构建输出 DTO
	status := aggregate.Status()
	output := CheckHealthOutput{
		Status:    string(status.Status),
		Version:   status.Version,
		Timestamp: time.Now(),
	}

	return result.NewSuccess(output)
}
