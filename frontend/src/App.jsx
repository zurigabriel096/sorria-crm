import { useEffect, useState } from "react";
import { T } from "./theme";
import { s } from "./styles/s";
import { SEG_SEED } from "./data/seed";

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

import { logout as apiLogout } from "./api/auth";
import { listContacts, createContact, updateContact } from "./api/contacts";
import { listCampaigns, createCampaign, listTemplates, listDispatchHistory } from "./api/campaigns";

// Colaboradores e Segmentações ainda não têm endpoint no backend (fora do escopo
// inicial: login, contatos, campanhas e dashboard) — continuam só em memória.
const COLAB_LOCAL_SEED = [];

export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("sorria_token"));
  const [carregando, setCarregando] = useState(true);
  const [view, setView] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [angry, setAngry] = useState(false);
  const [avatarColor, setAvatarColor] = useState(T.primary);
  const [waActive, setWaActive] = useState(true);

  const [patients, setPatients] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [historico, setHistorico] = useState([]);

  const [segmentos, setSegmentos] = useState(SEG_SEED);
  const [tags, setTags] = useState(["Inadimplente", "Sem agendamento", "Agenda Agosto", "Retorno"]);
  const [colaboradores, setColaboradores] = useState(COLAB_LOCAL_SEED);
  const [objetivos, setObjetivos] = useState(["Reativação", "Anti no-show", "Cobrança", "Upsell", "Relacionamento", "Aquisição"]);

  const [toast, setToast] = useState(null);
  const [disparoCampanha, setDisparoCampanha] = useState(null);

  const showToast = (msg, kind = "ok") => { setToast({ msg, kind }); setTimeout(() => setToast(null), 3200); };

  const carregarTudo = async () => {
    setCarregando(true);
    try {
      const [pacientesRes, campanhasRes, templatesRes, historicoRes] = await Promise.all([
        listContacts(), listCampaigns(), listTemplates(), listDispatchHistory(),
      ]);
      setPatients(pacientesRes);
      setCampanhas(campanhasRes);
      setTemplates(templatesRes);
      setHistorico(historicoRes);
    } catch (e) {
      showToast(e.message || "Erro ao carregar dados do servidor", "warn");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { if (authed) carregarTudo(); else setCarregando(false); }, [authed]);

  const onImport = async (res) => {
    try {
      await Promise.all(res.pacientes.map((p) => createContact(p)));
      showToast(`Planilha "${res.tipo}" importada: ${res.pacientes.length} pacientes`, "ok");
      const pacientesAtualizados = await listContacts();
      setPatients(pacientesAtualizados);
    } catch (e) {
      showToast(e.message || "Erro ao importar planilha", "warn");
    }
  };

  const salvarPaciente = async (novo) => {
    const salvo = await updateContact(novo.id, novo);
    setPatients((ps) => ps.map((p) => (p.id === salvo.id ? salvo : p)));
  };

  const criarCampanha = async (dadosCampanha) => {
    const criada = await createCampaign(dadosCampanha);
    setCampanhas((c) => [criada, ...c]);
    return criada;
  };

  const finalizarDisparo = async () => {
    setDisparoCampanha(null);
    setView("disparos");
    const [historicoRes, pacientesRes, campanhasRes] = await Promise.all([listDispatchHistory(), listContacts(), listCampaigns()]);
    setHistorico(historicoRes);
    setPatients(pacientesRes);
    setCampanhas(campanhasRes);
  };

  const onLogout = () => { apiLogout(); setAuthed(false); setView("dashboard"); };
  const onLoginOk = () => { setAuthed(true); };

  if (!authed) {
    return <Login onEnter={onLoginOk} onSupport={() => { setAuthed(true); setView("suporte"); }} />;
  }

  if (carregando) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", color: T.inkSoft, fontSize: 14 }}>
        Carregando seus dados...
      </div>
    );
  }

  return (
    <div style={s.root}>
      <Sidebar view={view} setView={setView} collapsed={collapsed} setCollapsed={setCollapsed} angry={angry} setAngry={setAngry} />
      <div style={s.main}>
        <Topbar view={view} avatarColor={avatarColor} setAvatarColor={setAvatarColor} waActive={waActive} setWaActive={setWaActive} onLogout={onLogout} />
        <div style={s.content} key={view}>
          {view === "dashboard" && <Dashboard patients={patients} historico={historico} onImport={onImport} showToast={showToast} setView={setView} />}
          {view === "pacientes" && <Pacientes patients={patients} onSalvarPaciente={salvarPaciente} tags={tags} onImport={onImport} showToast={showToast} />}
          {view === "segmentacoes" && <Segmentacoes patients={patients} segmentos={segmentos} setSegmentos={setSegmentos} tags={tags} setTags={setTags} showToast={showToast} />}
          {view === "campanhas" && <Campanhas campanhas={campanhas} onCriarCampanha={criarCampanha} templates={templates} objetivos={objetivos} setObjetivos={setObjetivos} onDisparar={(c) => { setDisparoCampanha(c); setView("disparo"); }} showToast={showToast} />}
          {view === "templates" && <Templates templates={templates} setTemplates={setTemplates} objetivos={objetivos} showToast={showToast} />}
          {view === "disparo" && <DisparoFlow campanha={disparoCampanha} patients={patients} templates={templates} onFinish={finalizarDisparo} onCancel={() => setView("campanhas")} showToast={showToast} />}
          {view === "disparos" && <HistoricoDisparos historico={historico} />}
          {view === "colaboradores" && <Colaboradores colaboradores={colaboradores} setColaboradores={setColaboradores} showToast={showToast} />}
          {view === "plano" && <Plano showToast={showToast} />}
          {view === "suporte" && <Suporte showToast={showToast} />}
          {view === "config" && <Config showToast={showToast} />}
        </div>
      </div>
      {toast && <Toast toast={toast} />}
      <span style={s.protoTag}>Sorr.ia · dados salvos no servidor</span>
    </div>
  );
}
