#!/usr/bin/env node
// Stop hook: spawn a subAgent to summarize the session and create Anki flashcards
// On first Stop, block and instruct main agent to launch a subAgent
// On second Stop (stop_hook_active=true), allow stopping

const path = require("node:path");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  const data = JSON.parse(input);

  // If the hook already ran once, allow stopping
  if (data.stop_hook_active === true) {
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

  const reason = `Before stopping, use the **Task tool** to spawn a subAgent (subagent_type: "general-purpose") to handle session summarization and Anki card creation. This keeps the main agent context clean.

Pass the following prompt to the subAgent:

---
You are a flashcard generation agent. You have access to the **anki** skill — use it for all Anki operations. Based on the conversation context, do the following:

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

  const output = JSON.stringify({ decision: "block", reason });
  process.stdout.write(output);
  process.exit(0);
});
