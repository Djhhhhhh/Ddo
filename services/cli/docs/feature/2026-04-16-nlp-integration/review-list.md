# NLP 集成 - 功能测试清单

> 创建时间：2026-04-16
> 任务：p2-4: CLI: NLP 集成
> 状态：已完成编码

## 测试环境准备

1. 确保 llm-py 服务运行在 `http://localhost:8000`
2. 确保 server-go 服务运行在 `http://localhost:8080`
3. 确保 MySQL 容器正常运行

## 单元测试

### NLP Service 单元测试

- [ ] `analyzeText()` 正确调用 `/api/nlp` 接口
- [ ] `analyzeText()` 正确解析响应（intent, confidence, entities, parameters, reply）
- [ ] `parseCommand()` 正确调用 `/api/nlp/parse` 接口
- [ ] `parseCommand()` 正确解析响应（command, arguments, is_ambiguous, suggestions）
- [ ] 超时处理：请求超过 10 秒返回 NLPServiceError
- [ ] 网络错误处理：服务不可用时抛出 NLPServiceError
- [ ] `isAvailable()` 正确检测服务可用性

### 意图路由器单元测试

- [ ] `route()` 正确处理 timer.create intent -> switch_mode (Timer)
- [ ] `route()` 正确处理 timer.list intent -> switch_mode (Timer)
- [ ] `route()` 正确处理 kb.search intent -> switch_mode (Kb)
- [ ] `route()` 正确处理 kb.add intent -> switch_mode (Kb)
- [ ] `route()` 正确处理 mcp.list intent -> switch_mode (Mcp)
- [ ] `route()` 正确处理 chat intent -> chat 模式
- [ ] `route()` 正确处理 status intent -> show_status
- [ ] `route()` 正确处理 help intent -> show_help
- [ ] `route()` 正确处理未知 intent -> unknown（降级到 chat）
- [ ] `extractParameters()` 正确提取 entities 中的参数

### 命令注册中心测试

- [ ] `handleUnknownCommand()` 在默认模式下调用 NLP Service
- [ ] `handleUnknownCommand()` 正确处理 NLP 路由结果
- [ ] NLP 服务不可用时正确降级到 chat 模式

## 集成测试

### REPL 自然语言模式测试

1. **意图识别测试**：
   - [ ] 输入「创建一个每小时的定时任务」-> 识别为 timer.create，切换到 Timer 模式
   - [ ] 输入「帮我查一下知识库」-> 识别为 kb.search，切换到 Kb 模式
   - [ ] 输入「显示当前状态」-> 识别为 status，执行 status 命令
   - [ ] 输入「打开帮助」-> 识别为 help，显示帮助信息
   - [ ] 输入「我想聊聊天」-> 识别为 chat，进入 Chat 模式

2. **降级测试**：
   - [ ] llm-py 服务不可用时，输入任意文本自动进入 chat 模式
   - [ ] 网络超时（>10s）时自动降级到 chat 模式
   - [ ] 返回错误时自动降级到 chat 模式，显示友好错误信息

3. **模式切换测试**：
   - [ ] 进入 Timer 模式后显示正确的提示符 `ddo/timer>`
   - [ ] 进入 Kb 模式后显示正确的提示符 `ddo/kb>`
   - [ ] 进入 Chat 模式后显示正确的提示符 `ddo/chat>`
   - [ ] 输入 /back 返回默认模式

4. **命令执行测试**：
   - [ ] 识别为 status intent 时正确执行 /status 命令
   - [ ] 识别为 help intent 时正确执行 /help 命令

## 端到端测试

### 完整流程测试

1. **启动并进入 REPL**：
   - [ ] `ddo start` 成功启动所有服务并进入 REPL
   - [ ] REPL 显示欢迎信息和可用命令列表

2. **自然语言交互**：
   - [ ] 在默认模式下输入自然语言，系统调用 NLP 分析意图
   - [ ] 根据意图自动切换到对应模式或执行命令
   - [ ] 显示意图识别结果（intent 和 confidence）

3. **多轮对话测试**：
   - [ ] 在默认模式下多次输入自然语言，每次都能正确识别
   - [ ] 在 Chat 模式下输入文本，不触发 NLP（直接转发到 chat）

## 性能测试

- [ ] NLP 请求响应时间 < 3 秒
- [ ] REPL 命令响应时间不受 NLP 调用影响（异步处理）

## 验收标准

- [ ] TypeScript 编译通过，无错误
- [ ] 所有单元测试通过
- [ ] REPL 能够正确调用 llm-py NLP 接口
- [ ] 意图路由器能够正确路由所有支持的 intent 类型
- [ ] NLP 服务不可用时能够正确降级到 chat 模式
- [ ] AGENTS.md 和 rules.md 已更新

## 相关文件

- NLP Service: `services/cli/src/services/nlp.ts`
- 意图路由器: `services/cli/src/repl/intent-router.ts`
- 命令注册中心: `services/cli/src/repl/commands/index.ts`
- 技术方案: `services/cli/docs/feature/2026-04-16-nlp-integration/技术方案.md`