import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ALBUMS, speciesOfAlbum, type AlbumId } from '@/catalog';
import { CartaAlbum } from '@/components/CartaAlbum';
import { Progresso, TituloDaTela } from '@/components/ui';
import { listPersonalBests, listUnlockedIds } from '@/db/queries';
import { useSession } from '@/stores/session';
import { useCores } from '@/theme';

const COLUNAS = 3;

/**
 * O álbum — F07, o motivo de o app existir.
 *
 * Três álbuns regionais, uma pílula cada. A ordem das cartas não é alfabética: vem do
 * `ALBUM_LAYOUT` do catálogo, então a posição de cada carta é a mesma para todo mundo e "me falta
 * a 47" quer dizer alguma coisa.
 *
 * O progresso do álbum ativo fica num painel acima da grade, com o número e a barra. Dentro da
 * grade ele competiria com as cartas; acima, é a legenda da página.
 */
export default function Album() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cores = useCores();
  const user = useSession((s) => s.user);
  const userId = user?.id;

  const [albumAtivo, setAlbumAtivo] = useState<AlbumId>(ALBUMS[0]!.id);
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [recordes, setRecordes] = useState<Map<string, number>>(new Map());

  // Recarrega ao voltar: registrar uma captura pode ter desbloqueado carta enquanto se navegava.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let vivo = true;
      (async () => {
        const [ids, melhores] = await Promise.all([listUnlockedIds(userId), listPersonalBests(userId)]);
        if (!vivo) return;
        setAbertas(ids);
        setRecordes(melhores);
      })();
      return () => {
        vivo = false;
      };
    }, [userId]),
  );

  const especies = useMemo(() => speciesOfAlbum(albumAtivo), [albumAtivo]);
  const desbloqueadas = useMemo(() => especies.filter((s) => abertas.has(s.id)).length, [especies, abertas]);
  const album = ALBUMS.find((a) => a.id === albumAtivo)!;

  return (
    <View className="flex-1 bg-fundo">
      <FlatList
        data={especies}
        key={albumAtivo}
        keyExtractor={(s) => s.id}
        numColumns={COLUNAS}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: 20 }}
        contentContainerStyle={{ gap: 10, paddingBottom: insets.bottom + 120 }}
        ListHeaderComponent={
          <View className="gap-4" style={{ paddingTop: insets.top + 12 }}>
            <View className="px-5">
              <TituloDaTela>Álbum</TituloDaTela>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            >
              {ALBUMS.map((a) => {
                const ativo = a.id === albumAtivo;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => setAlbumAtivo(a.id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: ativo }}
                    className="h-10 justify-center rounded-full px-4 active:opacity-70"
                    style={
                      ativo
                        ? { backgroundColor: cores.texto }
                        : { backgroundColor: cores.superficie, borderWidth: 1, borderColor: cores.bordaForte }
                    }
                  >
                    <Text
                      className={ativo ? 'font-corpo-negrito text-[14px]' : 'font-corpo-forte text-[14px]'}
                      style={{ color: ativo ? cores.fundo : cores.suave }}
                    >
                      {a.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View className="mx-5 gap-2.5 rounded-carta border border-borda bg-superficie px-4 py-3.5">
              <View className="flex-row items-baseline justify-between">
                <Text className="font-display-medio text-[17px] text-texto">{album.name}</Text>
                <Text className="font-corpo text-[14px] text-suave">
                  <Text
                    className="font-display text-[18px] text-acao"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {desbloqueadas}
                  </Text>
                  {` de ${especies.length} cartas`}
                </Text>
              </View>
              <Progresso fracao={especies.length > 0 ? desbloqueadas / especies.length : 0} />
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <CartaAlbum
            species={item}
            numero={index + 1}
            aberta={abertas.has(item.id)}
            recordeCm={recordes.get(item.id)}
            onPress={() => router.push({ pathname: '/album/[especie]', params: { especie: item.id } })}
          />
        )}
      />
    </View>
  );
}
