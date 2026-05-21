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
  "action"
];

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export const SAMPLE_NOTES = `Alex: send revised launch deck by Friday
Mina - confirm budget by 2026-05-24
Decision: ship the local-only version first
Question: Do we need legal review before the beta invite?
Follow up with Kai tomorrow about venue booking
Sam to review onboarding copy 5/26
Risk: supplier quote may slip if we wait until next week`;

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

    const ownerResult = extractOwner(cleaned);
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
  const ownerMatch = line.match(/^(@?[A-Z][A-Za-z0-9 ._']{0,28}?)(?::|\s+-\s+|\s+to\s+)(.+)$/);
  if (!ownerMatch) {
    return { owner: "", body: line };
  }

  const possibleOwner = ownerMatch[1].replace(/^@/, "").trim();
  if (ACTION_WORDS.some((word) => possibleOwner.toLowerCase().startsWith(word))) {
    return { owner: "", body: line };
  }

  return { owner: possibleOwner, body: ownerMatch[2].trim() };
}

function extractDueDate(text, baseDate) {
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

  if (/\btomorrow\b/.test(lower)) {
    return formatDate(addDays(baseDate, 1));
  }

  for (let index = 0; index < DAY_NAMES.length; index += 1) {
    if (new RegExp(`\\b${DAY_NAMES[index]}\\b`).test(lower)) {
      const offset = nextDayOffset(baseDate.getDay(), index);
      return formatDate(addDays(baseDate, offset));
    }
  }

  return "";
}

function inferPriority(text, due) {
  const lower = text.toLowerCase();
  if (/\b(urgent|asap|blocked|critical|risk)\b/.test(lower)) {
    return "high";
  }
  return due ? "dated" : "normal";
}

function isDecision(text) {
  return /^(decision|decided|we decided)\b[:\s-]*/i.test(text);
}

function isQuestion(text) {
  return /^(question|q)\b[:\s-]*/i.test(text) || /\?\s*$/.test(text);
}

function isRisk(text) {
  return /^(risk|blocker|blocked)\b[:\s-]*/i.test(text);
}

function looksActionable(text, owner) {
  const lower = text.toLowerCase();
  return Boolean(owner) || ACTION_WORDS.some((word) => lower.includes(word));
}

function stripLeadLabel(text, label) {
  return text
    .replace(/^(decision|decided|we decided|question|questions|q|risk|risks|blocker|blocked)\b[:\s-]*/i, "")
    .trim();
}

function stripActionLead(text) {
  return text.replace(/^(todo|action)\b[:\s-]*/i, "").trim();
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
