# AGENTS.md（Codex / 通用编码 Agent 规范）

本文件是本仓库的**权威工程约定**，任何 AI 编码 Agent（Codex、Claude Code 等）与人类开发者都必须遵守。

## 项目简介
- 名称：calculate
- 类型：纯前端单页计算器（零依赖，单文件 HTML + 原生 JS）
- 入口：`index.html`（页面）、`calc.js`（逻辑）
- 目标：基础计算器 → 支持普通/科学模式切换 → 历史记录功能

## 分支规范（需求 → 一条长期 base 开发分支）

**核心模型**：一个需求 = 一条 base 开发分支。需求确认后第一步就为它建一条开发分支作为该需求的 base 并 push 远端；该需求下的需求实现、缺陷修复、文档总结全部基于这条 base 迁出 worktree 开发，做完都合并回这条 base；新需求 = 新开发分支，绝不复用旧 base。

- 主分支：`main`（**受保护，Agent 禁止直接 push、禁止自合并 PR**）
- **当前需求 base 开发分支**：`feat/scientific-calc`（科学计算器需求；所有该需求下的任务从它迁出 worktree、做完合回它。上一需求 `feat/calc-basic` 已上线）
- 任务 worktree 分支：随意命名（如 `task/HF-123`），只用于向 base 合并，不长期保留、不单独推远端
- 发布：人类基于当前 base 拉 `release/<版本>` → PR → `main` 上线 → 打 tag
- type 取值：feat / fix / refactor / perf / docs / test / style / chore / ci / hotfix / release

## 快捷指令
- **上线**：基于当前开发分支（base）创建 `release/vX.Y.Z` 上线分支并 push 远端（只建分支）。
- **PR**：把当前分支 PR 到主分支 main/master（受本文件约束）。
- **发布**：把当前 release 分支 PR 到主分支（正式上线）。

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
