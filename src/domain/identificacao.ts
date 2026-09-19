/**
 * O que fazer com as sugestões da IA — SDD 6.3 e 6.5, PRD RN02 e RN03.
 *
 * Código puro. O servidor já valida a resposta do modelo, mas o app confere de novo contra o
 * catálogo que ele próprio tem: a função e o app são publicados em momentos diferentes, e um id
 * que o servidor conhece e o app ainda não viraria carta fantasma no álbum.
 */

export interface Sugestao {
  speciesId: string;
  /** Entre 0 e 1. */
  confianca: number;
  /** O traço visível que o modelo apontou na foto. Pode vir vazio. */
  motivo: string;
}

/** RN03: abaixo disso não há sugestão. Sugestão ruim é pior que nenhuma. */
export const CONFIANCA_MINIMA = 0.4;

/** SDD 6.3: as duas primeiras mais perto que isso, e parecidas entre si, viram dúvida. */
export const DISTANCIA_DE_DUVIDA = 0.15;

export const SUGESTOES_MAX = 3;

export type Apresentacao =
  /** Nada na tela: o seletor manual é o caminho. */
  | { tipo: 'nenhuma' }
  | { tipo: 'lista'; sugestoes: Sugestao[] }
  /** Duas espécies parecidas quase empatadas: lado a lado, sem vencedor. */
  | { tipo: 'duvida'; primeira: Sugestao; segunda: Sugestao; demais: Sugestao[] };

/** Confere a resposta do servidor contra o catálogo do app. */
export function sanearSugestoes(bruto: unknown, existe: (id: string) => boolean): Sugestao[] {
  if (!Array.isArray(bruto)) return [];
  const vistas = new Set<string>();
  const saida: Sugestao[] = [];
  for (const item of bruto) {
    if (!item || typeof item !== 'object') continue;
    const { speciesId, confianca, motivo } = item as Record<string, unknown>;
    if (typeof speciesId !== 'string' || !existe(speciesId) || vistas.has(speciesId)) continue;
    if (typeof confianca !== 'number' || !Number.isFinite(confianca)) continue;
    vistas.add(speciesId);
    saida.push({
      speciesId,
      confianca: Math.min(Math.max(confianca, 0), 1),
      motivo: typeof motivo === 'string' ? motivo.trim() : '',
    });
  }
  return saida.sort((a, b) => b.confianca - a.confianca).slice(0, SUGESTOES_MAX);
}

/**
 * Decide como as sugestões aparecem.
 *
 * A dúvida só vale para pares que o catálogo marca como parecidos (`visuallySimilarTo`). Duas
 * espécies que ninguém confunde empatadas em 45% e 40% é o modelo inseguro, não um caso de
 * "compare os dois" — e aí a lista comum, com a porcentagem à vista, diz a verdade.
 */
export function apresentar(
  sugestoes: readonly Sugestao[],
  parecidasCom: (id: string) => readonly string[],
): Apresentacao {
  const [primeira, segunda, ...demais] = sugestoes;
  if (!primeira || primeira.confianca < CONFIANCA_MINIMA) return { tipo: 'nenhuma' };

  if (
    segunda &&
    primeira.confianca - segunda.confianca < DISTANCIA_DE_DUVIDA &&
    (parecidasCom(primeira.speciesId).includes(segunda.speciesId) ||
      parecidasCom(segunda.speciesId).includes(primeira.speciesId))
  ) {
    return { tipo: 'duvida', primeira, segunda, demais };
  }

  return { tipo: 'lista', sugestoes: [...sugestoes] };
}

/** Porcentagem para a tela: inteira, porque "73,4%" finge uma precisão que o modelo não tem. */
export function porcentagem(confianca: number): string {
  return `${Math.round(confianca * 100)}%`;
}

/**
 * O que fica gravado na captura (coluna `ai_suggestion`), para medir acurácia depois (RN02).
 *
 * Guarda o que foi mostrado, e não só o que o modelo disse: uma sugestão abaixo dos 40% que
 * nunca apareceu não pode contar como "a pessoa recusou a IA".
 */
export interface RegistroDaSugestao {
  v: 1;
  modelo: string;
  exibicao: Apresentacao['tipo'];
  sugestoes: { speciesId: string; confianca: number }[];
}

export function registroDaSugestao(modelo: string, sugestoes: readonly Sugestao[], exibicao: Apresentacao['tipo']): RegistroDaSugestao {
  return {
    v: 1,
    modelo,
    exibicao,
    sugestoes: sugestoes.map((s) => ({ speciesId: s.speciesId, confianca: Math.round(s.confianca * 1000) / 1000 })),
  };
}

/**
 * A pessoa ficou com a primeira sugestão? `null` quando não houve sugestão a aceitar — que é
 * diferente de recusar, e misturar os dois derrubaria a acurácia medida à toa.
 */
export function aceitouPrimeira(registro: RegistroDaSugestao | null, escolhida: string | null): boolean | null {
  if (!registro || registro.exibicao === 'nenhuma') return null;
  const primeira = registro.sugestoes[0];
  if (!primeira) return null;
  return primeira.speciesId === escolhida;
}
