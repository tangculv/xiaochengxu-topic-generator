#!/bin/bash

# 选题采集脚本
# 功能：从不同来源采集新选题并存入 topic-library/pending/

set -e

# 配置
TOPIC_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/topic-library"
PENDING_DIR="$TOPIC_LIB_DIR/pending"
LOG_FILE="$TOPIC_LIB_DIR/../logs/collect-topics.log"

# 确保目录存在
mkdir -p "$PENDING_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
    echo "$*"
}

# 主函数
main() {
    log "===== 开始选题采集 ====="

    # 1. AI生成选题（手动触发）
    # TODO: 接入AI API自动生成

    # 2. 从研究报告提取选题
    log "从研究报告提取选题..."
    python3 "$(dirname "${BASH_SOURCE[0]}")/extract-from-report.py" || true

    # 3. 热点挖掘（待实现）
    # TODO: 接入热点API

    # 4. 统计结果
    count=$(ls -1 "$PENDING_DIR"/*.md 2>/dev/null | wc -l)
    log "选题采集完成，当前待评估选题数：$count"

    log "===== 选题采集结束 ====="
    echo "待评估选题数：$count"
}

# 执行
main "$@"
