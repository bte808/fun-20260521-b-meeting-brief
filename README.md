# Meeting Brief

Meeting Brief is a local-first browser tool that turns rough meeting notes into a clean action brief. Paste messy notes, click once, then copy a Markdown summary or a follow-up email.

Repository: `fun-20260521-b-meeting-brief`

## What It Does

- Detects action items from lines with an owner or action verb.
- Pulls out decisions, questions, risks, and other notes.
- Recognizes simple due dates such as `2026-05-24`, `5/24`, `tomorrow`, and weekdays.
- Generates copyable Markdown and an email follow-up draft.
- Saves the Markdown brief as a local `.md` file.
- Runs fully in the browser with no login, API key, upload, or server database.

## Why It Is Useful

Meeting notes often end as a half-cleaned paste from chat, class, calls, or planning docs. This tool gives you the practical middle step: paste rough text, get a structured handoff, then move on.

## Why It Is Fun

It makes a messy text blob feel organized in one click. The small parser is intentionally transparent, so it is easy to tweak the rules and immediately see better briefs.

## Inspiration

This project was inspired by recent public discussions and listings around small productivity utilities:

- A Reddit micro-SaaS discussion about tiny utilities winning when they are fast and obvious: <https://www.reddit.com/r/micro_saas/comments/1tbfwy6/building_a_tiny_utility_tool_taught_me_that_users/>
- Product-hunt-style meeting-note tooling such as MeetMinutes: <https://hunted.space/product/meetminutes>
- Local-first and productivity-tool discovery pages on GitHub: <https://github.com/topics/local-first>

The implementation, text, UI, and code here are original.

## How To Run

Open `index.html` directly in a browser, or run a local static server:

```bash
python3 -m http.server 5181
```

Then open:

```text
http://localhost:5181/
```

## Core Usage

1. Paste rough notes into the input box.
2. Keep or change the export options.
3. Click **Generate brief**.
4. Use **Copy** or **Save .md**.
5. Switch between Preview, Markdown, and Email views.

## Example Input

```text
Alex: send revised launch deck by Friday
Mina - confirm budget by 2026-05-24
Decision: ship the local-only version first
Question: Do we need legal review before the beta invite?
Follow up with Kai tomorrow about venue booking
```

## Checks

```bash
npm test
npm run check
```

The checks cover parsing behavior and a lightweight static scan for expected files, browser hooks, responsive CSS, and accidental secret/local-path strings.

## Possible Extensions

- Add `.ics` calendar reminders for dated action items.
- Add editable parser rules for team-specific owner names.
- Add a compact print view for handoff notes.
- Add Chinese action and date phrase detection.
