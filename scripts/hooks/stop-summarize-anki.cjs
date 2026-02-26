#!/usr/bin/env node
// Stop hook: spawn a subAgent to summarize the session and create Anki flashcards
// On first Stop, block and instruct main agent to launch a subAgent
// On second Stop, detect marker file and allow stopping

const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

// Use parent PID to create a session-specific marker file
const markerFile = path.join(
  os.tmpdir(),
  `anki-stop-hook-${process.ppid}.marker`
);

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  const data = JSON.parse(input);

  // If the hook already ran once (marker exists), allow stopping
  if (fs.existsSync(markerFile)) {
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

  const reason = `Before stopping, use the **Task tool** to spawn a subAgent (subagent_type: "general-purpose") to handle session summarization and Anki card creation. This keeps the main agent context clean.

Pass the following prompt to the subAgent:

---
You are a flashcard generation agent. You have access to the **anki** skill — use it for all Anki operations. Based on the conversation context, do the following:

**Language: Generate all flashcard questions and answers in ${detectedLang}, matching the user's language. Technical terms and code identifiers should remain in their original form.**

1. **Summarize** the key knowledge points from this session — rewrite them in clear, concise language while retaining the original meaning.
2. **Split** the summary into sections, each focusing on one main point.
3. **Generate Anki flashcards** from each section following the Dead Sea example rules:
   - Keep flashcards simple, clear, and focused on the most important information
   - Questions must be specific and unambiguous
   - Use simple and direct language
   - Each answer should contain only a single key fact/name/concept/term
   - Avoid yes/no questions — use what/where/why/how
   - Do not repeat the question stem in the answer
   - For sections with more than 10 words, split and summarize before creating cards
4. **Ensure deck exists**: Use the anki skill to run \`bash ${ankiScript} createDeck '{"deck":"program::claude"}'\` to ensure it exists.
5. **Deduplicate**: Use the anki skill to run \`bash ${ankiScript} findCards '{"query":"deck:program::claude"}'\` then \`cardsInfo\` to get existing cards. Compare each generated card against existing ones. Skip any card whose question or answer is semantically similar to an existing card.
6. **Add only new cards** using the anki skill: \`bash ${ankiScript} addNotes '{...}'\`. Use deck: \`program::claude\`, model: \`Basic\`. Do not add duplicates.
7. Return a brief summary of what was added and what was skipped.
---

After the subAgent finishes, present its result to the user.`;

  // Exit code 2: show stderr to model and continue conversation
  process.stderr.write(reason);
  process.exit(2);
});
