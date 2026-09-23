/**
 * cowork-schema — host side (Systems 1 + 2).
 *
 * Generic adaptation of the original production plugin's node half.
 * Shows the two host responsibilities:
 *
 *   1. MODE STATE: /cowork and /chat commands that only record a
 *      `command/run` event in the session's durable log (recordInput: false —
 *      nothing echoes into the chat). The active mode is DERIVED from the
 *      log via foldMode() — never from a mutable variable.
 *
 *   2. MODE LAW: on every prompt assembly, if the derived mode is "cowork",
 *      inject the law file's content as a system-prompt section. It is
 *      context injection — not a user message.
 *
 * The interfaces (registerCommand, registerPromptSection, session.events)
 * are deliberately generic: map them to whatever your agent host provides.
 */

import { readFileSync } from "node:fs";

/** Where the law files live on the host. Adjust to your deployment. */
const LAW_PATHS = {
  cowork: process.env.COWORK_LAW_PATH ?? "./law/cowork-core.md",
};

const LAW_HEADER = {
  cowork:
    "COWORK MODE ACTIVE — context injection (this is NOT a user message). " +
    "Applies to ALL turns of this session; only /chat deactivates it.",
};

/** Cached law reads (disk read on activation; failure becomes "" = lawless mode). */
const lawCache = new Map();
function lawOf(mode, readFile = (p) => readFileSync(p, "utf8")) {
  if (lawCache.has(mode)) return lawCache.get(mode);
  let text = "";
  try {
    text = readFile(LAW_PATHS[mode]);
  } catch (err) {
    console.error(`[cowork] law "${mode}" unreadable at ${LAW_PATHS[mode]}:`, err.message);
  }
  lawCache.set(mode, text);
  return text;
}

/**
 * Last mode commanded in this session, derived from the durable log.
 * @param {Array<{type: string, data?: {name?: string}}>} events
 * @returns {"cowork" | ""} active mode ("" = none / cleared by /chat)
 */
export function foldMode(events) {
  let mode = "";
  for (const event of events) {
    if (event.type !== "command/run") continue;
    const cmd = event.data?.name;
    if (cmd === "cowork") mode = cmd;
    else if (cmd === "chat") mode = "";
  }
  return mode;
}

/**
 * Builds the system-prompt section for the current session state.
 * Returns "" when the mode is off — concatenate conditionally:
 *
 *   const systemPrompt = [basePrompt, buildModeSection({ sessionEvents })]
 *     .filter(Boolean).join("\n\n");
 */
export function buildModeSection({ sessionEvents, readFile } = {}) {
  const mode = foldMode(sessionEvents ?? []);
  if (mode === "" || LAW_HEADER[mode] === undefined) return "";
  const law = lawOf(mode, readFile);
  return law === "" ? "" : `${LAW_HEADER[mode]}\n\n${law}`;
}

/**
 * Command registration. `registerCommand` must:
 *  - append { type: "command/run", data: { name }, seq, ts } to the session log
 *  - NOT record the invocation as a chat message (recordInput: false)
 */
export function registerModeCommands({ registerCommand }) {
  const COMMANDS = [
    {
      name: "cowork",
      description: "Cowork — injects the mode law into context (live browser in the panel)",
      ok: "Cowork mode activated: law injected into the session context.",
    },
    {
      name: "chat",
      description: "Chat — deactivates this session's mode laws",
      ok: "Chat mode: mode laws deactivated.",
    },
  ];
  for (const { name, description, ok } of COMMANDS) {
    registerCommand({
      name,
      description,
      recordInput: false, // the log is the source of truth; nothing echoes in chat
      handler: () => ({ kind: "success", text: ok }),
    });
  }
}
