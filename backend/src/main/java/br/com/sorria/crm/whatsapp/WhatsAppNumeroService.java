package br.com.sorria.crm.whatsapp;

import br.com.sorria.crm.whatsapp.dto.WhatsAppNumeroDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WhatsAppNumeroService {

    private final WhatsAppNumeroRepository repository;
    private final EvolutionApiClient evolutionApiClient;

    @Value("${app.backend-url}")
    private String backendUrl;

    public List<WhatsAppNumeroDTO> listar() {
        return repository.findAll().stream().map(this::toDTOComStatus).toList();
    }

    // Antes exigia que o ADMIN ja tivesse criado a instancia na Evolution por
    // fora (curl/Manager) e soubesse o token de cabeca - agora o token e' gerado
    // aqui e a instancia e' criada direto na Evolution (POST /instance/create),
    // com o webhook ja apontando pro numeroId certo. So falta escanear o QR
    // (ver gerarQrCode) - nao muda nada de quem ja tinha numero cadastrado do
    // jeito antigo, esse fluxo so vale pros novos.
    //
    // dto.token() preenchido = instancia JA EXISTE de verdade (ex.: criada
    // manualmente num servidor alternativo, ver dto.servidorUrl()) - so
    // vincula e registra o webhook, sem chamar criarInstancia (que so sabe
    // falar com o GLOBAL_API_KEY do servidor principal). Adicionado 05/08/2026
    // depois de um registro automatico via CommandLineRunner falhar de forma
    // misteriosa so na inicializacao - esse caminho (requisicao HTTP normal,
    // igual toda tela do app) e' o que comprovadamente funciona.
    public WhatsAppNumeroDTO criar(WhatsAppNumeroDTO dto) {
        boolean instanciaJaExiste = dto.token() != null && !dto.token().isBlank();
        boolean aquecimento = "AQUECIMENTO".equals(dto.finalidade());

        if (instanciaJaExiste) {
            WhatsAppNumero numero = new WhatsAppNumero();
            numero.setNome(dto.nome());
            numero.setToken(dto.token());
            numero.setInstancia(dto.instancia() != null && !dto.instancia().isBlank() ? dto.instancia() : dto.nome());
            numero.setServidorUrl(dto.servidorUrl());
            numero.setFinalidade(aquecimento ? "AQUECIMENTO" : "DISPARO");
            if (aquecimento) numero.setAquecimentoIniciadoEm(java.time.LocalDate.now());
            WhatsAppNumero salvo = repository.save(numero);
            String webhookUrl = backendUrl + "/api/whatsapp/webhook?numeroId=" + salvo.getId();
            evolutionApiClient.registrarWebhook(salvo.getToken(), webhookUrl, salvo.getServidorUrl());
            return toDTOComStatus(salvo);
        }

        WhatsAppNumero numero = new WhatsAppNumero();
        numero.setNome(dto.nome());
        numero.setToken(UUID.randomUUID().toString());
        numero.setFinalidade(aquecimento ? "AQUECIMENTO" : "DISPARO");
        if (aquecimento) numero.setAquecimentoIniciadoEm(java.time.LocalDate.now());
        WhatsAppNumero salvo = repository.save(numero);

        String instancia = "SorriaNumero" + salvo.getId();
        try {
            evolutionApiClient.criarInstancia(instancia, salvo.getToken());
        } catch (RuntimeException ex) {
            // Sem instancia de verdade na Evolution, esse registro nao serve pra
            // nada (nunca vai conseguir status/QR) - remove em vez de deixar
            // orfao esperando o ADMIN notar e excluir manualmente.
            repository.deleteById(salvo.getId());
            throw ex;
        }
        salvo.setInstancia(instancia);
        salvo = repository.save(salvo);

        return toDTOComStatus(salvo);
    }

    public void remover(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Número não encontrado: " + id);
        }
        repository.deleteById(id);
    }

    public String gerarQrCode(Long id) {
        WhatsAppNumero numero = buscar(id);
        String webhookUrl = backendUrl + "/api/whatsapp/webhook?numeroId=" + numero.getId();
        return evolutionApiClient.obterQrCode(numero.getToken(), webhookUrl, numero.getServidorUrl());
    }

    public String solicitarPareamento(Long id, String telefone) {
        WhatsAppNumero numero = buscar(id);
        return evolutionApiClient.solicitarPareamento(numero.getToken(), telefone, numero.getServidorUrl());
    }

    public void desconectar(Long id) {
        WhatsAppNumero numero = buscar(id);
        evolutionApiClient.desconectarInstancia(numero.getToken(), numero.getServidorUrl());
    }

    private WhatsAppNumero buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Número não encontrado: " + id));
    }

    private WhatsAppNumeroDTO toDTOComStatus(WhatsAppNumero n) {
        Map<String, Object> status = evolutionApiClient.obterStatus(n.getToken(), n.getServidorUrl());
        boolean conectado = Boolean.TRUE.equals(status.get("connected")) && Boolean.TRUE.equals(status.get("loggedIn"));
        return new WhatsAppNumeroDTO(
                n.getId(), n.getNome(), n.getInstancia(), null, n.getFinalidade(), n.getCriadoEm(),
                conectado, String.valueOf(status.getOrDefault("nome", "")), n.getServidorUrl());
    }
}
