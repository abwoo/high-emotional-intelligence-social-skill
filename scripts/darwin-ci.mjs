import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const reportDir = path.join(repoRoot, ".darwin");

const args = new Set(process.argv.slice(2));
const shouldWriteReadme = args.has("--write-readme");
const shouldWriteReport = true;

const readUtf8 = async (relativePath) =>
  fs.readFile(path.join(repoRoot, relativePath), "utf8");

const splitList = (value) =>
  value
    .split(/[、，,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const unique = (items) => [...new Set(items)];
const formatInlineList = (items) =>
  items.length > 0 ? items.map((item) => `\`${item}\``).join("、") : "无";

const extractDescription = (skillText) => {
  const match = skillText.match(/description:\s*\|\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error("无法从 SKILL.md 提取 YAML description。");
  }

  return match[1]
    .split("\n")
    .map((line) => line.replace(/^\s{2}/, ""))
    .join("\n");
};

const extractMainTriggers = (description) => {
  const line = description
    .split("\n")
    .find((item) => item.includes("触发："));

  if (!line) {
    return [];
  }

  const match = line.match(/触发：(.+?)。/);
  return match ? splitList(match[1]) : [];
};

const extractDarwinKeywords = (description) => {
  const line = description
    .split("\n")
    .find((item) => item.includes("达尔文") || item.includes("Darwin"));

  if (!line) {
    return [];
  }

  const quoted = unique(
    [...line.matchAll(/「([^」]+)」/g)].map((match) => match[1]),
  );

  if (quoted.length > 0) {
    return quoted;
  }

  const fallback = line.match(/兼容维护关键词：(.+?)。/);
  return fallback ? splitList(fallback[1].replace(/[「」]/g, "")) : [];
};

const ensureMarkedBlock = (readmeText, startMarker, endMarker, generatedBlock) => {

  if (readmeText.includes(startMarker) && readmeText.includes(endMarker)) {
    const pattern = new RegExp(
      `${startMarker}[\\s\\S]*?${endMarker}`,
      "m",
    );
    return readmeText.replace(
      pattern,
      `${startMarker}\n${generatedBlock}\n${endMarker}`,
    );
  }

  const addition = `\n\n${startMarker}\n${generatedBlock}\n${endMarker}\n`;
  return `${readmeText.trimEnd()}${addition}`;
};

const main = async () => {
  const [skillText, readmeText, darwinRefText, nuwaRefText, testPromptsText] =
    await Promise.all([
      readUtf8("SKILL.md"),
      readUtf8("README.md"),
      readUtf8("references/DARWIN-EVOLUTION.md"),
      readUtf8("references/NUWA-GUIDANCE.md"),
      readUtf8("test-prompts.json"),
    ]);

  const description = extractDescription(skillText);
  const mainTriggers = extractMainTriggers(description);
  const darwinKeywords = extractDarwinKeywords(description);
  const testPrompts = JSON.parse(testPromptsText);

  if (!Array.isArray(testPrompts)) {
    throw new Error("test-prompts.json 必须是数组。");
  }

  const promptIds = testPrompts.map((item) => item.id);
  const duplicateIds = promptIds.filter(
    (id, index) => promptIds.indexOf(id) !== index,
  );

  const validPromptObjects = testPrompts.every(
    (item) =>
      item &&
      Object.prototype.hasOwnProperty.call(item, "id") &&
      typeof item.prompt === "string" &&
      item.prompt.trim() &&
      typeof item.expected === "string" &&
      item.expected.trim(),
  );

  const checks = [
    {
      name: "主场景触发词数量充足",
      passed: mainTriggers.length >= 10,
      points: 15,
      detail: `检测到 ${mainTriggers.length} 个主场景触发词。`,
      fix: "补充更多用户自然会说出口的主场景关键词。",
    },
    {
      name: "达尔文维护关键词存在",
      passed: darwinKeywords.length >= 4,
      points: 10,
      detail: `检测到 ${darwinKeywords.length} 个达尔文维护关键词。`,
      fix: "在 SKILL description 中保留一组清晰的达尔文维护关键词。",
    },
    {
      name: "SKILL 默认达尔文模式已声明",
      passed: skillText.includes("维护本仓库时默认进入达尔文进化模式"),
      points: 15,
      detail: "SKILL.md 是否声明维护仓库时自动进入达尔文流程。",
      fix: "在 SKILL.md description 与 SOP 中明确默认进化模式。",
    },
    {
      name: "README 默认模式说明存在",
      passed: readmeText.includes("默认达尔文进化模式"),
      points: 10,
      detail: "README 是否向仓库使用者说明默认达尔文模式。",
      fix: "在 README 增加默认达尔文模式说明。",
    },
    {
      name: "README Darwin CI 同步块存在",
      passed:
        readmeText.includes("<!-- darwin-ci:start -->") &&
        readmeText.includes("<!-- darwin-ci:end -->"),
      points: 10,
      detail: "README 是否存在可自动同步的 Darwin CI 摘要块。",
      fix: "在 README 中加入 darwin-ci 标记块，便于自动修复与 PR。",
    },
    {
      name: "Darwin 文档包含 GitHub Actions 说明",
      passed: darwinRefText.includes("GitHub Actions 落地方式"),
      points: 10,
      detail: "references/DARWIN-EVOLUTION.md 是否说明 CI 落地。",
      fix: "补充 GitHub Actions / CI 的落地说明。",
    },
    {
      name: "Nuwa 指引仍保留",
      passed: nuwaRefText.includes("女娲") && nuwaRefText.includes("方法论"),
      points: 5,
      detail: "Nuwa 方法论指引是否仍然存在。",
      fix: "保留或恢复 references/NUWA-GUIDANCE.md 的方法论说明。",
    },
    {
      name: "测试样例数量达标",
      passed: testPrompts.length >= 3,
      points: 10,
      detail: `检测到 ${testPrompts.length} 条 test prompt。`,
      fix: "至少维护 3 条核心场景测试样例。",
    },
    {
      name: "测试样例结构有效",
      passed: validPromptObjects,
      points: 10,
      detail: "每条样例都应含 id、prompt、expected。",
      fix: "修复 test-prompts.json 中缺失字段或空文本的条目。",
    },
    {
      name: "测试样例 id 唯一",
      passed: duplicateIds.length === 0,
      points: 5,
      detail:
        duplicateIds.length === 0
          ? "未检测到重复 id。"
          : `重复 id：${unique(duplicateIds).join(", ")}`,
      fix: "确保 test-prompts.json 中每条样例 id 唯一。",
    },
  ];

  const maxScore = checks.reduce((total, check) => total + check.points, 0);
  const score = checks.reduce(
    (total, check) => total + (check.passed ? check.points : 0),
    0,
  );

  const failedChecks = checks.filter((check) => !check.passed);
  const suggestions =
    failedChecks.length > 0
      ? failedChecks.map((check) => `- ${check.fix}`)
      : [
          "- 当前结构检查全部通过；下一步可考虑增加更多真实用户问法，提升 `test-prompts.json` 覆盖度。",
          "- 若仓库已配置 `OPENAI_API_KEY`，可结合 `scripts/darwin-ai-review.mjs` 持续产出语义级 Darwin 改进建议。",
        ];

  const generatedTriggerBlock = [
    "#### 自动同步触发词清单",
    "",
    `- 主场景触发词（${mainTriggers.length}）：${formatInlineList(mainTriggers)}`,
    `- 达尔文维护关键词（${darwinKeywords.length}）：${formatInlineList(darwinKeywords)}`,
    "",
    "> 此块由 `scripts/darwin-ci.mjs` 从 `SKILL.md` 顶部 YAML `description` 自动同步。",
  ].join("\n");

  const generatedReadmeBlock = [
    "#### Darwin CI 同步摘要",
    "",
    `- 主场景触发词数量：${mainTriggers.length}`,
    `- 达尔文维护关键词数量：${darwinKeywords.length}`,
    `- \`test-prompts.json\` 当前用例数：${testPrompts.length}`,
    `- 默认维护模式：${
      skillText.includes("维护本仓库时默认进入达尔文进化模式")
        ? "修改本仓库时自动进入达尔文流程"
        : "未检测到"
    }`,
    "- 自动修复范围：README 中的 Darwin CI 摘要块与触发词清单同步",
    "",
    `> 此块由 \`scripts/darwin-ci.mjs\` 自动维护；最近评估得分：${score}/${maxScore}。`,
  ].join("\n");

  const nextReadmeText = ensureMarkedBlock(
    ensureMarkedBlock(
      readmeText,
      "<!-- darwin-trigger-sync:start -->",
      "<!-- darwin-trigger-sync:end -->",
      generatedTriggerBlock,
    ),
    "<!-- darwin-ci:start -->",
    "<!-- darwin-ci:end -->",
    generatedReadmeBlock,
  );
  const readmeChanged = nextReadmeText !== readmeText;

  if (shouldWriteReadme && readmeChanged) {
    await fs.writeFile(path.join(repoRoot, "README.md"), nextReadmeText, "utf8");
  }

  const report = [
    "# Darwin Evolution Report",
    "",
    `- Generated at: ${new Date().toISOString()}`,
    `- Score: **${score}/${maxScore}**`,
    `- Main triggers: **${mainTriggers.length}**`,
    `- Darwin maintenance keywords: **${darwinKeywords.length}**`,
    `- Test prompts: **${testPrompts.length}**`,
    `- README auto-sync changed: **${readmeChanged ? "yes" : "no"}**`,
    "",
    "## Checks",
    "",
    ...checks.map(
      (check) =>
        `- [${check.passed ? "x" : " "}] ${check.name} (${check.points} pts) - ${check.detail}`,
    ),
    "",
    "## Suggestions",
    "",
    ...suggestions,
    "",
    "## Trigger Snapshot",
    "",
    `- 主场景：${mainTriggers.join("、") || "无"}`,
    `- 达尔文维护：${darwinKeywords.join("、") || "无"}`,
    "",
    "## Auto-fix Scope",
    "",
    "- README 中 `darwin-trigger-sync` 触发词清单块",
    "- README 中 `darwin-ci` Darwin CI 摘要块",
  ].join("\n");

  const reportJson = {
    generatedAt: new Date().toISOString(),
    score,
    mainTriggerCount: mainTriggers.length,
    darwinKeywordCount: darwinKeywords.length,
    testPromptCount: testPrompts.length,
    readmeChanged,
    duplicateIds: unique(duplicateIds),
    checks: checks.map((check) => ({
      name: check.name,
      passed: check.passed,
      points: check.points,
      detail: check.detail,
      fix: check.fix,
    })),
  };

  if (shouldWriteReport) {
    await fs.mkdir(reportDir, { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(reportDir, "darwin-report.md"), report, "utf8"),
      fs.writeFile(
        path.join(reportDir, "darwin-report.json"),
        `${JSON.stringify(reportJson, null, 2)}\n`,
        "utf8",
      ),
    ]);
  }

  console.log(report);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
