---
name: file-index
description: |
  维护 services 目录下所有 AGENTS.md 的结构，并生成全局服务索引。

  **Section Patch 模式（v2）：**
  - 只修改缺失的章节，禁止整文件重写
  - 必须执行 scope check（默认当前服务）
  - 使用 unified diff 格式预览变更
  - 最小化 diff，保留所有现有内容

  使用场景：
  - 新增 service 后初始化 AGENTS.md
  - 规范 agent 文档结构
  - 修复缺失的标准章节
  - 更新全局服务索引 (SERVICES_INDEX.md)
  - 准备仓库用于 Agent 自动开发

  功能：
  - 检查并创建 AGENTS.md
  - Section Patch 模式：只补全缺失的章节
  - 保留自定义章节（如 结构 / 依赖 等）
  - 统一标准章节顺序
  - 生成/更新根目录 SERVICES_INDEX.md
  - 自动更新时间戳
  - Scope Check：防止跨服务修改
  - Dry-run 预览：unified diff 格式

  标准章节顺序：
  1. 📌 作用（Purpose）- 核心职责
  2. 📂 目录结构（Directory）- 快速导航
  3. 🧠 Rules 自维护（Self-Maintain）- 规则更新指南
  4. ✅ 开发检查清单（Checklist）- 提交前检查
  5. 🚫 禁止（Forbid）- 硬性红线
  6. 🕒 最后更新时间（Timestamp）

  使用方法：
  /file-index                       # 更新当前/所有服务
  /file-index --dry-run             # 仅预览变更（unified diff）
  /file-index --service <name>      # 指定服务范围
  /file-index --dry-run --service cli  # 预览指定服务的变更
---

## 脚本说明

主脚本：`file-index.sh`

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DRY_RUN` | 预览模式，不实际修改文件 | `false` |
| `SKIP_INDEX` | 跳过生成 SERVICES_INDEX.md | `false` |

### 工作原理

1. 扫描 `services/` 目录下的所有子目录
2. 对每个服务：
   - 提取现有 AGENTS.md 的所有章节内容
   - 按照标准顺序重建文档
   - 保留不在标准列表中的自定义章节
3. 生成/更新根目录的 `SERVICES_INDEX.md`，提供全局服务导航
4. 读取生成的每个AGENTS.md，理解实际仓库情况，补充对应的[待填充]项。