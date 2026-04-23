import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

const repoRoot = process.cwd();
const reportDir = path.join(repoRoot, ".darwin");

const readUtf8 = async (relativePath) =>
  fs.readFile(path.join(repoRoot, relativePath), "utf8");

const writeReportFiles = async ({ markdown, json }) => {
  await fs.mkdir(reportDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(reportDir, "darwin-ai-report.md"), markdown, "utf8"),
    fs.writeFile(
      path.join(reportDir, "darwin-ai-report.json"),
      `${JSON.stringify(json, null, 2)}\n`,
      "utf8",
    ),
  ]);
};

const buildSkippedReport = async () => {
  const markdown = [
    "# Darwin AI Review",
    "",
    "- Status: **skipped**",
    "- Reason: missing `OPENAI_API_KEY`",
    "",
    "## How to Enable",
    "",
    "- Add repository secret `OPENAI_API_KEY`",
    "- Optional: add repository variable `OPENAI_MODEL` (default: `gpt-5.4`)",
    "- Re-run `.github/workflows/darwin-evolution.yml`",
  ].join("\n");

  const json = {
    status: "skipped",
    reason: "missing OPENAI_API_KEY",
    model: process.env.OPENAI_MODEL || "gpt-5.4",
  };

  await writeReportFiles({ markdown, json });
  console.log(markdown);
};

const main = async () => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5.4";

  if (!apiKey) {
    await buildSkippedReport();
    return;
  }

  const [skillText, readmeText, darwinRefText, nuwaRefText, testPromptsText] =
    await Promise.all([
      readUtf8("SKILL.md"),
      readUtf8("README.md"),
      readUtf8("references/DARWIN-EVOLUTION.md"),
      readUtf8("references/NUWA-GUIDANCE.md"),
      readUtf8("test-prompts.json"),
    ]);

  const client = new OpenAI({ apiKey });

  const systemPrompt = [
    "你是 Darwin 风格的仓库演化评审器。",
    "你的任务是审查一个中文 Agent Skill 仓库，并给出真正高价值、像资深维护者一样的改进建议。",
    "重点看：触发词覆盖、意图路由清晰度、README 与 SKILL 一致性、test-prompts 覆盖、诚实边界、安全性、可维护性。",
    "不得建议改变本仓库核心用途：它必须继续是“全场景高情商沟通落地” skill。",
    "优先给少量高杠杆建议，不要写空泛废话。",
    "输出必须是中文 Markdown。",
  ].join("\n");

  const userPrompt = [
    "请基于以下仓库文件，生成一份 Darwin AI 评审报告。",
    "",
    "输出格式必须包含以下部分：",
    "1. `## 总评`：2-4 句话，总结当前仓库质量与演化方向。",
    "2. `## 评分`：用项目符号给出 6 个维度的 10 分制评分，维度为：触发覆盖、路由可执行性、README 一致性、测试样例质量、诚实边界、安全与治理。",
    "3. `## 关键发现`：按严重程度列出 3-6 条发现；每条都要具体、可执行。",
    "4. `## 建议的下一轮改动`：列出 3-5 条最值得做的修改。",
    "5. `## 建议新增触发词`：只给真正自然、贴近用户表达的新触发词；没有就写“暂无”。",
    "6. `## 建议新增测试样例`：给出 2-4 条 JSON 数组格式的候选样例，每条含 `id`、`prompt`、`expected`。",
    "7. `## 是否建议自动提交 PR`：只允许输出 `建议` 或 `暂不建议`，并给一句理由。",
    "",
    "仓库文件如下：",
    "",
    "### SKILL.md",
    skillText,
    "",
    "### README.md",
    readmeText,
    "",
    "### references/DARWIN-EVOLUTION.md",
    darwinRefText,
    "",
    "### references/NUWA-GUIDANCE.md",
    nuwaRefText,
    "",
    "### test-prompts.json",
    testPromptsText,
  ].join("\n");

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: systemPrompt }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: userPrompt }],
      },
    ],
  });

  const markdown = [
    "# Darwin AI Review",
    "",
    `- Status: **completed**`,
    `- Model: **${model}**`,
    `- Generated at: **${new Date().toISOString()}**`,
    "",
    response.output_text?.trim() || "_模型未返回文本输出。_",
  ].join("\n");

  const json = {
    status: "completed",
    model,
    generatedAt: new Date().toISOString(),
    outputText: response.output_text || "",
    responseId: response.id || null,
  };

  await writeReportFiles({ markdown, json });
  console.log(markdown);
};

main().catch(async (error) => {
  const markdown = [
    "# Darwin AI Review",
    "",
    "- Status: **failed**",
    `- Error: \`${error.message}\``,
  ].join("\n");

  const json = {
    status: "failed",
    error: error.message,
  };

  await writeReportFiles({ markdown, json });
  console.error(markdown);
  process.exitCode = 1;
});
