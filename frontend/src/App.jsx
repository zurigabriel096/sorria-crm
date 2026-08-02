import { useEffect, useState } from "react";
import { T } from "./theme";
import { s } from "./styles/s";

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
import { Conversas } from "./pages/Conversas";
import { HistoricoDisparos } from "./pages/HistoricoDisparos";
import { Colaboradores } from "./pages/Colaboradores";
import { Plano } from "./pages/Plano";
import { Suporte } from "./pages/Suporte";
import { Config } from "./pages/Config";

import { logout as apiLogout } from "./api/auth";
import { listContacts, createContact, updateContact } from "./api/contacts";
import { listCampaigns, createCampaign, updateCampaign, deleteCampaign, archiveCampaign, listTemplates, listDispatchHistory } from "./api/campaigns";
import { listColaboradores, createColaborador, updateColaborador, deleteColaborador } from "./api/colaboradores";
import { listSegmentacoes, createSegmentacao, updateSegmentacao, deleteSegmentacao, archiveSegmentacao } from "./api/segmentacoes";
import { getMe, updateCorPerfil } from "./api/me";
import { checkHealth } from "./api/health";

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

  const [segmentos, setSegmentos] = useState([]);
  const [tags, setTags] = useState(["Inadimplente", "Sem agendamento", "Agenda Agosto", "Retorno"]);
  const [colaboradores, setColaboradores] = useState([]);
  const [objetivos, setObjetivos] = useState(["Reativação", "Anti no-show", "Cobrança", "Upsell", "Relacionamento", "Aquisição"]);

  const [toast, setToast] = useState(null);
  const [disparoCampanha, setDisparoCampanha] = useState(null);
  const [pacienteAberto, setPacienteAberto] = useState(null);
  const [carregandoDevagar, setCarregandoDevagar] = useState(false);

  const showToast = (msg, kind = "ok") => { setToast({ msg, kind }); setTimeout(() => setToast(null), 3200); };

  // Se já autenticado mas sem "usuario" em memória (recarregou a página com um
  // token salvo, por exemplo), busca o próprio perfil de novo — sem isso, o
  // header ficava com "?"/"-" até a pessoa deslogar e logar de novo.
  const carregarTudo = async (usuarioAtual) => {
    setCarregando(true);
    try {
      const precisaUsuario = !usuarioAtual;
      const [pacientesRes, campanhasRes, templatesRes, historicoRes, colaboradoresRes, segmentosRes, meRes] = await Promise.all([
        listContacts(), listCampaigns(), listTemplates(), listDispatchHistory(), listColaboradores(), listSegmentacoes(),
        precisaUsuario ? getMe() : Promise.resolve(usuarioAtual),
      ]);
      setPatients(pacientesRes);
      setCampanhas(campanhasRes);
      setTemplates(templatesRes);
      setHistorico(historicoRes);
      setColaboradores(colaboradoresRes);
      setSegmentos(segmentosRes);
      if (precisaUsuario) {
        setUsuario(meRes);
        setAvatarColor(meRes.corPerfil || T.primary);
      }
    } catch (e) {
      showToast(e.message || "Erro ao carregar dados do servidor", "warn");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { if (authed) carregarTudo(usuario); else setCarregando(false); }, [authed]);

  // Mesmo aviso do login, mas pra quando o carregamento inicial pós-login é que
  // pega o backend ainda acordando (cold start do Render) — sem isso a tela
  // "Carregando seus dados..." fica parada sem explicar o motivo da demora.
  useEffect(() => {
    if (!carregando) { setCarregandoDevagar(false); return; }
    const t = setTimeout(() => setCarregandoDevagar(true), 4000);
    return () => clearTimeout(t);
  }, [carregando]);

  // Se o token expirar/for rejeitado em qualquer chamada (client.js dispara esse
  // evento no 401), volta pro login em vez de deixar a tela com dados quebrados.
  useEffect(() => {
    const aoDeslogarPorExpiracao = () => {
      setAuthed(false);
      setUsuario(null);
      setAvatarColor(T.primary);
      setView("dashboard");
    };
    window.addEventListener("sorria:unauthorized", aoDeslogarPorExpiracao);
    return () => window.removeEventListener("sorria:unauthorized", aoDeslogarPorExpiracao);
  }, []);

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

  const atualizarCampanha = async (id, dadosCampanha, segmentoId) => {
    const atualizada = await updateCampaign(id, dadosCampanha);
    const comSegmento = segmentoId ? { ...atualizada, segmentoId } : atualizada;
    setCampanhas((c) => c.map((x) => (x.id === id ? comSegmento : x)));
    return comSegmento;
  };

  const excluirCampanha = async (id) => {
    await deleteCampaign(id);
    setCampanhas((c) => c.filter((x) => x.id !== id));
  };

  const arquivarCampanha = async (id, arquivado) => {
    const atualizada = await archiveCampaign(id, arquivado);
    setCampanhas((c) => c.map((x) => (x.id === id ? { ...x, ...atualizada, segmentoId: x.segmentoId } : x)));
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

  const criarSegmentacao = async (seg) => {
    const criada = await createSegmentacao(seg);
    setSegmentos((s2) => [criada, ...s2]);
    return criada;
  };

  const atualizarSegmentacao = async (id, seg) => {
    const atualizada = await updateSegmentacao(id, seg);
    setSegmentos((s2) => s2.map((x) => (x.id === id ? atualizada : x)));
    return atualizada;
  };

  const excluirSegmentacao = async (id) => {
    await deleteSegmentacao(id);
    setSegmentos((s2) => s2.filter((x) => x.id !== id));
  };

  const arquivarSegmentacao = async (id, arquivado) => {
    const atualizada = await archiveSegmentacao(id, arquivado);
    setSegmentos((s2) => s2.map((x) => (x.id === id ? atualizada : x)));
  };

  const onLogout = () => {
    apiLogout();
    setAuthed(false);
    setUsuario(null);
    setAvatarColor(T.primary);
    setView("dashboard");
  };
  const onLoginOk = (u) => {
    setUsuario(u);
    setAvatarColor(u.corPerfil || T.primary);
    setAuthed(true);
  };

  // A cor do avatar é preferência de cada conta — muda na hora na tela, mas
  // também salva no backend pra não vazar pra outra conta no mesmo navegador
  // nem se perder quando essa pessoa logar de novo depois.
  const mudarCorPerfil = (cor) => {
    setAvatarColor(cor);
    updateCorPerfil(cor).catch(() => {});
  };

  const irParaPacientes = (filtroEleg) => {
    setFiltroPacientesInicial(filtroEleg ? { eleg: filtroEleg } : null);
    setView("pacientes");
  };

  if (!authed) {
    return <Login onEnter={onLoginOk} onSupport={() => { setAuthed(true); setView("suporte"); }} />;
  }

  if (carregando) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", color: T.inkSoft, fontSize: 14, textAlign: "center", gap: 10 }}>
        <div>Carregando seus dados...</div>
        {carregandoDevagar && (
          <div style={{ fontSize: 12.5, color: T.inkSoft, maxWidth: 320 }}>
            Pode demorar até 1 minuto — o servidor está acordando.
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={s.root}>
      <Sidebar view={view} setView={setView} collapsed={collapsed} setCollapsed={setCollapsed} angry={angry} setAngry={setAngry} />
      <div style={s.main}>
        <Topbar view={view} usuario={usuario} onAvatarUploaded={setUsuario} avatarColor={avatarColor} setAvatarColor={mudarCorPerfil} sistemaAtivo={sistemaAtivo} onReportarProblema={() => setView("suporte")} onLogout={onLogout} showToast={showToast} />
        <div style={s.content} key={view}>
          {view === "dashboard" && <Dashboard patients={patients} historico={historico} onImport={onImport} showToast={showToast} setView={setView} irParaPacientes={irParaPacientes} />}
          {view === "pacientes" && <Pacientes patients={patients} tags={tags} onImport={onImport} showToast={showToast} filtroInicial={filtroPacientesInicial} onAbrirPaciente={abrirPaciente} />}
          {view === "conversas" && <Conversas patients={patients} showToast={showToast} onAbrirPaciente={abrirPaciente} onAtualizarPaciente={salvarPaciente} usuario={usuario} />}
          {view === "segmentacoes" && <Segmentacoes patients={patients} segmentos={segmentos} onCriar={criarSegmentacao} onAtualizar={atualizarSegmentacao} onExcluir={excluirSegmentacao} onArquivar={arquivarSegmentacao} tags={tags} setTags={setTags} showToast={showToast} />}
          {view === "campanhas" && <Campanhas campanhas={campanhas} onCriarCampanha={criarCampanha} onAtualizarCampanha={atualizarCampanha} onExcluirCampanha={excluirCampanha} onArquivarCampanha={arquivarCampanha} templates={templates} objetivos={objetivos} setObjetivos={setObjetivos} segmentos={segmentos} patients={patients} usuario={usuario} onDisparar={(c) => { setDisparoCampanha(c); setView("disparo"); }} showToast={showToast} />}
          {view === "templates" && <Templates templates={templates} setTemplates={setTemplates} objetivos={objetivos} showToast={showToast} />}
          {view === "automacoes" && <Automacoes showToast={showToast} usuario={usuario} />}
          {view === "disparo" && <DisparoFlow campanha={disparoCampanha} patients={patients} templates={templates} segmentos={segmentos} historico={historico} onFinish={finalizarDisparo} onCancel={() => setView("campanhas")} showToast={showToast} />}
          {view === "disparos" && <HistoricoDisparos historico={historico} patients={patients} onAbrirPaciente={abrirPaciente} />}
          {view === "colaboradores" && <Colaboradores colaboradores={colaboradores} onCriar={criarColaborador} onAtualizar={atualizarColaborador} onExcluir={excluirColaborador} usuario={usuario} showToast={showToast} />}
          {view === "plano" && <Plano showToast={showToast} />}
          {view === "suporte" && <Suporte showToast={showToast} />}
          {view === "config" && <Config showToast={showToast} usuario={usuario} />}
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
