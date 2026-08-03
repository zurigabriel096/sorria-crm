package br.com.sorria.crm.campaign;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

// Esboco inicial de campanhas pedido pelo Samuel (03/08/2026) - cria Template
// (texto) + Campanha (metadados) pra cada publico, todas em status "Rascunho"
// (nunca dispara sozinho - "status" nem trava o disparo de verdade, ver
// CampanhaService.disparar, mas o rotulo deixa claro que e' rascunho pra
// revisao antes de usar). Idempotente por nome (findByNome) - nao duplica se
// rodar de novo num boot seguinte, e nao mexe se o usuario ja editou/renomeou.
//
// "Amigo Indica Amigo" vira DUAS campanhas (variante N3 e variante WIIFM) em
// vez de 1 com A/B automatico de verdade - o mecanismo de split automatico +
// comparacao de performance por variante ainda nao existe no sistema (pedido
// em aberto), entao por enquanto sao 2 campanhas normais que o operador disputa
// manualmente pra comparar depois.
@Component
@RequiredArgsConstructor
public class CampanhaSeedInitializer implements CommandLineRunner {

    private final CampanhaRepository campanhaRepository;
    private final TemplateRepository templateRepository;

    @Override
    public void run(String... args) {
        seed(
                "Prospect",
                "Conversão de prospects",
                "Oi {nome}! 🦷✨ A Orthodontic separou um cuidado especial pro seu sorriso. Quer saber mais? Responda 1 (sim) ou 2 (agora não)."
        );
        seed(
                "Lead Frio",
                "Reengajamento",
                "Oi {nome}! 🤍✨ Faz tempo que não conversamos por aqui. Ainda pensa em cuidar do sorriso? Responda 1 (sim) ou 2 (não agora)."
        );
        seed(
                "Amigo Indica Amigo - N3",
                "Indicação (A/B N3)",
                "Oi {nome}! 🦷✨ Que tal indicar um amigo pra Orthodontic e ganhar benefícios especiais? Responda 1 (sim) ou 2 (depois)."
        );
        seed(
                "Amigo Indica Amigo - WIIFM",
                "Indicação (A/B WIIFM)",
                "Oi {nome}! 🤍✨ Indique um amigo e ganhe desconto na próxima consulta na Orthodontic! Responda 1 (sim) ou 2 (depois)."
        );

        // Correcao pontual (roda 1x, some sozinha do proximo boot em diante): as 4
        // campanhas acima ja tinham sido criadas com o objetivo antigo, mais longo
        // demais pra caber na etiqueta da tela de Campanhas - so corrige se o
        // objetivo ainda for exatamente o texto antigo (nao sobrescreve se o
        // usuario ja tiver editado manualmente).
        encurtarObjetivoSeAindaOriginal("Prospect", "Conversão de prospects em serviços de entrada", "Conversão de prospects");
        encurtarObjetivoSeAindaOriginal("Lead Frio", "Reengajar quem parou de responder", "Reengajamento");
        encurtarObjetivoSeAindaOriginal("Amigo Indica Amigo - N3", "Teste A/B (variante N3) - indicação", "Indicação (A/B N3)");
        encurtarObjetivoSeAindaOriginal("Amigo Indica Amigo - WIIFM", "Teste A/B (variante WIIFM) - indicação", "Indicação (A/B WIIFM)");
    }

    private void seed(String nome, String objetivo, String corpoMensagem) {
        if (campanhaRepository.findByNome(nome).isPresent()) return;

        Template template = templateRepository.findByNome(nome).orElseGet(Template::new);
        template.setNome(nome);
        template.setCampanhaObjetivo(objetivo);
        template.setCorpo(corpoMensagem);
        template.setAtivo(true);
        template = templateRepository.save(template);

        Campanha campanha = new Campanha();
        campanha.setNome(nome);
        campanha.setObjetivo(objetivo);
        campanha.setCanal("WhatsApp");
        campanha.setStatus("Rascunho");
        campanha.setTemplateId(template.getId());
        campanhaRepository.save(campanha);
    }

    private void encurtarObjetivoSeAindaOriginal(String nome, String objetivoAntigo, String objetivoNovo) {
        campanhaRepository.findByNome(nome).ifPresent(campanha -> {
            if (objetivoAntigo.equals(campanha.getObjetivo())) {
                campanha.setObjetivo(objetivoNovo);
                campanhaRepository.save(campanha);
            }
        });
        templateRepository.findByNome(nome).ifPresent(template -> {
            if (objetivoAntigo.equals(template.getCampanhaObjetivo())) {
                template.setCampanhaObjetivo(objetivoNovo);
                templateRepository.save(template);
            }
        });
    }
}
