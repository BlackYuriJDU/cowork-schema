/**
 * cowork-schema — browser feed (System 4).
 *
 * Generic adaptation of the original production client half.
 * Extracts the latest live-browser screenshot published anywhere in the
 * session — assistant blocks, user content and, most importantly,
 * TOOL RESULTS (where browser-tool output lives).
 *
 * Requires a Browser Use Cloud API key on the agent host
 * (BROWSER_USE_API_KEY — get one at https://cloud.browser-use.com/new-api-key).
 * The key stays server-side; the client only ever sees the public
 * cdn.browser-use.com screenshot URLs.
 *
 * The panel calls extractLatestScreenshot(sessionSnapshot) on each render
 * and points an <img key={url}> at the result.
 */

/**
 * Collects every text in the session: assistant/reasoning blocks plus
 * user content[] and tool-result content[] (where bu_run output lives).
 */
export function harvestTexts(snapshot) {
  const out = [];
  const nodes = snapshot?.nodes;
  if (!Array.isArray(nodes)) return out;
  for (const node of nodes) {
    if (node === null || typeof node !== "object") continue;
    if (Array.isArray(node.blocks)) {
      for (const b of node.blocks) {
        if (
          b !== null &&
          typeof b === "object" &&
          (b.kind === "text" || b.kind === "reasoning") &&
          typeof b.text === "string"
        ) {
          out.push(b.text);
        }
      }
    } else if (Array.isArray(node.content)) {
      for (const c of node.content) {
        if (c === null || typeof c !== "object") continue;
        if (typeof c.text === "string" && (c.type === "text" || c.type === undefined)) {
          out.push(c.text);
        } else if (c.type === "tool-result" && Array.isArray(c.content)) {
          for (const cc of c.content) {
            if (cc !== null && typeof cc === "object" && typeof cc.text === "string") {
              out.push(cc.text);
            }
          }
        }
      }
    }
  }
  return out;
}

/**
 * Latest Browser Use Cloud screenshot URL in any session text.
 *
 * TRAP (real incident): a regex with the /g flag is STATEFUL (lastIndex).
 * Declared at module level, every other call returns null. Keep the
 * literal inside the function — or reset lastIndex before each use.
 */
export function extractLatestScreenshot(snapshot) {
  let last = "";
  for (const hay of harvestTexts(snapshot)) {
    const m = hay.match(/https:\/\/cdn\.browser-use\.com\/screenshots\/[^\s"'\\)]+/g);
    if (m && m.length > 0) last = m[m.length - 1];
  }
  return last;
}

/**
 * Swapping providers? Change the pattern above to match your storage —
 * e.g. /https:\/\/cdn\.yourapp\.com\/captures\/[^\s"'\\)]+/g — and make
 * sure your browser tool writes the URL into its tool-result text.
 */
