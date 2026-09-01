/**
 * Acesso ao tema ativo de dentro dos componentes.
 *
 * A maior parte das cores chega por classe do Tailwind (`bg-fundo`, `text-suave`), que já troca
 * sozinha com o tema. Este módulo existe para o resto: um punhado de propriedades do React Native
 * que só aceita cor literal — `ActivityIndicator color`, `placeholderTextColor`, o `trackColor` do
 * Switch, o cabeçalho do Stack. Sem isto elas ficariam presas numa das duas paletas.
 */

import { useColorScheme } from 'nativewind';

import { PALETA, type Paleta, type Tema } from './cores';

export { PALETA, coresDeRaridade } from './cores';
export type { Paleta, Tema } from './cores';

/**
 * O tema desenhado agora. Enquanto o NativeWind não resolveu o esquema, assume claro — é o valor
 * que ele mesmo usa como padrão, e discordar dele faria a primeira pintura piscar.
 */
export function useTemaAtivo(): Tema {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? 'escuro' : 'claro';
}

/** As cores do tema ativo, para as propriedades que não aceitam classe. */
export function useCores(): Paleta {
  return PALETA[useTemaAtivo()];
}
