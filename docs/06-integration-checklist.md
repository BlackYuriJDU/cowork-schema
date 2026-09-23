# Integration checklist + production traps

Ordered so each step can be verified before moving on. The traps at the end
are real incidents from the original production deployment.

## Integration order

### 0. Prerequisites
- [ ] Your app has an agent with **dynamic system-prompt assembly** (a hook
      that runs on every prompt build)
- [ ] A **durable session event log** (survives restart; events have `type`,
      `data`, `seq`)
- [ ] A command system (slash commands or equivalent)
- [ ] `BROWSER_USE_API_KEY` set on the agent host (get one at
      [cloud.browser-use.com/new-api-key](https://cloud.browser-use.com/new-api-key))
      — or an alternative browser provider wired (see
      [`04-browser-feed.md`](04-browser-feed.md))

### 1. Mode Law
- [ ] Copy `law/cowork-core.md`, adjust paths and tool names
- [ ] Prompt builder injects `header + law` when `foldMode(events) === "cowork"`
- [ ] Verify: activate the mode, ask "what rules are you following?" — the
      agent should cite the law without any visible message in the chat

### 2. Mode State
- [ ] `/cowork` and `/chat` registered with `recordInput: false`
- [ ] Each command appends a `command/run` event to the session log
- [ ] `foldMode` is the only source of truth (host and client)
- [ ] Verify: activate, reload the page — mode (and panel) must come back

### 3. Live Panel
- [ ] Timer starts with the mode; reset doesn't leave the mode
- [ ] `<img key={url}>` with `object-fit: contain`
- [ ] Steer input: first message plain, iterations with `[COWORK ITERATION]`
- [ ] Close button fires `/chat`
- [ ] Verify: the whole loop end-to-end (see README quickstart, step 5)

### 4. Browser Feed
- [ ] Web tool publishes a screenshot URL per step
- [ ] Extraction scans tool-results, not just assistant text
- [ ] Verify: ask the agent to navigate somewhere; the panel updates at
      each step

## Production traps (all real)

1. **Stateful regex.** `extractLatestScreenshot` uses a `/g` regex. Declared
   at module level, `lastIndex` persists between calls and every other
   extraction returns `null`. Keep the regex literal inside the function.

2. **Command echoing into chat.** Without `recordInput: false`, every
   `/cowork` appears as a user message, pollutes the context and teaches the
   model that mode switching is conversation.

3. **Client command colliding with host command.** If your architecture has
   host-side and client-side command registries, registering `/cowork` on
   both fails loudly. The client should *decorate/invoke* the host command,
   never re-register it.

4. **`role="tablist"` on mode pills.** Global stylesheets (yours, a
   framework's, another plugin's) may restyle or hide tablists. In
   production, a style reset from an unrelated plugin had
   `[role="tablist"]{display:none!important}` — it would have killed the
   pills. Use `role="group"`.

5. **Editing config files as text.** The original installer once corrupted a
   YAML registry by string-editing it. The rule that came out of the
   incident: parse → modify the tree → serialize → **re-parse to validate** →
   write atomically with a timestamped backup.

6. **Restoring layout by re-querying the DOM.** When the panel overrides the
   app grid, keep the frame *reference* and the original grid value. A
   version that searched for the frame again with a regex (which no longer
   matched the overridden style) left the layout stuck with a ghost column
   forever.

7. **Law as a user message.** The v1 fallback seeded the law into the
   composer draft. Besides being visible and editable, it *replaced* the
   user's existing draft. If you need a fallback for hosts without command
   support, **concatenate** — never replace.

8. **Panel opening before the layout exists.** On a blank session the side
   column may not exist yet; opening the panel throws. Catch it, mark
   `pendingAutoOpen`, and open when the first message arrives. The mode must
   work without the panel — the law is already in context.

9. **Interrupting the agent on every steer.** Send steering with queue
   semantics. Interrupt mid-step and you lose the step's work (and its
   screenshot).

10. **Leaking the API key.** `BROWSER_USE_API_KEY` stays server-side; the
    client only ever sees public `cdn.browser-use.com` screenshot URLs. The
    law forbids the agent from echoing secrets — but also grep your bundle
    for the key before shipping.
