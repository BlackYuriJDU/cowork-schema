# Sistema 1 — Mode Law (a lei do modo)

A **lei** é o coração do Cowork: um documento markdown curto que define a conduta do agente enquanto o modo estiver ativo. Sem ela, "modo Cowork" é só um botão que não muda nada.

## O arquivo

[`law/cowork-core.md`](../law/cowork-core.md) — 5 seções, ~30 linhas. Esse tamanho é deliberado: a lei entra no contexto de **todo** turno, então cada linha paga aluguel de token.

| Seção | Regra | Por que existe |
|-------|-------|----------------|
| 1. Narre o trabalho | 1 linha antes de cada bloco de ação | O painel mostra progresso visual; a narrativa é a "voz" do trabalho. Silêncio prolongado parece travamento. |
| 2. Browser ao vivo | Tarefas web sempre pela ferramenta que publica screenshots | É o que alimenta o painel (Sistema 4). Muitos passos pequenos = muitas fotos = sensação de ao vivo. |
| 3. Arquivos como entregas | Diretório por tarefa + caminhos absolutos + lista final | Entregas previsíveis: o usuário (e o painel) sabe onde procurar. |
| 4. Limites duros | Destrutivo só com confirmação; nunca expor segredos; escopo combinado | A confiança do usuário no modo inteiro depende disso. |
| 5. Encerramento | Resumo ≤5 linhas com arquivos e pendências | Fecha o ciclo "delegar → revisar". |

## Como injetar (a parte que todo mundo erra)

**Errado — mensagem no histórico:**

```
user: [COWORK ATIVADO] Leia o arquivo cowork-core.md e trate-o como lei...
```

Problemas: polui a conversa, some quando o histórico é truncado, e o modelo pode "esquecer" depois de muitos turnos. Foi assim na v1 do nosso plugin — abandonamos.

**Certo — seção de system prompt reavaliada a cada montagem:**

```js
const system = [BASE_PROMPT, buildModeSection({ sessionEvents, readFile })]
  .filter(Boolean)
  .join("\n\n");
```

- A lei entra **antes** das mensagens, com um cabeçalho explícito: *"isto NÃO é mensagem do usuário; vale para TODOS os turnos; só desativa com /chat"*.
- Como é reavaliada a cada prompt, desligar o modo (`/chat`) remove a lei **no turno seguinte** — sem resíduo.
- Cacheie a leitura do arquivo por processo; falha de leitura vira `""` (modo sem lei), nunca quebra a montagem.

## Fallback para hosts sem system prompt dinâmico

Se o seu host não deixa compor o system prompt por turno, o fallback é concatenar a lei **à primeira mensagem da tarefa** (nunca substituindo o rascunho do usuário):

```
[leia law/cowork-core.md e trate como lei desta tarefa]

TAREFA: <o que o usuário pediu>
```

Funciona, mas degrada: a lei pode ser truncada em conversas longas. Trate como plano B — e registre no seu roadmap migrar para injeção por seção.

## Adaptando a lei ao seu produto

1. **Troque os caminhos.** `/home/arthur/jarvis/cowork/<AAAA-MM-DD>-<slug>/` era o nosso; defina o seu e mantenha lei, schema (`deliverables.directoryTemplate`) e UI consistentes.
2. **Troque o provedor de browser.** A lei cita Browser Use Cloud (`bu_run`); se usar Playwright/CDP próprio, nomeie a ferramenta real — o modelo precisa do nome exato da tool.
3. **Revise os limites duros.** A lista de "destrutivo" deve refletir o SEU domínio: deletar, sobrescrever fora do diretório da tarefa, enviar mensagem/e-mail, postar, pagar, agendar.
4. **Não cresça.** Se passar de ~50 linhas, corte. Lei longa dilui obediência.
