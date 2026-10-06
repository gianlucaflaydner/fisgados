import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone } from '@/components/Icone';
import { Progresso } from '@/components/ui';
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
          <View className="gap-2 px-5 pb-1 pt-4">
            <Text className="font-corpo text-[14px] leading-5 text-suave">
              Cada lugar que você escreve no campo "Local" vira um ponto de pesca seu. Quanto mais
              capturas de lá, mais alto o grau.
            </Text>
            {lista.length > 0 ? (
              <Text className="font-corpo-forte text-[13px] text-apoio">
                {lista.length === 1 ? '1 ponto de pesca' : `${lista.length} pontos de pesca`}
                {pontos > 0 ? ` · ${pontos} ponto${pontos > 1 ? 's' : ''} de insígnia` : ''}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View className="mx-5 mt-5 gap-2 rounded-painel border border-dashed border-borda-forte p-6">
            <Text className="font-display text-[19px] text-texto">Nenhum ponto ainda</Text>
            <Text className="font-corpo text-[14px] leading-5 text-suave">
              Preencha o campo "Local" ao registrar uma captura — o nome do pesqueiro, do rio ou do
              açude. Na próxima vez ele aparece ali a um toque.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mx-5 mt-2.5 gap-2 rounded-painel border border-borda bg-superficie px-4 py-3.5">
            <View className="flex-row items-center gap-2">
              <Icone nome="local" tamanho={16} cor={cores.suave} />
              <Text className="flex-1 font-display text-[18px] text-texto" numberOfLines={1}>
                {item.local}
              </Text>
              <Text
                className="font-display-medio text-[14px] text-suave"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {item.capturas} captura{item.capturas > 1 ? 's' : ''}
              </Text>
            </View>

            <Text className="font-corpo text-[12.5px] text-apoio">
              {item.especies === 0
                ? 'nenhuma espécie identificada ainda'
                : `${item.especies} espécie${item.especies > 1 ? 's' : ''} daqui`}
            </Text>

            {item.atual ? (
              <View className="flex-row items-center gap-2">
                {/* O grau é um selo com a cor do metal — bronze a diamante, do PRD 11.3. */}
                <View className="rounded-selo px-2 py-1" style={{ backgroundColor: cores[item.atual.grau] }}>
                  <Text className="font-display text-[11px] tracking-[0.08em]" style={{ color: '#2A1C00' }}>
                    {item.atual.grau.toUpperCase()}
                  </Text>
                </View>
                <Text className="flex-1 font-display-medio text-[15px] text-texto" numberOfLines={1}>
                  {nomeDaConquista(item.atual.titulo, item.local)}
                </Text>
              </View>
            ) : null}

            {item.proximo ? (
              <View className="gap-1.5">
                <Progresso fracao={item.capturas / item.proximo.exige} altura={6} />
                <Text className="font-corpo text-[12.5px] text-apoio">
                  {item.faltam === 1
                    ? `falta 1 para ${item.proximo.titulo}`
                    : `faltam ${item.faltam} para ${item.proximo.titulo}`}
                </Text>
              </View>
            ) : (
              <Text className="font-corpo text-[12.5px] text-apoio">grau máximo deste ponto</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}
