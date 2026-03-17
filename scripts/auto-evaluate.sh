#!/bin/bash

# 自动评估脚本
# 功能：扫描 pending 目录，调用AI评估，生成报告，移动到 evaluated/

set -e

# 配置
TOPIC_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/topic-library"
PENDING_DIR="$TOPIC_LIB_DIR/pending"
EVALUATED_DIR="$TOPIC_LIB_DIR/evaluated"
REPORTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/evaluation-reports/2026-W10"
LOG_FILE="$TOPIC_LIB_DIR/../logs/auto-evaluate.log"

# 确保目录存在
mkdir -p "$EVALUATED_DIR" "$REPORTS_DIR" "$(dirname "$LOG_FILE")"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
    echo "$*"
}

# 评估单个选题
evaluate_topic() {
    local topic_file="$1"
    local topic_id=$(basename "$topic_file" .md)
    local output_report="$REPORTS_DIR/${topic_id}-eval.md"

    log "评估选题：$topic_id"

    # 调用Python评估脚本
    python3 "$(dirname "${BASH_SOURCE[0]}")/auto-evaluate.py" "$topic_file" "$output_report"

    # 移动到 evaluated 目录
    mv "$topic_file" "$EVALUATED_DIR/"

    log "评估完成：$topic_id → $output_report"
}

# 主函数
main() {
    log "===== 开始自动评估 ====="

    # 扫描 pending 目录
    count=0
    for topic_file in "$PENDING_DIR"/*.md; do
        if [ -f "$topic_file" ]; then
            evaluate_topic "$topic_file"
            ((count++))
        fi
    done

    log "评估完成，共处理 $count 个选题"
    log "===== 自动评估结束 ====="
    echo "评估选题数：$count"
}

# 执行
main "$@"
