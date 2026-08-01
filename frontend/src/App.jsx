import { useState } from "react";
import { T } from "./theme";
import { s } from "./styles/s";
import { COLAB_SEED, TEMPLATES_SEED, SEG_SEED, OBJETIVOS_BASE } from "./data/seed";

import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { Toast } from "./components/ui/Toast";

import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Pacientes } from "./pages/Pacientes";
import { Segmentacoes } from "./pages/Segmentacoes";
import { Campanhas } from "./pages/Campanhas";
import { Templates } from "./pages/Templates";
import { DisparoFlow } from "./pages/Disparo";
import { HistoricoDisparos } from "./pages/HistoricoDisparos";
import { Colaboradores } from "./pages/Colaboradores";
import { Plano } from "./pages/Plano";
import { Suporte } from "./pages/Suporte";
import { Config } from "./pages/Config";

// Estado 100% em memória (modo demo, sem backend). Ver README.md ("Arquitetura")
// para o plano de migração de cada pedaço deste estado para o backend Spring Boot.
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [angry, setAngry] = useState(false);
  const [avatarColor, setAvatarColor] = useState(T.primary);
  const [waActive, setWaActive] = useState(true);
  const [patients, setPatients] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [templates, setTemplates] = useState(TEMPLATES_SEED);
  const [segmentos, setSegmentos] = useState(SEG_SEED);
  const [tags, setTags] = useState(["Inadimplente", "Sem agendamento", "Agenda Agosto", "Retorno"]);
  const [colaboradores, setColaboradores] = useState(COLAB_SEED);
  const [objetivos, setObjetivos] = useState(OBJETIVOS_BASE);
  const [historico, setHistorico] = useState([]);
  const [toast, setToast] = useState(null);
  const [disparoCampanha, setDisparoCampanha] = useState(null);

  const showToast = (msg, kind = "ok") => { setToast({ msg, kind }); setTimeout(() => setToast(null), 3200); };

  const onImport = (res) => {
    setPatients((prev) => {
      const map = {};
      prev.forEach((p) => (map[p.id] = p));
      res.pacientes.forEach((p) => {
        map[p.id] = map[p.id] ? { ...map[p.id], ...p, tags: [...new Set([...(map[p.id].tags || []), ...p.tags])] } : p;
      });
      return Object.values(map);
    });
    if (res.agenda.length) setAgenda((a) => [...a, ...res.agenda]);
    if (res.colaboradores.length) {
      setColaboradores((c) => {
        const nomes = new Set(c.map((x) => x.nome));
        const novos = res.colaboradores.filter((n) => !nomes.has(n)).map((n, i) => ({ id: Date.now() + i, nome: n, cpf: "", funcao: "Comercial", email: "" }));
        return [...c, ...novos];
      });
    }
    showToast(`Planilha "${res.tipo}" importada: ${res.pacientes.length} pacientes`, "ok");
  };

  const finalizarDisparo = (resultados, campanha) => {
    setHistorico((h) => [...resultados.map((r) => ({ ...r, campanha: campanha.nome })), ...h]);
    setPatients((ps) => ps.map((p) => {
      const r = resultados.find((x) => x.paciente_id === p.id);
      return r ? { ...p, enviado: r.status, campanha: campanha.nome } : p;
    }));
    setDisparoCampanha(null);
    setView("disparos");
    showToast(`Campanha "${campanha.nome}" disparada`, "ok");
  };

  if (!authed) {
    return <Login onEnter={() => setAuthed(true)} onSupport={() => { setAuthed(true); setView("suporte"); }} />;
  }

  return (
    <div style={s.root}>
      <Sidebar view={view} setView={setView} collapsed={collapsed} setCollapsed={setCollapsed} angry={angry} setAngry={setAngry} />
      <div style={s.main}>
        <Topbar view={view} avatarColor={avatarColor} setAvatarColor={setAvatarColor} waActive={waActive} setWaActive={setWaActive} onLogout={() => { setAuthed(false); setView("dashboard"); }} />
        <div style={s.content} key={view}>
          {view === "dashboard" && <Dashboard patients={patients} historico={historico} onImport={onImport} showToast={showToast} setView={setView} />}
          {view === "pacientes" && <Pacientes patients={patients} setPatients={setPatients} tags={tags} onImport={onImport} showToast={showToast} />}
          {view === "segmentacoes" && <Segmentacoes patients={patients} segmentos={segmentos} setSegmentos={setSegmentos} tags={tags} setTags={setTags} showToast={showToast} />}
          {view === "campanhas" && <Campanhas campanhas={campanhas} setCampanhas={setCampanhas} templates={templates} objetivos={objetivos} setObjetivos={setObjetivos} onDisparar={(c) => { setDisparoCampanha(c); setView("disparo"); }} showToast={showToast} />}
          {view === "templates" && <Templates templates={templates} setTemplates={setTemplates} objetivos={objetivos} showToast={showToast} />}
          {view === "disparo" && <DisparoFlow campanha={disparoCampanha} patients={patients} templates={templates} onFinish={finalizarDisparo} onCancel={() => setView("campanhas")} />}
          {view === "disparos" && <HistoricoDisparos historico={historico} />}
          {view === "colaboradores" && <Colaboradores colaboradores={colaboradores} setColaboradores={setColaboradores} showToast={showToast} />}
          {view === "plano" && <Plano showToast={showToast} />}
          {view === "suporte" && <Suporte showToast={showToast} />}
          {view === "config" && <Config showToast={showToast} />}
        </div>
      </div>
      {toast && <Toast toast={toast} />}
      <span style={s.protoTag}>PROTÓTIPO · sem dados reais no código · importe seu .xlsx</span>
    </div>
  );
}
