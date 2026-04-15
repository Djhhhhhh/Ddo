# server-go Makefile
# 提供常用的构建、测试、运行命令

# 变量定义
BINARY_NAME=server
BUILD_DIR=./build
CMD_DIR=./cmd/server
VERSION=$(shell git describe --tags --always --dirty 2>/dev/null || echo "v1.0.0")
GIT_COMMIT=$(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_TIME=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "unknown")
LDFLAGS=-ldflags "-X main.appVersion=$(VERSION) -X main.gitCommit=$(GIT_COMMIT) -X main.buildTime=$(BUILD_TIME)"

# 默认目标
.DEFAULT_GOAL := help

.PHONY: help
help: ## 显示帮助信息
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

.PHONY: build
build: ## 构建可执行文件
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) $(CMD_DIR)
	@echo "Build complete: $(BUILD_DIR)/$(BINARY_NAME)"

.PHONY: run
run: ## 运行服务（带配置文件）
	@echo "Running $(BINARY_NAME)..."
	go run $(LDFLAGS) $(CMD_DIR) -c ./configs/config.yaml

.PHONY: run-dev
run-dev: ## 以开发模式运行服务
	@echo "Running $(BINARY_NAME) in dev mode..."
	MODE=debug go run $(LDFLAGS) $(CMD_DIR) -c ./configs/config.yaml

.PHONY: clean
clean: ## 清理构建产物
	@echo "Cleaning..."
	@rm -rf $(BUILD_DIR)
	@echo "Clean complete"

.PHONY: test
test: ## 运行测试
	@echo "Running tests..."
	go test -v -race ./...

.PHONY: test-coverage
test-coverage: ## 运行测试并生成覆盖率报告
	@echo "Running tests with coverage..."
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

.PHONY: lint
lint: ## 运行代码检查
	@echo "Running linter..."
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run ./...; \
	else \
		echo "golangci-lint not installed, running go vet..."; \
		go vet ./...; \
	fi

.PHONY: fmt
fmt: ## 格式化代码
	@echo "Formatting code..."
	go fmt ./...

.PHONY: tidy
tidy: ## 整理依赖
	@echo "Tidying dependencies..."
	go mod tidy

.PHONY: deps
deps: ## 下载依赖
	@echo "Downloading dependencies..."
	go mod download

.PHONY: wire
wire: ## 生成依赖注入代码
	@echo "Generating wire..."
	@if command -v wire >/dev/null 2>&1; then \
		wire ./...; \
	else \
		echo "Installing wire..."; \
		go install github.com/google/wire/cmd/wire@latest; \
		wire ./...; \
	fi

.PHONY: check
check: fmt lint test ## 运行完整检查（格式化+检查+测试）

.PHONY: docker-build
docker-build: ## 构建 Docker 镜像
	@echo "Building Docker image..."
	docker build -t server-go:$(VERSION) .

.PHONY: docker-run
docker-run: ## 运行 Docker 容器
	@echo "Running Docker container..."
	docker run -p 8080:8080 -v $(PWD)/configs:/app/configs server-go:$(VERSION)

.PHONY: version
version: ## 显示版本信息
	@go run $(LDFLAGS) $(CMD_DIR) -v
