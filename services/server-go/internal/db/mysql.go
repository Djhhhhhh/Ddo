package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/ddo/server-go/internal/infrastructure/config"
)

const (
	defaultMaxOpenConns    = 100
	defaultMaxIdleConns    = 10
	defaultConnMaxLifetime = time.Hour
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

	// 配置 GORM 日志
	logLevel := logger.Silent
	if cfg.Server.Mode == "debug" {
		logLevel = logger.Info
	}

	// 打开连接
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, nil, fmt.Errorf("open mysql connection failed: %w", err)
	}

	// 配置连接池
	sqlDB, err := db.DB()
	if err != nil {
		return nil, nil, fmt.Errorf("get sql.DB from gorm failed: %w", err)
	}

	sqlDB.SetMaxOpenConns(defaultMaxOpenConns)
	sqlDB.SetMaxIdleConns(defaultMaxIdleConns)
	sqlDB.SetConnMaxLifetime(defaultConnMaxLifetime)

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

// buildDSN 构建 MySQL DSN
func buildDSN(cfg *config.DatabaseConfig) string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=%s&parseTime=True&loc=Local",
		cfg.User,
		cfg.Password,
		cfg.Host,
		cfg.Port,
		cfg.DBName,
		cfg.Charset,
	)
}

// GetMySQLStatus 获取 MySQL 连接状态
func (m *MySQLConn) GetMySQLStatus() (map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	stats := m.sqlDB.Stats()

	status := map[string]interface{}{
		"connected":    true,
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
