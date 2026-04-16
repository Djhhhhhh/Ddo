# 变更日志

**提交信息**: fix(server): 修复 BadgerDB 在 Windows 上创建 .ddo 目录到错误位置
**分支**: main
**日期**: 2026-04-16
**作者**: Djhhh

## 变更文件
- wire_gen.go (modified)
- badger_queue.go (modified)
- ddo/DISCARD (deleted)
- ddo/KEYREGISTRY (deleted)
- ddo/MANIFEST (deleted)

## 统计
- 新增文件: 0
- 修改文件: 2
- 删除文件: 3
- 代码行数: +16 / -4

## 描述
修复 Windows 上 os.Getenv("HOME") 返回空值导致 BadgerDB 数据目录创建在项目目录的问题，改用 os.UserHomeDir() 跨平台获取用户主目录。
