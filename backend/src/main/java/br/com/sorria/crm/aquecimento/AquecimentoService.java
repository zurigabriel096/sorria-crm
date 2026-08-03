package br.com.sorria.crm.aquecimento;

import br.com.sorria.crm.aquecimento.dto.AquecimentoConfigDTO;
import br.com.sorria.crm.aquecimento.dto.AquecimentoStatusDTO;
import br.com.sorria.crm.whatsapp.EvolutionApiClient;
import br.com.sorria.crm.whatsapp.WhatsAppNumero;
import br.com.sorria.crm.whatsapp.WhatsAppNumeroRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

// "Sorr.ia Protect" - troca mensagens de verdade entre numeros marcados como
// finalidade=AQUECIMENTO (nunca com lead real), numa curva de volume que
// cresce devagar dia a dia, pra parecer uso humano em vez de rajada de bot.
// NAO promete "anti-ban" nem garante nada - reduz risco, nao elimina (ver
// aviso na tela do Sorr.ia Protect). Desligado por padrao - ver
// AquecimentoConfig.ativo.
//
// Escopo desta v1, de proposito menor do que dava pra fazer: nao simula
// "lida" (markread) nem "gravando audio" - so "digitando" (composing) antes
// de mandar texto. Adicionar depois se fizer diferenca de verdade.
@Service
@RequiredArgsConstructor
@Slf4j
public class AquecimentoService {

    private static final List<String> MENSAGENS_FILLER = List.of(
            "Oi! Tudo certo?",
            "Bom dia! Como você está?",
            "Ei, só passando pra dar um alô 🙂",
            "Tudo tranquilo por aí?",
            "Oi! Espero que esteja tudo bem com você.",
            "E aí, novidades?",
            "Boa tarde! Tudo em ordem?",
            "Olá! Só confirmando que está tudo certo por aqui.",
            "Oi, tudo bem? Faz tempo que a gente não troca uma mensagem.",
            "Bom dia! Desejo um ótimo dia pra você."
    );

    private final WhatsAppNumeroRepository numeroRepository;
    private final AquecimentoConfigRepository configRepository;
    private final AquecimentoEnvioRepository envioRepository;
    private final EvolutionApiClient evolutionApiClient;

    public AquecimentoConfigDTO obterConfig() {
        return toDTO(buscarOuCriarConfig());
    }

    public AquecimentoConfigDTO atualizarConfig(AquecimentoConfigDTO dto) {
        AquecimentoConfig config = buscarOuCriarConfig();
        config.setAtivo(dto.ativo());
        config.setMensagensDiaInicial(Math.max(1, dto.mensagensDiaInicial()));
        config.setIncrementoDiario(Math.max(0, dto.incrementoDiario()));
        config.setMensagensDiaMaximo(Math.max(config.getMensagensDiaInicial(), dto.mensagensDiaMaximo()));
        config.setDiasAquecimento(Math.max(1, dto.diasAquecimento()));
        // Minimo de 60s mesmo se alguem tentar configurar mais baixo por API
        // direto (nao so pela tela) - abaixo disso e' "padrao detectavel"
        // (ver aviso na tela do Sorr.ia Protect).
        config.setIntervaloMinSegundos(Math.max(60, dto.intervaloMinSegundos()));
        config.setIntervaloMaxSegundos(Math.max(config.getIntervaloMinSegundos(), dto.intervaloMaxSegundos()));
        config.setModoDinamico(dto.modoDinamico());
        return toDTO(configRepository.save(config));
    }

    public List<AquecimentoStatusDTO> obterStatus() {
        AquecimentoConfig config = buscarOuCriarConfig();
        return numeroRepository.findByFinalidade("AQUECIMENTO").stream().map(n -> {
            Map<String, Object> status = evolutionApiClient.obterStatus(n.getToken());
            boolean conectado = Boolean.TRUE.equals(status.get("connected")) && Boolean.TRUE.equals(status.get("loggedIn"));
            Integer dia = n.getAquecimentoIniciadoEm() != null
                    ? (int) ChronoUnit.DAYS.between(n.getAquecimentoIniciadoEm(), LocalDate.now()) + 1
                    : null;
            return new AquecimentoStatusDTO(n.getId(), n.getNome(), conectado, dia, calcularMetaDiaria(n, config),
                    contarEnviosHoje(n.getId()), n.getProximoEnvioAquecimentoEm());
        }).toList();
    }

    // Chamado pelo AquecimentoScheduler a cada 1 min - se a chave-mestra
    // estiver desligada, nao consulta nem manda nada (ver AquecimentoConfig.ativo).
    // Cada numero tem seu PROPRIO relogio (proximoEnvioAquecimentoEm) -
    // manda de novo so quando esse horario passar, e sorteia (modo dinamico)
    // ou fixa o proximo intervalo dentro da faixa configurada (padrao 3-4min)
    // pra nao criar um padrao fixo e repetitivo, facil de detectar como bot.
    public void executarCiclo() {
        AquecimentoConfig config = buscarOuCriarConfig();
        if (!config.isAtivo()) return;

        List<WhatsAppNumero> numeros = numeroRepository.findByFinalidade("AQUECIMENTO");
        if (numeros.size() < 2) {
            log.info("Sorr.ia Protect ativo, mas precisa de pelo menos 2 numeros de aquecimento cadastrados (tem {}).", numeros.size());
            return;
        }

        Map<String, String> tokenParaTelefone = mapearTokenParaTelefone();
        LocalDateTime agora = LocalDateTime.now();

        for (WhatsAppNumero origem : numeros) {
            if (origem.getAquecimentoIniciadoEm() == null) continue;
            if (origem.getProximoEnvioAquecimentoEm() != null && agora.isBefore(origem.getProximoEnvioAquecimentoEm())) continue;
            if (contarEnviosHoje(origem.getId()) >= calcularMetaDiaria(origem, config)) continue;

            String telefoneOrigem = tokenParaTelefone.get(origem.getToken());
            if (telefoneOrigem == null) continue; // numero nao conectado agora

            List<WhatsAppNumero> candidatos = numeros.stream()
                    .filter(n -> !n.getId().equals(origem.getId()))
                    .filter(n -> tokenParaTelefone.get(n.getToken()) != null)
                    .toList();
            if (candidatos.isEmpty()) continue;

            WhatsAppNumero destino = candidatos.get(ThreadLocalRandom.current().nextInt(candidatos.size()));
            String telefoneDestino = tokenParaTelefone.get(destino.getToken());
            String mensagem = MENSAGENS_FILLER.get(ThreadLocalRandom.current().nextInt(MENSAGENS_FILLER.size()));

            evolutionApiClient.simularDigitando(origem.getToken(), telefoneDestino, 1500 + ThreadLocalRandom.current().nextInt(2000));
            String status = evolutionApiClient.enviarMensagem(telefoneDestino, mensagem, origem.getToken());

            AquecimentoEnvio envio = new AquecimentoEnvio();
            envio.setNumeroOrigemId(origem.getId());
            envio.setNumeroDestinoId(destino.getId());
            envio.setStatus(status);
            envioRepository.save(envio);

            origem.setProximoEnvioAquecimentoEm(agora.plusSeconds(proximoIntervaloSegundos(config)));
            numeroRepository.save(origem);
        }
    }

    private int proximoIntervaloSegundos(AquecimentoConfig config) {
        if (!config.isModoDinamico()) return config.getIntervaloMinSegundos();
        int min = Math.min(config.getIntervaloMinSegundos(), config.getIntervaloMaxSegundos());
        int max = Math.max(config.getIntervaloMinSegundos(), config.getIntervaloMaxSegundos());
        return min == max ? min : ThreadLocalRandom.current().nextInt(min, max + 1);
    }

    private Map<String, String> mapearTokenParaTelefone() {
        Map<String, String> mapa = new HashMap<>();
        for (Map<String, Object> instancia : evolutionApiClient.listarInstancias()) {
            String token = String.valueOf(instancia.getOrDefault("token", ""));
            String telefone = EvolutionApiClient.jidParaTelefone(String.valueOf(instancia.getOrDefault("jid", "")));
            if (!token.isBlank() && telefone != null) mapa.put(token, telefone);
        }
        return mapa;
    }

    private int calcularMetaDiaria(WhatsAppNumero numero, AquecimentoConfig config) {
        if (numero.getAquecimentoIniciadoEm() == null) return config.getMensagensDiaInicial();
        long dia = ChronoUnit.DAYS.between(numero.getAquecimentoIniciadoEm(), LocalDate.now());
        int meta = config.getMensagensDiaInicial() + (int) (Math.min(dia, config.getDiasAquecimento()) * config.getIncrementoDiario());
        return Math.min(meta, config.getMensagensDiaMaximo());
    }

    private long contarEnviosHoje(Long numeroId) {
        LocalDateTime inicioDoDia = LocalDate.now().atStartOfDay();
        return envioRepository.countByNumeroOrigemIdAndCriadoEmAfter(numeroId, inicioDoDia);
    }

    private AquecimentoConfig buscarOuCriarConfig() {
        return configRepository.findAll().stream().findFirst().orElseGet(() -> configRepository.save(new AquecimentoConfig()));
    }

    private AquecimentoConfigDTO toDTO(AquecimentoConfig c) {
        return new AquecimentoConfigDTO(c.getId(), c.isAtivo(), c.getMensagensDiaInicial(), c.getIncrementoDiario(),
                c.getMensagensDiaMaximo(), c.getDiasAquecimento(), c.getIntervaloMinSegundos(), c.getIntervaloMaxSegundos(), c.isModoDinamico());
    }
}
