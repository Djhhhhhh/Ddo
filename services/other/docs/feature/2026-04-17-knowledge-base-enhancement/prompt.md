# 任务：编写知识库增强功能的技术方案

## 背景
现有系统包含三个服务：CLI、server-go、llm-py。需要在 `/kb-add` 命令中增强知识添加逻辑，支持来源追踪、智能分类和标签。

## 需求详情

### 1. source 字段
- CLI 端自动装配，根据实际来源传参
- 存储对应端的关键字即可（例如来自 CLI 就传 `"cli"`）
- 不需要记录更详细的信息

### 2. tags 字段
- 通过 AI 分析判断生成
- **调用链路必须严格为**：`CLI → server-go → llm-py`
- CLI 不能直接调用 llm-py

### 3. category 字段
- 数据库单独维护一个 `category` 表
- 一个知识可以同时属于多个 category（多对多关系）
- AI 分析内容，判断应该属于哪些 category
- 如果 AI 发现新的 category（数据库中不存在），则自动创建该 category 后再关联
- 每个知识至少有一个 category，若 AI 无法分辨则归类为 **“待分类”**
- 表字段设计不要太复杂，以完成本次任务为首要目标

### 4. tags 与 category 的关系（已决策）
- **同时保留 tags 和 category**，职责重新定义如下：
  - Category（分类）：宏观组织，用于“按领域浏览”，有限、可枚举，一个知识可属 1~3 个分类
  - Tags（标签）：微观描述，用于“精确检索”，无限、可扩展，一个知识可有多个标签
- AI 分析时，独立生成 tags 和 category，优先级：先判断 category，再提取 tags

### 5. 涉及服务及修改范围
- `services/cli`：修改 `/kb-add` 命令，自动添加 source 字段，调用 server-go API
- `services/server-go`：
  - 新增 category 表及多对多关联表
  - 修改 knowledge 创建接口，接收 source、content 等
  - 调用 llm-py 分析 tags 和 category
  - 处理 category 的自动创建和关联
  - 保存知识
- `services/llm-py`：
  - 新增 NLP 接口，输入知识内容，输出推荐的 tags 列表和 category 列表（每个 category 包含名称，可能是新的）

## 输出要求
- 技术方案文档写入：`services/other/docs/feature/2026-04-17-knowledge-base-enhancement/技术方案.md`
- 方案内容应包含：
  1. 背景与目标
  2. 整体架构（含服务调用时序图）
  3. 数据库设计（表结构、字段说明）
  4. API 设计（各服务之间的接口定义）
  5. 各服务详细修改点（文件路径、函数/方法、伪代码或改动说明）
  6. AI 分析逻辑说明（llm-py 的提示词设计）
  7. 错误处理与边界情况（如 AI 不可用、category 创建冲突等）
  8. 测试要点
- 要求：**保证三个服务修改后的一致性**，不要出现无法联调的情况

## 注意事项
- 不要自行增加超出上述需求的范围
- 如果有不确定的细节，请先提问确认
- 技术方案应清晰、可落地，代码改动部分可以用伪代码或关键逻辑描述

请开始编写技术方案。