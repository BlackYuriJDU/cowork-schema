/**
 * cowork-schema · Sistema 3 — Painel Cowork (React).
 *
 * Anatomia (a mesma do painel de produção no DSH):
 *   ┌──────────────────────────────────────┐
 *   │ ◎ Cowork        04:32   ↺   ✕        │  header: título, cronômetro, reset, fechar
 *   ├──────────────────────────────────────┤
 *   │                                      │
 *   │        browser ao vivo (img)         │  último screenshot da sessão,
 *   │     object-fit: contain, full        │  ou placeholder se ainda não houve
 *   │                                      │
 *   ├──────────────────────────────────────┤
 *   │ [ Próximo passo da tarefa… ] [Enviar]│  steer input: direciona sem sair do modo
 *   └──────────────────────────────────────┘
 *
 * Props (contrato mínimo com o SEU host):
 *   shotUrl        string  — último screenshot (browser-feed.js)
 *   startedAt      number  — epoch ms do início da tarefa (0 = ainda não iniciou)
 *   onSend(text)   fn      — envia direcionamento ao agente (queue na sessão)
 *   onResetTask()  fn      — zera o cronômetro (nova tarefa)
 *   onClose()      fn      — fecha o painel (Esc também fecha)
 *
 * O componente não busca dados sozinho: quem renderiza assina o estado da
 * sessão e passa `shotUrl` — o painel é um espelho, não um canal.
 */

import React from "react";

const styles = {
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "var(--cw-bg, #141416)",
    color: "var(--cw-label, #e6e6e9)",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 10px",
    borderBottom: "1px solid var(--cw-border, rgba(255,255,255,.08))",
  },
  title: { fontWeight: 600, fontSize: 12, marginRight: "auto", display: "inline-flex", alignItems: "center", gap: 6 },
  timer: { fontVariantNumeric: "tabular-nums", fontSize: 11, color: "var(--cw-label-2, #9a9a9e)" },
  toolBtn: {
    height: 24,
    minWidth: 24,
    padding: "0 6px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "var(--cw-label-2, #9a9a9e)",
    cursor: "pointer",
    fontSize: 12,
  },
  stage: { flex: 1, minHeight: 0, display: "flex", overflow: "hidden" },
  shot: {
    width: "100%",
    height: "100%",
    minWidth: 0,
    minHeight: 0,
    objectFit: "contain", // a captura inteira visível, como um monitor ao vivo
    display: "block",
    background: "var(--cw-bg, #141416)",
  },
  empty: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--cw-label-dim, #6b6b70)",
    padding: 16,
  },
  emptyInner: { textAlign: "center", maxWidth: 240, fontSize: 12, lineHeight: 1.5 },
  footer: { display: "flex", gap: 6, padding: "8px 10px", borderTop: "1px solid var(--cw-border, rgba(255,255,255,.08))" },
  input: {
    flex: 1,
    height: 28,
    borderRadius: 8,
    border: "1px solid var(--cw-border-2, rgba(255,255,255,.12))",
    background: "var(--cw-input, #1d1d20)",
    color: "var(--cw-label, #e6e6e9)",
    fontSize: 12,
    padding: "0 10px",
    outline: "none",
  },
  sendBtn: {
    height: 28,
    padding: "0 12px",
    borderRadius: 8,
    border: "none",
    background: "var(--cw-primary, #3b82f6)",
    color: "#fff",
    fontSize: 12,
    cursor: "pointer",
    transition: "opacity .15s ease-out",
  },
};

function MonitorIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}

export function CoworkPanel({ shotUrl = "", startedAt = 0, onSend, onResetTask, onClose }) {
  const [elapsed, setElapsed] = React.useState(0);
  const [draft, setDraft] = React.useState("");

  // Cronômetro da tarefa (mm:ss). `startedAt` vem de fora: o host decide
  // quando a tarefa começou (primeira ação do agente no modo).
  React.useEffect(() => {
    const t0 = startedAt || Date.now();
    setElapsed(Math.floor((Date.now() - t0) / 1000));
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  // Esc fecha o painel (o modo continua ativo — são coisas separadas!)
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  const send = () => {
    const text = draft.trim();
    if (text === "") return;
    // Convenção de produção: quando a tarefa já está rodando, prefixe o
    // direcionamento para o agente distinguir de uma tarefa nova:
    onSend?.(shotUrl === "" ? text : `[COWORK ITERAÇÃO]\n${text}`);
    setDraft("");
  };

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.title}><MonitorIcon /> Cowork</div>
        <span title="Tempo de tarefa" style={styles.timer}>{mmss}</span>
        <button type="button" title="Nova tarefa (zera o cronômetro)" style={styles.toolBtn} onClick={onResetTask}>↺</button>
        <button type="button" title="Fechar (Esc)" aria-label="Fechar painel Cowork" style={styles.toolBtn} onClick={onClose}>✕</button>
      </div>

      <div style={styles.stage}>
        {shotUrl === "" ? (
          <div style={styles.empty}>
            <div style={styles.emptyInner}>
              Browser ao vivo — quando o agente navegar por você nesta sessão, a tela aparece aqui.
            </div>
          </div>
        ) : (
          // key={shotUrl}: troca de URL = nova imagem montada (evita flicker de cache)
          <img key={shotUrl} src={shotUrl} alt="Última captura do navegador" style={styles.shot} />
        )}
      </div>

      <div style={styles.footer}>
        <input
          type="text"
          placeholder={shotUrl === "" ? "Descreva a tarefa para o Cowork…" : "Próximo passo da tarefa…"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          style={styles.input}
        />
        <button
          type="button"
          onClick={send}
          disabled={draft.trim() === ""}
          style={{ ...styles.sendBtn, opacity: draft.trim() === "" ? 0.55 : 1 }}
        >
          {shotUrl === "" ? "Iniciar" : "Enviar"}
        </button>
      </div>
    </div>
  );
}

export default CoworkPanel;
