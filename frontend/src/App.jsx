import { useEffect, useState } from "react";
import { T } from "./theme";
import { s } from "./styles/s";

import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { Toast } from "./components/ui/Toast";
import { JobsProgress } from "./components/ui/JobsProgress";
import { PatientDetailModal } from "./components/PatientDetailModal";
import { EasterEggJogo } from "./components/ui/EasterEggJogo";

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
import { Aquecimento } from "./pages/Aquecimento";
import { AgenteVirtual } from "./pages/AgenteVirtual";

import { logout as apiLogout } from "./api/auth";
import { listContacts, createContact, updateContact, deleteContact, iniciarImportacaoLote, getImportLoteStatus, unificarDuplicados as apiUnificarDuplicados, aplicarTagEmLote, getTagLoteStatus, excluirContatosEmLote, getExcluirLoteStatus, atribuirResponsavelEmLote, getResponsavelLoteStatus } from "./api/contacts";
import { matchSeg } from "./utils/patients";
import { listCampaigns, createCampaign, updateCampaign, deleteCampaign, archiveCampaign, listTemplates, listDispatchHistory, limparHistoricoDisparo, limparHistoricoProspects } from "./api/campaigns";
import { listColaboradores, createColaborador, updateColaborador, deleteColaborador } from "./api/colaboradores";
import { listPapeisCargo, createPapelCargo, updatePapelCargo, deletePapelCargo } from "./api/papeisCargo";
import { listSegmentacoes, createSegmentacao, updateSegmentacao, deleteSegmentacao, archiveSegmentacao } from "./api/segmentacoes";
import { listTags, createTag, updateTag, deleteTag } from "./api/tags";
import { listObjetivos, createObjetivo, deleteObjetivo } from "./api/objetivos";
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
  const [cliquesEasterEgg, setCliquesEasterEgg] = useState(0);
  const [jogoAberto, setJogoAberto] = useState(false);

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
  const [papeisCargo, setPapeisCargo] = useState([]);
  const [objetivoObjetos, setObjetivoObjetos] = useState([]);
  const objetivos = objetivoObjetos.map((o) => o.nome);

  const [toast, setToast] = useState(null);
  const [jobs, setJobs] = useState([]); // acoes em massa rodando em background (ver JobsProgress)
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
      const [pacientesRes, campanhasRes, templatesRes, historicoRes, colaboradoresRes, papeisCargoRes, segmentosRes, tagsRes, camposRes, colunasRes, objetivosRes, meRes] = await Promise.all([
        listContacts(), listCampaigns(), listTemplates(), listDispatchHistory(), listColaboradores(), listPapeisCargo(), listSegmentacoes(), listTags(),
        listCamposCustomizados(), getColunasVisiveis(), listObjetivos(),
        precisaUsuario ? getMe() : Promise.resolve(usuarioAtual),
      ]);
      setPatients(pacientesRes);
      setCampanhas(campanhasRes);
      setTemplates(templatesRes);
      setHistorico(historicoRes);
      setColaboradores(colaboradoresRes);
      setPapeisCargo(papeisCargoRes);
      setSegmentos(segmentosRes);
      setTagObjetos(tagsRes);
      setCamposCustomizados(camposRes);
      setColunasVisiveisState(colunasRes);
      setObjetivoObjetos(objetivosRes);
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

  // Roda em background no servidor - so inicia o job e devolve na hora, sem
  // travar a tela; o progresso e' acompanhado pelo <JobsProgress> (ver
  // useEffect abaixo), igual tag/excluir em lote. Antes era 1 unica requisicao
  // esperando a planilha inteira processar (sem timeout, sem loading nenhum) -
  // numa base maior isso parecia a tela travada num loop infinito.
  const onImport = async (res) => {
    try {
      const { jobId, total } = await iniciarImportacaoLote(res.pacientes);
      setJobs((js) => [...js, {
        id: jobId, tipo: "import", label: `Importando planilha (${res.pacientes.length} linhas)`,
        total, processados: 0, afetados: 0, concluido: total === 0,
        nomeImportacao: res.nomeImportacao,
      }]);
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
  // "Iniciar conversa" do Kanban e pelo "+ Novo lead" da Base de Leads.
  const criarPacienteAvulso = async (dados) => {
    const criado = await createContact(dados);
    setPatients((ps) => [criado, ...ps]);
    return criado;
  };

  // Excluir lead manualmente pela Base de Leads - restrito a ADMIN na tela.
  const excluirPaciente = async (id) => {
    await deleteContact(id);
    setPatients((ps) => ps.filter((p) => p.id !== id));
  };

  // Limpeza de duplicados (mesmo telefone) que já existiam antes da trava de
  // criação existir - mescla e recarrega a lista com o resultado.
  const unificarDuplicados = async () => {
    const { unificados } = await apiUnificarDuplicados();
    const pacientesAtualizados = await listContacts();
    setPatients(pacientesAtualizados);
    showToast(unificados > 0 ? `${unificados} cadastro(s) duplicado(s) unificado(s)` : "Nenhum duplicado encontrado", "ok");
  };

  // Aplica uma tag em massa em todo mundo que uma Segmentacao captura hoje
  // (mesmos leads que a contagem "Captura agora: N leads" mostra). Roda em
  // background no servidor - so inicia o job e devolve na hora, sem travar a
  // tela; o progresso e' acompanhado pelo <JobsProgress> (ver useEffect abaixo).
  const aplicarTagSegmentacao = async (seg, tag, remover) => {
    const ids = patients.filter((p) => matchSeg(p, seg)).map((p) => p.id);
    const { jobId, total } = await aplicarTagEmLote(ids, tag, remover);
    setJobs((js) => [...js, {
      id: jobId, tipo: "tag", label: `${remover ? "Removendo" : "Adicionando"} tag "${tag}"`,
      total, processados: 0, afetados: 0, concluido: total === 0,
    }]);
  };

  // Exclui em massa todo mundo que uma Segmentacao captura hoje - mesma
  // infraestrutura de job em background da tag em lote.
  const excluirLeadsSegmentacao = async (seg) => {
    const ids = patients.filter((p) => matchSeg(p, seg)).map((p) => p.id);
    const { jobId, total } = await excluirContatosEmLote(ids);
    setJobs((js) => [...js, {
      id: jobId, tipo: "excluir", label: `Excluindo leads de "${seg.nome}"`,
      total, processados: 0, afetados: 0, concluido: total === 0,
    }]);
  };

  // Distribui em massa todo mundo que uma Segmentacao captura hoje entre os
  // colaboradores escolhidos - aleatorio e equilibrado (ver
  // ContatoController.atribuirResponsavelEmLote), mesma infraestrutura de job
  // em background da tag em lote.
  const atribuirResponsavelSegmentacao = async (seg, colaboradorIds) => {
    const ids = patients.filter((p) => matchSeg(p, seg)).map((p) => p.id);
    const { jobId, total } = await atribuirResponsavelEmLote(ids, colaboradorIds);
    setJobs((js) => [...js, {
      id: jobId, tipo: "responsavel", label: `Distribuindo ${ids.length} lead(s) de "${seg.nome}" entre ${colaboradorIds.length} colaborador(es)`,
      total, processados: 0, afetados: 0, concluido: total === 0,
    }]);
  };

  // Consulta o progresso de todo job em massa ainda rodando a cada 1.2s -
  // quando termina, recarrega a lista de contatos e deixa a barra com
  // "Concluído" ate o usuario fechar (nao some sozinha, pra dar tempo de ver
  // o resultado mesmo se a pessoa nao tiver olhando).
  useEffect(() => {
    const emAndamento = jobs.filter((j) => !j.concluido);
    if (!emAndamento.length) return;
    const t = setInterval(() => {
      emAndamento.forEach(async (j) => {
        try {
          const s = await (
            j.tipo === "excluir" ? getExcluirLoteStatus(j.id)
            : j.tipo === "import" ? getImportLoteStatus(j.id)
            : j.tipo === "responsavel" ? getResponsavelLoteStatus(j.id)
            : getTagLoteStatus(j.id)
          );
          setJobs((js) => js.map((x) => (x.id === j.id ? { ...x, processados: s.processados, afetados: s.afetados, concluido: s.concluido } : x)));
          if (s.concluido) {
            listContacts().then(setPatients);
            // Importacao com titulo preenchido (ver ImportMappingModal) vira
            // segmentacao de verdade, travada nos ids que essa leva realmente
            // afetou (s.resultados) - facilita reaproveitar o fluxo depois
            // (disparo, tag em lote etc.) sem precisar recriar o filtro.
            if (j.tipo === "import" && j.nomeImportacao && s.resultados?.length) {
              criarSegmentacao({
                nome: j.nomeImportacao,
                groups: [[{ field: "id", op: "in", value: s.resultados }]],
                origem: "IMPORTACAO",
              })
                .then(() => showToast(`Segmentação "${j.nomeImportacao}" criada (aba Importações)`, "ok"))
                .catch(() => showToast(`Importação concluída, mas não consegui criar a segmentação "${j.nomeImportacao}"`, "warn"));
            }
          }
        } catch {
          setJobs((js) => js.filter((x) => x.id !== j.id));
        }
      });
    }, 1200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

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

  // Limpeza manual pedida pelo usuario (base era so teste) - irreversivel,
  // por isso HistoricoDisparos.jsx exige frase de confirmacao digitada antes
  // de chamar isso. Limpa CRM + prospects juntos ("todo historico de disparo").
  const limparTodoHistoricoDisparo = async () => {
    await Promise.all([limparHistoricoDisparo(), limparHistoricoProspects()]);
    setHistorico([]);
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

  const criarPapelCargoHandler = async (dados) => {
    const criado = await createPapelCargo(dados);
    setPapeisCargo((ps) => [...ps, criado]);
  };

  const atualizarPapelCargoHandler = async (id, dados) => {
    const atualizado = await updatePapelCargo(id, dados);
    setPapeisCargo((ps) => ps.map((p) => (p.id === id ? atualizado : p)));
  };

  const excluirPapelCargoHandler = async (id) => {
    await deletePapelCargo(id);
    setPapeisCargo((ps) => ps.filter((p) => p.id !== id));
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

  const criarObjetivoHandler = async (nome) => {
    const criado = await createObjetivo(nome);
    setObjetivoObjetos((os) => [...os, criado]);
    return criado;
  };

  const excluirObjetivoHandler = async (id) => {
    await deleteObjetivo(id);
    setObjetivoObjetos((os) => os.filter((o) => o.id !== id));
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

  // Aceita tanto o formato antigo (string = filtro de elegibilidade, ex.:
  // "Elegíveis") quanto o novo ({campo, valor} - clique num valor de card
  // personalizado do Painel, ver Dashboard.jsx) - Pacientes.jsx sabe aplicar
  // os dois.
  const irParaPacientes = (filtro) => {
    if (typeof filtro === "string") setFiltroPacientesInicial({ eleg: filtro });
    else setFiltroPacientesInicial(filtro || null);
    setView("pacientes");
  };

  // Deep link da Fila de Trabalho pra conversa de um lead especifico -
  // Conversas.jsx observa conversaParaAbrir e abre o ChatModal sozinho.
  const abrirConversa = (contatoId) => {
    setConversaParaAbrir(contatoId);
    setView("conversas");
  };

  // Easter egg: 10 cliques no selo "dados salvos no servidor" abre o joguinho.
  const cliqueSeloProto = () => {
    const n = cliquesEasterEgg + 1;
    if (n >= 10) { setCliquesEasterEgg(0); setJogoAberto(true); }
    else setCliquesEasterEgg(n);
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
      <Sidebar view={view} setView={setView} collapsed={collapsed} setCollapsed={setCollapsed} angry={angry} setAngry={setAngry} usuario={usuario} />
      <div style={s.main}>
        <Topbar view={view} usuario={usuario} papeisCargo={papeisCargo} onAvatarUploaded={setUsuario} avatarColor={avatarColor} setAvatarColor={mudarCorPerfil} sistemaAtivo={sistemaAtivo} onReportarProblema={() => setView("suporte")} onLogout={onLogout} showToast={showToast} />
        <div style={s.content} key={view}>
          {view === "dashboard" && <Dashboard patients={patients} historico={historico} onImport={onImport} showToast={showToast} setView={setView} irParaPacientes={irParaPacientes} usuario={usuario} camposCustomizados={camposCustomizados} onCriarCampo={criarCampoHandler} tags={tags} tagObjetos={tagObjetos} onCriarTag={criarTagHandler} />}
          {view === "inicio" && <InicioColaborador usuario={usuario} patients={patients} setView={setView} />}
          {view === "filaTrabalho" && <FilaTrabalho patients={patients} colaboradores={colaboradores} onAbrirConversa={abrirConversa} />}
          {view === "pacientes" && <Pacientes patients={patients} tags={tags} tagObjetos={tagObjetos} onCriarTag={criarTagHandler} onImport={onImport} showToast={showToast} filtroInicial={filtroPacientesInicial} onAbrirPaciente={abrirPaciente} onUnificarDuplicados={unificarDuplicados} usuario={usuario} camposCustomizados={camposCustomizados} onCriarCampo={criarCampoHandler} onAtualizarCampo={atualizarCampoHandler} onExcluirCampo={excluirCampoHandler} colunasVisiveis={colunasVisiveis} onAtualizarColunas={atualizarColunasHandler} onCriarPaciente={criarPacienteAvulso} onExcluirPaciente={excluirPaciente} />}
          {view === "conversas" && <Conversas patients={patients} showToast={showToast} onAbrirPaciente={abrirPaciente} onAtualizarPaciente={salvarPaciente} onCriarPaciente={criarPacienteAvulso} usuario={usuario} abrirContatoId={conversaParaAbrir} onAbriuContato={() => setConversaParaAbrir(null)} />}
          {view === "segmentacoes" && <Segmentacoes patients={patients} segmentos={segmentos} onCriar={criarSegmentacao} onAtualizar={atualizarSegmentacao} onExcluir={excluirSegmentacao} onArquivar={arquivarSegmentacao} tags={tags} tagObjetos={tagObjetos} onCriarTag={criarTagHandler} onAtualizarTag={atualizarTagHandler} onExcluirTag={excluirTagHandler} camposCustomizados={camposCustomizados} onAplicarTagEmLote={aplicarTagSegmentacao} onExcluirLeadsEmLote={excluirLeadsSegmentacao} colaboradores={colaboradores} onAtribuirResponsavelEmLote={atribuirResponsavelSegmentacao} usuario={usuario} onAbrirPaciente={abrirPaciente} showToast={showToast} />}
          {view === "campanhas" && <Campanhas campanhas={campanhas} onCriarCampanha={criarCampanha} onAtualizarCampanha={atualizarCampanha} onExcluirCampanha={excluirCampanha} onArquivarCampanha={arquivarCampanha} templates={templates} objetivos={objetivos} onCriarObjetivo={criarObjetivoHandler} objetivoObjetos={objetivoObjetos} onExcluirObjetivo={excluirObjetivoHandler} segmentos={segmentos} patients={patients} usuario={usuario} onDisparar={(c) => { setDisparoCampanha(c); setView("disparo"); }} showToast={showToast} />}
          {view === "templates" && <Templates templates={templates} setTemplates={setTemplates} objetivos={objetivos} onCriarObjetivo={criarObjetivoHandler} objetivoObjetos={objetivoObjetos} onExcluirObjetivo={excluirObjetivoHandler} usuario={usuario} camposCustomizados={camposCustomizados} showToast={showToast} />}
          {view === "automacoes" && <Automacoes showToast={showToast} usuario={usuario} patients={patients} camposCustomizados={camposCustomizados} />}
          {view === "disparo" && <DisparoFlow campanha={disparoCampanha} patients={patients} templates={templates} segmentos={segmentos} historico={historico} onFinish={finalizarDisparo} onCancel={() => setView("campanhas")} showToast={showToast} />}
          {view === "disparos" && <HistoricoDisparos historico={historico} patients={patients} onAbrirPaciente={abrirPaciente} usuario={usuario} onLimparHistorico={limparTodoHistoricoDisparo} showToast={showToast} />}
          {view === "colaboradores" && <Colaboradores colaboradores={colaboradores} onCriar={criarColaborador} onAtualizar={atualizarColaborador} onExcluir={excluirColaborador} usuario={usuario} showToast={showToast} papeisCargo={papeisCargo} onCriarPapelCargo={criarPapelCargoHandler} onAtualizarPapelCargo={atualizarPapelCargoHandler} onExcluirPapelCargo={excluirPapelCargoHandler} />}
          {view === "plano" && <Plano showToast={showToast} usuario={usuario} />}
          {view === "suporte" && <Suporte showToast={showToast} />}
          {view === "config" && <Config showToast={showToast} usuario={usuario} />}
          {view === "aquecimento" && <Aquecimento showToast={showToast} usuario={usuario} />}
          {view === "agenteVirtual" && <AgenteVirtual showToast={showToast} usuario={usuario} />}
        </div>
      </div>
      {toast && <Toast toast={toast} />}
      <JobsProgress jobs={jobs} onDismiss={(id) => setJobs((js) => js.filter((j) => j.id !== id))} />
      {pacienteAberto && (
        <PatientDetailModal
          paciente={pacienteAberto.paciente}
          abaInicial={pacienteAberto.aba}
          tags={tags}
          tagObjetos={tagObjetos}
          camposCustomizados={camposCustomizados}
          historico={historico}
          usuario={usuario}
          onSave={salvarPaciente}
          onClose={() => setPacienteAberto(null)}
        />
      )}
      {jogoAberto && <EasterEggJogo onClose={() => setJogoAberto(false)} />}
      <span style={{ ...s.protoTag, cursor: "pointer" }} onClick={cliqueSeloProto}>Sorr.ia · dados salvos no servidor</span>
    </div>
  );
}
