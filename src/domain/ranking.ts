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

/* ──────────────────────────────────────────── rankings do grupo — F11 ─────────── */

/** Uma captura vista pelo grupo: além de comparável, tem dono e espécie. */
export interface CapturaDeGrupo extends Comparable {
  userId: string;
  speciesId: string | null;
}

export interface Desbloqueio {
  userId: string;
  speciesId: string;
}

export interface Posicao {
  userId: string;
  valor: number;
}

/**
 * Ordena posições do maior para o menor, com empate resolvido pelo id.
 *
 * O desempate não é estético: sem ele a mesma lista muda de ordem entre duas aberturas do app,
 * porque a ordem que veio do servidor não é garantida. Um ranking que dança sozinho parece bug.
 */
function ordenar(mapa: Map<string, number>): Posicao[] {
  return [...mapa.entries()]
    .map(([userId, valor]) => ({ userId, valor }))
    .sort((a, b) => b.valor - a.valor || a.userId.localeCompare(b.userId));
}

/**
 * Ranking de coleção — PRD seção 10.
 *
 * Soma o peso de raridade das espécies desbloqueadas. Existe justamente para que volume não
 * decida: quem só pesca tilápia nunca lidera aqui, e é por isso que o ranking de insígnias
 * (esforço) é um eixo separado.
 *
 * Espécie fora do catálogo vale zero em vez de derrubar a conta — catálogo e histórico podem
 * discordar depois de uma atualização, e um ranking que quebra é pior que um ranking impreciso.
 */
export function rankingDeColecao(
  desbloqueios: readonly Desbloqueio[],
  pontosDaEspecie: (speciesId: string) => number,
): Posicao[] {
  const pontos = new Map<string, number>();
  const vistos = new Set<string>();

  for (const d of desbloqueios) {
    // A mesma espécie duas vezes para o mesmo usuário não pode contar em dobro.
    const chave = `${d.userId}|${d.speciesId}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    pontos.set(d.userId, (pontos.get(d.userId) ?? 0) + pontosDaEspecie(d.speciesId));
  }
  return ordenar(pontos);
}

/** Quantas espécies distintas cada um tem. Acompanha o de coleção, sem substituí-lo. */
export function rankingDeEspecies(desbloqueios: readonly Desbloqueio[]): Posicao[] {
  const porUsuario = new Map<string, Set<string>>();
  for (const d of desbloqueios) {
    const conjunto = porUsuario.get(d.userId) ?? new Set<string>();
    conjunto.add(d.speciesId);
    porUsuario.set(d.userId, conjunto);
  }

  const contagem = new Map<string, number>();
  for (const [userId, conjunto] of porUsuario) contagem.set(userId, conjunto.size);
  return ordenar(contagem);
}

/**
 * Ano e mês de um instante, num fuso dado — como número comparável (`ano * 12 + mês`).
 *
 * O fuso vem de fora porque a data gravada **não o carrega**: `caughtAt` é salvo com
 * `toISOString()`, sempre em UTC. Ler o prefixo `AAAA-MM` da string daria o mês de Greenwich — um
 * peixe fisgado às 23h de 31 de agosto em Brasília está gravado como 1º de setembro às 2h.
 */
export function mesNoFuso(iso: string, fusoMinutos: number): number {
  const d = new Date(Date.parse(iso) + fusoMinutos * 60_000);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

/**
 * Ranking de capturas no mês.
 *
 * O mês é o do fuso informado, que a tela preenche com o do aparelho. Para um grupo regional é o
 * mesmo fuso de quem pescou — e é o único disponível, porque a data gravada perdeu o fuso original
 * ao virar UTC. Se o grupo um dia tiver gente em fusos diferentes, o certo é gravar o deslocamento
 * junto da captura; não dá para reconstruí-lo depois.
 */
export function rankingDoMes(
  capturas: readonly CapturaDeGrupo[],
  referencia: Date,
  fusoMinutos: number,
): Posicao[] {
  const mes = mesNoFuso(referencia.toISOString(), fusoMinutos);
  const contagem = new Map<string, number>();

  for (const c of capturas) {
    if (mesNoFuso(c.caughtAt, fusoMinutos) !== mes) continue;
    contagem.set(c.userId, (contagem.get(c.userId) ?? 0) + 1);
  }
  return ordenar(contagem);
}

/**
 * Maior exemplar de cada espécie no grupo — RN06 e RN07 valem aqui também.
 *
 * Devolve uma captura por espécie, a que ganharia a comparação. Reaproveita `rankCatches`, então
 * a regra de peso contra comprimento é a mesma do recorde pessoal — dois critérios diferentes
 * para a mesma pergunta seria como ter duas réguas.
 */
export function maioresPorEspecie(
  capturas: readonly CapturaDeGrupo[],
): Map<string, CapturaDeGrupo> {
  const porEspecie = new Map<string, CapturaDeGrupo[]>();
  for (const c of capturas) {
    if (!c.speciesId) continue; // "Não identificado" não disputa recorde de espécie (RN12).
    porEspecie.set(c.speciesId, [...(porEspecie.get(c.speciesId) ?? []), c]);
  }

  const melhores = new Map<string, CapturaDeGrupo>();
  for (const [speciesId, lista] of porEspecie) {
    const vencedora = rankCatches(lista)[0];
    if (vencedora) melhores.set(speciesId, vencedora);
  }
  return melhores;
}

