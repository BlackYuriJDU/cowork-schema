# cowork-schema

**The open pattern for adding a "Cowork" mode to your own AI app** — a regular chat on one side, an agent that *works* on the other, with the user watching everything happen in real time.

This repository extracts, generalizes and documents a Cowork system that ran in production inside an agent harness (as a client/server plugin), inspired by **Claude Cowork** (Anthropic) and **ChatGPT Work** (OpenAI) — but written to be integrated into **any** site or app with an AI agent, without depending on any of them.

## What is "Cowork"?

Cowork is a **session mode** — not a new model, not a separate product. When active:

1. **The agent works, not just chats.** It executes multi-step tasks (browsing the web, reading/writing files, producing deliverables) instead of answering one prompt at a time.
2. **The user watches.** A side panel shows what the agent is doing in real time — in our case, live screenshots of the browser the agent is operating.
3. **Strict rules of conduct.** A behavior "law" is injected into the agent's context: narrate every step, never run destructive actions without confirmation, deliver files to predictable locations, wrap up with a summary.

It's the same pattern Anthropic popularized with Claude Cowork (Jan 2026) and OpenAI followed with ChatGPT Work (Jul 2026): **delegate an outcome, watch the process, review the deliverable.**

> Historical note: in Sept 2026 Anthropic merged Cowork into Claude's main chat, removing the toggle — routing became automatic. The design lesson is documented in [`docs/05-research.md`](docs/05-research.md): an explicit toggle and automatic routing are both valid answers to the same problem.

> **Example stack:** JavaScript/React (Node 18+ on the host, JSX in the panel) — but the **pattern is language-agnostic**: a markdown law, state as a fold over an event log, a panel as an `<img>` fed by URLs. Porting to Python/Go/Elixir means reimplementing ~150 lines of logic; the docs explain the contract, not the syntax.

## The 4 systems

Cowork is composed of four independent, composable systems. Each has a dedicated doc:

| # | System | What it does | Doc |
|---|--------|--------------|-----|
| 1 | **Mode Law** | Conduct protocol injected into the system prompt while the mode is active | [`docs/01-mode-law.md`](docs/01-mode-law.md) |
| 2 | **Mode State** | State derived from the session event log (fold), not a volatile variable — survives reload | [`docs/02-mode-state.md`](docs/02-mode-state.md) |
| 3 | **Live Panel** | Side UI with task timer, live browser (screenshots) and steering input | [`docs/03-live-panel.md`](docs/03-live-panel.md) |
| 4 | **Browser Feed** | Pipeline that turns the agent's navigation into images the panel displays | [`docs/04-browser-feed.md`](docs/04-browser-feed.md) |

Also:

- [`docs/05-research.md`](docs/05-research.md) — how Claude Cowork, ChatGPT Work and Browser Use Cloud implement each piece (with sources).
- [`docs/06-integration-checklist.md`](docs/06-integration-checklist.md) — integration checklist + real production traps.
- [`schema/cowork-mode.schema.json`](schema/cowork-mode.schema.json) — declarative configuration contract (JSON Schema) for a Cowork mode, with a filled reference in [`schema/cowork-mode.example.json`](schema/cowork-mode.example.json).

## Quickstart (30 minutes)

Prerequisites: you already have an app with an AI agent that (a) accepts a dynamic system prompt and (b) has some web-navigation tool.

```bash
git clone https://github.com/BlackYuriJDU/cowork-schema.git
cd cowork-schema
```

**0. Get a Browser Use Cloud API key** — the canonical browser provider; it hosts the screenshots the panel displays:

1. Sign up at [cloud.browser-use.com](https://cloud.browser-use.com) (eligible new accounts get one-time credits).
2. Create a key at [cloud.browser-use.com/new-api-key](https://cloud.browser-use.com/new-api-key).
3. Set it on the agent host — **server-side only, never in client code**:

```bash
# .env
BROWSER_USE_API_KEY=bu_live_...
```

Your agent's web tool calls `POST https://api.browser-use.com/api/v2/tasks` with header `X-Browser-Use-API-Key` (or uses the `browser-use-sdk`, which reads the env var automatically). Each step returns a screenshot URL at `cdn.browser-use.com` — that's what feeds the panel. Details and alternatives (Playwright, CDP) in [`docs/04-browser-feed.md`](docs/04-browser-feed.md).

**1. Copy the mode law and adjust the paths:**

```bash
cp law/cowork-core.md /your/app/law/cowork-core.md
# edit: deliverables directory ($COWORK_DIR), browser tool name, hard limits
```

**2. Inject the law into context while the mode is active** (adapted from [`examples/host-commands.js`](examples/host-commands.js)):

```js
import { buildModeSection } from "./examples/host-commands.js";

const section = buildModeSection({
  sessionEvents: session.events,          // the session's durable log
  readFile: (p) => readFileSync(p, "utf8"),
});
const systemPrompt = [basePrompt, section].filter(Boolean).join("\n\n");
// section === "" when the mode is off
```

**3. Register the `/cowork` and `/chat` commands** — they only record a `command/run` event in the session log; state is *derived* from them (see why in [`docs/02-mode-state.md`](docs/02-mode-state.md)).

**4. Render the panel** ([`examples/cowork-panel.jsx`](examples/cowork-panel.jsx)), fed by the latest screenshot the agent published in the session ([`examples/browser-feed.js`](examples/browser-feed.js)).

**5. Test the full loop:** activate `/cowork` → ask "research X and save a summary" → watch screenshots appear in the panel → receive the deliverable with a file list → `/chat` to exit.

## Repository layout

```
cowork-schema/
├── README.md                        ← you are here
├── law/
│   └── cowork-core.md               ← the mode law (agent conduct protocol)
├── schema/
│   ├── cowork-mode.schema.json      ← declarative contract of a Cowork mode
│   └── cowork-mode.example.json     ← filled reference config (validatable)
├── examples/
│   ├── host-commands.js             ← Systems 1+2: /cowork·/chat commands + prompt injection
│   ├── browser-feed.js              ← System 4: screenshot feed extraction from the session
│   └── cowork-panel.jsx             ← System 3: panel (timer + live browser + input)
├── docs/
│   ├── 01-mode-law.md               ← how to write and inject the law
│   ├── 02-mode-state.md             ← event-log fold; commands; persistence
│   ├── 03-live-panel.md             ← panel anatomy and UI patterns
│   ├── 04-browser-feed.md           ← Browser Use Cloud setup and alternatives
│   ├── 05-research.md               ← Claude Cowork · ChatGPT Work · Browser Use Cloud
│   └── 06-integration-checklist.md  ← checklist + production traps
└── LICENSE                          ← MIT
```

## Design principles (the why behind each decision)

1. **Mode is context, not a message.** The law enters through the system prompt on every prompt assembly — never as a `[MODE ACTIVATED]` message in history, which pollutes the conversation and gets lost in truncation.
2. **State is derived, not stored.** The active mode is the result of a fold over the session's durable event log. Reload, restart, multiple tabs — all converge to the same state because they all read the same source.
3. **The panel is a mirror, not a channel.** It reads what already exists in the session (screenshots published by tools) instead of maintaining a parallel channel that can desynchronize.
4. **Hard limits live in the law, not the UI.** "Ask before destroying" holds even if the user triggers the agent through another path (API, CLI), because it's in the model's context.

## Origin

Extracted from a production plugin for an agent harness, where Cowork mode ran live: `Chat · Design · Cowork` pills in the composer, a side-column panel with a live browser via [Browser Use Cloud](https://cloud.browser-use.com), the law injected via a system-prompt section, and state derived from the event log. Harness-specific parts were replaced with generic interfaces; the design decisions and documented traps are the real ones.

## License

MIT — use, copy and adapt freely in your product.
