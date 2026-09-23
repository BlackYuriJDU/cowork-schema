# Sistema 2 — Mode State (estado derivado do log)

## A regra de ouro

> **Nunca armazene o modo numa variável. Derive-o do log durável da sessão.**

Variáveis dessincronizam: reload da página, restart do servidor, segunda aba aberta, troca de conversa — cada uma é uma chance do botão dizer "Cowork" enquanto o agente acha que está em Chat. O log de eventos da sessão é único, durável e compartilhado por todas as superfícies. Faça dele a fonte da verdade.

## O fold

Cada troca de modo grava um evento no log. Exemplo completo de um log real com os dois comandos:

```json
[
  { "type": "session/start", "seq": 1,  "ts": "2026-09-23T13:58:02Z" },
  { "type": "message/user",  "seq": 2,  "ts": "2026-09-23T13:58:40Z", "data": { "text": "pesquise concorrentes de cardápio digital" } },
  { "type": "command/run",   "seq": 3,  "ts": "2026-09-23T13:58:41Z", "data": { "name": "cowork" } },
  { "type": "tool-result",   "seq": 4,  "ts": "2026-09-23T13:59:10Z", "data": { "tool": "bu_run", "text": "step 1 ok — https://cdn.browser-use.com/screenshots/t1/01.png" } },
  { "type": "command/run",   "seq": 5,  "ts": "2026-09-23T14:02:11Z", "data": { "name": "chat" } }
]
```

`foldMode` percorre essa lista e devolve `""` (o último comando foi `/chat`). Campos mínimos por evento de comando: `type`, `data.name`, `seq` (ordenação), `ts` (auditoria).

O estado atual é o **último** evento relevante — um fold (redução) sobre o log:

```js
export function foldMode(events) {
  let mode = "";
  for (const event of events) {
    if (event.type !== "command/run") continue;
    const cmd = event.data?.name;
    if (cmd === "cowork") mode = cmd;      // ativa
    else if (cmd === "chat") mode = "";    // desativa
  }
  return mode;
}
```

Custo O(n) por montagem de prompt é irrelevante (logs de sessão têm centenas de eventos, não milhões). Se um dia pesar, cacheie por `seq` máximo processado.

## Os comandos

Dois comandos bastam (implementação em [`examples/host-commands.js`](../examples/host-commands.js)):

| Comando | Efeito | Visível no chat? |
|---------|--------|------------------|
| `/cowork` | Grava `command/run` com `name: "cowork"` | **Não** (`recordInput: false`) |
| `/chat` | Grava `command/run` com `name: "chat"` | **Não** |

O handler só devolve uma confirmação ("Modo Cowork ativado…"). Toda a mágica acontece porque:

1. o **system prompt** é remontado lendo `foldMode(events)` → a lei entra/sai (Sistema 1);
2. a **UI** lê o mesmo fold → pills/painel refletem o estado (Sistema 3).

## Propriedades que você ganha de graça

- **Reload-safe:** F5 não muda o modo — o log sobrevive.
- **Restart-safe:** servidor reiniciou? O log persistido reconstrói o estado.
- **Multi-superfície consistente:** web, API e CLI leem o mesmo log; ninguém diverge.
- **Auditável:** "quando entrou em Cowork?" é uma query no log.
- **Por sessão:** cada conversa tem seu log → cada conversa tem seu modo. Trocar de conversa restaura o modo *dela*, não o global.

## Armadilha real (vivemos isso)

Na v2 do plugin, o cliente mantinha `mode` num `let` no bundle do browser e sincronizava com o log "quando possível". Resultado: após reload, o pill mostrava Chat mas o host ainda injetava a lei de Cowork (ou o inverso). A correção da v3 foi apagar a variável e fazer **tudo** — pills, painel, injeção — ler do fold. Se você sentir vontade de "otimizar" guardando o modo em estado local, guarde apenas como *cache derivado* com invalidação pelo log, nunca como fonte.

## Estendendo para mais modos

O fold escala naturalmente — foi assim no DSH com Design e Science:

```js
const MODE_COMMANDS = new Set(["design", "cowork", "science"]);
// último comando de modo vence; /chat zera
```

Cada modo tem sua lei (`LAW_PATHS`), e o mesmo mecanismo injeta a correspondente. Modos são **mutuamente exclusivos por sessão** por construção (o último vence) — se você precisar de modos combináveis, troque o `let mode` por um `Set` com regras explícitas de conflito.
