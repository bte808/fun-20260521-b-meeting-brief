import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEmail, buildMarkdown, parseNotes } from "../src/parser.js";

const NOW = new Date(2026, 4, 21, 10, 0, 0);

describe("parseNotes", () => {
  it("extracts owners, action items, and due dates", () => {
    const brief = parseNotes("Alex: send deck by Friday\nMina - confirm budget 5/24", { now: NOW });

    assert.equal(brief.actions.length, 2);
    assert.equal(brief.actions[0].owner, "Alex");
    assert.equal(brief.actions[0].due, "2026-05-22");
    assert.equal(brief.actions[1].owner, "Mina");
    assert.equal(brief.actions[1].due, "2026-05-24");
  });

  it("classifies decisions, questions, and risks", () => {
    const brief = parseNotes(
      "Decision: ship local first\nQuestion: Need legal review?\nRisk: quote may slip",
      { now: NOW }
    );

    assert.deepEqual(brief.decisions, ["ship local first"]);
    assert.deepEqual(brief.questions, ["Need legal review?"]);
    assert.deepEqual(brief.risks, ["quote may slip"]);
  });

  it("builds copyable markdown and follow-up email", () => {
    const brief = parseNotes("Sam to review onboarding copy tomorrow\nDecision: keep it local", { now: NOW });
    const markdown = buildMarkdown(brief, { keepOriginal: true });
    const email = buildEmail(brief);

    assert.match(markdown, /Sam: review onboarding copy tomorrow/);
    assert.match(markdown, /due: 2026-05-22/);
    assert.match(markdown, /Original Lines/);
    assert.match(email, /Hi team/);
    assert.match(email, /Decisions:/);
  });
});
