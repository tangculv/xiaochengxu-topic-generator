---
title: 小程序工厂
status: active
created: 2026-03-03
---

# 小程序工厂

**所属周期**：[[_this_week]] | **状态**：战略转向

## 背景

**原始定位**：小程序批量生产和运营项目

**优化定位**：AI健康饮食平台（基于Naval财富思维评估的战略升级）

**核心转变**：
- 从"多个小程序独立运营" → "一个平台服务所有人"
- 从"月入1215元" → "月入100万+"（1600倍放大）
- 从"产品（弱资产）" → "平台（强资产：数据+AI模型+品牌）"
- 从"低杠杆（微信生态）" → "高杠杆（Web+B2B+API服务）"

## 关键人物

- **先通**（老同事）— 技术合作方，负责解决分享和支付接入的技术难题
- **健帮**（老同学，做营销工作）— 聊小程序推广的大概思路

## 本周目标

1. 敲定先通合作，明确技术分工
2. 和健帮对齐推广方向

## 技术难点

- 小程序分享机制
- 支付接入

## 项目文档

### 选型与规划
- [[naval-优化方案.md]] — Naval财富思维评估结果（**战略转向**）
- [[auto-topic-system.md]] — 自动选题与评估体系设计（**核心系统**）
- [[选题标准.md]] — 选题评估8大标准及评分表（**核心参考**）
- [[小程序推广SOP.md]] — 推广流程和落地标准
- [[2025中国数字社会小程序机遇研究报告.md]] — 选题研究报告

### Project 文件夹
存放具体的小程序项目，每个项目包含完整的PRD、原型和技术方案。

**当前项目**：
- [[智能食谱小程序]] — AI个性化食谱推荐小程序（MVP阶段）

## 关键决策记录

（随项目推进积累）


## 选题生成器（MVP）

基于 [[03 Projects/小程序工厂/选题库/PRD-选题生成器.md]]，仓库现已提供一个可直接使用的本地 CLI 版本：

- 脚本：`scripts/topic_generator.py`
- 维度数据：`[[03 Projects/小程序工厂/选题库/dimensions]]`
- 输出目录：`[[03 Projects/小程序工厂/选题库/generated]]`、`[[03 Projects/小程序工厂/选题库/candidates]]`、`[[03 Projects/小程序工厂/选题库/rejected]]`
- 批次浏览：`[[03 Projects/小程序工厂/选题库/batches/BATCH-MVP.md]]`

### 快速使用

```bash
python3 scripts/topic_generator.py list-dimensions
python3 scripts/topic_generator.py generate
python3 scripts/topic_generator.py generate --relation R-CARE-01 --batch-id BATCH-CARE-01 --name '子女照护老人'
bash scripts/run-pipeline.sh
```

### 当前能力

- 自动初始化四维度 JSON 数据
- 生成选题卡片并按 PRD 的 8 项标准评分
- 输出候选/淘汰卡片与批次 Markdown 概览
- 支持按关系节点过滤生成

### 后续扩展方向

- 扩充到 PRD 附录 A 的完整关系节点
- 引入更多动作模板与去重规则
- 接入人工校正与增量维护流程


### 浏览界面

- 本地网页：`[[03 Projects/小程序工厂/ui-web/index.html]]`
- Obsidian 看板：`[[03 Projects/小程序工厂/obsidian/README-选题生成器看板.md]]`

本地网页建议这样打开：

```bash
cd /Users/chengxiaoming/Documents/ClaudeCode/memory-work/03\ Projects/小程序工厂
python3 scripts/topic_generator_server.py
# 然后访问 http://127.0.0.1:8765/ui-web/
```



### 页面内直接生成

网页现在可以直接调用本地 API 生成批次，无需再手动复制命令：

- 选择关系范围（可选）
- 输入批次名称
- 选择生成规模（标准 / 扩展 / 极限）
- 选择质量模式：`收敛优先（推荐）` / `数量优先`
- 点击“页面内直接生成”
- 生成完成后页面会自动刷新并切换到新批次

当前已验证的页面生成批次：
- `BATCH-20260317-073649`：393 条、候选 385 条（旧版数量优先）
- `BATCH-20260317-142439`：174 条、候选 174 条（新版收敛优先）

### 当前已实现功能

- 规则驱动选题生成
- 关系节点过滤生成
- 候选 / 淘汰自动分流
- 去重与红海 / 低 AI 价值淘汰
- 批次索引与 CSV 导出
- 本地网页工作台（批次切换、筛选、页面内直接生成、人工标签管理）
- Obsidian 看板自动重建

### 关键命令

```bash
python3 scripts/topic_generator.py generate --batch-id BATCH-FULL-V2 --name '高自治扩展批次-收敛版'
python3 scripts/topic_generator.py list-batches
bash scripts/generate-candidates.sh
bash scripts/run-pipeline.sh
```
