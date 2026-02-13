# Anki Skills

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/AnkiConnect-v6-green?style=for-the-badge" alt="AnkiConnect v6">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-orange?style=for-the-badge" alt="GPL-3.0"></a>
</p>

A Claude Code skill for managing Anki flashcards via [AnkiConnect](https://github.com/FooSoft/anki-connect) HTTP API. No MCP server needed — just `curl`.

## Features

- **Deck Management** — Create, list, and get statistics for decks
- **Card Creation** — Add single or batch flashcards with tags and duplicate control
- **Template Builder** — Create custom note types (models) with CSS and card templates
- **Study Statistics** — View daily review counts, review history, and deck stats
- **Smart Generation** — Built-in prompt for generating high-quality Q&A flashcards from any text
- **File Import** — Generate flashcards from PDF, CSV, and Excel files (via bundled `pdf` and `xlsx` skills)
- **Batch Operations** — Combine multiple API calls in a single request with `multi`

## Prerequisites

1. [Anki](https://apps.ankiweb.net/) desktop running
2. [AnkiConnect](https://ankiweb.net/shared/info/2055492159) plugin installed (code: `2055492159`)

## Installation

### Manual

```bash
# Clone the repository
git clone --recurse-submodules https://github.com/ishiko732/anki-skills.git ~/code/anki-skills

# Symlink skills to ~/.agents/skills/
ln -sfn ~/code/anki-skills/.agents/skills/anki ~/.agents/skills/anki
ln -sfn ~/code/anki-skills/.agents/skills/pdf  ~/.agents/skills/pdf
ln -sfn ~/code/anki-skills/.agents/skills/xlsx ~/.agents/skills/xlsx
```

### Verify

```bash
bash ~/.agents/skills/anki/scripts/anki-connect.sh version
# → {"result": 6, "error": null}
```

## Usage

The skill activates automatically when you mention Anki-related tasks in Claude Code:

```
List my Anki decks

Create 5 flashcards about photosynthesis in the Biology deck

Import this PDF as flashcards

Show my review statistics for today
```

## Project Structure

```
anki-skills/
├── .agents/skills/
│   ├── anki/                               # Anki skill
│   │   ├── SKILL.md                        # Skill definition (auto-activate)
│   │   └── scripts/anki-connect.sh         # curl wrapper for AnkiConnect API
│   ├── pdf → ../../vendor/anthropic-skills/skills/pdf
│   └── xlsx → ../../vendor/anthropic-skills/skills/xlsx
├── vendor/
│   └── anthropic-skills/                   # git submodule (sparse-checkout)
│       └── skills/{pdf, xlsx}
├── .claude-plugin/
│   ├── plugin.json                         # Plugin metadata
│   └── marketplace.json                    # Marketplace listing
├── LICENSE                                 # GPL-3.0
└── README.md
```

## Supported AnkiConnect Actions

| Category | Actions |
|----------|---------|
| **Connection** | `version` |
| **Decks** | `deckNames`, `deckNamesAndIds`, `createDeck`, `getDeckStats` |
| **Models** | `modelNames`, `createModel` |
| **Notes** | `addNote`, `addNotes`, `findNotes`, `updateNoteFields` |
| **Cards** | `findCards`, `cardsInfo` |
| **Statistics** | `getNumCardsReviewedToday`, `getNumCardsReviewedByDay`, `cardReviews`, `getReviewsOfCards` |
| **Batch** | `multi` |

## Flashcard Generation

The skill includes a built-in generation guide based on [spaced repetition best practices](https://forums.ankiweb.net/t/casting-a-spell-on-chatgpt-let-it-write-anki-cards-for-you-a-prompt-engineering-case/27907):

1. **Rewrite** source content clearly and concisely
2. **Split** into sections, each focusing on one point
3. **Generate** Q&A pairs — one fact per answer, no yes/no questions

Cards are presented in a table for review before being added to Anki.

## Helper Script

```bash
# Usage
bash scripts/anki-connect.sh <action> [params_json]

# Examples
bash scripts/anki-connect.sh deckNames
bash scripts/anki-connect.sh addNote '{"note":{"deckName":"Default","modelName":"Basic","fields":{"Front":"Q","Back":"A"},"tags":["test"]}}'

# Override endpoint
ANKI_CONNECT_URL=http://192.168.1.100:8765 bash scripts/anki-connect.sh version
```

## License

[GPL-3.0](LICENSE)
