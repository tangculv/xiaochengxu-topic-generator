# Cloudflare 部署包

这是“选题生成器”云端演示部署包。

## 用法

```bash
cd deploy-cloudflare
npm run build
```

构建产物输出到 `dist/`。

## Cloudflare Pages 配置

- Framework preset: None
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `deploy-cloudflare`

说明：
- 该版本为**云端演示版**，支持浏览、筛选、人工标注
- `/api/generate` 在云端返回提示，不执行实时生成
- 本地完整版继续通过 `python3 scripts/topic_generator_server.py` 使用
