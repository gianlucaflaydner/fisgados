import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { useCores } from '@/theme';

interface Props extends TextInputProps {
  rotulo: string;
}

/**
 * Campo rotulado das telas de conta.
 *
 * Existe para que rótulo e caixa nunca saiam de sintonia entre entrar e criar conta: são as duas
 * primeiras telas que a pessoa vê, e diferença boba entre elas parece app mal-acabado.
 */
export function CampoTexto({ rotulo, ...resto }: Props) {
  const cores = useCores();

  return (
    <View className="mt-4">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-suave">
        {rotulo}
      </Text>
      <TextInput
        placeholderTextColor={cores.suave}
        className="rounded-2xl border border-borda bg-superficie px-4 py-3 text-base text-texto"
        {...resto}
      />
    </View>
  );
}
