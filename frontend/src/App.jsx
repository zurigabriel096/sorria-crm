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
import { FilaTrabalho } from "./pages/FilaTrabalho";
import { InicioColaborador } from "./pages/InicioColaborador";
import { HistoricoDisparos } from "./pages/HistoricoDisparos";
import { Colaboradores } from "./pages/Colaboradores";
import { Plano } from "./pages/Plano";
import { Suporte } from "./pages/Suporte";
import { Config } from "./pages/Config";

import { logout as apiLogout } from "./api/auth";
import { listContacts, createContact, updateContact, createContactsLote, unificarDuplicados as apiUnificarDuplicados } from "./api/contacts";
import { listCampaigns, createCampaign, updateCampaign, deleteCampaign, archiveCampaign, listTemplates, listDispatchHistory } from "./api/campaigns";
import { listColaboradores, createColaborador, updateColaborador, deleteColaborador } from "./api/colaboradores";
import { listSegmentacoes, createSegmentacao, updateSegmentacao, deleteSegmentacao, archiveSegmentacao } from "./api/segmentacoes";
import { listTags, createTag, updateTag, deleteTag } from "./api/tags";
import { listCamposCustomizados, createCampoCustomizado, updateCampoCustomizado, deleteCampoCustomizado } from "./api/camposCustomizados";
import { getColunasVisiveis, setColunasVisiveis as apiSetColunasVisiveis } from "./api/configColunas";
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
  const [tagObjetos, setTagObjetos] = useState([]);
  const tags = tagObjetos.map((t) => t.nome);
  const [camposCustomizados, setCamposCustomizados] = useState([]);
  const [colunasVisiveis, setColunasVisiveisState] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [objetivos, setObjetivos] = useState(["Reativação", "Anti no-show", "Cobrança", "Upsell", "Relacionamento", "Aquisição"]);

  const [toast, setToast] = useState(null);
  const [disparoCampanha, setDisparoCampanha] = useState(null);
  const [pacienteAberto, setPacienteAberto] = useState(null);
  const [conversaParaAbrir, setConversaParaAbrir] = useState(null);
  const [carregandoDevagar, setCarregandoDevagar] = useState(false);

  const showToast = (msg, kind = "ok") => { setToast({ msg, kind }); setTimeout(() => setToast(null), 3200); };

  // Se já autenticado mas sem "usuario" em memória (recarregou a página com um
  // token salvo, por exemplo), busca o próprio perfil de novo — sem isso, o
  // header ficava com "?"/"-" até a pessoa deslogar e logar de novo.
  const carregarTudo = async (usuarioAtual) => {
    setCarregando(true);
    try {
      const precisaUsuario = !usuarioAtual;
      const [pacientesRes, campanhasRes, templatesRes, historicoRes, colaboradoresRes, segmentosRes, tagsRes, camposRes, colunasRes, meRes] = await Promise.all([
        listContacts(), listCampaigns(), listTemplates(), listDispatchHistory(), listColaboradores(), listSegmentacoes(), listTags(),
        listCamposCustomizados(), getColunasVisiveis(),
        precisaUsuario ? getMe() : Promise.resolve(usuarioAtual),
      ]);
      setPatients(pacientesRes);
      setCampanhas(campanhasRes);
      setTemplates(templatesRes);
      setHistorico(historicoRes);
      setColaboradores(colaboradoresRes);
      setSegmentos(segmentosRes);
      setTagObjetos(tagsRes);
      setCamposCustomizados(camposRes);
      setColunasVisiveisState(colunasRes);
      if (precisaUsuario) {
        setUsuario(meRes);
        setAvatarColor(meRes.corPerfil || T.primary);
        setView(viewInicialPara(meRes));
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

  // 1 requisicao com a planilha inteira - antes disparava uma por linha em
  // paralelo, o que sobrecarregava o backend em bases grandes (milhares de
  // linhas = milhares de conexoes simultaneas).
  const onImport = async (res) => {
    try {
      await createContactsLote(res.pacientes);
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

  // "Criar novo lead" avulso (fora da importação em massa) - usado pelo
  // "Iniciar conversa" do Kanban, pra cadastrar do zero e já abrir o chat.
  const criarPacienteAvulso = async (dados) => {
    const criado = await createContact(dados);
    setPatients((ps) => [criado, ...ps]);
    return criado;
  };

  // Limpeza de duplicados (mesmo telefone) que já existiam antes da trava de
  // criação existir - mescla e recarrega a lista com o resultado.
  const unificarDuplicados = async () => {
    const { unificados } = await apiUnificarDuplicados();
    const pacientesAtualizados = await listContacts();
    setPatients(pacientesAtualizados);
    showToast(unificados > 0 ? `${unificados} cadastro(s) duplicado(s) unificado(s)` : "Nenhum duplicado encontrado", "ok");
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

  const criarTagHandler = async (nome, cor) => {
    const criada = await createTag(nome, cor);
    setTagObjetos((ts) => [...ts, criada]);
  };

  const atualizarTagHandler = async (id, nome, cor) => {
    const atualizada = await updateTag(id, nome, cor);
    setTagObjetos((ts) => ts.map((t) => (t.id === id ? atualizada : t)));
  };

  const excluirTagHandler = async (id) => {
    await deleteTag(id);
    setTagObjetos((ts) => ts.filter((t) => t.id !== id));
  };

  const criarCampoHandler = async (campo) => {
    const criado = await createCampoCustomizado(campo);
    setCamposCustomizados((cs) => [...cs, criado]);
  };

  const atualizarCampoHandler = async (id, campo) => {
    const atualizado = await updateCampoCustomizado(id, campo);
    setCamposCustomizados((cs) => cs.map((c) => (c.id === id ? atualizado : c)));
  };

  const excluirCampoHandler = async (id) => {
    await deleteCampoCustomizado(id);
    setCamposCustomizados((cs) => cs.filter((c) => c.id !== id));
  };

  const atualizarColunasHandler = async (colunas) => {
    const atualizadas = await apiSetColunasVisiveis(colunas);
    setColunasVisiveisState(atualizadas);
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
    setView(viewInicialPara(u));
  };

  // ADMIN/GESTOR caem no Painel Executivo (analitico, visao agregada); os
  // demais papeis caem na tela de boas-vindas do dia (saudacao + contadores
  // + botao pra Fila de Trabalho), nao direto no Kanban.
  const viewInicialPara = (u) => (u?.papel === "ADMIN" || u?.papel === "GESTOR" ? "dashboard" : "inicio");

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

  // Deep link da Fila de Trabalho pra conversa de um lead especifico -
  // Conversas.jsx observa conversaParaAbrir e abre o ChatModal sozinho.
  const abrirConversa = (contatoId) => {
    setConversaParaAbrir(contatoId);
    setView("conversas");
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
          {view === "inicio" && <InicioColaborador usuario={usuario} patients={patients} setView={setView} />}
          {view === "filaTrabalho" && <FilaTrabalho patients={patients} colaboradores={colaboradores} onAbrirConversa={abrirConversa} />}
          {view === "pacientes" && <Pacientes patients={patients} tags={tags} onImport={onImport} showToast={showToast} filtroInicial={filtroPacientesInicial} onAbrirPaciente={abrirPaciente} onUnificarDuplicados={unificarDuplicados} usuario={usuario} camposCustomizados={camposCustomizados} colunasVisiveis={colunasVisiveis} onAtualizarColunas={atualizarColunasHandler} />}
          {view === "conversas" && <Conversas patients={patients} showToast={showToast} onAbrirPaciente={abrirPaciente} onAtualizarPaciente={salvarPaciente} onCriarPaciente={criarPacienteAvulso} usuario={usuario} abrirContatoId={conversaParaAbrir} onAbriuContato={() => setConversaParaAbrir(null)} />}
          {view === "segmentacoes" && <Segmentacoes patients={patients} segmentos={segmentos} onCriar={criarSegmentacao} onAtualizar={atualizarSegmentacao} onExcluir={excluirSegmentacao} onArquivar={arquivarSegmentacao} tags={tags} tagObjetos={tagObjetos} onCriarTag={criarTagHandler} onAtualizarTag={atualizarTagHandler} onExcluirTag={excluirTagHandler} camposCustomizados={camposCustomizados} onCriarCampo={criarCampoHandler} onAtualizarCampo={atualizarCampoHandler} onExcluirCampo={excluirCampoHandler} showToast={showToast} />}
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
          tagObjetos={tagObjetos}
          camposCustomizados={camposCustomizados}
          historico={historico}
          onSave={salvarPaciente}
          onClose={() => setPacienteAberto(null)}
        />
      )}
      <span style={s.protoTag}>Sorr.ia · dados salvos no servidor</span>
    </div>
  );
}
