# System 2 — Mode State (derived, not stored)

The active mode is **derived from the session's durable event log**, never
from an in-memory variable. This is the single most important architectural
decision in the system.

## The fold

Each mode switch records an event in the log. A complete real-world log with
both commands:

```json
[
  { "type": "session/start", "seq": 1,  "ts": "2026-09-23T13:58:02Z" },
  { "type": "message/user",  "seq": 2,  "ts": "2026-09-23T13:58:40Z", "data": { "text": "research digital-menu competitors" } },
  { "type": "command/run",   "seq": 3,  "ts": "2026-09-23T13:58:41Z", "data": { "name": "cowork" } },
  { "type": "tool-result",   "seq": 4,  "ts": "2026-09-23T13:59:10Z", "data": { "tool": "bu_run", "text": "step 1 ok — https://cdn.browser-use.com/screenshots/t1/01.png" } },
  { "type": "command/run",   "seq": 5,  "ts": "2026-09-23T14:02:11Z", "data": { "name": "chat" } }
]
```

`foldMode` walks this list and returns `""` (the last command was `/chat`).
Minimum fields per command event: `type`, `data.name`, `seq` (ordering),
`ts` (auditing).

The active mode is the result of folding the log:

```js
function foldMode(events) {
  let mode = "";
  for (const event of events) {
    if (event.type !== "command/run") continue;
    const cmd = event.data?.name;
    if (cmd === "cowork") mode = cmd;      // add other modes here
    else if (cmd === "chat") mode = "";    // /chat clears
  }
  return mode;
}
```

Complete, commented implementation in [`examples/host-commands.js`](../examples/host-commands.js).

## Why not a variable / database field

| Scenario | Stored state | Derived state (fold) |
|---|---|---|
| Page reload | Needs rehydration; may diverge | Recomputed from the same log → identical |
| Server restart | Lost if in memory | Log survives → state survives |
| Two tabs on the same session | Two copies to sync | Both read the same source |
| Audit / debugging | State without history | The log *is* the history |

This is the same pattern as event sourcing: the log is the source of truth,
everything else is a projection.

## The commands

`/cowork` and `/chat` are real commands of your app's command system, with
one critical detail: **`recordInput: false`**. The command must not echo into
the conversation as a message — the log event is enough, and the law's
injection (System 1) happens via system prompt, invisibly.

The handler does almost nothing — records the event and returns
acknowledgement:

```js
registerCommand({
  name: "cowork",
  recordInput: false,                    // ← without this, garbage in the chat
  handler: () => ({ kind: "success", text: "Cowork mode activated." })
});
```

## Client-side sync

The UI (pills, panel) also derives state from the log — never from its own
localStorage. When switching conversations, each conversation returns to
**its own** mode, because the fold runs over that session's log. In-memory
cache per session is fine as an optimization, as long as the log remains the
tiebreaker after reload.

## Checklist

- [ ] Session log is durable (survives restart)
- [ ] Mode commands record `command/run` events with `recordInput: false`
- [ ] `foldMode` is the only way to know the active mode (host and client)
- [ ] `/chat` (or equivalent) deactivates by recording an event — not by deleting history
