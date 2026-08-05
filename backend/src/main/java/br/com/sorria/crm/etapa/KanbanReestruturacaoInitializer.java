package br.com.sorria.crm.etapa;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

// Reestrutura as 3 colunas originais (Lead/Lead Qualificado/Cliente) pra 8,
// numa jornada de agendamento (pedido explicito do Samuel, 04/08/2026,
// inspirado na estrutura de Kanban da plataforma Kommo):
//
//   Etapa de Leads -> Solicitacao -> Qualificacao -> Em atendimento ->
//   Agendado -> Confirmado -> Nao compareceu -> Comunicacao interna
//
// As 3 originais so RENOMEIAM (via EtapaKanbanService.renomear, que ja
// propaga pra Contato.estagio e pra tag vinculada dos leads existentes - ver
// EtapaKanbanService.renomearReferenciasNosContatos) - nenhum lead perde
// o proprio estagio, so o rotulo da coluna muda. As 5 novas sao criadas do
// zero. @Order(3): depois do seed inicial (1) e do sync de tag (2), pra
// garantir que "Lead"/"Lead Qualificado"/"Cliente" ja existem antes de
// tentar renomear.
//
// So roda UMA VEZ NA VIDA (marcador em KanbanReestruturacaoMarcador) - sem
// isso, se o ADMIN editar essas colunas depois (renomear de volta, excluir),
// um restart do Render desfaria a edicao dele.
@Component
@Order(3)
@RequiredArgsConstructor
@Slf4j
public class KanbanReestruturacaoInitializer implements CommandLineRunner {

    private final EtapaKanbanRepository etapaRepository;
    private final EtapaKanbanService etapaService;
    private final KanbanReestruturacaoMarcadorRepository marcadorRepository;

    // Falha aqui NUNCA pode derrubar o boot inteiro (ver incidente real de
    // 04/08/2026 no RithieliRegistroInitializer) - so loga e tenta de novo no
    // proximo restart (marcador so e' salvo se der certo).
    @Override
    public void run(String... args) {
        if (marcadorRepository.count() > 0) return;
        try {
            renomearSeExistir("Lead", "Etapa de Leads");
            renomearSeExistir("Lead Qualificado", "Qualificação");
            renomearSeExistir("Cliente", "Confirmado");

            criarSeNaoExistir("Solicitação");
            criarSeNaoExistir("Em atendimento");
            criarSeNaoExistir("Agendado");
            criarSeNaoExistir("Não compareceu");
            criarSeNaoExistir("Comunicação interna");

            List<Long> ordemFinal = List.of(
                    idDe("Etapa de Leads"), idDe("Solicitação"), idDe("Qualificação"), idDe("Em atendimento"),
                    idDe("Agendado"), idDe("Confirmado"), idDe("Não compareceu"), idDe("Comunicação interna")
            ).stream().filter(id -> id != null).toList();
            if (!ordemFinal.isEmpty()) etapaService.reordenar(ordemFinal);

            marcadorRepository.save(new KanbanReestruturacaoMarcador());
            log.info("Kanban reestruturado pra jornada de agendamento (8 colunas).");
        } catch (Exception ex) {
            log.error("Falha ao reestruturar o Kanban - nao trava o boot, tenta de novo no proximo restart.", ex);
        }
    }

    private void renomearSeExistir(String nomeAntigo, String novoNome) {
        etapaRepository.findByNome(nomeAntigo).ifPresent(e -> etapaService.renomear(e.getId(), novoNome));
    }

    private void criarSeNaoExistir(String nome) {
        if (etapaRepository.findByNome(nome).isEmpty()) etapaService.criar(nome, null);
    }

    private Long idDe(String nome) {
        return etapaRepository.findByNome(nome).map(EtapaKanban::getId).orElse(null);
    }
}
