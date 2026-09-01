import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ALBUMS, speciesOfAlbum, type AlbumId } from '@/catalog';
import { CartaAlbum } from '@/components/CartaAlbum';
import { countBySpecies, listPersonalBests, listUnlockedIds } from '@/db/queries';
import { useSession } from '@/stores/session';

const COLUNAS = 3;

/**
 * O álbum — F07, o motivo de o app existir.
 *
 * Três álbuns regionais, uma aba cada. A ordem das cartas não é alfabética: vem do
 * `ALBUM_LAYOUT` do catálogo, então a posição de cada carta é a mesma para todo mundo e "me falta
 * a 47" quer dizer alguma coisa.
 *
 * O contador de progresso fica acima da grade e não dentro dela, porque é a primeira coisa que se
 * olha ao abrir — e, em dia sem pescaria, costuma ser o único motivo de abrir o app.
 */
export default function Album() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useSession((s) => s.user);
  const userId = user?.id;

  const [albumAtivo, setAlbumAtivo] = useState<AlbumId>(ALBUMS[0]!.id);
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [recordes, setRecordes] = useState<Map<string, number>>(new Map());
  const [contagem, setContagem] = useState<Map<string, number>>(new Map());

  // Recarrega ao voltar: registrar uma captura pode ter desbloqueado carta enquanto se navegava.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let vivo = true;
      (async () => {
        const [ids, melhores, quantas] = await Promise.all([
          listUnlockedIds(userId),
          listPersonalBests(userId),
          countBySpecies(userId),
        ]);
        if (!vivo) return;
        setAbertas(ids);
        setRecordes(melhores);
        setContagem(quantas);
      })();
      return () => {
        vivo = false;
      };
    }, [userId]),
  );

  const especies = useMemo(() => speciesOfAlbum(albumAtivo), [albumAtivo]);
  const desbloqueadas = useMemo(
    () => especies.filter((s) => abertas.has(s.id)).length,
    [especies, abertas],
  );
  const percentual = especies.length > 0 ? Math.round((desbloqueadas / especies.length) * 100) : 0;

  return (
    <View className="flex-1 bg-fundo">
      <View className="border-b border-borda">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6 }}
        >
          {ALBUMS.map((album) => {
            const ativo = album.id === albumAtivo;
            return (
              <Pressable
                key={album.id}
                onPress={() => setAlbumAtivo(album.id)}
                className={
                  ativo
                    ? 'rounded-xl bg-cobalto px-3 py-1.5'
                    : 'rounded-xl border border-borda px-3 py-1.5 active:opacity-70'
                }
              >
                <Text
                  className={
                    ativo ? 'text-xs font-semibold text-superficie' : 'text-xs font-semibold text-suave'
                  }
                >
                  {album.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={especies}
        key={albumAtivo}
        keyExtractor={(s) => s.id}
        numColumns={COLUNAS}
        columnWrapperStyle={{ gap: 8, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 8, paddingBottom: insets.bottom + 24, paddingTop: 12 }}
        ListHeaderComponent={
          <View className="mb-3 px-4">
            <View className="flex-row items-end justify-between">
              <Text className="text-2xl font-extrabold tracking-tight text-cobalto">
                {desbloqueadas}
                <Text className="text-base font-normal text-suave"> de {especies.length} cartas</Text>
              </Text>
              <Text
                className="text-sm font-semibold text-suave"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {percentual}%
              </Text>
            </View>
            <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevado">
              <View className="h-full rounded-full bg-cobalto" style={{ width: `${percentual}%` }} />
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <CartaAlbum
            species={item}
            numero={index + 1}
            aberta={abertas.has(item.id)}
            recordeCm={recordes.get(item.id)}
            quantas={contagem.get(item.id)}
            onPress={() => router.push({ pathname: '/album/[especie]', params: { especie: item.id } })}
          />
        )}
      />
    </View>
  );
}
