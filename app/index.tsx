import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSpecies, SPECIES } from '@/catalog';
import { listCatches, listUnlockedIds } from '@/db/queries';
import type { CatchRow } from '@/db/schema';
import { useDraft } from '@/stores/draft';
import { weightLabel } from '@/domain/weight';

/** Vem do catálogo, não de constante: número escrito à mão é número que envelhece. */
const TOTAL_ESPECIES = SPECIES.length;

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const resetDraft = useDraft((s) => s.reset);

  const [rows, setRows] = useState<CatchRow[]>([]);
  const [desbloqueadas, setDesbloqueadas] = useState(0);

  // Recarrega ao voltar para a tela: o histórico muda quando o usuário registra algo.
  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      (async () => {
        const [lista, ids] = await Promise.all([listCatches(50), listUnlockedIds()]);
        if (!vivo) return;
        setRows(lista);
        setDesbloqueadas(ids.size);
      })();
      return () => {
        vivo = false;
      };
    }, []),
  );

  function registrar() {
    resetDraft();
    router.push('/captura/camera');
  }

  return (
    <View className="flex-1 bg-fundo">
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 108 }}
        ListHeaderComponent={
          <View className="px-5 pb-2 pt-4">
            <Text className="text-3xl font-bold text-texto">
              {desbloqueadas}
              <Text className="text-xl font-normal text-suave"> / {TOTAL_ESPECIES} espécies</Text>
            </Text>
            <Text className="mt-1 text-sm text-suave">
              {rows.length === 0
                ? 'Nenhuma captura registrada ainda.'
                : `${rows.length} captura${rows.length > 1 ? 's' : ''} no histórico`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="mx-5 mt-6 rounded-2xl border border-borda bg-superficie p-6">
            <Text className="text-base font-semibold text-texto">Comece pela primeira</Text>
            <Text className="mt-2 text-sm leading-5 text-suave">
              Toque em Registrar captura, fotografe o peixe, escolha a espécie e informe a medida.
              Funciona sem internet.
            </Text>
          </View>
        }
        renderItem={({ item }) => <CatchItem row={item} />}
      />

      <View
        className="absolute inset-x-0 bottom-0 px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          onPress={registrar}
          className="items-center rounded-2xl bg-destaque py-4 active:opacity-80"
        >
          <Text className="text-base font-bold text-fundo">Registrar captura</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CatchItem({ row }: { row: CatchRow }) {
  const species = row.speciesId ? getSpecies(row.speciesId) : undefined;
  const nome = species?.commonName ?? 'Não identificado';
  const peso = weightLabel(row.weightG, row.weightEstG);
  const data = new Date(row.caughtAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

  return (
    <View className="mx-5 mt-3 flex-row items-center rounded-2xl border border-borda bg-superficie p-3">
      <Image
        source={{ uri: row.photoLocal }}
        className="h-16 w-16 rounded-xl bg-elevado"
        resizeMode="cover"
      />
      <View className="ml-3 flex-1">
        <Text className="text-base font-semibold text-texto" numberOfLines={1}>
          {nome}
        </Text>
        <Text className="mt-0.5 text-sm text-suave">
          {row.lengthCm} cm{peso ? ` · ${peso}` : ''}
        </Text>
        {row.placeLabel ? (
          <Text className="mt-0.5 text-xs text-suave" numberOfLines={1}>
            {row.placeLabel}
          </Text>
        ) : null}
      </View>
      <Text className="ml-2 text-xs text-suave">{data}</Text>
    </View>
  );
}
