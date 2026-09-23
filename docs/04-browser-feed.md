# Sistema 4 — Browser Feed (da navegação à imagem)

O feed é o encanamento que leva a navegação do agente até o painel. Dois lados: **produzir** screenshots (lado do agente/ferramenta) e **consumir** a URL mais recente (lado do painel). Código: [`examples/browser-feed.js`](../examples/browser-feed.js).

## Visão geral

```
agente chama ferramenta de browser
        │
        ▼
ferramenta navega e, a cada step, publica um screenshot (CDN/storage)
        │
        ▼
URL da captura aparece no tool-result da sessão
        │
        ▼
painel extrai a ÚLTIMA URL com regex e renderiza <img>
```

A decisão de design central: **o painel lê o histórico da sessão, não um canal paralelo.** Nada de WebSocket dedicado, nada de estado duplicado — o tool-result já é durável, ordenado e compartilhado. O feed é só uma *projeção* sobre ele.

## Provedor recomendado: Browser Use Cloud

Foi o provedor de produção do DSH. Fatos práticos (fontes em [`05-research.md`](05-research.md)):

- **API REST:** `https://api.browser-use.com/api/v2` (e v3), auth por header `X-Browser-Use-API-Key: <key>` — chave em <https://cloud.browser-use.com/new-api-key>.
- **SDKs:** `pip install browser-use-sdk` (Python) · `npm install browser-use-sdk` (TypeScript).
- **Modelo de uso:** você dispara uma *task* ("vá a X, extraia Y"), o agente deles executa num browser stealth na nuvem e devolve passos + **screenshots hospedados no CDN** (`https://cdn.browser-use.com/screenshots/...`).
- **Por que ele:** stealth/fingerprint, rotação de proxy, CAPTCHA e escala resolvidos — operar Chromium em produção por conta própria é um poço de dor (memória, detecção, paralelismo).

No DSH, a ferramenta exposta ao modelo era `bu_run`; a lei do modo manda o agente preferir **muitos passos pequenos** — cada passo publica uma foto nova, e o painel "filma" o trabalho.

## Alternativas self-hosted

| Provedor | Como produzir o screenshot | Trade-off |
|----------|---------------------------|-----------|
| **Playwright** (self-host) | `page.screenshot()` a cada step → upload p/ S3/R2/Supabase Storage → URL no tool-result | Controle total, custo de infra e anti-detecção seus |
| **CDP direto** | `Page.captureScreenshot` via Chrome DevTools Protocol | Máximo controle, máximo trabalho |
| **Custom** | Qualquer coisa que devolva URL de imagem no tool-result | O painel não liga para a origem |

O contrato é sempre o mesmo: **a ferramenta devolve texto contendo a URL da imagem**. Configure `browserFeed.urlPattern` no schema com o regex do seu domínio.

## Consumindo (lado do painel)

```js
import { extractLatestScreenshot } from "../examples/browser-feed.js";

const shot = extractLatestScreenshot(sessionSnapshot);
// → "https://cdn.browser-use.com/screenshots/…/abc.png" ou ""
```

Pontos finos da implementação de referência:

- `harvestTexts()` varre **todos** os formatos de nó — blocos do assistente, mensagens de usuário e, principalmente, `tool-result` (é lá que as URLs moram).
- O regex é clonado a cada chamada (`new RegExp(source, flags)`) porque `/g` mantém `lastIndex` entre usos — bug clássico de "funciona uma vez, falha na segunda".
- A **última** ocorrência vence: o painel sempre mostra o frame mais recente.

## Atualização: reativo vs polling

- **Reativo (recomendado):** o painel assina o estado da sessão (store, query invalidation, evento) e re-executa a extração quando novos nós chegam. Foi o modelo do DSH.
- **Polling:** se o seu host não expõe assinatura, `browserFeed.pollIntervalMs` (default 1000ms) no schema. Simples e suficiente — a imagem já é eventual por natureza.

## Privacidade (está na lei, seção 4)

Screenshots podem conter dados sensíveis — o agente está navegando logado, às vezes. A lei manda **sinalizar e redigir** segredos que aparecerem, e os limites duros proíbem expor keys na narrativa. No lado da infra: URLs assinadas com expiração curta > URLs públicas eternas.
