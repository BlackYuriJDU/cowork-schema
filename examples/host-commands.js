/**
 * cowork-schema · Sistemas 1 + 2 — Lei do modo + Estado derivado do log.
 *
 * Adaptação genérica do node half do plugin dsh-deepseek-design (DSH).
 * Não depende de nenhum framework: você pluga três funções no SEU host:
 *
 *   1. foldMode(events)        → deriva o modo ativo do log durável da sessão
 *   2. buildModeSection(...)   → monta o trecho de system prompt com a lei
 *   3. registerModeCommands()  → registra /cowork e /chat (só gravam evento)
 *
 * Princípios implementados aqui:
 *  - Modo é CONTEXTO, não mensagem: a lei entra no system prompt a cada
 *    montagem de prompt; nada é escrito no histórico visível.
 *  - Estado é DERIVADO, não armazenado: o modo ativo é o último evento
 *    `command/run` relevante no log — reload/restart convergem sozinhos.
 *  - Comandos não ecoam no chat (recordInput: false): o log já é a verdade.
 */

// ---------------------------------------------------------------------------
// Configuração — ajuste ao seu app (ou valide um arquivo contra
// schema/cowork-mode.schema.json e carregue daqui).
// ---------------------------------------------------------------------------

const LAW_PATHS = {
  cowork: "law/cowork-core.md",
};

const LAW_HEADER = {
  cowork:
    "MODO COWORK ATIVO — injeção de contexto (isto NÃO é mensagem do usuário). " +
    "Vale para TODOS os turnos desta sessão; só desativa com /chat.",
};

/** Comandos que ATIVAM um modo (o último vence) e o comando que desativa. */
const MODE_COMMAND_NAMES = new Set(Object.keys(LAW_PATHS));
const NEUTRAL_COMMAND = "chat";

// ---------------------------------------------------------------------------
// Sistema 2 — foldMode: estado derivado do log durável de eventos
// ---------------------------------------------------------------------------

/**
 * Percorre o log de eventos da sessão e devolve o modo ativo.
 * Cada comando de modo grava um evento { type: "command/run", data: { name } };
 * o ÚLTIMO relevante define o estado. Nunca guarde `mode` numa variável
 * separada — ela dessincroniza em reload, restart e múltiplas abas.
 *
 * @param {Array<{type: string, data?: {name?: string}}>} events
 * @returns {string} id do modo ativo (ex.: "cowork") ou "" (chat neutro)
 */
export function foldMode(events) {
  let mode = "";
  for (const event of events) {
    if (event.type !== "command/run") continue;
    const cmd = event.data?.name;
    if (MODE_COMMAND_NAMES.has(cmd)) mode = cmd;
    else if (cmd === NEUTRAL_COMMAND) mode = "";
  }
  return mode;
}

// ---------------------------------------------------------------------------
// Sistema 1 — buildModeSection: a lei como injeção de contexto
// ---------------------------------------------------------------------------

/** Cache simples: a lei é lida do disco uma vez por processo. */
const lawCache = new Map();

/**
 * @param {string} mode id do modo (ex.: "cowork")
 * @param {(path: string) => string} readFile injeção de dependência de IO
 * @returns {string} texto da lei ("" se ilegível — o modo fica sem lei,
 *                   mas nunca quebra a montagem do prompt)
 */
export function lawOf(mode, readFile) {
  if (lawCache.has(mode)) return lawCache.get(mode);
  let text = "";
  try {
    text = readFile(LAW_PATHS[mode]);
  } catch (err) {
    console.error(`[cowork] lei "${mode}" ilegível em ${LAW_PATHS[mode]}:`, err.message);
  }
  lawCache.set(mode, text);
  return text;
}

/**
 * Monta o trecho de system prompt correspondente ao modo ativo da sessão.
 * Chame isto A CADA montagem de prompt e concatene ao system prompt base.
 *
 * @param {object} args
 * @param {Array}  args.sessionEvents  log durável da sessão
 * @param {(path: string) => string} args.readFile  leitura de arquivo (fs.readFileSync)
 * @returns {string} seção a concatenar ("" quando o modo está desligado)
 */
export function buildModeSection({ sessionEvents, readFile }) {
  const mode = foldMode(sessionEvents);
  if (mode === "" || LAW_HEADER[mode] === undefined) return "";
  const law = lawOf(mode, readFile);
  return law === "" ? "" : `${LAW_HEADER[mode]}\n\n${law}`;
}

// ---------------------------------------------------------------------------
// Comandos — /cowork ativa, /chat desativa. Só gravam evento; o fold lê.
// ---------------------------------------------------------------------------

const MODE_COMMANDS = [
  {
    cmd: "cowork",
    description: "Cowork — lei do modo Cowork injetada no contexto (browser ao vivo no painel)",
    ok: "Modo Cowork ativado: lei injetada no contexto da sessão.",
  },
  {
    cmd: NEUTRAL_COMMAND,
    description: "Chat — desativa a lei Cowork desta sessão",
    ok: "Modo Chat: lei Cowork desativada.",
  },
];

/**
 * Registra os comandos no seu host. O contrato esperado é mínimo:
 *
 *   registerCommand({
 *     name, description, recordInput,
 *     handler: () => ({ kind: "success", text })
 *   })
 *
 * O host DEVE, ao executar o comando, acrescentar ao log durável da sessão:
 *   { type: "command/run", data: { name }, seq: <n>, ts: <iso> }
 *
 * `recordInput: false` impede que "/cowork" apareça como mensagem do usuário
 * no histórico — o log de eventos já é a fonte da verdade.
 *
 * @param {(def: object) => void} registerCommand
 */
export function registerModeCommands(registerCommand) {
  for (const { cmd, description, ok } of MODE_COMMANDS) {
    registerCommand({
      name: cmd,
      description,
      recordInput: false,
      handler: () => ({ kind: "success", text: ok }),
    });
  }
}

// ---------------------------------------------------------------------------
// Exemplo de uso num host fictício
// ---------------------------------------------------------------------------

/*
import { readFileSync } from "node:fs";

registerModeCommands(host.commands.register);

function assemblePrompt(session, userMessage) {
  const section = buildModeSection({
    sessionEvents: session.events,
    readFile: (p) => readFileSync(p, "utf8"),
  });
  return {
    system: [BASE_SYSTEM_PROMPT, section].filter(Boolean).join("\n\n"),
    messages: [...session.messages, userMessage],
  };
}
*/
