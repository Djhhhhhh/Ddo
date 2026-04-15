package main

import (
	"flag"
	"fmt"
	"os"
)

var (
	// 命令行参数
	configPath = flag.String("c", "", "配置文件路径 (默认: ./configs/config.yaml)")
	version    = flag.Bool("v", false, "显示版本信息")

	// 应用版本号（通过 ldflags 注入）
	appVersion = "v1.0.0"
	gitCommit  = "unknown"
	buildTime  = "unknown"
)

func main() {
	flag.Parse()

	// 显示版本信息
	if *version {
		fmt.Printf("server-go %s (commit: %s, built: %s)\n", appVersion, gitCommit, buildTime)
		os.Exit(0)
	}

	// 初始化应用
	app, cleanup, err := InitializeApp(*configPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize application: %v\n", err)
		os.Exit(1)
	}
	defer cleanup()

	// 运行应用（阻塞直到收到关闭信号）
	if err := app.Run(); err != nil {
		// 尝试获取 logger 记录错误
		// 注意：此时 app 可能未完全初始化，无法保证 logger 可用
		fmt.Fprintf(os.Stderr, "Application error: %v\n", err)
		os.Exit(1)
	}
}

// Version 获取应用版本
func Version() string {
	return appVersion
}
