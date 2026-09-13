# Handoff Document - Terax CI/CD & i18n

## 1. 项目目标

Terax 是一个基于 Tauri 2 + Rust + React 19 的轻量级终端优先 AI 原生开发工作区。本次工作目标：

1. **实现完整的 i18n 国际化支持**：中英文运行时切换，默认简体中文
2. **建立 CI/CD 流水线**：通过 GitHub Actions 自动编译打包 Windows 版本并发布到 GitHub Releases

## 2. 当前进度

### i18n 国际化 ⚠️ 进行中
- [x] i18next 基础设施搭建
- [x] 394 个翻译键（en.json / zh-CN.json）
- [x] 运行时语言切换（持久化到 settings store）
- [x] 所有核心 UI 组件迁移
- [x] 所有设置面板迁移
- [x] 类型安全（i18next-typescript）
- [x] 类型检查通过（pnpm check-types）
- [x] 本地构建通过（pnpm build）
- [x] 修复 en.json / zh-CN.json 中重复的 `settings.ai` 键（第二个覆盖了第一个导致大量翻译丢失）
- [x] 重写 i18n/index.ts，实现基于命名空间映射的资源加载
- [x] 默认语言改为 zh-CN（store 默认值从 "system" 改为 "zh-CN"）
- [ ] **待验证**：安装包中设置界面是否正常显示（之前报告空白）
- [ ] **待验证**：主界面是否显示中文

### CI/CD 流水线 ✅ 已完成
- [x] 重写 release.yml，只编译 Windows 版本
- [x] 推送 tag 触发构建
- [x] 验证 GitHub Actions 构建成功（最新：zh-v1.0.18）
- [x] 验证 Release 发布成功

## 3. 核心技术方案

### i18n 命名空间映射

组件使用 `useTranslation('namespace')` 传入命名空间名，但 JSON 结构是嵌套的（如 `settings.general.title`）。i18n/index.ts 中维护了一个 `NAMESPACE_MAP`，将组件命名空间映射到 JSON 路径：

```typescript
const NAMESPACE_MAP = {
  'settings.general': 'settings.general',  // 组件用 settings.general，JSON 也是 settings.general
  'settings.editor': 'settings.editor',
  'settings.shell': 'settings.terminal',   // 组件用 settings.shell，但 JSON 中叫 settings.terminal
  'themes': 'common',                       // 不存在，映射到 common（空）
  'shortcuts': 'common',                    // 不存在，映射到 common（空）
  'ai': 'settings.ai',                     // 组件用 ai，但 JSON 中是 settings.ai
  'header.window': 'header.window',
  'header.search': 'header.search',
  'header.tabs': 'header.tabs',
  'statusBar': 'settings.statusBar',       // 组件用 statusBar，JSON 中是 settings.statusBar
  'commandPalette': 'settings.commandPalette',
  'dialogs': 'settings.dialogs',
};
```

每个命名空间中的键同时存储：
1. **短键**（相对于命名空间路径）：如 `title`、`description` — 用于 `t('title')`
2. **完整点分路径**：如 `settings.general.title` — 用于 `t('settings.general.title')`

配置：`keySeparator: false`（键作为字面量）+ `nsSeparator: false`（命名空间不使用分隔符）

### en.json / zh-CN.json 结构

```json
{
  "__nonTranslatable": [...],
  "common": { ... },
  "header": { "window": {...}, "search": {...}, "tabs": {...} },
  "settings": {
    "general": {...},
    "editor": {...},
    "terminal": {...},
    "ai": {...},
    "statusBar": {...},
    "commandPalette": {...},
    "dialogs": {...},
    ...
  }
}
```

**重要**：之前 en.json 和 zh-CN.json 都有重复的 `"ai"` 键（第478行和第654行），JSON 解析时后者覆盖前者，导致 `settings.ai` 下只保留了 `statusBar`，丢失了 `composer`、`chat`、`agents`、`providers`、`stt`、`notifications` 等所有内容。已修复（合并到一个 `ai` 对象中）。

## 4. 已解决的问题

1. ~~**CI 构建失败 - glib-2.0 缺失**~~：改为只构建 Windows
2. ~~**CI 构建失败 - updater pubkey**~~：移除 createUpdaterArtifacts 和 updater 配置
3. ~~**tauri-action 参数错误**~~：移除不支持的参数
4. ~~**updater 插件配置不匹配**~~：tauri.conf.json 恢复 updater 空配置以匹配 lib.rs 中的 plugin 初始化
5. ~~**设置界面空白**~~：settings/main.tsx 缺少 `initI18n()` 调用
6. ~~**i18n 命名空间不匹配**~~：组件用 `useTranslation('ai')` 但 JSON 中是 `settings.ai`，通过 NAMESPACE_MAP 解决
7. ~~**重复 JSON 键**~~：en.json 和 zh-CN.json 中 `settings.ai` 出现两次，后者覆盖前者导致数据丢失

## 5. 关键文件

| 文件 | 说明 |
|------|------|
| `.github/workflows/release.yml` | CI/CD 工作流，只构建 Windows |
| `src/i18n/index.ts` | i18next 初始化 + 命名空间映射（核心） |
| `src/i18n/resources/en.json` | 英文翻译文件（394 keys） |
| `src/i18n/resources/zh-CN.json` | 中文翻译文件（394 keys） |
| `src/modules/settings/store.ts` | 设置 store，locale 默认值为 "zh-CN" |
| `src/main.tsx` | 主窗口入口，i18n 初始化 |
| `src/settings/main.tsx` | 设置窗口入口，i18n 初始化 |
| `src/settings/SettingsApp.tsx` | 设置界面壳，使用 `useTranslation('settings.shell')` |
| `src/settings/sections/GeneralSection.tsx` | 通用设置，使用 `useTranslation('settings.general')` |
| `src-tauri/tauri.conf.json` | Tauri 配置 |
| `src-tauri/src/lib.rs` | Rust 核心，注册了 `tauri_plugin_updater` |
| `src-tauri/installer-hooks.nsh` | NSIS 安装钩子（注册右键菜单） |

## 6. 不能动的边界

1. **i18n 初始化顺序**：必须在 Tauri async setup 之后，React 渲染之前
2. **Settings Store 结构**：`locale` 字段已集成到 `LazyStore`，不能破坏 schema
3. **Tauri 配置**：`tauri.conf.json` 中 `lib.rs` 注册了 updater 插件，config 中必须保留 updater 空配置
4. **GitHub Remote**：`https://github.com/lixi523/terax-ai`
5. **CI 工作流 trigger**：使用 `zh-v*` tag 触发

## 7. 仍然存在的问题

### 🔴 关键：安装后 exe 不打开 / 设置界面空白

可能原因（按概率排序）：

1. **WebView2 未安装**：`webviewInstallMode` 设为 `downloadBootstrapper`，如果目标机器没有 WebView2 且网络不通，启动会失败
2. **terax-cli 二进制找不到**：`externalBin` 引用 `binaries/terax-cli`，CLI 在 `beforeBuildCommand` 中编译。如果路径不匹配，Tauri 会 panic
3. **Rust panic**：lib.rs 中的 `run()` 函数可能在某个 plugin 初始化时 panic
4. **杀毒软件拦截**：未签名的 exe 可能被 Windows Defender 或其他杀毒软件拦截

**诊断方法**：
- 打开 Windows 事件查看器 → Windows 日志 → 应用程序，查看是否有 Terax 相关的错误
- 或者从命令行直接运行安装目录下的 exe，查看控制台输出

### 🟡 次要问题
- `themes` 和 `shortcuts` 命名空间在 JSON 中不存在，对应设置页面的翻译会显示为键名
- `settings.shell` 命名空间在 JSON 中不存在（映射到了 `settings.terminal`），但 SettingsApp 的 tab 标签使用了 `t('settings.shell.tabs.general')` 这样的完整路径键，这些键在 `settings.terminal` 命名空间中不存在

## 8. 已经跑过的测试

| 测试 | 结果 |
|------|------|
| `pnpm check-types` | ✅ 通过 |
| `pnpm build` | ✅ 通过 |
| GitHub Actions Windows 构建 | ✅ 通过（zh-v1.0.18） |
| GitHub Release 发布 | ✅ 成功 |

## 9. 下一步计划

### 🔴 最高优先级：诊断安装包运行问题
1. 从 https://github.com/lixi523/terax-ai/releases/tag/zh-v1.0.18 下载安装包
2. 在干净的 Windows 机器上测试（检查 WebView2 是否已安装）
3. 如果还是空白/不打开，需要查看 Windows 事件查看器日志

### 🟡 i18n 完善
1. 补充 `themes` 和 `shortcuts` 命名空间的翻译
2. 修复 `settings.shell` 命名空间映射（或修改 SettingsApp 使用正确的命名空间）

### 🟢 后续优化
1. 添加代码签名
2. 添加自动更新支持

## 10. 新窗口启动提示词

```
继续 Terax 项目的后续优化工作。

项目路径：D:\Documents\Code\terax-ai
GitHub 仓库：https://github.com/lixi523/terax-ai

当前状态：
- i18n 国际化已基本完成，命名空间映射已修复，默认中文
- CI/CD 工作流已配置为只构建 Windows 版本
- 最新构建：zh-v1.0.18

Release 地址：
https://github.com/lixi523/terax-ai/releases/tag/zh-v1.0.18

🔴 关键待解决问题：
- 安装后 exe 可能不打开或设置界面空白
- 需要检查 WebView2、terax-cli 二进制、Rust panic、杀毒软件等因素
- 详见 handoff.md 第 7 节

关键文件：
- src/i18n/index.ts (i18n 核心，NAMESPACE_MAP 命名空间映射)
- src/i18n/resources/en.json / zh-CN.json (翻译文件)
- src/settings/main.tsx (设置窗口入口)
- src/modules/settings/store.ts (locale 默认值)
- .github/workflows/release.yml (CI/CD 配置)
- src-tauri/tauri.conf.json (Tauri 配置)
- src-tauri/src/lib.rs (Rust 核心)
```
