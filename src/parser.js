const ACTION_WORDS = [
  "send",
  "share",
  "review",
  "confirm",
  "book",
  "schedule",
  "draft",
  "finish",
  "follow up",
  "update",
  "prepare",
  "check",
  "fix",
  "write",
  "submit",
  "collect",
  "decide",
  "need",
  "needs",
  "todo",
  "action",
  "发送",
  "分享",
  "复盘",
  "确认",
  "预订",
  "预约",
  "安排",
  "起草",
  "完成",
  "跟进",
  "更新",
  "准备",
  "检查",
  "修复",
  "提交",
  "收集",
  "决定",
  "需要",
  "待办",
  "行动项"
];

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const CHINESE_DAY_NAMES = [
  { day: 0, pattern: /(?:星期日|星期天|周日|周天|礼拜日|礼拜天)/ },
  { day: 1, pattern: /(?:星期一|周一|礼拜一)/ },
  { day: 2, pattern: /(?:星期二|周二|礼拜二)/ },
  { day: 3, pattern: /(?:星期三|周三|礼拜三)/ },
  { day: 4, pattern: /(?:星期四|周四|礼拜四)/ },
  { day: 5, pattern: /(?:星期五|周五|礼拜五)/ },
  { day: 6, pattern: /(?:星期六|周六|礼拜六)/ }
];

export const SAMPLE_NOTES = `Alex: send revised launch deck by Friday
Mina - confirm budget by 2026-05-24
Action item: Jordan to check launch blockers ASAP
Decision: ship the local-only version first
Question: Do we need legal review before the beta invite?
Follow up with Kai tomorrow about venue booking
Sam to review onboarding copy 5/26
Risk: supplier quote may slip if we wait until next week`;

export const SAMPLE_NOTES_ZH = `小林：明天发送会议纪要
阿杰 - 5月24日确认场地预算
行动项：小周：今天整理报名名单
决定：先发布本地-only版本
问题：周五前要不要法务确认？
风险：供应商报价可能下周延迟`;

export function parseNotes(rawText, options = {}) {
  const baseDate = options.now ? new Date(options.now) : new Date();
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const actions = [];
  const decisions = [];
  const questions = [];
  const risks = [];
  const notes = [];

  for (const line of lines) {
    const cleaned = normalizeLine(line);

    if (isDecision(cleaned)) {
      decisions.push(stripLeadLabel(cleaned));
      continue;
    }

    if (isQuestion(cleaned)) {
      questions.push(stripLeadLabel(cleaned));
      continue;
    }

    if (isRisk(cleaned)) {
      risks.push(stripLeadLabel(cleaned));
      continue;
    }

    const actionableText = stripActionLead(cleaned);
    const ownerResult = extractOwner(actionableText);
    const body = ownerResult.body;
    const due = extractDueDate(body, baseDate);
    const priority = inferPriority(body, due);

    if (looksActionable(body, ownerResult.owner)) {
      actions.push({
        owner: ownerResult.owner || "Unassigned",
        task: stripActionLead(body),
        due,
        priority,
        source: cleaned
      });
      continue;
    }

    notes.push(cleaned);
  }

  if (options.sortByDue !== false) {
    actions.sort(compareActions);
  }

  return {
    actions,
    decisions,
    questions,
    risks,
    notes,
    originalLines: lines,
    generatedAt: formatDate(baseDate)
  };
}

export function buildMarkdown(brief, options = {}) {
  const sections = [`# Meeting Brief`, `Generated: ${brief.generatedAt}`];

  sections.push(`## Action Items`);
  sections.push(
    brief.actions.length
      ? brief.actions.map(formatActionMarkdown).join("\n")
      : "- No action items detected."
  );

  sections.push(`## Decisions`);
  sections.push(formatList(brief.decisions, "No decisions detected."));

  sections.push(`## Open Questions`);
  sections.push(formatList(brief.questions, "No open questions detected."));

  if (brief.risks.length) {
    sections.push(`## Risks`);
    sections.push(formatList(brief.risks, "No risks detected."));
  }

  if (brief.notes.length) {
    sections.push(`## Other Notes`);
    sections.push(formatList(brief.notes, "No other notes."));
  }

  if (options.keepOriginal) {
    sections.push(`## Original Lines`);
    sections.push(formatList(brief.originalLines, "No original lines."));
  }

  return sections.join("\n\n");
}

export function buildEmail(brief) {
  const lines = [
    "Hi team,",
    "",
    "Here is the cleaned follow-up from our notes.",
    "",
    "Action items:"
  ];

  if (brief.actions.length) {
    for (const action of brief.actions) {
      lines.push(`- ${action.owner}: ${action.task}${action.due ? ` (${action.due})` : ""}`);
    }
  } else {
    lines.push("- No action items detected.");
  }

  if (brief.decisions.length) {
    lines.push("", "Decisions:");
    brief.decisions.forEach((item) => lines.push(`- ${item}`));
  }

  if (brief.questions.length) {
    lines.push("", "Open questions:");
    brief.questions.forEach((item) => lines.push(`- ${item}`));
  }

  if (brief.risks.length) {
    lines.push("", "Risks to watch:");
    brief.risks.forEach((item) => lines.push(`- ${item}`));
  }

  lines.push("", "Thanks,");
  return lines.join("\n");
}

export function normalizeLine(line) {
  return line
    .replace(/^[*\-\u2022]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractOwner(line) {
  const ownerMatch = line.match(/^(@?[\p{L}\p{N} ._']{1,30}?)(?::|：|\s+-\s+|\s+to\s+)(.+)$/u);
  if (!ownerMatch) {
    return { owner: "", body: line };
  }

  const possibleOwner = ownerMatch[1].replace(/^@/, "").trim();
  if (ACTION_WORDS.some((word) => possibleOwner.toLowerCase().startsWith(word.toLowerCase()))) {
    return { owner: "", body: line };
  }

  return { owner: possibleOwner, body: ownerMatch[2].trim() };
}

function extractDueDate(text, baseDate) {
  const chineseFull = text.match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日?/);
  if (chineseFull) {
    return formatDate(new Date(Number(chineseFull[1]), Number(chineseFull[2]) - 1, Number(chineseFull[3])));
  }

  const chineseMonthDay = text.match(/(^|[^\d年])(\d{1,2})月\s*(\d{1,2})日?/);
  if (chineseMonthDay) {
    const year = baseDate.getFullYear();
    return formatDate(new Date(year, Number(chineseMonthDay[2]) - 1, Number(chineseMonthDay[3])));
  }

  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    return formatDate(new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  }

  const slash = text.match(/\b(\d{1,2})[/-](\d{1,2})\b/);
  if (slash) {
    const year = baseDate.getFullYear();
    return formatDate(new Date(year, Number(slash[1]) - 1, Number(slash[2])));
  }

  const lower = text.toLowerCase();
  if (/\btoday\b/.test(lower)) {
    return formatDate(baseDate);
  }

  if (/今天/.test(text)) {
    return formatDate(baseDate);
  }

  if (/\btomorrow\b/.test(lower)) {
    return formatDate(addDays(baseDate, 1));
  }

  if (/明天/.test(text)) {
    return formatDate(addDays(baseDate, 1));
  }

  if (/后天/.test(text)) {
    return formatDate(addDays(baseDate, 2));
  }

  for (let index = 0; index < DAY_NAMES.length; index += 1) {
    if (new RegExp(`\\b${DAY_NAMES[index]}\\b`).test(lower)) {
      const offset = nextDayOffset(baseDate.getDay(), index);
      return formatDate(addDays(baseDate, offset));
    }
  }

  for (const weekday of CHINESE_DAY_NAMES) {
    if (weekday.pattern.test(text)) {
      const offset = nextDayOffset(baseDate.getDay(), weekday.day);
      return formatDate(addDays(baseDate, offset));
    }
  }

  return "";
}

function inferPriority(text, due) {
  const lower = text.toLowerCase();
  if (/\b(urgent|asap|blocked|critical|risk)\b/.test(lower) || /(紧急|尽快|阻塞|风险|关键)/.test(text)) {
    return "high";
  }
  return due ? "dated" : "normal";
}

function isDecision(text) {
  return /^(decision|decided|we decided)\b[:\s-]*/i.test(text) || /^(决定|决议|结论|已决定)[:：\s-]*/.test(text);
}

function isQuestion(text) {
  return /^(question|q)\b[:\s-]*/i.test(text) || /^(问题|疑问)[:：\s-]*/.test(text) || /[?？]\s*$/.test(text);
}

function isRisk(text) {
  return /^(risk|blocker|blocked)\b[:\s-]*/i.test(text) || /^(风险|阻塞)[:：\s-]*/.test(text);
}

function looksActionable(text, owner) {
  const lower = text.toLowerCase();
  return Boolean(owner) || ACTION_WORDS.some((word) => lower.includes(word.toLowerCase()));
}

function stripLeadLabel(text) {
  return text
    .replace(/^(decision|decided|we decided|question|questions|q|risk|risks|blocker|blocked)\b[:\s-]*/i, "")
    .replace(/^(决定|决议|结论|已决定|问题|疑问|风险|阻塞)[:：\s-]*/, "")
    .trim();
}

function stripActionLead(text) {
  return text
    .replace(/^(todo)\b[:\s-]*/i, "")
    .replace(/^(action(?:\s+item)?|next step)\b\s*[:：-]\s*/i, "")
    .replace(/^(待办|行动项|下一步)\s*[:：-]\s*/, "")
    .trim();
}

function formatActionMarkdown(action) {
  const due = action.due ? ` | due: ${action.due}` : "";
  const priority = action.priority === "high" ? " | high" : "";
  return `- [ ] ${action.owner}: ${action.task}${due}${priority}`;
}

function formatList(items, emptyText) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : `- ${emptyText}`;
}

function compareActions(a, b) {
  if (a.due && b.due) {
    return a.due.localeCompare(b.due) || a.owner.localeCompare(b.owner);
  }
  if (a.due) return -1;
  if (b.due) return 1;
  return a.owner.localeCompare(b.owner);
}

function nextDayOffset(currentDay, targetDay) {
  const offset = (targetDay - currentDay + 7) % 7;
  return offset === 0 ? 7 : offset;
}

function addDays(date, count) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
