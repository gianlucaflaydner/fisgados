/**
 * Código de convite — F10.
 *
 * Amigo entra por link, nunca por busca de nome ou telefone (decisão explícita do PRD 7.4). O
 * código é a única porta, então precisa ser curto o bastante para caber num link e ser lido em
 * voz alta, e ambíguo em nada.
 *
 * Código puro: gerar e validar não dependem de rede nem de banco.
 */

/**
 * Alfabeto sem caracteres que se confundem.
 *
 * Fora: `0` e `O`, `1` e `I` e `L`. Um código lido por telefone no meio de uma pescaria não pode
 * depender de a pessoa distinguir zero de ó. Sobram 31 símbolos.
 */
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** Seis símbolos em 31 dão ~887 milhões de combinações — folgado para 5 a 20 amigos. */
export const TAMANHO_CODIGO = 6;

/**
 * Gera um código novo.
 *
 * `aleatorio` é injetável porque um gerador que sorteia por conta própria não tem como ser
 * testado — e é justamente o viés dele que produziria colisão em grupo pequeno.
 */
export function gerarCodigoConvite(aleatorio: () => number = Math.random): string {
  let codigo = '';
  for (let i = 0; i < TAMANHO_CODIGO; i++) {
    const indice = Math.min(ALFABETO.length - 1, Math.floor(aleatorio() * ALFABETO.length));
    codigo += ALFABETO[indice];
  }
  return codigo;
}

/**
 * Normaliza o que a pessoa digitou: maiúsculas, sem espaço nem hífen.
 *
 * Só isso, de propósito. Seria tentador "consertar" um `O` para `0`, mas nenhum dos dois está no
 * alfabeto — corrigir um por outro transformaria um erro de digitação em **outro código válido**,
 * que é pior do que recusar. A ambiguidade foi resolvida na geração, não aqui.
 */
export function normalizarCodigo(entrada: string): string {
  return entrada.trim().toUpperCase().replace(/[\s-]/g, '');
}

/** O código tem o formato certo? Confere antes de gastar uma ida ao servidor. */
export function codigoValido(codigo: string): boolean {
  const c = normalizarCodigo(codigo);
  return c.length === TAMANHO_CODIGO && [...c].every((ch) => ALFABETO.includes(ch));
}
