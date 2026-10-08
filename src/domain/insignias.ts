/**
 * O motor de insígnias — PRD seção 11, SDD seção 14.
 *
 * **Toda insígnia é derivável do histórico** (RN17). Isso não é detalhe de implementação: é o que
 * permite lançar o motor hoje e conceder retroativamente tudo que já foi pescado antes de ele
 * existir, e é o que permite consertar um limiar errado mudando uma linha e recalculando, sem
 * migrar dado nenhum.
 *
 * Por isso o motor é uma **função pura** `capturas[] → insígnias[]`, sem estado. O SDD previa
 * contadores incrementais para não varrer `catches` no caminho de 30 segundos; aqui a varredura
 * ficou — são algumas centenas de linhas por conta, e uma passada em memória custa menos que o
 * risco de um cache que discorda do histórico. Se um dia a conta crescer, o lugar de otimizar é
 * aqui dentro, e nada fora muda.
 *
 * O que fica gravado é só a **concessão**: linha, grau e data. Pela RN13 insígnia conquistada não
 * volta atrás nem se o contador cair — apagar capturas recalcula o contador, não tira o grau.
 */

import { ALBUMS, getSpecies, SPECIES, type AlbumId, type Rarity, type Species } from '../catalog';

export type Grau = 'bronze' | 'prata' | 'ouro' | 'platina' | 'diamante';

/** Ordem e pontos dos graus — PRD 11.3 e RN20. Insígnia de história vale 5. */
export const GRAUS: readonly Grau[] = ['bronze', 'prata', 'ouro', 'platina', 'diamante'];
export const PONTOS_DO_GRAU: Record<Grau, number> = {
  bronze: 1,
  prata: 3,
  ouro: 8,
  platina: 20,
  diamante: 50,
};
export const PONTOS_DE_HISTORIA = 5;

export type Familia = 'fisgadas' | 'especie' | 'colecao' | 'trofeu' | 'constancia' | 'historia';

export const NOME_DA_FAMILIA: Record<Familia, string> = {
  fisgadas: 'Fisgadas',
  especie: 'Por espécie',
  colecao: 'Coleção',
  trofeu: 'Troféus',
  constancia: 'Constância',
  historia: 'História',
};

export interface Degrau {
  grau: Grau;
  /** Quanto o contador da linha precisa alcançar. */
  exige: number;
  nome: string;
}

export interface Linha {
  /** `fisgadas`, `especie:traira`, `album:costa-sul`... — SDD 14.3. */
  id: string;
  familia: Familia;
  /** O eixo, para a vitrine: "Traíra", "Pesqueiros do Sul", "Exemplar de troféu". */
  titulo: string;
  /** O que o contador conta, em uma linha. */
  conta: string;
  degraus: Degrau[];
}

/** Uma captura, no mínimo que o motor precisa saber. */
export interface CapturaParaInsignia {
  id: string;
  speciesId: string | null;
  lengthCm: number;
  /** ISO 8601, em UTC. O fuso de leitura entra por parâmetro. */
  caughtAt: string;
  released: boolean;
  offlineOrigin: boolean;
}

/** O que o motor concede: linha, grau e a captura que fechou o limiar. */
export interface Concessao {
  lineId: string;
  tier: Grau;
  /** `null` quando veio de recálculo e não dá para saber qual captura fechou. */
  triggerId: string | null;
}

/* ───────────────────────────────────────────────────────────── família A */

const FISGADAS: Degrau[] = [
  { grau: 'bronze', exige: 10, nome: 'Molhou o Anzol' },
  { grau: 'prata', exige: 50, nome: 'Vara Boa' },
  { grau: 'ouro', exige: 150, nome: 'Braço de Ferro' },
  { grau: 'platina', exige: 400, nome: 'Calo na Mão' },
  { grau: 'diamante', exige: 1000, nome: 'Mil Fisgadas' },
];

/* ───────────────────────────────────────────────────────────── família B */

/**
 * Limiares por raridade — PRD 11.6.
 *
 * Variam porque um número só não serve: 250 tilápias é uma vida de açude, 250 surubins é
 * impossível. Espécie lendária não tem bronze nem prata — a primeira captura entrega o ouro, que é
 * o que uma miraguaia merece.
 */
const LIMIARES_POR_RARIDADE: Record<Rarity, Partial<Record<Grau, number>>> = {
  comum: { bronze: 5, prata: 15, ouro: 40, platina: 100, diamante: 250 },
  incomum: { bronze: 3, prata: 10, ouro: 25, platina: 60, diamante: 150 },
  raro: { bronze: 1, prata: 3, ouro: 8, platina: 20, diamante: 50 },
  lendario: { ouro: 1, platina: 3, diamante: 6 },
};

function degrausDaEspecie(s: Species): Degrau[] {
  const limiares = LIMIARES_POR_RARIDADE[s.rarity];
  const nomes = s.badges;
  const degraus: Degrau[] = [];
  for (const grau of GRAUS) {
    const exige = limiares[grau];
    const nome = nomes[grau];
    // Lendária não tem bronze nem prata, nos dois lugares: limiar e nome vêm nulos juntos.
    if (exige === undefined || !nome) continue;
    degraus.push({ grau, exige, nome });
  }
  return degraus;
}

/* ───────────────────────────────────────────────────────────── família C */

const COLECAO_GERAL: Degrau[] = [
  { grau: 'bronze', exige: 15, nome: 'Álbum Aberto' },
  { grau: 'prata', exige: 30, nome: 'Caderneta Cheia' },
  { grau: 'ouro', exige: 50, nome: 'Colecionador' },
  { grau: 'platina', exige: 70, nome: 'Curador do Sul' },
  { grau: 'diamante', exige: SPECIES.length, nome: 'Álbum Fechado' },
];

/** Nomes das linhas por álbum — PRD 11.7. Os limiares são 25/50/75/90/100% do álbum. */
const NOMES_POR_ALBUM: Record<AlbumId, Record<Grau, string>> = {
  'pesqueiros-sul': {
    bronze: 'Diária Paga',
    prata: 'Cliente da Casa',
    ouro: 'Sócio do Pesqueiro',
    platina: 'Dono do Tanque',
    diamante: 'Pesqueiro Limpo',
  },
  'rios-acudes-sul': {
    bronze: 'Pé na Água',
    prata: 'Barranqueiro',
    ouro: 'Rio Abaixo',
    platina: 'Senhor do Açude',
    diamante: 'Da Nascente à Foz',
  },
  'costa-sul': {
    bronze: 'Pé na Areia',
    prata: 'Arrebentação',
    ouro: 'Praiano',
    platina: 'Mestre da Maré',
    diamante: 'Costa Inteira',
  },
};

const PERCENTUAIS: Record<Grau, number> = {
  bronze: 0.25,
  prata: 0.5,
  ouro: 0.75,
  platina: 0.9,
  diamante: 1,
};

/* ───────────────────────────────────────────────────────────── família D */

const TROFEUS: Degrau[] = [
  { grau: 'bronze', exige: 1, nome: 'Esse Foi Bom' },
  { grau: 'prata', exige: 3, nome: 'Rendeu Foto' },
  { grau: 'ouro', exige: 8, nome: 'Caçador de Troféus' },
  { grau: 'platina', exige: 15, nome: 'Recordista' },
  { grau: 'diamante', exige: 30, nome: 'Monstro do Sul' },
];

/**
 * A linha "Metro" conta capturas **acima de um comprimento absoluto**, e não quantidade.
 *
 * O contador dela, por isso, é o maior peixe já pescado — e o limiar, o centímetro. É a única
 * linha em que o número que sobe é uma medida, não uma contagem, e é de propósito: é a insígnia
 * que todo pescador entende sem ler regra nenhuma.
 */
const METRO: Degrau[] = [
  { grau: 'bronze', exige: 40, nome: 'Passou de Palmo' },
  { grau: 'prata', exige: 60, nome: 'Peixe de Verdade' },
  { grau: 'ouro', exige: 80, nome: 'Quase um Metro' },
  { grau: 'platina', exige: 100, nome: 'Bateu o Metro' },
  { grau: 'diamante', exige: 120, nome: 'Não Coube na Foto' },
];

/* ───────────────────────────────────────────────────────────── família E */

const PESCARIAS: Degrau[] = [
  { grau: 'bronze', exige: 5, nome: 'Sábado de Manhã' },
  { grau: 'prata', exige: 15, nome: 'Todo Fim de Semana' },
  { grau: 'ouro', exige: 30, nome: 'Pescador de Carteirinha' },
  { grau: 'platina', exige: 60, nome: 'Vida de Pescador' },
  { grau: 'diamante', exige: 120, nome: 'Nasceu no Barco' },
];

const SEQUENCIA: Degrau[] = [
  { grau: 'bronze', exige: 2, nome: 'Voltei' },
  { grau: 'prata', exige: 4, nome: 'Mês a Mês' },
  { grau: 'ouro', exige: 8, nome: 'Sem Falta' },
  { grau: 'platina', exige: 12, nome: 'Ano Inteiro' },
  { grau: 'diamante', exige: 24, nome: 'Dois Anos de Linha na Água' },
];

/* ───────────────────────────────────────────────────────────── família F */

export interface InsigniaDeHistoria {
  id: string;
  nome: string;
  condicao: string;
}

/**
 * Eventos únicos, sem grau — PRD 11.10.
 *
 * "Pioneiro" (primeiro do grupo a desbloquear uma espécie) não está aqui: ela depende de ordem
 * entre pessoas e só o servidor pode conceder (SDD 14.1). As doze restantes saem todas do que já
 * está gravado na captura — sem clima, sem maré, sem serviço de terceiro.
 */
export const HISTORIAS: InsigniaDeHistoria[] = [
  { id: 'cinco-em-um-dia', nome: 'Cinco em Um Dia', condicao: '5 espécies diferentes na mesma data' },
  { id: 'grand-slam-barranco', nome: 'Grand Slam do Barranco', condicao: 'Traíra, jundiá e cará no mesmo dia' },
  { id: 'ta-comendo', nome: 'Tá Comendo!', condicao: '3 capturas em menos de 30 minutos' },
  { id: 'sul-inteiro', nome: 'Sul Inteiro', condicao: 'Uma espécie em cada um dos três álbuns' },
  { id: 'madrugueiro', nome: 'Madrugueiro', condicao: 'Captura registrada entre 00h e 05h' },
  { id: 'sol-a-pino', nome: 'Sol a Pino', condicao: 'Captura registrada entre 12h e 14h' },
  { id: 'sem-sinal', nome: 'Sem Sinal', condicao: '10 capturas registradas offline' },
  { id: 'isso-ai-e-o-que', nome: 'Isso Aí é o Quê?', condicao: '5 registros como "Não identificado"' },
  { id: 'de-volta-pra-agua', nome: 'De Volta Pra Água', condicao: '25 capturas devolvidas à água' },
  { id: 'virada-do-ano', nome: 'Virada do Ano', condicao: 'Captura em 31/12 ou 01/01' },
  { id: 'trocou-de-album', nome: 'Trocou de Álbum', condicao: 'Capturas de dois álbuns no mesmo dia' },
  { id: 'dobradinha', nome: 'Dobradinha', condicao: 'Duas espécies do mesmo gênero no mesmo dia' },
];

/* ──────────────────────────────────────────────────── o catálogo de linhas */

/**
 * Todas as linhas com grau. São 9 fixas + uma por espécie do catálogo.
 *
 * A lista é montada uma vez, na importação: nada aqui depende do histórico de ninguém.
 */
export const LINHAS: Linha[] = [
  { id: 'fisgadas', familia: 'fisgadas', titulo: 'Fisgadas', conta: 'capturas registradas', degraus: FISGADAS },
  { id: 'colecao', familia: 'colecao', titulo: 'Coleção', conta: 'espécies desbloqueadas', degraus: COLECAO_GERAL },
  ...ALBUMS.map((album): Linha => ({
    id: `album:${album.id}`,
    familia: 'colecao',
    titulo: album.name,
    conta: 'cartas deste álbum',
    degraus: GRAUS.map((grau) => ({
      grau,
      // Arredonda para cima: 25% de 23 cartas é 6, não 5,75 — e insígnia não se concede pela metade.
      exige: Math.ceil(album.cardCount * PERCENTUAIS[grau]),
      nome: NOMES_POR_ALBUM[album.id][grau],
    })),
  })),
  { id: 'trofeu', familia: 'trofeu', titulo: 'Exemplar de troféu', conta: 'capturas de troféu', degraus: TROFEUS },
  { id: 'metro', familia: 'trofeu', titulo: 'Metro', conta: 'o maior peixe, em cm', degraus: METRO },
  { id: 'pescarias', familia: 'constancia', titulo: 'Pescarias', conta: 'dias com captura', degraus: PESCARIAS },
  {
    id: 'sequencia',
    familia: 'constancia',
    titulo: 'Sequência',
    conta: 'meses seguidos com captura',
    degraus: SEQUENCIA,
  },
  ...SPECIES.map((s): Linha => ({
    id: `especie:${s.id}`,
    familia: 'especie',
    titulo: s.commonName,
    conta: `capturas de ${s.commonName.toLowerCase()}`,
    degraus: degrausDaEspecie(s),
  })),
];

const LINHA_POR_ID = new Map(LINHAS.map((l) => [l.id, l]));

export function getLinha(id: string): Linha | undefined {
  return LINHA_POR_ID.get(id);
}

/* ────────────────────────────────────────────────────────────── a avaliação */

/** O dia da captura no fuso de quem olha, como `AAAA-MM-DD`. */
function diaLocal(iso: string, fusoMin: number): string {
  return new Date(Date.parse(iso) + fusoMin * 60_000).toISOString().slice(0, 10);
}

/** A hora local, de 0 a 23. */
function horaLocal(iso: string, fusoMin: number): number {
  return new Date(Date.parse(iso) + fusoMin * 60_000).getUTCHours();
}

/** Mês absoluto (ano × 12 + mês), para medir sequência de meses seguidos. */
function mesLocal(iso: string, fusoMin: number): number {
  const d = new Date(Date.parse(iso) + fusoMin * 60_000);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

/** O gênero do nome científico: a primeira palavra. "Pseudoplatystoma corruscans" → gênero. */
function genero(s: Species): string {
  return s.scientificName.split(' ')[0] ?? s.scientificName;
}

/**
 * Os contadores de todas as linhas, a partir do histórico.
 *
 * `desbloqueios` entra separado porque desbloqueio não é derivável de `capturas`: pela RN01 a
 * carta continua aberta mesmo que a captura que a abriu seja apagada.
 */
export function contadores(
  capturas: readonly CapturaParaInsignia[],
  desbloqueios: ReadonlySet<string>,
  fusoMin: number,
): Map<string, number> {
  const c = new Map<string, number>();
  const somar = (id: string, n = 1) => c.set(id, (c.get(id) ?? 0) + n);
  const maior = (id: string, v: number) => c.set(id, Math.max(c.get(id) ?? 0, v));

  // Família A: toda captura conta, inclusive "não identificado" (RN14).
  c.set('fisgadas', capturas.length);

  // Família B e D.
  for (const captura of capturas) {
    if (captura.speciesId) {
      somar(`especie:${captura.speciesId}`);
      const s = getSpecies(captura.speciesId);
      // RN19: troféu é 80% do máximo da espécie. Sem faixa confiável, não há troféu.
      if (s && s.maxLengthCm > 0 && captura.lengthCm >= s.maxLengthCm * 0.8) somar('trofeu');
    }
    maior('metro', captura.lengthCm);
  }

  // Família C: conta espécies desbloqueadas, não capturas.
  c.set('colecao', desbloqueios.size);
  for (const album of ALBUMS) {
    let n = 0;
    for (const id of desbloqueios) {
      if (getSpecies(id)?.albums.includes(album.id)) n++;
    }
    c.set(`album:${album.id}`, n);
  }

  // Família E: dias distintos com captura, e a maior sequência de meses seguidos já alcançada.
  const dias = new Set(capturas.map((x) => diaLocal(x.caughtAt, fusoMin)));
  c.set('pescarias', dias.size);
  c.set('sequencia', maiorSequenciaDeMeses(capturas, fusoMin));

  return c;
}

/**
 * A maior sequência de meses consecutivos com ao menos uma captura.
 *
 * É o **maior** trecho já alcançado, não o atual: quebrar a sequência zera o contador corrente,
 * mas nunca o grau conquistado (RN13). Guardar o máximo histórico é o que faz a permanência cair
 * de graça, sem precisar lembrar o que já foi concedido.
 */
export function maiorSequenciaDeMeses(capturas: readonly CapturaParaInsignia[], fusoMin: number): number {
  const meses = [...new Set(capturas.map((x) => mesLocal(x.caughtAt, fusoMin)))].sort((a, b) => a - b);
  let maiorSeq = 0;
  let atual = 0;
  let anterior: number | null = null;
  for (const m of meses) {
    atual = anterior !== null && m === anterior + 1 ? atual + 1 : 1;
    anterior = m;
    if (atual > maiorSeq) maiorSeq = atual;
  }
  return maiorSeq;
}

/** As insígnias de história que o histórico já satisfaz — PRD 11.10. */
export function historiasConquistadas(
  capturas: readonly CapturaParaInsignia[],
  desbloqueios: ReadonlySet<string>,
  fusoMin: number,
): Set<string> {
  // Sem atalho para histórico vazio: "Sul Inteiro" depende só dos desbloqueios, e um retorno
  // antecipado aqui a esconderia de quem apagou as capturas antigas — o desbloqueio fica (RN01).
  const ganhas = new Set<string>();

  const porDia = new Map<string, CapturaParaInsignia[]>();
  for (const captura of capturas) {
    const dia = diaLocal(captura.caughtAt, fusoMin);
    porDia.set(dia, [...(porDia.get(dia) ?? []), captura]);
  }

  // As de contagem simples.
  if (capturas.filter((x) => x.offlineOrigin).length >= 10) ganhas.add('sem-sinal');
  if (capturas.filter((x) => x.speciesId === null).length >= 5) ganhas.add('isso-ai-e-o-que');
  if (capturas.filter((x) => x.released).length >= 25) ganhas.add('de-volta-pra-agua');

  // As de horário e data.
  for (const captura of capturas) {
    const h = horaLocal(captura.caughtAt, fusoMin);
    if (h < 5) ganhas.add('madrugueiro');
    if (h >= 12 && h < 14) ganhas.add('sol-a-pino');
    const dia = diaLocal(captura.caughtAt, fusoMin).slice(5);
    if (dia === '12-31' || dia === '01-01') ganhas.add('virada-do-ano');
  }

  // A de coleção: uma espécie desbloqueada em cada um dos três álbuns.
  const albunsAbertos = new Set<AlbumId>();
  for (const id of desbloqueios) {
    for (const album of getSpecies(id)?.albums ?? []) albunsAbertos.add(album);
  }
  if (albunsAbertos.size >= ALBUMS.length) ganhas.add('sul-inteiro');

  // As do mesmo dia.
  for (const doDia of porDia.values()) {
    const especies = new Set(doDia.map((x) => x.speciesId).filter((x): x is string => x !== null));
    if (especies.size >= 5) ganhas.add('cinco-em-um-dia');
    if (especies.has('traira') && especies.has('jundia') && especies.has('cara')) {
      ganhas.add('grand-slam-barranco');
    }

    const albunsDoDia = new Set<AlbumId>();
    const generos = new Map<string, Set<string>>();
    for (const id of especies) {
      const s = getSpecies(id);
      if (!s) continue;
      for (const album of s.albums) albunsDoDia.add(album);
      const g = genero(s);
      generos.set(g, new Set([...(generos.get(g) ?? []), id]));
    }
    if (albunsDoDia.size >= 2) ganhas.add('trocou-de-album');
    // Duas espécies **diferentes** do mesmo gênero: pintado e cachara, não duas pintados.
    if ([...generos.values()].some((ids) => ids.size >= 2)) ganhas.add('dobradinha');

    // Três capturas em menos de 30 minutos — a janela anda sobre as capturas do dia, ordenadas.
    const instantes = doDia.map((x) => Date.parse(x.caughtAt)).sort((a, b) => a - b);
    for (let i = 2; i < instantes.length; i++) {
      if (instantes[i]! - instantes[i - 2]! < 30 * 60_000) {
        ganhas.add('ta-comendo');
        break;
      }
    }
  }

  return ganhas;
}

/**
 * O que o histórico concede **que ainda não está gravado**.
 *
 * Só devolve o que falta: conceder é inserir, nunca apagar (RN13). Um limiar que suba depois não
 * tira insígnia de ninguém, porque o que já está em `badges` nunca é revisto.
 */
export function avaliar(
  capturas: readonly CapturaParaInsignia[],
  desbloqueios: ReadonlySet<string>,
  jaConcedidas: ReadonlySet<string>,
  fusoMin: number,
  /** A captura que disparou a avaliação, quando há uma. */
  triggerId: string | null = null,
): Concessao[] {
  const valores = contadores(capturas, desbloqueios, fusoMin);
  const novas: Concessao[] = [];

  for (const linha of LINHAS) {
    const valor = valores.get(linha.id) ?? 0;
    for (const degrau of linha.degraus) {
      if (valor < degrau.exige) continue;
      if (jaConcedidas.has(chave(linha.id, degrau.grau))) continue;
      novas.push({ lineId: linha.id, tier: degrau.grau, triggerId });
    }
  }

  for (const id of historiasConquistadas(capturas, desbloqueios, fusoMin)) {
    // História não tem grau; o bronze entra como marcador para caber na mesma tabela.
    if (jaConcedidas.has(chave(`historia:${id}`, 'bronze'))) continue;
    novas.push({ lineId: `historia:${id}`, tier: 'bronze', triggerId });
  }

  return novas;
}

/** A chave de uma concessão: é por ela que `badges` evita duplicata. */
export function chave(lineId: string, tier: Grau): string {
  return `${lineId}|${tier}`;
}

/* ─────────────────────────────────────────────────────────── para a vitrine */

export interface LinhaNaVitrine {
  linha: Linha;
  valor: number;
  /** O maior grau já conquistado — o único que aparece na vitrine (RN18). */
  atual: Degrau | null;
  proximo: Degrau | null;
  faltam: number;
  pontos: number;
}

/**
 * As linhas com grau, prontas para a tela.
 *
 * O grau exibido sai do que está **gravado**, não do contador: a RN13 manda manter o grau mesmo
 * que o contador caia depois de uma exclusão, e ler do gravado é o que cumpre isso sem caso
 * especial. O que falta para o próximo, esse sim, sai do contador.
 */
export function vitrine(
  capturas: readonly CapturaParaInsignia[],
  desbloqueios: ReadonlySet<string>,
  concedidas: ReadonlySet<string>,
  fusoMin: number,
): LinhaNaVitrine[] {
  const valores = contadores(capturas, desbloqueios, fusoMin);

  return LINHAS.map((linha) => {
    const valor = valores.get(linha.id) ?? 0;
    let atual: Degrau | null = null;
    let proximo: Degrau | null = null;

    for (const degrau of linha.degraus) {
      if (concedidas.has(chave(linha.id, degrau.grau))) atual = degrau;
      else if (!proximo) proximo = degrau;
    }

    return {
      linha,
      valor,
      atual,
      proximo,
      faltam: proximo ? Math.max(0, proximo.exige - valor) : 0,
      pontos: atual ? PONTOS_DO_GRAU[atual.grau] : 0,
    };
  });
}

/** Pontos de insígnia (RN20): só o maior grau de cada linha, mais 5 por insígnia de história. */
export function pontosDeInsignia(concedidas: ReadonlySet<string>): number {
  let total = 0;
  for (const linha of LINHAS) {
    let melhor: Grau | null = null;
    for (const degrau of linha.degraus) {
      if (concedidas.has(chave(linha.id, degrau.grau))) melhor = degrau.grau;
    }
    if (melhor) total += PONTOS_DO_GRAU[melhor];
  }
  for (const h of HISTORIAS) {
    if (concedidas.has(chave(`historia:${h.id}`, 'bronze'))) total += PONTOS_DE_HISTORIA;
  }
  return total;
}

/** O nome que vai na tela quando uma insígnia é conquistada. */
export function nomeDaConcessao(c: Concessao): string {
  if (c.lineId.startsWith('historia:')) {
    const id = c.lineId.slice('historia:'.length);
    return HISTORIAS.find((h) => h.id === id)?.nome ?? id;
  }
  const linha = getLinha(c.lineId);
  return linha?.degraus.find((d) => d.grau === c.tier)?.nome ?? c.lineId;
}
