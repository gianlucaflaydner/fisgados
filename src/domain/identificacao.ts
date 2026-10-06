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

/** A estimativa de tamanho pela foto. Sempre com a referência que o modelo diz ter usado. */
export interface MedidaEstimada {
  cmMin: number;
  cmMax: number;
  referencia: string;
  confianca: number;
}

/** RN03: abaixo disso não há sugestão. Sugestão ruim é pior que nenhuma. */
export const CONFIANCA_MINIMA = 0.4;

/**
 * Faixa mais larga que isso não é estimativa, é chute.
 *
 * "Entre 20 e 60 cm" não ajuda quem está com o peixe na mão: o que ele faz com isso? O limite é
 * o dobro — "entre 30 e 55" passa, "entre 20 e 60" não aparece.
 */
export const LARGURA_MAXIMA_DA_FAIXA = 2;

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

/**
 * A estimativa de tamanho vale a tela? — e qual número oferecer.
 *
 * Três filtros, e qualquer um derruba a estimativa inteira: referência nomeada (sem objeto de
 * tamanho conhecido na foto não existe medida, só palpite), confiança mínima igual à da espécie
 * (RN03) e faixa estreita o bastante para servir de algo.
 *
 * O valor oferecido é o meio da faixa, arredondado. A faixa continua à vista na tela: o número
 * redondo é para a pessoa tocar, a faixa é para ela saber o quanto aquilo é um chute.
 *
 * `faixaDaEspecie` entra quando a espécie já está escolhida. O catálogo sabe que traíra não passa
 * de 100 cm; uma estimativa de 180 cm de traíra é erro de leitura da foto, e some.
 */
export type Estimativa =
  | { tipo: 'nenhuma' }
  | { tipo: 'faixa'; cmMin: number; cmMax: number; sugerido: number; referencia: string };

export function estimativaDeMedida(
  medida: MedidaEstimada | null,
  faixaDaEspecie?: { minLengthCm: number; maxLengthCm: number },
): Estimativa {
  if (!medida) return { tipo: 'nenhuma' };
  if (medida.referencia.trim().length === 0) return { tipo: 'nenhuma' };
  if (medida.confianca < CONFIANCA_MINIMA) return { tipo: 'nenhuma' };
  if (medida.cmMin <= 0 || medida.cmMax < medida.cmMin) return { tipo: 'nenhuma' };
  if (medida.cmMax / medida.cmMin > LARGURA_MAXIMA_DA_FAIXA) return { tipo: 'nenhuma' };

  const meio = (medida.cmMin + medida.cmMax) / 2;
  if (faixaDaEspecie) {
    // Uma folga de 20% acima do máximo do catálogo: a faixa é regional e o peixe da vida de
    // alguém pode passar dela. O que não pode é o dobro.
    if (meio < faixaDaEspecie.minLengthCm * 0.8 || meio > faixaDaEspecie.maxLengthCm * 1.2) {
      return { tipo: 'nenhuma' };
    }
  }

  return {
    tipo: 'faixa',
    cmMin: medida.cmMin,
    cmMax: medida.cmMax,
    sugerido: Math.round(meio),
    referencia: medida.referencia,
  };
}

/** Confere a estimativa que veio do servidor. Mesma regra do servidor, repetida de propósito. */
export function sanearMedidaEstimada(bruto: unknown): MedidaEstimada | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const { cmMin, cmMax, referencia, confianca } = bruto as Record<string, unknown>;
  if (typeof cmMin !== 'number' || typeof cmMax !== 'number') return null;
  if (typeof referencia !== 'string' || typeof confianca !== 'number') return null;
  if (![cmMin, cmMax, confianca].every(Number.isFinite)) return null;
  return { cmMin, cmMax, referencia: referencia.trim(), confianca: Math.min(Math.max(confianca, 0), 1) };
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
  /** A estimativa de tamanho que apareceu na tela, quando apareceu. */
  medida?: { cmMin: number; cmMax: number; referencia: string };
  /**
   * A medida salva veio da estimativa?
   *
   * Importa mais do que parece: é o que permite, depois, separar o recorde medido na régua do
   * recorde que saiu de um palpite aceito com uma tocada — e decidir se o ranking devia ou não
   * misturar os dois (RN06, RN21).
   */
  medidaAceita?: boolean;
}

export function registroDaSugestao(
  modelo: string,
  sugestoes: readonly Sugestao[],
  exibicao: Apresentacao['tipo'],
  medida?: { estimativa: Estimativa; cmSalvo: number },
): RegistroDaSugestao {
  const registro: RegistroDaSugestao = {
    v: 1,
    modelo,
    exibicao,
    sugestoes: sugestoes.map((s) => ({ speciesId: s.speciesId, confianca: Math.round(s.confianca * 1000) / 1000 })),
  };

  if (medida && medida.estimativa.tipo === 'faixa') {
    const { cmMin, cmMax, referencia, sugerido } = medida.estimativa;
    registro.medida = { cmMin, cmMax, referencia };
    registro.medidaAceita = medida.cmSalvo === sugerido;
  }

  return registro;
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
