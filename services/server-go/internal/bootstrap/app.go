package bootstrap

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"go.uber.org/zap"

	"github.com/ddo/server-go/internal/infrastructure/config"
	"github.com/ddo/server-go/internal/infrastructure/server"
	httpinterface "github.com/ddo/server-go/internal/interfaces/http"
	"github.com/ddo/server-go/internal/interfaces/http/handler"
)

// App 应用生命周期管理
type App struct {
	router         *httpinterface.Router
	healthHandler  *handler.HealthHandler
	server         *server.GinServer
	config         *config.Config
	logger         *zap.Logger
}

// NewApp 创建应用实例
func NewApp(
	cfg *config.Config,
	logger *zap.Logger,
	httpServer *server.GinServer,
) *App {
	return &App{
		server: httpServer,
		config: cfg,
		logger: logger,
	}
}

// SetRouter 设置路由（用于依赖注入后注册路由）
func (a *App) SetRouter(router *httpinterface.Router) {
	a.router = router
}

// SetHealthHandler 设置 Health Handler
func (a *App) SetHealthHandler(handler *handler.HealthHandler) {
	a.healthHandler = handler
}

// Start 启动应用
// 启动 HTTP 服务器并监听系统信号
func (a *App) Start() error {
	// 启动服务器
	if err := a.server.Start(); err != nil {
		return fmt.Errorf("start server failed: %w", err)
	}

	a.logger.Info("Application started successfully",
		zap.String("addr", a.config.ServerAddr()),
	)

	return nil
}

// Stop 停止应用
// 优雅关闭 HTTP 服务器
func (a *App) Stop(ctx context.Context) error {
	a.logger.Info("Application stopping...")

	// 关闭 HTTP 服务器
	if err := a.server.Stop(); err != nil {
		a.logger.Error("Server stop error", zap.Error(err))
		return err
	}

	// 刷新日志
	if err := a.logger.Sync(); err != nil {
		// 忽略 sync 错误（标准输出不支持 sync）
		_ = err
	}

	a.logger.Info("Application stopped")
	return nil
}

// Run 运行应用
// 启动应用并阻塞等待关闭信号
func (a *App) Run() error {
	// 启动应用
	if err := a.Start(); err != nil {
		return err
	}

	// 等待关闭信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	sig := <-quit
	a.logger.Info("Received signal, shutting down...",
		zap.String("signal", sig.String()),
	)

	// 优雅关闭
	ctx, cancel := context.WithTimeout(context.Background(), config.DefaultShutdownTimeout)
	defer cancel()

	return a.Stop(ctx)
}
