package br.com.sorria.crm.common.lote;

// Interface OPCIONAL que o resultado de um item de LoteJobService pode
// implementar pra LoteJobStatus contar automaticamente quantos itens foram
// "criados" vs "atualizados" (hoje so a importacao de planilha usa isso -
// ver ContatoService.ResultadoImportacaoLinha, pedido do Samuel 05/08/2026:
// mostrar "Novos"/"Atualizados" no historico de importacoes). Outros tipos
// de lote (tag em lote, excluir, distribuir responsavel) nao implementam -
// os contadores ficam em 0 pra eles, sem custo nem risco.
public interface ContadorCriadoAtualizado {
    boolean isCriado();
}
