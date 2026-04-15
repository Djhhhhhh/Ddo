package server

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/ddo/server-go/internal/infrastructure/config"
)

// GinServer Gin HTTP 服务器
type GinServer struct {
	engine *gin.Engine
	config *config.Config
	logger *zap.Logger
	server *http.Server
}

// NewGinServer 创建 Gin 服务器
func NewGinServer(cfg *config.Config, logger *zap.Logger, engine *gin.Engine) *GinServer {
	return &GinServer{
		engine: engine,
		config: cfg,
		logger: logger,
	}
}

// Start 启动服务器
func (s *GinServer) Start() error {
	addr := s.config.ServerAddr()

	s.server = &http.Server{
		Addr:    addr,
		Handler: s.engine,
	}

	s.logger.Info("Starting HTTP server",
		zap.String("addr", addr),
		zap.String("mode", s.config.Server.Mode),
	)

	// 在 goroutine 中启动服务
	go func() {
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.logger.Error("HTTP server error", zap.Error(err))
		}
	}()

	return nil
}

// Stop 停止服务器（优雅关闭）
func (s *GinServer) Stop() error {
	if s.server == nil {
		return nil
	}

	s.logger.Info("Stopping HTTP server...")

	// 创建带超时的 Context
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := s.server.Shutdown(ctx); err != nil {
		return fmt.Errorf("server shutdown failed: %w", err)
	}

	s.logger.Info("HTTP server stopped")
	return nil
}

// Engine 获取 gin.Engine
func (s *GinServer) Engine() *gin.Engine {
	return s.engine
}

// Server HTTP 服务器实例
func (s *GinServer) Server() *http.Server {
	return s.server
}
