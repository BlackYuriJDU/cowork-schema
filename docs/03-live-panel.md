# System 3 — Live Panel

The panel is where the user *watches* the agent work. Complete reference
implementation in [`examples/cowork-panel.jsx`](../examples/cowork-panel.jsx).

## Anatomy

```
┌────────────────────────────────────┐
│ ◎ Cowork        04:32   ↺   ✕      │  header: title + timer + reset + close
├────────────────────────────────────┤
│                                    │
│         [ live screenshot ]        │  body: latest capture, object-fit: contain
│      or empty-state message        │
│                                    │
├────────────────────────────────────┤
│ [ Next step of the task…  ] [Send] │  footer: steer input
└────────────────────────────────────┘
```

### Header

- **Task timer** (`mm:ss`, `tabular-nums` so it doesn't jitter): gives a sense
  of progress on long tasks. Starts when the mode is activated.
- **Reset button (↺)**: "new task" — zeroes the timer without leaving the mode.
- **Close (✕, also Esc)**: returns to chat mode — and must fire the `/chat`
  command, not just hide the panel (otherwise the law keeps applying with no
  visible UI).

### Body — live browser

An `<img>` fed by the **latest screenshot URL published in the session**
(System 4). Three non-obvious decisions:

1. **`key={shot}` on the `<img>`** — forces React to remount the element when
   the URL changes, avoiding a flicker of the old image over the new one.
2. **`object-fit: contain`** — the whole capture is always visible; cropping
   (`cover`) would hide exactly what the user wants to supervise.
3. **The panel is a mirror, not a channel** — it reads what the tools already
   published in the session instead of opening a parallel WebSocket that
   could desynchronize. If the screenshot is in the session log, the panel
   shows it; if it isn't, it doesn't.

### Footer — steer input

- **First message** (no screenshot yet): goes in plain — the law is already
  in context via System 1, no kickoff prefix needed.
- **Subsequent messages**: prefixed with `[COWORK ITERATION]` so the agent
  distinguishes steering from a new task.
- Sent with queue semantics (`"queue"`), not interrupt — the agent finishes
  the current step before incorporating the steering.

## Placement in the layout

In the original implementation the panel lives in the app's native side
column and, when open, the grid is inverted: chat shrinks to ~340px and the
panel takes the rest — the work is the protagonist, the conversation becomes
secondary. Two lessons:

1. **Persist and restore the original grid.** Keep the frame *reference* (not
   the result of a new query) and the last native grid value; restore on
   close. An earlier version searched for the frame again with a regex that
   no longer matched the overridden style — the layout got stuck forever.
2. **Reaffirm with `MutationObserver`** on the frame's `style` attribute:
   native re-renders (drag, resize) will try to restore the original grid
   while the panel is open.

## Accessibility and details

- Mode pills with `role="group"`, **not** `role="tablist"` — global
  accessibility stylesheets and some UI frameworks treat tablists specially
  (in our case, a style reset from another plugin hid every `tablist` on the
  page, which would have killed the pills).
- Panel entrance animation of ~280ms, disabled under
  `prefers-reduced-motion`.
- Empty state with explanatory text ("the live browser will appear here when
  the agent navigates") — never a blank area.

## Checklist

- [ ] Timer starts with the mode and resets without leaving it
- [ ] Closing the panel fires `/chat` (law stops applying)
- [ ] `<img key={url}>` + `object-fit: contain`
- [ ] First message without prefix; iterations with `[COWORK ITERATION]`
- [ ] Original grid restored on close (via stored reference)
- [ ] Pills with `role="group"`
