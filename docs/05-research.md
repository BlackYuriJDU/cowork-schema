# Research — how the market implements "Cowork"

This document maps how the three references implement each system, with
sources. Use it to calibrate your own design decisions.

## Claude Cowork (Anthropic)

Launched January 12, 2026 as a macOS research preview for Max subscribers;
pitched as "Claude Code's agentic pattern applied to non-technical work."
Reached GA on macOS/Windows in April 2026, web and mobile in July 2026 —
with the key architectural change of **remote execution**: sessions run in
an isolated cloud sandbox and continue after the laptop closes.

Key traits:

- **Tasks and Projects**: units of work (on demand or scheduled) inside
  persistent workspaces with their own files, instructions and memory.
- **Running trace**: every file opened and every tool called is visible to
  the user — the transparency our panel embodies with screenshots.
- **Sub-agents**: large jobs split into parallel chunks that report back.
- **Connectors + MCP + computer use** ("Dispatch"): drives a real screen
  when no direct integration exists.
- **Guardrails**: e-mail sending is off by default, admin-gated, with an
  "agent-initiated" attribution header — the same philosophy as our law's
  hard limits.
- **The September 2026 twist**: Anthropic merged Cowork into the main chat
  and **removed the toggle** — the model now routes automatically between
  quick answer and long-running task. Their stated reason: users found
  "deciding where a task belonged" the frustrating part. Lesson: an explicit
  toggle (this repo) and automatic routing are both valid answers; if you
  keep the toggle, make the mode obvious and the switch lossless.

Sources: Anthropic announcements via
[The Verge / coverage roundup](https://xda-developers.com/anthropic-merges-claude-cowork-and-chat-into-one-singular-claude),
[usecarly.com](https://usecarly.com/blog/what-is-claude-cowork),
[macmyths.com](https://macmyths.com/anthropic-launches-cowork-a-claude-desktop-agent-that-works-in-your-files-no-coding-required),
[smithstephen.com](https://smithstephen.com/p/claude-stopped-asking-which-mode).

## ChatGPT Work (OpenAI)

Launched July 9, 2026 alongside GPT-5.6, as the middle mode of a three-mode
desktop app (**Chat · Work · Codex**) — a direct answer to Claude Cowork.

Key traits:

- **Loop pattern productized**: describe a goal → Work gathers context from
  connected apps → decomposes into subtasks → executes for hours → delivers
  finished files (spreadsheets, decks, docs) or hosted mini-apps ("Sites").
- **Web-first**: center of gravity is browsing, forms and SaaS orchestration
  via 1,400+ connectors; local file access only on desktop.
- **@ mentions**: the user explicitly points Work at a connected app
  mid-task — a steering convention comparable to our `[COWORK ITERATION]`
  prefix.
- **Background execution with check-ins**: only surfaces questions that
  genuinely require user judgment.
- **Computer use (CUA)** on desktop: clicks, types and moves files across
  local apps.

Sources: [OpenAI launch coverage](https://linkedin.com/pulse/openai-launches-new-chatgpt-work-app-compete-claude-cowork-eric-eden-uumze),
[tarekalaaddin.com comparison](https://tarekalaaddin.com/blog/chatgpt-work-vs-claude-cowork),
[spicyadvisory.com](https://spicyadvisory.com/blog/chatgpt-work-gpt-5-6-business-guide-2026).

## Browser Use Cloud

The infrastructure our System 4 builds on. Hosted browser automation:
stealth browsers, proxy rotation, CAPTCHA handling, parallel execution —
and, critically for the panel, **hosted screenshots per step** plus a
`liveUrl` stream per session.

- REST API: `https://api.browser-use.com/api/v2` (and v3), auth via
  `X-Browser-Use-API-Key`.
- SDKs: `browser-use-sdk` (Python and TypeScript); the open-source
  `browser-use` library can run its agent against cloud browsers with
  `Browser(use_cloud=True)`.
- API keys: [cloud.browser-use.com/new-api-key](https://cloud.browser-use.com/new-api-key).
- Used in production by teams like Amazon, Salesforce, Composio and Manus
  (per their site).

Sources: [cloud.browser-use.com](https://cloud.browser-use.com),
[docs.browser-use.com](https://docs.browser-use.com),
[github.com/browser-use/browser-use](https://github.com/browser-use/browser-use).

## Comparison table

| Concern | Claude Cowork | ChatGPT Work | This schema |
|---|---|---|---|
| Mode activation | Toggle (later: auto-routing) | Explicit mode tab | Explicit command (`/cowork`) |
| Behavior contract | System-level, opaque | System-level, opaque | **Open law file you own** |
| Progress visibility | Running trace of tools/files | Background + check-ins | Live screenshot panel |
| Browser | Built-in + computer use | Built-in (CUA) | Browser Use Cloud (swappable) |
| State | Cloud sessions | Cloud sessions | Derived from event log (fold) |
| Deliverables | Files in granted folders | Office files, Sites | Convention: `$COWORK_DIR/<date>-<slug>/` |
| Destructive actions | Permission modes (Manual/Auto) | Check-ins | Hard limits in the law |

The differentiator of this schema is not capability — it's **ownership**:
every rule is a file in your repo, every state transition is an event in
your log, every pixel in the panel comes from your session.
