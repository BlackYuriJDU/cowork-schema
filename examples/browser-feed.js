/**
 * cowork-schema · Sistema 4 — Feed do browser: da navegação do agente à
 * imagem no painel.
 *
 * O painel Cowork é um ESPELHO da sessão, não um canal paralelo: ele exibe
 * o último screenshot que as ferramentas do agente publicaram no histórico.
 * Este módulo extrai essas URLs de qualquer texto da sessão — mensagens do
 * assistente, raciocínio e, principalmente, resultados de ferramentas
 * (tool-result), que é onde o Browser Use Cloud devolve as capturas.
 *
 * Adaptação genérica das funções harvestTexts/extractLatestScreenshot do
 * client half do dsh-deepseek-design.
 */

/**
 * Padrão de URL de screenshot por provedor.
 * Browser Use Cloud devolve URLs no CDN próprio; para outro provedor,
 * troque o regex (ou configure browserFeed.urlPattern no schema).
 */
export const SCREENSHOT_URL_PATTERNS = {
  "browser-use-cloud": /https:\/\/cdn\.browser-use\.com\/screenshots\/[^\s"'\\)]+/g,
  // Exemplos de alternativas (adapte ao seu storage):
  // "playwright": /https:\/\/seu-cdn\.example\.com\/shots\/[^\s"'\\)]+/g,
  // "custom": /https?:\/\/[^\s"'\\)]+\.(?:png|jpe?g|webp)(?:\?[^\s"'\\)]*)?/g,
};

/**
 * Extrai TODOS os textos da sessão, em qualquer formato de nó.
 * Suporta os dois formatos comuns de histórico:
 *  - nodes[].blocks[]  (assistente: blocos text/reasoning)
 *  - nodes[].content[] (usuário e tool-result: partes tipadas)
 *
 * @param {object} snapshot { nodes: Array }
 * @returns {string[]} textos na ordem em que aparecem
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
 * Última URL de screenshot publicada na sessão (a mais recente vence).
 *
 * @param {object} snapshot { nodes: Array }
 * @param {RegExp} [pattern] regex com flag /g/ (default: Browser Use Cloud)
 * @returns {string} URL ou "" se ainda não houve navegação
 */
export function extractLatestScreenshot(
  snapshot,
  pattern = SCREENSHOT_URL_PATTERNS["browser-use-cloud"],
) {
  // Clone o regex: /g mantém lastIndex entre chamadas — bug clássico de
  // "funciona uma vez, falha na segunda".
  const re = new RegExp(pattern.source, pattern.flags);
  let last = "";
  for (const hay of harvestTexts(snapshot)) {
    const m = hay.match(re);
    if (m && m.length > 0) last = m[m.length - 1];
  }
  return last;
}

/**
 * Extrai caminhos absolutos de arquivos citados como entrega (seção 3 da
 * lei: "o painel lista os arquivos citados"). Use para a feature opcional
 * deliverablesList do painel.
 *
 * @param {object} snapshot { nodes: Array }
 * @param {RegExp} [pattern] default: caminhos POSIX absolutos
 * @returns {string[]} caminhos únicos, na ordem de citação
 */
export function extractDeliverablePaths(
  snapshot,
  pattern = /(?:^|[\s("'`])(\/[\w.\-/]+[\w.-])/gm,
) {
  const seen = new Set();
  const out = [];
  for (const hay of harvestTexts(snapshot)) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m;
    while ((m = re.exec(hay)) !== null) {
      const p = m[1];
      if (!seen.has(p)) {
        seen.add(p);
        out.push(p);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Produzindo screenshots (lado do agente)
// ---------------------------------------------------------------------------
//
// Browser Use Cloud (recomendado — foi o provedor de produção do DSH):
//   - API: https://api.browser-use.com/api/v2 (ou v3), header
//     `X-Browser-Use-API-Key: <key>` (https://cloud.browser-use.com/new-api-key)
//   - Cada step da task publica screenshots no CDN; a URL aparece no
//     tool-result e o painel a captura com o regex acima.
//   - SDKs: `pip install browser-use-sdk` / `npm install browser-use-sdk`.
//
// Alternativa self-hosted (Playwright):
//   1. A ferramenta de navegação do agente tira page.screenshot() a cada step.
//   2. Sobe para o seu storage (S3, R2, Supabase Storage...) com URL pública
//      ou assinada.
//   3. Devolve a URL no tool-result — o painel não precisa saber de onde veio;
//      basta o browserFeed.urlPattern correspondente.
//
// Regra de ouro (está na lei): MUITOS passos pequenos > um passo gigante.
// Cada step = uma foto nova no painel = sensação de trabalho ao vivo.
