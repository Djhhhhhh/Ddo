package health

import (
	"context"
	"time"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db"
	"github.com/ddo/server-go/internal/domain/health"
)

// CheckHealthInput 健康检查输入（空，无参数）
type CheckHealthInput struct{}

// CheckHealthOutput 健康检查输出
type CheckHealthOutput struct {
	Status    string                 `json:"status"`
	Version   string                 `json:"version"`
	Timestamp time.Time              `json:"timestamp"`
	MySQL     map[string]interface{} `json:"mysql,omitempty"`
}

// UseCase 健康检查用例接口
type UseCase interface {
	Execute(ctx context.Context, input CheckHealthInput) *result.Result[CheckHealthOutput]
}

// useCase 健康检查用例实现
type useCase struct {
	version string
	dbConn  *db.MySQLConn
}

// NewUseCase 创建健康检查用例
func NewUseCase(version string, dbConn *db.MySQLConn) UseCase {
	return &useCase{
		version: version,
		dbConn:  dbConn,
	}
}

// Execute 执行健康检查用例
func (uc *useCase) Execute(ctx context.Context, input CheckHealthInput) *result.Result[CheckHealthOutput] {
	// 创建聚合根，执行业务逻辑
	aggregate := health.NewAggregate(uc.version)

	// 检查数据库状态
	var mysqlStatus map[string]interface{}
	if uc.dbConn != nil {
		status, err := uc.dbConn.GetMySQLStatus()
		if err != nil {
			mysqlStatus = map[string]interface{}{
				"connected": false,
				"error":     err.Error(),
			}
		} else {
			mysqlStatus = status
		}
	} else {
		mysqlStatus = map[string]interface{}{
			"connected": false,
			"error":     "database connection not initialized",
		}
	}

	// 构建输出 DTO
	status := aggregate.Status()
	output := CheckHealthOutput{
		Status:    string(status.Status),
		Version:   status.Version,
		Timestamp: time.Now(),
		MySQL:     mysqlStatus,
	}

	return result.NewSuccess(output)
}
