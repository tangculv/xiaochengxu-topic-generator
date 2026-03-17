---
title: 小程序工厂 Zone Agent
version: 1.0
created: 2026-03-06
---

# 小程序工厂 Zone Agent

## 窗口规则

- 进入本项目的窗口，所有回答围绕小程序工厂展开
- 禁止回答其他项目的问题
- 检测到跨窗口串线时声明："当前窗口锁定：小程序工厂"

## 文件分类规则

| 文件类型 | 位置 | 格式 |
|---------|------|------|
| 选题研究 | 03 Projects/小程序工厂/research/ | 选题-[名称].md |
| 推广方案 | 03 Projects/小程序工厂/ | 推广SOP.md |
| 产品原型 | 03 Projects/小程序工厂/prototype/ | prototype-[名称].md |
| 合作记录 | 03 Projects/小程序工厂/ | 先通沟通-[日期].md |

## 记忆空间

本项目的选题决策、推广数据、合作记录存入对应目录

## 双链规则

- 所有文件链接使用绝对路径：`[[03 Projects/小程序工厂/文件名]]`
- README.md 链接所有子文档
- 子文档链接回 README.md

## 与全局规则的冲突处理

| 冲突 | 优先级 | 处理方式 |
|------|---------|---------|
| 全局规则禁止X | Zone Agent 优先 | 遵循 Zone Agent |
| 全局规则要求Y | Zone Agent 禁止Y | 遵循 Zone Agent（更严格）|


# Adola 开发规范

> TypeScript Monorepo 项目（React + Fastify + Electron）
> 个人本地知识库：文档解析、拆分、向量存储本地完成，LLM 请求可走云端

---

## 开发前必读

1. **不确定时先问** - 对需求、方案有疑问，先和用户确认，不要自行假设
2. **先读规范再写代码** - 避免重复造轮子或违反项目约定
3. **新增或修改用户可见文案前先读文案规范** - 包括前端 UI 文案，以及后端返回给前端的错误 `message`；先读 `docs/frontend/COPYWRITING.md`

### 快速了解项目

- [项目说明](README.md) - 技术栈、目录、启动方式
- [分层规范](docs/standards/layering.md) - 分层理念、依赖方向、禁止模式
- [架构重构方案](docs/architecture/README.md) - 当前结构问题、目标分层与增量重构顺序

---

## Node.js 版本

- 要求 Node.js `>= 24.0.0`
- 项目根目录包含 `.nvmrc` 和 `.node-version`

---

## 项目架构

### Monorepo 结构

```text
adola/
├── apps/
│   ├── server/         # Fastify 后端 (API + 本地文档处理)
│   ├── web/            # React 前端 (Vite)
│   └── desktop/        # Electron 桌面端壳
├── packages/
│   ├── shared/         # Zod schema + 类型推导 (API 契约)
│   └── eslint-config/  # 共享 ESLint 配置
```

### 接口契约（强约束）

- `packages/shared` 中使用 **Zod** 定义所有 API schema
- 前后端共享类型通过 Zod 的 `z.infer<>` 推导
- 新增/修改 API 必须先在 shared 包中定义 schema

```typescript
// packages/shared/src/schemas/document.ts
import { z } from 'zod';

export const CreateDocumentSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
});

export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;
```

---

## 后端架构

后端入口：`apps/server/src/app.ts`，基于 Fastify，采用 `app -> modules -> infra` 分层。

### 目录结构

```text
apps/server/src/
├── app/                # 应用装配：build-app、route register
├── app.ts              # 启动入口
├── modules/            # 领域模块：routes/application/repositories/infrastructure
├── infra/              # 通用基础设施：persistence/ai/security/config
├── scripts/            # 后端脚本入口
├── config/             # 环境配置加载
└── utils/              # 通用工具
```

### 分层职责

- **app/**: Fastify 应用装配、跨模块注册，不写领域逻辑
- **modules/**: 按领域组织 HTTP 适配、use case、repository、模块内基础设施
- **infra/**: 跨领域共享的基础设施能力，如数据库、迁移、AI、网络安全、配置存储

### 分层约束（强约束）

> 完整规范见 [分层规范](docs/standards/layering.md)

**后端依赖方向：**

- `app/` → `modules/*/routes` → `modules/*/application` → `modules/*/repositories` | `infra/*`
- 跨模块调用只能通过目标模块的 `public.ts`
- `infra/*` 禁止反向依赖 `modules/*`
- `modules/*/repositories` 禁止被其他模块直接 import

**前端依赖方向：**

- `pages/` 只做 route shell，不持有业务状态
- `features/` 是业务主落点，拥有自己的 UI、state、hooks
- `components/ui/` 只放跨 feature 的公共视觉原子
- `store/` 只存跨页面、跨 feature 的 app shell 状态
- feature 之间不直接 import 对方内部实现

**涉及分层决策时，必须先阅读：[分层规范](docs/standards/layering.md)**

### 数据库访问约束（强约束）

- 后端 ORM **统一使用 Drizzle ORM**（`drizzle-orm` + `better-sqlite3`）
- 新增/修改数据库读写逻辑时，必须优先使用 Drizzle 的 schema 与 query builder
- 仅以下场景允许使用原生 SQL：
  - `migrations` 脚本中的 DDL/版本管理语句
  - FTS5 / 虚拟表 / trigger 等 Drizzle 暂不直接表达的能力
- 禁止在业务服务中新增基于字符串拼接的 SQL 读写逻辑
- 修改表结构时，必须同时更新：
  - `apps/server/migrations/*.sql`
  - `apps/server/src/infra/persistence/schema.ts`

### DB 设计规范（强约束）

- 所有涉及数据库设计或数据库读写的任务，必须先阅读：`docs/standards/db-design-adola.md`
- 规则优先级：
  - `CLAUDE.md`（本文件）
  - `docs/standards/db-design-adola.md`
- 当外部规范与本项目 SQLite/Drizzle 约束冲突时，以前两者为准
- 新增表默认使用“双 ID”：内部自增主键 `id` + 对外业务 ID（`*_id`，nanoid）
- 时间字段统一 UTC 存储；接口返回 UTC ISO 字符串；前端按用户时区展示（dayjs）
- 提交前至少执行：
  - `make db-rules`（数据库规则专项检查）
  - `make check`（完整检查）

---

## 前端架构

- 技术栈：React + Vite + React Router
- 样式方案：CSS Modules 或全局 CSS + 语义化 CSS Variables

### 写前端代码前（必读）

- [前端设计系统规范](docs/standards/frontend-design-system.md) - 设计系统索引：主题 / token / 组件样式 / 布局子文档入口
- [UI Patterns 索引](docs/frontend/ui-patterns/README.md) - 排版、控件、桌面密度、工具栏槽位、选中态、聊天命令与中文展示规则
- [文案规范](docs/frontend/COPYWRITING.md)
- [i18n 规范](docs/features/i18n/README.md)

> 新增或修改前端用户可见文案，或新增/修改后端返回给前端的错误 `message` 前，必须先完整阅读 `docs/frontend/COPYWRITING.md`。

### 分层组织

- `pages/`: route shell，读取路由参数、组合 feature root，不持有业务状态
- `features/`: 业务主落点，拥有自己的 components/hooks/state，按领域划分
- `components/ui/`: 跨 feature 的公共视觉原子（Button、Card、Typography 等）
- `components/icons/`: 图标组件
- `store/`: 跨页面、跨 feature 的 app shell 状态
- `api/`: API 调用封装，按领域分文件
- `lib/`: 浏览器检测、桌面 bridge、通用工具
- `theme/`: 主题管理
- `i18n/`: 国际化资源

### 组件化约束（强约束）

- **禁止把展示组件堆在 `pages/`**：页面只做 route shell，业务组件下沉到 `features/*/components/`
- 跨 feature 的公共视觉原子组件（字体、卡片、徽标等）必须放到 `components/ui/`
- 同一 UI 模式出现 2 次及以上时必须抽公共组件，不允许复制粘贴
- `components/ui/` 禁止包含业务逻辑、禁止调用 API、禁止读取路由参数
- 新增页面时优先复用 `components/ui/`，再在 feature 内扩展业务组件

### 前端目标

- 页面可维护：单文件建议不超过 300 行（上限 500 行，超出必须拆分）
- 布局稳定：撑满视口、区域滚动、避免"全页面乱滚"
- 职责清晰：页面做 route shell，业务逻辑下沉到 features，公共 UI 下沉到 components/ui

### UI 样式规范（强约束）

- 使用语义化样式 token，不在组件中直接写死视觉常量
- 统一间距节奏（4/8/12/16/24）与圆角层级（8/12/16）
- 可交互元素必须有 hover/focus/disabled 状态
- 列表卡片、引用卡片、来源卡片优先复用公共 Card 组件
- 字体层级通过 Typography 组件表达，禁止散落魔法字号

### 布局规范（强约束）

- `html` / `body` / `#root` 必须建立完整高度链路
- 页面根容器必须撑满视口（`height: 100dvh` 或等价）
- 默认禁止 `body` 滚动，仅允许区域滚动
- 所有 flex 滚动链路容器必须设置 `min-height: 0`
- 移动端必须可降级为单列布局

### 主题规范（强约束）

- 主题差异只能在全局变量层定义，组件层不写主题分支逻辑
- 组件只消费语义色变量（`--bg`、`--surface`、`--text` 等）
- 禁止在组件中硬编码颜色值
- 主题切换通过 `theme/provider.tsx` 统一管理

### i18n 规范（强约束）

- **必须原生支持 i18n**：默认至少包含 `zh-CN` 与 `en-US`
- **禁止硬编码用户可见文案**：页面/组件文案统一走 i18n 资源
- **i18n 目录建议**：`apps/web/src/i18n/locales/{zh-CN,en-US}.json`
- 新增文案 key 必须同步补齐中英文
- key 命名按模块分组（如 `home.model.save`）

详细样式规范参考：[前端设计系统规范](docs/standards/frontend-design-system.md)

---

## 桌面端 (Electron)

- `apps/desktop/` 作为 Electron 壳，打包 web + server
- 主进程负责窗口管理、系统集成、本地文件访问
- 渲染进程加载 web 构建产物

---

## 日志规范

### 日志框架选型

| 层 | 框架 | 用法 |
| --- | --- | --- |
| Electron 主进程 | `electron-log/main` | `import log from 'electron-log/main'` |
| Electron 渲染进程 | 通过 preload 暴露 | `window.adola.log.info(...)` |
| Fastify 后端 | pino（Fastify 内置） | `app.log.info(...)` / `request.log.info(...)` |

### 约束

- **禁止使用 `console.log`**：所有日志必须通过上述框架输出，便于统一格式、持久化和级别控制
- **禁止在日志中输出敏感信息**：用户密码、token、API key 等不得出现在日志中
- **合理使用日志级别**：
  - `error` - 程序错误、异常捕获
  - `warn` - 潜在问题、降级处理
  - `info` - 关键业务节点（启动、请求、操作完成）
  - `debug` - 开发调试信息，生产环境默认不输出
- **结构化日志**：后端优先使用 pino 的对象参数风格（`app.log.info({ docId }, 'parsed')`），便于日志检索

---

## 代码检查

- `make db-rules` - 执行数据库规则专项检查
- `make check` - 执行完整检查（`db-rules + lint + typecheck + build`）

**工作流程**：修改代码后执行 `make check` 检查是否有问题。

---

## Commit 规范（Conventional Commits）

- 提交格式：`<type>(<scope>): <subject>`
- `type` 常用值：`feat`、`fix`、`docs`、`refactor`、`test`、`chore`、`build`、`ci`、`perf`、`revert`
- `scope` 可选：建议使用模块名（如 `web`、`server`、`desktop`、`shared`）
- `subject` 简洁明确，建议不超过 72 字符，使用小写开头，不以句号结尾

示例：`feat(server): add document parsing api`

---

## .workspace 临时目录

`.workspace/` 用于本地临时文件（不上传 git）：

- `todo/` - 长任务进度跟踪
- `drafts/` - 临时代码片段/草稿
- `notes/` - 分析记录

---

## 规划文档规范

- 禁止使用具体日期
- 禁止估算天数
- 只描述任务顺序和依赖关系
- 用优先级（P0/P1/P2）表示重要程度
