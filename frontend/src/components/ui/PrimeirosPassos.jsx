import { useState } from "react";
import { T } from "../../theme";
import { s } from "../../styles/s";
import { Card } from "./Card";
import { IconCheck, IconX } from "../icons";

const CHAVE_DISMISS = "sorria_primeiros_passos_ocultar";

// Checklist de onboarding (achado #4 da auditoria de UX, 06/08/2026): a
// sequencia real pra virar produtivo (importar -> equipe -> distribuir ->
// campanha) nao tinha nenhum guia, cada passo exige ja saber onde ele mora.
// Progresso calculado 100% a partir de dado real (nunca um contador falso) -
// some sozinho quando os 4 passos estao feitos, ou se a pessoa fechar no X.
export function PrimeirosPassos({ patients, colaboradores, campanhas, setView }) {
  const [ocultoManual, setOcultoManual] = useState(() => localStorage.getItem(CHAVE_DISMISS) === "1");

  const passos = [
    {
      feito: patients.length > 0,
      titulo: "Importar sua base de leads",
      descricao: "Suba a planilha e mapeie as colunas.",
      acao: "Importar",
      onClick: () => setView("pacientes"),
    },
    {
      feito: colaboradores.length > 1,
      titulo: "Adicionar sua equipe",
      descricao: "Cadastre quem vai trabalhar os leads.",
      acao: "Cadastrar",
      onClick: () => setView("colaboradores"),
    },
    {
      feito: patients.some((p) => p.responsavelId),
      titulo: "Distribuir os leads entre a equipe",
      descricao: "Atribua um responsável (individual ou em massa por Segmentações).",
      acao: "Distribuir",
      onClick: () => setView("pacientes"),
    },
    {
      feito: campanhas.length > 0,
      titulo: "Criar sua primeira campanha",
      descricao: "Lembrete de agendamento, cobrança em massa, reativação.",
      acao: "Criar campanha",
      onClick: () => setView("campanhas"),
    },
  ];

  const concluidos = passos.filter((p) => p.feito).length;
  if (ocultoManual || concluidos === passos.length) return null;

  const ocultar = () => { localStorage.setItem(CHAVE_DISMISS, "1"); setOcultoManual(true); };

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>Primeiros passos</div>
          <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 2 }}>{concluidos} de {passos.length} concluídos</div>
        </div>
        <button onClick={ocultar} title="Esconder" style={{ color: T.inkFaint || T.inkSoft }}>
          <IconX width={14} height={14} />
        </button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {passos.map((p, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10,
              background: p.feito ? T.primarySoft : T.lineSoft,
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
              background: p.feito ? T.primary : "#fff", border: p.feito ? "none" : `1.5px solid ${T.line}`,
            }}>
              {p.feito && <IconCheck color="#fff" width={12} height={12} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, textDecoration: p.feito ? "line-through" : "none" }}>{p.titulo}</div>
              <div style={{ fontSize: 11.5, color: T.inkSoft }}>{p.descricao}</div>
            </div>
            {!p.feito && (
              <button style={s.btnGhostSm} onClick={p.onClick}>{p.acao}</button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
