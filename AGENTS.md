# Hey.AdMaster 前端编码规范（hey-admaster-frontend/）

本目录是独立 git 子模块（vben-admin 5.x monorepo，Vue3 + TS + pnpm + turbo）。改动文件必须遵守本规范；与根 `AGENTS.md` 冲突时以本文件为准（更深的目录优先）。

## 应用结构

- `apps/hey-public`（C 端，dev 7668）：`src/api`（ofetch）、`src/features/ai-design`、`src/views/ai-design`、`src/store`（Pinia）、`src/composables`、`src/router`。
- `apps/hey-admin`（管理端，vben-admin + antd）：路由 glob 自动加载 `src/router/routes/modules/**/*.ts`；请求封装 `@abp/request`。
- `apps/backend-mock`（h3 mock，5320）。
- `packages/@abp/*`：ABP 平台包（`ai-management` 提供 Tool/Workspace/Conversation 管理组件）；`packages/@hey/*`：业务包。优先复用，勿复制改。

## API 封装模板（hey-public）

以 `src/api/ai-design.ts` 为准：
- `ofetch.create` + `onRequest` 注入 `Authorization: Bearer <access_token>`（localStorage）。
- `onResponse` 解包 ABP `{code,message,result}`：`code !== '0'` 抛 `AbpBusinessError`；`onResponseError` 处理 401（清 token + 触发 `ai-design:unauthorized` 跳登录）。
- 枚举/DTO 与后端 Domain.Shared 保持数值一致；改动两端同步。

## 状态与组件

- 状态：Pinia store（如 `aiDesignStore`）；会话/消息/图片资产与后端会话接口同步。
- 新增页面：hey-admin 只建路由模块文件即可；hey-public 走 `views` + `features` 分层。
- AI 对话消息模型扩展（Agent 化）：`steps` / `artifacts` / `costBreakdown` / `trace`（见 PRD §5.3）。

## UI 风格（anti-AI-slop）

- hey-public 是**独立设计体系**：只用自身令牌与组件（`src/styles/tokens.css`、`src/components/ui/*`），**与 hey-admin 的 vben 框架完全独立**，禁止混用 vben/antd 组件与观感。
- 霓虹玻璃风：`--color-*` 令牌 + `BaseModal` 弹层范式（surface + 边框 + 模糊遮罩 + 弹簧动效）+ `BaseButton` 变体按钮；组件参考 `src/components/ui/*`、`src/components/workspace/*`。
- **提示一律走统一提示系统**：`prompt.confirm()` / `prompt.alert()`（`src/utils/prompt.ts` + `PromptHost.vue`），**禁止原生 confirm/alert**（oxlint `eslint/no-alert` 已强制）；短提示用 `src/utils/toast`。
- 新 UI 视觉方向先读 `frontend-design` 技能（WorkBuddy 插件 frontend-design-pro；仓库摘要 `skills/frontend-design/SKILL.md`）再对照现有页面定稿，避免模板味。

## TypeScript 细节（易踩坑）

- 枚举既要当类型又要当值用时，**分开两个 import**（`import type` + 普通 import）。
- `noUncheckedIndexedAccess` 已开启：数组索引访问要判空（`items[i]` 可能是 `undefined`）。
- InputNumber/Switch 模板事件参数用 `(value: any)` 再收敛，避免 `CheckedType`/`ValueType` 类型不匹配。
- 管理端**不要新增 `@ant-design/icons-vue` 导入**（monorepo typecheck 下 TS2307 既有问题），按钮用纯文本。

## Pre-commit 链（提交前自动执行，勿绕过）

`lefthook.yml` 已配置，commit 时依次执行：
1. `oxlint --fix --type-aware`（暂存文件，自动修复并回填暂存区）
2. `oxfmt`（格式化）
3. `eslint --fix`
4. `stylelint --fix`（vue/css/less/scss）
5. `pnpm check:type`（全量类型检查）
6. commit-msg：`commitlint`（conventional commits）

规则：
- 提交前先自检：`pnpm exec oxlint --type-aware <改动文件>`；大改动先 `pnpm check:type`。
- 钩子自动修复+回填是正常的（`stage_fixed: true`）；**禁止无理由 `git commit --no-verify`**。
- 提交信息格式：`feat(scope): ...` / `fix(...)` / `refactor(...)` / `docs(...)` / `test(...)`（见 `.commitlintrc.js`；可用 `pnpm commit` 走 czg 引导）。
- **不要引入 Husky/lint-staged/prettier 重复链**；钩子调整只改 `lefthook.yml`。

## 常用命令

- `pnpm dev:public` / `pnpm dev:admin` / `pnpm dev:invitation`（turbo-run dev）
- `pnpm check:type`（turbo typecheck）；`pnpm exec oxlint --type-aware <files>`
- 全量 `pnpm check`（circular/dep/type/cspell）可能报 `packages/@abp/*` 既有错误，只判断自己改动是否新增错误。
- 前端子模块独立提交；改完告知用户分别在子模块与根仓库提交。
