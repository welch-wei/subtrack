# SubTrack · 订阅管家

一个纯前端的个人订阅费用追踪工具，帮助你清晰掌握每月/每年的订阅开销，避免忘记取消免费试用。

**在线地址**：https://welch-wei.github.io/subtrack/

## 功能

- ➕ 添加/编辑/删除订阅（名称、金额、币种、周期、分类、下次扣款日）
- 📊 实时统计：月支出、年支出、活跃订阅数、未来 30 天待扣款
- 🥧 分类支出饼图
- ⏰ 到期前 3 天本地提醒
- 💾 数据只保存在浏览器 localStorage，支持 JSON 导入/导出
- 🎨 响应式设计，开箱即用

## 技术栈

- HTML / Tailwind CSS CDN / 原生 JavaScript
- Chart.js 分类图表
- 无后端、无账号、无 API Key

## 本地运行

```bash
cd /Users/welch/Projects/subtrack
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

## 变现思路

SubTrack 切中“订阅刺客”消费痛点，用户付费意愿明确：

- **高级版订阅**：PDF/CSV 导出、年度消费报表、多设备同步、家庭共享、取消助手。
- **联盟佣金**：在详情页推荐“年付折扣”“更低价的替代品”或信用卡返利链接。
- **品牌广告**：页面非侵入位置接入理财、信用卡、省钱类品牌广告。
- **企业/家庭版**：多人共享订阅池，分摊账单（适合合租 Netflix、Spotify 等场景）。
