/**
 * Conquistas por ponto de pesca — uma família nova de insígnias.
 *
 * O PRD seção 11 desenha seis famílias (volume, espécie, coleção, troféus, constância e
 * história). Esta é a sétima, e ela é diferente de todas: as linhas não vêm do catálogo, vêm do
 * que a pessoa escreveu no campo "Local". Um pescador tem três ou quatro lugares; outro tem
 * vinte. Nenhuma arte por linha dá conta disso — então a insígnia de local é **a mesma arte do
 * grau** com o nome do lugar escrito, e não um emblema desenhado por pesqueiro.
 *
 * Por que ela vale a pena mesmo assim: o lugar é o que o pescador amador tem de mais fixo. A
 * espécie varia, o tamanho varia, mas "o açude do meu tio" é o mesmo há dez anos — e é ali que
 * ele quer ser reconhecido. É também a única família que premia quem pesca sempre no mesmo canto,
 * exatamente o perfil que o álbum (que premia variedade) deixa de fora.
 *
 * Derivada do histórico, como manda a RN17: nada é gravado: recontar as capturas de um lugar é
 * barato, e o grau conquistado nunca cai porque o limiar é "já chegou lá" (RN13) — o maior grau
 * já atingido fica, e para isso basta olhar o total de capturas, que só sobe.
 *
 * Código puro. Os nomes dos graus seguem a escala e os pontos do PRD 11.3 (1/3/8/20/50).
 */

import type { Local } from './locais';

export type Grau = 'bronze' | 'prata' | 'ouro' | 'platina' | 'diamante';

export interface DegrauDeLocal {
  grau: Grau;
  /** Capturas registradas naquele lugar para atingir o grau. */
  exige: number;
  /** O título, sem o nome do lugar. "Iniciante", "Frequentador"... */
  titulo: string;
  /** Pontos de insígnia (PRD RN20). Não acumulam dentro da linha. */
  pontos: number;
}

/**
 * Os cinco degraus.
 *
 * O bronze é na terceira captura, e não na primeira: a primeira vez num lugar não diz nada sobre
 * o lugar, e insígnia barata é pior que nenhuma (princípio 1 do PRD). O diamante em 100 é a conta
 * de quem vai ao mesmo pesqueiro umas dez vezes por ano, por uma década.
 */
export const DEGRAUS_DE_LOCAL: readonly DegrauDeLocal[] = [
  { grau: 'bronze', exige: 3, titulo: 'Iniciante', pontos: 1 },
  { grau: 'prata', exige: 10, titulo: 'Frequentador', pontos: 3 },
  { grau: 'ouro', exige: 25, titulo: 'De Casa', pontos: 8 },
  { grau: 'platina', exige: 50, titulo: 'Dono do Pedaço', pontos: 20 },
  { grau: 'diamante', exige: 100, titulo: 'Lenda do Lugar', pontos: 50 },
];

export interface ConquistaDeLocal {
  chave: string;
  /** O lugar, com a grafia que a pessoa usou por último. */
  local: string;
  capturas: number;
  especies: number;
  /** O maior grau atingido ali, ou `null` para quem ainda não chegou ao bronze. */
  atual: DegrauDeLocal | null;
  /** O próximo degrau, ou `null` em quem já é Lenda do Lugar. */
  proximo: DegrauDeLocal | null;
  /** Quantas capturas faltam para o próximo degrau. 0 quando não há próximo. */
  faltam: number;
}

/**
 * Preposição do nome da conquista.
 *
 * "Iniciante no Pesqueiro Recanto" e "Iniciante na Lagoa dos Patos" — a frase só fica natural
 * com a preposição certa, e o gênero vem do substantivo que abre o nome. Fora da lista, cai em
 * "em", que é desengonçado mas nunca errado: "Iniciante em Boca da Barra".
 */
const MASCULINOS = ['rio', 'acude', 'pesqueiro', 'lago', 'arroio', 'canal', 'porto', 'parque', 'mar', 'sitio', 'balneario', 'camping', 'molhe', 'pontal', 'saco', 'canto'];
const FEMININOS = ['lagoa', 'represa', 'barragem', 'praia', 'ilha', 'sanga', 'costa', 'prainha', 'ponte', 'pedreira', 'cachoeira', 'laguna', 'pesca', 'fazenda', 'chacara', 'boca', 'barra'];

export function nomeDaConquista(titulo: string, local: string): string {
  const primeira = local
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)[0];

  const preposicao = !primeira ? 'em' : MASCULINOS.includes(primeira) ? 'no' : FEMININOS.includes(primeira) ? 'na' : 'em';
  return `${titulo} ${preposicao} ${local}`;
}

/** O degrau de um lugar, pelo total de capturas registradas ali. */
export function conquistaDoLocal(local: Local): ConquistaDeLocal {
  let atual: DegrauDeLocal | null = null;
  let proximo: DegrauDeLocal | null = null;

  for (const d of DEGRAUS_DE_LOCAL) {
    if (local.capturas >= d.exige) atual = d;
    else {
      proximo = d;
      break;
    }
  }

  return {
    chave: local.chave,
    local: local.nome,
    capturas: local.capturas,
    especies: local.especies,
    atual,
    proximo,
    faltam: proximo ? proximo.exige - local.capturas : 0,
  };
}

/**
 * Todos os lugares, com o degrau de cada um.
 *
 * Ordena por grau conquistado e, no empate, por quantidade — a tela de conquistas é uma vitrine,
 * e vitrine começa pelo que a pessoa tem de melhor. O formulário de registro usa outra ordem
 * (a mais recente primeiro), que é de outra natureza: lá é atalho, aqui é troféu.
 */
export function conquistasDeLocal(locais: readonly Local[]): ConquistaDeLocal[] {
  return locais
    .map(conquistaDoLocal)
    .sort((a, b) => (a.atual?.pontos ?? 0) - (b.atual?.pontos ?? 0) || a.capturas - b.capturas)
    .reverse();
}

/**
 * Houve subida de grau ao registrar esta captura?
 *
 * Compara o total de antes com o de depois, em vez de reavaliar tudo: é a mesma conta que a tela
 * de registro precisa fazer no instante do salvamento, offline, sem ler o histórico inteiro.
 */
export function subiuDeGrau(capturasAntes: number): DegrauDeLocal | null {
  return DEGRAUS_DE_LOCAL.find((d) => d.exige === capturasAntes + 1) ?? null;
}

/** Pontos de insígnia de local (RN20): só o maior grau de cada lugar conta. */
export function pontosDeLocal(conquistas: readonly ConquistaDeLocal[]): number {
  return conquistas.reduce((soma, c) => soma + (c.atual?.pontos ?? 0), 0);
}
