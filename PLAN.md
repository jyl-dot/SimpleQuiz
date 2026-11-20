# PLAN.md · 刷题 Web 应用

> 唯一需求来源。冲突以本文档为准；有歧义先问。严格按「阶段」执行，每阶段停下等验收。字段名、路径、函数签名不得更改。

## 1. 项目

纯前端客观题刷题应用：**顺序/随机练习、错题本、收藏、计时、统计**，单选/多选，提交后显示对错与解析，进度与记录存 `localStorage`，刷新不丢，支持配图。

**只做**：顺序练习、随机练习、单选多选、对错解析、进度保留、上下题、切换模式、重新开始（二次确认）、进度显示、图片、错题本、收藏、计时、统计。
**不做**：考试、登录、后端、数据库、API、路由、填空、判断、代码判题、题库在线更新、错题专项练习会话。

## 2. 技术栈（版本不限）

Vite + Vue 3（`<script setup>`）+ 原生 CSS（`<style scoped>`）+ `localStorage`，npm。所有工具与依赖使用最新稳定版，不限制版本。

**禁止**：TypeScript、Tailwind、UI 库、Pinia/Vuex、vue-router、Axios、测试框架、图表库。

## 3. 目录结构

```text
quiz-app/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── images/
│   ├── manifest.webmanifest
│   └── sw.js
└── src/
    ├── main.js
    ├── App.vue                       # tab 导航 + 主题切换
    ├── data/questions.json
    ├── utils/
    │   ├── grade.js
    │   ├── storage.js                # session
    │   ├── records.js                # 答题记录
    │   ├── favorites.js              # 收藏
    │   ├── image.js
    │   ├── shuffle.js
    │   └── time.js                   # 时长格式化
    ├── components/
    │   ├── QuestionCard.vue
    │   └── QuestionList.vue          # 题目列表弹层
    └── views/
        ├── Practice.vue
        ├── WrongBook.vue
        ├── Favorites.vue
        └── Stats.vue
```

## 4. 数据模型

### 4.1 题库 `questions.json`

```json
{
  "id": "q001",
  "type": "single",
  "stem": "HTTP 默认端口是？",
  "stemImage": "/images/q001-stem.svg",
  "options": [
    { "key": "A", "text": "21" },
    { "key": "B", "text": "80", "image": "/images/q001-b.svg" }
  ],
  "answer": ["B"],
  "explanation": "HTTP 默认 80。",
  "explanationImage": "/images/q001-exp.svg"
}
```

约束：
- `id` 全局唯一，格式 `q` + 三位数字。
- `type` 仅 `"single"` / `"multiple"`。
- `options` ≥ 2，`key` 题内唯一（A/B/C/D）。
- `answer` 是 key 数组；`single` 长度必须为 1，`multiple` ≥ 1；每个 key 必须存在于 options。
- `stemImage` / `options[].image` / `explanationImage` **可选**。
- `stem`、`explanation` 允许空串。
- 图片统一 `/images/` 开头或 `http(s)` 外链；**禁止 base64 内联**（示例 SVG 除外）。

阶段 1 生成 **8～12 道**示例题（≥3 多选），至少 1 道带 `stemImage`、1 道带 `options[].image`；生成 2～3 个简单 SVG 到 `public/images/`。

### 4.2 练习进度 `localStorage` key：`quiz:session`（唯一）

```js
{
  version: 2,
  mode: "order",                        // 当前激活模式："order" | "random"
  sessions: {
    order: {
      ids: ["q001", "q002"],
      index: 0,
      answers: { "q001": ["B"] },
      submitted: { "q001": true },
      elapsedMs: 0                      // 该模式累计练习时长
    },
    random: null
  }
}
```

- `random.ids` 生成后**必须落盘**，禁止每次进页面重新 shuffle。
- `index` 越界 clamp。
- 非法/版本不符/缺 `sessions` → 返回 `null`，先备份到 `quiz:session:backup` 再初始化，**不得静默删除**。
- **version 1 → 2 迁移**：旧结构 `{ ids, index, answers, submitted }` 映射到 `sessions.order` 并补 `elapsedMs: 0`，`sessions.random = null`，`mode = 'order'`。

### 4.3 答题记录 `localStorage` key：`quiz:records`

```js
{
  "q001": {
    correct: 2,          // 累计答对次数
    wrong: 1,            // 累计答错次数
    lastCorrect: false,  // 最近一次是否答对；未作答为 null
    lastAnswer: ["A"],   // 最近一次提交的答案
    updatedAt: 1760000000000
  }
}
```

- 只在**提交答案**时更新（练习页、错题本、收藏页的作答都更新）。
- 初始无记录。

### 4.4 收藏 `localStorage` key：`quiz:favorites`

```js
["q001", "q003"]
```

- string 数组，按收藏先后顺序。
- 只保存存在的题目 id；读取时过滤题库中不存在的 id。

### 4.5 主题 `localStorage` key：`quiz:theme`

```js
"auto" | "light" | "dark"   // 缺省 auto
```

- `auto` 跟随系统 `prefers-color-scheme`；`light` / `dark` 强制对应主题。
- 仅保存用户手动选择；未选择时不写 storage。
- `index.html` 内联脚本在首屏渲染前读取并设置 `html[data-theme]`，避免闪白/闪黑。

## 5. 模块规格

### `utils/grade.js`

```js
export function grade(question, userAnswer) // → boolean
```

空/非数组 → `false`；两边 `sort().join(',')` 比较；不修改入参。

### `utils/storage.js`

```js
export function loadSession()        // → session | null（含 v1→v2 迁移）
export function saveSession(session) // → void
export function clearSession()       // → void
```

- `loadSession` 必须 `try/catch`；校验含 `version`/`mode`/`sessions`，否则 `null`。
- `saveSession` 失败只 `console.warn`。
- `clearSession` 只删 `quiz:session`。

### `utils/records.js`

```js
export function loadRecords()                       // → object
export function saveRecord(qid, patch)              // → void，合并写入
export function getRecord(qid)                      // → record | undefined
export function recordAnswer(question, ans)         // → boolean，判分并累加记录
```

- `saveRecord` 在原有基础上合并 `patch`，并写 `updatedAt: Date.now()`。
- 练习页、错题本、收藏页提交作答时统一调用 `recordAnswer`（内部先 `grade`，再累加 `correct` / `wrong` 并写 `lastCorrect` / `lastAnswer`），避免三处重复逻辑。

### `utils/favorites.js`

```js
export function loadFavorites()          // → string[]
export function isFavorite(qid)          // → boolean
export function toggleFavorite(qid)      // → string[]（返回最新列表）
```

- `loadFavorites` 读取失败返回 `[]`；过滤题库中不存在的 id。
- `toggleFavorite` 存在则删、不存在则追加到末尾。

### `utils/image.js`

```js
export function resolveImage(src) // → string
```

空 → `''`；`http(s)://` / `data:` 原样返回；否则用 `import.meta.env.BASE_URL` 拼接。

### `utils/shuffle.js`

```js
export function shuffle(arr) // → 新数组，不修改入参，Fisher–Yates
```

### `utils/time.js`

```js
export function formatDuration(ms) // → "HH:MM:SS"，不足 1 小时显示 "MM:SS"
```

### `components/QuestionCard.vue`

Props：`question`(必填)、`submitted`(默认 false)、`userAnswer`(默认 `[]`)、`favorite`(默认 false)、`showFavorite`(默认 false)。
Emits：`submit(payload: string[])`、`toggle-favorite()`。

行为：
1. `selected = ref([...userAnswer])`。
2. **不 `watch` question 重置**；切题靠父组件 `:key` 重建。
3. 点击选项：`submitted` 为 true 直接 return；单选替换，多选 toggle。
4. 提交按钮：`selected.length === 0` 时 disabled；点击 `emit('submit', [...selected])`。
5. 选项状态优先级：未提交且选中 → `selected`；已提交且在答案中 → `correct`；已提交且选中但不在答案中 → `wrong`；其他默认。
6. 已提交显示：`✓ 回答正确` / `✗ 回答错误`、`正确答案：A、C`、解析、解析图（非空才显示）。
7. 已提交隐藏提交按钮。
8. `showFavorite` 为 true 时头部显示收藏按钮，点击 `emit('toggle-favorite')`；文案 `★ 已收藏` / `☆ 收藏`。
9. 图片渲染：`resolveImage`；所有 `<img>` 加 `@error="onImgError"`，失败隐藏并 `console.warn`，不影响作答。样式：题干/解析图 `max-width:100%; max-height:240px`；选项图 `max-height:80px`；`object-fit: contain`。
10. 提供具名插槽 `nav`。
11. 无障碍：选项容器单选 `role="radiogroup"`、多选 `role="group"`；选项 `role="radio"` / `"checkbox"`、`aria-checked`、`tabindex="0"`，Enter/Space 可选择；结果区 `aria-live="polite"`；收藏按钮 `aria-pressed`。
12. 性能：题干图不懒加载；选项图/解析图 `loading="lazy" decoding="async"`；结果区淡入。
13. 颜色全部走 CSS 变量（见「体验增强」），组件内不写死颜色。

样式：`<style scoped>`，选中/正确/错误三色（蓝/绿/红）。

### `components/QuestionList.vue`

Props：`ids`、`submitted`、`index`。Emits：`select(i)`、`close()`。

- 弹层展示全部题号：已答（淡蓝）、答错（淡红）、当前（蓝底；当前且答错保留淡红底 + 蓝色外环）。
- 头部显示总题数与当前题号，底部显示完成数；点击题号跳转并关闭。
- `role="dialog" aria-modal="true"`，打开时锁定背景滚动、聚焦关闭按钮；Esc 关闭；Tab/Shift+Tab 焦点陷阱；关闭后焦点还原到触发按钮。
- 移动端（≤480px）全屏展示。

### `views/Practice.vue`

状态：`session = ref({ version:2, mode:'order', sessions:{ order:null, random:null } })`。

Computed：`qMap`、`activeSession`、`current`、`curAnswer`、`curSubmitted`、`curFavorite`、`total`、`answeredCount`、`elapsedText`（`formatDuration(activeSession.elapsedMs)`）。

方法：
- `persist()` → `saveSession(session.value)`。
- `createSession(mode)`：`ids = mode === 'random' ? shuffle(allIds) : allIds`，返回 `{ ids, index:0, answers:{}, submitted:{}, elapsedMs:0 }`。
- `init()`：`loadSession()` 合法 → 修复两模式一致性后赋值并 persist；否则新建 `order`、`random=null`、`mode='order'`。`onMounted(init)`。
- `switchMode(m)`：`m === mode` 直接 return；`sessions[m]` 为 null 则 `createSession(m)`；更新 `mode`，persist。
- `onSubmit(ans)`：写 `activeSession.answers[qid]`、`submitted[qid]=true`；同时用第 5 节 `records.js` 的推荐调用更新记录；persist。
- `toggleFav()`：`toggleFavorite(current.id)`，更新 `curFavorite`。
- `go(step)`：越界 return，更新 `activeSession.index`，persist。
- `restart()`：`confirm('确定重新开始？当前模式的进度会被清空。')`，取消 return；确认则 `sessions[mode] = createSession(mode)`，persist。**不调用 `clearSession`**，不动另一模式。

**计时器**：
- `onMounted` 启动 `setInterval(1000)`，每秒给 `sessions[mode].elapsedMs += 1000`。
- 每 5 次 tick 调一次 `persist()`；`onUnmounted` 清 interval 并 `persist()`。
- 不精确到毫秒，后台标签页节流导致的偏差可接受，文档不追求精确。

**一致性修复（init 内对 `order` 和 `random` 分别执行，null 跳过）**：

```js
const validIds = s.ids.filter(id => qMap.has(id))
const missingIds = allIds.filter(id => !validIds.includes(id))
s.ids = mode === 'random' ? validIds : [...validIds, ...missingIds]
s.index = Math.min(Math.max(s.index, 0), Math.max(s.ids.length - 1, 0))
s.elapsedMs = Number.isFinite(s.elapsedMs) ? s.elapsedMs : 0
// 清理 answers / submitted 中已不存在的 id
```

随机模式 ids 被清空（题库全变）→ 重置为 `createSession('random')`。

模板：
- 工具栏：`[顺序练习] [随机练习]`（当前高亮）+ `第 {{ index+1 }} / {{ total }} 题 · 已答 {{ answeredCount }}` + `⏱ {{ elapsedText }}` + 「题目列表」（打开 QuestionList 弹层）+ 「重新开始」。
- `QuestionCard` 带 `:key="current.id"`、`:show-favorite="true"`、`:favorite="curFavorite"`，`nav` 插槽放「上一题/下一题」。
- `current` 为空显示「题库为空」。

### `views/WrongBook.vue`

- 数据：`const wrongList = computed(() => questions.filter(q => getRecord(q.id)?.lastCorrect === false))`。
- 列表项展示：题干（截断）、`错误 {{ rec.wrong }} 次`、`最近错选 {{ rec.lastAnswer.join('、') }}`。
- 点击列表项展开 `QuestionCard` 作答（`:key="q.id"`、`:show-favorite="true"`）。
- 作答提交：更新 records；若答对，该题 `lastCorrect` 变 true，自动从列表移除；同时可切换收藏。
- 空列表显示「暂无错题」。
- 不做练习会话、不写 session。

### `views/Favorites.vue`

- 数据：`const favList = computed(() => loadFavorites().map(id => qMap.get(id)).filter(Boolean))`。
- 列表项展示题干 + 收藏时间不展示；点击展开 `QuestionCard` 作答。
- 提交答案：更新 records，不改收藏状态。
- 点收藏按钮取消收藏 → 从列表移除。
- 空列表显示「暂无收藏」。
- 不写 session。

### `views/Stats.vue`

只读统计页，数据来自 `records`、`session`、`favorites`、题库。展示：

1. **总览**：题库总数、已作答数（有 records 的题数）、未作答数、已掌握数（`lastCorrect === true`）、错题数（`lastCorrect === false`）、收藏数。
2. **答题次数**：累计作答次数 = `Σ(correct + wrong)`；累计正确率 = `Σcorrect / Σ(correct + wrong)`（分母为 0 显示 `--`）。
3. **练习时长**：顺序练习时长、随机练习时长（`formatDuration`），两模式均未开始显示 `--`。
4. **按模式进度**：顺序/随机各自 `已答 / 总数`（`sessions[m]` 为 null 显示「未开始」）。

不引入图表库；用普通卡片 + 数字展示。数字每次进入页面重新计算即可（`computed` 读 storage）。

### `App.vue`

```vue
<script setup>
import { ref } from 'vue'
import Practice from './views/Practice.vue'
import WrongBook from './views/WrongBook.vue'
import Favorites from './views/Favorites.vue'
import Stats from './views/Stats.vue'

const TABS = [
  { key: 'practice', label: '练习' },
  { key: 'wrong', label: '错题本' },
  { key: 'fav', label: '收藏' },
  { key: 'stats', label: '统计' },
]
const tab = ref('practice')
</script>

<template>
  <div class="app">
    <nav class="tabs">
      <button
        v-for="t in TABS"
        :key="t.key"
        :class="{ active: tab === t.key }"
        @click="tab = t.key"
      >{{ t.label }}</button>
    </nav>

    <Practice v-if="tab === 'practice'" />
    <WrongBook v-else-if="tab === 'wrong'" />
    <Favorites v-else-if="tab === 'fav'" />
    <Stats v-else />
  </div>
</template>
```

- 只做 tab 切换与主题控制，不放业务逻辑。
- 切走 `Practice` 会触发其 `onUnmounted`，自动停计时并 persist。切回时重新 `onMounted` 恢复。
- 标签文案中文。
- 实际实现另有：主题三态切换按钮、`tablist` / `tab` / `tabpanel` 语义、方向键切换 tab、视图淡入淡出（见下文「体验增强」）。

### `main.js`

```js
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')

// 仅生产构建注册 Service Worker，dev 不受缓存干扰
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(err => console.warn('Service Worker 注册失败', err))
  })
}
```

### 体验增强（深色模式 / PWA / 无障碍）

**深色模式**
- `App.vue` 非 scoped 样式定义 CSS 变量（`--bg --card --border --text --blue --green --red ...`）；`:root` 为浅色值，`html[data-theme="dark"]` 覆盖为深色值；各组件样式只引用变量。
- 顶部主题按钮三态循环 `auto → light → dark → auto`，同步更新 `html[data-theme]`、`meta[name="theme-color"]` 与 `quiz:theme`。
- `auto` 时监听 `matchMedia('(prefers-color-scheme: dark)')` 变化并即时切换。

**PWA**
- `public/manifest.webmanifest`：`name` / `short_name` / `start_url` / `standalone` / 192+512 图标（`any maskable`）。
- `public/sw.js`：安装时预缓存首页及 `index.html` 引用的构建产物；导航 network-first，静态资源 cache-first，均带离线回退；激活时清理旧缓存。
- `index.html` 声明 manifest、favicon、apple-touch-icon 与 apple-mobile-web-app-*（iOS 独立窗口）；仅生产构建注册 SW。

**无障碍与动效**
- tab 使用 `role="tablist"` / `role="tab"` / `aria-selected` / roving tabindex，支持 ←/→/Home/End；视图 `role="tabpanel"`。
- QuestionList 弹层：打开聚焦关闭按钮，Tab/Shift+Tab 焦点陷阱，Esc 关闭，关闭后焦点还原。
- 全局 `prefers-reduced-motion: reduce` 时禁用过渡/动画；`:focus-visible` 显示焦点环。
- 图片来源见 QuestionCard 规格；不使用外部图标库（PWA 图标为静态 PNG）。

## 6. 阶段流程（每阶段停下等验收）

**阶段 1 · 初始化**
- `npm create vite@latest quiz-app -- --template vue`
- 清理默认模板；建目录和空占位文件
- 生成合规题库 + `public/images/` 示例 SVG
- ✅ `npm run dev` 无报错无 warning；题库可 import；图片可访问。

**阶段 2 · 工具函数**
- 实现 `grade.js`、`storage.js`、`records.js`、`favorites.js`、`image.js`、`shuffle.js`、`time.js`
- 在 Practice 加临时自测按钮（阶段 6 删）
- ✅ 判分用例通过；session save→load 等价；v1 结构能迁移到 v2；records 合并正确；favorites toggle 正确；`resolveImage` 正确；`shuffle` 不修改入参；`formatDuration(0)==='00:00'`、`formatDuration(3661000)==='01:01:01'`。

**阶段 3 · 卡片组件**
- 实现 `QuestionCard.vue` 完整满足规格
- ✅ 单选互斥、多选 toggle、空选 disabled、`submitted=true` 时上色/显示对错解析图/提交按钮消失/点击无反应；`showFavorite` 控制收藏按钮显隐且点击触发事件；图片 404 时隐藏不崩。

**阶段 4 · 练习页 + 计时**
- 实现 `Practice.vue`
- 保留临时自测按钮
- ✅ 顺序/随机双模式独立进度；随机顺序刷新不变；重新开始只重置当前模式；计时器每秒递增、切到错题本再切回后时长继续累计、刷新后时长不归零。

**阶段 5 · 错题本 / 收藏 / 统计**
- 实现 `WrongBook.vue`、`Favorites.vue`、`Stats.vue`
- ✅ 练习中答错 → 错题本出现该题；在错题本答对 → 自动移出；收藏在练习页/错题本/收藏页三处状态同步；统计数字与 records/session/favorites 一致。

**阶段 6 · 整合与健壮性**
- 实现 `App.vue`、`main.js`；删除临时自测按钮
- 逐条验证第 7 节边界，修复问题
- ✅ 输出「验收自检表」：问题 + 修复方式 + 验证方式

**阶段 7 · 体验增强**
- 深色模式、PWA、`recordAnswer` 去重、动效与无障碍
- ✅ 主题三态与持久化正确；manifest/SW 可安装且离线可用；答题记录行为与原实现等价；减少动态生效；焦点陷阱与键盘作答正常。

## 7. 边界情况（必须处理）

1. 空答案提交：按钮 disabled + `grade` 兜底 false。
2. 已提交锁定：`choose()` 首行判断 `submitted` return。
3. 切题/切模式重置：只靠父组件 `:key="current.id"`，子组件不 watch。
4. `localStorage` 不可用：所有写入静默失败，页面不报错不白屏。
5. 题库为空：练习页显示「题库为空」；错题本/收藏/统计正常显示空态。
6. 题库 id 增删：两模式分别修复；order 追加新题，random 不追加；index clamp；records/favorites 里不存在的 id 读取时过滤。
7. 题库自查：id 不重复、答案 key 在 options 内、single 答案长度 = 1。
8. 非法 type：按单选处理。
9. 快速连点：提交后按钮消失天然防重。
10. `restart` 只重置当前模式，不动另一模式，不调用 `clearSession`。
11. 图片 404：`@error` 隐藏 + warn，不影响作答。
12. 纯图题：`stem` 可为提示语。
13. 子路径部署：`resolveImage` 必须用 `BASE_URL` 拼接。
14. 随机顺序持久化：只有 `restart('random')` 才重新洗牌。
15. 两模式进度完全独立。
16. **计时**：切 tab 时 `Practice` 卸载自动停表并 persist；切回继续累计；刷新后从 `elapsedMs` 恢复，不归零；`elapsedMs` 非数字时按 0 处理。
17. **错题本联动**：练习页答错 → 错题本出现；错题本答对 → 自动移出；错题本里未作答直接离开不产生记录。
18. **收藏联动**：任意页面切换收藏状态后，其他页面进入时读取最新值（每次进入页面重新读 storage，不用全局状态）。
19. **统计空态**：无任何 records 时正确率显示 `--`，不出现 `NaN` 或除零。
20. **v1 → v2 迁移**：旧用户首次打开不丢进度，旧数据先备份到 `quiz:session:backup`。
21. **主题存储异常**：`quiz:theme` 非法 / `localStorage` 不可用 → 回退 `auto`，不白屏。
22. **减少动态**：`prefers-reduced-motion: reduce` 时过渡与动画全部关闭。
23. **离线**：已安装 SW 后断网刷新，页面与已有记录仍正常可用。
24. **SW 缓存版本**：激活新 SW 时清理旧缓存，避免旧构建产物堆积。

## 8. 代码风格

- 全 `<script setup>` + Composition API，禁用 Options API。
- 命名：变量 `camelCase`、常量 `UPPER_SNAKE_CASE`、组件 `PascalCase`。
- 不用 `var`；优先 `const`。
- 字符串单引号，模板属性双引号。
- 不留 `console.log`（`console.warn` 用于可恢复错误可保留）。
- 注释只解释「为什么」。
- 用户可见文案全部中文。
- 单个 `.vue` 文件超过 200 行考虑拆分，但本期不为拆而拆。

## 9. 禁止事项

1. 不引入第 2 节之外的依赖（尤其图表库、时间库）。
2. 不改第 3 节路径、第 4 节字段名。
3. 不加路由/状态库/UI 库/CSS 框架。
4. 不做考试、错题专项练习会话、题库在线更新——即使"顺手"也不行。
5. 不用 `sessionStorage`/`IndexedDB`/cookie 替代 `localStorage`。
6. 题库不做运行时 `fetch`（构建时打包）。
7. 不写单元测试文件。
8. `App.vue` 只做 tab 切换，不放业务逻辑。
9. `QuestionCard` 不加 `watch` 重置内部状态。
10. 不改存储 key 或结构而不带 `version` 迁移。
11. 题库图片不用 base64 内联（示例 SVG 除外）。
12. 随机模式不得每次进入都重新 shuffle，必须持久化 ids。
13. 两模式进度不得共享或互相覆盖。
14. `restart` 不得调用 `clearSession`。
15. 错题本/收藏页作答**不写 session**，只写 records。
16. 统计页只读，不得修改任何存储。
17. 计时不得使用 `performance.now()` 做跨刷新恢复（刷新会重置起点）；只用累加 `elapsedMs`。
18. 不得为错题本/收藏页新增独立练习会话。

## 10. AI 工作流

- 每阶段开始先**复述**任务 + 将创建/修改的文件列表，等用户确认。
- 每写完一个文件，说明对应第 5 节哪一条、是否全部满足。
- 文档未覆盖的情况**先问**，不自行扩展。
- 发现文档矛盾，指出并请用户裁决。
- 阶段 6 输出验收自检表。

## 11. 未来扩展（本期不实现，设计上不阻碍）

错题专项练习 → `sessions` 加 `wrong` key + `createSession` 支持自定义 ids；更多统计维度 → Stats 增加按题型/标签分组；导出/导入进度 → 新增 `utils/export.js`，序列化三个 key 为 JSON；运行时题库 → 移到 `public/` 并改 `init` 为 `await fetch`。