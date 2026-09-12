# Handoff Document - Terax CI/CD & i18n

## 1. 项目目标

Terax 是一个基于 Tauri 2 + Rust + React 19 的轻量级终端优先 AI 原生开发工作区。本次工作目标：

1. **实现完整的 i18n 国际化支持**：中英文运行时切换，394 个翻译键
2. **建立 CI/CD 流水线**：通过 GitHub Actions 自动编译打包 Windows 版本并发布到 GitHub Releases

## 2. 当前进度

### i18n 国际化 ✅ 已完成
- [x] i18next 基础设施搭建
- [x] 394 个翻译键（en.json / zh-CN.json）
- [x] 运行时语言切换（持久化到 settings store）
- [x] 所有核心 UI 组件迁移
- [x] 所有设置面板迁移
- [x] 类型安全（i18next-typescript）
- [x] 类型检查通过（pnpm check-types）
- [x] i18n 验证通过（pnpm i18n:check）
- [x] 本地构建通过（pnpm build）

### CI/CD 流水线 ✅ 已完成
- [x] 重写 release.yml，只编译 Windows 版本
- [x] 推送 tag 触发构建
- [x] 验证 GitHub Actions 构建成功（zh-v1.0.14）
- [x] 验证 Release 发布成功

## 3. 已完成修改

### i18n 相关文件
```
src/i18n/
├── detector.ts          # 语言检测器
├── index.ts             # i18next 初始化
├── resources/
│   ├── en.json          # 英文翻译（394 keys）
│   └── zh-CN.json       # 中文翻译（394 keys）
├── types.d.ts           # 类型定义
└── utils.ts             # 工具函数

src/main.tsx             # 修改：i18n 初始化顺序（Tauri async 后，React 渲染前）
src/modules/settings/store.ts  # 添加 locale 字段和 setLocale() 方法
```

### CI/CD 相关文件
```
.github/workflows/release.yml  # 重写：只编译 Windows 版本
```

## 4. 关键文件

| 文件 | 说明 |
|------|------|
| `.github/workflows/release.yml` | CI/CD 工作流，当前只构建 Windows |
| `src/i18n/index.ts` | i18next 初始化配置 |
| `src/i18n/resources/en.json` | 英文翻译文件 |
| `src/i18n/resources/zh-CN.json` | 中文翻译文件 |
| `src/modules/settings/store.ts` | 设置 store，包含 locale 字段 |
| `src/main.tsx` | 应用入口，i18n 初始化位置 |
| `src-tauri/tauri.conf.json` | Tauri 配置，bundle 设置 |
| `package.json` | 项目依赖和脚本 |

## 5. 不能动的边界

1. **i18n 初始化顺序**：必须在 Tauri async setup（`invoke("pty_close_all")`、`initLaunchDir()`）之后，React 渲染之前
2. **Settings Store 结构**：`locale` 字段已集成到 `LazyStore`，不能破坏现有 schema
3. **翻译键命名**：必须遵循 `module.section.key` 命名规范
4. **Tauri 配置**：`tauri.conf.json` 中的 `bundle.targets`、`windows.nsis` 设置
5. **GitHub Remote**：`https://github.com/lixi523/terax-ai`

## 6. 已经否掉的方案

1. **多平台构建（Linux/macOS）**：之前尝试过但遇到 Ubuntu 系统依赖问题（glib-2.0、webkit2gtk），决定先只构建 Windows
2. **Tag 格式 `v*`**：之前使用过，但为区分 i18n 版本改用 `zh-v*`
3. **Node.js 18**：CI 中使用 Node.js 22 LTS（项目要求 >=22）
4. **pnpm 版本指定**：之前指定 pnpm 版本导致冲突，现在使用 pnpm/action-setup@v4 自动检测

## 7. 已解决的问题

1. ~~**CI 构建失败 - glib-2.0 缺失**~~：Ubuntu 构建需要安装系统依赖，已改为只构建 Windows
2. ~~**CI 构建失败 - updater pubkey**~~：移除了 `createUpdaterArtifacts` 和 `updater` 插件配置
3. ~~**tauri-action 参数错误**~~：移除了不支持的 `includeUpdater` 和 `appId` 参数

### 剩余风险点
1. **翻译文件编码**：zh-CN.json 曾出现编码损坏（BOM 字符、U+9225），已修复但需注意
2. **Windows 安装包测试**：需要在 Windows 上实际安装测试

## 8. 已经跑过的测试

| 测试 | 结果 |
|------|------|
| `pnpm check-types` | ✅ 通过 |
| `pnpm i18n:check` | ✅ 通过（394 keys） |
| `pnpm build` | ✅ 通过 |
| 本地 Tauri 开发模式 | ✅ 可启动 |
| GitHub Actions Windows 构建 | ✅ 通过（zh-v1.0.14） |
| GitHub Release 发布 | ✅ 成功（NSIS + MSI 安装包） |

## 9. 下一步计划

### 后续优化
1. **添加代码签名**：如果需要分发给更多用户
2. **添加自动更新支持**：重新配置 updater 插件（需要生成密钥对）
3. **添加 Linux/macOS 构建**：解决 Ubuntu 系统依赖问题后
4. **测试 Windows 安装包**：在实际 Windows 环境中测试安装和运行

## 10. 新窗口启动提示词

```
继续 Terax 项目的后续优化工作。

项目路径：D:\Documents\Code\terax-ai
GitHub 仓库：https://github.com/lixi523/terax-ai

当前状态（已全部完成）：
- i18n 国际化已全部完成并验证
- CI/CD 工作流已配置为只构建 Windows 版本
- GitHub Actions 构建成功（zh-v1.0.14）
- Release 已发布，包含 NSIS 和 MSI 安装包

Release 地址：
https://github.com/lixi523/terax-ai/releases/tag/zh-v1.0.14

后续可选优化：
1. 添加代码签名（需要证书）
2. 添加自动更新支持（需要生成密钥对）
3. 添加 Linux/macOS 构建（解决依赖问题后）

关键文件：
- .github/workflows/release.yml (CI/CD 配置)
- src/i18n/ (国际化代码)
- src-tauri/tauri.conf.json (Tauri 配置)
```
