package db

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/ddo/server-go/internal/infrastructure/config"
)

const (
	defaultMaxOpenConns = 1
	defaultMaxIdleConns = 1
)

// MySQLConn MySQL 连接
type MySQLConn struct {
	db *gorm.DB
	// sqlDB 用于执行 Ping 等原生操作
	sqlDB *sql.DB
}

// NewMySQLConn 创建 MySQL 连接
// 从配置中读取 DSN，初始化 GORM 连接池
func NewMySQLConn(cfg *config.Config) (*MySQLConn, func(), error) {
	dsn := buildDSN(&cfg.Database)
	if err := os.MkdirAll(filepath.Dir(dsn), 0o755); err != nil {
		return nil, nil, err
	}

	// 配置 GORM 日志
	logLevel := logger.Silent
	if cfg.Server.Mode == "debug" {
		logLevel = logger.Info
	}

	// 打开连接
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, nil, err
	}

	// 配置连接池
	sqlDB, err := db.DB()
	if err != nil {
		return nil, nil, err
	}

	sqlDB.SetMaxOpenConns(defaultMaxOpenConns)
	sqlDB.SetMaxIdleConns(defaultMaxIdleConns)
	sqlDB.SetConnMaxLifetime(0)

	if err := sqlDB.Ping(); err != nil {
		_ = sqlDB.Close()
		return nil, nil, err
	}

	if err := db.Exec("PRAGMA journal_mode=WAL;").Error; err != nil {
		_ = sqlDB.Close()
		return nil, nil, err
	}

	if err := db.Exec("PRAGMA busy_timeout=5000;").Error; err != nil {
		_ = sqlDB.Close()
		return nil, nil, err
	}

	conn := &MySQLConn{
		db:    db,
		sqlDB: sqlDB,
	}

	cleanup := func() {
		_ = conn.Close()
	}

	return conn, cleanup, nil
}

// DB 获取 GORM DB 实例
func (m *MySQLConn) DB() *gorm.DB {
	return m.db
}

// Ping 检查数据库连接
func (m *MySQLConn) Ping(ctx context.Context) error {
	return m.sqlDB.PingContext(ctx)
}

// Close 关闭数据库连接
func (m *MySQLConn) Close() error {
	sqlDB, err := m.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// AutoMigrate 自动迁移表结构
func (m *MySQLConn) AutoMigrate(models ...interface{}) error {
	return m.db.AutoMigrate(models...)
}

// buildDSN 构建 SQLite DSN
// 支持展开 ~ 为用户主目录
func buildDSN(cfg *config.DatabaseConfig) string {
	path := cfg.Path
	if path == "" {
		path = config.DefaultSQLitePath()
	}

	// 展开 ~ 为用户主目录
	if strings.HasPrefix(path, "~/") || strings.HasPrefix(path, "~\\") {
		if homeDir, err := os.UserHomeDir(); err == nil {
			path = filepath.Join(homeDir, path[2:])
		}
	}

	return path
}

// GetMySQLStatus 获取 MySQL 连接状态
func (m *MySQLConn) GetMySQLStatus() (map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	stats := m.sqlDB.Stats()

	status := map[string]interface{}{
		"connected":    true,
		"driver":       "sqlite",
		"open_conns":   stats.OpenConnections,
		"idle_conns":   stats.Idle,
		"in_use":       stats.InUse,
		"wait_count":   stats.WaitCount,
	}

	// 尝试 Ping
	if err := m.Ping(ctx); err != nil {
		status["connected"] = false
		status["error"] = err.Error()
	}

	return status, nil
}
