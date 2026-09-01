/**
 * Paleta do Fisgados — dois temas.
 *
 * **Papel** (claro) para o dia, **Água Funda** (escuro) para a madrugada. O app é usado nas duas
 * pontas do dia: às 14h o escuro vira espelho, às 5h o claro queima a vista já adaptada. Por isso
 * são dois temas de verdade, e não um com ajuste de brilho.
 *
 * A cor da ação é laranja de boia nos **dois** temas. Não é capricho: é a única cor do sistema que
 * não encosta em nenhuma raridade nem em nenhum grau de insígnia, e o botão de registrar captura é
 * o gesto mais repetido do app — trocar a cor dele ao anoitecer desfaria o que a pessoa aprendeu.
 * O cobalto carrega a identidade nas duas luzes (marca, contador, links), sem nunca virar ação.
 *
 * Este arquivo é a fonte de verdade para as cores que chegam por propriedade, e não por classe
 * (`ActivityIndicator`, `placeholderTextColor`, `Switch`, cabeçalho do Stack). As classes do
 * Tailwind leem as mesmas cores de `src/global.css`, e um teste compara os dois lados para que
 * não desandem — ver `scripts/test-domain.mts`.
 */

export type Tema = 'claro' | 'escuro';

export interface Paleta {
  fundo: string;
  superficie: string;
  elevado: string;
  borda: string;
  texto: string;
  suave: string;
  /** Identidade e estrutura: marca, contador, links. Nunca é botão. */
  cobalto: string;
  /** A ação, e só ela. */
  destaque: string;
  /** O que se escreve por cima do destaque — escuro nos dois temas, porque o laranja é claro. */
  destaqueTexto: string;
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
    fundo: '#F4F7FF',
    superficie: '#FFFFFF',
    elevado: '#E7EEFF',
    borda: '#D2DDF7',
    texto: '#0B1A3D',
    suave: '#586A92',
    cobalto: '#1B45D8',
    destaque: '#FF5A2E',
    destaqueTexto: '#2B0C02',
    perigo: '#C21F49',
    comum: '#5F7C71',
    incomum: '#1E8A55',
    raro: '#7040C9',
    lendario: '#A8720C',
    bronze: '#A15C2F',
    prata: '#8A97A5',
    ouro: '#A8720C',
    platina: '#6E8FA0',
    diamante: '#2C7FA8',
  },
  escuro: {
    fundo: '#071827',
    superficie: '#0E2334',
    elevado: '#163046',
    borda: '#1F4059',
    texto: '#E8F1F8',
    suave: '#8FAAC0',
    cobalto: '#5B84FF',
    destaque: '#FF6A3D',
    destaqueTexto: '#0A1520',
    perigo: '#FF5C7C',
    comum: '#8FA8A0',
    incomum: '#3FBE7E',
    raro: '#B98CF0',
    lendario: '#F0BE4A',
    bronze: '#C8834F',
    prata: '#C3CDD8',
    ouro: '#F0BE4A',
    platina: '#BFE0EC',
    diamante: '#7FD3F0',
  },
};

/**
 * Cor de cada raridade no tema ativo — PRD seção 10.
 *
 * O PRD fixava um hexadecimal por raridade, escolhido quando o app era verde. Com dois temas o que
 * se fixa é o **matiz**: verde-acinzentado, verde, roxo e dourado. A claridade muda com o fundo,
 * senão o roxo some no papel branco e o dourado some na água funda.
 */
export function coresDeRaridade(p: Paleta) {
  return {
    comum: p.comum,
    incomum: p.incomum,
    raro: p.raro,
    lendario: p.lendario,
  } as const;
}
