# System 4 — Browser Feed

The feed is the pipeline that turns the agent's navigation into images for
the panel. Implementation in [`examples/browser-feed.js`](../examples/browser-feed.js).

## Prerequisite: a Browser Use Cloud API key

The canonical implementation depends on **Browser Use Cloud** — it is the
component that runs the browser remotely and, critically, **hosts the
screenshots** the panel displays. Without a key, the agent has no web tool
and the panel stays in the empty state.

**How to get one:**

1. Sign up at [cloud.browser-use.com](https://cloud.browser-use.com) (GitHub, Google, Microsoft or e-mail).
2. Go to the API keys page: [cloud.browser-use.com/new-api-key](https://cloud.browser-use.com/new-api-key).
3. Create a key and store it as an environment variable on the host that runs the agent:

```bash
# .env
BROWSER_USE_API_KEY=bu_live_...
```

**How the key is used** (your agent's web tool wraps one of these):

| Integration | Auth |
|---|---|
| REST API v2/v3 — `POST https://api.browser-use.com/api/v2/tasks` | Header `X-Browser-Use-API-Key: $BROWSER_USE_API_KEY` |
| Python SDK — `pip install browser-use-sdk` | Reads `BROWSER_USE_API_KEY` automatically |
| TypeScript SDK — `npm install browser-use-sdk` | Reads `BROWSER_USE_API_KEY` automatically |
| Open-source library with cloud browser — `Browser(use_cloud=True)` | Reads `BROWSER_USE_API_KEY` automatically |

Each finished task/step returns output text containing a screenshot URL at
`https://cdn.browser-use.com/screenshots/...` — that URL is what lands in
the session log and feeds the panel. **Never expose the API key to the
client**: the panel only needs the public `cdn.browser-use.com` URLs; the
key stays server-side. (The law also forbids the agent from echoing secrets
into narration or screenshots — see System 1.)

> **No key / no budget?** You can swap the provider entirely — see
> "Alternatives" below. The contract the panel depends on is just *a
> screenshot URL per step in the session log*, not Browser Use specifically.

## How it works in the canonical implementation

1. The law (System 1) instructs: web tasks always via **Browser Use Cloud**
   (`bu_run`), in small steps.
2. Each `bu_run` step returns text containing a screenshot URL hosted at
   `https://cdn.browser-use.com/screenshots/...`.
3. That output lands in the session as a `tool-result` event.
4. The panel scans all session texts (assistant blocks, user content,
   tool-results) and takes the **last** URL matching the pattern.

```js
const m = hay.match(/https:\/\/cdn\.browser-use\.com\/screenshots\/[^\s"'\\)]+/g);
```

> **Trap:** a regex with the `/g` flag is stateful (`lastIndex`). If you
> extract it to a module-level constant, every other call returns `null`.
> Keep it as a literal inside the function or reset `lastIndex`.

## Why "last URL in the log" is enough

The agent works sequentially; each step publishes a new capture. The latest
one always represents the current state of the browser. There's no need for
push infrastructure, WebSocket or polling — the session log, which already
exists, is the transport. This is what makes the panel a *mirror* (System 3).

## Alternatives to Browser Use Cloud

Any provider works as long as it satisfies one contract: **each navigation
step produces an image URL (or blob) that lands in the session log.**

| Provider | How the capture reaches the log |
|---|---|
| **Browser Use Cloud** (canonical) | `cdn.browser-use.com` URL in the `bu_run` result — zero extra code. API: `POST /tasks`, auth via `X-Browser-Use-API-Key` ([docs](https://docs.browser-use.com)) |
| **Playwright / Puppeteer self-hosted** | Your tool takes `page.screenshot()`, uploads to your storage (S3, R2, local disk + static route) and includes the URL in the tool result |
| **CDP (Chrome DevTools Protocol)** | Same as above, with `Page.captureScreenshot`; useful if you already drive a real Chrome via `--remote-debugging-port` |
| **Live stream (advanced)** | Browser Use Cloud exposes a `liveUrl` per session for real-time streaming; you can render it in an `<iframe>` instead of static captures — heavier, but truly continuous |

If you change providers, change **two** things: (1) the tool name in the law;
(2) the URL pattern in `extractLatestScreenshot`.

## Cadence and cost

- The law's "many small steps" clause exists for the feed: each step = one
  new capture = one panel update. A single 5-minute giant step leaves the
  user staring at a frozen image.
- Hosted screenshots are ephemeral (provider TTL). If you need an audit
  trail, persist the captures to your own storage when they arrive.
- Browser Use Cloud is metered per task/step — factor that into long tasks
  and prefer the small-steps cadence the law already mandates (it also makes
  failures cheaper to retry).

## Privacy

Captures may show credentials, cookies and personal data from pages the
agent visits. The law already requires redaction, but defense in depth:

- Prefer sessions without the user's real cookies/profile (clean cloud
  browser) for sensitive tasks.
- If you display the panel to people other than the session owner (support,
  debugging), filter captures whose URL contains auth domains.
- The API key itself must never appear in client code, panel markup or
  session text — server-side only.

## Checklist

- [ ] `BROWSER_USE_API_KEY` set on the agent host (or an alternative provider wired)
- [ ] Key never reaches the client — only `cdn.browser-use.com` URLs do
- [ ] Web tool publishes a capture URL per step
- [ ] Extraction scans tool-results too (not just assistant text)
- [ ] Regex without shared state (no `/g` at module level)
- [ ] Law names the same tool the agent actually has
- [ ] Plan for capture TTL (persist or accept ephemerality)
