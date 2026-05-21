import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const files = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("styles.css", "utf8"),
  readFile("src/app.js", "utf8"),
  readFile("src/parser.js", "utf8"),
  readFile("README.md", "utf8")
]);

const [html, css, app, parser, readme] = files;
const combined = files.join("\n");

assert.match(html, /<script type="module" src="src\/app\.js"><\/script>/);
assert.match(html, /id="notesInput"/);
assert.match(css, /@media \(max-width: 860px\)/);
assert.match(app, /navigator\.clipboard\.writeText/);
assert.match(parser, /export function parseNotes/);
assert.match(readme, /fun-20260521-b-meeting-brief/);
assert.doesNotMatch(combined, /gho_[A-Za-z0-9_]+/);
assert.doesNotMatch(combined, /\/Users\/batuer/);
assert.doesNotMatch(combined, /node_modules/);

console.log("Static file check passed.");
