/**
 * cowork-schema — Cowork panel (System 3).
 *
 * Generic React adaptation of the original production CoworkPanel.
 * Three regions: header (title + timer + reset + close), body (live
 * browser screenshot), footer (steer input).
 *
 * Props are deliberately framework-agnostic:
 *  - shot:        latest screenshot URL (from examples/browser-feed.js)
 *  - startedAt:   epoch ms when the task started (drives the timer)
 *  - onResetTask: zeroes the timer without leaving the mode
 *  - onClose:     MUST fire the /chat command, not just hide the panel
 *  - onSend:      (text) => void — first message plain; iterations are
 *                 prefixed [COWORK ITERATION] by this component
 */

import React from "react";

export function CoworkPanel({ shot = "", startedAt, onResetTask, onClose, onSend }) {
  const [elapsed, setElapsed] = React.useState(0);
  const [draft, setDraft] = React.useState("");

  React.useEffect(() => {
    const t0 = startedAt || Date.now();
    setElapsed(Math.floor((Date.now() - t0) / 1000));
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  const send = () => {
    const text = draft.trim();
    if (text === "") return;
    // First message goes in plain — the law is already in context via the
    // host's prompt section. Iterations get the steering prefix.
    onSend?.(shot === "" ? text : `[COWORK ITERATION]\n${text}`);
    setDraft("");
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--cw-bg, #141416)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderBottom: "1px solid var(--cw-border, rgba(255,255,255,.08))" }}>
        <div style={{ fontWeight: 600, fontSize: 12, marginRight: "auto", color: "var(--cw-fg, #e6e9ed)" }}>
          ◎ Cowork
        </div>
        <span title="Task time" style={{ fontVariantNumeric: "tabular-nums", fontSize: 11, color: "var(--cw-fg-dim, #949698)" }}>
          {mmss}
        </span>
        <button type="button" title="New task (reset timer)" onClick={onResetTask}>↺</button>
        <button type="button" title="Close (Esc)" aria-label="Close Cowork panel" onClick={onClose}>✕</button>
      </div>

      {/* Body — live browser */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        {shot === "" ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cw-fg-dim, #949698)", padding: 16 }}>
            <div style={{ textAlign: "center", maxWidth: 240, fontSize: 12, lineHeight: 1.5 }}>
              Live browser — when the agent navigates for you in this session, the screen appears here.
            </div>
          </div>
        ) : (
          // key={shot}: remount on URL change (no stale-image flicker).
          // object-fit: contain: the whole capture is always visible.
          <img
            key={shot}
            src={shot}
            alt="Latest browser capture"
            style={{ width: "100%", height: "100%", minWidth: 0, minHeight: 0, objectFit: "contain", display: "block" }}
          />
        )}
      </div>

      {/* Footer — steer input */}
      <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: "1px solid var(--cw-border, rgba(255,255,255,.08))" }}>
        <input
          type="text"
          placeholder={shot === "" ? "Describe the task for Cowork…" : "Next step of the task…"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          style={{ flex: 1, height: 28, borderRadius: 8, border: "1px solid var(--cw-border, rgba(255,255,255,.12))", background: "var(--cw-input, #1d1d20)", color: "var(--cw-fg, #e6e9ed)", fontSize: 12, padding: "0 10px", outline: "none" }}
        />
        <button type="button" onClick={send} disabled={draft.trim() === ""}>
          {shot === "" ? "Start" : "Send"}
        </button>
      </div>
    </div>
  );
}

export default CoworkPanel;
