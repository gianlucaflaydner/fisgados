/**
 * Paleta do Fisgados — dois temas, um desenho só.
 *
 * O desenho é o do style guide "Álbum de águas profundas": fundo verde-abismo, uma única ação
 * laranja de isca, carta com moldura na cor da raridade. **Água Funda** (escuro) é o tema de
 * origem — os hexadecimais do guia são os daqui. **Papel** (claro) é o mesmo desenho virado para
 * o dia: as mesmas cores de raridade e a mesma isca, sobre papel esverdeado.
 *
 * Os dois existem porque o app é usado nas duas pontas do dia: às 14h o escuro vira espelho no
 * sol, às 5h o claro queima a vista já adaptada. Por isso são dois temas de verdade, e não um com
 * ajuste de brilho.
 *
 * A cor da ação é a mesma isca nos **dois** temas, com texto escuro por cima. O botão de registrar
 * captura é o gesto mais repetido do app; trocar a cor dele ao anoitecer desfaria o que a pessoa
 * aprendeu. O que muda entre os temas é só o laranja **de texto** (`acao`): isca sobre papel
 * branco não se lê, então no claro ele escurece.
 *
 * Este arquivo é a fonte de verdade para as cores que chegam por propriedade, e não por classe
 * (`ActivityIndicator`, `placeholderTextColor`, `Switch`, cabeçalho do Stack, SVG dos ícones). As
 * classes do Tailwind leem as mesmas cores de `src/global.css`, e um teste compara os dois lados
 * para que não desandem — ver `scripts/test-domain.mts`.
 */

export type Tema = 'claro' | 'escuro';

export interface Paleta {
  /** O fundo das telas. No escuro é o abismo; no claro, papel. */
  fundo: string;
  /** Painéis e cartas. */
  superficie: string;
  /** Chips, botões secundários, trilhos de progresso. */
  elevado: string;
  /** O fundo dos campos de formulário — mais escuro que o painel, para o campo parecer um buraco. */
  campo: string;
  /** Borda de painel e de carta. */
  borda: string;
  /** Borda de coisa clicável: chip, botão secundário, avatar. */
  bordaForte: string;
  texto: string;
  /** Texto de apoio: rótulos, nome científico, metadados. */
  suave: string;
  /** Legenda, texto terciário. O limite do que ainda se lê no sol. */
  apoio: string;
  /** A ação, e só ela — o laranja de isca do botão principal. */
  destaque: string;
  /** O que se escreve por cima do destaque. Escuro nos dois temas, porque a isca é clara. */
  destaqueTexto: string;
  /** O degrau de 6 px embaixo do botão principal. É a mesma isca, afundada. */
  destaqueBaixo: string;
  /** A isca como **texto**: link, número do contador, valor em destaque. */
  acao: string;
  perigo: string;
  comum: string;
  incomum: string;
  raro: string;
  lendario: string;
  bronze: string;
  prata: string;
  ouro: string;
  platina: string;
  diamante: string;
}

export const PALETA: Record<Tema, Paleta> = {
  claro: {
    fundo: '#F1F5F1',
    superficie: '#FFFFFF',
    elevado: '#E3EBE5',
    campo: '#FFFFFF',
    borda: '#D2DED6',
    bordaForte: '#B4C5BC',
    texto: '#071417',
    suave: '#48615C',
    apoio: '#58716C',
    destaque: '#FF8A3D',
    destaqueTexto: '#1C0D03',
    destaqueBaixo: '#B9531A',
    acao: '#A4480F',
    perigo: '#B3123B',
    comum: '#5F7C71',
    incomum: '#106B40',
    raro: '#1457B8',
    lendario: '#8A6405',
    bronze: '#8C4C23',
    prata: '#5F6B75',
    ouro: '#8A6405',
    platina: '#4C6F7D',
    diamante: '#1F5E85',
  },
  escuro: {
    fundo: '#071417',
    superficie: '#0E2226',
    elevado: '#13292E',
    campo: '#0B1C20',
    borda: '#234248',
    bordaForte: '#2C5059',
    texto: '#EEF2EA',
    suave: '#A7BAB5',
    apoio: '#8FA6A1',
    destaque: '#FF8A3D',
    destaqueTexto: '#1C0D03',
    destaqueBaixo: '#B9531A',
    acao: '#FF8A3D',
    perigo: '#FF8089',
    comum: '#B9C6C1',
    incomum: '#5CD394',
    raro: '#58A9FF',
    lendario: '#F4C743',
    bronze: '#C8834F',
    prata: '#C3CDD8',
    ouro: '#F4C743',
    platina: '#CFE4E8',
    diamante: '#8AB6FF',
  },
};

/**
 * Cor de cada raridade no tema ativo — PRD seção 10.
 *
 * O que é fixo é o matiz: prata, musgo, água e ouro. A claridade acompanha o fundo, senão a prata
 * desaparece no papel branco e o musgo escurece até sumir na água funda.
 */
export function coresDeRaridade(p: Paleta) {
  return {
    comum: p.comum,
    incomum: p.incomum,
    raro: p.raro,
    lendario: p.lendario,
  } as const;
}

/**
 * As três famílias do guia.
 *
 * Bricolage Grotesque carrega os números e os nomes de espécie — é a voz do álbum. Instrument Sans
 * é o texto de trabalho. Instrument Serif itálico aparece **só** no nome científico: é o toque de
 * guia de campo que faz a carta parecer ficha de ictiologia, e usá-lo em qualquer outro lugar
 * gasta o efeito.
 */
export const FONTE = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayMedio: 'BricolageGrotesque_700Bold',
  corpo: 'InstrumentSans_400Regular',
  corpoMedio: 'InstrumentSans_500Medium',
  corpoForte: 'InstrumentSans_600SemiBold',
  corpoNegrito: 'InstrumentSans_700Bold',
  cientifico: 'InstrumentSerif_400Regular_Italic',
} as const;

/** Raios do guia: selo, campo, carta, painel. */
export const RAIO = { selo: 8, campo: 14, botao: 16, carta: 18, painel: 24, pilula: 999 } as const;

/** A margem lateral de toda tela. */
export const MARGEM = 20;
