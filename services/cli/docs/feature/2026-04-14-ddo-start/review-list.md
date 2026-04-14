# CLI: ddo start 实现 - 功能测试清单

## 测试环境准备

1. 确保已运行 `ddo init` 完成初始化
2. Mock 服务文件已创建：`tests/mock-server.js`

## 功能验证步骤

### 1. 编译检查 ✓
```bash
cd services/cli
npm run build
```
**预期**: 无编译错误

---

### 2. 帮助信息验证
```bash
cd services/cli
dev start --help
```
**预期输出**:
```
Usage: ddo start [options]

启动所有 Ddo 服务

Options:
  -d, --data-dir <path>  指定数据目录路径
  --skip-repl            启动后不进入 REPL 模式
  -v, --verbose          显示详细日志
  --silent               静默模式
```

---

### 3. 命令可用性测试

#### 3.1 ddo status（无服务运行）
```bash
dev status
```
**预期输出**:
```
MySQL: 运行状态
后端服务: 全部显示为"已停止"
PID 文件: 无文件或显示文件不存在
```

#### 3.2 ddo stop（无服务运行）
```bash
dev stop
```
**预期**: 正常完成，不报错

---

### 4. MANUAL: PID 文件功能测试

**测试步骤**:

1. 手动启动测试服务（模拟 server-go）：
```bash
cd services/cli
cd tests
node mock-server server-go 8080 > /tmp/server-go.log 2>&1 &
# 记录 PID
echo $! > ~/.ddo/services/server-go.pid
```

2. 终止进程，观察 status：
```bash
cd services/cli
dev status
```
**预期**: 显示服务已停止，或显示进程不存在

3. 清理：
```bash
rm -f ~/.ddo/services/server-go.pid
kill <PID> 2>/dev/null || true
```

---

### 5. MANUAL: 进程管理测试（跨平台）

**Windows 测试**:
```powershell
# 1. 启动测试进程
Start-Process node -ArgumentList "tests/mock-server.js server-go 8080" -PassThru | Select-Object -ExpandProperty Id

# 2. 记录 PID 到文件
echo 12345 > $env:USERPROFILE/.ddo/services/server-go.pid

# 3. 验证 status
dev status

# 4. 停止服务
dev stop
```

**macOS/Linux 测试**:
```bash
# 1. 启动测试进程
node tests/mock-server.js server-go 8080 &
echo $! > ~/.ddo/services/server-go.pid

# 2. 验证对以下命令的响应
kill -0 <PID>       # 检查进程存在
kill <PID>          # 发送 SIGTERM
dev stop            # 测试 stop 命令
```

---

### 6. MANUAL: 健康检查测试

```bash
# 1. 启动测试服务
node tests/mock-server.js test-port 9999 &
PID=$!

# 2. curl 测试健康检查端点
curl -s http://localhost:9999/health
# 预期: {"status":"healthy","service":"test-port","pid":xxx}

# 3. 停止服务验证超时
kill $PID
curl -s --max-time 2 http://localhost:9999/health || echo "超时/失败（预期行为）"
```

---

### 7. MANUAL: ddo start 流程测试

由于实际服务尚未实现，无法完整测试 start 命令。
但可验证错误处理：

```bash
dev start
```
**预期行为**:
1. 检查 MySQL 运行（如未运行提示错误）
2. 尝试启动 server-go（会因找不到目录失败）
3. 显示错误信息并退出（状态码 1）

---

### 8. MANUAL: 选项测试

```bash
# 数据目录选项
dev status -d /tmp/test-ddo
dev stop -d /tmp/test-ddo

# 详细日志
dev status -v

# 静默模式
dev stop --silent
```

**预期**: 选项生效，无异常

---

### 9. 已知限制（需要其他服务完成后才能验证）

| 功能 | 状态 | 说明 |
|------|------|------|
| 完整 start 流程 | BLOCKED | 需要 server-go、llm-py、web-ui 实现 |
| 服务启动顺序 | BLOCKED | 依赖其他服务存在 |
| REPL 交互 | PARTIAL | 可进入，但无法执行实质操作 |
| stop 回滚 | BLOCKED | 需要服务启动成功后再测试失败场景 |
| Web Dashboard 打开 | BLOCKED | 需要 web-ui 服务实现 |

---

## 测试结论

**当前可验证项**:
- ✓ 编译通过
- ✓ 命令注册正确
- ✓ PID 文件读写功能
- ✓ 进程存在性检查
- ✓ 帮助信息完整
- ✓ 选项解析正确

**待其他服务完成后验证**:
- start 完整启动流程
- 服务启动顺序控制
- 服务启动失败回滚
- REPL 完整交互
- 跨服务 API 调用

---

## 记录

- 创建日期: 2026-04-14
- 测试状态: 部分完成
- 阻塞项: server-go、llm-py、web-ui 服务未实现
