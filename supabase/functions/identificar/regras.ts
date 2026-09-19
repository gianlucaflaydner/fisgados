/**
 * Regras da identificação no servidor: o prompt, o esquema de resposta e a validação.
 *
 * Código puro, sem Deno e sem rede, para ser testado junto com o domínio do app
 * (`npm test`). A Edge Function em `index.ts` só cuida de autenticar, contar e chamar o modelo.
 */

export interface EspecieDaLista {
  id: string;
  nome: string;
  cientifico: string;
  variedade: string | null;
  apelidos: string[];
}

export interface Sugestao {
  speciesId: string;
  /** Entre 0 e 1. */
  confianca: number;
  /** O traço visível que o modelo apontou. Pode vir vazio. */
  motivo: string;
}

export const SUGESTOES_MAX = 3;
const MOTIVO_MAX = 140;

/**
 * O prompt — SDD 6.2: **nunca** identificar em aberto, sempre escolher dentro da lista.
 *
 * O motivo é pedido como traço visível na foto porque é ele que aparece na tela quando duas
 * espécies parecidas empatam (SDD 6.3). Um motivo genérico ("é um peixe de água doce") não ensina
 * nada a quem está com o peixe na mão.
 */
export function montarPrompt(lista: readonly EspecieDaLista[]): string {
  const linhas = lista.map((e) => {
    const extras = [e.variedade ? `variedade ${e.variedade}` : null, e.apelidos.length ? `também ${e.apelidos.join(', ')}` : null]
      .filter(Boolean)
      .join('; ');
    return `${e.id} | ${e.nome} | ${e.cientifico}${extras ? ` | ${extras}` : ''}`;
  });

  return [
    'Você identifica peixes na foto de um pescador amador do Sul do Brasil.',
    'Escolha SOMENTE entre as espécies da lista abaixo, pelo id. Nunca responda uma espécie fora dela.',
    `Devolva até ${SUGESTOES_MAX} candidatos, do mais provável ao menos provável.`,
    'confianca vai de 0 a 1, e a soma das confianças não passa de 1.',
    'motivo: em português, até 90 caracteres, o traço VISÍVEL NESTA FOTO que sustenta a escolha',
    '(mancha, formato da boca, nadadeira, cor, barbilhão). Não cite traço que não aparece na foto.',
    'Se a foto não mostrar um peixe, ou o peixe não estiver na lista, devolva candidatos vazio.',
    '',
    'id | nome popular | nome científico | observações',
    ...linhas,
  ].join('\n');
}

/**
 * Esquema de saída estruturada da Gemini. O `enum` fecha a lista também do lado do modelo —
 * mas a validação abaixo continua existindo, porque esquema é pedido, não garantia.
 */
export function esquemaDeResposta(ids: readonly string[]) {
  return {
    type: 'OBJECT',
    properties: {
      candidatos: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            speciesId: { type: 'STRING', enum: [...ids] },
            confianca: { type: 'NUMBER' },
            motivo: { type: 'STRING' },
          },
          required: ['speciesId', 'confianca', 'motivo'],
        },
      },
    },
    required: ['candidatos'],
  };
}

/**
 * Valida o que o modelo devolveu contra o catálogo — SDD 6.1.
 *
 * Descarta id que não existe, confiança que não é número, repetição; ordena e corta em três.
 * Confiança escrita como porcentagem (85 em vez de 0,85) é convertida, porque é o engano mais
 * comum de modelo e jogá-la fora perderia uma sugestão boa.
 */
export function sanearResposta(bruto: unknown, idsValidos: ReadonlySet<string>): Sugestao[] {
  const lista = Array.isArray(bruto)
    ? bruto
    : bruto && typeof bruto === 'object' && Array.isArray((bruto as { candidatos?: unknown }).candidatos)
      ? (bruto as { candidatos: unknown[] }).candidatos
      : [];

  const melhores = new Map<string, Sugestao>();
  for (const item of lista) {
    if (!item || typeof item !== 'object') continue;
    const { speciesId, confianca, motivo } = item as Record<string, unknown>;
    if (typeof speciesId !== 'string' || !idsValidos.has(speciesId)) continue;
    if (typeof confianca !== 'number' || !Number.isFinite(confianca) || confianca < 0) continue;

    const c = confianca > 1 && confianca <= 100 ? confianca / 100 : Math.min(confianca, 1);
    const m = typeof motivo === 'string' ? motivo.trim().slice(0, MOTIVO_MAX) : '';

    const anterior = melhores.get(speciesId);
    if (!anterior || c > anterior.confianca) melhores.set(speciesId, { speciesId, confianca: c, motivo: m });
  }

  return [...melhores.values()].sort((a, b) => b.confianca - a.confianca).slice(0, SUGESTOES_MAX);
}
