# AGENTS.md（Codex / 通用编码 Agent 规范）

本文件是本仓库的**权威工程约定**，任何 AI 编码 Agent（Codex、Claude Code 等）与人类开发者都必须遵守。

## 项目简介
- 名称：calculate
- 类型：纯前端单页计算器（零依赖，单文件 HTML + 原生 JS）
- 入口：`index.html`（页面）、`calc.js`（逻辑）
- 目标：基础计算器 → 支持普通/科学模式切换 → 历史记录功能

## 分支规范（Conventional）
- 主分支：`main`（**受保护，Agent 禁止直接 push、禁止自合并 PR**）
- 本迭代集成分支：`develop`（从 `main` 拉出，作为本轮任务的基线 base 分支）
- 任务开发分支：从 `develop` 拉出，命名规范 `<type>/<简短描述>`，例如 `feat/scientific-mode`、`fix/history-sign`
- 完成后：任务分支合并回 `develop`；`develop` 验证通过后由人类拉 `release/<版本>` → PR → `main` 上线
- type 取值：feat / fix / refactor / perf / docs / test / style / chore / ci / hotfix / release

## 提交规范
- 遵循 Conventional Commits：`<type>(<scope>): <描述>`
- 例：`feat(calc): 增加科学计算器模式切换`

## 运行与验证
- 直接用浏览器打开 `index.html` 即可运行（无需构建、无需安装依赖）
- 本地验证：在浏览器中手动验证加减乘除、等号、正负号、百分号
- 若引入自动化测试，使用 Node 直接测 `calc.js` 导出的纯函数（当前为 IIFE，无导出，测试可通过 DOM 模拟或后续重构）

## 代码风格
- 原生 ES5+ 语法，不使用构建工具与第三方依赖
- 保持 `calc.js` 逻辑与 DOM 分离，便于测试

## 给 Agent 的说明
- 改动前先读本文件与 `calc.js`
- 不要引入新依赖或构建步骤
- 不要修改本文件的分支/提交规范部分，除非人类明确要求
