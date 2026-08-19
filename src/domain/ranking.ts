/**
 * Comparação de capturas — RN06 e RN07.
 *
 * Vale para o recorde pessoal na Etapa 1 e para o ranking do grupo na Etapa 3. Código puro.
 */

export interface Comparable {
  id: string;
  lengthCm: number;
  /** Peso real informado pelo usuário. `null` quando não foi pesado. */
  weightG: number | null;
  /** ISO 8601 com hora e fuso. */
  caughtAt: string;
}

/**
 * RN06 — ordena por peso quando **todos** os registros comparados têm peso real; caso
 * contrário ordena por comprimento.
 *
 * O "todos" não é detalhe: comparar o peso de um com o comprimento de outro premiaria quem
 * carrega balança, não quem pegou o peixe maior. Comprimento é o critério padrão porque é o
 * único que está sempre lá.
 */
export function shouldRankByWeight(catches: readonly Comparable[]): boolean {
  return catches.length > 0 && catches.every((c) => c.weightG !== null);
}

/**
 * Ordena do maior para o menor. RN07 — no empate, vence o registro mais antigo.
 * Não muta a lista recebida.
 */
export function rankCatches<T extends Comparable>(catches: readonly T[]): T[] {
  const porPeso = shouldRankByWeight(catches);
  return [...catches].sort((a, b) => {
    const va = porPeso ? a.weightG! : a.lengthCm;
    const vb = porPeso ? b.weightG! : b.lengthCm;
    if (va !== vb) return vb - va;
    return Date.parse(a.caughtAt) - Date.parse(b.caughtAt);
  });
}

/** O maior exemplar de um conjunto, pelo critério da RN06. `null` se o conjunto for vazio. */
export function personalBest<T extends Comparable>(catches: readonly T[]): T | null {
  return rankCatches(catches)[0] ?? null;
}
