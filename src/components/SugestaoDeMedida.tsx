import { Pressable, Text, View } from 'react-native';

import type { Estimativa } from '@/domain/identificacao';

interface Props {
  estimativa: Estimativa;
  /** O que está escrito no campo agora, para não oferecer o que já está lá. */
  valorAtual: string;
  onUsar: (cm: number) => void;
}

/**
 * A estimativa de tamanho pela foto.
 *
 * Nunca preenche o campo sozinha, e isso não é cautela de implementação: a medida é o dado mais
 * repetido do app — alimenta peso estimado, troféu, recorde pessoal e dois rankings. Um número
 * que aparece sozinho no campo é um número que ninguém confere, e um recorde de grupo decidido
 * por palpite de foto estraga o ranking para todo mundo.
 *
 * Então a tela diz as três coisas: a faixa, o que o modelo usou como régua, e um botão com o
 * número redondo. Quem tem a régua na mão ignora e digita.
 */
export function SugestaoDeMedida({ estimativa, valorAtual, onUsar }: Props) {
  if (estimativa.tipo !== 'faixa') return null;
  if (Number(valorAtual.replace(',', '.')) === estimativa.sugerido) return null;

  return (
    <View className="mt-2 rounded-2xl border border-dashed border-borda p-3">
      <Text className="text-sm leading-5 text-suave">
        Pela foto, algo entre{' '}
        <Text className="font-semibold text-texto">
          {formatar(estimativa.cmMin)} e {formatar(estimativa.cmMax)} cm
        </Text>
        , comparando com {estimativa.referencia}.
      </Text>
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="flex-1 pr-2 text-xs leading-4 text-suave">
          Estimativa, não medida. Se tiver régua ou trena, ela ganha.
        </Text>
        <Pressable
          onPress={() => onUsar(estimativa.sugerido)}
          accessibilityRole="button"
          className="rounded-full bg-elevado px-3 py-1.5 active:opacity-70"
        >
          <Text className="text-sm font-bold text-cobalto" style={{ fontVariant: ['tabular-nums'] }}>
            Usar {estimativa.sugerido} cm
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function formatar(cm: number): string {
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1).replace('.', ',');
}
