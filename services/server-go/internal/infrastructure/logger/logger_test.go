package logger

import (
	"os"
	"strings"
	"testing"

	"go.uber.org/zap/zapcore"
)

func TestParseLevel(t *testing.T) {
	tests := []struct {
		input    string
		expected zapcore.Level
	}{
		{"debug", zapcore.DebugLevel},
		{"info", zapcore.InfoLevel},
		{"warn", zapcore.WarnLevel},
		{"error", zapcore.ErrorLevel},
		{"fatal", zapcore.FatalLevel},
		{"", zapcore.InfoLevel},      // 默认
		{"unknown", zapcore.InfoLevel}, // 未知
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := parseLevel(tt.input)
			if result != tt.expected {
				t.Errorf("parseLevel(%q) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestNewZapLogger(t *testing.T) {
	tests := []struct {
		name   string
		level  string
		format string
		output string
	}{
		{"json info stdout", "info", "json", "stdout"},
		{"console debug stdout", "debug", "console", "stdout"},
		{"json warn stdout", "warn", "json", "stdout"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger, err := NewZapLogger(tt.level, tt.format, tt.output)
			if err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
			if logger == nil {
				t.Fatal("expected logger to not be nil")
			}

			// 测试日志记录
			logger.Info("test message")

			// 清理
			logger.Sync()
		})
	}
}

func TestNewZapLogger_ConsoleOutput(t *testing.T) {
	logger, err := NewZapLogger("info", "console", "stdout")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Console 格式应该输出可读格式
	if logger == nil {
		t.Fatal("expected logger to not be nil")
	}

	logger.Info("console format test")
	logger.Sync()
}

func TestNewZapLogger_FileOutput(t *testing.T) {
	// 创建临时文件
	tmpFile, err := os.CreateTemp("", "test-log-*.log")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	logger, err := NewZapLogger("info", "json", tmpFile.Name())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// 写入日志
	testMessage := "file output test message"
	logger.Info(testMessage)
	logger.Sync()

	// 读取文件内容
	content, err := os.ReadFile(tmpFile.Name())
	if err != nil {
		t.Fatalf("failed to read log file: %v", err)
	}

	// 验证内容包含消息
	if !strings.Contains(string(content), testMessage) {
		t.Error("expected log file to contain test message")
	}
}

func TestNewZapLogger_InvalidFile(t *testing.T) {
	// 尝试写入无效路径
	logger, err := NewZapLogger("info", "json", "/invalid/path/to/file.log")
	if err == nil {
		t.Error("expected error for invalid file path")
		if logger != nil {
			logger.Sync()
		}
	}
}

func TestNewZapLogger_JSONFormat(t *testing.T) {
	logger, err := NewZapLogger("debug", "json", "stdout")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// 记录不同级别的日志
	logger.Debug("debug message")
	logger.Info("info message")
	logger.Warn("warn message")
	logger.Error("error message")

	logger.Sync()
}
