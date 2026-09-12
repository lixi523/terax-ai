# i18n 实施计划

> Terax 多语言支持设计与分阶段推进方案。
> 目标：将所有硬编码 UI 字符串替换为 `t('key')` 调用，实现运行时语言切换。

---

## 1. 范围与目标

| 目标 | 状态 | 备注 |
|------|------|------|
| 运行时语言切换（无需重启） | 计划中 | 通过 `i18next.changeLanguage()` |
| 类型安全的翻译键 | 计划中 | `i18next-typescript` 生成类型 |
| 初始语言：英语（源语言）、简体中文 | 计划中 | zh-CN 作为首个目标语言 |
| 可扩展支持社区贡献 | 计划中 | 结构兼容 Crowdin/Weblate |
| `.tsx` 中**零硬编码用户可见字符串** | 计划中 | 包含 `title`、`placeholder`、`aria-label`；**排除技术术语、提供商名称、主题名称** |
| CI 门禁防止回归 | 计划中 | CI 中运行 `pnpm i18n:check` |

**v1 非目标：**
- RTL 布局支持（阿拉伯语、希伯来语）
- 基础 ICU 之外的复数规则
- 按语言环境的日期/数字格式化（使用浏览器默认值）
- 终端输出 / Shell 消息翻译
- AI 生成内容翻译
- Tauri 原生对话框（文件选择器、消息框）
- **技术术语、AI 提供商名称、编辑器主题名称、快捷键提示的翻译**（标记为 `non-translatable`）

---

## 2. 技术选型

| 层级 | 选择 | 理由 |
|------|------|------|
| 运行时 | `i18next` + `react-i18next` | 成熟、可摇树、TypeScript 优先 |
| 类型安全 | `i18next-typescript` | 生成带键名自动补全的 `t` 函数 |
| 语言检测 | 自定义检测器 | Tauri store → localStorage → navigator → en |
| 持久化 | Tauri store (`@tauri-apps/plugin-store`) | 随重启持久化，与设置同步 |
| 提取 | Babel AST 扫描器（自定义） | 处理 JSX 文本、`title`、`placeholder`、`aria-label` |
| 校验 | 自定义脚本 | CI 检查缺失键 |

**包体积影响：**

| 组件 | 大小 (gzipped) |
|------|----------------|
| i18next core | ~5 kB |
| react-i18next | ~3 kB |
| 语言检测器 | ~2 kB |
| en.json (内联) | ~15 kB |
| zh-CN.json (懒加载) | ~20 kB |
| **初始总计** | **~25 kB** |
| **含 zh-CN 总计** | **~45 kB** |

> **注**：包体积影响可接受（~0.5% of 7-8 MB 目标）。非默认语言按需加载。

---

## 3. 架构设计

```
src/
├── i18n/
│   ├── index.ts                 # i18next 初始化，导出 `t`、`useTranslation`
│   ├── resources/
│   │   ├── en.json              # 源语言文件（所有键，构建时内联）
│   │   └── zh-CN.json           # 翻译文件（懒加载）
│   ├── types.ts                 # 由 i18next-typescript 生成
│   ├── detector.ts              # 自定义检测器（settings store → localStorage → navigator）
│   └── utils.ts                 # 辅助函数：`tRaw`、`namespace` 等
├── modules/
│   ├── settings/
│   │   └── sections/            # 语言选择器 UI
│   │       └── GeneralSection.tsx
│   └── header/
│       └── SearchInline.tsx     # 迁移示例目标
└── components/                  # 所有组件从 '@/i18n' 导入 `t`
```

**初始化顺序（关键）：**
```
1. main.tsx 加载
2. Tauri 异步初始化：`await invoke("pty_close_all")`、`await initLaunchDir()`
3. i18n.init() 同步调用（在 Tauri 初始化之后、任何渲染之前）
4. ReactDOM.createRoot().render(<App />)
5. App 从 settings store 或检测器读取持久化的语言环境
```

> **约束**：现有 `main.tsx` 第 23-26 行有强制性的异步 Tauri 调用。i18n **必须在它们之后、React 渲染之前**初始化，以避免 FOUC。

**懒加载策略：**
```ts
// src/i18n/index.ts
import { enJson } from './resources/en.json';

const resources = {
  en: { translation: enJson },           // 构建时内联
  'zh-CN': {                           // 按需懒加载
    translation: () => import('./resources/zh-CN.json'),
  },
};
```

**语言环境持久化：** 复用 `src/modules/settings/store.ts` 中现有的 `LazyStore`：
```ts
// 在 store.ts defaults 中新增：
locale: 'system' as 'system' | 'en' | 'zh-CN',

// 在 GeneralSection.tsx 中：
const { locale, setLocale } = useSettingsStore(); // 与其他设置共用同一 store
```
无需新 store —— 与主题、编辑器偏好等一同持久化。

---

## 4. 翻译键命名约定

```
<feature>.<section>.<element>[.<variant>]
```

| 示例 | 含义 |
|------|------|
| `settings.general.language.label` | 语言下拉框标签 |
| `settings.general.language.option.system` | "System" 选项 |
| `terminal.tab.closeConfirm.many` | "Close {count} tabs?" |
| `ai.composer.placeholder` | Composer 输入框占位符 |
| `commandPalette.search.placeholder` | "Search commands..." |
| `common.actions.save` | 通用 "Save" |
| `common.actions.cancel` | 通用 "Cancel" |
| `header.search.placeholder` | "Search (⌘K)" |

**规则：**
- 小写、点分隔、kebab-case 段
- 按功能/模块分组，而非按页面
- 共享动词/名词复用 `common.*`
- 插值：`t('key', { count: 3 })` → JSON 中用 `{count}`
- 值中不包含 HTML（富文本用组件实现）
- 保持键名稳定：重命名时必须同步更新所有语言文件

---

## 5. 资源文件结构

`src/i18n/resources/en.json`（源语言文件）：
```json
{
  "common": {
    "actions": { "save": "Save", "cancel": "Cancel", "confirm": "Confirm" },
    "status": { "loading": "Loading…", "error": "Error", "none": "None" }
  },
  "header": {
    "search": { "placeholder": "Search ({{shortcut}})", "gitPlaceholder": "Git search" },
    "window": { "close": "Close", "minimize": "Minimize", "maximize": "Maximize" }
  },
  "settings": {
    "general": {
      "language": {
        "label": "Language",
        "option": { "system": "System", "en": "English", "zh-CN": "简体中文" }
      },
      "theme": { "label": "Theme", "background": "Background" }
    },
    "editor": { "fontSize": "Font size", "vimMode": "Vim mode" }
  },
  "terminal": {
    "tab": {
      "closeConfirm": { "one": "Close tab?", "many": "Close {{count}} tabs?" },
      "new": "New Terminal",
      "newBlock": "New Block"
    }
  },
  "ai": {
    "composer": { "placeholder": "Ask anything…" },
    "provider": { "openaiCompatible": "OpenAI Compatible" }
  }
}
```

`zh-CN.json` 结构镜像，值为翻译文本。

---

## 6. 字符串清单分析

### 现状（2026-09 统计）

| 模块 | 总字符串数 | **可翻译** | 非可翻译 |
|------|------------|------------|----------|
| `src/modules/settings/store.ts` | ~280 | ~120 | ~160 (提供商名、主题名、技术术语) |
| `src/modules/terminal/` | ~2,200 | ~400 | ~1,800 (ANSI 码、Shell 名、技术术语) |
| `src/modules/ai/` | ~2,500 | ~600 | ~1,900 (提供商/模型名、工具规范) |
| `src/modules/header/` | ~50 | ~45 | ~5 |
| `src/modules/tabs/` | ~80 | ~75 | ~5 |
| `src/modules/explorer/` | ~100 | ~90 | ~10 |
| `src/modules/source-control/` | ~150 | ~130 | ~20 |
| `src/components/ui/` | ~10 | ~10 | 0 |
| **总计** | **~5,370** | **~1,470** | **~3,900** |

### 字符串分类

1. **UI 标签**（按钮文本、菜单项、工具提示） - ~1,200 可翻译
2. **占位符**（输入提示） - ~50
3. **ARIA 标签**（无障碍） - ~70
4. **状态消息**（加载、错误、空状态） - ~150
5. **技术术语**（提供商名、文件类型、ANSI） - **非可翻译**
6. **主题名称**（Kanagawa, Dracula 等） - **非可翻译**

> **规则**：仅翻译面向用户的 UI 文案。技术标识符、品牌名、标准化术语保持英文。在 `en.json` 中用 `"__nonTranslatable": ["openai", "anthropic", "kanagawa", "tokyo-night", "pty", "webgpu", ...]` 标记。

---

## 7. 分阶段实施计划

### Phase 0 — 基础设施（5 天）

| 任务 | 负责人 | 交付物 |
|------|--------|--------|
| 添加依赖：`i18next`、`react-i18next`、`i18next-typescript` | Dev | `package.json` |
| 创建 `src/i18n/index.ts`（含初始化与自定义检测器） | Dev | 可用的 i18n 实例 |
| 创建 `src/i18n/resources/en.json` 骨架（含 `__nonTranslatable`） | Dev | 键结构 |
| 添加 `i18next-typescript` 构建步骤（`pnpm i18n:types`） | Dev | `src/i18n/types.d.ts` |
| **修改 `src/main.tsx`：在 Tauri 异步初始化后、渲染前插入 i18n.init()** | Dev | 无 FOUC、顺序正确 |
| **向 settings `LazyStore` defaults 新增 `locale` 字段** | Dev | 持久化生效 |
| 编写 POC：迁移 `SearchInline.tsx`（Header 搜索框） | Dev | 可工作示例 |
| 验证包体积影响 + 懒加载工作 | Dev | 记录在案 |

**验收：** 应用启动，`t('common.actions.save')` 返回 `"Save"`，语言切换可持久化。

---

### Phase 1 — 核心 UI 外壳（3 天）

迁移**高可见度、低复杂度**的表层组件：

| 模块 | 文件数 | 预估键数 | 预估工时 |
|------|--------|----------|----------|
| Header | 2 | ~50 | 0.5d |
| Tab bar | 2 | ~80 | 0.5d |
| Status bar | 2 | ~30 | 0.5d |
| Command palette | 2 | ~40 | 0.5d |
| shadcn/ui 对话框 | 3 | ~15 | 0.25d |
| Settings 外壳 | 1 | ~20 | 0.25d |

**流程：** 每模块一个 PR。每个 PR：
1. 提取字符串 → 加入 `en.json`
2. 替换为 `t('key')`
3. 补充 `zh-CN.json` 翻译
4. 运行 `pnpm i18n:types` 更新类型
5. 人工视觉核对

---

### Phase 2 — Settings 面板（4 天）

Settings 约 280 个键。逐节迁移：

| 节 | 文件数 | 预估键数 |
|------|--------|----------|
| General（语言、主题、启动） | 4 | 60 |
| Editor（字体、Vim、格式化器、LSP） | 6 | 90 |
| Terminal（Shell、光标、滚动历史） | 5 | 80 |
| AI（提供商、模型、Agent） | 8 | 100 |
| Shortcuts | 3 | 40 |
| Themes | 3 | 35 |
| Updates / About | 2 | 15 |

**策略：** 结对编程，或每人认领一节。

---

### Phase 3 — Editor 与 Terminal（5 天）

| 区域 | 文件数 | 预估键数 | 备注 |
|------|--------|----------|------|
| Editor pane（工具栏、Diff） | 8 | 70 | |
| Terminal block（输入、搜索） | 6 | 55 | 仅 Block UI |
| Ghostty 无障碍输出 | 1 | 10 | 可选 |
| Source control panel | 5 | 65 | |
| File explorer | 4 | 45 | |

---

### Phase 4 — AI 与高级功能（3 天）

| 区域 | 文件数 | 预估键数 |
|------|--------|----------|
| AI chat / composer | 7 | 80 |
| Agent launcher | 4 | 50 |
| Preview pane | 3 | 25 |
| Notifications / toasts | 2 | 20 |
| Dialogs | 4 | 35 |

---

### Phase 5 — 收尾与 CI（3 天）

| 任务 | 详情 |
|------|------|
| Settings → General 语言选择器 | 持久化到 settings store，热重载 |
| `pnpm i18n:check` 脚本 | 任意语言缺键即失败 |
| CI job：`pnpm i18n:check` + typecheck | 阻断回归 PR |
| 文档贡献流程 | 更新 `CONTRIBUTING.md` |
| 检测器默认列表加入 `zh-CN` | |

---

## 8. 迁移工具链

### 8.1 提取脚本

```bash
# scripts/i18n-extract.ts
// 使用 Babel AST 扫描 .tsx 文件
// 识别：
//   - JSX 文本子节点：<span>Search</span>
//   - title 属性：<Button title="Close" />
//   - placeholder 属性：<Input placeholder="Search..." />
//   - aria-label 属性：<button aria-label="Close" />
// 输出 CSV 供人工审核 → 合入 en.json
```

**用法：**
```bash
pnpm i18n:extract --module header   # 仅提取 header 模块
pnpm i18n:extract --all             # 提取所有模块
```

### 8.2 校验脚本（CI）

```bash
# scripts/i18n-validate.ts
// - 加载所有语言 JSON
// - 确保所有语言键集合一致
// - 未使用键警告（代码中未引用）
// - 缺失插值报错
```

**CI 集成：**
```yaml
# .github/workflows/i18n-check.yml
jobs:
  i18n-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm i18n:check
```

### 8.3 开发辅助

```ts
// src/i18n/utils.ts
export function tRaw(key: string, opts?: TOptions): string {
  return i18n.t(key, opts);
}

export function namespace(ns: string) {
  return (key: string, opts?) => t(`${ns}.${key}`, opts);
}

// 组件中使用：
const t = namespace('settings.editor');
<button>{t('fontSize')}</button>
```

---

## 9. TypeScript 集成

```json
// package.json
{
  "scripts": {
    "i18n:types": "i18next-typescript --input src/i18n/resources/en.json --output src/i18n/types.d.ts",
    "i18n:check": "ts-node scripts/i18n-validate.ts",
    "i18n:extract": "ts-node scripts/i18n-extract.ts"
  }
}
```

生成的 `types.d.ts`：
```ts
declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false;
    resources: {
      common: { actions: { save: string; cancel: string } };
      settings: { general: { language: { label: string } } };
      // ...
    };
  }
}
```

现在 `t('settings.general.language.label')` 具有完整的类型提示与自动补全。

---

## 10. 语言选择器 UX

**位置：** Settings → General → Language

```tsx
// src/modules/settings/sections/GeneralSection.tsx
import { useSettingsStore } from '@/modules/settings/store';
const { t } = useTranslation();
const { locale, setLocale } = useSettingsStore(); // 复用现有 LazyStore

<SettingRow title={t('settings.general.language.label')}>
  <Select value={locale} onValueChange={setLocale}>
    <SelectItem value="system">{t('settings.general.language.option.system')}</SelectItem>
    <SelectItem value="en">{t('settings.general.language.option.en')}</SelectItem>
    <SelectItem value="zh-CN">{t('settings.general.language.option.zh-CN')}</SelectItem>
  </Select>
</SettingRow>
```

**行为：**
- `system` → 跟随系统语言（通过检测器），实时更新
- 显式选择 → 持久化到**现有 settings LazyStore**，覆盖系统设置
- 通过 `i18next.changeLanguage()` 即时生效

---

## 11. 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 字符串总数 > 5000 | 长尾迁移 | 按模块分期、并行推进 |
| 动态字符串（模板字面量） | 遗漏键 | Biome 规则禁止 JSX 中带插值的模板字面量 |
| 第三方库（toast、dialog） | 未翻译 | 封装库调用并套 `t()` |
| Tauri 原生菜单/对话框 | v1 范围外 | 记录限制；后续用 `tauri-plugin-i18n` |
| 翻译滞后 | zh-CN 过期 | CI 校验 + `i18n:extract` 发现新键 |
| 包体积膨胀 | +45 kB 总计 | 可接受；非默认语言懒加载 |
| 运行时性能 | 额外函数调用 | i18next 缓存翻译；开销可忽略 |

---

## 12. 工时估算

| 阶段 | 人天 | 可并行 |
|------|------|--------|
| 0 Foundation | 5 | 否 |
| 1 Core Shell | 3 | 是（按模块） |
| 2 Settings | 4 | 是（按节） |
| 3 Editor/Terminal | 5 | 是 |
| 4 AI/Advanced | 3 | 是 |
| 5 Polish/CI | 3 | 否 |
| **总计** | **23** | **~13 日历天（2 人并行）** |

> **注**：Phase 0 修正 +2 天。可翻译键 ~1,470（而非 5,370）使 Phase 1-4 实际工作量略减。

---

## 13. 验收标准（各阶段）

- [ ] 目标文件全部使用 `t('key')` —— 零硬编码用户可见字符串
- [ ] `en.json` 与 `zh-CN.json` 键集合完全一致
- [ ] `pnpm i18n:check` 通过
- [ ] `pnpm check-types` 通过（含 i18n 类型）
- [ ] 手工冒烟测试：切换语言 → 所有文本即时更新
- [ ] 无 i18next 控制台警告（缺键）
- [ ] 包体积在预算内（+45 kB 上限）

---

## 14. v1 后扩展

- Crowdin / Weblate 集成支持社区翻译
- RTL 支持（阿拉伯语、希伯来语）
- 按语言环境的字体回退（Noto Sans CJK 等）
- AI 协助翻译 PR 工作流
- 按语言环境的快捷键提示
- `tauri-plugin-i18n` 支持原生对话框

---

## 15. 架构决策记录（ADR）

### ADR-001：i18n 初始化顺序
- **决策**：`i18n.init()` 在 Tauri 异步初始化（`invoke("pty_close_all")`、`initLaunchDir()`）**之后**、**React 渲染之前**运行
- **理由**：现有 `main.tsx` 有不可移动的强制异步调用；i18n 必须在首屏绘制前就绪以避免 FOUC
- **状态**：已接受

### ADR-002：语言环境持久化
- **决策**：复用现有 settings `LazyStore`（`src/modules/settings/store.ts`）；在 defaults 中新增 `locale` 字段
- **理由**：避免新 store，单一事实来源，随重启持久化，与其他偏好同步
- **状态**：已接受

### ADR-003：翻译范围
- **决策**：仅翻译面向用户的 UI 文案（标签、占位符、状态、ARIA）。**不翻译**：AI 提供商名（OpenAI, Anthropic...）、编辑器主题名（Kanagawa, Dracula...）、技术术语（PTY, WebGPU, LSP...）、快捷键提示（⌘K）
- **理由**：品牌/技术准确性，减少 ~70% 翻译工作量，避免 zh-CN 污染英文术语
- **实现**：在 `en.json` 中用 `"__nonTranslatable": [...]` 数组标记；提取脚本跳过这些键
- **状态**：已接受

---

## 16. 参考资料

- [i18next Documentation](https://www.i18next.com/)
- [react-i18next Guide](https://react.i18next.com/)
- [i18next-typescript](https://github.com/i18next/i18next-typescript)
- TERAX.md — 架构事实来源
- CONTRIBUTING.md — 质量标准、PR 流程