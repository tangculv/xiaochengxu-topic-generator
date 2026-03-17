# 完整版上线部署包

这是“选题生成器”的**完整版线上部署方案**：

- 前端网页：`ui-web/`
- 后端 API：`deploy-fullstack/server.js`
- 实时生成：调用现有 Python 生成器 `scripts/topic_generator.py`

## 推荐托管平台

推荐 **Render**，因为：
- 支持 Node + Python 同仓库启动
- 配置最少
- 可以直接把整个仓库部署为一个 Web Service
- 用户只需在网页上点几步，不需要自己搭服务器

## 本地验证

```bash
cd deploy-fullstack
npm start
```

打开：

```text
http://127.0.0.1:8787/ui-web/
```

## Render 配置

- Repository: 当前仓库
- Root Directory: 留空（不要填）
- Runtime: Node
- Build Command:
  ```bash
  python3 --version && node --version
  ```
- Start Command:
  ```bash
  node deploy-fullstack/server.js
  ```

## 说明

该版本为**真正完整版**：
- 支持页面内直接生成
- 支持批次切换
- 支持筛选/排序/搜索
- 支持人工标签和备注（浏览器本地保存）
- 支持至少 100 个及以上批次结果生成

