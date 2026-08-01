import { useEffect, useState } from "react";
import { T } from "./theme";
import { s } from "./styles/s";
import { SEG_SEED } from "./data/seed";

import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { Toast } from "./components/ui/Toast";
import { PatientDetailModal } from "./components/PatientDetailModal";

import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Pacientes } from "./pages/Pacientes";
import { Segmentacoes } from "./pages/Segmentacoes";
import { Campanhas } from "./pages/Campanhas";
import { Templates } from "./pages/Templates";
import { DisparoFlow } from "./pages/Disparo";
import { Automacoes } from "./pages/Automacoes";
import { HistoricoDisparos } from "./pages/HistoricoDisparos";
import { Colaboradores } from "./pages/Colaboradores";
import { Plano } from "./pages/Plano";
import { Suporte } from "./pages/Suporte";
import { Config } from "./pages/Config";

import { logout as apiLogout } from "./api/auth";
import { listContacts, createContact, updateContact } from "./api/contacts";
import { listCampaigns, createCampaign, listTemplates, listDispatchHistory } from "./api/campaigns";
import { listColaboradores, createColaborador, updateColaborador, deleteColaborador } from "./api/colaboradores";
import { checkHealth } from "./api/health";

// Segmentações ainda não têm endpoint no backend (fora do escopo inicial) —
// continuam só em memória.

export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("sorria_token"));
  const [carregando, setCarregando] = useState(true);
  const [view, setView] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [angry, setAngry] = useState(false);
  const [avatarColor, setAvatarColor] = useState(T.primary);
  const [sistemaAtivo, setSistemaAtivo] = useState(true);
  const [usuario, setUsuario] = useState(null);
  const [filtroPacientesInicial, setFiltroPacientesInicial] = useState(null);

  const [patients, setPatients] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [historico, setHistorico] = useState([]);

  const [segmentos, setSegmentos] = useState(SEG_SEED);
  const [tags, setTags] = useState(["Inadimplente", "Sem agendamento", "Agenda Agosto", "Retorno"]);
  const [colaboradores, setColaboradores] = useState([]);
  const [objetivos, setObjetivos] = useState(["Reativação", "Anti no-show", "Cobrança", "Upsell", "Relacionamento", "Aquisição"]);

  const [toast, setToast] = useState(null);
  const [disparoCampanha, setDisparoCampanha] = useState(null);
  const [pacienteAberto, setPacienteAberto] = useState(null);

  const showToast = (msg, kind = "ok") => { setToast({ msg, kind }); setTimeout(() => setToast(null), 3200); };

  const carregarTudo = async () => {
    setCarregando(true);
    try {
      const [pacientesRes, campanhasRes, templatesRes, historicoRes, colaboradoresRes] = await Promise.all([
        listContacts(), listCampaigns(), listTemplates(), listDispatchHistory(), listColaboradores(),
      ]);
      setPatients(pacientesRes);
      setCampanhas(campanhasRes);
      setTemplates(templatesRes);
      setHistorico(historicoRes);
      setColaboradores(colaboradoresRes);
    } catch (e) {
      showToast(e.message || "Erro ao carregar dados do servidor", "warn");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { if (authed) carregarTudo(); else setCarregando(false); }, [authed]);

  // Monitora a saúde real do backend. Uma falha isolada não conta: só marca "inativo"
  // depois de uma segunda tentativa (evita alarme falso por causa do cold start do Render).
  useEffect(() => {
    if (!authed) return;
    let cancelado = false;
    const verificar = async () => {
      let ok = await checkHealth();
      if (!ok) ok = await checkHealth(20000);
      if (!cancelado) setSistemaAtivo(ok);
    };
    verificar();
    const intervalo = setInterval(verificar, 120000);
    return () => { cancelado = true; clearInterval(intervalo); };
  }, [authed]);

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
    setPacienteAberto(null);
    showToast("Cadastro atualizado", "ok");
  };

  const abrirPaciente = (paciente, aba = "dados") => setPacienteAberto({ paciente, aba });

  const criarCampanha = async (dadosCampanha, segmentoId) => {
    const criada = await createCampaign(dadosCampanha);
    const comSegmento = segmentoId ? { ...criada, segmentoId } : criada;
    setCampanhas((c) => [comSegmento, ...c]);
    return comSegmento;
  };

  const finalizarDisparo = async () => {
    setDisparoCampanha(null);
    setView("disparos");
    const [historicoRes, pacientesRes, campanhasRes] = await Promise.all([listDispatchHistory(), listContacts(), listCampaigns()]);
    setHistorico(historicoRes);
    setPatients(pacientesRes);
    // O backend não guarda a segmentação escolhida (é um conceito só do frontend), então
    // preserva a associação local ao mesclar com a lista recém-carregada do servidor.
    setCampanhas((atuais) =>
      campanhasRes.map((c) => {
        const local = atuais.find((a) => a.id === c.id);
        return local?.segmentoId ? { ...c, segmentoId: local.segmentoId } : c;
      })
    );
  };

  const criarColaborador = async (dados) => {
    const criado = await createColaborador(dados);
    setColaboradores((c) => [...c, criado]);
  };

  const atualizarColaborador = async (id, dados) => {
    const atualizado = await updateColaborador(id, dados);
    setColaboradores((c) => c.map((x) => (x.id === id ? atualizado : x)));
  };

  const excluirColaborador = async (id) => {
    await deleteColaborador(id);
    setColaboradores((c) => c.filter((x) => x.id !== id));
  };

  const onLogout = () => { apiLogout(); setAuthed(false); setView("dashboard"); };
  const onLoginOk = (u) => { setUsuario(u); setAuthed(true); };

  const irParaPacientes = (filtroEleg) => {
    setFiltroPacientesInicial(filtroEleg ? { eleg: filtroEleg } : null);
    setView("pacientes");
  };

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
        <Topbar view={view} usuario={usuario} avatarColor={avatarColor} setAvatarColor={setAvatarColor} sistemaAtivo={sistemaAtivo} onReportarProblema={() => setView("suporte")} onLogout={onLogout} />
        <div style={s.content} key={view}>
          {view === "dashboard" && <Dashboard patients={patients} historico={historico} onImport={onImport} showToast={showToast} setView={setView} irParaPacientes={irParaPacientes} />}
          {view === "pacientes" && <Pacientes patients={patients} tags={tags} onImport={onImport} showToast={showToast} filtroInicial={filtroPacientesInicial} onAbrirPaciente={abrirPaciente} />}
          {view === "segmentacoes" && <Segmentacoes patients={patients} segmentos={segmentos} setSegmentos={setSegmentos} tags={tags} setTags={setTags} showToast={showToast} />}
          {view === "campanhas" && <Campanhas campanhas={campanhas} onCriarCampanha={criarCampanha} templates={templates} objetivos={objetivos} setObjetivos={setObjetivos} segmentos={segmentos} patients={patients} usuario={usuario} onDisparar={(c) => { setDisparoCampanha(c); setView("disparo"); }} showToast={showToast} />}
          {view === "templates" && <Templates templates={templates} setTemplates={setTemplates} objetivos={objetivos} showToast={showToast} />}
          {view === "automacoes" && <Automacoes showToast={showToast} />}
          {view === "disparo" && <DisparoFlow campanha={disparoCampanha} patients={patients} templates={templates} segmentos={segmentos} onFinish={finalizarDisparo} onCancel={() => setView("campanhas")} showToast={showToast} />}
          {view === "disparos" && <HistoricoDisparos historico={historico} patients={patients} onAbrirPaciente={abrirPaciente} />}
          {view === "colaboradores" && <Colaboradores colaboradores={colaboradores} onCriar={criarColaborador} onAtualizar={atualizarColaborador} onExcluir={excluirColaborador} usuario={usuario} showToast={showToast} />}
          {view === "plano" && <Plano showToast={showToast} />}
          {view === "suporte" && <Suporte showToast={showToast} />}
          {view === "config" && <Config showToast={showToast} />}
        </div>
      </div>
      {toast && <Toast toast={toast} />}
      {pacienteAberto && (
        <PatientDetailModal
          paciente={pacienteAberto.paciente}
          abaInicial={pacienteAberto.aba}
          tags={tags}
          historico={historico}
          onSave={salvarPaciente}
          onClose={() => setPacienteAberto(null)}
        />
      )}
      <span style={s.protoTag}>Sorr.ia · dados salvos no servidor</span>
    </div>
  );
}
