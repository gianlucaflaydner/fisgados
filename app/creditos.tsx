import { FlatList, Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CREDITOS, type CreditoFoto } from '@/catalog/creditos';

/**
 * Créditos das fotos do catálogo.
 *
 * Esta tela não é uma cortesia nem um "sobre". As fotos das espécies vêm de terceiros sob CC BY,
 * CC0 ou domínio público, e CC BY **exige** crédito visível ao autor — sem esta lista, embarcar
 * as fotos descumpre a licença. Por isso ela é gerada junto com as imagens: o que está creditado
 * aqui é exatamente o que foi empacotado, e trocar uma foto troca o crédito no mesmo comando.
 */
export default function Creditos() {
  const insets = useSafeAreaInsets();

  return (
    <FlatList
      className="flex-1 bg-fundo"
      data={CREDITOS}
      keyExtractor={(c) => c.especie}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      ListHeaderComponent={
        <View className="px-5 pb-2 pt-4">
          <Text className="font-corpo text-[14px] leading-[20px] text-suave">
            As fotos das espécies são de terceiros, publicadas sob licença que permite uso com
            crédito ao autor. Toque num item para abrir a página original.
          </Text>
          <Text className="mt-3 font-corpo text-[12px] leading-[17px] text-apoio">
            {CREDITOS.length} fotos · iNaturalist e Wikimedia Commons
          </Text>
        </View>
      }
      renderItem={({ item }) => <Item credito={item} />}
    />
  );
}

function Item({ credito }: { credito: CreditoFoto }) {
  return (
    <Pressable
      onPress={() => void Linking.openURL(credito.pagina)}
      className="mx-5 mt-2 rounded-carta border border-borda bg-superficie px-4 py-3 active:opacity-70"
    >
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 font-display-medio text-[16px] text-texto" numberOfLines={1}>
          {credito.especie}
        </Text>
        <Text className="ml-3 font-corpo-forte text-[11px] text-acao">{credito.licenca}</Text>
      </View>
      <Text className="mt-0.5 font-corpo text-[12px] text-apoio" numberOfLines={2}>
        {credito.autor}
      </Text>
    </Pressable>
  );
}
