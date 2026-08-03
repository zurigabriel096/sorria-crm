import { useEffect, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { dataHora } from "../utils/format";
import { getAquecimentoConfig, setAquecimentoConfig, getAquecimentoStatus } from "../api/aquecimento";

// "Sorr.ia Protect" - troca mensagem de verdade entre numeros dedicados a
// aquecimento (WhatsAppNumero.finalidade="AQUECIMENTO", cadastrados em
// Config > Outros numeros), numa curva de volume crescente + intervalo
// "ritmo humano" entre envios. NUNCA promete "sem bloqueio" - so reduz risco.
// Chave-mestra comeca desligada (AquecimentoConfig.ativo) - so ADMIN liga.
export function Aquecimento({ showToast }) {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    getAquecimentoConfig().then(setConfig).catch(() => showToast("Erro ao carregar configuração", "warn"));
    getAquecimentoStatus().then(setStatus).catch(() => setStatus([]));
  };

  useEffect(() => { carregar(); }, []);
  // Enquanto ativo, atualiza o status a cada 20s pra acompanhar em quase-tempo-real.
  useEffect(() => {
    if (!config?.ativo) return;
    const t = setInterval(() => getAquecimentoStatus().then(setStatus).catch(() => {}), 20000);
    return () => clearInterval(t);
  }, [config?.ativo]);

  const salvar = async (patch) => {
    const novo = { ...config, ...patch };
    setConfig(novo);
    setSalvando(true);
    try {
      const salvo = await setAquecimentoConfig(novo);
      setConfig(salvo);
      showToast("Configuração salva", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar configuração", "warn");
    } finally {
      setSalvando(false);
    }
  };

  if (!config || !status) return <div style={{ color: T.inkSoft, fontSize: 14, padding: "20px 0" }}>Carregando Sorr.ia Protect...</div>;

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 820 }}>
      <div style={s.aviso}>
        <b>Isso não elimina o risco de bloqueio, só reduz.</b> O WhatsApp decide quem restringir com base em vários
        fatores (denúncias, qualidade da lista, padrão geral de uso) que nenhuma ferramenta controla por fora.
        Use números <b>dedicados só a isso</b> — nunca os mesmos que disparam campanha de verdade.
      </div>

      <Card title="Chave-mestra">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => salvar({ ativo: !config.ativo })}
            disabled={salvando}
            style={{ ...s.btnPrimarySm, background: config.ativo ? T.coral : T.primary }}
          >
            {config.ativo ? "Desligar" : "Ligar"} o Sorr.ia Protect
          </button>
          <span style={{ ...s.tagOk, ...(config.ativo ? {} : { color: T.inkSoft, background: T.lineSoft }) }}>
            {config.ativo ? "● Ativo — trocando mensagem de verdade" : "● Inativo"}
          </span>
        </div>
        <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 10 }}>
          Precisa de pelo menos 2 números marcados como "Aquecimento" (Config → Outros números de disparo) pra funcionar.
        </div>
      </Card>

      <Card title="Curva de volume (mensagens por dia, por número)">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          <Field label="Dia 1 (inicial)">
            <input type="number" min={1} style={s.input} value={config.mensagensDiaInicial} onChange={(e) => salvar({ mensagensDiaInicial: Math.max(1, Number(e.target.value) || 1) })} />
          </Field>
          <Field label="Incremento por dia">
            <input type="number" min={0} style={s.input} value={config.incrementoDiario} onChange={(e) => salvar({ incrementoDiario: Math.max(0, Number(e.target.value) || 0) })} />
          </Field>
          <Field label="Máximo por dia">
            <input type="number" min={1} style={s.input} value={config.mensagensDiaMaximo} onChange={(e) => salvar({ mensagensDiaMaximo: Math.max(1, Number(e.target.value) || 1) })} />
          </Field>
          <Field label="Dias até o máximo">
            <input type="number" min={1} style={s.input} value={config.diasAquecimento} onChange={(e) => salvar({ diasAquecimento: Math.max(1, Number(e.target.value) || 1) })} />
          </Field>
        </div>
      </Card>

      <Card title="Intervalo entre mensagens (ritmo humano)">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Mínimo (segundos)">
            <input type="number" min={60} style={s.input} value={config.intervaloMinSegundos} onChange={(e) => salvar({ intervaloMinSegundos: Math.max(60, Number(e.target.value) || 60) })} />
          </Field>
          <Field label="Máximo (segundos)">
            <input type="number" min={config.intervaloMinSegundos} style={s.input} value={config.intervaloMaxSegundos} onChange={(e) => salvar({ intervaloMaxSegundos: Math.max(config.intervaloMinSegundos, Number(e.target.value) || config.intervaloMinSegundos) })} />
          </Field>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.ink, marginTop: 12 }}>
          <input type="checkbox" checked={config.modoDinamico} onChange={(e) => salvar({ modoDinamico: e.target.checked })} />
          Modo dinâmico (sorteia o intervalo dentro da faixa a cada envio — recomendado, quebra padrão repetitivo)
        </label>
        <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 8 }}>
          Padrão recomendado: 180-240s (3-4min). Abaixo de 60-120s fica um ritmo detectável demais.
        </div>
      </Card>

      <Card title="Status dos números de aquecimento">
        {!status.length ? (
          <div style={{ fontSize: 13, color: T.inkSoft }}>Nenhum número marcado como "Aquecimento" ainda — cadastre em Config → Outros números de disparo.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {status.map((n) => (
              <div key={n.numeroId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: T.lineSoft, borderRadius: 8, fontSize: 12.5, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: T.ink, minWidth: 140 }}>{n.nome}</span>
                <span style={{ ...s.tagOk, ...(n.conectado ? {} : { color: T.coral, background: T.coral + "1A" }) }}>{n.conectado ? "● Conectado" : "● Desconectado"}</span>
                <span style={{ color: T.inkSoft }}>Dia {n.diaAquecimento ?? "—"} da curva</span>
                <span style={{ color: T.primary, fontWeight: 700 }}>{n.enviadosHoje}/{n.metaHoje} hoje</span>
                {n.proximoEnvioEm && <span style={{ color: T.inkSoft, marginLeft: "auto" }}>próximo envio: {dataHora(n.proximoEnvioEm)}</span>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
