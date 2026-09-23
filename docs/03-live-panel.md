# Sistema 3 — Live Panel (o painel ao vivo)

O painel é o que transforma "agente trabalhando" em experiência: sem ele, o usuário olha um spinner; com ele, o usuário **assiste o trabalho**. Componente de referência: [`examples/cowork-panel.jsx`](../examples/cowork-panel.jsx).

## Anatomia

```
┌──────────────────────────────────────┐
│ ◎ Cowork        04:32   ↺   ✕        │  header
├──────────────────────────────────────┤
│                                      │
│        browser ao vivo (img)         │  stage
│                                      │
├──────────────────────────────────────┤
│ [ Próximo passo da tarefa… ] [Enviar]│  footer (steer input)
└──────────────────────────────────────┘
```

### Header
- **Título + ícone** do modo (monitor/órbita — algo que diga "trabalho", não "conversa").
- **Cronômetro mm:ss** da tarefa. Parece decorativo, não é: dá escala de tempo ao trabalho autônomo e ancora a paciência do usuário. Começa no primeiro evento da tarefa; o botão ↺ zera (nova tarefa).
- **✕ fecha o painel** (Esc também). Importante: fechar o painel **não** desativa o modo — a lei continua no contexto. Modo e painel são ortogonais.

### Stage (browser ao vivo)
- Uma `<img>` com a **última URL de screenshot** extraída da sessão (Sistema 4).
- `object-fit: contain` em 100% do painel: a captura inteira visível, como um monitor. Nada de crop.
- `key={shotUrl}`: troca de URL monta imagem nova — evita flicker de cache.
- Estado vazio importa: *"quando o agente navegar por você, a tela aparece aqui"* ensina o que esperar.

### Footer (steer input)
- Caixa de texto que envia direcionamento **sem sair do modo**: primeira mensagem = a tarefa; seguintes levam prefixo `[COWORK ITERAÇÃO]` para o agente distinguir ajuste de tarefa nova.
- Placeholders que mudam com o estado ("Descreva a tarefa…" → "Próximo passo…") guiam sem tutorial.

## Princípio: o painel é um espelho

O painel **não tem canal próprio** com o agente. Ele lê o que já está na sessão (screenshots nos tool-results) e escreve na sessão (prompts em queue). Consequência: painel fechado, painel reaberto, segunda aba — todos veem a mesma coisa, porque todos leem a mesma sessão.

## Onde renderizar

| Slot | Quando usar |
|------|-------------|
| `sidebar-right` | Default. Chat comprime, painel ocupa a lateral — foi o layout de produção no DSH. |
| `full-overlay` | Foco total na tarefa (bom para mobile). |
| `bottom` | Funciona, mas screenshots de browser são verticais — desperdiça área. |

No DSH, o painel ocupava a coluna nativa de detalhes com **geometria invertida**: chat estreito (340px) e painel com o resto — o browser ao vivo é o protagonista, o chat vira narração. Se o seu layout permitir, prefira isso a um painel apertado.

## Seletor de modo (pills)

O padrão consagrado (Claude Cowork, e o nosso plugin) são **pills à esquerda do composer**: `Chat · Cowork` (o DSH tinha `Chat · Design · Cowork`).

Detalhes de implementação que importam:

- **`role="group"`, não `role="tablist"`.** No nosso caso, outro plugin escondia tablists via CSS e aposentaria os pills. Além disso, semanticamente são botões de modo, não abas de conteúdo.
- **Escolher um pill executa o comando real** (`/cowork`), não uma mutação local de estado — assim UI e contexto nunca divergem (Sistema 2).
- **Cada conversa lembra seu modo.** Ao trocar de chat, sincronize o seletor com o fold daquela sessão.

## Feature opcional: lista de entregas

A lei manda o agente citar arquivos com caminho absoluto; [`browser-feed.js`](../examples/browser-feed.js) tem `extractDeliverablePaths()` para extrair esses caminhos do texto da sessão e renderizar uma lista clicável no painel. Está desligada por default no schema (`panel.features.deliverablesList`) porque exige disciplina de formato da lei — ligue quando a sua estiver madura.
