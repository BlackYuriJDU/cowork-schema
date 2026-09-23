# System 1 — Mode Law

The **law** is the behavioral contract of Cowork mode: a markdown document
injected into the agent's context **on every prompt assembly** while the mode
is active. The canonical version lives in [`law/cowork-core.md`](../law/cowork-core.md).

## Why a "law" and not a prompt

| Approach | Problem |
|---|---|
| Message `[COWORK ACTIVATED]` in history | Pollutes the conversation, counts as a user turn, gets lost when history is truncated |
| One-shot system prompt at task start | Stops applying if the session is rebuilt or the context is reassembled |
| **Dynamic system-prompt section** | Re-evaluated on every assembly; survives truncation, reload and restart |

The pattern: your prompt builder asks "is Cowork mode active in this session?"
and, if so, concatenates the law's content with a header making clear it is
**context injection, not a user message**:

```
COWORK MODE ACTIVE — context injection (this is NOT a user message).
Applies to ALL turns of this session; only /chat deactivates it.

<law content>
```

## Anatomy of a good law

The canonical law has 5 sections, all deliberate:

1. **Narrate the work** — the panel shows images; without narration the user
   watches a silent film. One line per action block.
2. **Live browser** — forces the tool that *publishes screenshots* (Browser
   Use Cloud) and small steps (each step = one new capture in the panel).
   Without this clause the agent may solve everything via API and the panel
   stays empty.
3. **Files as deliverables** — predictable directory
   (`$COWORK_DIR/<YYYY-MM-DD>-<slug>/`), absolute paths, mandatory final
   listing. The panel and the user both depend on this convention.
4. **Hard limits** — destructive actions require prior confirmation; never
   expose secrets; stop if scope drifts. This lives in the law (not the UI)
   so it holds even when the agent is triggered via API/CLI.
5. **Wrap-up** — summary ≤5 lines with files and pending items. Closes the
   delegation loop.

## Adapting to your app

1. **Replace the paths.** `$COWORK_DIR/<YYYY-MM-DD>-<slug>/` is a placeholder;
   pick yours (e.g. `~/cowork/`, `/var/app/deliverables/`) and keep the law,
   the schema (`deliverables.directoryTemplate`) and the UI consistent.
2. **Replace the browser tool** if you don't use Browser Use Cloud — see
   [`04-browser-feed.md`](04-browser-feed.md) for alternatives. The law must
   name the tool the agent actually has.
3. **Keep it short.** The law rides along in every prompt of the session;
   each line costs tokens on every turn. The canonical version is 31 lines.
4. **Don't negotiate the hard limits.** If your app sends e-mail or posts on
   social media, that section is what stands between the agent and an
   irreversible incident.

## Anti-patterns

- ❌ Injecting the law as a user message "so the model takes it seriously" —
  the opposite happens: it becomes negotiable conversation.
- ❌ Law with examples of *what to build* — that's a task brief, not a law.
  The law governs conduct, not content.
- ❌ Modes that stack silently. Define precedence (in our case: the last
  command wins, `/chat` clears everything).
