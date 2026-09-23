# Pesquisa — o estado da arte dos "coworks"

Levantamento (set/2026) de como os produtos de referência implementam cada sistema deste schema. Serve para calibrar suas escolhas — e para não reinventar erros alheios.

## Claude Cowork (Anthropic)

O produto que definiu a categoria e a inspiração direta do nosso plugin.

**Linha do tempo:**
- **12/jan/2026** — lançado como research preview no macOS para assinantes Max: "Claude Code para quem não vive no terminal".
- **09/abr/2026** — GA no macOS e Windows.
- **07/jul/2026** — expansão para web e mobile com mudança arquitetural grande: execução passa a ser **remota** (cloud sandbox da Anthropic); o laptop não precisa mais ficar acordado.
- **16/set/2026** — a Anthropic **fundiu Cowork e chat num só produto**: o toggle desaparece e o roteamento (resposta rápida vs. tarefa longa) passa a ser automático. Motivo declarado: "a parte frustrante era decidir onde a tarefa pertencia".

**Como implementa cada sistema:**

| Sistema | Implementação deles |
|---------|--------------------|
| Mode Law | "Global instructions" (Settings > Cowork) + instruções de projeto; modos de permissão **Manual / Auto / Skip** — Manual pergunta antes de agir, Auto aprova leituras e decide sobre escritas, Skip pula prompts (só automação de baixo risco). Deleção permanente sempre exige confirmação explícita. |
| Mode State | Toggle Cowork no composer (canto inferior esquerdo) — exatamente o padrão de pills que copiamos. Depois da fusão: roteamento invisível, sem estado explícito. |
| Live Panel | **Running trace**: lista visível de cada arquivo aberto e cada tool call — transparência como diferencial ("você vê o raciocínio, não só o resultado"). Sub-agentes em paralelo para jobs grandes. |
| Browser Feed | Browser embutido + "computer use" (marca *Dispatch*): o Claude dirige uma tela real quando não há integração direta. |

**Lições:**
1. O toggle explícito funciona, mas gera carga de decisão — a Anthropic concluiu que roteamento automático é o destino. Se você mantiver o toggle (este schema mantém), minimize o custo: pills no composer, não uma aba longe.
2. Permissões graduadas (Manual/Auto/Skip) são o controle real de segurança — mais granular que nossa "confirmação para destrutivos". Considere evoluir a lei nessa direção.
3. O trace visível do trabalho é o que diferencia "agente" de "caixa preta".

## ChatGPT Work (OpenAI)

A resposta da OpenAI, lançada **09/jul/2026** junto com o GPT-5.6, fundindo Codex ao app desktop: três modos — **Chat · Work · Codex**.

| Sistema | Implementação deles |
|---------|--------------------|
| Mode Law | Mesmo agente GPT-5.6-classe do Codex com system prompt diferente por modo (descoberta da comunidade r/codex: "é o mesmo agente, Work só aponta para docs e esconde o código") — validação independente do padrão *lei como contexto*. |
| Mode State | Mode switcher no app unificado; modos compartilham plugins e contexto dentro de um projeto; troca de modo no meio da thread. |
| Live Panel | Computer Use com **overlay picture-in-picture** ao vivo: você assiste o agente clicar/digitar e pode pausar/aprovar do overlay. Confirmação explícita antes de pagamentos e logins. |
| Browser Feed | Browser embutido + 1.400+ conectores (Slack, Drive, SharePoint, CRM, e-mail); `@menções` direcionam contexto de um app específico. Saídas: arquivos Office editáveis e *Sites* (mini webapps hospedados). |

**Lições:**
1. "Mesmo motor, leis diferentes por modo" é exatamente a arquitetura deste schema — não é excentricidade nossa.
2. O PiP ao vivo com pausa/aprovação é o estado da arte de supervisão; nosso painel de screenshots é a versão leve disso.
3. Work é web-first (conectores SaaS), Cowork era files-first. Escolha o centro de gravidade do SEU produto antes de escrever a lei.

## Browser Use Cloud

A infraestrutura de browser que usamos em produção no DSH (Sistema 4).

- **O que é:** API hospedada de automação de browser para agentes — tasks em linguagem natural, browsers stealth na nuvem, screenshots por passo, live URL para streaming.
- **API:** base `https://api.browser-use.com/api/v2` (e v3); header `X-Browser-Use-API-Key`; chave em <https://cloud.browser-use.com/new-api-key>.
- **SDKs:** `browser-use-sdk` (Python e TypeScript); também biblioteca open-source (`browser-use`, Python ≥3.11) para self-host com `use_cloud=True` opcional.
- **Extras relevantes:** rotação de proxy residencial, resolução de CAPTCHA, perfis persistentes, CDP WebSocket (`wss://connect.browser-use.com`), 1.000+ integrações.
- **Quando trocar:** se precisar de controle total (compliance, dados que não podem sair), self-host Playwright + seu storage — o contrato do feed (URL de imagem no tool-result) não muda.

## Tabela-síntese

| Peça | Claude Cowork | ChatGPT Work | Este schema |
|------|---------------|--------------|-------------|
| Conduta do agente | Global instructions + permissões Manual/Auto/Skip | System prompt por modo | `law/cowork-core.md` injetada no system prompt |
| Estado do modo | Toggle (depois: roteamento automático) | Mode switcher | Fold do log de eventos (`command/run`) |
| Visibilidade | Running trace de tools/arquivos | PiP ao vivo do desktop | Painel com screenshots do browser |
| Navegação | Browser embutido + Dispatch | Browser + 1.400 conectores | Browser Use Cloud (ou self-host) |
| Entregas | Arquivos + Live Artifacts | Office files + Sites | Diretório por tarefa + lista final |

## Fontes

- Anthropic — anúncio da fusão Cowork/chat e help center (set/2026), via The Verge, Simon Willison, smithstephen.com/p/claude-stopped-asking-which-mode
- usecarly.com/blog/what-is-claude-cowork — linha do tempo e arquitetura remota
- macmyths.com — modos de permissão Manual/Auto/Skip e funcionamento local↔nuvem
- datacamp.com/blog/chatgpt-work-vs-claude-cowork — comparação de working style
- tarekalaaddin.com/blog/chatgpt-work-vs-claude-cowork — web-first vs files-first
- explainx.ai — descobertas r/codex: mesmo agente, system prompts por modo
- dev.to/max_quimby — overlay PiP do Computer Use no ChatGPT Work
- github.com/browser-use/browser-use — README: SDK, cloud vs open-source, stealth/proxies
- awesomeskills.dev (browser-use cloud skill) — base URLs da API v2/v3, header de auth, CDP WebSocket
