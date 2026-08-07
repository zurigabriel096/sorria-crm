package br.com.sorria.crm.desempenho;

// Recorte real de desempenho de 1 colaborador pra aba "Equipe" do Painel
// Executivo - tudo calculado a partir de dados que ja existem (Contato.responsavelId/
// estagio/proximaAcaoEm, Mensagem.enviadoPorUsuarioId), nada inventado.
public record DesempenhoColaboradorDTO(
        Long colaboradorId,
        String nome,
        String corPerfil,
        String avatarUrl,
        long atendimentos,
        long convertidos,
        long respondidas,
        long vencidos
) {
}
