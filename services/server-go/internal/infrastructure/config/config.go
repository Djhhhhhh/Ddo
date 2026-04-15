package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// DefaultShutdownTimeout 默认优雅关闭超时时间
const DefaultShutdownTimeout = 10 * time.Second

// Config 配置结构
type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Log      LogConfig      `mapstructure:"log"`
}

// ServerConfig 服务配置
type ServerConfig struct {
	Host string `mapstructure:"host"`
	Port int    `mapstructure:"port"`
	Mode string `mapstructure:"mode"`
}

// DatabaseConfig 数据库配置（预留，用于 MySQL 连接）
type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	DBName   string `mapstructure:"dbname"`
	Charset  string `mapstructure:"charset"`
}

// LogConfig 日志配置
type LogConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
	Output string `mapstructure:"output"`
}

// ServerAddr 获取服务监听地址
func (c *Config) ServerAddr() string {
	return fmt.Sprintf("%s:%d", c.Server.Host, c.Server.Port)
}

// Loader 配置加载器接口
type Loader interface {
	Load(path string) (*Config, error)
}

// ViperLoader 基于 Viper 的配置加载器
type ViperLoader struct {}

// NewViperLoader 创建 Viper 配置加载器
func NewViperLoader() *ViperLoader {
	return &ViperLoader{}
}

// Load 加载配置
func (l *ViperLoader) Load(path string) (*Config, error) {
	v := viper.New()

	// 设置默认值
	l.setDefaults(v)

	// 配置文件路径
	if path != "" {
		v.SetConfigFile(path)
	} else {
		v.SetConfigName("config")
		v.SetConfigType("yaml")
		v.AddConfigPath("./configs")
		v.AddConfigPath(".")
		v.AddConfigPath("$HOME/.ddo/server-go")
	}

	// 环境变量支持
	v.SetEnvPrefix("DDO")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// 读取配置文件
	if err := v.ReadInConfig(); err != nil {
		// 配置文件不存在时，使用默认值
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("read config failed: %w", err)
		}
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config failed: %w", err)
	}

	return &cfg, nil
}

// setDefaults 设置默认值
func (l *ViperLoader) setDefaults(v *viper.Viper) {
	// 服务器默认配置
	v.SetDefault("server.host", "127.0.0.1")
	v.SetDefault("server.port", 8080)
	v.SetDefault("server.mode", "release")

	// 数据库默认配置
	v.SetDefault("database.host", "127.0.0.1")
	v.SetDefault("database.port", 3306)
	v.SetDefault("database.user", "root")
	v.SetDefault("database.password", "")
	v.SetDefault("database.dbname", "ddo")
	v.SetDefault("database.charset", "utf8mb4")

	// 日志默认配置
	v.SetDefault("log.level", "info")
	v.SetDefault("log.format", "json")
	v.SetDefault("log.output", "stdout")
}
