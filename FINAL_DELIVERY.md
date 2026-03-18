# 最终交付说明

## 这版完成了什么

这次交付把“选题决策工作台”收口为一版可正式使用的线上版本，重点不是继续堆功能，而是把以下几件事做实：

- 桌面端与手机端都能稳定浏览和处理选题
- 页面默认先看到选题，而不是先看到统计
- 支持快速判断：要 / 再看 / 不要
- 支持把值得做的题转成“立项候选”，并继续补负责人、下一步动作、验证计划
- 保留概览页查看批次总体情况、处理进度和长期题库沉淀
- 保留页面内直接生成新批次的能力
- 保持本地浏览器存储兼容，不会因为这次升级丢失原有判断结果

## 现在怎么访问

### 线上地址
- Render 线上服务：`https://xiaochengxu-topic-generator.onrender.com`
- 工作台页面：`https://xiaochengxu-topic-generator.onrender.com/ui-web/`

### 本地启动
在项目根目录执行：

```bash
node deploy-fullstack/server.js
```

然后打开：

```text
http://127.0.0.1:8787/ui-web/
```

## 手机端怎么用

手机端这一版的原则是“先处理题，再看细节”：

- 首屏优先看到选题列表
- 详情区域改为更适合手机的展开方式
- 批量操作保留高频动作，更多推进动作收进折叠区
- 表格模式在手机上会给出提示，默认更建议使用卡片模式

推荐的手机端使用方式：
1. 先切到你要看的批次
2. 直接在卡片列表里做“要 / 再看 / 不要”
3. 需要深看时再点“查看详情”
4. 需要批量推进时，先勾选题目，再展开“更多推进操作”

## 本地改完后如何发布

如果你本地改了项目，希望线上自动更新，正常流程是：

1. 提交本地改动到 Git
2. 推送到 GitHub 对应仓库的 `main` 分支
3. Render 检测到新提交后自动构建
4. 构建成功后，线上地址更新为最新版本

常见命令：

```bash
git add .
git commit -m "feat(web): finalize topic workspace delivery"
git push origin main
```

如果你使用 VS Code，也可以直接在“源代码管理”里完成提交和推送，不一定必须用命令行。

## Render 没更新时怎么查

如果你发现 GitHub 已经推上去了，但 Render 看起来没有变化，按下面顺序排查：

### 1. 先确认是不是访问错地址
必须访问：

```text
https://xiaochengxu-topic-generator.onrender.com/ui-web/
```

不是只访问根路径后就判断页面有没有更新。

### 2. 看 Render 服务绑定的是不是这个 GitHub 仓库
应该绑定到当前仓库：

```text
https://github.com/tangculv/xiaochengxu-topic-generator
```

如果绑错仓库，Render 不会拉到你的最新提交。

### 3. 看 Render 监听的分支是不是 `main`
如果你把代码推到了别的分支，而 Render 只监听 `main`，它就不会自动部署。

### 4. 看 Auto Deploy 是否开启
在 Render 服务设置里确认自动部署没有被关闭。

### 5. 看 Build / Start 配置是否正确
当前项目推荐配置：

- Root Directory：留空
- Build Command：`python3 --version && node --version`
- Start Command：`node deploy-fullstack/server.js`
- Port：`10000`（由服务内环境变量提供）

### 6. 看最新 deploy 记录有没有出现
如果没有新的 deploy 记录，通常说明：
- 没推到 Render 监听的仓库/分支
- Auto Deploy 没开
- Render 服务绑定配置有问题

如果有 deploy 记录但页面没变化，再看是不是浏览器缓存，或是不是部署失败。

## 这次交付里包含哪些数据

本次交付不仅包含网页和部署配置，也包含一批选题数据快照，主要在：

- `选题库/batches/`
- `选题库/generated/`
- `选题库/exports/`
- `选题库/candidates/`

其中：
- `batches/*.md`：批次说明
- `generated/*.json`：页面读取的批次结果
- `exports/*.csv`：导出表
- `candidates/*.json`：单题原始数据

建议以后继续迭代时，把“代码改动”和“数据快照改动”分开理解：
- 代码改动：影响页面和系统行为
- 数据快照：影响当前可浏览的选题内容

这样以后做版本管理会更清晰。
