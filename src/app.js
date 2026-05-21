import { SAMPLE_NOTES, buildEmail, buildMarkdown, parseNotes } from "./parser.js";

const notesInput = document.querySelector("#notesInput");
const keepOriginal = document.querySelector("#keepOriginal");
const sortByDue = document.querySelector("#sortByDue");
const includeEmail = document.querySelector("#includeEmail");
const parseBtn = document.querySelector("#parseBtn");
const clearBtn = document.querySelector("#clearBtn");
const sampleBtn = document.querySelector("#sampleBtn");
const copyBtn = document.querySelector("#copyBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const preview = document.querySelector("#preview");
const markdownOutput = document.querySelector("#markdownOutput");
const emailOutput = document.querySelector("#emailOutput");
const statusLine = document.querySelector("#statusLine");
const actionCount = document.querySelector("#actionCount");
const decisionCount = document.querySelector("#decisionCount");
const questionCount = document.querySelector("#questionCount");
const tabButtons = document.querySelectorAll(".tab-button");
const panels = document.querySelectorAll("[data-view-panel]");

let latestMarkdown = "";
let latestEmail = "";
let currentView = "preview";

notesInput.value = SAMPLE_NOTES;
generateBrief();

parseBtn.addEventListener("click", generateBrief);
sampleBtn.addEventListener("click", () => {
  notesInput.value = SAMPLE_NOTES;
  generateBrief();
});

clearBtn.addEventListener("click", () => {
  notesInput.value = "";
  latestMarkdown = "";
  latestEmail = "";
  renderEmpty("Notes cleared. Paste a few lines to generate a new brief.");
});

copyBtn.addEventListener("click", async () => {
  const text = currentView === "email" ? latestEmail : latestMarkdown;
  if (!text) {
    setStatus("Nothing to copy yet.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus("Copied the current brief.");
  } catch {
    setStatus("Copy was blocked by the browser. Select the Markdown or Email text and copy manually.");
  }
});

downloadBtn.addEventListener("click", () => {
  if (!latestMarkdown) {
    setStatus("Nothing to save yet.");
    return;
  }

  const blob = new Blob([latestMarkdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "meeting-brief.md";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("Saved meeting-brief.md.");
});

for (const button of tabButtons) {
  button.addEventListener("click", () => switchView(button.dataset.view));
}

function generateBrief() {
  const text = notesInput.value.trim();
  if (!text) {
    latestMarkdown = "";
    latestEmail = "";
    renderEmpty("Paste notes or use the sample to generate a brief.");
    return;
  }

  const brief = parseNotes(text, { sortByDue: sortByDue.checked });
  latestMarkdown = buildMarkdown(brief, { keepOriginal: keepOriginal.checked });
  latestEmail = includeEmail.checked ? buildEmail(brief) : "";

  actionCount.textContent = String(brief.actions.length);
  decisionCount.textContent = String(brief.decisions.length);
  questionCount.textContent = String(brief.questions.length);
  markdownOutput.value = latestMarkdown;
  emailOutput.value = latestEmail || "Email output is disabled.";
  preview.innerHTML = renderPreview(brief);
  setStatus(`Generated ${brief.actions.length} actions, ${brief.decisions.length} decisions, and ${brief.questions.length} questions.`);
}

function renderPreview(brief) {
  return [
    renderActions(brief.actions),
    renderSection("Decisions", brief.decisions),
    renderSection("Open Questions", brief.questions),
    brief.risks.length ? renderSection("Risks", brief.risks, "high") : "",
    brief.notes.length ? renderSection("Other Notes", brief.notes) : ""
  ].join("");
}

function renderActions(actions) {
  const items = actions.length
    ? actions
        .map((action) => {
          const tags = [
            `<span class="tag">${escapeHtml(action.owner)}</span>`,
            action.due ? `<span class="tag due">${escapeHtml(action.due)}</span>` : "",
            action.priority === "high" ? `<span class="tag high">high</span>` : ""
          ].filter(Boolean);
          return `<li>${tags.join(" ")} ${escapeHtml(action.task)}</li>`;
        })
        .join("")
    : `<li>No action items detected.</li>`;

  return `<h3>Action Items</h3><ul>${items}</ul>`;
}

function renderSection(title, items, tagClass = "") {
  const itemHtml = items.length
    ? items.map((item) => `<li>${tagClass ? `<span class="tag ${tagClass}">${tagClass}</span>` : ""}${escapeHtml(item)}</li>`).join("")
    : `<li>Nothing detected.</li>`;

  return `<h3>${escapeHtml(title)}</h3><ul>${itemHtml}</ul>`;
}

function renderEmpty(message) {
  actionCount.textContent = "0";
  decisionCount.textContent = "0";
  questionCount.textContent = "0";
  markdownOutput.value = "";
  emailOutput.value = "";
  preview.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
  setStatus(message);
}

function switchView(nextView) {
  currentView = nextView;
  for (const button of tabButtons) {
    const active = button.dataset.view === nextView;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  }
  for (const panel of panels) {
    panel.hidden = panel.dataset.viewPanel !== nextView;
  }
}

function setStatus(message) {
  statusLine.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
