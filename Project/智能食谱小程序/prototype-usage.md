---
title: HTML原型使用说明
created: 2026-03-05
---

# HTML原型使用说明

## 📱 原型文件

[[prototype.html]] — 完整的可交互原型

---

## 🚀 快速开始

### 方法1：直接用浏览器打开（推荐）

1. 在文件管理器中找到 `prototype.html`
2. 双击打开，或右键 → 选择浏览器打开
3. 即可在浏览器中预览和操作

### 方法2：在Obsidian中预览

#### 方案A：使用Obsidian Embed插件（需要安装插件）

1. 安装 `Embed HTML` 插件（搜索 "Embed HTML"）
2. 在Obsidian中创建一个新笔记
3. 使用以下语法嵌入：

```html
![[prototype.html]]
```

或使用iframe：

```html
<iframe src="file:///Users/chengxiaoming/Documents/ClaudeCode/memory-work/03 Projects/小程序工厂/Project/智能食谱小程序/prototype.html"
        width="100%" height="600"
        style="border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
</iframe>
```

#### 方案B：使用外部链接（Obsidian + 浏览器）

1. 在Obsidian笔记中创建链接：

```
[打开HTML原型](file:///Users/chengxiaoming/Documents/ClaudeCode/memory-work/03 Projects/小程序工厂/Project/智能食谱小程序/prototype.html)
```

2. 点击链接，系统会用默认浏览器打开

---

## 🎨 原型功能

### 完整页面（5个）

| 页面 | 功能 |
|------|------|
| **欢迎页** | LOGO展示、开始使用按钮 |
| **用户画像采集（3步）** | 基础信息、健康标签、饮食禁忌 |
| **首页** | 今日推荐三餐、总热量统计 |
| **食谱详情** | 食材、营养、步骤、换一个 |
| **我的页面** | 用户信息、编辑画像、收藏 |

### 可交互功能

- ✅ 页面切换
- ✅ 表单输入
- ✅ 健康标签选择（单选，带二级选项）
- ✅ 禁忌标签选择（多选）
- ✅ AI生成加载动画
- ✅ 食谱详情查看
- ✅ 底部导航切换
- ✅ 收藏按钮（视觉交互）

---

## 📐 设计规范

### 配色方案

```
主色（绿色）: #52C41A
辅色（黄色）: #FAAD14
背景色: #F5F5F5
卡片背景: #FFFFFF
文字色: #333333
```

### 字体规范

```
页面标题: 20px Medium
卡片标题: 18px Medium
正文: 14px Regular
次级文字: 12px Regular
按钮: 16px Medium
```

---

## 🎯 核心交互流程

### 首次使用流程

```
欢迎页 → 点击"开始使用"
    ↓
用户画像采集（3步）
    ↓
点击"生成我的食谱"
    ↓
显示加载动画（2秒）
    ↓
首页（今日推荐）
```

### 日常使用流程

```
首页 → 点击某餐卡片
    ↓
食谱详情页
    ↓
[点击"换一个"重新生成] 或 [返回首页]
```

---

## 🔧 技术细节

### 响应式设计

- 手机端（max-width: 374px）：全宽显示
- 桌面端（min-width: 376px）：375px居中显示，模拟手机效果

### 浏览器兼容性

- ✅ Chrome/Edge (推荐)
- ✅ Safari
- ✅ Firefox
- ✅ 移动端浏览器

---

## 📝 后续开发参考

### 前端技术栈建议

根据原型的实现方式，建议：

| 层级 | 技术选择 | 原因 |
|------|---------|------|
| UI框架 | uni-app / Taro | 跨平台，可生成小程序 |
| CSS方案 | SCSS / Less | 支持变量和嵌套，便于维护 |
| 状态管理 | Pinia / Vuex | 统一管理用户数据和食谱数据 |
| 组件库 | uni-ui / Taro UI | 成熟的UI组件，快速开发 |

### 关键功能实现提示

**页面切换**：使用小程序的 `navigateTo` / `redirectTo` API
**数据存储**：使用 `wx.setStorageSync` 存储用户画像
**API调用**：使用 `uni.request` 调用后端AI接口
**分享功能**：使用 `wx.shareAppMessage` API

---

## ⚠️ 注意事项

1. **原型数据为模拟数据**：所有食谱内容均为示例，实际开发需对接后端AI服务
2. **健康免责声明**：产品上线前必须添加"仅供参考，不能替代医生建议"的免责声明
3. **隐私保护**：用户健康信息需加密存储，不得用于其他目的
4. **内容审核**：所有食谱需经过营养师审核才能上线

---

**最后更新**: 2026-03-05
