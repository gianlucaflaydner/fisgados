import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listPlaces } from '@/db/queries';
import { conquistasDeLocal, nomeDaConquista, pontosDeLocal, type ConquistaDeLocal } from '@/domain/conquistas';
import { useSession } from '@/stores/session';
import { useCores } from '@/theme';

/**
 * Meus pontos de pesca.
 *
 * A vitrine da família de insígnias por local. Começa pelo que a pessoa tem de melhor, e cada
 * lugar mostra o grau atual e o que falta para o próximo — a barra existe para isso: "faltam 4"
 * é um motivo concreto para voltar no sábado, que é justamente o que falta num app usado quinze
 * vezes por ano.
 *
 * Os lugares não são cadastrados em lugar nenhum: eles nascem do campo "Local" das capturas, e
 * esta tela só os lê de volta.
 */
export default function Locais() {
  const insets = useSafeAreaInsets();
  const cores = useCores();
  const userId = useSession((s) => s.user?.id);
  const [lista, setLista] = useState<ConquistaDeLocal[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let vivo = true;
      void listPlaces(userId).then((locais) => {
        if (vivo) setLista(conquistasDeLocal(locais));
      });
      return () => {
        vivo = false;
      };
    }, [userId]),
  );

  const pontos = pontosDeLocal(lista);

  return (
    <View className="flex-1 bg-fundo">
      <FlatList
        data={lista}
        keyExtractor={(c) => c.chave}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View className="px-5 pb-1 pt-4">
            <Text className="text-sm leading-5 text-suave">
              Cada lugar que você escreve no campo "Local" vira um ponto de pesca seu. Quanto mais
              capturas de lá, mais alto o grau.
            </Text>
            {lista.length > 0 ? (
              <Text className="mt-2 text-sm text-suave">
                {lista.length === 1 ? '1 ponto de pesca' : `${lista.length} pontos de pesca`}
                {pontos > 0 ? ` · ${pontos} ponto${pontos > 1 ? 's' : ''} de insígnia` : ''}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View className="mx-5 mt-6 rounded-2xl border border-borda bg-superficie p-6">
            <Text className="text-base font-semibold text-texto">Nenhum ponto ainda</Text>
            <Text className="mt-2 text-sm leading-5 text-suave">
              Preencha o campo "Local" ao registrar uma captura — o nome do pesqueiro, do rio ou do
              açude. Na próxima vez ele aparece ali a um toque.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mx-5 mt-2 rounded-2xl border border-borda bg-superficie px-4 py-3">
            <View className="flex-row items-baseline justify-between">
              <Text className="flex-1 pr-2 text-base font-semibold text-texto" numberOfLines={1}>
                {item.local}
              </Text>
              <Text className="text-sm text-suave" style={{ fontVariant: ['tabular-nums'] }}>
                {item.capturas} captura{item.capturas > 1 ? 's' : ''}
              </Text>
            </View>

            <Text className="mt-0.5 text-xs text-suave">
              {item.especies === 0
                ? 'nenhuma espécie identificada ainda'
                : `${item.especies} espécie${item.especies > 1 ? 's' : ''} daqui`}
            </Text>

            {item.atual ? (
              <Text className="mt-2 text-sm font-bold" style={{ color: cores.cobalto }}>
                {nomeDaConquista(item.atual.titulo, item.local)}
              </Text>
            ) : null}

            {item.proximo ? (
              <>
                <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevado">
                  <View
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: cores.cobalto,
                      width: `${Math.min(100, Math.round((item.capturas / item.proximo.exige) * 100))}%`,
                    }}
                  />
                </View>
                <Text className="mt-1.5 text-xs text-suave">
                  {item.faltam === 1
                    ? `falta 1 para ${item.proximo.titulo}`
                    : `faltam ${item.faltam} para ${item.proximo.titulo}`}
                </Text>
              </>
            ) : (
              <Text className="mt-1.5 text-xs text-suave">grau máximo deste ponto</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}
