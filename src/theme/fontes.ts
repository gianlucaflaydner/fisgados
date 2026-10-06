/**
 * As fontes do guia, carregadas no boot.
 *
 * Três famílias, sete cortes. É mais arquivo do que o app precisaria se a tipografia fosse
 * enfeite — mas ela é o que faz a carta parecer carta: Bricolage nos números, Instrument Sans no
 * texto e o serif itálico só no nome científico.
 *
 * Os cortes vêm empacotados no app (`@expo-google-fonts`), não baixados em tempo de execução:
 * pescaria é sem sinal, e fonte que chega pela rede é fonte que não chega.
 */

import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';

export const FONTES_DO_APP = {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
  InstrumentSerif_400Regular_Italic,
};
