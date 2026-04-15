//go:build wireinject
// +build wireinject

package main

import (
	"github.com/gin-gonic/gin"
	"github.com/google/wire"
	"go.uber.org/zap"

	"github.com/ddo/server-go/internal/application/usecase/health"
	"github.com/ddo/server-go/internal/bootstrap"
	"github.com/ddo/server-go/internal/infrastructure/config"
	"github.com/ddo/server-go/internal/infrastructure/logger"
	"github.com/ddo/server-go/internal/infrastructure/server"
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

// provideEngine 提供 Gin Engine
func provideEngine(router *httpinterface.Router) *gin.Engine {
	return router.Engine()
}

// provideVersion 提供版本号
func provideVersion() string {
	return appVersion
}
