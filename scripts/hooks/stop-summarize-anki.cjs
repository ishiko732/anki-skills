#!/usr/bin/env node
// Stop hook: spawn a subAgent to summarize the session and create Anki flashcards
// On first Stop, block and instruct main agent to launch a subAgent
// On subsequent Stops, allow stopping (via stop_hook_active or marker file)

const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  const data = JSON.parse(input);

  // Use session_id-based marker file as fallback for stop_hook_active
  const markerFile = path.join(
    os.tmpdir(),
    `anki-stop-hook-${data.session_id || "unknown"}.marker`
  );

  // If stop_hook_active is true OR marker file exists, allow stopping
  if (data.stop_hook_active || fs.existsSync(markerFile)) {
    try {
      fs.unlinkSync(markerFile);
    } catch (_) {
      // ignore cleanup errors
    }
    process.exit(0);
  }

  // Create marker file to track that we've blocked once
  try {
    fs.writeFileSync(markerFile, String(Date.now()));
  } catch (_) {
    // If we can't write the marker, allow stopping to avoid infinite blocking
    process.exit(0);
  }

  // Resolve the anki-connect script path relative to plugin root
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || process.cwd();
  const ankiScript = path.join(
    pluginRoot,
    ".agents",
    "skills",
    "anki",
    "scripts",
    "anki-connect.sh"
  );

  // Detect language from the last assistant message
  const lastMessage = data.last_assistant_message || "";
  const cjkPattern = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g;
  const cjkMatches = lastMessage.match(cjkPattern) || [];
  const cjkRatio = lastMessage.length > 0 ? cjkMatches.length / lastMessage.length : 0;

  let detectedLang = "English";
  if (cjkRatio > 0.1) {
    // Further distinguish CJK languages
    const zhPattern = /[\u4e00-\u9fff]/g;
    const jaPattern = /[\u3040-\u309f\u30a0-\u30ff]/g;
    const koPattern = /[\uac00-\ud7af]/g;
    const zhCount = (lastMessage.match(zhPattern) || []).length;
    const jaCount = (lastMessage.match(jaPattern) || []).length;
    const koCount = (lastMessage.match(koPattern) || []).length;
    const maxCjk = Math.max(zhCount, jaCount, koCount);
    if (maxCjk === jaCount && jaCount > 0) {
      detectedLang = "Japanese";
    } else if (maxCjk === koCount && koCount > 0) {
      detectedLang = "Korean";
    } else {
      detectedLang = "Chinese";
    }
  }

  const reason = `Before stopping, use the **Task tool** to spawn a subAgent (subagent_type: "anki-flashcard-generator") to handle session summarization and Anki card creation. This keeps the main agent context clean.

Pass the following prompt to the subAgent:

---
Review the conversation context and generate Anki flashcards following your instructions.

**Detected language: ${detectedLang}** — generate flashcard content in this language. Technical terms and code identifiers should remain in their original form.

**Anki-connect script path: ${ankiScript}** — use this path for all anki-connect operations.
---

After the subAgent finishes, present its result to the user.`;

  // Exit 0 with JSON: decision "block" prevents stopping, reason is fed to Claude
  // suppressOutput hides the hook output from the UI error display
  const output = JSON.stringify({ decision: "block", reason, suppressOutput: true });
  process.stdout.write(output);
  process.exit(0);
});
