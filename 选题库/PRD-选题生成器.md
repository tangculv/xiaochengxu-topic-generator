# 选题生成器 PRD

> 系统性地从社会义务结构中生成、评估、管理小程序选题。
> 本工具是小程序工厂"选题带"的核心引擎。

---

## 1. 问题

选题带目前的工作方式是"想到一个评估一个"。这有两个致命缺陷：

- **覆盖面靠运气**——想到什么评什么，大量有效组合根本没被考虑过
- **评估没有结构**——同一个人在不同时间对同一个点子的判断不一致

选题生成器要解决的是：**用结构化的维度组合替代直觉发散，用标准化的评估流程替代拍脑袋判断。**

---

## 2. 定位

```
选题生成器在生产线中的位置：

  选题生成器（本工具）
      │
      │ 输出：评分 ≥ 70 的候选选题卡片
      ▼
  选题带（PRD-生产线系统.md §4.1）
      │
      │ 立项闸门 → 生成 PRD
      ▼
  开发带 → 运营带
```

**一句话**：输入维度组合，输出可直接进入立项闸门的选题卡片。

---

## 3. 核心概念

### 3.1 四维度模型

每个选题是 4 个独立维度的组合：

```
选题 = 义务关系 × 结构化动作 × 作用领域 × AI 能力层
```

| 维度 | 代号 | 含义 | 枚举量 |
|------|------|------|--------|
| 义务关系 | R (Relation) | 谁对谁有反复出现的义务 | ~35 种 |
| 结构化动作 | A (Action) | 把什么混沌行为变成结构 | 7 大类 ×3-5 子类 ≈ 25 种 |
| 作用领域 | D (Domain) | 义务关于什么事 | ~10 种 |
| AI 能力层 | L (Level) | AI 做了什么以前做不到的事 | 3 级 × 7 种能力 ≈ 15 种 |

理论组合空间：35 × 25 × 10 × 15 = **131,250**

经约束过滤后的有效空间估计：**300-500 个值得评估的选题**

### 3.2 选题卡片

生成器的最小输出单位。每张卡片描述一个具体的选题。

### 3.3 选题批次

一次生成操作产出的一批选题卡片，按关系节点组织。

---

## 4. 数据模型

### 4.1 维度枚举表

四个维度各有一个枚举表，存储所有可选值。

**R：义务关系表**

```yaml
# relations.yaml
- id: R-EDU-01
  type: authority        # authority | care | contract | mutual | self
  from: 班主任
  to: 家长
  obligation_strength: 5  # 1-5
  group_size: 30-50
  frequency: daily
  spread_mechanism: class_group  # class_group | family_group | community_group | interest_group | work_group | self
  population_estimate: 4000万    # 中国有约400万班主任，每个对应30-50家长
  notes: 已被充分工具化（班小二、接龙等）

- id: R-CARE-01
  type: care
  from: 成年子女
  to: 老年父母
  obligation_strength: 5
  group_size: 3-8
  frequency: daily
  spread_mechanism: family_group
  population_estimate: 3亿
  notes: 工具化程度极低

- id: R-CONTRACT-01
  type: contract
  from: 小时工
  to: 自己（对雇主的利益保护）
  obligation_strength: 4
  group_size: 1
  frequency: daily
  spread_mechanism: peer_group
  population_estimate: 2亿
  notes: 小时工记工时已验证模型
# ... 完整列表见附录 A
```

**A：结构化动作表**

```yaml
# actions.yaml
- id: A-COLLECT
  name: 收集
  direction: many_to_one
  subtypes:
    - id: A-COLLECT-INTENT
      name: 收意向
      description: 收集是/否/选项类回复
      existing_tools: [接龙, 报名, 投票]
    - id: A-COLLECT-SUBMIT
      name: 收提交物
      description: 收集文件/照片/视频/文字作品
      existing_tools: [收作业, 收截图]
    - id: A-COLLECT-DATA
      name: 收数据
      description: 收集数值/打卡/测量数据
      existing_tools: [体温收集, 血压记录]
    - id: A-COLLECT-MONEY
      name: 收款项
      description: 收集费用
      existing_tools: [班费收集, 活动收款]
    - id: A-COLLECT-FEEDBACK
      name: 收反馈
      description: 收集评价/意见/建议
      existing_tools: [问卷, 满意度调查]

- id: A-DISTRIBUTE
  name: 分发
  direction: one_to_many
  subtypes:
    - id: A-DISTRIBUTE-NOTIFY
      name: 发通知
    - id: A-DISTRIBUTE-RESULT
      name: 发结果
      description: 私密分发个人结果（成绩、报告）
    - id: A-DISTRIBUTE-TASK
      name: 发任务
    - id: A-DISTRIBUTE-RESOURCE
      name: 发资源

- id: A-VERIFY
  name: 核验
  direction: bidirectional
  subtypes:
    - id: A-VERIFY-PRESENCE
      name: 核验到场
    - id: A-VERIFY-COMPLETION
      name: 核验完成
    - id: A-VERIFY-COMPLIANCE
      name: 核验合规

- id: A-EVALUATE
  name: 评判
  direction: one_to_one
  subtypes:
    - id: A-EVALUATE-CORRECTNESS
      name: 判对错
      ai_potential: 5   # 1-5
    - id: A-EVALUATE-QUALITY
      name: 判质量
      ai_potential: 5
    - id: A-EVALUATE-COMPLIANCE
      name: 判合规
      ai_potential: 4
    - id: A-EVALUATE-HEALTH
      name: 判健康
      ai_potential: 5
    - id: A-EVALUATE-RISK
      name: 判风险
      ai_potential: 4

- id: A-DECIDE
  name: 决策
  direction: many_to_one
  subtypes:
    - id: A-DECIDE-VOTE
      name: 投票选择
    - id: A-DECIDE-RANDOM
      name: 随机抽取
    - id: A-DECIDE-RANK
      name: 排序排名

- id: A-TRACK
  name: 追踪
  direction: timeline
  subtypes:
    - id: A-TRACK-HABIT
      name: 追踪习惯
      ai_potential: 3
    - id: A-TRACK-PROGRESS
      name: 追踪进步
      ai_potential: 5
    - id: A-TRACK-HEALTH
      name: 追踪健康
      ai_potential: 5
    - id: A-TRACK-FINANCE
      name: 追踪财务
      ai_potential: 3
    - id: A-TRACK-GROWTH
      name: 追踪成长
      ai_potential: 4

- id: A-COORDINATE
  name: 协调
  direction: many_to_many
  subtypes:
    - id: A-COORDINATE-SCHEDULE
      name: 排期
    - id: A-COORDINATE-RESOURCE
      name: 分配资源
    - id: A-COORDINATE-DUTY
      name: 分工排班
```

**D：作用领域表**

```yaml
# domains.yaml
- id: D-STUDY
  name: 学业
  sub: [作业, 考试, 成绩, 错题, 知识点, 学习计划, 选课]
- id: D-HEALTH
  name: 健康
  sub: [饮食, 运动, 用药, 体征, 睡眠, 情绪, 症状, 体检]
- id: D-MONEY
  name: 金钱
  sub: [工资, 工时, 班费, 报销, 分摊, 收款, 记账]
- id: D-TIME
  name: 时间
  sub: [排班, 考勤, 请假, 预约, 倒计时, 纪念日]
- id: D-EVENT
  name: 活动
  sub: [报名, 签到, 通知, 物资, 分工, 总结]
- id: D-CONTENT
  name: 内容
  sub: [照片, 视频, 作品, 日记, 笔记]
- id: D-SKILL
  name: 技能
  sub: [乐器, 书法, 口语, 体育, 编程, 绘画, 舞蹈]
- id: D-RELATION
  name: 关系
  sub: [家谱, 通讯录, 互助记录, 纪念]
- id: D-GOODS
  name: 物品
  sub: [团购, 二手, 采购, 共享]
- id: D-SAFETY
  name: 安全
  sub: [打卡, 巡检, 报备, 预警]
```

**L：AI 能力层表**

```yaml
# ai_levels.yaml
levels:
  - id: L1
    name: 替代重复劳动
    description: 自动分类、格式转换、定时提醒
    replaces: 文员/助理
    price_ceiling: 9.9/月
  - id: L2
    name: 替代技能工作
    description: 批改、评估、写文案、分析数据
    replaces: 教师/文案/分析师
    price_ceiling: 39.9/月
  - id: L3
    name: 替代专家判断
    description: 医学建议、教育诊断、风险预警
    replaces: 医生/咨询师/专家
    price_ceiling: 99/月

capabilities:
  - id: AI-UNDERSTAND
    name: 理解非结构化输入
    input: [手写, 拍照, 语音, 视频, 自然语言]
    min_level: L2
  - id: AI-EVALUATE
    name: 质量评判
    input: [作业, 作品, 练习, 数据]
    min_level: L2
  - id: AI-GENERATE
    name: 个性化生成
    input: [上下文, 用户画像]
    output: [反馈, 建议, 计划, 文案, 报告]
    min_level: L2
  - id: AI-PATTERN
    name: 模式识别
    input: [时间序列数据, 行为记录]
    output: [趋势, 异常, 规律]
    min_level: L2
  - id: AI-REASON
    name: 知识推理
    input: [领域知识 + 个人情况]
    output: [判断, 建议, 解释]
    min_level: L3
  - id: AI-CREATE
    name: 内容创作
    input: [主题, 风格, 约束]
    output: [文案, 图片, 方案]
    min_level: L2
  - id: AI-TRANSFORM
    name: 格式转换
    input: [原始格式]
    output: [目标格式]
    min_level: L1
```

### 4.2 选题卡片数据结构

```yaml
# 每个选题卡片的数据结构
id: IDEA-2026-0001
created: 2026-03-16
status: seed | evaluated | candidate | rejected | archived

# ---- 四维度定位 ----
relation:
  id: R-CARE-01
  from: 成年子女
  to: 老年父母
  type: care
action:
  id: A-EVALUATE-HEALTH
  name: 判健康
domain:
  id: D-HEALTH
  sub: 饮食
ai:
  level: L3
  capability: AI-REASON
  what_it_does: 识别食物 + 结合病史判断能否吃 + 给出建议
  what_it_replaces: 营养师面对面咨询（200-500元/次）

# ---- 产品描述 ----
one_liner: 拍餐食照片，AI 结合慢病病史告诉你能不能吃、吃多少合适
user_action: 拍照 → 看结果
trigger: 每餐吃饭前
frequency: 每天 3 次

# ---- 用户与付费 ----
user:
  primary: 40-65岁慢病患者（糖尿病/高血压/痛风）
  secondary: 25-40岁子女代父母使用
  population: 3亿+（中国慢病人群）
payment:
  who_pays: 患者本人 或 子女
  why: 替代营养师，每餐都能用
  price: 19.9元/月
  free_tier: 1餐/天免费
  vip_tier: 无限次 + 周报 + 复查报告

# ---- 传播机制 ----
spread:
  mechanism: 子女推荐给父母（家庭群）+ 病友群口碑
  viral_action: 生成"本周饮食健康评分"可分享到群/朋友圈
  one_brings_many: 1个子女 → 2个父母 → 父母的病友群

# ---- 评分（8项标准）----
scores:
  solo_feasible: 9       # /10
  ai_breakthrough: 14    # /15
  high_frequency: 10     # /10
  clear_user_payment: 14 # /15
  specific_executable: 9 # /10
  large_market: 10       # /10
  real_pain: 14          # /15
  human_drive: 13        # /15  养育焦虑的反向：子女对父母的健康责任
  total: 93              # /100

# ---- 竞品与差异 ----
competition:
  existing: 薄荷健康（记录为主，不针对慢病）、糖护士（只做血糖）
  gap: 没有"拍一下就能得到针对我的病情的饮食建议"的产品
  moat: AI 结合个人病史的推理能力，数据积累后越用越准

# ---- 风险 ----
risks:
  - 医疗建议的合规风险 → 需声明"不替代医嘱"
  - 食物识别准确率 → 需大模型多模态能力足够强
  - 老年用户操作门槛 → 需极简交互，拍照即出结果

# ---- 产品形态对照 ----
page_types:
  - form-to-result     # 拍照 → 分析结果
  - record-history     # 饮食记录时间线
  - dashboard          # 周/月健康概览
  - paywall-result-share  # VIP 解锁详细分析
```

### 4.3 选题批次

```yaml
# batch-2026-03-16.yaml
batch_id: BATCH-001
created: 2026-03-16
relation_node: R-CARE-01 (成年子女 → 老年父母)
ideas_generated: 18
ideas_passed: 7      # 评分 ≥ 70
ideas_rejected: 11
ideas:
  - IDEA-2026-0001   # 93 分 — 慢病饮食管家
  - IDEA-2026-0002   # 85 分 — 用药提醒+AI判断
  - IDEA-2026-0003   # 78 分 — 体检报告解读
  # ...
```

---

## 5. 工作流程

### 5.1 生成流程

```
┌──────────────────────────────────────────────────────┐
│                    选题生成流程                         │
│                                                       │
│  ① 选择一个关系节点（维度 R）                           │
│     ↓                                                 │
│  ② 展开义务清单                                        │
│     问：这个关系中，哪些事是必须做的、反复出现的？          │
│     输出：5-10 条义务                                  │
│     ↓                                                 │
│  ③ 义务 × 动作 交叉                                    │
│     每条义务 × 7 种动作（含子类型）                       │
│     初步过滤：这个交叉是真实场景吗？                      │
│     输出：15-30 个有效交叉                              │
│     ↓                                                 │
│  ④ 叠加领域细化                                        │
│     每个有效交叉，明确具体作用在什么领域/子领域             │
│     输出：20-40 个选题种子                              │
│     ↓                                                 │
│  ⑤ AI 能力层判断                                       │
│     每个种子问：AI 能在这里做到 L2 以上吗？               │
│     过滤掉 L1 和"无 AI 价值"的                          │
│     输出：10-20 个 AI 增强的选题种子                     │
│     ↓                                                 │
│  ⑥ 写选题卡片                                         │
│     补充：一句话描述、用户画像、付费方案、传播机制          │
│     ↓                                                 │
│  ⑦ 8 项标准评分                                        │
│     ≥ 70 → 进入候选池                                  │
│     < 70 → 标记 rejected + 原因                        │
│     ↓                                                 │
│  ⑧ 候选卡片 → 选题带立项闸门                            │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### 5.2 批量生成节奏

```
全量扫描（首次）：
  遍历所有 ~35 个关系节点
  每个节点走完 ①-⑦
  预计产出 300-500 个种子 → 100-150 个候选
  耗时：约 3-5 次工作会话

增量补充（日常）：
  新发现一个关系/义务 → 走 ②-⑦
  竞品观察发现新场景 → 反向拆解到四维度 → 补充枚举表
  知识库反馈（淘汰/毕业复盘）→ 更新维度权重
```

### 5.3 与生产线的衔接

```
选题生成器输出                    生产线选题带输入
─────────────                   ──────────────
选题卡片（≥70 分）    ──→       候选池
  ├─ 四维度定位                    │
  ├─ 一句话描述                    ▼
  ├─ 用户+付费方案              市场信号验证（手动）
  ├─ 传播机制                      │
  ├─ 8 项评分                      ▼
  └─ 竞品+风险                  立项闸门（8 项检查）
                                   │
                                   ▼
                                生成 PRD → 开发带
```

---

## 6. 存储结构

```
选题库/
  ├── dimensions/              # 维度枚举表
  │     ├── relations.yaml     # 义务关系
  │     ├── actions.yaml       # 结构化动作
  │     ├── domains.yaml       # 作用领域
  │     └── ai_levels.yaml     # AI 能力层
  │
  ├── batches/                 # 生成批次
  │     ├── BATCH-001-子女与老人.md
  │     ├── BATCH-002-家长与学业.md
  │     └── ...
  │
  ├── candidates/              # 候选卡片（≥70 分）
  │     ├── IDEA-2026-0001-慢病饮食管家.yaml
  │     ├── IDEA-2026-0002-用药AI助手.yaml
  │     └── ...
  │
  ├── rejected/                # 被筛掉的（留作复盘）
  │
  ├── 选题生成器.md             # 方法论文档
  ├── 选题库.md                # 竞品收集
  ├── 竞品底层模型分析.md       # 底层分析
  └── PRD-选题生成器.md         # 本文档
```

---

## 7. 约束规则（硬编码）

生成过程中，以下规则自动过滤无效组合：

### 7.1 有效性约束

| # | 规则 | 过滤逻辑 |
|---|------|---------|
| 1 | 义务必须真实存在 | 不履行有明确后果（社交压力/经济损失/健康风险） |
| 2 | 频率 ≥ 每周 | 低于每周的标记 `low_frequency_warning` |
| 3 | 群体规模 ≥ 百万 | `population_estimate < 100万` 的直接过滤 |
| 4 | AI 层级 ≥ L2 | L1（纯自动化）不符合选题标准第 2 条 |
| 5 | 产品形态在支持列表内 | 必须映射到 6 种页面类型之一 |
| 6 | 可基于微信云开发实现 | 需要自建服务端的过滤 |

### 7.2 去重规则

| # | 规则 |
|---|------|
| 1 | 同一 R×A×D 组合只保留 AI 层级最高的 |
| 2 | 功能高度重叠的卡片合并为一个（标注可选功能） |
| 3 | 已有成熟竞品且无 AI 差异化空间的标记 `red_ocean` |

### 7.3 优先级权重

当候选卡片过多需要排序时：

```
优先级分 = 评分总分 × 0.4
         + 义务强度(1-5) × 6    # 最高 30 分
         + AI 层级(L1=0,L2=10,L3=20)
         + 传播强度(0-10)

传播强度计算：
  使用即传播（群内必须使用）= 10
  结果可分享 = 7
  口碑推荐 = 5
  纯个人使用 = 2
```

---

## 8. 输出规范

### 8.1 选题卡片简版（用于批量浏览）

批量生成时，每个选题先输出简版，筛选后再补全详版。

```
[IDEA-编号] [评分] ★ 一句话描述
关系：谁→谁 | 动作：X | 领域：Y | AI：LN
用户：xxx | 付费：xxx元/月 | 人群：xxx
传播：xxx
```

示例：
```
[IDEA-0001] [93] ★ 拍餐食，AI结合慢病史告诉你能不能吃
关系：子女→老人 | 动作：评判-健康 | 领域：健康-饮食 | AI：L3
用户：慢病患者/子女代管 | 付费：19.9/月 | 人群：3亿+
传播：家庭群推荐 + 病友群口碑 + 健康评分卡分享
```

### 8.2 选题卡片详版（进入候选池后补全）

按 §4.2 完整数据结构填写。

---

## 9. 维度枚举维护

### 9.1 维护触发

| 触发 | 动作 |
|------|------|
| 竞品观察发现新关系类型 | 补充 relations.yaml |
| 用户调研发现新义务场景 | 补充 relations.yaml + 绑定义务 |
| 技术进步带来新 AI 能力 | 补充 ai_levels.yaml |
| 小程序淘汰复盘 | 更新对应卡片状态 + 知识库 |
| 小程序毕业复盘 | 验证维度组合的有效性 + 增加权重 |

### 9.2 质量指标

跟踪生成器本身的准确性：

| 指标 | 计算 | 目标 |
|------|------|------|
| 命中率 | 候选中最终立项的比例 | > 30% |
| 误杀率 | 被拒绝但其实可行的比例 | < 10% |
| 覆盖率 | 成功产品中能被生成器覆盖的比例 | > 80% |

每 5 个小程序结束（毕业或淘汰）后做一次回顾校准。

---

## 10. 附录 A：完整关系枚举

### 管教型（authority）— 义务强度 4-5

| ID | 从 | 到 | 频率 | 群规模 | 人群规模 | 工具化程度 |
|----|----|----|------|--------|---------|-----------|
| R-AUTH-01 | 班主任 | 家长 | 每天 | 30-50 | 4000万 | 高 |
| R-AUTH-02 | 科目老师 | 学生 | 每天 | 30-50 | 1.8亿 | 中 |
| R-AUTH-03 | 辅导班/培训班老师 | 学员家长 | 每周2-5次 | 10-30 | 5000万 | 低 |
| R-AUTH-04 | 体育/艺术教练 | 学员 | 每周2-3次 | 10-50 | 3000万 | 低 |
| R-AUTH-05 | 部门主管 | 下属 | 每天 | 5-20 | 2亿 | 高（钉钉/飞书） |
| R-AUTH-06 | 社区干部/网格员 | 居民 | 每周 | 50-500 | 5000万 | 低 |
| R-AUTH-07 | 物业管理 | 业主 | 每周 | 100-500 | 3000万 | 低 |
| R-AUTH-08 | 班委/家委 | 本班家长 | 每周 | 30-50 | 2000万 | 中 |
| R-AUTH-09 | 宗教团体领袖 | 信众 | 每周 | 20-200 | 2亿 | 极低 |
| R-AUTH-10 | 驾校教练 | 学员 | 每周 | 5-20 | 3000万 | 低 |
| R-AUTH-11 | 月嫂/育儿嫂机构 | 客户家庭 | 每天 | 1 (一对一) | 500万 | 低 |

### 照护型（care）— 义务强度 4-5

| ID | 从 | 到 | 频率 | 群规模 | 人群规模 | 工具化程度 |
|----|----|----|------|--------|---------|-----------|
| R-CARE-01 | 成年子女 | 老年父母 | 每天 | 3-8 | 3亿 | 极低 |
| R-CARE-02 | 父母 | 婴幼儿(0-3岁) | 每天 | 1-2 | 3000万 | 低 |
| R-CARE-03 | 父母 | 学龄儿童(6-12岁) | 每天 | 1-2 | 1亿 | 中 |
| R-CARE-04 | 父母 | 青春期孩子(12-18岁) | 每天 | 1-2 | 8000万 | 低 |
| R-CARE-05 | 家属 | 慢病患者 | 每天 | 3-8 | 4亿 | 极低 |
| R-CARE-06 | 家属 | 术后/康复期患者 | 每天 | 3-8 | 2000万 | 极低 |
| R-CARE-07 | 家属 | 孕产妇 | 每天 | 3-8 | 1000万 | 中 |
| R-CARE-08 | 宠物主 | 宠物 | 每天 | 1 | 1亿 | 低 |

### 契约型（contract）— 义务强度 3-4

| ID | 从 | 到 | 频率 | 群规模 | 人群规模 | 工具化程度 |
|----|----|----|------|--------|---------|-----------|
| R-CONT-01 | 小时工/兼职 | 自我利益保护 | 每天 | 1 | 2亿 | 低 |
| R-CONT-02 | 社区团长 | 团购顾客 | 每天 | 50-500 | 500万 | 中 |
| R-CONT-03 | 私域群主/微商 | 客户 | 每天 | 50-500 | 1000万 | 低 |
| R-CONT-04 | 房东 | 租户 | 每月 | 1-10 | 2亿 | 极低 |
| R-CONT-05 | 培训机构 | 付费学员 | 每周 | 10-50 | 3000万 | 低 |
| R-CONT-06 | 自由职业者 | 客户 | 每周 | 1-5 | 2000万 | 低 |
| R-CONT-07 | 家政服务者 | 雇主家庭 | 每天 | 1 | 3000万 | 极低 |

### 互助型（mutual）— 义务强度 2-3

| ID | 从 | 到 | 频率 | 群规模 | 人群规模 | 工具化程度 |
|----|----|----|------|--------|---------|-----------|
| R-MUT-01 | 家族成员 | 家族成员 | 每周 | 10-50 | 5亿 | 极低 |
| R-MUT-02 | 同小区业主 | 业主 | 每周 | 50-500 | 3亿 | 低 |
| R-MUT-03 | 病友 | 病友 | 每天-每周 | 20-500 | 4亿 | 低 |
| R-MUT-04 | 兴趣社群成员 | 成员 | 每周 | 20-500 | 2亿 | 低 |
| R-MUT-05 | 同班家长 | 家长 | 每周 | 30-50 | 4000万 | 中 |
| R-MUT-06 | 校友 | 校友 | 每月 | 20-500 | 5000万 | 低 |

### 自律型（self）— 义务强度 1-3

| ID | 从 | 到 | 频率 | 群规模 | 人群规模 | 工具化程度 |
|----|----|----|------|--------|---------|-----------|
| R-SELF-01 | 自己 | 体重/饮食管理 | 每天 | 1 | 3亿 | 中 |
| R-SELF-02 | 自己 | 工时/收入记录 | 每天 | 1 | 2亿 | 低 |
| R-SELF-03 | 自己 | 学习进度 | 每天 | 1 | 2亿 | 中 |
| R-SELF-04 | 自己 | 情绪/心理健康 | 每天 | 1 | 1亿 | 低 |
| R-SELF-05 | 自己 | 财务管理 | 每天 | 1 | 3亿 | 中 |
| R-SELF-06 | 自己 | 睡眠管理 | 每天 | 1 | 2亿 | 低 |
| R-SELF-07 | 自己 | 皮肤/外貌管理 | 每天 | 1 | 1亿 | 低 |

---

*版本：1.0*
*日期：2026-03-16*
*状态：Draft*
