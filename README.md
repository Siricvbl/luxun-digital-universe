# 鲁迅数字宇宙 · Luxun Digital Universe

> "此后如竟没有火炬，我便是唯一的光。"

鲁迅先生（1881-1936）作品的数字化探索项目。将鲁迅的文学世界转化为可交互的数字体验——目前完成了《狂人日记》人物关系图谱和数字鲁迅对话功能。

---

## 功能

### 🕸️ 人物关系图谱

基于 **D3.js** 的力导向关系图谱，展示《狂人日记》的人物关系和事件网络。

- **力导向布局**：拖拽交互、缩放、人物浮移动画
- **关系过滤**：悬停高亮关联人物和关系线
- **人物详情**：点击节点查看性格、形象、语录、关联角色
- **对话入口**：与鲁迅先生聊聊《狂人日记》

关系类型 | 颜色
---|---
亲属 | `#8B5CF6` 亮紫
街坊 | `#60A5FA` 亮蓝
医患 | `#34D399` 翠绿
主雇 | `#FB923C` 亮橙
路人 | `#D1D5DB` 浅灰
同乡 | `#EAB308` 亮黄

### 🤖 数字鲁迅对话

以鲁迅口吻回答问题的 AI 对话系统，基于 DeepSeek API。

- 克制冷峻、温和但尖锐的鲁迅文风
- 对当代事物（手机、电脑、互联网）保持时代陌生感
- 不自称 AI，不强行鸡汤，不卖惨
- 点破问题的同时给人出路

### 📚 鲁迅全集藏书阁

按分类浏览鲁迅全部作品，点击即可阅读全文，或与先生讨论。

---

## 技术栈

- **框架**：Next.js 16 (App Router, Turbopack)
- **可视化**：D3.js v7 (力导向图)
- **AI**：DeepSeek Chat API
- **样式**：Tailwind CSS + 内联样式
- **字体**：PingFang SC / Songti SC
- **图标**：Lucide React

---

## 本地运行

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 在 .env.local 中填入 DEEPSEEK_API_KEY

# 启动开发服务器
npm run dev
```

访问 `http://localhost:3000`

---

## 项目结构

```
app/
├── api/chat/route.ts        # 数字鲁迅对话 API
├── novel/[slug]/page.tsx    # 小说世界图谱页面
├── layout.tsx               # 全局布局
└── page.tsx                 # 首页（藏书阁 + 对话）

public/
├── kr-graph-v7.json         # 狂人日记图谱数据
├── avatar.jpeg              # 鲁迅头像
└── portrait.jpeg            # 鲁迅肖像

docs/
├── ontology-design.md       # 本体论设计
└── relationship-ontology.md # 关系本体

scripts/                     # 数据构建脚本
```

---

## 路线图

- [x] 狂人日记人物关系图谱
- [x] 数字鲁迅对话
- [x] 首页跳转与交互打通
- [ ] 更多小说图谱（阿Q正传、药、祝福……）
- [ ] 跨作品人物关系网络
- [ ] 鲁迅年表交互可视化
- [ ] 移动端适配

---

## 许可

MIT
