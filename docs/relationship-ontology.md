# 《狂人日记》人物关系本体论 & 关系类型表

## 一、核心问题与解决方案总览

| # | 问题 | 解决方案 |
|---|------|----------|
| 1 | `亲属` 不是动词 | 改为动词形式 `血亲`（血缘关系）和 `养育`（抚养/养育关系） |
| 2 | 双向关系需方向独立显示 | 悬停节点A时，只显示A→他人的关系文字，不显示他人→A的关系 |
| 3 | 同对节点多条关系时文字重叠 | 对同方向的多条link进行**弧度偏移（curvature）**，每条线独立弧度→文字随曲线中点偏移 |

---

## 二、关系动词表（Ontology）

### 2.1 最终确定的10种关系动词

| 原类型 | 动词形式 | 方向性 | 含义 | 颜色 |
|--------|---------|--------|------|------|
| 惧怕 | **怕** | A→B | A 恐惧/畏惧 B | `#dc2626` (红) |
| 怀疑 | **疑** | A→B | A 怀疑 B 有恶意 | `#ca8a04` (黄) |
| 迫害 | **害** | A→B | A 迫害/加害 B | `#991b1b` (深红) |
| 敌对 | **敌** | A↔B | A 与 B 对立（双向） | `#b91c1c` (暗红) |
| 服从 | **从** | A→B | A 听从 B 的指令 | `#78716c` (灰褐) |
| 观察 | **观** | A→B | A 注视/监视 B | `#a8a29e` (灰色) |
| 信任 | **信** | A→B | A 信任/依赖 B | `#16a34a` (绿) |
| 怜悯 | **怜** | A→B | A 同情 B 的处境 | `#2563eb` (蓝) |
| **血亲** | **亲** | A↔B | A 与 B 有血缘关系（不可逆） | `#9333ea` (紫) |
| **养育** | **养** | A→B | A 养育/抚养 B | `#d946ef` (粉紫) |

> **变更说明**：
> - 删除 `亲属` → 拆分为 `血亲`（双向，不可逆）和 `养育`（有方向）
> - `血亲` 渲染为双向线（无箭头），`养育` 渲染为单向箭头

### 2.2 关系动词化原则

所有关系类型均使用**单个汉字动词**（符合中文图表的简洁习惯）：
- 每个动词可直接作为关系线上的标签文字
- 悬停时线标签显示为 `怕` / `疑` / `害` 等单字，简洁清晰
- 侧栏详情中显示完整动词短语：`狂人 怕 大哥` / `大哥 害 妹子`

---

## 三、显示策略

### 3.1 悬停策略（当前逻辑修正）

**当前代码问题**（第229-259行 `paintLink`）：
```typescript
const isHighlighted = !hoveredNodeId ||
  start.id === hoveredNodeId || end.id === hoveredNodeId;
```
这导致悬停任意节点时，**所有**关联的线（无论方向）都高亮并显示文字。

**修正后策略**：

```
悬停节点 A 时：
  - 只显示 A→其他节点 的关系文字（source === A）
  - 不显示 其他节点→A 的关系文字
  - 所有与A相关的线保持可见（透明度0.7），但非A发出的线不显示标签文字
```

**代码修改要点**（`paintLink` 函数）：

```typescript
const paintLink = (link, ctx, globalScale) => {
  const start = typeof link.source === 'object' ? link.source : null;
  const end = typeof link.target === 'object' ? link.target : null;
  if (!start || !end) return;

  const color = relationColors[link.type] || '#78716c';

  // 悬停节点时，只高亮该节点发出的线
  const isFromHovered = hoveredNodeId && start.id === hoveredNodeId;
  const isToHovered = hoveredNodeId && end.id === hoveredNodeId;
  const isConnected = isFromHovered || isToHovered;

  // 线的透明度：从悬停节点出发→完全高亮；指向悬停节点→半高亮；无关→隐
  let alpha;
  if (!hoveredNodeId) {
    alpha = 0.7;           // 未悬停时所有线正常
  } else if (isFromHovered) {
    alpha = 0.9;           // 从悬停节点出发 → 最亮
  } else if (isConnected) {
    alpha = 0.25;          // 指向悬停节点 → 半隐（可见但不喧宾夺主）
  } else {
    alpha = 0.04;          // 无关 → 几乎消失
  }

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = alpha > 0.5 ? 2.5 / globalScale : 0.5 / globalScale;
  ctx.stroke();

  // ！！！关键：只在 从悬停节点出发 的线上显示文字
  if (isFromHovered) {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    ctx.font = `${16 / globalScale}px "Songti SC", ...`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#57534e';
    ctx.globalAlpha = 0.9;
    ctx.fillText(link.type, midX, midY - 6 / globalScale);
  }

  ctx.globalAlpha = 1;
};
```

### 3.2 侧栏关系列表修正

当前侧栏（第368-380行）显示所有关联关系，不分方向。建议改为：

```
悬停节点A时，侧栏只列出：
  A → 其他（源出关系）
  不列出 其他 → A（入向关系）
```

修正 `handleNodeClick` 或侧栏的筛选逻辑。

---

## 四、同对节点多条关系的排布策略

### 4.1 问题：当前实现

当狂人与大哥之间同时有 `惧怕` 和 `血亲` 两条关系时，两条线重叠在同一条直线上，标签文字也重叠。

### 4.2 解决方案：弧度偏移（Curvature Offsets）

对 `graph.links` 中的每条 link 添加 `curvature` 属性，在构建 link 数据时计算：

```typescript
// 在 graph useMemo 中
const links = graphData.relations.map(r => ({
  source: r.source,
  target: r.target,
  type: r.type,
  evidence: r.evidence,
}));

// 对同源同目标的多条线，分配不同的弧度
const curvatureMap = new Map();
links.forEach(link => {
  const key = `${link.source}|${link.target}`;
  const reverseKey = `${link.target}|${link.source}`;
  if (!curvatureMap.has(key)) curvatureMap.set(key, []);
  curvatureMap.get(key).push(link);
});

// 对每组同向多线分配弧度
curvatureMap.forEach((group, key) => {
  if (group.length === 1) {
    group[0].curvature = 0;  // 单线不用弯曲
  } else {
    const spread = 0.3; // 最大弯曲幅度
    const step = spread * 2 / (group.length - 1 || 1);
    group.forEach((link, i) => {
      // 中心对称：-0.3, 0, 0.3 或 -0.3, 0.3
      link.curvature = -spread + i * step;
    });
  }
});

// 反向线（A→B vs B→A）不冲突，各自独立
```

### 4.3 弧线渲染

在 `paintLink` 中，当 `curvature !== 0` 时绘制贝塞尔曲线：

```typescript
const paintLink = (link, ctx, globalScale) => {
  const start = typeof link.source === 'object' ? link.source : null;
  const end = typeof link.target === 'object' ? link.target : null;
  if (!start || !end) return;

  const curvature = link.curvature || 0;

  ctx.beginPath();
  if (Math.abs(curvature) > 0.01) {
    // 贝塞尔曲线
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const nx = -dy; // 法线方向
    const ny = dx;
    const len = Math.sqrt(nx * nx + ny * ny) || 1;
    const cpX = midX + curvature * nx / len * 60;  // 控制点偏移
    const cpY = midY + curvature * ny / len * 60;
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(cpX, cpY, end.x, end.y);

    // 文字放在曲线中点（控制点位置）
    if (shouldShowLabel) {
      ctx.fillText(link.type, cpX, cpY - 8 / globalScale);
    }
  } else {
    // 直线
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    // 文字放在中点
    if (shouldShowLabel) {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      ctx.fillText(link.type, midX, midY - 6 / globalScale);
    }
  }
  // ... stroke 等
};
```

### 4.4 箭头处理

有向线（怕、疑、害、从、观、信、怜、养）在终点处画箭头。
双向线（血亲、敌对）不画箭头，可用双色虚线或无箭头。

```typescript
const needsArrow = !['血亲', '敌对'].includes(link.type);
if (needsArrow) {
  // 在终点画箭头（沿曲线切线方向）
}
```

---

## 五、kr-graph.json 数据更新

### 5.1 relationTypes 更新

```json
{
  "relationTypes": {
    "怕": "A 恐惧/畏惧 B",
    "疑": "A 怀疑 B 有恶意",
    "害": "A 迫害/加害 B",
    "敌": "A 与 B 对立（双向敌意）",
    "从": "A 听从 B 的指令",
    "观": "A 注视/监视 B",
    "信": "A 信任/依赖 B",
    "怜": "A 同情/怜悯 B",
    "血亲": "A 与 B 有血缘关系",
    "养": "A 养育/抚养 B"
  }
}
```

### 5.2 relations 更新（替换所有关系类型）

| source | target | 原类型 | 新类型 | 备注 |
|--------|--------|--------|--------|------|
| 狂人 | 大哥 | 惧怕 | **怕** | 维持 |
| 狂人 | 大哥 | 亲属 | **血亲** | 改为血亲（双向） |
| 狂人 | 赵贵翁 | 怀疑 | **疑** | 维持 |
| 狂人 | 陈老五 | 服从 | **从** | 维持（但语义有争议） |
| 狂人 | 何先生 | 怀疑 | **疑** | 维持 |
| 陈老五 | 大哥 | 服从 | **从** | 维持 |
| 大哥 | 狂人 | 迫害 | **害** | 维持 |
| 大哥 | 何先生 | 信任 | **信** | 维持（改为单字） |
| 赵贵翁 | 狂人 | 敌对 | **敌** | 维持 |
| 赵家的狗 | 狂人 | 观察 | **观** | 维持 |
| 大哥 | 妹子 | 迫害 | **害** | 维持 |
| 狂人 | 年轻人 | 敌对 | **敌** | 维持 |
| 狂人 | 妹子 | 怜悯 | **怜** | 维持 |
| 母亲 | 大哥 | 服从 | **从** | 维持 |
| 狂人 | 佃户 | 怀疑 | **疑** | 维持 |
| 狂人 | 街上的女人 | 怀疑 | **疑** | 维持 |
| 母亲 | 狂人 | 亲属 | **血亲** | 改为双向血亲 |
| 狂人 | 母亲 | 怜悯 | **怜** | 维持 |
| 母亲 | 狂人 | (新) | **养** | 新增：母亲养育狂人 |
| 大哥 | 狂人 | (新) | **养** | 新增：大哥养育/抚养狂人（长兄如父） |

### 5.3 新增：血亲本身的不可逆约定

`血亲` 虽然是双向，但在数据中用一条记录表示即可（不需要两条方向相反的记录）。
`养` 是有方向的（长者→幼者），需要单独记录方向。

---

## 六、代码修改清单

| 文件 | 修改内容 | 优先级 |
|------|---------|--------|
| `public/kr-graph.json` | 更新 `relationTypes` 和 `relations` 中的类型名 | **高** |
| `app/novel/[slug]/page.tsx` | 更新 `relationColors` 颜色表（改 key 名） | **高** |
| `app/novel/[slug]/page.tsx` | `paintLink` 中实现方向性标签显示策略 | **高** |
| `app/novel/[slug]/page.tsx` | `graph` useMemo 中添加 curvature 计算逻辑 | **高** |
| `app/novel/[slug]/page.tsx` | `paintLink` 中实现贝塞尔曲线 + 文字偏移 | **高** |
| `app/novel/[slug]/page.tsx` | `paintLink` 中添加箭头绘制（终点） | **中** |
| `app/novel/[slug]/page.tsx` | 侧栏关系列表按方向筛选 | **低**（仅点击后使用） |

---

## 七、视觉参考

```
悬停 狂人 节点时：

  [狂人] ──怕──→ [大哥]
         ──血亲→
         ──疑──→ [赵贵翁]
         ──从──→ [陈老五]
         ──疑──→ [何先生]
         ──敌──→ [年轻人]
         ──怜──→ [妹子]
         ──怜──→ [母亲]

  [陈老五] ──从──→ [大哥]        （半透明，无标签）
  [赵贵翁] ──敌──→ [狂人]        （半透明，无标签）
  [赵家的狗]─观──→ [狂人]        （半透明，无标签）
   ...
```

**同向多线示例**（狂人→大哥同时有 `怕` 和 `血亲`）：

```
           ┌─ 怕 (曲线上凸)
  [狂人] ──┤                    [大哥]
           └─ 血亲 (曲线下凹)
```

**反向多线示例**（狂人→大哥的 `怕` 和 大哥→狂人的 `害`）：

```
  [狂人] ──怕──→ [大哥]
  [狂人] ←──害── [大哥]
  （两条线在直线上重叠但方向相反，各自有箭头，不冲突）
```
