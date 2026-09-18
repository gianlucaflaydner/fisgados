import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPECIES } from '@/catalog';
import { CartaCaptura } from '@/components/CartaCaptura';
import { countBySpecies, listCatches, listPersonalBests, listUnlockedIds } from '@/db/queries';
import type { CatchRow } from '@/db/schema';
import { useDraft } from '@/stores/draft';
import { useSession } from '@/stores/session';
import { useSync } from '@/stores/sync';

/** Vem do catálogo, não de constante: número escrito à mão é número que envelhece. */
const TOTAL_ESPECIES = SPECIES.length;

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const resetDraft = useDraft((s) => s.reset);
  const user = useSession((s) => s.user);
  const pendentes = useSync((s) => s.pendentes);
  const dispararSync = useSync((s) => s.disparar);

  const [rows, setRows] = useState<CatchRow[]>([]);
  const [desbloqueadas, setDesbloqueadas] = useState(0);
  const [recordes, setRecordes] = useState<Map<string, number>>(new Map());
  const [contagem, setContagem] = useState<Map<string, number>>(new Map());

  // Recarrega ao voltar para a tela: o histórico muda quando o usuário registra algo.
  // Depende da conta porque o álbum é de quem está logado — trocar de conta troca a lista.
  const userId = user?.id;
  useFocusEffect(
    useCallback(() => {
      // Durante o logout esta tela ainda desenha um quadro antes de sair; sem dono, não há o que
      // buscar, e insistir mostraria o histórico de quem acabou de sair.
      if (!userId) return;

      let vivo = true;
      (async () => {
        const [lista, ids, melhores, quantas] = await Promise.all([
          listCatches(userId, 50),
          listUnlockedIds(userId),
          listPersonalBests(userId),
          countBySpecies(userId),
        ]);
        if (!vivo) return;
        setRows(lista);
        setDesbloqueadas(ids.size);
        setRecordes(melhores);
        setContagem(quantas);
        // Voltar para a home é um bom momento: acabou de registrar, ou acabou de chegar em casa.
        void dispararSync();
      })();
      return () => {
        vivo = false;
      };
    }, [userId, dispararSync]),
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 116 }}
        ListHeaderComponent={
          <View className="px-5 pb-2 pt-4">
            {user ? (
              <Text className="mb-1 text-sm text-suave">Boa pescaria, {user.nome}</Text>
            ) : null}
            <Pressable
              onPress={() => router.push('/album')}
              className="flex-row items-end justify-between active:opacity-70"
            >
              <Text className="text-3xl font-bold text-cobalto">
                {desbloqueadas}
                <Text className="text-xl font-normal text-suave"> / {TOTAL_ESPECIES} espécies</Text>
              </Text>
              <Text className="pb-1 text-sm font-semibold text-cobalto">Ver álbum</Text>
            </Pressable>
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={() => router.push('/ranking')}
                className="rounded-full border border-borda px-3 py-1.5 active:opacity-60"
              >
                <Text className="text-sm font-semibold text-cobalto">Ranking</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/amigos')}
                className="rounded-full border border-borda px-3 py-1.5 active:opacity-60"
              >
                <Text className="text-sm font-semibold text-cobalto">Amigos</Text>
              </Pressable>
            </View>
            <Text className="mt-1 text-sm text-suave">
              {rows.length === 0
                ? 'Nenhuma captura registrada ainda.'
                : `${rows.length} captura${rows.length > 1 ? 's' : ''} no histórico`}
            </Text>
            {/*
              Indicador discreto, como manda o SDD: informa e não bloqueia. Nada aqui é botão —
              a captura já está salva, e subir é assunto do app, não tarefa do usuário.
            */}
            {pendentes > 0 ? (
              <Text className="mt-1 text-xs text-suave">
                {pendentes === 1 ? '1 captura ainda não subiu' : `${pendentes} capturas ainda não subiram`}
              </Text>
            ) : null}
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
        renderItem={({ item }) => (
          <CartaCaptura
            row={item}
            recorde={item.speciesId ? recordes.get(item.speciesId) === item.lengthCm : false}
            quantas={item.speciesId ? contagem.get(item.speciesId) : undefined}
            onPress={() => router.push({ pathname: '/captura/[id]', params: { id: item.id } })}
          />
        )}
      />

      <View
        className="absolute inset-x-0 bottom-0 px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          onPress={registrar}
          className="items-center rounded-2xl bg-destaque py-4 active:opacity-80"
        >
          <Text className="text-base font-bold text-destaque-texto">Registrar captura</Text>
        </Pressable>
      </View>
    </View>
  );
}
