# 与达尔文.skill（Darwin）协作 — 本仓库的持续进化

> 上游项目：[alchaincyf/darwin-skill](https://github.com/alchaincyf/darwin-skill)（MIT）  
> 思路：借鉴 Karpathy [autoresearch](https://github.com/karpathy/autoresearch) — **评估 → 改进 → 实测 → 人类确认 → 保留或回滚（棘轮）**。

## 1. 本仓库里「被优化」的资产

| 资产 | 说明 |
| --- | --- |
| **`SKILL.md`** | 达尔文默认优化的单一可编辑入口；含路由、触发词、SOP。 |
| **`test-prompts.json`**（仓库根目录） | 供「实测表现」维度打分用的典型用户问法（见达尔文 SKILL 中 Phase 0.5）。 |

正文 **8 类人群 × 5 模块**、通用能力、融合层等 **大部头 Markdown** 也可在改进 `SKILL.md` 后**人工**按同一原则迭代；达尔文主要针对 **SKILL.md 的可执行协议** 做 hill-climbing。

## 2. 安装达尔文（与上游一致）

```bash
npx skills add alchaincyf/darwin-skill
```

在支持 Agent Skills 的客户端中，可使用上游文档中的触发语，例如：**「优化 skill」「skill 评分」「达尔文」「darwin」「自动优化」** 等（以 [darwin-skill/SKILL.md](https://github.com/alchaincyf/darwin-skill/blob/master/SKILL.md) 的 `description` 为准）。

> 对本仓库的补充约定：**凡任务是在维护本仓库本身**（例如修改 `SKILL.md`、`README.md`、`references/`、`test-prompts.json`、发布说明与路由结构），即使用户**没有说任何达尔文触发词**，也应默认视为进入达尔文进化流程。

## 3. 针对本 skill 的约束（继承达尔文规则 + 本仓库定调）

1. **不改变核心用途**：仍为「全场景高情商沟通落地 + 按需 Read 仓库 Markdown」，勿改成单一人物视角或无关领域。  
2. **不编造来源**：优化文案时不得诱导 Agent 虚构 `[来源：]`。  
3. **体积**：`SKILL.md` 优化后不宜无节制膨胀；具体阈值见达尔文文档（如不超过基线 150% 等）。  
4. **Git**：建议在独立分支上跑优化，**只保留总分严格高于基线的改动**（棘轮）。

## 4. 建议工作流（简版）

1. 确保本仓库已 `git init` 并提交当前 `SKILL.md`。  
2. 安装 `darwin-skill`，按其中 **Phase 0.5** 确认或修订根目录 `test-prompts.json`。  
3. 执行基线评估 → 优化循环 → 人类确认 diff。  
4. 若需为大部头模块写新测试用例，可在 **Issue / PR** 中补充场景，再酌情扩展 `test-prompts.json`。

## 4.1 本仓库的“默认进化模式”

适用于以下任务：

- 调整 `SKILL.md` 的 `description`、路由表、SOP
- 修改 `README.md` 的安装、触发、致谢、许可、发布文案
- 修改 `references/` 中与维护方法有关的说明文件
- 扩写或修订 `test-prompts.json`

默认动作：

1. 先读取本文件，确认本次要优化的资产与约束。  
2. 先做**基线判断**：当前文案/结构是否更清晰、更可触发、更可执行。  
3. 再做**最小改动优化**：优先小步修改，避免无节制膨胀。  
4. 若环境允许，结合 `test-prompts.json` 做实测。  
5. 仅在结果更好时保留改动；否则回退思路或继续迭代。

## 4.2 能力边界

上述“默认进化模式”表示：**该 skill 一旦被调用来维护本仓库，就自动按达尔文方式思考和操作**。  
但它**不等于后台常驻自动运行**。如果想做到周期性、无人值守地持续评估和优化，仍需要额外的自动化载体，例如：

- 本地计划任务 / 定时脚本
- GitHub Actions / CI
- 专门的 watcher 或 agent orchestration

## 4.3 GitHub Actions 落地方式

本仓库提供以下自动化落地：

- 工作流：`.github/workflows/darwin-evolution.yml`
- 结构治理脚本：`scripts/darwin-ci.mjs`
- 语义评审脚本：`scripts/darwin-ai-review.mjs`

触发时机：

- `push` 到 `main` / `master` 且涉及本仓库维护文件时
- 定时 `schedule`
- 手动 `workflow_dispatch`

默认行为：

1. 读取 `SKILL.md`、`README.md`、`references/DARWIN-EVOLUTION.md`、`references/NUWA-GUIDANCE.md`、`test-prompts.json`。  
2. 自动同步 README 中可机器维护的块，例如**触发词清单**与 Darwin CI 摘要。  
3. 生成一份结构化 Darwin 评估报告（仓库治理层面的可重复检查）。  
4. 若仓库配置了 `OPENAI_API_KEY`，再额外生成一份**语义级 AI 评审报告**，给出更接近 Darwin 的高杠杆改进建议。  
5. 将报告写入工作流摘要，并同步到 GitHub Issue。  
6. 若发现 README 中可自动同步的块与当前源数据不一致，则可自动创建 PR。

说明：

- 结构治理层适合做**持续治理、文档对齐、触发词与测试样例一致性检查**。  
- 语义级评审层依赖 OpenAI API；建议在 GitHub 仓库中设置 `OPENAI_API_KEY`，可选设置 `OPENAI_MODEL`。  
- 出于安全与可控性考虑，当前自动 PR 只覆盖**机器可确定同步**的 README 块；AI 评审默认给建议，不直接改正文。

## 5. 致谢

达尔文方法论与工具链版权归 **花叔 Huashu / alchaincyf** 及上游贡献者，以 [darwin-skill 仓库 LICENSE](https://github.com/alchaincyf/darwin-skill/blob/master/LICENSE) 为准。本文件仅为**使用说明**，不复制其专有脚本与模板。
