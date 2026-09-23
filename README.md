# cowork-schema

**O padrão aberto para adicionar um modo "Cowork" ao seu próprio app de IA** — chat comum de um lado, agente que *trabalha* do outro, com o usuário vendo tudo acontecer em tempo real.

Este repositório extrai, generaliza e documenta o sistema Cowork que rodava em produção dentro do [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (plugin `dsh-deepseek-design`), inspirado no **Claude Cowork** (Anthropic) e no **ChatGPT Work** (OpenAI) — mas escrito para ser integrado em **qualquer** site ou app com um agente de IA, sem depender de nenhum deles.

---

## O que é "Cowork"?

Cowork é um **modo de sessão** — não um modelo novo, não um produto separado. Quando ativo:

1. **O agente trabalha, não apenas conversa.** Ele executa tarefas multi-etapas (navegar na web, ler/escrever arquivos, produzir entregas) em vez de responder um prompt por vez.
2. **O usuário assiste.** Um painel lateral mostra o que o agente está fazendo em tempo real — no nosso caso, screenshots ao vivo do navegador que o agente está operando.
3. **Regras rígidas de conduta.** Uma "lei" de comportamento é injetada no contexto do agente: narrar cada passo, nunca executar ações destrutivas sem confirmação, entregar arquivos em locais previsíveis, encerrar com resumo.

É o mesmo padrão que a Anthropic popularizou com o Claude Cowork (jan/2026) e a OpenAI seguiu com o ChatGPT Work (jul/2026): **delegar um resultado, acompanhar o processo, revisar a entrega.**

> Nota histórica: em set/2026 a Anthropic fundiu o Cowork ao chat principal do Claude, removendo o toggle — o roteamento passou a ser automático. A lição de design está documentada em [`docs/05-research.md`](docs/05-research.md): o toggle explícito e o roteamento automático são duas respostas válidas para o mesmo problema.

## Os 4 sistemas

O Cowork é composto por quatro sistemas independentes e combináveis. Cada um tem um documento dedicado:

| # | Sistema | O que faz | Doc |
|---|---------|-----------|-----|
| 1 | **Mode Law** (lei do modo) | Protocolo de conduta injetado no system prompt enquanto o modo estiver ativo | [`docs/01-mode-law.md`](docs/01-mode-law.md) |
| 2 | **Mode State** (estado do modo) | Estado derivado do log de eventos da sessão (fold), não de variável volátil — sobrevive a reload | [`docs/02-mode-state.md`](docs/02-mode-state.md) |
| 3 | **Live Panel** (painel ao vivo) | UI lateral com cronômetro, browser ao vivo (screenshots) e caixa de direcionamento | [`docs/03-live-panel.md`](docs/03-live-panel.md) |
| 4 | **Browser Feed** (feed do navegador) | Pipeline que transforma a navegação do agente em imagens que o painel exibe | [`docs/04-browser-feed.md`](docs/04-browser-feed.md) |

Mais:

- [`docs/05-research.md`](docs/05-research.md) — como Claude Cowork, ChatGPT Work e Browser Use Cloud implementam cada peça (com fontes).
- [`docs/06-integration-checklist.md`](docs/06-integration-checklist.md) — checklist de integração + armadilhas reais que encontramos em produção.
- [`schema/cowork-mode.schema.json`](schema/cowork-mode.schema.json) — contrato de configuração (JSON Schema) de um modo Cowork declarativo.

## Quickstart (30 minutos)

Pré-requisito: você já tem um app com um agente de IA que (a) aceita system prompt dinâmico e (b) tem alguma ferramenta de navegação web.

```bash
git clone https://github.com/BlackYuriJDU/cowork-schema.git
cd cowork-schema
```

**1. Copie a lei do modo e ajuste os caminhos:**

```bash
cp law/cowork-core.md /seu/app/law/cowork-core.md
# edite: diretório de entregas, provedor de browser, limites
```

**2. Injete a lei no contexto enquanto o modo estiver ativo** (adaptado de [`examples/host-commands.js`](examples/host-commands.js)):

```js
import { buildModeSection } from "./examples/host-commands.js";

const section = buildModeSection({
  sessionEvents: session.events,          // log durável da sessão
  readFile: (p) => readFileSync(p, "utf8"),
});
const systemPrompt = [basePrompt, section].filter(Boolean).join("\n\n");
// section === "" quando o modo está desligado
```

**3. Registre os comandos `/cowork` e `/chat`** que apenas gravam um evento `command/run` no log da sessão — o estado é *derivado* deles (veja o porquê em [`docs/02-mode-state.md`](docs/02-mode-state.md)).

**4. Renderize o painel** ([`examples/cowork-panel.jsx`](examples/cowork-panel.jsx)), alimentado pelo último screenshot que o agente publicou na sessão ([`examples/browser-feed.js`](examples/browser-feed.js)).

**5. Teste o loop completo:** ative `/cowork` → peça "pesquise X e salve um resumo" → veja os screenshots aparecerem no painel → receba a entrega com a lista de arquivos → `/chat` para sair.

## Estrutura do repositório

```
cowork-schema/
├── README.md                        ← você está aqui
├── law/
│   └── cowork-core.md               ← a lei do modo (protocolo de conduta do agente)
├── schema/
│   └── cowork-mode.schema.json      ← contrato declarativo de um modo Cowork
├── examples/
│   ├── host-commands.js             ← Sistemas 1+2: comandos /cowork·/chat + injeção no system prompt
│   ├── browser-feed.js              ← Sistema 4: extração do feed de screenshots da sessão
│   └── cowork-panel.jsx             ← Sistema 3: painel (cronômetro + browser ao vivo + input)
├── docs/
│   ├── 01-mode-law.md               ← como escrever e injetar a lei
│   ├── 02-mode-state.md             ← fold do log de eventos; comandos; persistência
│   ├── 03-live-panel.md             ← anatomia do painel e padrões de UI
│   ├── 04-browser-feed.md           ← Browser Use Cloud e alternativas (Playwright, CDP)
│   ├── 05-research.md               ← Claude Cowork · ChatGPT Work · Browser Use Cloud
│   └── 06-integration-checklist.md  ← checklist + armadilhas de produção
└── LICENSE                          ← MIT
```

## Princípios de design (o porquê de cada decisão)

1. **Modo é contexto, não mensagem.** A lei entra pelo system prompt a cada montagem de prompt — nunca como mensagem `[MODO ATIVADO]` no histórico, que polui a conversa e se perde em truncamentos.
2. **Estado é derivado, não armazenado.** O modo ativo é o resultado de um fold sobre o log durável de eventos da sessão. Reload, restart, múltiplas abas — todos convergem para o mesmo estado porque todos leem a mesma fonte.
3. **O painel é um espelho, não um canal.** Ele lê o que já existe na sessão (screenshots publicados pelas ferramentas) em vez de manter um canal paralelo que pode dessincronizar.
4. **Limites duros são da lei, não da UI.** "Pedir confirmação antes de destruir" vale mesmo se o usuário acionar o agente por outro caminho (API, CLI), porque está no contexto do modelo.

## Origem

Extraído do plugin `dsh-deepseek-design` (DeepSeek Suite v2.0) para o [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), onde o modo Cowork rodou em produção: pills `Chat · Design · Cowork` no composer, painel na coluna lateral com browser ao vivo via [Browser Use Cloud](https://cloud.browser-use.com), lei injetada via seção de system prompt e estado derivado do log de eventos. As partes específicas do DSH foram substituídas por interfaces genéricas; as decisões de design e as armadilhas documentadas são as reais.

## Licença

MIT — use, copie e adapte livremente no seu produto.
