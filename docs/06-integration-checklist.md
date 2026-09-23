# Checklist de integração + armadilhas de produção

Roteiro na ordem em que recomendamos integrar, com o que verificar em cada etapa. No fim, as armadilhas reais que encontramos rodando isso em produção no DSH — para você não repetir.

## Pré-requisitos

- [ ] Seu agente aceita **system prompt composto por turno** (ou você aceita o fallback de primeira mensagem — veja [`01-mode-law.md`](01-mode-law.md)).
- [ ] Existe um **log durável de eventos por sessão** (banco, arquivo, event sourcing — qualquer coisa que sobreviva a reload). Sem ele, o Sistema 2 não tem onde se apoiar.
- [ ] O agente tem uma **ferramenta de navegação web** que devolve texto (tool-result) — é onde as URLs de screenshot vão morar.
- [ ] Sua UI consegue renderizar um painel lateral e ler o estado da sessão de forma reativa (ou polling).

## Etapa 1 — Lei (30 min)

- [ ] Copie `law/cowork-core.md` e ajuste: diretório de entregas, nome da ferramenta de browser, lista de ações destrutivas do SEU domínio.
- [ ] Defina o cabeçalho de injeção ("isto NÃO é mensagem do usuário…").
- [ ] Teste manualmente: monte um prompt com a lei e verifique que o modelo narra passos e lista arquivos no fim.

## Etapa 2 — Estado e comandos (1–2 h)

- [ ] Implemente o evento `command/run` no log da sessão (tipo, `data.name`, `seq`, `ts`).
- [ ] Registre `/cowork` e `/chat` com `recordInput: false` — handlers só confirmam.
- [ ] Implemente `foldMode(events)` e use-o em **dois** lugares: montagem do system prompt e UI.
- [ ] Teste: ative, dê F5, confirme que o modo continua ativo; `/chat`, F5 de novo, confirme que desligou.

## Etapa 3 — Feed de browser (2–4 h)

- [ ] Escolha o provedor: Browser Use Cloud (rápido) ou Playwright self-host (controle).
- [ ] Garanta que a ferramenta devolve a URL do screenshot **no tool-result, como texto**.
- [ ] Implemente `extractLatestScreenshot()` com o regex do seu provedor (`browserFeed.urlPattern`).
- [ ] Teste: rode uma navegação e veja a URL aparecer no histórico da sessão.

## Etapa 4 — Painel (2–4 h)

- [ ] Renderize `cowork-panel.jsx` (ou equivalente no seu framework) no slot `sidebar-right`.
- [ ] Alimente `shotUrl` a partir da sessão (reativo ou polling de 1s).
- [ ] Ligue o steer input ao envio de prompt em queue na sessão, com prefixo `[COWORK ITERAÇÃO]` quando a tarefa já estiver rodando.
- [ ] Adicione os pills `Chat · Cowork` à esquerda do composer, executando os comandos reais (não mutação local).
- [ ] Teste o loop completo do README, ponta a ponta.

## Etapa 5 — Endurecimento

- [ ] URLs de screenshot assinadas com expiração curta.
- [ ] Lei revisada para segredos (seção 4) — screenshots podem vazar dados de sessões logadas.
- [ ] Métricas: tempo de tarefa (o cronômetro já dá), taxa de confirmações destrutivas pedidas vs. concedidas.
- [ ] (Opcional) `deliverablesList`: extraia caminhos absolutos citados e renderize lista clicável.

## Armadilhas reais (cada uma custou um debug)

1. **Estado em variável local.** Na v2, `mode` vivia num `let` no browser: após reload, pill e system prompt divergiam. Correção: tudo lê do fold. Não "sincronize" estado — derive.
2. **Lei como mensagem `[MODO ATIVADO]` no chat.** Polui o histórico e some em truncamento. Correção: seção de system prompt reavaliada por turno.
3. **Comando que ecoa no chat.** Se `/cowork` aparece como mensagem do usuário, o modelo às vezes "responde" ao comando em vez de trabalhar. Correção: `recordInput: false`.
4. **Regex `/g` reutilizado.** `lastIndex` persiste entre chamadas — a extração funciona uma vez e falha na seguinte. Correção: clonar o regex (`new RegExp(source, flags)`) a cada uso.
5. **Pills com `role="tablist"`.** Outro plugin nosso escondia tablists via CSS global e os pills sumiam. Correção: `role="group"` — e, semanticamente, são botões de modo mesmo.
6. **Painel como canal paralelo.** Qualquer estado que o painel mantém por conta própria (em vez de ler da sessão) dessincroniza em reload/segunda aba. Correção: painel-espelho.
7. **Fallback que sobrescreve o rascunho.** Em sessão em branco, semear a lei no composer **substituindo** o que o usuário já tinha digitado. Correção: sempre concatenar, nunca substituir.
8. **Um passo gigante em vez de muitos pequenos.** O agente fazia a navegação inteira numa chamada só: 1 screenshot no fim, painel "congelado" por minutos. Correção: regra na lei — muitos passos pequenos, 1 foto por passo.
9. **Confundir fechar o painel com sair do modo.** São ortogonais: Esc fecha o painel; só `/chat` desliga a lei. Deixe isso claro na UI (tooltip) ou o usuário achará que saiu do modo quando só fechou a janela.
10. **YAML editado como texto.** (Bônus do instalador do plugin original.) Qualquer arquivo de config estruturado: parse → modifica árvore → serializa → **valida o parse antes de gravar** → grava com backup. Nunca sed/regex em YAML.
