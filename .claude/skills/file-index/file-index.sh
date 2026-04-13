#!/usr/bin/env bash
set -euo pipefail

# ========================
# 配置
# ========================
DRY_RUN=${DRY_RUN:-false}
SKIP_INDEX=${SKIP_INDEX:-false}
TARGET_SERVICE=${TARGET_SERVICE:-""}  # 用于 scope check

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SERVICES_DIR="$PROJECT_ROOT/services"
INDEX_FILE="$PROJECT_ROOT/SERVICES_INDEX.md"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ========================
# 标准章节定义（顺序重要）
# ========================
declare -a STANDARD_SECTIONS=(
  "## 📌 作用"
  "## 📂 目录结构"
  "## 🧠 Rules 自维护"
  "## ✅ 开发检查清单"
  "## 🚫 禁止"
)

# 章节顺序权重（用于排序）
declare -A SECTION_ORDER=(
  ["## 📌 作用"]=1
  ["## 📂 目录结构"]=2
  ["## 🧠 Rules 自维护"]=3
  ["## ✅ 开发检查清单"]=4
  ["## 🚫 禁止"]=5
)

# Rules 文件位置
RULES_DIR=".claude/rules"
RULES_FILENAME="rules.md"

# ========================
# 工具函数
# ========================

# 获取章节基础名称（去除变体）
get_section_base() {
  local title="$1"
  case "$title" in
    "## 📌 作用"*|"## Purpose"*) echo "## 📌 作用" ;;
    "## 📂 目录结构"*|"## Directory"*|"## Structure"*) echo "## 📂 目录结构" ;;
    "## 🧠 Rules 自维护"*|"## Self-Maintain"*|"## Rules 维护"*) echo "## 🧠 Rules 自维护" ;;
    "## ✅ 开发检查清单"*|"## Checklist"*) echo "## ✅ 开发检查清单" ;;
    "## 🚫 禁止"*|"## Forbid"*|"## 🚫 Forbidden"*) echo "## 🚫 禁止" ;;
    "## 🕒 最后更新时间"*|"## Timestamp"*) echo "## 🕒 最后更新时间" ;;
    *) echo "$title" ;;
  esac
}

# 检查是否是标准章节
is_standard_section() {
  local title="$1"
  local base
  base=$(get_section_base "$title")
  [[ -n "${SECTION_ORDER[$base]:-}" ]]
}

# 从文件中提取所有章节标题
extract_section_titles() {
  local file="$1"
  if [ ! -f "$file" ]; then
    return
  fi
  grep "^## " "$file" 2>/dev/null | sed 's/^## //' || true
}

# 提取章节内容（包括标题）- 使用 line-by-line 读取避免编码问题
extract_section_content() {
  local file="$1"
  local section="$2"

  local found=0
  local content=""

  while IFS= read -r line || [[ -n "$line" ]]; do
    # 检查是否是目标章节标题（检查行开头是否匹配）
    if [[ "$found" -eq 0 ]] && [[ "$line" == "$section"* ]] && [[ "$line" =~ ^##[[:space:]] ]]; then
      found=1
      content="$line"
      continue
    fi

    # 如果已找到目标章节，检查是否到达下一个章节
    if [[ "$found" -eq 1 ]]; then
      if [[ "$line" =~ ^##[[:space:]] ]]; then
        break
      fi
      content="$content"$'\n'"$line"
    fi
  done < "$file"

  if [[ "$found" -eq 1 ]]; then
    printf '%s' "$content"
  fi
}

# 获取章节默认内容
default_section_content() {
  local section="$1"
  local service_name="$2"

  case "$section" in
    "## 📌 作用")
      cat <<EOF
一句话描述：[待填充：此服务的核心职责]

- 边界：只负责 xxx，不处理 xxx
- 调用关系：被 xxx 调用，调用 xxx
EOF
      ;;
    "## 📂 目录结构")
      cat <<EOF
\`\`\`
$service_name/
├── [待填充：列出主要目录，如 src/ handlers/]
└── AGENTS.md (本文件)
\`\`\`
EOF
      ;;
    "## ✅ 开发检查清单")
      cat <<EOF
提交前检查：
- [ ] 本次修改只在当前 service 目录内
- [ ] 新加文件已更新上面的目录结构
- [ ] 如涉及新架构/规范，已更新 .claude/rules/<service>.md
EOF
      ;;
    "## 🚫 禁止")
      cat <<EOF
硬性红线（违反会导致架构混乱）：
- ❌ 跨 service import（只能调 API，不能 import 包）
- ❌ 直接修改其他 service 的代码
- ❌ [待补充：具体的禁止行为，由开发过程中发现]
EOF
      ;;
    "## 🧠 Rules 自维护")
      cat <<'EOF'
**此章节指导 AI 如何自动维护本服务的规则。**

### Rules 文件位置
- 本服务规则：[.claude/rules/rules.md](.claude/rules/rules.md)

### 何时更新 Rules
开发完成后，如果满足以下条件之一，**必须**更新 Rules：
- 🆕 引入新的架构模式
- 📁 新增目录结构
- 📋 改变代码规范
- 🔁 出现重复实现（需要抽象规则）

### 如何更新 Rules
1. 打开 [.claude/rules/rules.md](.claude/rules/rules.md)
2. 在对应类别下追加新规则（不要覆盖）
3. 格式：`- 规则描述（发现日期：YYYY-MM-DD）`

> 💡 提示：每次开发完成后问自己："这次我学到了什么模式值得记录？"
EOF
      ;;
  esac
}

# 显示 diff 格式的变更预览
show_diff() {
  local old_file="$1"
  local new_file="$2"
  local label="$3"

  echo ""
  echo "=== 变更预览: $label ==="
  if command -v diff &>/dev/null; then
    diff -u "$old_file" "$new_file" 2>/dev/null || true
  else
    echo "新增/修改内容："
    cat "$new_file"
  fi
  echo "=== 结束预览 ==="
  echo ""
}

# ========================
# Section Patch 核心逻辑
# ========================

# 检测缺失的章节
detect_missing_sections() {
  local file="$1"
  local -n _missing=$2

  # 获取现有章节
  local -A existing
  local title
  while IFS= read -r title; do
    [ -z "$title" ] && continue
    local base
    base=$(get_section_base "## $title")
    existing["$base"]=1
  done < <(extract_section_titles "$file")

  # 找出缺失的标准章节
  _missing=()
  for std in "${STANDARD_SECTIONS[@]}"; do
    if [[ -z "${existing[$std]:-}" ]]; then
      _missing+=("$std")
    fi
  done
}

# Section Patch 模式：按顺序构建文件，保留现有内容，插入缺失章节
apply_section_patch() {
  local file="$1"
  local service_name="$2"

  # 检测缺失的章节
  local missing=()
  detect_missing_sections "$file" missing

  if [ ${#missing[@]} -eq 0 ]; then
    echo "  ✓ 所有标准章节已存在，无需修改" >&2
    return 0
  fi

  echo "  发现缺失章节: ${missing[*]}" >&2

  # 创建临时文件
  local tmp_file="${file}.tmp.$$"

  # 提取文件中的标题（用于保留自定义内容）
  local -A existing_sections
  local title
  while IFS= read -r title; do
    [ -z "$title" ] && continue
    local base
    base=$(get_section_base "## $title")
    existing_sections["$base"]=1
  done < <(extract_section_titles "$file")

  # 写入文件头（如果原文件有 # 开头的标题，保留它）
  if [ -f "$file" ]; then
    head -1 "$file" > "$tmp_file" 2>/dev/null || echo "# $service_name" > "$tmp_file"
  else
    echo "# $service_name" > "$tmp_file"
  fi

  echo "" >> "$tmp_file"

  # 按标准顺序处理每个章节
  for std_section in "${STANDARD_SECTIONS[@]}"; do
    if [[ -n "${existing_sections[$std_section]:-}" ]]; then
      # 章节存在，提取并保留原有内容
      extract_section_content "$file" "$std_section" >> "$tmp_file"
    else
      # 检查此章节是否在缺失列表中
      local should_add=false
      for m in "${missing[@]}"; do
        if [[ "$m" == "$std_section" ]]; then
          should_add=true
          break
        fi
      done

      if [[ "$should_add" == true ]]; then
        # 章节缺失，添加默认内容
        echo "$std_section" >> "$tmp_file"
        echo "" >> "$tmp_file"
        default_section_content "$std_section" "$service_name" >> "$tmp_file"
      fi
    fi
    echo "" >> "$tmp_file"
  done

  # 处理自定义章节（非标准章节）
  while IFS= read -r title; do
    [ -z "$title" ] && continue
    local full_title="## $title"
    local base
    base=$(get_section_base "$full_title")

    # 跳过已处理的标准章节和时间戳
    if is_standard_section "$full_title" || [[ "$base" == "## 🕒 最后更新时间" ]]; then
      continue
    fi

    # 保留自定义章节
    extract_section_content "$file" "$full_title" >> "$tmp_file"
    echo "" >> "$tmp_file"
  done < <(extract_section_titles "$file")

  # 添加新的时间戳
  echo "## 🕒 最后更新时间" >> "$tmp_file"
  echo "" >> "$tmp_file"
  echo "$TIMESTAMP" >> "$tmp_file"

  # 返回临时文件路径
  echo "$tmp_file"
}

# ========================
# Scope Check
# ========================

# 执行 scope check
perform_scope_check() {
  local target="${1:-}"

  echo "🔍 执行 Scope Check..."

  # 如果指定了目标服务，只处理该服务
  if [ -n "$target" ]; then
    if [ ! -d "$SERVICES_DIR/$target" ]; then
      echo "❌ Scope Check 失败: 服务 '$target' 不存在"
      return 1
    fi
    echo "  ✓ 限定处理范围: services/$target"
    return 0
  fi

  # 检查是否在服务目录内
  local cwd="$(pwd)"
  if [[ "$cwd" == "$SERVICES_DIR"/* ]]; then
    # 提取服务名
    local rel_path="${cwd#$SERVICES_DIR/}"
    local current_service="${rel_path%%/*}"
    TARGET_SERVICE="$current_service"
    echo "  ✓ 自动检测当前服务: $current_service"
    return 0
  fi

  # 在项目根目录，处理所有服务
  if [ "$cwd" = "$PROJECT_ROOT" ] || [ "$cwd" = "$PROJECT_ROOT/.claude" ]; then
    echo "  ✓ 在项目根目录，将处理所有服务"
    return 0
  fi

  echo "⚠️  警告: 无法确定处理范围"
  echo "   当前目录: $cwd"
  echo "   建议: cd 到 services/<name> 或项目根目录"
  return 1
}

# 获取要处理的服务列表
get_target_services() {
  if [ -n "$TARGET_SERVICE" ]; then
    echo "$SERVICES_DIR/$TARGET_SERVICE"
  else
    for d in "$SERVICES_DIR"/*/; do
      [ -d "$d" ] && echo "$d"
    done
  fi
}

# ========================
# Rules 文件生成
# ========================

generate_service_rules() {
  local service_dir="$1"
  local rules_file="$service_dir/$RULES_DIR/$RULES_FILENAME"

  if [ -f "$rules_file" ]; then
    return 0
  fi

  mkdir -p "$service_dir/$RULES_DIR"

  cat > "$rules_file" <<'EOF'
# Service Rules

> 由 AI 在开发过程中自动维护的规则文件。
> 发现时间：(自动生成)

## 架构规则

- [待填充：开发过程中发现的架构模式]

## 代码规范

- [待填充：开发过程中发现的代码规范]

## 常见陷阱

- [待填充：开发过程中遇到的问题及解决方法]

## 示例参考

- [待填充：好的代码示例，用于指导后续开发]
EOF

  echo "  ✓ 已创建 Rules 文件: $rules_file"
}

# ========================
# 索引生成
# ========================

extract_service_summary() {
  local agents_file="$1"

  if [ ! -f "$agents_file" ]; then
    echo "暂无描述"
    return
  fi

  # 提取作用章节的第一条边界描述
  awk '/^## 📌 作用/{found=1; next} /^## /{found=0} found{
    if ($0 ~ /^- / && $0 !~ /待填充/) {
      gsub(/^- /, "", $0)
      print $0
      exit
    }
  }' "$agents_file" 2>/dev/null || echo "暂无描述"
}

generate_services_index() {
  local index_content="# Services 索引\n\n"
  index_content="> 由 file-index skill 自动生成\n"
  index_content="> 更新时间：$TIMESTAMP\n\n"
  index_content+="本仓库采用多服务架构，各服务职责如下：\n\n"

  # 表格头部
  index_content+="| 服务 | 职责 | 文档 |\n"
  index_content+="|------|------|------|\n"

  # 收集服务信息
  local services_info=()
  for service_dir in "$SERVICES_DIR"/*/; do
    [ -d "$service_dir" ] || continue
    local service_name=$(basename "$service_dir")
    local agents_file="$service_dir/AGENTS.md"
    local summary=$(extract_service_summary "$agents_file")
    services_info+=("| $service_name | $summary | [services/$service_name/AGENTS.md](services/$service_name/AGENTS.md) |")
  done

  # 排序并添加
  IFS=$'\n' sorted=($(printf '%s\n' "${services_info[@]}" | sort))
  unset IFS
  for info in "${sorted[@]}"; do
    index_content+="$info\n"
  done

  index_content+="\n## 快速导航\n\n"
  for service_dir in "$SERVICES_DIR"/*/; do
    [ -d "$service_dir" ] || continue
    local service_name=$(basename "$service_dir")
    index_content+="- **$service_name**: [services/$service_name/](services/$service_name/)\n"
  done

  printf '%b' "$index_content"
}

# ========================
# 主逻辑
# ========================

echo "🚀 file-index v2 (Section Patch Mode)"
echo "========================================"
echo ""

# 解析参数
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --service)
      TARGET_SERVICE="$2"
      shift 2
      ;;
    --skip-index)
      SKIP_INDEX=true
      shift
      ;;
    *)
      echo "未知参数: $1"
      echo "用法: $0 [--dry-run] [--service <name>] [--skip-index]"
      exit 1
      ;;
  esac
done

echo "🔧 配置:"
echo "  DRY_RUN: $DRY_RUN"
echo "  TARGET_SERVICE: ${TARGET_SERVICE:-'(自动检测)'}"
echo "  SKIP_INDEX: $SKIP_INDEX"
echo ""

# Scope Check
if ! perform_scope_check "$TARGET_SERVICE"; then
  exit 1
fi

echo ""

# 计数器
processed=0
modified=0
skipped=0

# 处理每个服务
while IFS= read -r service_dir; do
  [ -d "$service_dir" ] || continue

  service_name=$(basename "$service_dir")
  agents_file="$service_dir/AGENTS.md"

  echo "📦 处理服务: $service_name"
  processed=$((processed + 1))

  # 如果文件不存在，创建基础版本
  if [ ! -f "$agents_file" ]; then
    echo "  创建新文件: $agents_file"
    cat > "$agents_file" <<EOF
# $service_name

EOF
  fi

  # 应用 section patch
  tmp_file=$(apply_section_patch "$agents_file" "$service_name")

  if [ -z "$tmp_file" ] || [ "$tmp_file" = "0" ]; then
    skipped=$((skipped + 1))
    continue
  fi

  # Dry-run: 显示 diff 但不修改
  if [ "$DRY_RUN" = true ]; then
    show_diff "$agents_file" "$tmp_file" "$agents_file"
    rm -f "$tmp_file"
    modified=$((modified + 1))
  else
    # 实际修改
    mv "$tmp_file" "$agents_file"
    echo "  ✓ 已更新: $agents_file"
    modified=$((modified + 1))

    # 确保 Rules 文件存在
    generate_service_rules "$service_dir" "$service_name"
  fi

done < <(get_target_services)

echo ""
echo "📊 处理统计:"
echo "  服务总数: $processed"
echo "  需要修改: $modified"
echo "  已跳过: $skipped"

# 生成索引
if [ "$SKIP_INDEX" != true ] && [ "$DRY_RUN" != true ]; then
  echo ""
  echo "📑 生成全局索引..."
  index_content=$(generate_services_index)
  echo "$index_content" > "$INDEX_FILE"
  echo "  ✓ 已更新: $INDEX_FILE"
fi

echo ""
echo "🎉 完成"
