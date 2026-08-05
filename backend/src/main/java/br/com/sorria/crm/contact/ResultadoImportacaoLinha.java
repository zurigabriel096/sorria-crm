package br.com.sorria.crm.contact;

import br.com.sorria.crm.common.lote.ContadorCriadoAtualizado;

// Resultado de UMA linha de importacao de planilha (ver ContatoService.importarLinha).
// Alem do id do Contato resultante (ja usado por "Importações" em
// Segmentacoes.jsx pra criar a segmentacao da leva - ver
// ContatoController.statusImportacaoDTO), agora tambem diz se essa linha
// CRIOU um lead novo ou ATUALIZOU (mesclou num) que ja existia - pedido do
// Samuel (05/08/2026): mostrar "Novos"/"Atualizados" no historico de
// importacoes.
public record ResultadoImportacaoLinha(Long id, boolean criado) implements ContadorCriadoAtualizado {
    @Override
    public boolean isCriado() {
        return criado;
    }
}
