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

### CI/CD 流水线 🔄 进行中
- [x] 重写 release.yml，只编译 Windows 版本
- [ ] 推送 tag 触发构建
- [ ] 验证 GitHub Actions 构建成功
- [ ] 验证 Release 发布成功

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

## 7. 当前风险点

1. **CI 构建可能失败**：Windows 构建尚未验证，可能有 Rust 依赖或构建配置问题
2. **NSIS 安装包生成**：`tauri.conf.json` 中配置了 `installerHooks`，需要验证 hooks 文件存在
3. **翻译文件编码**：zh-CN.json 曾出现编码损坏（BOM 字符、U+9225），已修复但需注意
4. **Tauri 版本兼容性**：使用 tauri-action@v0，可能有 API 变化

## 8. 已经跑过的测试

| 测试 | 结果 |
|------|------|
| `pnpm check-types` | ✅ 通过 |
| `pnpm i18n:check` | ✅ 通过（394 keys） |
| `pnpm build` | ✅ 通过 |
| 本地 Tauri 开发模式 | ✅ 可启动 |
| GitHub Actions (旧工作流) | ❌ Linux/macOS 失败，Windows 未验证 |

## 9. 下一步计划

### 立即执行
1. **推送 tag 触发构建**
   ```bash
   git tag zh-v1.0.11
   git push origin zh-v1.0.11
   ```

2. **监控 GitHub Actions 构建**
   - 访问 https://github.com/lixi523/terax-ai/actions
   - 检查 Windows 构建步骤是否成功

3. **验证 Release 发布**
   - 检查 https://github.com/lixi523/terax-ai/releases
   - 下载 Windows 安装包验证

### 如果构建失败
1. 检查错误日志，定位失败步骤
2. 常见问题：
   - Rust 依赖编译失败
   - NSIS 打包失败
   - 前端构建失败
3. 修复后重新推送 tag

### 后续优化
1. 添加代码签名（如果需要）
2. 添加自动更新支持（updater 已配置）
3. 考虑添加 Linux/macOS 构建（解决依赖问题后）

## 10. 新窗口启动提示词

```
继续 Terax 项目的 CI/CD 构建任务。

项目路径：D:\Documents\Code\terax-ai
GitHub 仓库：https://github.com/lixi523/terax-ai

当前状态：
- i18n 国际化已全部完成并验证
- CI/CD 工作流已重写为只构建 Windows 版本
- 已推送到 main 分支

下一步：
1. 推送 tag 触发 GitHub Actions 构建
2. 监控构建过程，确认 Windows 版本编译成功
3. 验证 Release 页面发布安装包

关键文件：
- .github/workflows/release.yml (CI/CD 配置)
- src/i18n/ (国际化代码)
- src-tauri/tauri.conf.json (Tauri 配置)

注意事项：
- 不要修改 i18n 初始化顺序（main.tsx 中）
- 不要破坏 settings store 的 schema
- 翻译键必须遵循 module.section.key 命名规范
```
