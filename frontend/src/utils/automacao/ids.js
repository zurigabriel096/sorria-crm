// O contador antigo (let proximoId = 1, modulo-level) reinicia do zero a cada
// reload da pagina, entao depois de salvar varios nos e recarregar, o proximo
// "no-1" colidiria com um id ja existente. crypto.randomUUID() (disponivel em
// todo navegador moderno) nao tem esse problema.
export function gerarId(prefixo = "no") {
  return `${prefixo}-${crypto.randomUUID()}`;
}
