//go:build wireinject
// +build wireinject

package main

import (
	"github.com/gin-gonic/gin"
	"github.com/google/wire"
	"go.uber.org/zap"

	"github.com/ddo/server-go/internal/application/usecase/health"
	"github.com/ddo/server-go/internal/bootstrap"
	"github.com/ddo/server-go/internal/db"
	"github.com/ddo/server-go/internal/infrastructure/config"
	"github.com/ddo/server-go/internal/infrastructure/logger"
	"github.com/ddo/server-go/internal/infrastructure/server"
	"github.com/ddo/server-go/internal/queue"
	httpinterface "github.com/ddo/server-go/internal/interfaces/http"
	"github.com/ddo/server-go/internal/interfaces/http/handler"
)

// appVersion 应用版本号
const appVersion = "v1.0.0"

// InitializeApp 初始化应用
// Wire 会自动生成此方法的具体实现
func InitializeApp(cfgPath string) (*bootstrap.App, func(), error) {
	wire.Build(
		// 配置层
		config.NewViperLoader,
		provideConfig,

		// 基础设施层
		provideLogger,
		server.NewGinServer,

		// 数据库层
		provideMySQLConn,
		provideQueue,

		// 接口层
		httpinterface.NewRouter,
		provideEngine,
		handler.NewHealthHandler,

		// 应用层
		health.NewUseCase,
		provideVersion,

		// 应用生命周期
		bootstrap.NewApp,
	)
	return nil, nil, nil
}

// provideConfig 提供配置
func provideConfig(loader *config.ViperLoader, cfgPath string) (*config.Config, error) {
	return loader.Load(cfgPath)
}

// provideLogger 提供日志实例
func provideLogger(cfg *config.Config) (*zap.Logger, func(), error) {
	log, err := logger.NewZapLogger(
		cfg.Log.Level,
		cfg.Log.Format,
		cfg.Log.Output,
	)
	if err != nil {
		return nil, nil, err
	}

	cleanup := func() {
		_ = log.Sync()
	}

	return log, cleanup, nil
}

// provideMySQLConn 提供 MySQL 连接
func provideMySQLConn(cfg *config.Config, logger *zap.Logger) (*db.MySQLConn, func(), error) {
	conn, cleanup, err := db.NewMySQLConn(cfg)
	if err != nil {
		logger.Error("Failed to connect to MySQL", zap.Error(err))
		// MySQL 连接失败不应阻止服务启动
		// 返回 nil，服务启动后可以通过健康检查发现
		return nil, func() {}, nil
	}
	return conn, cleanup, nil
}

// provideQueue 提供消息队列
func provideQueue(cfg *config.Config, logger *zap.Logger) (queue.Queue, func(), error) {
	// 使用默认配置，数据目录在 ~/.ddo/data/badger/queue
	qCfg := queue.DefaultConfig(cfg.Database.DBName)
	q, cleanup, err := queue.NewBadgerQueue(qCfg, logger)
	if err != nil {
		logger.Error("Failed to create queue", zap.Error(err))
		return nil, func() {}, err
	}
	return q, cleanup, nil
}

// provideEngine 提供 Gin Engine
func provideEngine(router *httpinterface.Router) *gin.Engine {
	return router.Engine()
}

// provideVersion 提供版本号
func provideVersion() string {
	return appVersion
}
