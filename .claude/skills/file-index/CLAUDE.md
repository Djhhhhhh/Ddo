# file-index Skill 配置示例

## 启用方法

将以下内容添加到项目根目录的 `CLAUDE.md` 或 `.claude/CLAUDE.md` 中：

```yaml
skills:
  - file-index
```

## 手动调用

如果没有配置 skills，也可以直接运行脚本：

```bash
# 普通模式（修改文件）
bash .claude/skills/file-index/file-index.sh

# 预览模式（不修改文件）
DRY_RUN=true bash .claude/skills/file-index/file-index.sh

# 只更新 AGENTS.md，不生成索引
SKIP_INDEX=true bash .claude/skills/file-index/file-index.sh
```

## 输出文件

1. **各服务的 AGENTS.md** - 位于 `services/<name>/AGENTS.md`
2. **全局索引** - `SERVICES_INDEX.md`（项目根目录）

## 推荐工作流

### 新增服务时

1. 创建新服务目录：`mkdir services/new-service`
2. 运行 skill：`/file-index`
3. 编辑生成的 `services/new-service/AGENTS.md`，填充具体内容
4. 再次运行 skill 更新索引：`/file-index`

### 定期维护

建议定期运行 `/file-index` 确保：
- 所有 AGENTS.md 结构一致
- SERVICES_INDEX.md 保持最新
- 新添加的章节被正确纳入标准结构
