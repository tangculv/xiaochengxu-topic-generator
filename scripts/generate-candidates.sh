#!/bin/bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/generate-candidates.log"
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}
main() {
  local batch_id="BATCH-PIPELINE-$(date '+%Y%m%d-%H%M%S')"
  log "===== 开始生成候选推荐 ====="
  python3 "$ROOT_DIR/scripts/topic_generator.py" generate --batch-id "$batch_id" --name "流水线自动批次"
  python3 "$ROOT_DIR/scripts/topic_generator.py" list-batches > /dev/null
  log "候选推荐已更新：$batch_id"
  log "===== 候选推荐生成结束 ====="
}
main "$@"
